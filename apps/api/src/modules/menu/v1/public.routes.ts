import { Router } from 'express';
import { menuController } from './menu.controller';
import { optionalAuth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import rateLimit from 'express-rate-limit';
import { publicMenuSchema } from './menu.validation';

const router = Router();

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Higher limit for public endpoints
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/menu:
 *   get:
 *     summary: Get public menu for a restaurant
 *     description: Returns full menu with categories, items, and options. Includes soldOut status from inventory. No authentication required.
 *     tags: [Public - Menu]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-z0-9-]+$
 *         description: Restaurant slug (lowercase letters, numbers, hyphens only)
 *         example: test-restaurant
 *     responses:
 *       200:
 *         description: Public menu with active categories and items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       displayOrder:
 *                         type: integer
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             price:
 *                               type: number
 *                             imageUrl:
 *                               type: string
 *                               nullable: true
 *                             displayOrder:
 *                               type: integer
 *                             soldOut:
 *                               type: boolean
 *                               description: Calculated from inventory quantity
 *                             options:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   isRequired:
 *                                     type: boolean
 *                                   minSelections:
 *                                     type: integer
 *                                   maxSelections:
 *                                     type: integer
 *                                   displayOrder:
 *                                     type: integer
 *                                   values:
 *                                     type: array
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         id:
 *                                           type: string
 *                                         value:
 *                                           type: string
 *                                         priceModifier:
 *                                           type: number
 *                                         displayOrder:
 *                                           type: integer
 *       404:
 *         description: Restaurant not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/:slug/menu',
  publicLimiter,
  optionalAuth(),
  validate(publicMenuSchema),
  (req, res, next) => menuController.getPublicMenu(req, res).catch(next)
);

export default router;
