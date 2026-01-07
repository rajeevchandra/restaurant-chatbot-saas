import type { Request, Response } from 'express';
import { menuService } from './menu.service';
import { successResponse, createdResponse } from '../../../lib/responses';
import { getRestaurantId } from '../../../middleware/tenant';
import logger from '../../../lib/logger';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  ListMenuItemsQuery,
} from './menu.validation';

export class MenuController {
  // ========================================
  // CATEGORIES
  // ========================================

  async listCategories(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const categories = await menuService.listCategories(restaurantId);
    successResponse(res, categories);
  }

  async getCategory(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { categoryId } = req.params;
    const category = await menuService.getCategory(restaurantId, categoryId);
    successResponse(res, category);
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const data = req.body as CreateCategoryInput;
    
    logger.info({ restaurantId, name: data.name }, 'Creating category');
    
    const category = await menuService.createCategory(restaurantId, data);
    createdResponse(res, category);
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { categoryId } = req.params;
    const { description, ...rest } = req.body as UpdateCategoryInput;
    const data = {
      ...rest,
      ...(description !== undefined && { description: description ?? undefined })
    };
    
    logger.info({ restaurantId, categoryId }, 'Updating category');
    
    const category = await menuService.updateCategory(restaurantId, categoryId, data);
    successResponse(res, category);
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { categoryId } = req.params;
    
    logger.info({ restaurantId, categoryId }, 'Deleting category');
    
    await menuService.deleteCategory(restaurantId, categoryId);
    res.status(204).send();
  }

  // ========================================
  // MENU ITEMS
  // ========================================

  async listMenuItems(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const query = req.query as ListMenuItemsQuery;
    
    const filters = {
      categoryId: query.categoryId,
      isAvailable: query.isAvailable === 'true' ? true : query.isAvailable === 'false' ? false : undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    };
    
    const result = await menuService.listMenuItems(restaurantId, filters);
    successResponse(res, result);
  }

  async getMenuItem(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { itemId } = req.params;
    const item = await menuService.getMenuItem(restaurantId, itemId);
    successResponse(res, item);
  }

  async createMenuItem(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const data = req.body as CreateMenuItemInput;
    
    logger.info({ restaurantId, name: data.name, price: data.price }, 'Creating menu item');
    
    const item = await menuService.createMenuItem(restaurantId, data);
    createdResponse(res, item);
  }

  async updateMenuItem(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { itemId } = req.params;
    const { description, imageUrl, ...rest } = req.body as UpdateMenuItemInput;
    const data = {
      ...rest,
      ...(description !== undefined && { description: description ?? undefined }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl ?? undefined })
    };
    
    logger.info({ restaurantId, itemId }, 'Updating menu item');
    
    const item = await menuService.updateMenuItem(restaurantId, itemId, data);
    successResponse(res, item);
  }

  async deleteMenuItem(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { itemId } = req.params;
    
    logger.info({ restaurantId, itemId }, 'Deleting menu item');
    
    await menuService.deleteMenuItem(restaurantId, itemId);
    res.status(204).send();
  }

  // ========================================
  // PUBLIC MENU
  // ========================================

  async getPublicMenu(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    
    logger.info({ slug }, 'Fetching public menu');
    
    const menu = await menuService.getPublicMenu(slug);
    successResponse(res, menu);
  }
}

export const menuController = new MenuController();
