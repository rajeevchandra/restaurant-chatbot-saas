# Multi-Tenant Architecture & Access Patterns

## Overview

This system implements **strict multi-tenant isolation** to ensure restaurants can never access each other's data. Every database query MUST be scoped by `restaurantId`.

## Critical Rules

### 🚨 NEVER Query Without restaurantId

```typescript
// ❌ WRONG - Security violation!
const items = await prisma.menuItem.findMany();

// ✅ CORRECT - Always include restaurantId
const items = await prisma.menuItem.findMany({
  where: { restaurantId }
});
```

### 🚨 ALL Service Methods MUST Require restaurantId

```typescript
// ❌ WRONG - restaurantId is optional
async getMenu(restaurantId?: string) { }

// ✅ CORRECT - restaurantId is mandatory
async getMenu(restaurantId: string) {
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }
  // ... query with restaurantId
}
```

## Tenant Resolution Patterns

### Pattern 1: Admin Routes (Authenticated Users)

**Use Case:** Restaurant staff accessing their own data

**URL Pattern:** `/api/v1/admin/resource`

**Middleware Chain:**
```typescript
router.get('/',
  requireAuth(),        // Validates JWT, sets req.user
  attachTenant(),       // Extracts restaurantId from req.user
  requireTenant(),      // Validates tenant is attached
  requireRole('OWNER'), // RBAC enforcement
  controller.method
);
```

**How It Works:**
1. `requireAuth()` extracts JWT from `Authorization: Bearer <token>`
2. Verifies token and sets `req.user = { userId, restaurantId, role, email }`
3. `attachTenant()` extracts `restaurantId` from `req.user`
4. Sets `req.tenant = { restaurantId }`
5. `requireTenant()` validates `req.tenant` exists (fail-safe guard)
6. `requireRole()` checks if user's role matches allowed roles

**Example:**
```typescript
// Route
router.post('/menu',
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole('OWNER', 'MANAGER'),
  (req, res, next) => controller.createMenuItem(req, res).catch(next)
);

// Controller
async createMenuItem(req: Request, res: Response) {
  const restaurantId = getRestaurantId(req); // Helper extracts from req.tenant
  const data = req.body;
  
  const item = await this.menuService.createMenuItem(restaurantId, data);
  
  createdResponse(res, item, req.id);
}

// Service
async createMenuItem(restaurantId: string, data: CreateItemData) {
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }
  
  return await prisma.menuItem.create({
    data: {
      ...data,
      restaurantId, // CRITICAL: Always set restaurantId
    },
  });
}
```

### Pattern 2: Public Routes (Slug-Based)

**Use Case:** Public-facing APIs where restaurant is identified by slug

**URL Pattern:** `/api/v1/public/:slug/resource`

**Middleware Chain:**
```typescript
router.get('/',
  resolveRestaurantBySlug(), // Looks up restaurant by :slug param
  requireTenant(),           // Validates tenant is attached
  optionalAuth(),            // Optional user authentication
  controller.method
);
```

**How It Works:**
1. `resolveRestaurantBySlug()` extracts `:slug` from URL params
2. Queries database: `SELECT id, slug FROM restaurant WHERE slug = :slug AND isActive = true`
3. Sets `req.tenant = { restaurantId, restaurantSlug }`
4. `requireTenant()` validates `req.tenant` exists
5. `optionalAuth()` checks for JWT token (if present, sets `req.user`)

**Example:**
```typescript
// Route - note :slug in parent router
const publicRouter = Router({ mergeParams: true });
publicRouter.use('/:slug/menu', menuRoutes);

router.get('/',
  publicLimiter,
  resolveRestaurantBySlug(),
  requireTenant(),
  optionalAuth(),
  (req, res, next) => controller.getPublicMenu(req, res).catch(next)
);

// Controller
async getPublicMenu(req: Request, res: Response) {
  const restaurantId = getRestaurantId(req);
  const category = req.query.category as string;
  
  const menu = await this.menuService.getPublicMenu(restaurantId, category);
  
  successResponse(res, {
    restaurant: {
      id: req.tenant?.restaurantId,
      slug: req.tenant?.restaurantSlug,
    },
    items: menu,
  }, 200, req.id);
}
```

## Request Type Definitions

```typescript
// src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      id: string;              // Request ID (from requestId middleware)
      tenant?: TenantInfo;     // Tenant information
      user?: AuthUser;         // Authenticated user
    }
  }
}

interface TenantInfo {
  restaurantId: string;        // ALWAYS present after tenant resolution
  restaurantSlug?: string;     // Present when resolved by slug
}

interface AuthUser {
  userId: string;
  restaurantId: string;
  role: UserRole;              // OWNER | MANAGER | STAFF | ...
  email: string;
}
```

