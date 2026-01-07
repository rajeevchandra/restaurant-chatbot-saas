import { PrismaClient } from '@prisma/client';
import prisma from '../db/prisma';
import { TenantMismatchError, NotFoundError } from '../lib/errors';

/**
 * Base repository class with multi-tenant safety
 * All repositories should extend this to ensure restaurant_id scoping
 */
export abstract class BaseRepository<T = any> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Validates that a resource belongs to the specified restaurant
   * Throws TenantMismatchError if validation fails
   */
  protected async validateTenant(
    restaurantId: string,
    resourceId: string,
    modelName: string
  ): Promise<void> {
    const model = (this.prisma as any)[modelName];
    
    const resource = await model.findUnique({
      where: { id: resourceId },
      select: { restaurantId: true },
    });

    if (!resource) {
      throw new NotFoundError(`${modelName} not found`);
    }

    if (resource.restaurantId !== restaurantId) {
      throw new TenantMismatchError(`This ${modelName} belongs to a different restaurant`);
    }
  }

  /**
   * Ensures that query is scoped to restaurant
   */
  protected addTenantScope(where: any, restaurantId: string) {
    return {
      ...where,
      restaurantId,
    };
  }
}
