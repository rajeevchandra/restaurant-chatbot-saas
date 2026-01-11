import { Router } from 'express';
import { menuController } from './menu.controller';
import { requireAuth, requireRole } from '../../../middleware/auth';
import { UserRole } from '@restaurant-saas/shared';
import { attachTenant, requireTenant } from '../../../middleware/tenant';
import { validate } from '../../../middleware/validate';
import rateLimit from 'express-rate-limit';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemIdSchema,
  listMenuItemsSchema,
} from './menu.validation';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================================
// CATEGORIES
// ========================================

/**
 * @swagger
 * /api/v1/admin/menu/categories:
 *   get:
 *     summary: List all menu categories
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories with item counts
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/categories',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  (req, res, next) => menuController.listCategories(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/categories/{categoryId}:
 *   get:
 *     summary: Get single category
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get(
  '/categories/:categoryId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  validate(categoryIdSchema),
  (req, res, next) => menuController.getCategory(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation error or duplicate name
 */
router.post(
  '/categories',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(createCategorySchema),
  (req, res, next) => menuController.createCategory(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/categories/{categoryId}:
 *   put:
 *     summary: Update category
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
router.put(
  '/categories/:categoryId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(updateCategorySchema),
  (req, res, next) => menuController.updateCategory(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/categories/{categoryId}:
 *   delete:
 *     summary: Delete category (soft delete)
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Category deleted
 *       400:
 *         description: Cannot delete category with active items
 */
router.delete(
  '/categories/:categoryId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER),
  validate(categoryIdSchema),
  (req, res, next) => menuController.deleteCategory(req, res).catch(next)
);

// ========================================
// MENU ITEMS
// ========================================

/**
 * @swagger
 * /api/v1/admin/menu/items:
 *   get:
 *     summary: List menu items with pagination
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of menu items with soldOut status
 */
router.get(
  '/items',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  validate(listMenuItemsSchema),
  (req, res, next) => menuController.listMenuItems(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/items/{itemId}:
 *   get:
 *     summary: Get menu item with options
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Menu item details with options and values
 */
router.get(
  '/items/:itemId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  validate(menuItemIdSchema),
  (req, res, next) => menuController.getMenuItem(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/items:
 *   post:
 *     summary: Create menu item
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *               - price
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999999.99
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               isAvailable:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Menu item created
 */
router.post(
  '/items',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(createMenuItemSchema),
  (req, res, next) => menuController.createMenuItem(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/items/{itemId}:
 *   put:
 *     summary: Update menu item
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999999.99
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               isAvailable:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Menu item updated
 */
router.put(
  '/items/:itemId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(updateMenuItemSchema),
  (req, res, next) => menuController.updateMenuItem(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/menu/items/{itemId}:
 *   delete:
 *     summary: Delete menu item (soft delete)
 *     tags: [Admin - Menu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Menu item deleted
 */
router.delete(
  '/items/:itemId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole(UserRole.OWNER),
  validate(menuItemIdSchema),
  (req, res, next) => menuController.deleteMenuItem(req, res).catch(next)
);

export default router;
