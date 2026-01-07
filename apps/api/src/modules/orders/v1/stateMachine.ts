import { OrderStatus } from '@prisma/client';

/**
 * Order State Machine
 * Defines valid state transitions and cancellation rules
 */

/**
 * Valid state transitions map
 * Key: current status, Value: array of allowed next statuses
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['ACCEPTED', 'CANCELLED'], // Can cancel if refund supported
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Statuses where customer can cancel the order
 */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'CREATED',
  'PAYMENT_PENDING',
  'PAID', // Optional: only if refund is supported
];

/**
 * Statuses where staff can cancel the order
 */
export const STAFF_CANCELLABLE_STATUSES: OrderStatus[] = [
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  // COMPLETED is not cancellable by anyone
];

/**
 * Terminal statuses (no further transitions allowed)
 */
export const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const allowedTransitions = ORDER_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Check if customer can cancel an order in a given status
 */
export function canCustomerCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

/**
 * Check if staff can cancel an order in a given status
 */
export function canStaffCancel(status: OrderStatus): boolean {
  return STAFF_CANCELLABLE_STATUSES.includes(status);
}

/**
 * Check if status is terminal (no further transitions)
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Get all valid next statuses for a given status
 */
export function getValidNextStatuses(status: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[status] || [];
}

/**
 * Get the expected linear progression path
 */
export const EXPECTED_ORDER_FLOW: OrderStatus[] = [
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
];
