import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateInventorySchema, toggleSoldOutSchema } from '@restaurant-saas/shared';

const router = Router();

// Get all inventory
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const inventory = await prisma.inventory.findMany({
    where: { restaurantId: req.restaurantId },
    include: {
      menuItem: { select: { name: true, isAvailable: true } },
    },
  });

  res.json({ success: true, data: inventory });
});

// Update inventory quantity and threshold
router.patch(
  '/:menuItemId',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STAFF'),
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
router.patch(
  '/:menuItemId/sold-out',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STAFF'),
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
