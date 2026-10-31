const prisma = require('../config/prisma');

/**
 * Get Current User's Notifications (FR-11.3)
 */
async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

/**
 * Mark Single Notification as Read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

/**
 * Mark All Notifications as Read
 */
async function markAllAsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notifications.' });
  }
}

/**
 * Organizer / Admin: Send Announcement to All Registrants (FR-11.2)
 */
async function broadcastAnnouncement(req, res) {
  try {
    const { eventId } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Announcement title and message are required.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          where: { status: 'CONFIRMED' },
          select: { userId: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const registrants = event.registrations;
    if (registrants.length === 0) {
      return res.status(400).json({ error: 'No confirmed registrants found for this event.' });
    }

    // Create notification records in bulk
    const notificationData = registrants.map((r) => ({
      userId: r.userId,
      title: `Announcement: ${title}`,
      message: `[${event.title}] ${message}`,
      type: 'ANNOUNCEMENT',
      link: `/events/${eventId}`
    }));

    await prisma.notification.createMany({
      data: notificationData
    });

    return res.json({
      message: `Announcement broadcast successfully to ${registrants.length} attendees.`,
      recipientCount: registrants.length
    });
  } catch (err) {
    console.error('Broadcast announcement error:', err);
    return res.status(500).json({ error: 'Failed to broadcast announcement.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement
};

