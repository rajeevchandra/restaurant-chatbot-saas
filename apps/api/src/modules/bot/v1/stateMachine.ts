import { BotState, Intent, StateTransition, BotContext } from './bot.types';

/**
 * Deterministic Finite State Machine for Bot
 * Defines valid state transitions based on detected intents
 */

// Valid transitions from each state
export const STATE_TRANSITIONS: Record<BotState, Record<Intent, BotState | null>> = {
  GREETING: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: 'ITEM_DETAILS',
    ADD_TO_CART: null,
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: null,
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: null,
    HELP: 'HELP',
    GO_BACK: null,
    UNKNOWN: 'GREETING',
  },
  BROWSE_MENU: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: 'ITEM_DETAILS',
    ADD_TO_CART: null,
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: null,
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: null,
    HELP: 'HELP',
    GO_BACK: 'GREETING',
    UNKNOWN: 'BROWSE_MENU',
  },
  ITEM_DETAILS: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: 'ITEM_DETAILS',
    ADD_TO_CART: 'BROWSE_MENU',
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: null,
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: null,
    HELP: 'HELP',
    GO_BACK: 'BROWSE_MENU',
    UNKNOWN: 'ITEM_DETAILS',
  },
  CART: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: 'ITEM_DETAILS',
    ADD_TO_CART: 'BROWSE_MENU',
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: 'CART',
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: null,
    HELP: 'HELP',
    GO_BACK: 'BROWSE_MENU',
    UNKNOWN: 'CART',
  },
  CUSTOMER_INFO: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: null,
    ADD_TO_CART: null,
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: null,
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: 'CUSTOMER_INFO',
    CONFIRM_ORDER: 'CONFIRM',
    MAKE_PAYMENT: null,
    CHECK_STATUS: null,
    CANCEL_ORDER: 'CANCEL',
    HELP: 'HELP',
    GO_BACK: 'CART',
    UNKNOWN: 'CUSTOMER_INFO',
  },
  CONFIRM: {
    GREETING: 'GREETING',
    BROWSE_MENU: null,
    VIEW_ITEM: null,
    ADD_TO_CART: null,
    VIEW_CART: null,
    REMOVE_FROM_CART: null,
    CHECKOUT: null,
    PROVIDE_INFO: null,
    CONFIRM_ORDER: 'PAYMENT',
    MAKE_PAYMENT: null,
    CHECK_STATUS: null,
    CANCEL_ORDER: 'CANCEL',
    HELP: 'HELP',
    GO_BACK: 'CUSTOMER_INFO',
    UNKNOWN: 'CONFIRM',
  },
  PAYMENT: {
    GREETING: 'GREETING',
    BROWSE_MENU: null,
    VIEW_ITEM: null,
    ADD_TO_CART: null,
    VIEW_CART: null,
    REMOVE_FROM_CART: null,
    CHECKOUT: null,
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: 'STATUS',
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: 'CANCEL',
    HELP: 'HELP',
    GO_BACK: 'CONFIRM',
    UNKNOWN: 'PAYMENT',
  },
  STATUS: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: null,
    ADD_TO_CART: null,
    VIEW_CART: null,
    REMOVE_FROM_CART: null,
    CHECKOUT: null,
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: 'CANCEL',
    HELP: 'HELP',
    GO_BACK: 'GREETING',
    UNKNOWN: 'STATUS',
  },
  CANCEL: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: null,
    ADD_TO_CART: null,
    VIEW_CART: null,
    REMOVE_FROM_CART: null,
    CHECKOUT: null,
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: null,
    CANCEL_ORDER: 'CANCEL',
    HELP: 'HELP',
    GO_BACK: 'GREETING',
    UNKNOWN: 'CANCEL',
  },
  HELP: {
    GREETING: 'GREETING',
    BROWSE_MENU: 'BROWSE_MENU',
    VIEW_ITEM: 'ITEM_DETAILS',
    ADD_TO_CART: null,
    VIEW_CART: 'CART',
    REMOVE_FROM_CART: null,
    CHECKOUT: 'CUSTOMER_INFO',
    PROVIDE_INFO: null,
    CONFIRM_ORDER: null,
    MAKE_PAYMENT: null,
    CHECK_STATUS: 'STATUS',
    CANCEL_ORDER: null,
    HELP: 'HELP',
    GO_BACK: 'GREETING',
    UNKNOWN: 'HELP',
  },
};

/**
 * Determines if a state transition is valid
 */
export function isValidTransition(
  currentState: BotState,
  intent: Intent
): boolean {
  const nextState = STATE_TRANSITIONS[currentState]?.[intent];
  return nextState !== null && nextState !== undefined;
}

/**
 * Gets the next state based on current state and intent
 */
export function getNextState(
  currentState: BotState,
  intent: Intent
): BotState | null {
  return STATE_TRANSITIONS[currentState]?.[intent] ?? null;
}

/**
 * Determines what action to take based on state transition
 */
export function determineAction(
  currentState: BotState,
  nextState: BotState,
  intent: Intent,
  context: BotContext
): StateTransition {
  // If no valid transition, stay in current state
  if (!nextState) {
    return {
      nextState: currentState,
      action: 'INVALID_TRANSITION',
    };
  }

  // Map state + intent to specific actions
  const action = getActionForTransition(currentState, nextState, intent);

  return {
    nextState,
    action,
    updateContext: {},
  };
}

function getActionForTransition(
  currentState: BotState,
  nextState: BotState,
  intent: Intent
): string {
  // Action naming convention: STATE_INTENT
  if (nextState === 'BROWSE_MENU') {
    return 'SHOW_MENU_CATEGORIES';
  }

  if (nextState === 'ITEM_DETAILS') {
    return 'SHOW_ITEM_DETAILS';
  }

  if (currentState === 'ITEM_DETAILS' && intent === 'ADD_TO_CART') {
    return 'ADD_ITEM_TO_CART';
  }

  if (nextState === 'CART') {
    if (intent === 'REMOVE_FROM_CART') {
      return 'REMOVE_ITEM_FROM_CART';
    }
    return 'SHOW_CART';
  }

  if (nextState === 'CUSTOMER_INFO') {
    return 'REQUEST_CUSTOMER_INFO';
  }

  if (currentState === 'CUSTOMER_INFO' && intent === 'PROVIDE_INFO') {
    return 'COLLECT_CUSTOMER_INFO';
  }

  if (nextState === 'CONFIRM') {
    return 'SHOW_ORDER_CONFIRMATION';
  }

  if (currentState === 'CONFIRM' && intent === 'CONFIRM_ORDER') {
    return 'CREATE_ORDER';
  }

  if (nextState === 'PAYMENT') {
    return 'SHOW_PAYMENT_OPTIONS';
  }

  if (currentState === 'PAYMENT' && intent === 'MAKE_PAYMENT') {
    return 'GENERATE_CHECKOUT_URL';
  }

  if (nextState === 'STATUS') {
    return 'SHOW_ORDER_STATUS';
  }

  if (nextState === 'CANCEL') {
    return 'CANCEL_ORDER';
  }

  if (nextState === 'HELP') {
    return 'SHOW_HELP';
  }

  if (nextState === 'GREETING') {
    return 'SHOW_GREETING';
  }

  return 'NO_ACTION';
}
