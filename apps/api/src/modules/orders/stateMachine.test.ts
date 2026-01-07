import { describe, it, expect } from '@jest/globals';
import { OrderStatus } from '@prisma/client';
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
      expect(isValidTransition('CREATED', 'PAYMENT_PENDING')).toBe(true);
    });

    it('should allow CREATED -> CANCELLED', () => {
      expect(isValidTransition('CREATED', 'CANCELLED')).toBe(true);
    });

    it('should not allow CREATED -> PREPARING', () => {
      expect(isValidTransition('CREATED', 'PREPARING')).toBe(false);
    });

    it('should allow PAYMENT_PENDING -> PAID', () => {
      expect(isValidTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
    });

    it('should allow PAYMENT_PENDING -> CANCELLED', () => {
      expect(isValidTransition('PAYMENT_PENDING', 'CANCELLED')).toBe(true);
    });

    it('should not allow PAYMENT_PENDING -> COMPLETED', () => {
      expect(isValidTransition('PAYMENT_PENDING', 'COMPLETED')).toBe(false);
    });

    it('should allow PAID -> ACCEPTED', () => {
      expect(isValidTransition('PAID', 'ACCEPTED')).toBe(true);
    });

    it('should allow PAID -> CANCELLED', () => {
      expect(isValidTransition('PAID', 'CANCELLED')).toBe(true);
    });

    it('should not allow PAID -> READY', () => {
      expect(isValidTransition('PAID', 'READY')).toBe(false);
    });

    it('should allow ACCEPTED -> PREPARING', () => {
      expect(isValidTransition('ACCEPTED', 'PREPARING')).toBe(true);
    });

    it('should not allow ACCEPTED -> CANCELLED', () => {
      expect(isValidTransition('ACCEPTED', 'CANCELLED')).toBe(false);
    });

    it('should allow PREPARING -> READY', () => {
      expect(isValidTransition('PREPARING', 'READY')).toBe(true);
    });

    it('should not allow PREPARING -> PAID', () => {
      expect(isValidTransition('PREPARING', 'PAID')).toBe(false);
    });

    it('should allow READY -> COMPLETED', () => {
      expect(isValidTransition('READY', 'COMPLETED')).toBe(true);
    });

    it('should not allow READY -> CREATED', () => {
      expect(isValidTransition('READY', 'CREATED')).toBe(false);
    });

    it('should not allow any transitions from COMPLETED', () => {
      expect(isValidTransition('COMPLETED', 'CREATED')).toBe(false);
      expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
      expect(isValidTransition('COMPLETED', 'PAID')).toBe(false);
    });

    it('should not allow any transitions from CANCELLED', () => {
      expect(isValidTransition('CANCELLED', 'CREATED')).toBe(false);
      expect(isValidTransition('CANCELLED', 'PAID')).toBe(false);
      expect(isValidTransition('CANCELLED', 'COMPLETED')).toBe(false);
    });
  });

  describe('canCustomerCancel', () => {
    it('should allow cancellation for CREATED', () => {
      expect(canCustomerCancel('CREATED')).toBe(true);
    });

    it('should allow cancellation for PAYMENT_PENDING', () => {
      expect(canCustomerCancel('PAYMENT_PENDING')).toBe(true);
    });

    it('should allow cancellation for PAID', () => {
      expect(canCustomerCancel('PAID')).toBe(true);
    });

    it('should not allow cancellation for ACCEPTED', () => {
      expect(canCustomerCancel('ACCEPTED')).toBe(false);
    });

    it('should not allow cancellation for PREPARING', () => {
      expect(canCustomerCancel('PREPARING')).toBe(false);
    });

    it('should not allow cancellation for READY', () => {
      expect(canCustomerCancel('READY')).toBe(false);
    });

    it('should not allow cancellation for COMPLETED', () => {
      expect(canCustomerCancel('COMPLETED')).toBe(false);
    });

    it('should not allow cancellation for already CANCELLED', () => {
      expect(canCustomerCancel('CANCELLED')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses for CREATED', () => {
      const nextStatuses = getValidNextStatuses('CREATED');
      expect(nextStatuses).toHaveLength(2);
      expect(nextStatuses).toContain('PAYMENT_PENDING');
      expect(nextStatuses).toContain('CANCELLED');
    });

    it('should return correct next statuses for PAYMENT_PENDING', () => {
      const nextStatuses = getValidNextStatuses('PAYMENT_PENDING');
      expect(nextStatuses).toHaveLength(2);
      expect(nextStatuses).toContain('PAID');
      expect(nextStatuses).toContain('CANCELLED');
    });

    it('should return correct next statuses for PAID', () => {
      const nextStatuses = getValidNextStatuses('PAID');
      expect(nextStatuses).toHaveLength(2);
      expect(nextStatuses).toContain('ACCEPTED');
      expect(nextStatuses).toContain('CANCELLED');
    });

    it('should return single next status for ACCEPTED', () => {
      const nextStatuses = getValidNextStatuses('ACCEPTED');
      expect(nextStatuses).toHaveLength(1);
      expect(nextStatuses).toContain('PREPARING');
    });

    it('should return single next status for PREPARING', () => {
      const nextStatuses = getValidNextStatuses('PREPARING');
      expect(nextStatuses).toHaveLength(1);
      expect(nextStatuses).toContain('READY');
    });

    it('should return single next status for READY', () => {
      const nextStatuses = getValidNextStatuses('READY');
      expect(nextStatuses).toHaveLength(1);
      expect(nextStatuses).toContain('COMPLETED');
    });

    it('should return empty array for COMPLETED', () => {
      const nextStatuses = getValidNextStatuses('COMPLETED');
      expect(nextStatuses).toHaveLength(0);
    });

    it('should return empty array for CANCELLED', () => {
      const nextStatuses = getValidNextStatuses('CANCELLED');
      expect(nextStatuses).toHaveLength(0);
    });
  });

  describe('State Machine Completeness', () => {
    it('should have transitions defined for all OrderStatus values', () => {
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

      allStatuses.forEach(status => {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should only reference valid statuses in transitions', () => {
      const validStatuses: OrderStatus[] = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ];

      Object.values(VALID_TRANSITIONS).forEach((nextStatuses: OrderStatus[]) => {
        nextStatuses.forEach((status: OrderStatus) => {
          expect(validStatuses).toContain(status);
        });
      });
    });

    it('should only allow cancellation from early stages', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).toHaveLength(3);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('CREATED');
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('PAYMENT_PENDING');
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('PAID');
    });
  });

  describe('Business Logic Validation', () => {
    it('should not allow backwards transitions', () => {
      expect(isValidTransition('COMPLETED', 'READY')).toBe(false);
      expect(isValidTransition('READY', 'PREPARING')).toBe(false);
      expect(isValidTransition('PREPARING', 'ACCEPTED')).toBe(false);
      expect(isValidTransition('ACCEPTED', 'PAID')).toBe(false);
      expect(isValidTransition('PAID', 'PAYMENT_PENDING')).toBe(false);
    });

    it('should not allow skipping states', () => {
      expect(isValidTransition('CREATED', 'PAID')).toBe(false);
      expect(isValidTransition('CREATED', 'ACCEPTED')).toBe(false);
      expect(isValidTransition('PAID', 'PREPARING')).toBe(false);
      expect(isValidTransition('ACCEPTED', 'READY')).toBe(false);
    });

    it('should not allow cancellation after food preparation starts', () => {
      expect(canCustomerCancel('ACCEPTED')).toBe(false);
      expect(canCustomerCancel('PREPARING')).toBe(false);
      expect(canCustomerCancel('READY')).toBe(false);
    });

    it('should allow cancellation before kitchen accepts order', () => {
      expect(canCustomerCancel('CREATED')).toBe(true);
      expect(canCustomerCancel('PAYMENT_PENDING')).toBe(true);
      expect(canCustomerCancel('PAID')).toBe(true);
    });
  });
});
