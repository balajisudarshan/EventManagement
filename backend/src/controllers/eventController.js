const prisma = require('../config/prisma');
const { logAuditEvent } = require('../middleware/audit');
const { isMembershipActive } = require('./ieeeController');

/**
 * Calculate user's applicable fee for a specific event (FR-5.4, FR-7.2, FR-7.3)
 */
function computeApplicableFee(event, user) {
  if (event.isFree || event.standardFee === 0) {
    return {
      applicableFee: 0,
      feeType: 'FREE',
      isDiscounted: false,
      reason: 'Free Event'
    };
  }

  const isIeeeOrganizingBody = event.organizingBody?.type === 'IEEE';

  if (!isIeeeOrganizingBody) {
    // Non-IEEE events have no membership-based discount (BR-5, FR-7.3)
    return {
      applicableFee: event.standardFee,
      feeType: 'STANDARD',
      isDiscounted: false,
      reason: 'Standard rate applies for non-IEEE events'
    };
  }

  // Check if student has verified and unexpired IEEE membership (BR-4, FR-7.2)
  const hasActiveIeee = user?.ieeeMembership && isMembershipActive(user.ieeeMembership);

  if (hasActiveIeee) {
    return {
      applicableFee: event.ieeeFee,
      feeType: 'IEEE',
      isDiscounted: true,
      savings: event.standardFee - event.ieeeFee,
      reason: `IEEE Member Discount applied (Card #${user.ieeeMembership.membershipNumber})`
    };
  }

  // Pending verification student info (FR-7.6)
  const isPending = user?.ieeeMembership?.status === 'PENDING';

  return {
    applicableFee: event.standardFee,
    feeType: 'STANDARD',
    isDiscounted: false,
    isPendingVerification: isPending,
    reason: isPending
      ? 'Your IEEE membership is currently pending verification. Standard fee applies unless approved.'
      : 'Standard fee (Submit & verify your IEEE membership for discounted pricing)'
  };
}

/**
 * Discover / Browse Events with Search & Filters (FR-5.1, FR-5.2, FR-5.3)
 */
async function getEvents(req, res) {
  try {
    const { category, search, organizingBodyId, isFree, ieeeOnly, status, startDate, endDate } = req.query;

    const where = {};

    // For public / student discovery, default to PUBLISHED, ONGOING, COMPLETED
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['PUBLISHED', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'] };
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (organizingBodyId) {
      where.organizingBodyId = organizingBodyId;
    }

    if (isFree === 'true') {
      where.isFree = true;
    } else if (isFree === 'false') {
      where.isFree = false;
    }

    if (ieeeOnly === 'true') {
      where.organizingBody = { type: 'IEEE' };
    }

    if (startDate) {
      where.startDateTime = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endDateTime = { lte: new Date(endDate) };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { organizingBody: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizingBody: true,
        _count: {
          select: { registrations: { where: { status: 'CONFIRMED' } } }
        }
      },
      orderBy: { startDateTime: 'asc' }
    });

    const enriched = events.map((ev) => {
      const seatsLeft = Math.max(0, ev.seatLimit - ev.seatsConfirmed);
      const feeInfo = computeApplicableFee(ev, req.user);

      return {
        ...ev,
        seatsLeft,
        isFull: seatsLeft <= 0,
        applicableFeeInfo: feeInfo
      };
    });

    return res.json({ events: enriched });
  } catch (err) {
    console.error('Get events error:', err);
    return res.status(500).json({ error: 'Failed to fetch events.' });
  }
}

/**
 * Get Event Details by ID (FR-5.1, FR-5.4)
 */
async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizingBody: true,
        certificateTemplates: true,
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Check if the requesting user is already registered
    let userRegistration = null;
    if (req.user) {
      userRegistration = await prisma.registration.findUnique({
        where: {
          eventId_userId: {
            eventId: id,
            userId: req.user.id
          }
        }
      });
    }

    const seatsLeft = Math.max(0, event.seatLimit - event.seatsConfirmed);
    const feeInfo = computeApplicableFee(event, req.user);

    return res.json({
      event: {
        ...event,
        seatsLeft,
        isFull: seatsLeft <= 0,
        applicableFeeInfo: feeInfo,
        userRegistration
      }
    });
  } catch (err) {
    console.error('Get event error:', err);
    return res.status(500).json({ error: 'Failed to fetch event details.' });
  }
}

