const express = require('express');
const {
  listBodies,
  getBodyById,
  createBody,
  updateBody,
  assignCoordinator,
  removeCoordinator,
  getMyBodies
} = require('../controllers/bodyController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public / student: List and get body details
router.get('/', listBodies);
router.get('/my', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getMyBodies);
router.get('/:id', getBodyById);

// Admin-only management routes
router.post('/', requireAuth, requireRole(['ADMIN']), createBody);
router.put('/:id', requireAuth, requireRole(['ADMIN']), updateBody);
router.post('/:id/coordinators', requireAuth, requireRole(['ADMIN']), assignCoordinator);
router.delete('/:id/coordinators/:userId', requireAuth, requireRole(['ADMIN']), removeCoordinator);

module.exports = router;

