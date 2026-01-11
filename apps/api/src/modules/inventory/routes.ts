import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { UserRole } from '@restaurant-saas/shared';
import { validate } from '../../middleware/validate';
import { updateInventorySchema, toggleSoldOutSchema } from '@restaurant-saas/shared';

const router = Router();

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory items for the restaurant
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success. Returns inventory items.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Get all inventory
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  console.log('INVENTORY ROUTE: handler entered. req.restaurantId =', req.restaurantId, 'req.user =', req.user);
  try {
    console.log('INVENTORY ROUTE: about to call prisma.inventory.findMany');
    const inventory = await prisma.inventory.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        menuItem: { select: { name: true, isAvailable: true } },
      },
    });
    console.log('INVENTORY ROUTE: prisma.inventory.findMany resolved. inventory:', Array.isArray(inventory) ? inventory.length : inventory);
    res.json({ success: true, data: inventory });
    console.log('INVENTORY ROUTE: response sent successfully');
  } catch (err) {
    console.error('INVENTORY ROUTE: error during query', err);
    if (!res.headersSent) {
      const details = typeof err === 'object' && err && 'message' in err ? (err as any).message : undefined;
      res.status(500).json({ error: 'Failed to fetch inventory', details });
      console.log('INVENTORY ROUTE: error response sent');
    } else {
      console.log('INVENTORY ROUTE: headers already sent after error');
    }
  }
  console.log('INVENTORY ROUTE: handler exit');
});

// Update inventory quantity and threshold
/**
 * @swagger
 * /api/inventory/{menuItemId}:
 *   patch:
 *     summary: Update inventory quantity and threshold for a menu item
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               lowStockThreshold:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Success. Returns updated inventory.
 *       404:
 *         description: Menu item not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  '/:menuItemId',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
  validate(updateInventorySchema),
  async (req: AuthRequest, res: Response) => {
    const { menuItemId } = req.params;
    const { quantity, lowStockThreshold } = req.body;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: req.restaurantId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const inventory = await prisma.inventory.upsert({
      where: { menuItemId },
      update: {
        quantity,
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
      },
      create: {
        restaurantId: req.restaurantId!,
        menuItemId,
        quantity,
        lowStockThreshold: lowStockThreshold ?? 10,
      },
    });

    res.json({ success: true, data: inventory });
  }
);

// Toggle sold out status
/**
 * @swagger
 * /api/inventory/{menuItemId}/sold-out:
 *   patch:
 *     summary: Toggle sold out status for a menu item
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isSoldOut:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success. Returns updated inventory.
 *       404:
 *         description: Menu item not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  '/:menuItemId/sold-out',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
  validate(toggleSoldOutSchema),
  async (req: AuthRequest, res: Response) => {
    const { menuItemId } = req.params;
    const { isSoldOut } = req.body;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: req.restaurantId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const inventory = await prisma.inventory.upsert({
      where: { menuItemId },
      update: {
        quantity: isSoldOut ? 0 : 999,
      },
      create: {
        restaurantId: req.restaurantId!,
        menuItemId,
        quantity: isSoldOut ? 0 : 999,
      },
    });

    res.json({ success: true, data: inventory });
  }
);

export default router;
