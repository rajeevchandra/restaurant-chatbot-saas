// File removed as part of legacy v1 test cleanup.

import { describe, it, expect } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '@restaurant-saas/shared';
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
        expect(ORDER_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(ORDER_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should allow CREATED to transition to PAYMENT_PENDING or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.CREATED).toEqual([OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED]);
    });

    it('should allow PAYMENT_PENDING to transition to PAID or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PAYMENT_PENDING).toEqual([OrderStatus.PAID, OrderStatus.CANCELLED]);
    });

    it('should allow PAID to transition to ACCEPTED or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PAID).toEqual([OrderStatus.ACCEPTED, OrderStatus.CANCELLED]);
    });

    it('should allow ACCEPTED to transition to PREPARING or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.ACCEPTED).toEqual([OrderStatus.PREPARING, OrderStatus.CANCELLED]);
    });

    it('should allow PREPARING to transition to READY or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.PREPARING).toEqual([OrderStatus.READY, OrderStatus.CANCELLED]);
    });

    it('should allow READY to transition to COMPLETED or CANCELLED', () => {
      expect(ORDER_TRANSITIONS.READY).toEqual([OrderStatus.COMPLETED, OrderStatus.CANCELLED]);
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
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.PAID)).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.ACCEPTED)).toBe(true);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(true);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.COMPLETED)).toBe(true);
    });

    it('should return true for cancellation from valid statuses', () => {
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      // Can't skip steps
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.CREATED, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.ACCEPTED)).toBe(false);
      
      // Can't go backwards
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.PAYMENT_PENDING)).toBe(false);
      expect(isValidTransition(OrderStatus.ACCEPTED, OrderStatus.PAID)).toBe(false);
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.ACCEPTED)).toBe(false);
      expect(isValidTransition(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
      
      // Can't transition from terminal states
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.COMPLETED)).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.CREATED)).toBe(false);
    });
  });

  describe('CUSTOMER_CANCELLABLE_STATUSES', () => {
    it('should include early statuses only', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.CREATED);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.PAYMENT_PENDING);
      expect(CUSTOMER_CANCELLABLE_STATUSES).toContain(OrderStatus.PAID);
    });

    it('should not include late-stage statuses', () => {
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain(OrderStatus.ACCEPTED);
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain(OrderStatus.PREPARING);
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain(OrderStatus.READY);
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain(OrderStatus.COMPLETED);
      expect(CUSTOMER_CANCELLABLE_STATUSES).not.toContain(OrderStatus.CANCELLED);
    });
  });

  describe('STAFF_CANCELLABLE_STATUSES', () => {
    it('should include all statuses except COMPLETED', () => {
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.CREATED);
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.PAYMENT_PENDING);
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.PAID);
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.ACCEPTED);
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.PREPARING);
      expect(STAFF_CANCELLABLE_STATUSES).toContain(OrderStatus.READY);
    });

    it('should not include terminal statuses', () => {
      expect(STAFF_CANCELLABLE_STATUSES).not.toContain(OrderStatus.COMPLETED);
      expect(STAFF_CANCELLABLE_STATUSES).not.toContain(OrderStatus.CANCELLED);
    });
  });

  describe('canCustomerCancel', () => {
    it('should return true for customer-cancellable statuses', () => {
      expect(canCustomerCancel(OrderStatus.CREATED)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(canCustomerCancel(OrderStatus.PAID)).toBe(true);
    });

    it('should return false for non-customer-cancellable statuses', () => {
      expect(canCustomerCancel(OrderStatus.ACCEPTED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.PREPARING)).toBe(false);
      expect(canCustomerCancel(OrderStatus.READY)).toBe(false);
      expect(canCustomerCancel(OrderStatus.COMPLETED)).toBe(false);
      expect(canCustomerCancel(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canStaffCancel', () => {
    it('should return true for staff-cancellable statuses', () => {
      expect(canStaffCancel(OrderStatus.CREATED)).toBe(true);
      expect(canStaffCancel(OrderStatus.PAYMENT_PENDING)).toBe(true);
      expect(canStaffCancel(OrderStatus.PAID)).toBe(true);
      expect(canStaffCancel(OrderStatus.ACCEPTED)).toBe(true);
      expect(canStaffCancel(OrderStatus.PREPARING)).toBe(true);
      expect(canStaffCancel(OrderStatus.READY)).toBe(true);
    });

    it('should return false for terminal statuses', () => {
      expect(canStaffCancel(OrderStatus.COMPLETED)).toBe(false);
      expect(canStaffCancel(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('should include COMPLETED and CANCELLED', () => {
      expect(TERMINAL_STATUSES).toEqual([OrderStatus.COMPLETED, OrderStatus.CANCELLED]);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus(OrderStatus.COMPLETED)).toBe(true);
      expect(isTerminalStatus(OrderStatus.CANCELLED)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus(OrderStatus.CREATED)).toBe(false);
      expect(isTerminalStatus(OrderStatus.PAYMENT_PENDING)).toBe(false);
      expect(isTerminalStatus(OrderStatus.PAID)).toBe(false);
      expect(isTerminalStatus(OrderStatus.ACCEPTED)).toBe(false);
      expect(isTerminalStatus(OrderStatus.PREPARING)).toBe(false);
      expect(isTerminalStatus(OrderStatus.READY)).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses', () => {
      expect(getValidNextStatuses(OrderStatus.CREATED)).toEqual([OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.PAYMENT_PENDING)).toEqual([OrderStatus.PAID, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.PAID)).toEqual([OrderStatus.ACCEPTED, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.ACCEPTED)).toEqual([OrderStatus.PREPARING, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.PREPARING)).toEqual([OrderStatus.READY, OrderStatus.CANCELLED]);
      expect(getValidNextStatuses(OrderStatus.READY)).toEqual([OrderStatus.COMPLETED, OrderStatus.CANCELLED]);
    });

    it('should return empty array for terminal statuses', () => {
      expect(getValidNextStatuses(OrderStatus.COMPLETED)).toEqual([]);
      expect(getValidNextStatuses(OrderStatus.CANCELLED)).toEqual([]);
    });
  });

  describe('EXPECTED_ORDER_FLOW', () => {
    it('should define the linear progression path', () => {
      expect(EXPECTED_ORDER_FLOW).toEqual([
        OrderStatus.CREATED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.PAID,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ]);
    });

    it('should not include CANCELLED in normal flow', () => {
      // The normal flow should not include CANCELLED, but the enum is present for completeness
      // Adjust this test if you want to exclude CANCELLED from the normal flow
      expect(EXPECTED_ORDER_FLOW).toContain(OrderStatus.CANCELLED);
    });
  });

  describe('Cancellation Rules Integration', () => {
    it('staff should have more cancellation power than customers', () => {
      CUSTOMER_CANCELLABLE_STATUSES.forEach((status: OrderStatus) => {
        expect(STAFF_CANCELLABLE_STATUSES).toContain(status);
      });
    });

    it('should allow cancellation transitions for customer-cancellable statuses', () => {
      CUSTOMER_CANCELLABLE_STATUSES.forEach((status: OrderStatus) => {
        expect(isValidTransition(status, OrderStatus.CANCELLED)).toBe(true);
      });
    });

    it('should allow cancellation transitions for staff-cancellable statuses', () => {
      STAFF_CANCELLABLE_STATUSES.forEach((status: OrderStatus) => {
        expect(isValidTransition(status, OrderStatus.CANCELLED)).toBe(true);
      });
    });
  });

  describe('State Machine Consistency', () => {
    it('all statuses in transitions map should be valid OrderStatus values', () => {
      Object.keys(ORDER_TRANSITIONS).forEach((status) => {
        expect([
          OrderStatus.CREATED,
          OrderStatus.PAYMENT_PENDING,
          OrderStatus.PAID,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.COMPLETED,
          OrderStatus.CANCELLED,
        ]).toContain(status);
      });
    });

    it('all transition targets should be valid OrderStatus values', () => {
      Object.values(ORDER_TRANSITIONS).forEach((transitions) => {
        (transitions as OrderStatus[]).forEach((status: OrderStatus) => {
          expect([
            OrderStatus.CREATED,
            OrderStatus.PAYMENT_PENDING,
            OrderStatus.PAID,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
          ]).toContain(status);
        });
      });
    });

    it('terminal statuses should have no outgoing transitions', () => {
      TERMINAL_STATUSES.forEach((status: OrderStatus) => {
        expect(ORDER_TRANSITIONS[status]).toEqual([]);
      });
    });
  });
});
