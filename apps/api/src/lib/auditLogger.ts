import prisma from '../db/prisma';
import logger from '../lib/logger';

/**
 * Audit Log Service
 * Records important admin actions for compliance and debugging
 */

export interface AuditLogEntry {
  userId: string;
  restaurantId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  /**
   * Logs an admin action to the database
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          restaurantId: entry.restaurantId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          timestamp: new Date(),
        },
      });

      logger.info({
        msg: 'Audit log recorded',
        userId: entry.userId,
        restaurantId: entry.restaurantId,
        action: entry.action,
        resourceType: entry.resourceType,
      });
    } catch (error: any) {
      // Don't fail the request if audit logging fails
      logger.error({
        msg: 'Failed to record audit log',
        error: error.message,
        entry,
      });
    }
  }

  /**
   * Retrieves audit logs with filters
   */
  async getLogs(filters: {
    restaurantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.restaurantId) {
      where.restaurantId = filters.restaurantId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    return logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      restaurantId: log.restaurantId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      changes: log.changes ? JSON.parse(log.changes) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      timestamp: log.timestamp,
    }));
  }
}

export const auditLogger = new AuditLogger();
