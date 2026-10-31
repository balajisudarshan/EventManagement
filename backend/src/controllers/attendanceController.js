const prisma = require('../config/prisma');
const { logAuditEvent } = require('../middleware/audit');

/**
 * Helper to extract ticketCode from QR payload or raw ticket string
 */
function parseTicketCode(payload) {
  if (!payload) return '';
  const trimmed = payload.trim();
  // Standard payload: "CEMS:TKT-XXX:eventId:userId"
  if (trimmed.startsWith('CEMS:')) {
    const parts = trimmed.split(':');
    return parts[1] || trimmed;
  }
  return trimmed;
}

/**
 * Organizer / Admin: Mark Attendance via QR Code Scan (FR-9.1, FR-9.3, FR-9.4)
 */
async function markAttendanceScan(req, res) {
  try {
    const { eventId } = req.params;
    const { qrPayload, date } = req.body;

    if (!qrPayload) {
      return res.status(400).json({ error: 'QR code payload is required.' });
    }

    const ticketCode = parseTicketCode(qrPayload);
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Find registration
    const registration = await prisma.registration.findFirst({
      where: {
        eventId,
        ticketCode
      },
      include: {
        user: true,
        event: true
      }
    });

    if (!registration) {
      return res.status(404).json({
        error: `No registration found for ticket code "${ticketCode}" under this event.`,
        isInvalid: true
      });
    }

    if (registration.status !== 'CONFIRMED') {
      return res.status(400).json({
        error: `Cannot mark attendance: Registration status is ${registration.status}.`,
        registration
      });
    }

    // FR-9.4: Duplicate scan detection
    const existingScan = await prisma.attendance.findUnique({
      where: {
        registrationId_date: {
          registrationId: registration.id,
          date: attendanceDate
        }
      }
    });

    if (existingScan) {
      return res.status(200).json({
        status: 'DUPLICATE',
        message: `Already marked present on ${attendanceDate} at ${new Date(existingScan.timestamp).toLocaleTimeString()}.`,
        alreadyMarked: true,
        attendance: existingScan,
        attendee: {
          name: registration.user.name,
          email: registration.user.email,
          rollNo: registration.user.rollNo,
          ticketCode: registration.ticketCode
        }
      });
    }

    // Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        registrationId: registration.id,
        eventId,
        date: attendanceDate,
        markedById: req.user.id,
        method: 'QR_SCAN'
      }
    });

    // Mark registration.attended = true
    await prisma.registration.update({
      where: { id: registration.id },
      data: { attended: true }
    });

    // In-app notification to student
    await prisma.notification.create({
      data: {
        userId: registration.userId,
        title: 'Attendance Confirmed',
        message: `Your attendance for "${registration.event.title}" on ${attendanceDate} was marked successfully.`,
        type: 'SYSTEM',
        link: '/dashboard/registrations'
      }
    });

    return res.status(201).json({
      status: 'SUCCESS',
      message: `Attendance marked successfully for ${registration.user.name}.`,
      attendance,
      attendee: {
        name: registration.user.name,
        email: registration.user.email,
        rollNo: registration.user.rollNo,
        ticketCode: registration.ticketCode
      }
    });
  } catch (err) {
    console.error('QR scan attendance error:', err);
    return res.status(500).json({ error: 'Failed to process QR attendance.' });
  }
}

/**
 * Organizer / Admin: Mark Attendance Manually (FR-9.2)
 */