/**
 * Organizer / Admin: Create Event (FR-4.1, FR-4.2, FR-4.3, FR-7.1)
 */
async function createEvent(req, res) {
  try {
    const {
      organizingBodyId,
      title,
      description,
      category,
      startDateTime,
      endDateTime,
      venue,
      mode,
      bannerUrl,
      eligibility,
      registrationDeadline,
      contactName,
      contactEmail,
      contactPhone,
      seatLimit,
      isFree,
      standardFee,
      ieeeFee,
      customFields,
      isTeamEvent,
      minTeamSize,
      maxTeamSize,
      certificateTypes,
      refundPolicy,
      requiresApproval
    } = req.body;

    if (!organizingBodyId || !title || !description || !startDateTime || !endDateTime || !registrationDeadline) {
      return res.status(400).json({ error: 'Missing mandatory event parameters.' });
    }

    const body = await prisma.organizingBody.findUnique({
      where: { id: organizingBodyId }
    });

    if (!body) {
      return res.status(404).json({ error: 'Organizing body not found.' });
    }

    const numericLimit = parseInt(seatLimit, 10);
    if (isNaN(numericLimit) || numericLimit <= 0) {
      return res.status(400).json({ error: 'Seat capacity must be a positive number.' });
    }

    const numericStdFee = isFree ? 0 : parseFloat(standardFee) || 0;
    let numericIeeeFee = isFree ? 0 : parseFloat(ieeeFee) || 0;

    // Business Rule FR-7.1: For IEEE events, ieeeFee must be strictly less than standardFee
    if (!isFree && body.type === 'IEEE') {
      if (numericIeeeFee >= numericStdFee) {
        return res.status(400).json({
          error: 'Validation failure: For IEEE events, the IEEE member fee must be strictly lower than the standard fee.'
        });
      }
    } else if (body.type !== 'IEEE') {
      // Non-IEEE events do not have IEEE discount
      numericIeeeFee = 0;
    }

    // Default status: If requiresApproval is true, DRAFT or PENDING_APPROVAL. If Admin creates, can be PUBLISHED.
    const initialStatus = (req.user.role === 'ADMIN' && !requiresApproval)
      ? 'PUBLISHED'
      : (req.body.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT');

    const event = await prisma.event.create({
      data: {
        organizingBodyId,
        title: title.trim(),
        description: description.trim(),
        category: category || 'Workshop',
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        venue: venue ? venue.trim() : 'Campus Venue',
        mode: mode || 'OFFLINE',
        bannerUrl: bannerUrl || null,
        eligibility: eligibility || 'All Students',
        registrationDeadline: new Date(registrationDeadline),
        contactName: contactName ? contactName.trim() : req.user.name,
        contactEmail: contactEmail ? contactEmail.trim() : req.user.email,
        contactPhone: contactPhone ? contactPhone.trim() : (req.user.phone || '0000000000'),
        seatLimit: numericLimit,
        seatsConfirmed: 0,
        isFree: Boolean(isFree),
        standardFee: numericStdFee,
        ieeeFee: numericIeeeFee,
        status: initialStatus,
        refundPolicy: refundPolicy || 'Standard institutional event refund policy applies.',
        customFields: customFields || [],
        isTeamEvent: Boolean(isTeamEvent),
        minTeamSize: isTeamEvent ? (parseInt(minTeamSize, 10) || 1) : 1,
        maxTeamSize: isTeamEvent ? (parseInt(maxTeamSize, 10) || 1) : 1,
        requiresApproval: requiresApproval !== undefined ? Boolean(requiresApproval) : true,
        certificateTypes: certificateTypes || ['PARTICIPATION'],
        createdById: req.user.id
      },
      include: {
        organizingBody: true
      }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: event.id,
      newValue: { title: event.title, status: event.status, seatLimit: event.seatLimit },
      req
    });

    return res.status(201).json({
      message: 'Event created successfully.',
      event
    });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ error: 'Failed to create event.' });
  }
}

