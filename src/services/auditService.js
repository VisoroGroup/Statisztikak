const prisma = require('../config/database');

/**
 * Log an audit event
 */
async function logAction(organizationId, userId, action, entityType, entityId = null, details = null, ipAddress = null) {
    try {
        await prisma.auditLog.create({
            data: {
                organizationId,
                userId,
                action,
                entityType,
                entityId: entityId ? String(entityId) : null,
                details,
                ipAddress,
            },
        });
    } catch (err) {
        console.error('Audit log error:', err);
        // Don't throw - audit logging should never block operations
    }
}

module.exports = { logAction };
