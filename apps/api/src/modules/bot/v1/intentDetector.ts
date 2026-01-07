import { Intent, DetectedIntent } from './bot.types';

/**
 * Simple rule-based intent detection
 * Uses keyword matching and pattern recognition
 */
export class IntentDetector {
  /**
   * Detects user intent from message text
   */
  detect(message: string): DetectedIntent {
    const normalized = message.toLowerCase().trim();
    const tokens = normalized.split(/\s+/);

    // Check for greetings
    if (this.matchesGreeting(normalized)) {
      return {
        intent: 'GREETING',
        entities: {},
        confidence: 0.9,
      };
    }

    // Check for menu browsing
    if (this.matchesBrowseMenu(normalized)) {
      return {
        intent: 'BROWSE_MENU',
        entities: {},
        confidence: 0.85,
      };
    }

    // Check for view cart
    if (this.matchesViewCart(normalized)) {
      return {
        intent: 'VIEW_CART',
        entities: {},
        confidence: 0.9,
      };
    }

    // Check for checkout
    if (this.matchesCheckout(normalized)) {
      return {
        intent: 'CHECKOUT',
        entities: {},
        confidence: 0.85,
      };
    }

    // Check for help
    if (this.matchesHelp(normalized)) {
      return {
        intent: 'HELP',
        entities: {},
        confidence: 0.9,
      };
    }

    // Check for cancel
    if (this.matchesCancel(normalized)) {
      return {
        intent: 'CANCEL_ORDER',
        entities: {},
        confidence: 0.85,
      };
    }

    // Check for status check
    if (this.matchesCheckStatus(normalized)) {
      return {
        intent: 'CHECK_STATUS',
        entities: {},
        confidence: 0.85,
      };
    }

    // Check for go back
    if (this.matchesGoBack(normalized)) {
      return {
        intent: 'GO_BACK',
        entities: {},
        confidence: 0.9,
      };
    }

    // Check for add to cart patterns
    if (this.matchesAddToCart(normalized)) {
      const quantity = this.extractQuantity(normalized);
      return {
        intent: 'ADD_TO_CART',
        entities: { quantity },
        confidence: 0.8,
      };
    }

    // Check for remove from cart
    if (this.matchesRemoveFromCart(normalized)) {
      return {
        intent: 'REMOVE_FROM_CART',
        entities: {},
        confidence: 0.8,
      };
    }

    // Check for numeric input (item selection, quantity, etc.)
    if (/^\d+$/.test(normalized)) {
      const number = parseInt(normalized, 10);
      return {
        intent: 'VIEW_ITEM',
        entities: { itemNumber: number },
        confidence: 0.7,
      };
    }

    // Check for email pattern (customer info)
    if (this.isEmail(normalized)) {
      return {
        intent: 'PROVIDE_INFO',
        entities: { email: normalized },
        confidence: 0.85,
      };
    }

    // Check for phone pattern
    if (this.isPhone(normalized)) {
      return {
        intent: 'PROVIDE_INFO',
        entities: { phone: normalized },
        confidence: 0.85,
      };
    }

    // Check for confirmation
    if (this.matchesConfirmation(normalized)) {
      return {
        intent: 'CONFIRM_ORDER',
        entities: {},
        confidence: 0.9,
      };
    }

    // Default to unknown
    return {
      intent: 'UNKNOWN',
      entities: {},
      confidence: 0.3,
    };
  }

  // ========================================
  // Pattern Matching Helpers
  // ========================================

  private matchesGreeting(text: string): boolean {
    const greetings = [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'start',
      'begin',
    ];
    return greetings.some((g) => text.includes(g));
  }

  private matchesBrowseMenu(text: string): boolean {
    const keywords = [
      'menu',
      'show menu',
      'view menu',
      'see menu',
      'browse',
      'what do you have',
      'what can i order',
      'show me',
      'categories',
    ];
    return keywords.some((k) => text.includes(k));
  }

  private matchesViewCart(text: string): boolean {
    const keywords = [
      'cart',
      'my cart',
      'view cart',
      'show cart',
      'basket',
      'what did i order',
      'my order',
    ];
    return keywords.some((k) => text.includes(k));
  }

  private matchesCheckout(text: string): boolean {
    const keywords = [
      'checkout',
      'check out',
      'place order',
      'order now',
      'complete order',
      'finish order',
      'proceed',
      'ready to order',
    ];
    return keywords.some((k) => text.includes(k));
  }

  private matchesHelp(text: string): boolean {
    const keywords = ['help', 'assist', 'support', 'how', 'what can you do'];
    return keywords.some((k) => text.includes(k));
  }

  private matchesCancel(text: string): boolean {
    const keywords = ['cancel', 'stop', 'quit', 'exit', 'abort', 'nevermind'];
    return keywords.some((k) => text.includes(k));
  }

  private matchesCheckStatus(text: string): boolean {
    const keywords = [
      'status',
      'where is my order',
      'order status',
      'track',
      'tracking',
    ];
    return keywords.some((k) => text.includes(k));
  }

  private matchesGoBack(text: string): boolean {
    const keywords = ['back', 'previous', 'return', 'go back'];
    return keywords.some((k) => text === k || text.startsWith(k));
  }

  private matchesAddToCart(text: string): boolean {
    const keywords = ['add', 'i want', "i'll have", 'get me', 'order'];
    return keywords.some((k) => text.includes(k));
  }

  private matchesRemoveFromCart(text: string): boolean {
    const keywords = ['remove', 'delete', 'take out', "don't want"];
    return keywords.some((k) => text.includes(k));
  }

  private matchesConfirmation(text: string): boolean {
    const confirmations = ['yes', 'yep', 'yeah', 'confirm', 'correct', 'ok', 'okay'];
    return confirmations.some((c) => text === c || text === `${c}.`);
  }

  private extractQuantity(text: string): number {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  private isEmail(text: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }

  private isPhone(text: string): boolean {
    // Matches formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
    return /^[\d\s\-\+\(\)]+$/.test(text) && text.replace(/\D/g, '').length >= 10;
  }
}