/**
 * Organizer / Admin: Update Event (FR-4.5)
 */
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({
      where: { id },
      include: { organizingBody: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const {
      title,
      description,
      category,
      startDateTime,
      endDateTime,
      venue,
      mode,
      bannerUrl,
      eligibility,
      registrationDeadline,
      seatLimit,
      isFree,
      standardFee,
      ieeeFee,
      customFields,
      isTeamEvent,
      minTeamSize,
      maxTeamSize,
      certificateTypes,
      refundPolicy,
      status
    } = req.body;

    const data = {};

    if (title) data.title = title.trim();
    if (description) data.description = description.trim();
    if (category) data.category = category;
    if (startDateTime) data.startDateTime = new Date(startDateTime);
    if (endDateTime) data.endDateTime = new Date(endDateTime);
    if (venue) data.venue = venue.trim();
    if (mode) data.mode = mode;
    if (bannerUrl !== undefined) data.bannerUrl = bannerUrl;
    if (eligibility) data.eligibility = eligibility;
    if (registrationDeadline) data.registrationDeadline = new Date(registrationDeadline);
    if (refundPolicy !== undefined) data.refundPolicy = refundPolicy;
    if (customFields) data.customFields = customFields;
    if (certificateTypes) data.certificateTypes = certificateTypes;

    if (seatLimit !== undefined) {
      const limit = parseInt(seatLimit, 10);
      if (limit < existing.seatsConfirmed) {
        return res.status(400).json({
          error: `Seat capacity cannot be less than already confirmed registrations (${existing.seatsConfirmed}).`
        });
      }
      data.seatLimit = limit;
    }

    // Fee validations
    if (isFree !== undefined) data.isFree = Boolean(isFree);
    if (standardFee !== undefined) data.standardFee = parseFloat(standardFee);
    if (ieeeFee !== undefined) data.ieeeFee = parseFloat(ieeeFee);

    const effectiveStdFee = data.standardFee !== undefined ? data.standardFee : existing.standardFee;
    const effectiveIeeeFee = data.ieeeFee !== undefined ? data.ieeeFee : existing.ieeeFee;
    const effectiveIsFree = data.isFree !== undefined ? data.isFree : existing.isFree;

    if (!effectiveIsFree && existing.organizingBody.type === 'IEEE') {
      if (effectiveIeeeFee >= effectiveStdFee) {
        return res.status(400).json({
          error: 'IEEE fee must be strictly lower than the standard fee for IEEE events.'
        });
      }
    }

    if (status) {
      data.status = status;
    }

    const updated = await prisma.event.update({
      where: { id },
      data,
      include: { organizingBody: true }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'EVENT_UPDATED',
      entity: 'Event',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      req
    });

    return res.json({ message: 'Event updated successfully.', event: updated });
  } catch (err) {
    console.error('Update event error:', err);
    return res.status(500).json({ error: 'Failed to update event.' });
  }
}

/**
 * Approver / Admin: Review Event (FR-4.4)
 */
async function reviewEvent(req, res) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'APPROVE' or 'REJECT'

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (action === 'APPROVE') {
      const updated = await prisma.event.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          rejectionReason: null
        }
      });

      await logAuditEvent({
        actor: req.user,
        action: 'EVENT_APPROVED',
        entity: 'Event',
        entityId: id,
        newValue: { status: 'PUBLISHED' },
        req
      });

      if (event.createdById) {
        await prisma.notification.create({
          data: {
            userId: event.createdById,
            title: 'Event Proposal Approved!',
            message: `Your event "${event.title}" has been approved and published to the portal.`,
            type: 'EVENT_UPDATE',
            link: `/events/${id}`
          }
        });
      }

      return res.json({ message: 'Event approved and published.', event: updated });
    } else if (action === 'REJECT') {
      const updated = await prisma.event.update({
        where: { id },
        data: {
          status: 'DRAFT',
          rejectionReason: rejectionReason || 'Proposal requires revisions.'
        }
      });

      await logAuditEvent({
        actor: req.user,
        action: 'EVENT_REJECTED',
        entity: 'Event',
        entityId: id,
        newValue: { status: 'DRAFT', rejectionReason },
        req
      });

      if (event.createdById) {
        await prisma.notification.create({
          data: {
            userId: event.createdById,
            title: 'Event Proposal Rejected',
            message: `Your event "${event.title}" proposal requires revisions: ${rejectionReason || 'Please review guidelines.'}`,
            type: 'EVENT_UPDATE',
            link: `/organizer/events/${id}/edit`
          }
        });
      }

      return res.json({ message: 'Event proposal rejected and returned to draft.', event: updated });
    } else {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
    }
  } catch (err) {
    console.error('Review event error:', err);
    return res.status(500).json({ error: 'Failed to process event review.' });
  }
}

