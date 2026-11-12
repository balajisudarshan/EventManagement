const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  listUsers,
  updateUserRole,
  toggleUserStatus,
  promoteUser
} = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Authenticated user profile routes
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePassword);

// Admin-only user management routes
router.get('/users', requireAuth, requireRole(['ADMIN']), listUsers);
router.post('/users/:userId/promote', requireAuth, requireRole(['ADMIN']), promoteUser);
router.patch('/users/:userId/role', requireAuth, requireRole(['ADMIN']), updateUserRole);
router.patch('/users/:userId/status', requireAuth, requireRole(['ADMIN']), toggleUserStatus);

module.exports = router;