## Helper Functions

### `getRestaurantId(req: Request): string`

Safely extracts `restaurantId` from request. **Throws error if missing** (fail-fast).

```typescript
import { getRestaurantId } from '../middleware/tenant';

async myController(req: Request, res: Response) {
  const restaurantId = getRestaurantId(req); // Throws if missing
  // ... use restaurantId safely
}
```

### `getTenant(req: Request): TenantInfo`

Returns full tenant info including slug (if available).

```typescript
import { getTenant } from '../middleware/tenant';

async myController(req: Request, res: Response) {
  const tenant = getTenant(req);
  console.log(tenant.restaurantId, tenant.restaurantSlug);
}
```

## Repository Pattern

### CRITICAL: Always Require restaurantId

```typescript
export class MenuService {
  /**
   * CORRECT: restaurantId is mandatory parameter
   */
  async getMenu(restaurantId: string, filters?: Filters) {
    // Validate restaurantId is present
    if (!restaurantId) {
      logger.error('SECURITY VIOLATION: getMenu called without restaurantId');
      throw new Error('restaurantId is required');
    }

    // ALWAYS include restaurantId in where clause
    return await prisma.menuItem.findMany({
      where: {
        restaurantId, // MANDATORY
        ...filters,
      },
    });
  }

  /**
   * CORRECT: Create with restaurantId
   */
  async createItem(restaurantId: string, data: CreateData) {
    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    return await prisma.menuItem.create({
      data: {
        ...data,
        restaurantId, // MANDATORY: Sets owner
      },
    });
  }

  /**
   * CORRECT: Update with restaurantId in where clause
   */
  async updateItem(restaurantId: string, itemId: string, data: UpdateData) {
    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    return await prisma.menuItem.update({
      where: {
        id: itemId,
        restaurantId, // MANDATORY: Prevents cross-tenant updates
      },
      data,
    });
  }

  /**
   * CORRECT: Delete with restaurantId in where clause
   */
  async deleteItem(restaurantId: string, itemId: string) {
    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    return await prisma.menuItem.delete({
      where: {
        id: itemId,
        restaurantId, // MANDATORY: Prevents cross-tenant deletes
      },
    });
  }
}
```

## RBAC (Role-Based Access Control)

### Role Hierarchy

```typescript
enum UserRole {
  OWNER    = 'OWNER',     // Full access
  MANAGER  = 'MANAGER',   // Most operations
  STAFF    = 'STAFF',     // Limited operations
  VIEWER   = 'VIEWER'     // Read-only
}
```

### Usage Examples

```typescript
// Only owners can delete
router.delete('/:id',
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole('OWNER'),
  controller.deleteItem
);

// Owners and managers can create/update
router.post('/',
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole('OWNER', 'MANAGER'),
  controller.createItem
);

// All authenticated users can read
router.get('/',
  requireAuth(),
  attachTenant(),
  requireTenant(),
  controller.listItems
);
```

## Security Checklist

Before deploying any new endpoint, verify:

- [ ] Route has appropriate middleware chain
- [ ] Admin routes use: `requireAuth()` → `attachTenant()` → `requireTenant()`
- [ ] Public routes use: `resolveRestaurantBySlug()` → `requireTenant()`
- [ ] Controller extracts `restaurantId` using `getRestaurantId(req)`
- [ ] Service method requires `restaurantId` as parameter
- [ ] Service validates `restaurantId` is not null/undefined
- [ ] ALL Prisma queries include `where: { restaurantId }`
- [ ] Create operations set `restaurantId` in data
- [ ] Update/delete operations include `restaurantId` in where clause
- [ ] RBAC is applied using `requireRole()` where appropriate

## Example: Complete Flow

### Admin Create Menu Item

