const prisma = require('../config/prisma');

/**
 * Organizer: Live Statistics for an Event (FR-12.2)
 */
async function getEventLiveStats(req, res) {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizingBody: true,
        registrations: {
          include: {
            user: { select: { department: true, year: true } }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const confirmed = event.registrations.filter((r) => r.status === 'CONFIRMED');
    const waitlisted = event.registrations.filter((r) => r.status === 'WAITLISTED');
    const cancelled = event.registrations.filter((r) => r.status === 'CANCELLED');
    const attended = confirmed.filter((r) => r.attended);

    const ieeeRegistrations = confirmed.filter((r) => r.feeType === 'IEEE').length;
    const standardRegistrations = confirmed.filter((r) => r.feeType === 'STANDARD').length;
    const freeRegistrations = confirmed.filter((r) => r.feeType === 'FREE').length;

    // Revenue / Fee collection total
    const totalRevenue = confirmed.reduce((acc, curr) => acc + (curr.feeApplied || 0), 0);

    const seatsLeft = Math.max(0, event.seatLimit - event.seatsConfirmed);
    const capacityPercent = Math.min(100, Math.round((event.seatsConfirmed / event.seatLimit) * 100));
    const attendanceRate = confirmed.length > 0
      ? Math.round((attended.length / confirmed.length) * 100)
      : 0;

    // Department breakdown
    const departmentDistribution = {};
    confirmed.forEach((r) => {
      const dept = r.user?.department || 'Unspecified';
      departmentDistribution[dept] = (departmentDistribution[dept] || 0) + 1;
    });

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        seatLimit: event.seatLimit,
        seatsConfirmed: event.seatsConfirmed,
        seatsLeft,
        capacityPercent
      },
      counts: {
        confirmed: confirmed.length,
        waitlisted: waitlisted.length,
        cancelled: cancelled.length,
        attended: attended.length,
        absent: confirmed.length - attended.length
      },
      split: {
        ieeeCount: ieeeRegistrations,
        standardCount: standardRegistrations,
        freeCount: freeRegistrations
      },
      revenue: {
        total: totalRevenue,
        currency: 'INR'
      },
      attendanceRate: `${attendanceRate}%`,
      departmentDistribution
    });
  } catch (err) {
    console.error('Event live stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch event statistics.' });
  }
}

/**
 * Organizer: Export Registrations to CSV (FR-12.1)
 */
async function exportRegistrationsCsv(req, res) {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      include: {
        user: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Generate CSV string
    const headers = [
      'Ticket Code',
      'Student Name',
      'Email',
      'Roll Number',
      'Department',
      'Year',
      'Phone',
      'Status',
      'Fee Type',
      'Fee Applied (INR)',
      'Attended',
      'Registered At'
    ];

    const rows = registrations.map((r) => [
      `"${r.ticketCode || ''}"`,
      `"${r.user?.name || ''}"`,
      `"${r.user?.email || ''}"`,
      `"${r.user?.rollNo || ''}"`,
      `"${r.user?.department || ''}"`,
      `"${r.user?.year || ''}"`,
      `"${r.user?.phone || ''}"`,
      `"${r.status}"`,
      `"${r.feeType}"`,
      r.feeApplied || 0,
      r.attended ? 'Yes' : 'No',
      `"${new Date(r.createdAt).toISOString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${event.id}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export registrations CSV.' });
  }
}

/**
 * Admin: Institution-Wide Analytics (FR-12.3)
 */
async function getInstitutionAnalytics(req, res) {
  try {
    const totalUsers = await prisma.user.count();
    const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
    const organizerCount = await prisma.user.count({ where: { role: 'ORGANIZER' } });
    const verifiedIeeeCount = await prisma.ieeeMembership.count({ where: { status: 'VERIFIED' } });

    const totalEvents = await prisma.event.count();
    const publishedEvents = await prisma.event.count({ where: { status: 'PUBLISHED' } });
    const completedEvents = await prisma.event.count({ where: { status: 'COMPLETED' } });

    const totalBodies = await prisma.organizingBody.count();
    const ieeeBodies = await prisma.organizingBody.count({ where: { type: 'IEEE' } });
    const generalBodies = await prisma.organizingBody.count({ where: { type: 'GENERAL' } });

    const totalRegistrations = await prisma.registration.count({ where: { status: 'CONFIRMED' } });
    const totalCertificates = await prisma.certificate.count({ where: { status: 'VALID' } });

    // Events by Category
    const eventsByCategory = await prisma.event.groupBy({
      by: ['category'],
      _count: { id: true }
    });

    // Total fees collected across all events
    const registrations = await prisma.registration.findMany({
      where: { status: 'CONFIRMED' },
      select: { feeApplied: true }
    });
    const totalFeeVolume = registrations.reduce((acc, curr) => acc + (curr.feeApplied || 0), 0);

    return res.json({
      metrics: {
        totalUsers,
        studentCount,
        organizerCount,
        verifiedIeeeCount,
        totalEvents,
        publishedEvents,
        completedEvents,
        totalBodies,
        ieeeBodies,
        generalBodies,
        totalRegistrations,
        totalCertificates,
        totalFeeVolume
      },
      eventsByCategory: eventsByCategory.map((c) => ({
        category: c.category,
        count: c._count.id
      }))
    });
  } catch (err) {
    console.error('Institution analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch institution analytics.' });
  }
}

/**
 * Admin: Audit Logs Viewer (FR-12.4)
 */
async function getAuditLogs(req, res) {
  try {
    const { action, entity, search, limit = 100 } = req.query;

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10) || 100
    });

    return res.json({ logs });
  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
}

module.exports = {
  getEventLiveStats,
  exportRegistrationsCsv,
  getInstitutionAnalytics,
  getAuditLogs
};

