const express = require('express');
const {
  markAttendanceScan,
  markAttendanceManual,
  bulkUploadAttendance,
  getAttendanceStats
} = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Organizer / Admin attendance actions
router.post('/events/:eventId/scan', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), markAttendanceScan);
router.post('/events/:eventId/registrations/:registrationId', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), markAttendanceManual);
router.post('/events/:eventId/bulk-upload', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), bulkUploadAttendance);
router.get('/events/:eventId/stats', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getAttendanceStats);

module.exports = router;

