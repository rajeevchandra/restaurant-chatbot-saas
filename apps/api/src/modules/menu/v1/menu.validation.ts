import { z } from 'zod';

/**
 * Validation Schemas for Menu Module
 */

// Category Schemas
export const createCategorySchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(100, 'Category name must be less than 100 characters'),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().uuid('Invalid category ID'),
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(100, 'Category name must be less than 100 characters')
      .optional(),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
      .nullable(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const categoryIdSchema = z.object({
  params: z.object({
    categoryId: z.string().uuid('Invalid category ID'),
  }),
});

// Menu Item Schemas
export const createMenuItemSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid('Invalid category ID'),
    name: z.string()
      .min(1, 'Item name is required')
      .max(200, 'Item name must be less than 200 characters'),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    price: z.number()
      .min(0, 'Price must be >= 0')
      .max(999999.99, 'Price is too large'),
    imageUrl: z.string()
      .url('Invalid image URL')
      .optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
});

export const updateMenuItemSchema = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID'),
  }),
  body: z.object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    name: z.string()
      .min(1, 'Item name is required')
      .max(200, 'Item name must be less than 200 characters')
      .optional(),
    description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .nullable(),
    price: z.number()
      .min(0, 'Price must be >= 0')
      .max(999999.99, 'Price is too large')
      .optional(),
    imageUrl: z.string()
      .url('Invalid image URL')
      .optional()
      .nullable(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
});

export const menuItemIdSchema = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID'),
  }),
});

export const listMenuItemsSchema = z.object({
  query: z.object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    isAvailable: z.enum(['true', 'false']).optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    pageSize: z.string().regex(/^\d+$/, 'Page size must be a number').optional(),
  }),
});

// Menu Item Option Schemas
export const createMenuItemOptionSchema = z.object({
  body: z.object({
    menuItemId: z.string().uuid('Invalid menu item ID'),
    name: z.string()
      .min(1, 'Option name is required')
      .max(100, 'Option name must be less than 100 characters'),
    isRequired: z.boolean().optional(),
    minSelections: z.number()
      .int('Min selections must be an integer')
      .min(0, 'Min selections must be >= 0')
      .optional(),
    maxSelections: z.number()
      .int('Max selections must be an integer')
      .min(1, 'Max selections must be >= 1')
      .optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
}).refine(
  (data) => {
    if (data.body.minSelections !== undefined && data.body.maxSelections !== undefined) {
      return data.body.minSelections <= data.body.maxSelections;
    }
    return true;
  },
  {
    message: 'Min selections must be <= max selections',
    path: ['body', 'minSelections'],
  }
);

export const updateMenuItemOptionSchema = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID'),
    optionId: z.string().uuid('Invalid option ID'),
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Option name is required')
      .max(100, 'Option name must be less than 100 characters')
      .optional(),
    isRequired: z.boolean().optional(),
    minSelections: z.number()
      .int('Min selections must be an integer')
      .min(0, 'Min selections must be >= 0')
      .optional(),
    maxSelections: z.number()
      .int('Max selections must be an integer')
      .min(1, 'Max selections must be >= 1')
      .optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
}).refine(
  (data) => {
    if (data.body.minSelections !== undefined && data.body.maxSelections !== undefined) {
      return data.body.minSelections <= data.body.maxSelections;
    }
    return true;
  },
  {
    message: 'Min selections must be <= max selections',
    path: ['body', 'minSelections'],
  }
);

export const menuItemOptionIdSchema = z.object({
  params: z.object({
    itemId: z.string().uuid('Invalid item ID'),
    optionId: z.string().uuid('Invalid option ID'),
  }),
});

// Option Value Schemas
export const createOptionValueSchema = z.object({
  body: z.object({
    optionId: z.string().uuid('Invalid option ID'),
    value: z.string()
      .min(1, 'Value is required')
      .max(100, 'Value must be less than 100 characters'),
    priceModifier: z.number()
      .min(-999999.99, 'Price modifier is too low')
      .max(999999.99, 'Price modifier is too high')
      .optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
});

export const updateOptionValueSchema = z.object({
  params: z.object({
    optionId: z.string().uuid('Invalid option ID'),
    valueId: z.string().uuid('Invalid value ID'),
  }),
  body: z.object({
    value: z.string()
      .min(1, 'Value is required')
      .max(100, 'Value must be less than 100 characters')
      .optional(),
    priceModifier: z.number()
      .min(-999999.99, 'Price modifier is too low')
      .max(999999.99, 'Price modifier is too high')
      .optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be >= 0')
      .optional(),
  }),
});

export const optionValueIdSchema = z.object({
  params: z.object({
    optionId: z.string().uuid('Invalid option ID'),
    valueId: z.string().uuid('Invalid value ID'),
  }),
});

// Public Menu Schema
export const publicMenuSchema = z.object({
  params: z.object({
    slug: z.string()
      .min(1, 'Restaurant slug is required')
      .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  }),
});

// Type exports
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>['body'];
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>['body'];
export type ListMenuItemsQuery = z.infer<typeof listMenuItemsSchema>['query'];
export type CreateMenuItemOptionInput = z.infer<typeof createMenuItemOptionSchema>['body'];
export type UpdateMenuItemOptionInput = z.infer<typeof updateMenuItemOptionSchema>['body'];
export type CreateOptionValueInput = z.infer<typeof createOptionValueSchema>['body'];
export type UpdateOptionValueInput = z.infer<typeof updateOptionValueSchema>['body'];