```typescript
// 1. Route Definition
router.post('/menu',
  requireAuth(),           // JWT validation
  attachTenant(),         // Extract restaurantId from user
  requireTenant(),        // Validate tenant attached
  requireRole('OWNER', 'MANAGER'), // RBAC
  validate(createMenuItemSchema),  // Input validation
  (req, res, next) => controller.createMenuItem(req, res).catch(next)
);

// 2. Controller
async createMenuItem(req: Request, res: Response) {
  const restaurantId = getRestaurantId(req); // Fail-fast extraction
  
  const requestLogger = logger.child({
    requestId: req.id,
    restaurantId,
    userId: req.user?.userId,
  });

  requestLogger.info('Creating menu item');

  const item = await this.menuService.createMenuItem(restaurantId, req.body);

  requestLogger.info({ itemId: item.id }, 'Menu item created');

  createdResponse(res, item, req.id);
}

// 3. Service
async createMenuItem(restaurantId: string, data: CreateItemData) {
  // Validate restaurantId
  if (!restaurantId) {
    logger.error('SECURITY: createMenuItem called without restaurantId');
    throw new Error('restaurantId is required');
  }

  logger.debug({ restaurantId, itemName: data.name }, 'Creating menu item');

  // Create with restaurantId
  const item = await prisma.menuItem.create({
    data: {
      ...data,
      restaurantId, // CRITICAL: Associates with restaurant
    },
  });

  logger.info({ restaurantId, itemId: item.id }, 'Menu item created');

  return item;
}
```

### Public Get Menu

```typescript
// 1. Route Definition
const publicRouter = Router({ mergeParams: true });
router.get('/',
  publicLimiter,
  resolveRestaurantBySlug(), // Resolve by :slug param
  requireTenant(),
  optionalAuth(),            // Optional user context
  (req, res, next) => controller.getPublicMenu(req, res).catch(next)
);
app.use('/api/v1/public/:slug/menu', router);

// 2. Controller
async getPublicMenu(req: Request, res: Response) {
  const restaurantId = getRestaurantId(req);
  const category = req.query.category as string;

  logger.info({ restaurantId, category }, 'Fetching public menu');

  const menu = await this.menuService.getPublicMenu(restaurantId, category);

  successResponse(res, {
    restaurant: {
      id: req.tenant?.restaurantId,
      slug: req.tenant?.restaurantSlug,
    },
    items: menu,
  }, 200, req.id);
}

// 3. Service
async getPublicMenu(restaurantId: string, category?: string) {
  if (!restaurantId) {
    throw new Error('restaurantId is required');
  }

  return await prisma.menuItem.findMany({
    where: {
      restaurantId,        // CRITICAL: Tenant isolation
      isAvailable: true,
      ...(category && { category }),
    },
    orderBy: { name: 'asc' },
  });
}
```

## Testing Tenant Isolation

### Unit Tests

```typescript
describe('MenuService', () => {
  it('should throw error if restaurantId is missing', async () => {
    await expect(
      menuService.getMenu(null as any)
    ).rejects.toThrow('restaurantId is required');
  });

  it('should not return items from other restaurants', async () => {
    const restaurant1Items = await menuService.getMenu('restaurant-1');
    const restaurant2Items = await menuService.getMenu('restaurant-2');
    
    expect(restaurant1Items).not.toContainEqual(
      expect.objectContaining({ restaurantId: 'restaurant-2' })
    );
  });
});
```

### Integration Tests

```typescript
describe('GET /api/v1/public/:slug/menu', () => {
  it('should return menu for correct restaurant only', async () => {
    const response = await request(app)
      .get('/api/v1/public/joes-pizza/menu');
    
    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ restaurantId: joesRestaurantId })
      ])
    );
  });

  it('should return 404 for invalid slug', async () => {
    const response = await request(app)
      .get('/api/v1/public/nonexistent/menu');
    
    expect(response.status).toBe(404);
  });
});
```

## Migration Guide

### Updating Existing Code

1. **Add types to Express Request**
   ```typescript
   // Old
   function handler(req: AuthRequest, res: Response) { }
   
   // New
   function handler(req: Request, res: Response) { }
   ```

2. **Update route middleware**
   ```typescript
   // Old
   router.get('/', authenticate, controller.method);
   
   // New
   router.get('/',
     requireAuth(),
     attachTenant(),
     requireTenant(),
     controller.method
   );
   ```

3. **Update controllers**
   ```typescript
   // Old
   const restaurantId = req.user?.restaurantId || req.restaurantId;
   
   // New
   const restaurantId = getRestaurantId(req);
   ```

4. **Update services**
   ```typescript
   // Old
   async getItems(restaurantId?: string) {
     return prisma.item.findMany({ where: { restaurantId } });
   }
   
   // New
   async getItems(restaurantId: string) {
     if (!restaurantId) {
       throw new Error('restaurantId is required');
     }
     return prisma.item.findMany({ where: { restaurantId } });
   }
   ```

## Reference Implementation

See complete working examples in:
- **Admin Routes:** `src/modules/menu/v1/admin.routes.ts`
- **Public Routes:** `src/modules/menu/v1/public.routes.ts`
- **Controller:** `src/modules/menu/v1/admin-menu.controller.ts`
- **Service:** `src/modules/menu/v1/admin-menu.service.ts`
