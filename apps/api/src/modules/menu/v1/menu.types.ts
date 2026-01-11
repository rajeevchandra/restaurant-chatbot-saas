import { Prisma } from '@prisma/client';

/**
 * DTO Types for Menu Module
 */

// Category DTOs
export interface CategoryDTO {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  itemCount?: number;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// Menu Item DTOs
export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
  soldOut?: boolean; // From inventory
  category?: {
    id: string;
    name: string;
  };
  options?: MenuItemOptionDTO[];
}

export interface CreateMenuItemDTO {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface UpdateMenuItemDTO {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

// Menu Item Option DTOs
export interface MenuItemOptionDTO {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  values?: OptionValueDTO[];
}

export interface CreateMenuItemOptionDTO {
  menuItemId: string;
  name: string;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
}

export interface UpdateMenuItemOptionDTO {
  name?: string;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
}

// Option Value DTOs
export interface OptionValueDTO {
  id: string;
  optionId: string;
  value: string;
  priceModifier: number;
  isAvailable: boolean;
  displayOrder: number;
}

export interface CreateOptionValueDTO {
  optionId: string;
  value: string;
  priceModifier?: number;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface UpdateOptionValueDTO {
  value?: string;
  priceModifier?: number;
  isAvailable?: boolean;
  displayOrder?: number;
}

// Public Menu Response
export interface PublicMenuDTO {
  restaurant: {
    id: string;
    slug: string;
    name: string;
  };
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    items: MenuItemDTO[];
  }>;
}

// List responses with pagination
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
import { MenuCategory, MenuItem, MenuItemOption, MenuItemOptionValue } from '@restaurant-saas/shared';

// Database models with relations
export type CategoryWithRelations = MenuCategory & {
  menuItems?: MenuItem[];
};

export type MenuItemWithRelations = MenuItem & {
  category?: MenuCategory;
  options?: MenuItemOptionWithRelations[];
  inventory?: { id: string; quantity: number; isTracked: boolean } | null;
};

export type MenuItemOptionWithRelations = MenuItemOption & {
  values?: MenuItemOptionValue[];
};
