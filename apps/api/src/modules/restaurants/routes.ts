import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { UserRole } from '@restaurant-saas/shared';

const router = Router();

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Get restaurant details
 *     tags:
 *       - Restaurants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success. Returns restaurant details.
 *       404:
 *         description: Restaurant not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Get restaurant details
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.restaurantId },
  });

  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  res.json({ success: true, data: restaurant });
});

// Update restaurant
/**
 * @swagger
 * /api/restaurants:
 *   patch:
 *     summary: Update restaurant details
 *     tags:
 *       - Restaurants
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               timezone:
 *                 type: string
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success. Returns updated restaurant.
 *       404:
 *         description: Restaurant not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  '/',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: AuthRequest, res: Response) => {
    const { name, description, address, phone, email, timezone, currency } = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id: req.restaurantId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(timezone && { timezone }),
        ...(currency && { currency }),
      },
    });

    res.json({ success: true, data: restaurant });
  }
);

export default router;
