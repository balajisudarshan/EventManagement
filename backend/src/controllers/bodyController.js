const prisma = require('../config/prisma');
const { logAuditEvent } = require('../middleware/audit');

/**
 * List all Organizing Bodies (FR-3.1)
 */
async function listBodies(req, res) {
  try {
    const { type } = req.query;
    const where = {};
    if (type) where.type = type;

    const bodies = await prisma.organizingBody.findMany({
      where,
      include: {
        coordinators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, department: true }
            }
          }
        },
        _count: {
          select: { events: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ bodies });
  } catch (err) {
    console.error('List bodies error:', err);
    return res.status(500).json({ error: 'Failed to fetch organizing bodies.' });
  }
}

/**
 * Get Single Organizing Body by ID
 */
async function getBodyById(req, res) {
  try {
    const { id } = req.params;
    const body = await prisma.organizingBody.findUnique({
      where: { id },
      include: {
        coordinators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, department: true }
            }
          }
        },
        events: {
          where: { status: 'PUBLISHED' },
          orderBy: { startDateTime: 'asc' }
        }
      }
    });

    if (!body) {
      return res.status(404).json({ error: 'Organizing body not found.' });
    }

    return res.json({ body });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch organizing body.' });
  }
}

/**
 * Admin: Create Organizing Body (FR-3.1)
 */
async function createBody(req, res) {
  try {
    const { name, type, description, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Body name is required.' });
    }

    const bodyType = type === 'IEEE' ? 'IEEE' : 'GENERAL';

    const existing = await prisma.organizingBody.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(409).json({ error: 'An organizing body with this name already exists.' });
    }

    const body = await prisma.organizingBody.create({
      data: {
        name: name.trim(),
        type: bodyType,
        description: description ? description.trim() : null,
        logoUrl: logoUrl || null
      }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'BODY_CREATED',
      entity: 'OrganizingBody',
      entityId: body.id,
      newValue: body,
      req
    });

    return res.status(201).json({ message: 'Organizing body created.', body });
  } catch (err) {
    console.error('Create body error:', err);
    return res.status(500).json({ error: 'Failed to create organizing body.' });
  }
}

/**
 * Admin: Update Organizing Body
 */
async function updateBody(req, res) {
  try {
    const { id } = req.params;
    const { name, type, description, logoUrl } = req.body;

    const existing = await prisma.organizingBody.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Organizing body not found.' });
    }

    const updated = await prisma.organizingBody.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? (type === 'IEEE' ? 'IEEE' : 'GENERAL') : undefined,
        description: description !== undefined ? description.trim() : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined
      }
    });

    await logAuditEvent({
      actor: req.user,
      action: 'BODY_UPDATED',
      entity: 'OrganizingBody',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      req
    });

    return res.json({ message: 'Organizing body updated.', body: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update organizing body.' });
  }
}

/**
 * Admin: Assign Organizer to Body (FR-3.2)
 */
async function assignCoordinator(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Ensure user has ORGANIZER or ADMIN role
    if (targetUser.role === 'STUDENT') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ORGANIZER' }
      });
    }

    const assignment = await prisma.organizerAssignment.upsert({
      where: {
        userId_organizingBodyId: {
          userId,
          organizingBodyId: id
        }
      },
      update: {},
      create: {
        userId,
        organizingBodyId: id
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        title: 'Assigned as Organizer',
        message: `You were assigned as coordinator for organizing body.`,
        type: 'SYSTEM',
        link: '/organizer'
      }
    });

    return res.json({ message: 'Coordinator assigned successfully.', assignment });
  } catch (err) {
    console.error('Assign coordinator error:', err);
    return res.status(500).json({ error: 'Failed to assign coordinator.' });
  }
}

/**
 * Admin: Remove Coordinator from Body
 */
async function removeCoordinator(req, res) {
  try {
    const { id, userId } = req.params;

    await prisma.organizerAssignment.deleteMany({
      where: {
        organizingBodyId: id,
        userId
      }
    });

    return res.json({ message: 'Coordinator removed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove coordinator.' });
  }
}

/**
 * Organizer: Get Bodies Managed by Current User
 */
async function getMyBodies(req, res) {
  try {
    if (req.user.role === 'ADMIN') {
      const bodies = await prisma.organizingBody.findMany({
        orderBy: { name: 'asc' }
      });
      return res.json({ bodies });
    }

    const assignments = await prisma.organizerAssignment.findMany({
      where: { userId: req.user.id },
      include: { organizingBody: true }
    });

    const bodies = assignments.map((a) => a.organizingBody);
    return res.json({ bodies });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch assigned bodies.' });
  }
}

module.exports = {
  listBodies,
  getBodyById,
  createBody,
  updateBody,
  assignCoordinator,
  removeCoordinator,
  getMyBodies
};

