const express = require('express');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  reviewEvent,
  cancelEvent,
  closeRegistrations,
  getPendingEvents,
  getOrganizerEvents
} = require('../controllers/eventController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public / Student discovery (optionalAuth allows calculating user-specific fee discount)
router.get('/', optionalAuth, getEvents);
router.get('/organizer/my-events', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getOrganizerEvents);
router.get('/approver/pending', requireAuth, requireRole(['APPROVER', 'ADMIN']), getPendingEvents);
router.get('/:id', optionalAuth, getEventById);

// Organizer / Admin event creation & management
router.post('/', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), createEvent);
router.put('/:id', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), updateEvent);
router.post('/:id/cancel', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), cancelEvent);
router.post('/:id/close-registrations', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), closeRegistrations);

// Approver / Admin workflow
router.post('/:id/review', requireAuth, requireRole(['APPROVER', 'ADMIN']), reviewEvent);

module.exports = router;

