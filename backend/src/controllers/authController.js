const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logAuditEvent } = require('../middleware/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'cems-default-secret-key-32chars';

/**
 * Sign JWT Token
 */
function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Sanitize User Object
 */
function sanitizeUser(user) {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

/**
 * Student / User Registration (FR-1.1, FR-1.2)
 */
async function register(req, res) {
  try {
    const { name, email, password, rollNo, department, year, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized }
    });

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default to STUDENT unless an admin is provisioning
    const userRole = (req.user?.role === 'ADMIN' && role) ? role : 'STUDENT';

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalized,
        passwordHash,
        rollNo: rollNo ? rollNo.trim() : null,
        department: department ? department.trim() : null,
        year: year ? year.trim() : null,
        phone: phone ? phone.trim() : null,
        role: userRole,
        isActive: true,
        isEmailVerified: true // Immediate activation per exclusions
      },
      include: {
        ieeeMembership: true,
        assignedBodies: true
      }
    });

    const token = createToken(user);

    // Link any certificates previously issued to this user's email
    await prisma.certificate.updateMany({
      where: {
        userId: null,
        recipientEmail: { equals: emailNormalized, mode: 'insensitive' }
      },
      data: { userId: user.id }
    });

    // Welcome in-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to CEMS!',
        message: 'Your account is active. Explore events, submit IEEE membership, or register for upcoming workshops.',
        type: 'SYSTEM',
        link: '/events'
      }
    });

    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

/**
 * User Login (FR-1.3)
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        ieeeMembership: true,
        assignedBodies: {
          include: {
            organizingBody: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createToken(user);

    return res.json({
      message: 'Signed in successfully.',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

/**
 * Get Current User Profile (FR-1.6)
 */
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        ieeeMembership: true,
        assignedBodies: {
          include: {
            organizingBody: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}

/**
 * Update Profile (FR-1.6)
 */
async function updateProfile(req, res) {
  try {
    const { name, rollNo, department, year, phone } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        rollNo: rollNo !== undefined ? rollNo.trim() : undefined,
        department: department !== undefined ? department.trim() : undefined,
        year: year !== undefined ? year.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined
      },
      include: {
        ieeeMembership: true,
        assignedBodies: {
          include: {
            organizingBody: true
          }
        }
      }
    });

    return res.json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(updated)
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

/**
 * Change Password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to change password.' });
  }
}

/**
 * Admin: List All Users (FR-1.5)
 */
async function listUsers(req, res) {
  try {
    const { role, search, department } = req.query;

    const where = {};
    if (role) where.role = role;
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        department: true,
        year: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        ieeeMembership: true,
        assignedBodies: {
          include: {
            organizingBody: true
          }
        }
      }
    });

    return res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

/**
 * Admin: Update User Role (FR-1.5)
 */
async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'ORGANIZER', 'APPROVER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role specified.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const oldRole = targetUser.role;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ROLE_CHANGE',
      entity: 'User',
      entityId: userId,
      oldValue: { role: oldRole },
      newValue: { role },
      req
    });

    // In-app notification to the user
    await prisma.notification.create({
      data: {
        userId,
        title: 'Account Role Updated',
        message: `Your account role was changed to ${role} by administrator ${req.user.name}.`,
        type: 'SYSTEM'
      }
    });

    return res.json({ message: 'User role updated successfully.', user: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
}

/**
 * Admin: Toggle User Active Status (FR-1.5)
 */
async function toggleUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'USER_STATUS_TOGGLED',
      entity: 'User',
      entityId: userId,
      oldValue: { isActive: targetUser.isActive },
      newValue: { isActive: Boolean(isActive) },
      req
    });

    return res.json({ message: 'User status updated successfully.', user: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle user status.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  listUsers,
  updateUserRole,
  toggleUserStatus
};

