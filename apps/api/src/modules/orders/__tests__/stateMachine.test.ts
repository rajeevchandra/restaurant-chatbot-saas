import { describe, test, expect } from '@jest/globals';
import {
  isValidTransition,
  canCustomerCancel,
  getValidNextStatuses,
  VALID_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
} from '../stateMachine';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '@restaurant-saas/shared';

describe('Order State Machine', () => {
  describe('isValidTransition', () => {
    test('should allow valid transitions', () => {
      // CREATED -> PAYMENT_PENDING
        expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING)).toBe(true);
      
      // CREATED -> CANCELLED
        expect(isValidTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
      
      // PAYMENT_PENDING -> PAID
        expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.PAID)).toBe(true);
      
      // PAID -> ACCEPTED
        expect(isValidTransition(OrderStatus.PAID, OrderStatus.ACCEPTED)).toBe(true);
      
      // ACCEPTED -> PREPARING
        expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(true);
      
      // PREPARING -> READY
        expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
      
      // READY -> COMPLETED
        expect(isValidTransition(OrderStatus.READY, OrderStatus.COMPLETED)).toBe(true);
    });

    test('should reject invalid transitions', () => {
      // Can't go from CREATED directly to ACCEPTED
        expect(isValidTransition(OrderStatus.CREATED, OrderStatus.ACCEPTED)).toBe(false);
      
      // Can't go from CREATED directly to COMPLETED
        expect(isValidTransition(OrderStatus.CREATED, OrderStatus.COMPLETED)).toBe(false);
      
      // Can't go backwards from COMPLETED
        expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.READY)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.PREPARING)).toBe(false);
      
      // Can't transition from CANCELLED
        expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.ACCEPTED)).toBe(false);
      
      // Can't skip PREPARING step
        expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.READY)).toBe(false);
      
      // Can't skip READY step
        expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.COMPLETED)).toBe(false);
    });

    test('should handle terminal states correctly', () => {
      // COMPLETED is terminal
        expect(getValidNextStatuses(OrderStatus.COMPLETED)).toEqual([]);
      
      // CANCELLED is terminal
        expect(getValidNextStatuses(OrderStatus.CANCELLED)).toEqual([]);
    });

    test('should allow cancellation from early states', () => {
        expect(isValidTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
    });

    test('should not allow cancellation from late states', () => {
        expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canCustomerCancel', () => {
    test('should allow customer cancellation for early states', () => {
        expect(canCustomerCancel(OrderStatus.CREATED)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAID)).toBe(true);
    });

    test('should not allow customer cancellation for late states', () => {
      expect(canCustomerCancel(OrderStatus.ACCEPTED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.PREPARING)).toBe(false);
      expect(canCustomerCancel(OrderStatus.READY)).toBe(false);
      expect(canCustomerCancel(OrderStatus.COMPLETED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    test('should return correct next statuses for each state', () => {
        expect(getValidNextStatuses(OrderStatus.CREATED)).toEqual(['PAYMENT_PENDING', 'CANCELLED']);
      expect(getValidNextStatuses(OrderStatus.PAYMENT_PENDING)).toEqual([OrderStatus.PAID, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.PAID)).toEqual([OrderStatus.ACCEPTED, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.ACCEPTED)).toEqual([OrderStatus.PREPARING]);
      expect(getValidNextStatuses(OrderStatus.PREPARING)).toEqual([OrderStatus.READY]);
      expect(getValidNextStatuses(OrderStatus.READY)).toEqual([OrderStatus.COMPLETED]);
      expect(getValidNextStatuses(OrderStatus.COMPLETED)).toEqual([]);
      expect(getValidNextStatuses(OrderStatus.CANCELLED)).toEqual([]);
    });
  });

  describe('State machine completeness', () => {
    test('should have transitions defined for all statuses', () => {
      const allStatuses: OrderStatus[] = [
        OrderStatus.CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.PAID,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

      allStatuses.forEach((status) => {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      });
    });

    test('should ensure cancellable statuses are a subset of all statuses', () => {
      const allStatuses: OrderStatus[] = [
        OrderStatus.CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.PAID,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

      CUSTOMER_CANCELLABLE_STATUSES.forEach((status: OrderStatus) => {
        expect(allStatuses).toContain(status);
      });
    });

    test('should ensure terminal states have no outgoing transitions', () => {
      expect(VALID_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([]);
      expect(VALID_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([]);
    });
  });

  describe('State machine flow scenarios', () => {
    test('successful order flow', () => {
      const flow: OrderStatus[] = [
        OrderStatus.CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.PAID,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
      ];

      for (let i = 0; i < flow.length - 1; i++) {
        expect(isValidTransition(flow[i], flow[i + 1])).toBe(true);
      }
    });

    test('early cancellation flow', () => {
      const states: OrderStatus[] = [OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING, OrderStatus.PAID];

      states.forEach((status) => {
        expect(isValidTransition(status, OrderStatus.CANCELLED)).toBe(true);
        expect(canCustomerCancel(status)).toBe(true);
      });
    });

    test('cannot return to earlier states', () => {
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.READY)).toBe(false);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.PAYMENT_PENDING)).toBe(false);
    });
  });
});
