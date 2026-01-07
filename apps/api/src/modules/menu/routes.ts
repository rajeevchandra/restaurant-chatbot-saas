import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { 
  createCategorySchema, 
  updateCategorySchema,
  createMenuItemSchema, 
  updateMenuItemSchema,
  createOptionSchema,
  updateOptionSchema,
  createOptionValueSchema,
  updateOptionValueSchema
} from '@restaurant-saas/shared';

const router = Router();

// ============ ADMIN ENDPOINTS (Authenticated) ============

// Get all menu items with categories (Admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: req.restaurantId },
    include: {
      menuItems: {
        include: {
          options: {
            include: { values: true },
            orderBy: { displayOrder: 'asc' },
          },
          inventory: true,
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  res.json({ success: true, data: categories });
});

// ============ CATEGORY CRUD ============

// Create category
router.post(
  '/categories',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(createCategorySchema),
  async (req: AuthRequest, res: Response) => {
    const data = req.body;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: req.restaurantId!,
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: category });
  }
);

// Update category
router.patch(
  '/categories/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(updateCategorySchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await prisma.menuCategory.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: category });
  }
);

// Delete category
router.delete(
  '/categories/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.menuCategory.delete({ where: { id } });

    res.json({ success: true, message: 'Category deleted' });
  }
);

// ============ MENU ITEM CRUD ============

// Create menu item
router.post(
  '/items',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(createMenuItemSchema),
  async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Verify category belongs to restaurant
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId: req.restaurantId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        restaurantId: req.restaurantId!,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl,
        isAvailable: data.isAvailable ?? true,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: menuItem });
  }
);

// Update menu item
router.patch(
  '/items/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(updateMenuItemSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // If updating category, verify it belongs to restaurant
    if (data.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: data.categoryId, restaurantId: req.restaurantId },
      });

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: menuItem });
  }
);

// Delete menu item
router.delete(
  '/items/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await prisma.menuItem.delete({ where: { id } });

    res.json({ success: true, message: 'Menu item deleted' });
  }
);

// ============ OPTION CRUD ============

// Create option
router.post(
  '/options',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(createOptionSchema),
  async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: data.menuItemId, restaurantId: req.restaurantId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const option = await prisma.menuItemOption.create({
      data: {
        menuItemId: data.menuItemId,
        name: data.name,
        isRequired: data.isRequired ?? false,
        allowMultiple: data.allowMultiple ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: option });
  }
);

// Update option
router.patch(
  '/options/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(updateOptionSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.menuItemOption.findFirst({
      where: { 
        id,
        menuItem: { restaurantId: req.restaurantId }
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Option not found' });
    }

    const option = await prisma.menuItemOption.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: option });
  }
);

// Delete option
router.delete(
  '/options/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.menuItemOption.findFirst({
      where: { 
        id,
        menuItem: { restaurantId: req.restaurantId }
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Option not found' });
    }

    await prisma.menuItemOption.delete({ where: { id } });

    res.json({ success: true, message: 'Option deleted' });
  }
);

// ============ OPTION VALUE CRUD ============

// Create option value
router.post(
  '/option-values',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(createOptionValueSchema),
  async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Verify option belongs to restaurant
    const option = await prisma.menuItemOption.findFirst({
      where: { 
        id: data.optionId,
        menuItem: { restaurantId: req.restaurantId }
      },
    });

    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    const value = await prisma.menuItemOptionValue.create({
      data: {
        optionId: data.optionId,
        value: data.name,
        priceModifier: data.priceModifier ?? 0,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: value });
  }
);

// Update option value
router.patch(
  '/option-values/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  validate(updateOptionValueSchema),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.menuItemOptionValue.findFirst({
      where: { 
        id,
        option: {
          menuItem: { restaurantId: req.restaurantId }
        }
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Option value not found' });
    }

    const value = await prisma.menuItemOptionValue.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: value });
  }
);

// Delete option value
router.delete(
  '/option-values/:id',
  authenticate,
  authorize('OWNER', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.menuItemOptionValue.findFirst({
      where: { 
        id,
        option: {
          menuItem: { restaurantId: req.restaurantId }
        }
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Option value not found' });
    }

    await prisma.menuItemOptionValue.delete({ where: { id } });

    res.json({ success: true, message: 'Option value deleted' });
  }
);

export default router;
