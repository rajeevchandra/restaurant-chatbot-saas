import { Prisma } from '@prisma/client';
import { OrderStatus } from '@restaurant-saas/shared';

// State machine for order status transitions
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PAID,
];

// Statuses that allow staff cancellation
export const STAFF_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PAID,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

/**
 * Validates if a state transition is allowed
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns true if transition is valid
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const validNextStates = VALID_TRANSITIONS[currentStatus];
  return validNextStates.includes(newStatus);
}

/**
 * Checks if an order can be cancelled by customer
 * @param currentStatus - Current order status
 * @returns true if customer can cancel
 */
export function canCustomerCancel(currentStatus: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(currentStatus);
}

/**
 * Gets all valid next statuses for current status
 * @param currentStatus - Current order status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
