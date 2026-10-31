const prisma = require('../config/prisma');

/**
 * Record an audit log entry for system traceability
 */
async function logAuditEvent({ actor, action, entity, entityId, oldValue, newValue, req }) {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        actorName: actor?.name || 'System / Anonymous',
        actorRole: actor?.role || 'SYSTEM',
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  logAuditEvent
};

