import prisma from '../../../db/prisma';
import { BotState, BotSession, CartItem, BotContext } from './bot.types';
import logger from '../../../lib/logger';

/**
 * Session storage service for bot conversations
 * Handles persistence of bot sessions in the database
 */
export class BotSessionStore {
  /**
   * Gets or creates a bot session
   */
  async getOrCreateSession(
    restaurantId: string,
    sessionId: string
  ): Promise<BotSession> {
    let session = await prisma.botSession.findFirst({
      where: {
        restaurantId,
        sessionId,
      },
    });

    if (!session) {
      session = await prisma.botSession.create({
        data: {
          restaurantId,
          sessionId,
          state: 'GREETING',
          cartItems: JSON.stringify([]),
          context: JSON.stringify({}),
          lastMessageAt: new Date(),
        },
      });

      logger.info({
        msg: 'New bot session created',
        restaurantId,
        sessionId,
      });
    }

    return this.toBotSession(session);
  }

  /**
   * Updates bot session state
   */
  async updateSession(
    sessionId: string,
    updates: {
      state?: BotState;
      cart?: CartItem[];
      context?: BotContext;
      orderId?: string;
    }
  ): Promise<BotSession> {
    const updateData: any = {
      lastMessageAt: new Date(),
    };

    if (updates.state) {
      updateData.state = updates.state;
    }

    if (updates.cart) {
      updateData.cartItems = JSON.stringify(updates.cart);
    }

    if (updates.context) {
      updateData.context = JSON.stringify(updates.context);
    }

    if (updates.orderId) {
      updateData.orderId = updates.orderId;
    }

    const session = await prisma.botSession.update({
      where: { sessionId },
      data: updateData,
    });

    logger.debug({
      msg: 'Bot session updated',
      sessionId,
      state: session.state,
    });

    return this.toBotSession(session);
  }

  /**
   * Gets session by ID
   */
  async getSession(sessionId: string): Promise<BotSession | null> {
    const session = await prisma.botSession.findUnique({
      where: { sessionId },
    });

    return session ? this.toBotSession(session) : null;
  }

  /**
   * Deletes old sessions (cleanup)
   */
  async cleanupOldSessions(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.botSession.deleteMany({
      where: {
        lastMessageAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info({
      msg: 'Old bot sessions cleaned up',
      deletedCount: result.count,
      olderThanDays,
    });

    return result.count;
  }

  /**
   * Resets session to initial state
   */
  async resetSession(sessionId: string): Promise<BotSession> {
    return this.updateSession(sessionId, {
      state: 'GREETING',
      cart: [],
      context: {},
    });
  }

  // ========================================
  // Helpers
  // ========================================

  private toBotSession(dbSession: any): BotSession {
    return {
      sessionId: dbSession.sessionId,
      restaurantId: dbSession.restaurantId,
      state: dbSession.state as BotState,
      cart: this.parseCart(dbSession.cartItems),
      context: this.parseContext(dbSession.context),
      updatedAt: dbSession.lastMessageAt,
    };
  }

  private parseCart(cartJson: string | null): CartItem[] {
    if (!cartJson) return [];
    try {
      return JSON.parse(cartJson);
    } catch {
      logger.warn('Failed to parse cart JSON');
      return [];
    }
  }

  private parseContext(contextJson: string | null): BotContext {
    if (!contextJson) return {};
    try {
      return JSON.parse(contextJson);
    } catch {
      logger.warn('Failed to parse context JSON');
      return {};
    }
  }
}
