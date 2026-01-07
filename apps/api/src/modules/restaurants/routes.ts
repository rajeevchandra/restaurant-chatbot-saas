import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = Router();

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
router.patch(
  '/',
  authenticate,
  authorize('OWNER'),
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
