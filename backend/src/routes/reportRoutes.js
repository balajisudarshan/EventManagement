const express = require('express');
const {
  getEventLiveStats,
  exportRegistrationsCsv,
  getInstitutionAnalytics,
  getAuditLogs
} = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Organizer: Event stats & CSV export
router.get('/events/:eventId/live-stats', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventLiveStats);
router.get('/events/:eventId/export.csv', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), exportRegistrationsCsv);

// Admin: Institution-wide dashboard & audit logs
router.get('/admin/analytics', requireAuth, requireRole(['ADMIN']), getInstitutionAnalytics);
router.get('/admin/audit-logs', requireAuth, requireRole(['ADMIN']), getAuditLogs);

module.exports = router;