async function markAttendanceManual(req, res) {
  try {
    const { eventId, registrationId } = req.params;
    const { date, attended } = req.body;

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, event: true }
    });

    if (!registration || registration.eventId !== eventId) {
      return res.status(404).json({ error: 'Registration not found for this event.' });
    }

    if (attended === false) {
      // Remove attendance record
      await prisma.attendance.deleteMany({
        where: {
          registrationId,
          date: attendanceDate
        }
      });

      // Check if any other days exist
      const remaining = await prisma.attendance.count({
        where: { registrationId }
      });

      if (remaining === 0) {
        await prisma.registration.update({
          where: { id: registrationId },
          data: { attended: false }
        });
      }

      return res.json({ message: 'Attendance unmarked.', attended: false });
    }

    // Upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        registrationId_date: {
          registrationId,
          date: attendanceDate
        }
      },
      update: {
        markedById: req.user.id,
        method: 'MANUAL',
        timestamp: new Date()
      },
      create: {
        registrationId,
        eventId,
        date: attendanceDate,
        markedById: req.user.id,
        method: 'MANUAL'
      }
    });

    await prisma.registration.update({
      where: { id: registrationId },
      data: { attended: true }
    });

    return res.json({ message: 'Attendance marked manually.', attendance, attended: true });
  } catch (err) {
    console.error('Manual attendance error:', err);
    return res.status(500).json({ error: 'Failed to mark manual attendance.' });
  }
}

/**
 * Organizer / Admin: Bulk Attendance Upload (CSV / Array) (FR-9.2)
 */
async function bulkUploadAttendance(req, res) {
  try {
    const { eventId } = req.params;
    const { entries, date } = req.body; // entries can be array of ticketCodes or rollNumbers

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty array of attendee entries.' });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const results = {
      total: entries.length,
      marked: 0,
      skipped: []
    };

    for (const entry of entries) {
      const codeOrRoll = typeof entry === 'string' ? entry.trim() : (entry.ticketCode || entry.rollNo || '').trim();

      if (!codeOrRoll) continue;

      // Find registration by ticketCode or user rollNo
      const reg = await prisma.registration.findFirst({
        where: {
          eventId,
          status: 'CONFIRMED',
          OR: [
            { ticketCode: codeOrRoll },
            { user: { rollNo: codeOrRoll } }
          ]
        },
        include: { user: true }
      });

      if (!reg) {
        results.skipped.push({ entry: codeOrRoll, reason: 'No confirmed registration found.' });
        continue;
      }

      // Check duplicate
      const exists = await prisma.attendance.findUnique({
        where: {
          registrationId_date: {
            registrationId: reg.id,
            date: attendanceDate
          }
        }
      });

      if (exists) {
        results.skipped.push({ entry: codeOrRoll, reason: 'Already marked for this date.' });
        continue;
      }

      await prisma.attendance.create({
        data: {
          registrationId: reg.id,
          eventId,
          date: attendanceDate,
          markedById: req.user.id,
          method: 'CSV_BULK'
        }
      });

      await prisma.registration.update({
        where: { id: reg.id },
        data: { attended: true }
      });

      results.marked++;
    }

    await logAuditEvent({
      actor: req.user,
      action: 'ATTENDANCE_BULK_UPLOAD',
      entity: 'Attendance',
      entityId: eventId,
      newValue: { count: results.marked, date: attendanceDate },
      req
    });

    return res.json({
      message: `Bulk attendance recorded: ${results.marked} attendees marked present, ${results.skipped.length} skipped.`,
      results
    });
  } catch (err) {
    console.error('Bulk attendance upload error:', err);
    return res.status(500).json({ error: 'Failed to process bulk attendance upload.' });
  }
}

/**
 * Organizer / Admin: Get Attendance Roster & Statistics (FR-12.2)
 */
async function getAttendanceStats(req, res) {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
            attendances: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const confirmedCount = event._count.registrations;
    const attendedDistinct = await prisma.registration.count({
      where: {
        eventId,
        status: 'CONFIRMED',
        attended: true
      }
    });

    const attendanceRate = confirmedCount > 0
      ? Math.round((attendedDistinct / confirmedCount) * 100)
      : 0;

    return res.json({
      totalConfirmed: confirmedCount,
      totalAttended: attendedDistinct,
      absentCount: confirmedCount - attendedDistinct,
      attendanceRate: `${attendanceRate}%`,
      eventTitle: event.title
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch attendance statistics.' });
  }
}

module.exports = {
  markAttendanceScan,
  markAttendanceManual,
  bulkUploadAttendance,
  getAttendanceStats
};

