const prisma = require('../config/prisma');
const { generateQrDataUrl } = require('../utils/qr');
const { generateTicketPdf } = require('../utils/pdf');
const { computeApplicableFee } = require('./eventController');
const { logAuditEvent } = require('../middleware/audit');

/**
 * Generate Unique Ticket Code (e.g. TKT-CEMS-XXXXXX)
 */
function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${Date.now().toString(36).toUpperCase()}-${code}`;
}

/**
 * Student Event Registration (Atomic & Race-Condition Safe)
 * Implements FR-6.1, FR-6.2, FR-6.4, FR-6.5, FR-6.8, FR-6.9, BR-1, BR-9
 */
async function registerForEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { customAnswers, teamName, teamMembers, joinWaitlistIfFull } = req.body;
    const userId = req.user.id;

    // 1. Fetch Event with organizingBody
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizingBody: true }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({ error: `Event is not open for registration (Status: ${event.status}).` });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline for this event has passed.' });
    }

    // 2. FR-6.5 & BR-9: Prevent duplicate registrations
    const existingReg = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (existingReg && existingReg.status !== 'CANCELLED') {
      return res.status(400).json({
        error: `You are already registered for this event (Status: ${existingReg.status}).`
      });
    }

    // 3. FR-6.9: Overlapping event slots check / warning
    const overlapping = await prisma.registration.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        event: {
          id: { not: eventId },
          status: { in: ['PUBLISHED', 'ONGOING'] },
          OR: [
            {
              startDateTime: { lte: event.endDateTime },
              endDateTime: { gte: event.startDateTime }
            }
          ]
        }
      },
      include: { event: true }
    });

    // Compute fee breakdown
    const feeInfo = computeApplicableFee(event, req.user);
    const feeApplied = feeInfo.applicableFee;
    const feeType = feeInfo.feeType;

    // 4. ATOMIC CAPACITY CHECK & ALLOCATION (FR-6.4, BR-1)
    // We execute inside an interactive transaction using raw atomic conditional update
    const result = await prisma.$transaction(async (tx) => {
      // Attempt atomic increment where seatsConfirmed < seatLimit
      const updateResult = await tx.$executeRaw`
        UPDATE "Event"
        SET "seatsConfirmed" = "seatsConfirmed" + 1
        WHERE id = ${eventId} AND "seatsConfirmed" < "seatLimit"
      `;

      if (updateResult === 1) {
        // Seat successfully allocated!
        const ticketCode = generateTicketCode();
        const qrPayload = `CEMS:${ticketCode}:${eventId}:${userId}`;
        const qrCodeUrl = await generateQrDataUrl(qrPayload);

        const newRegistration = await tx.registration.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId
            }
          },
          update: {
            status: 'CONFIRMED',
            ticketCode,
            qrCode: qrCodeUrl,
            feeApplied,
            feeType,
            customAnswers: customAnswers || {},
            teamName: teamName || null,
            teamMembers: teamMembers || [],
            waitlistOrder: null
          },
          create: {
            eventId,
            userId,
            status: 'CONFIRMED',
            ticketCode,
            qrCode: qrCodeUrl,
            feeApplied,
            feeType,
            customAnswers: customAnswers || {},
            teamName: teamName || null,
            teamMembers: teamMembers || []
          }
        });

        return {
          type: 'CONFIRMED',
          registration: newRegistration,
          ticketCode,
          qrCode: qrCodeUrl
        };
      } else {
        // Event seat limit reached!
        if (joinWaitlistIfFull) {
          // Put student on WAITLIST (FR-6.6)
          const waitlistCount = await tx.registration.count({
            where: { eventId, status: 'WAITLISTED' }
          });

          const ticketCode = `WTL-${Date.now().toString(36).toUpperCase()}`;

          const waitlistReg = await tx.registration.upsert({
            where: {
              eventId_userId: {
                eventId,
                userId
              }
            },
            update: {
              status: 'WAITLISTED',
              ticketCode,
              qrCode: null,
              feeApplied,
              feeType,
              customAnswers: customAnswers || {},
              teamName: teamName || null,
              teamMembers: teamMembers || [],
              waitlistOrder: waitlistCount + 1
            },
            create: {
              eventId,
              userId,
              status: 'WAITLISTED',
              ticketCode,
              qrCode: null,
              feeApplied,
              feeType,
              customAnswers: customAnswers || {},
              teamName: teamName || null,
              teamMembers: teamMembers || [],
              waitlistOrder: waitlistCount + 1
            }
          });

          return {
            type: 'WAITLISTED',
            registration: waitlistReg,
            position: waitlistCount + 1
          };
        } else {
          return {
            type: 'FULL',
            message: 'Event is fully booked. Join the waitlist to be queued for upcoming openings.'
          };
        }
      }
    });

    if (result.type === 'FULL') {
      return res.status(409).json({
        error: 'Event registration is full.',
        isFull: true,
        canWaitlist: true
      });
    }

    if (result.type === 'WAITLISTED') {
      // In-app notification for waitlist
      await prisma.notification.create({
        data: {
          userId,
          title: `Added to Waitlist: ${event.title}`,
          message: `You are #${result.position} on the waitlist. You will be automatically enrolled if a confirmed attendee cancels.`,
          type: 'WAITLIST',
          link: '/dashboard/registrations'
        }
      });

      return res.status(200).json({
        message: `Event is full. You have joined the waitlist at position #${result.position}.`,
        status: 'WAITLISTED',
        registration: result.registration,
        position: result.position
      });
    }

    // Confirmed Registration
    await prisma.notification.create({
      data: {
        userId,
        title: `Registration Confirmed: ${event.title}`,
        message: `Your registration is confirmed! Ticket Code: ${result.ticketCode}. Download your QR ticket anytime.`,
        type: 'REGISTRATION',
        link: '/dashboard/registrations'
      }
    });

    return res.status(201).json({
      message: 'Registration confirmed immediately.',
      status: 'CONFIRMED',
      registration: result.registration,
      overlappingWarning: overlapping ? `Note: Overlaps with your existing registration for "${overlapping.event.title}".` : null,
      feeBreakdown: {
        feeApplied,
        feeType,
        standardFee: event.standardFee,
        ieeeFee: event.ieeeFee,
        savings: feeInfo.savings || 0
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error processing registration.' });
  }
}

/**
 * Student: Cancel Registration (FR-6.7, FR-6.6)
 * Decrements seatsConfirmed, marks status CANCELLED, and auto-promotes first waitlisted user
 */
async function cancelRegistration(req, res) {
  try {
    const { id } = req.params; // registration id

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true, user: true }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    // Only owner or admin can cancel
    if (registration.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to cancel this registration.' });
    }

    if (registration.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Registration is already cancelled.' });
    }

    const wasConfirmed = registration.status === 'CONFIRMED';
    const eventId = registration.eventId;

    // Execute cancellation & waitlist promotion in transaction
    const promotion = await prisma.$transaction(async (tx) => {
      // 1. Mark registration as CANCELLED
      await tx.registration.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      if (!wasConfirmed) {
        return null;
      }

      // 2. Decrement seatsConfirmed for event
      await tx.event.update({
        where: { id: eventId },
        data: {
          seatsConfirmed: { decrement: 1 }
        }
      });

      // 3. FR-6.6: Promote first waitlisted user if available
      const nextWaitlisted = await tx.registration.findFirst({
        where: { eventId, status: 'WAITLISTED' },
        orderBy: { waitlistOrder: 'asc' },
        include: { user: true }
      });

      if (nextWaitlisted) {
        const ticketCode = generateTicketCode();
        const qrPayload = `CEMS:${ticketCode}:${eventId}:${nextWaitlisted.userId}`;
        const qrCodeUrl = await generateQrDataUrl(qrPayload);

        // Re-increment seat for promoted user
        await tx.event.update({
          where: { id: eventId },
          data: {
            seatsConfirmed: { increment: 1 }
          }
        });

        const promoted = await tx.registration.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: 'CONFIRMED',
            ticketCode,
            qrCode: qrCodeUrl,
            waitlistOrder: null
          }
        });

        return { promoted, user: nextWaitlisted.user };
      }

      return null;
    });

    // Notify cancelling user
    await prisma.notification.create({
      data: {
        userId: registration.userId,
        title: 'Registration Cancelled',
        message: `Your registration for "${registration.event.title}" has been cancelled.`,
        type: 'EVENT_UPDATE',
        link: '/events'
      }
    });

    // If a waitlisted user was promoted, notify them!
    if (promotion) {
      await prisma.notification.create({
        data: {
          userId: promotion.promoted.userId,
          title: `Promoted from Waitlist! 🎉`,
          message: `Great news! A seat opened up for "${registration.event.title}". Your registration is now confirmed!`,
          type: 'REGISTRATION',
          link: '/dashboard/registrations'
        }
      });
    }

    return res.json({
      message: 'Registration cancelled successfully.',
      waitlistPromoted: Boolean(promotion)
    });
  } catch (err) {
    console.error('Cancel registration error:', err);
    return res.status(500).json({ error: 'Failed to cancel registration.' });
  }
}

