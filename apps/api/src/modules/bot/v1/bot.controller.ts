import { Request, Response, NextFunction } from 'express';
import { BotEngine } from './bot.engine';
import { successResponse } from '../../../lib/responses';
import { getRestaurantId } from '../../../middleware/tenant';
import logger from '../../../lib/logger';
import { SendMessageInput, GetSessionInput } from './bot.validation';

const botEngine = new BotEngine();

export class BotController {
  /**
   * Processes a user message and returns bot response
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = getRestaurantId(req);
      const data: SendMessageInput['body'] = req.body;

      const response = await botEngine.processMessage(restaurantId, {
        sessionId: data.sessionId,
        message: data.message,
        channel: data.channel,
      });

      logger.info({
        msg: 'Bot message processed',
        restaurantId,
        sessionId: data.sessionId,
        state: response.sessionState.state,
      });

      successResponse(res, response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets current session state
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await botEngine.getSession(sessionId);

      if (!session) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Session not found',
          },
        });
        return;
      }

      successResponse(res, session);
    } catch (error) {
      next(error);
    }
  }
}
