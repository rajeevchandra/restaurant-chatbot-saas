import { OrderStatus } from '@prisma/client';

// State machine for order status transitions
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Statuses that allow customer cancellation
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
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
