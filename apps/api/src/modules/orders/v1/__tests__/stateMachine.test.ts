import { describe, it, expect } from '@jest/globals';
import { OrderStatus } from '@prisma/client';
import {
  ORDER_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
  STAFF_CANCELLABLE_STATUSES,
  TERMINAL_STATUSES,
  isValidTransition,
  canCustomerCancel,
  canStaffCancel,
  isTerminalStatus,
  getValidNextStatuses,
  EXPECTED_ORDER_FLOW,
} from '../stateMachine';

describe('Order State Machine', () => {
  describe('ORDER_TRANSITIONS', () => {
    it('should define transitions for all order statuses', () => {
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
        expect(ORDER_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(ORDER_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should allow CREATED to transition to PAYMENT_PENDING or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.CREATED).toEqual(['PAYMENT_PENDING', 'CANCELLED']);
    });

    it('should allow PAYMENT_PENDING to transition to PAID or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PAYMENT_PENDING).toEqual(['PAID', 'CANCELLED']);
    });

    it('should allow PAID to transition to ACCEPTED or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PAID).toEqual(['ACCEPTED', 'CANCELLED']);
    });

    it('should allow ACCEPTED to transition to PREPARING or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.ACCEPTED).toEqual(['PREPARING', 'CANCELLED']);
    });

    it('should allow PREPARING to transition to READY or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PREPARING).toEqual(['READY', 'CANCELLED']);
    });

    it('should allow READY to transition to COMPLETED or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.READY).toEqual(['COMPLETED', 'CANCELLED']);
    });

    it('should not allow transitions from COMPLETED', () => {
      expect(ORDER_TRANSITIONS.COMPLETED).toEqual([]);
    });

    it('should not allow transitions from CANCELLED', () => {
      expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidTransition('CREATED', 'PAYMENT_PENDING')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
      expect(isValidTransition('PAID', 'ACCEPTED')).toBe(true);
      expect(isValidTransition('ACCEPTED', 'PREPARING')).toBe(true);
      expect(isValidTransition('PREPARING', 'READY')).toBe(true);
      expect(isValidTransition('READY', 'COMPLETED')).toBe(true);
    });

    it('should return true for cancellation from valid statuses', () => {
      expect(isValidTransition('CREATED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PAYMENT_PENDING', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PAID', 'CANCELLED')).toBe(true);
      expect(isValidTransition('ACCEPTED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PREPARING', 'CANCELLED')).toBe(true);
      expect(isValidTransition('READY', 'CANCELLED')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      // Can't skip steps
      expect(isValidTransition('CREATED', 'PAID')).toBe(false);
      expect(isValidTransition('CREATED', 'ACCEPTED')).toBe(false);
      expect(isValidTransition('PAYMENT_PENDING', 'ACCEPTED')).toBe(false);
      
      // Can't go backwards
      expect(isValidTransition('PAID', 'PAYMENT_PENDING')).toBe(false);
      expect(isValidTransition('ACCEPTED', 'PAID')).toBe(false);
      expect(isValidTransition('PREPARING', 'ACCEPTED')).toBe(false);
      expect(isValidTransition('READY', 'PREPARING')).toBe(false);
      
      // Can't transition from terminal states
      expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
      expect(isValidTransition('CANCELLED', 'COMPLETED')).toBe(false);
      expect(isValidTransition('COMPLETED', 'CREATED')).toBe(false);
    });
  });

  describe('CUSTOMER_CANCELLABLE_STATUSES', () => {
    it('should include early statuses only', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('CREATED');
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('PAYMENT_PENDING');
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain('PAID');
    });

    it('should not include late-stage statuses', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain('ACCEPTED');
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain('PREPARING');
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain('READY');
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain('COMPLETED');
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain('CANCELLED');
    });
  });

  describe('STAFF_CANCELLABLE_STATUSES', () => {
    it('should include all statuses except COMPLETED', () => {
      expect(STAFF_CANCELLABLE_STATUSES).toContain('CREATED');
      expect(STAFF_CANCELLABLE_STATUSES).toContain('PAYMENT_PENDING');
      expect(STAFF_CANCELLABLE_STATUSES).toContain('PAID');
      expect(STAFF_CANCELLABLE_STATUSES).toContain('ACCEPTED');
      expect(STAFF_CANCELLABLE_STATUSES).toContain('PREPARING');
      expect(STAFF_CANCELLABLE_STATUSES).toContain('READY');
    });

    it('should not include terminal statuses', () => {
      expect(STAFF_CANCELLABLE_STATUSES).not.toContain('COMPLETED');
      expect(STAFF_CANCELLABLE_STATUSES).not.toContain('CANCELLED');
    });
  });

  describe('canCustomerCancel', () => {
    it('should return true for customer-cancellable statuses', () => {
      expect(canCustomerCancel('CREATED')).toBe(true);
      expect(canCustomerCancel('PAYMENT_PENDING')).toBe(true);
      expect(canCustomerCancel('PAID')).toBe(true);
    });

    it('should return false for non-customer-cancellable statuses', () => {
      expect(canCustomerCancel('ACCEPTED')).toBe(false);
      expect(canCustomerCancel('PREPARING')).toBe(false);
      expect(canCustomerCancel('READY')).toBe(false);
      expect(canCustomerCancel('COMPLETED')).toBe(false);
      expect(canCustomerCancel('CANCELLED')).toBe(false);
    });
  });

  describe('canStaffCancel', () => {
    it('should return true for staff-cancellable statuses', () => {
      expect(canStaffCancel('CREATED')).toBe(true);
      expect(canStaffCancel('PAYMENT_PENDING')).toBe(true);
      expect(canStaffCancel('PAID')).toBe(true);
      expect(canStaffCancel('ACCEPTED')).toBe(true);
      expect(canStaffCancel('PREPARING')).toBe(true);
      expect(canStaffCancel('READY')).toBe(true);
    });

    it('should return false for terminal statuses', () => {
      expect(canStaffCancel('COMPLETED')).toBe(false);
      expect(canStaffCancel('CANCELLED')).toBe(false);
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('should include COMPLETED and CANCELLED', () => {
      expect(TERMINAL_STATUSES).toEqual(['COMPLETED', 'CANCELLED']);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(true);
      expect(isTerminalStatus('CANCELLED')).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus('CREATED')).toBe(false);
      expect(isTerminalStatus('PAYMENT_PENDING')).toBe(false);
      expect(isTerminalStatus('PAID')).toBe(false);
      expect(isTerminalStatus('ACCEPTED')).toBe(false);
      expect(isTerminalStatus('PREPARING')).toBe(false);
      expect(isTerminalStatus('READY')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses', () => {
      expect(getValidNextStatuses('CREATED')).toEqual(['PAYMENT_PENDING', 'CANCELLED']);
      expect(getValidNextStatuses('PAYMENT_PENDING')).toEqual(['PAID', 'CANCELLED']);
      expect(getValidNextStatuses('PAID')).toEqual(['ACCEPTED', 'CANCELLED']);
      expect(getValidNextStatuses('ACCEPTED')).toEqual(['PREPARING', 'CANCELLED']);
      expect(getValidNextStatuses('PREPARING')).toEqual(['READY', 'CANCELLED']);
      expect(getValidNextStatuses('READY')).toEqual(['COMPLETED', 'CANCELLED']);
    });

    it('should return empty array for terminal statuses', () => {
      expect(getValidNextStatuses('COMPLETED')).toEqual([]);
      expect(getValidNextStatuses('CANCELLED')).toEqual([]);
    });
  });

  describe('EXPECTED_ORDER_FLOW', () => {
    it('should define the linear progression path', () => {
      expect(EXPECTED_ORDER_FLOW).toEqual([
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
      ]);
    });

    it('should not include CANCELLED in normal flow', () => {
      expect(EXPECTED_ORDER_FLOW).not.toContain('CANCELLED');
    });
  });

  describe('Cancellation Rules Integration', () => {
    it('staff should have more cancellation power than customers', () => {
      CUSTOMER_CANCELLABLE_STATUSES.forEach((status) => {
        expect(STAFF_CANCELLABLE_STATUSES).toContain(status);
      });
    });

    it('should allow cancellation transitions for customer-cancellable statuses', () => {
      CUSTOMER_CANCELLABLE_STATUSES.forEach((status) => {
        expect(isValidTransition(status, 'CANCELLED')).toBe(true);
      });
    });

    it('should allow cancellation transitions for staff-cancellable statuses', () => {
      STAFF_CANCELLABLE_STATUSES.forEach((status) => {
        expect(isValidTransition(status, 'CANCELLED')).toBe(true);
      });
    });
  });

  describe('State Machine Consistency', () => {
    it('all statuses in transitions map should be valid OrderStatus values', () => {
      Object.keys(ORDER_TRANSITIONS).forEach((status) => {
        expect(['CREATED', 'PAYMENT_PENDING', 'PAID', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']).toContain(status);
      });
    });

    it('all transition targets should be valid OrderStatus values', () => {
      Object.values(ORDER_TRANSITIONS).forEach((transitions) => {
        transitions.forEach((status) => {
          expect(['CREATED', 'PAYMENT_PENDING', 'PAID', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']).toContain(status);
        });
      });
    });

    it('terminal statuses should have no outgoing transitions', () => {
      TERMINAL_STATUSES.forEach((status) => {
        expect(ORDER_TRANSITIONS[status]).toEqual([]);
      });
    });
  });
});
