const express = require('express');
const {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  downloadTicketPdf,
  getEventRegistrations
} = require('../controllers/registrationController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Student registration operations
router.post('/events/:eventId/register', requireAuth, registerForEvent);
router.post('/:id/cancel', requireAuth, cancelRegistration);
router.get('/my', requireAuth, getMyRegistrations);
router.get('/:id/ticket.pdf', requireAuth, downloadTicketPdf);

// Organizer / Admin registration list
router.get('/events/:eventId', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventRegistrations);

module.exports = router;