/**
 * Organizer / Admin: Cancel Event (FR-4.5)
 * Marks event CANCELLED, cancels all confirmed registrations, and notifies all registrants
 */
async function cancelEvent(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { status: 'CONFIRMED' },
          include: { user: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Event is already cancelled.' });
    }

    // Perform cancellation in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update event status
      await tx.event.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          refundPolicy: `Event cancelled: ${reason || 'Cancelled by organizer'}`
        }
      });

      // 2. Cancel all registrations
      await tx.registration.updateMany({
        where: { eventId: id, status: 'CONFIRMED' },
        data: { status: 'CANCELLED' }
      });
    });

    // 3. Notify all confirmed registrants
    for (const reg of event.registrations) {
      await prisma.notification.create({
        data: {
          userId: reg.userId,
          title: `Event Cancelled: ${event.title}`,
          message: `The event "${event.title}" scheduled for ${new Date(event.startDateTime).toLocaleDateString()} has been cancelled. Reason: ${reason || 'Administrative reasons'}.`,
          type: 'EVENT_UPDATE',
          link: `/events/${id}`
        }
      });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'EVENT_CANCELLED',
      entity: 'Event',
      entityId: id,
      newValue: { reason, affectedRegistrations: event.registrations.length },
      req
    });

    return res.json({
      message: `Event cancelled successfully. ${event.registrations.length} registrants notified.`
    });
  } catch (err) {
    console.error('Cancel event error:', err);
    return res.status(500).json({ error: 'Failed to cancel event.' });
  }
}

/**
 * Organizer / Admin: Close Registrations (FR-4.5)
 */
async function closeRegistrations(req, res) {
  try {
    const { id } = req.params;

    const updated = await prisma.event.update({
      where: { id },
      data: { status: 'REGISTRATION_CLOSED' }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'REGISTRATION_CLOSED',
      entity: 'Event',
      entityId: id,
      req
    });

    return res.json({ message: 'Registrations closed successfully.', event: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close registrations.' });
  }
}

/**
 * Approver: List Pending Proposals (FR-4.4)
 */
async function getPendingEvents(req, res) {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        organizingBody: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pending event proposals.' });
  }
}

/**
 * Organizer: List Events managed by Current User
 */
async function getOrganizerEvents(req, res) {
  try {
    let where = {};

    if (req.user.role === 'ADMIN') {
      // Admins see all events
    } else {
      // Find organizing bodies assigned to user
      const assignments = await prisma.organizerAssignment.findMany({
        where: { userId: req.user.id }
      });
      const bodyIds = assignments.map((a) => a.organizingBodyId);

      where = {
        OR: [
          { organizingBodyId: { in: bodyIds } },
          { createdById: req.user.id }
        ]
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizingBody: true,
        _count: {
          select: {
            registrations: true,
            attendances: true,
            certificates: true
          }
        }
      },
      orderBy: { startDateTime: 'desc' }
    });

    return res.json({ events });
  } catch (err) {
    console.error('Get organizer events error:', err);
    return res.status(500).json({ error: 'Failed to fetch organizer events.' });
  }
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  reviewEvent,
  cancelEvent,
  closeRegistrations,
  getPendingEvents,
  getOrganizerEvents,
  computeApplicableFee
};

