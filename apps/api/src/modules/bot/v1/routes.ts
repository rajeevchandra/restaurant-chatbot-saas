import { Router } from 'express';
import { BotController } from './bot.controller';
import { resolveRestaurantBySlug, requireTenant } from '../../../middleware/tenant';
import { optionalAuth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { sendMessageSchema, getSessionSchema } from './bot.validation';
import { publicLimiter } from '../../../middleware/rateLimiter';

const router = Router();
const controller = new BotController();

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/bot/message:
 *   post:
 *     summary: Send message to chatbot
 *     description: Processes user message through bot FSM and returns appropriate response with quick replies and cards
 *     tags: [Public - Bot]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - message
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Unique session identifier (generate on client)
 *               message:
 *                 type: string
 *                 description: User's message text
 *                 maxLength: 1000
 *               channel:
 *                 type: string
 *                 enum: [WEB, SMS, WHATSAPP]
 *                 default: WEB
 *     responses:
 *       200:
 *         description: Message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     quickReplies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           value:
 *                             type: string
 *                     cards:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           subtitle:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           buttons:
 *                             type: array
 *                 sessionState:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     state:
 *                       type: string
 *                       enum: [GREETING, BROWSE_MENU, ITEM_DETAILS, CART, CUSTOMER_INFO, CONFIRM, PAYMENT, STATUS, CANCEL, HELP]
 *                     cart:
 *                       type: array
 *                     context:
 *                       type: object
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:slug/bot/message',
  publicLimiter,
  resolveRestaurantBySlug,
  requireTenant,
  optionalAuth,
  validate(sendMessageSchema),
  controller.sendMessage.bind(controller)
);

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/bot/session/{sessionId}:
 *   get:
 *     summary: Get bot session state
 *     description: Retrieves current session state including cart and context
 *     tags: [Public - Bot]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session retrieved
 *       404:
 *         description: Session not found
 */
router.get(
  '/:slug/bot/session/:sessionId',
  publicLimiter,
  resolveRestaurantBySlug,
  requireTenant,
  optionalAuth,
  validate(getSessionSchema),
  controller.getSession.bind(controller)
);

export default router;
