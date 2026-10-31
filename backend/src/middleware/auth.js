const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'cems-default-secret-key-32chars';

/**
 * Middleware to require authenticated user
 */
async function requireAuth(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ieeeMembership: true,
        assignedBodies: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account is inactive or not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Optional authentication: attaches user if present, otherwise continues as guest
 */
async function optionalAuth(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          ieeeMembership: true,
          assignedBodies: true
        }
      });
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * Middleware to enforce role-based permissions
 * @param {string[]} roles
 */
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Admin has superuser access across all modules
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole
};

