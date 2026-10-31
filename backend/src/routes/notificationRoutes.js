const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement
} = require('../controllers/notificationController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getNotifications);
router.patch('/:id/read', requireAuth, markAsRead);
router.post('/mark-all-read', requireAuth, markAllAsRead);

// Organizer / Admin announcement broadcast (FR-11.2)
router.post('/events/:eventId/announce', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), broadcastAnnouncement);

module.exports = router;

