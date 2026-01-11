import { describe, it, expect } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '@restaurant-saas/shared';
import {
  isValidTransition,
  canCustomerCancel,
  getValidNextStatuses,
  VALID_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
} from './stateMachine';

describe('Order State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow CREATED -> PAYMENT_PENDING', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING)).toBe(true);
    });

    it('should allow CREATED -> CANCELLED', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should not allow CREATED -> PREPARING', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PREPARING)).toBe(false);
    });

    it('should allow PAYMENT_PENDING -> PAID', () => {
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.PAID)).toBe(true);
    });

    it('should allow PAYMENT_PENDING -> CANCELLED', () => {
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should not allow PAYMENT_PENDING -> COMPLETED', () => {
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.COMPLETED)).toBe(false);
    });

    it('should allow PAID -> ACCEPTED', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PREPARING)).toBe(false);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.PAID)).toBe(true);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.COMPLETED)).toBe(false);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.ACCEPTED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.READY)).toBe(false);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(true);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.COMPLETED)).toBe(true);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.CREATED)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.CREATED)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.CREATED)).toBe(false);
      expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.COMPLETED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.CREATED)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAID)).toBe(true);
      expect(canCustomerCancel(OrderStatus.ACCEPTED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.PREPARING)).toBe(false);
      expect(canCustomerCancel(OrderStatus.READY)).toBe(false);
      expect(canCustomerCancel(OrderStatus.COMPLETED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.CANCELLED)).toBe(false);
      const nextStatuses = getValidNextStatuses(OrderStatus.CREATED);
      expect(nextStatuses).toEqual([OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED]);
      const nextStatuses2 = getValidNextStatuses(OrderStatus.PAYMENT_PENDING);
      expect(nextStatuses2).toEqual([OrderStatus.PAID, OrderStatus.CANCELLED]);
      const nextStatuses3 = getValidNextStatuses(OrderStatus.PAID);
      expect(nextStatuses3).toEqual([OrderStatus.ACCEPTED, OrderStatus.CANCELLED]);
      const nextStatuses4 = getValidNextStatuses(OrderStatus.ACCEPTED);
      expect(nextStatuses4).toEqual([OrderStatus.PREPARING]);
      const nextStatuses5 = getValidNextStatuses(OrderStatus.PREPARING);
      expect(nextStatuses5).toEqual([OrderStatus.READY]);
      const nextStatuses6 = getValidNextStatuses(OrderStatus.READY);
      expect(nextStatuses6).toEqual([OrderStatus.COMPLETED]);
      const nextStatuses7 = getValidNextStatuses(OrderStatus.COMPLETED);
      expect(nextStatuses7).toEqual([]);
      const nextStatuses8 = getValidNextStatuses(OrderStatus.CANCELLED);
      expect(nextStatuses8).toEqual([]);
    });
  });

  describe('canCustomerCancel', () => {
    it('should allow cancellation for CREATED', () => {
      expect(canCustomerCancel(OrderStatus.CREATED)).toBe(true);
    });

    it('should allow cancellation for PAYMENT_PENDING', () => {
      expect(canCustomerCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
    });

    it('should allow cancellation for PAID', () => {
      expect(canCustomerCancel(OrderStatus.PAID)).toBe(true);
    });

    it('should not allow cancellation for ACCEPTED', () => {
      expect(canCustomerCancel(OrderStatus.ACCEPTED)).toBe(false);
    });

    it('should not allow cancellation for PREPARING', () => {
      expect(canCustomerCancel(OrderStatus.PREPARING)).toBe(false);
    });

    it('should not allow cancellation for READY', () => {
      expect(canCustomerCancel(OrderStatus.READY)).toBe(false);
    });

    it('should not allow cancellation for COMPLETED', () => {
      expect(canCustomerCancel(OrderStatus.COMPLETED)).toBe(false);
    });

    it('should not allow cancellation for already CANCELLED', () => {
      expect(canCustomerCancel(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {

    it('should return correct next statuses for CREATED', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.CREATED);
      expect(nextStatuses).toHaveLength(2);
      expect(nextStatuses).toContain(OrderStatus.PAYMENT_PENDING);
      expect(nextStatuses).toContain(OrderStatus.CANCELLED);
    });

    it('should return correct next statuses for PAYMENT_PENDING', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.PAYMENT_PENDING);
      expect(nextStatuses).toHaveLength(2);
      expect(nextStatuses).toContain(OrderStatus.PAID);
      expect(nextStatuses).toContain(OrderStatus.CANCELLED);
    });

    it('should return correct next statuses for PAID', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.CREATED);
      expect(nextStatuses).toEqual([OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED]);
      const nextStatuses2 = getValidNextStatuses(OrderStatus.PAYMENT_PENDING);
      expect(nextStatuses2).toEqual([OrderStatus.PAID, OrderStatus.CANCELLED]);
      const nextStatuses3 = getValidNextStatuses(OrderStatus.PAID);
      expect(nextStatuses3).toEqual([OrderStatus.ACCEPTED, OrderStatus.CANCELLED]);
      const nextStatuses4 = getValidNextStatuses(OrderStatus.ACCEPTED);
      expect(nextStatuses4).toEqual([OrderStatus.PREPARING]);
      const nextStatuses5 = getValidNextStatuses(OrderStatus.PREPARING);
      expect(nextStatuses5).toEqual([OrderStatus.READY]);
      const nextStatuses6 = getValidNextStatuses(OrderStatus.READY);
      expect(nextStatuses6).toEqual([OrderStatus.COMPLETED]);
      const nextStatuses7 = getValidNextStatuses(OrderStatus.COMPLETED);
      expect(nextStatuses7).toEqual([]);
      const nextStatuses8 = getValidNextStatuses(OrderStatus.CANCELLED);
      expect(nextStatuses8).toEqual([]);
    });

    it('should return single next status for READY', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.READY);
      expect(nextStatuses).toHaveLength(1);
      expect(nextStatuses).toContain(OrderStatus.COMPLETED);
    });

    it('should return empty array for COMPLETED', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.COMPLETED);
      expect(nextStatuses).toHaveLength(0);
    });

    it('should return empty array for CANCELLED', () => {
      const nextStatuses = getValidNextStatuses(OrderStatus.CANCELLED);
      expect(nextStatuses).toHaveLength(0);
    });
  });

  describe('State Machine Completeness', () => {
    it('should have transitions defined for all OrderStatus values', () => {
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

      allStatuses.forEach(status => {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should only reference valid statuses in transitions', () => {
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

      Object.values(VALID_TRANSITIONS).forEach((nextStatuses: OrderStatus[]) => {
        nextStatuses.forEach((status: OrderStatus) => {
          expect(allStatuses).toContain(status);
        });
      });
    });

    it('should only allow cancellation from early stages', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).toHaveLength(3);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.CREATED);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.PAYMENT_PENDING);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.PAID);
    });
  });

  describe('Business Logic Validation', () => {
    it('should not allow backwards transitions', () => {
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.READY)).toBe(false);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.PAYMENT_PENDING)).toBe(false);
    });

    it('should not allow skipping states', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.PREPARING)).toBe(false);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.READY)).toBe(false);
    });

    it('should not allow cancellation after food preparation starts', () => {
      expect(canCustomerCancel(OrderStatus.ACCEPTED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.PREPARING)).toBe(false);
      expect(canCustomerCancel(OrderStatus.READY)).toBe(false);
    });

    it('should allow cancellation before kitchen accepts order', () => {
      expect(canCustomerCancel(OrderStatus.CREATED)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAID)).toBe(true);
    });
  });
});
