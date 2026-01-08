import { Router, Response } from 'express';
import { validate } from '../../middleware/validate';
import { resolvePublicTenant, TenantRequest } from '../../middleware/tenant';
import { botMessageSchema } from '@restaurant-saas/shared';
import { BotEngine } from './engine';
import prisma from '../../db/prisma';

const router = Router();

// Get menu (public endpoint)
router.get(
  '/restaurants/:slug/menu',
  resolvePublicTenant,
  async (req: TenantRequest, res: Response) => {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: req.tenant!.restaurantId, isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true },
          include: {
            options: {
              include: { values: true },
              orderBy: { displayOrder: 'asc' },
            },
            inventory: {
              select: {
                quantity: true,
              }
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Transform data to include sold-out flag at item level
    const categoriesWithSoldOut = categories.map(category => ({
      ...category,
      menuItems: category.menuItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        displayOrder: item.displayOrder,
        isSoldOut: item.inventory ? item.inventory.quantity === 0 : false,
        quantity: item.inventory?.quantity ?? 0,
        options: item.options,
      }))
    }));

    res.json({ success: true, data: categoriesWithSoldOut });
  }
);

// Send bot message (public endpoint)
router.post(
  '/restaurants/:slug/bot/message',
  resolvePublicTenant,
  validate(botMessageSchema),
  async (req: TenantRequest, res: Response) => {
    const { sessionId, message } = req.body;

    const botEngine = new BotEngine(req.tenant!.restaurantId);
    const response = await botEngine.processMessage(sessionId, message);

    res.json({
      success: true,
      data: {
        sessionId,
        text: response.text,
        quickReplies: response.quickReplies,
        cards: response.cards,
        data: response.data,
      },
    });
  }
);

// Get bot session (public endpoint) - for retrieving cart state
router.get(
  '/restaurants/:slug/bot/session/:sessionId',
  resolvePublicTenant,
  async (req: TenantRequest, res: Response) => {
    const { sessionId } = req.params;

    const session = await prisma.botSession.findUnique({
      where: { sessionId },
      select: {
        sessionId: true,
        state: true,
        context: true,
        orderId: true,
        lastMessageAt: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const context = session.context ? JSON.parse(session.context) : {};

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        state: session.state,
        cartItems: context.cartItems || [],
        orderId: session.orderId,
        lastMessageAt: session.lastMessageAt,
      },
    });
  }
);

export default router;
