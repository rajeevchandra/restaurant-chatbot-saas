import { describe, test, expect } from '@jest/globals';
import {
  isValidTransition,
  canCustomerCancel,
  getValidNextStatuses,
  VALID_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
} from '../stateMachine';
import { OrderStatus } from '@prisma/client';

describe('Order State Machine', () => {
  describe('isValidTransition', () => {
    test('should allow valid transitions', () => {
      // CREATED -> PAYMENT_PENDING
      expect(isValidTransition('CREATED', 'PAYMENT_PENDING')).toBe(true);
      
      // CREATED -> CANCELLED
      expect(isValidTransition('CREATED', 'CANCELLED')).toBe(true);
      
      // PAYMENT_PENDING -> PAID
      expect(isValidTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
      
      // PAID -> ACCEPTED
      expect(isValidTransition('PAID', 'ACCEPTED')).toBe(true);
      
      // ACCEPTED -> PREPARING
      expect(isValidTransition('ACCEPTED', 'PREPARING')).toBe(true);
      
      // PREPARING -> READY
      expect(isValidTransition('PREPARING', 'READY')).toBe(true);
      
      // READY -> COMPLETED
      expect(isValidTransition('READY', 'COMPLETED')).toBe(true);
    });

    test('should reject invalid transitions', () => {
      // Can't go from CREATED directly to ACCEPTED
      expect(isValidTransition('CREATED', 'ACCEPTED')).toBe(false);
      
      // Can't go from CREATED directly to COMPLETED
      expect(isValidTransition('CREATED', 'COMPLETED')).toBe(false);
      
      // Can't go backwards from COMPLETED
      expect(isValidTransition('COMPLETED', 'READY')).toBe(false);
      expect(isValidTransition('COMPLETED', 'PREPARING')).toBe(false);
      
      // Can't transition from CANCELLED
      expect(isValidTransition('CANCELLED', 'ACCEPTED')).toBe(false);
      
      // Can't skip PREPARING step
      expect(isValidTransition('ACCEPTED', 'READY')).toBe(false);
      
      // Can't skip READY step
      expect(isValidTransition('PREPARING', 'COMPLETED')).toBe(false);
    });

    test('should handle terminal states correctly', () => {
      // COMPLETED is terminal
      expect(getValidNextStatuses('COMPLETED')).toEqual([]);
      
      // CANCELLED is terminal
      expect(getValidNextStatuses('CANCELLED')).toEqual([]);
    });

    test('should allow cancellation from early states', () => {
      expect(isValidTransition('CREATED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PAID', 'CANCELLED')).toBe(true);
    });

    test('should not allow cancellation from late states', () => {
      expect(isValidTransition('ACCEPTED', 'CANCELLED')).toBe(false);
      expect(isValidTransition('PREPARING', 'CANCELLED')).toBe(false);
      expect(isValidTransition('READY', 'CANCELLED')).toBe(false);
      expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
    });
  });

  describe('canCustomerCancel', () => {
    test('should allow customer cancellation for early states', () => {
      expect(canCustomerCancel('CREATED')).toBe(true);
      expect(canCustomerCancel('PAYMENT_PENDING')).toBe(true);
      expect(canCustomerCancel('PAID')).toBe(true);
    });

    test('should not allow customer cancellation for late states', () => {
      expect(canCustomerCancel('ACCEPTED')).toBe(false);
      expect(canCustomerCancel('PREPARING')).toBe(false);
      expect(canCustomerCancel('READY')).toBe(false);
      expect(canCustomerCancel('COMPLETED')).toBe(false);
      expect(canCustomerCancel('CANCELLED')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    test('should return correct next statuses for each state', () => {
      expect(getValidNextStatuses('CREATED')).toEqual(['PAYMENT_PENDING', 'CANCELLED']);
      expect(getValidNextStatuses('PAYMENT_PENDING')).toEqual(['PAID', 'CANCELLED']);
      expect(getValidNextStatuses('PAID')).toEqual(['ACCEPTED', 'CANCELLED']);
      expect(getValidNextStatuses('ACCEPTED')).toEqual(['PREPARING']);
      expect(getValidNextStatuses('PREPARING')).toEqual(['READY']);
      expect(getValidNextStatuses('READY')).toEqual(['COMPLETED']);
      expect(getValidNextStatuses('COMPLETED')).toEqual([]);
      expect(getValidNextStatuses('CANCELLED')).toEqual([]);
    });
  });

  describe('State machine completeness', () => {
    test('should have transitions defined for all statuses', () => {
      const allStatuses: OrderStatus[] = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ];

      allStatuses.forEach((status) => {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      });
    });

    test('should ensure cancellable statuses are a subset of all statuses', () => {
      const allStatuses: OrderStatus[] = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ];

      CUSTOMER_CANCELLABLE_STATUSES.forEach((status: OrderStatus) => {
        expect(allStatuses).toContain(status);
      });
    });

    test('should ensure terminal states have no outgoing transitions', () => {
      expect(VALID_TRANSITIONS['COMPLETED']).toEqual([]);
      expect(VALID_TRANSITIONS['CANCELLED']).toEqual([]);
    });
  });

  describe('State machine flow scenarios', () => {
    test('successful order flow', () => {
      const flow: OrderStatus[] = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
      ];

      for (let i = 0; i < flow.length - 1; i++) {
        expect(isValidTransition(flow[i], flow[i + 1])).toBe(true);
      }
    });

    test('early cancellation flow', () => {
      const states: OrderStatus[] = ['CREATED', 'PAYMENT_PENDING', 'PAID'];

      states.forEach((status) => {
        expect(isValidTransition(status, 'CANCELLED')).toBe(true);
        expect(canCustomerCancel(status)).toBe(true);
      });
    });

    test('cannot return to earlier states', () => {
      expect(isValidTransition('COMPLETED', 'READY')).toBe(false);
      expect(isValidTransition('READY', 'PREPARING')).toBe(false);
      expect(isValidTransition('PREPARING', 'ACCEPTED')).toBe(false);
      expect(isValidTransition('ACCEPTED', 'PAID')).toBe(false);
      expect(isValidTransition('PAID', 'PAYMENT_PENDING')).toBe(false);
    });
  });
});
