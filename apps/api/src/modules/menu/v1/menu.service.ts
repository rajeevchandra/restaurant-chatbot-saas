import prisma from '../../../db/prisma';
import { NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type {
  CategoryDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  MenuItemDTO,
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
  MenuItemOptionDTO,
  CreateMenuItemOptionDTO,
  UpdateMenuItemOptionDTO,
  OptionValueDTO,
  CreateOptionValueDTO,
  UpdateOptionValueDTO,
  PublicMenuDTO,
  PaginatedResponse,
} from './menu.types';

export class MenuService {
  // ========================================
  // CATEGORIES
  // ========================================

  async listCategories(restaurantId: string): Promise<CategoryDTO[]> {
    if (!restaurantId) {
      logger.error('SECURITY: listCategories called without restaurantId');
      throw new ValidationError('restaurantId is required');
    }

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      itemCount: cat._count.menuItems,
    }));
  }

  async getCategory(restaurantId: string, categoryId: string): Promise<CategoryDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      itemCount: category._count.menuItems,
    };
  }

  async createCategory(restaurantId: string, data: CreateCategoryDTO): Promise<CategoryDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const existing = await prisma.menuCategory.findFirst({
      where: {
        restaurantId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ValidationError(`Category "${data.name}" already exists`);
    }

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: data.name,
        description: data.description || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    logger.info({ restaurantId, categoryId: category.id, name: category.name }, 'Category created');

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      itemCount: 0,
    };
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    data: UpdateCategoryDTO
  ): Promise<CategoryDTO> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    await this.getCategory(restaurantId, categoryId);

    if (data.name) {
      const existing = await prisma.menuCategory.findFirst({
        where: {
          restaurantId,
          name: data.name,
          NOT: { id: categoryId },
        },
      });

      if (existing) {
        throw new ValidationError(`Category "${data.name}" already exists`);
      }
    }

    const category = await prisma.menuCategory.update({
      where: { id: categoryId, restaurantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    logger.info({ restaurantId, categoryId, changes: Object.keys(data) }, 'Category updated');

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      itemCount: category._count.menuItems,
    };
  }

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    await this.getCategory(restaurantId, categoryId);

    const activeItemCount = await prisma.menuItem.count({
      where: {
        categoryId,
        restaurantId,
        isAvailable: true,
      },
    });

    if (activeItemCount > 0) {
      throw new ValidationError(
        `Cannot delete category with ${activeItemCount} active items. Deactivate items first.`
      );
    }

    await prisma.menuCategory.update({
      where: { id: categoryId, restaurantId },
      data: { isActive: false },
    });

    logger.info({ restaurantId, categoryId }, 'Category soft deleted');
  }

  // ========================================
  // MENU ITEMS
  // ========================================

  async listMenuItems(
    restaurantId: string,
    filters: {
      categoryId?: string;
      isAvailable?: boolean;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResponse<MenuItemDTO>> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 50, 100);
    const skip = (page - 1) * pageSize;

    const where = {
      restaurantId,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.isAvailable !== undefined && { isAvailable: filters.isAvailable }),
    };

    const [items, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          inventory: {
            select: { id: true, quantity: true },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.menuItem.count({ where }),
    ]);

    const itemDTOs: MenuItemDTO[] = items.map((item: any) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
      soldOut: item.inventory ? item.inventory.quantity <= 0 : false,
      category: item.category,
    }));

    return {
      items: itemDTOs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMenuItem(restaurantId: string, itemId: string): Promise<MenuItemDTO> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventory: {
          select: { id: true, quantity: true },
        },
        options: {
          include: {
            values: {
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Menu item not found');
    }

    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
      soldOut: item.inventory ? item.inventory.quantity <= 0 : false,
      category: item.category,
      options: item.options.map((opt: any) => ({
        id: opt.id,
        menuItemId: opt.menuItemId,
        name: opt.name,
        isRequired: opt.isRequired,
        minSelections: opt.minSelections,
        maxSelections: opt.maxSelections,
        displayOrder: opt.displayOrder,
        values: opt.values.map((val: any) => ({
          id: val.id,
          optionId: val.optionId,
          value: val.value,
          priceModifier: Number(val.priceModifier),
          isAvailable: val.isAvailable,
          displayOrder: val.displayOrder,
        })),
      })),
    };
  }

  async createMenuItem(restaurantId: string, data: CreateMenuItemDTO): Promise<MenuItemDTO> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
    });

    if (!category) {
      throw new ValidationError('Category not found or does not belong to this restaurant');
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        isAvailable: data.isAvailable ?? true,
        displayOrder: data.displayOrder ?? 0,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    logger.info({ restaurantId, itemId: item.id, name: item.name }, 'Menu item created');

    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
      soldOut: false,
      category: item.category,
    };
  }

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    data: UpdateMenuItemDTO
  ): Promise<MenuItemDTO> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    await this.getMenuItem(restaurantId, itemId);

    if (data.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: data.categoryId, restaurantId },
      });

      if (!category) {
        throw new ValidationError('Category not found or does not belong to this restaurant');
      }
    }

    const item = await prisma.menuItem.update({
      where: { id: itemId, restaurantId },
      data: {
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventory: {
          select: { id: true, quantity: true },
        },
      },
    });

    logger.info({ restaurantId, itemId, changes: Object.keys(data) }, 'Menu item updated');

    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
      soldOut: item.inventory ? item.inventory.quantity <= 0 : false,
      category: item.category,
    };
  }

  async deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
    if (!restaurantId) {
      throw new ValidationError('restaurantId is required');
    }

    await this.getMenuItem(restaurantId, itemId);

    await prisma.menuItem.update({
      where: { id: itemId, restaurantId },
      data: { isAvailable: false },
    });

    logger.info({ restaurantId, itemId }, 'Menu item soft deleted');
  }

  // ========================================
  // PUBLIC MENU
  // ========================================

  async getPublicMenu(slug: string): Promise<PublicMenuDTO> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug, isActive: true },
      include: {
        categories: {
          where: { isActive: true },
          include: {
            menuItems: {
              where: { isAvailable: true },
              include: {
                inventory: {
                  select: { quantity: true },
                },
                options: {
                  include: {
                    values: {
                      where: { isAvailable: true },
                      orderBy: { displayOrder: 'asc' },
                    },
                  },
                  orderBy: { displayOrder: 'asc' },
                },
              },
              orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
            },
          },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    return {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
      },
      categories: restaurant.categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        items: cat.menuItems.map((item: any) => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          displayOrder: item.displayOrder,
          soldOut: item.inventory ? item.inventory.quantity <= 0 : false,
          options: item.options.map((opt: any) => ({
            id: opt.id,
            menuItemId: opt.menuItemId,
            name: opt.name,
            isRequired: opt.isRequired,
            minSelections: opt.minSelections,
            maxSelections: opt.maxSelections,
            displayOrder: opt.displayOrder,
            values: opt.values.map((val: any) => ({
              id: val.id,
              optionId: val.optionId,
              value: val.value,
              priceModifier: Number(val.priceModifier),
              isAvailable: val.isAvailable,
              displayOrder: val.displayOrder,
            })),
          })),
        })),
      })),
    };
  }

  // ========================================
  // HELPER METHODS FOR BOT
  // ========================================

  async getRestaurantInfo(restaurantId: string) {
    return await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });
  }
}

export const menuService = new MenuService();
