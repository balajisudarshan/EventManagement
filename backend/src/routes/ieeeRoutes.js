const express = require('express');
const {
  submitMembership,
  getMyMembership,
  listMemberships,
  reviewMembership,
  bulkUploadMembers
} = require('../controllers/ieeeController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Student routes
router.post('/submit', requireAuth, submitMembership);
router.get('/my', requireAuth, getMyMembership);

// Coordinator / Admin review routes
router.get('/', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), listMemberships);
router.patch('/:id/review', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), reviewMembership);
router.post('/bulk-upload', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), bulkUploadMembers);

module.exports = router;