/**
 * Student: Get My Registrations (FR-6.8)
 */
async function getMyRegistrations(req, res) {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            organizingBody: true
          }
        },
        certificate: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ registrations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch registrations.' });
  }
}

/**
 * Download Ticket PDF (FR-6.8)
 */
async function downloadTicketPdf(req, res) {
  try {
    const { id } = req.params; // registration id

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            organizingBody: true
          }
        },
        user: true
      }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    // Authorized check: user themselves, organizer of the body, or admin
    if (registration.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Not authorized to download this ticket.' });
    }

    const pdfBuffer = await generateTicketPdf({
      registration,
      event: registration.event,
      user: registration.user
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${registration.ticketCode}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Download ticket PDF error:', err);
    return res.status(500).json({ error: 'Failed to generate ticket PDF.' });
  }
}

/**
 * Organizer / Admin: Get Event Registrations List with Filters & Search (FR-12.1)
 */
async function getEventRegistrations(req, res) {
  try {
    const { eventId } = req.params;
    const { status, feeType, search } = req.query;

    const where = { eventId };
    if (status) where.status = status;
    if (feeType) where.feeType = feeType;

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { rollNo: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, rollNo: true, department: true, year: true, phone: true }
        },
        attendances: true,
        certificate: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ registrations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch event registrations.' });
  }
}

module.exports = {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  downloadTicketPdf,
  getEventRegistrations
};

