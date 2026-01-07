import { MenuService } from '../../menu/v1/menu.service';
import { OrdersService } from '../../orders/v1/orders.service';
import { PaymentsService } from '../../payments/v1/payments.service';
import { BotSessionStore } from './sessionStore';
import { IntentDetector } from './intentDetector';
import { getNextState, determineAction } from './stateMachine';
import {
  BotSession,
  BotReply,
  BotResponse,
  SendMessageDTO,
  BotSessionDTO,
  CartItem,
  QuickReply,
  Card,
  BotContext,
} from './bot.types';
import logger from '../../../lib/logger';

/**
 * Bot Engine - handles message processing and response generation
 */
export class BotEngine {
  private sessionStore: BotSessionStore;
  private intentDetector: IntentDetector;
  private menuService: MenuService;
  private ordersService: OrdersService;
  private paymentsService: PaymentsService;

  constructor() {
    this.sessionStore = new BotSessionStore();
    this.intentDetector = new IntentDetector();
    this.menuService = new MenuService();
    this.ordersService = new OrdersService();
    this.paymentsService = new PaymentsService();
  }

  /**
   * Main entry point - processes user message and generates response
   */
  async processMessage(
    restaurantId: string,
    data: SendMessageDTO
  ): Promise<BotResponse> {
    // 1. Get or create session
    const session = await this.sessionStore.getOrCreateSession(
      restaurantId,
      data.sessionId
    );

    logger.info({
      msg: 'Processing bot message',
      restaurantId,
      sessionId: data.sessionId,
      state: session.state,
      message: data.message.substring(0, 50),
    });

    // 2. Detect intent
    const detection = this.intentDetector.detect(data.message);

    logger.debug({
      msg: 'Intent detected',
      sessionId: data.sessionId,
      intent: detection.intent,
      confidence: detection.confidence,
    });

    // 3. Determine next state and action
    const nextState = getNextState(session.state, detection.intent);
    const transition = determineAction(
      session.state,
      nextState || session.state,
      detection.intent,
      session.context
    );

    // 4. Execute action and generate reply
    const reply = await this.executeAction(
      restaurantId,
      session,
      transition.action || 'NO_ACTION',
      detection.entities,
      data.message
    );

    // 5. Update session
    const updatedSession = await this.sessionStore.updateSession(data.sessionId, {
      state: transition.nextState,
      cart: session.cart,
      context: {
        ...session.context,
        ...transition.updateContext,
        lastIntent: detection.intent,
      },
    });

    // 6. Return response
    return {
      reply,
      sessionState: this.toSessionDTO(updatedSession),
    };
  }

  /**
   * Gets session information
   */
  async getSession(sessionId: string): Promise<BotSessionDTO | null> {
    const session = await this.sessionStore.getSession(sessionId);
    return session ? this.toSessionDTO(session) : null;
  }

  // ========================================
  // Action Handlers
  // ========================================

  private async executeAction(
    restaurantId: string,
    session: BotSession,
    action: string,
    entities: Record<string, any>,
    rawMessage: string
  ): Promise<BotReply> {
    switch (action) {
      case 'SHOW_GREETING':
        return this.handleGreeting(restaurantId);

      case 'SHOW_MENU_CATEGORIES':
        return this.handleShowMenu(restaurantId);

      case 'SHOW_ITEM_DETAILS':
        return this.handleShowItemDetails(restaurantId, session, entities, rawMessage);

      case 'ADD_ITEM_TO_CART':
        return this.handleAddToCart(restaurantId, session, entities);

      case 'SHOW_CART':
        return this.handleShowCart(session);

      case 'REMOVE_ITEM_FROM_CART':
        return this.handleRemoveFromCart(session, rawMessage);

      case 'REQUEST_CUSTOMER_INFO':
        return this.handleRequestCustomerInfo(session);

      case 'COLLECT_CUSTOMER_INFO':
        return this.handleCollectCustomerInfo(session, entities, rawMessage);

      case 'SHOW_ORDER_CONFIRMATION':
        return this.handleShowConfirmation(session);

      case 'CREATE_ORDER':
        return this.handleCreateOrder(restaurantId, session);

      case 'SHOW_PAYMENT_OPTIONS':
        return this.handleShowPayment(restaurantId, session);

      case 'GENERATE_CHECKOUT_URL':
        return this.handleGenerateCheckout(restaurantId, session);

      case 'SHOW_ORDER_STATUS':
        return this.handleShowStatus(restaurantId, session);

      case 'CANCEL_ORDER':
        return this.handleCancelOrder(restaurantId, session);

      case 'SHOW_HELP':
        return this.handleHelp(session);

      case 'INVALID_TRANSITION':
        return this.handleInvalidTransition(session);

      default:
        return this.handleUnknown(session);
    }
  }

  private async handleGreeting(restaurantId: string): Promise<BotReply> {
    const restaurant = await this.menuService.getRestaurantInfo(restaurantId);

    return {
      text: `👋 Welcome to ${restaurant?.name || 'our restaurant'}!\n\nI'm here to help you order food. What would you like to do?`,
      quickReplies: [
        { label: '📋 Browse Menu', value: 'show menu' },
        { label: '🛒 View Cart', value: 'view cart' },
        { label: '📦 Check Order Status', value: 'order status' },
        { label: '❓ Help', value: 'help' },
      ],
    };
  }

  private async handleShowMenu(restaurantId: string): Promise<BotReply> {
    // Get restaurant slug first
    const restaurant = await this.menuService.getRestaurantInfo(restaurantId);
    if (!restaurant) {
      return {
        text: 'Restaurant not found.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }

    const menu = await this.menuService.getPublicMenu(restaurant.slug);

    if (!menu.categories.length) {
      return {
        text: "Sorry, we don't have any menu items available right now. Please check back later!",
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }

    const cards: Card[] = menu.categories.map((category, index) => ({
      title: category.name,
      subtitle: category.description || `${category.items.length} items available`,
      buttons: [
        {
          label: 'View Items',
          value: `show items in ${category.name}`,
        },
      ],
    }));

    let text = '📋 Here are our menu categories:\n\n';
    menu.categories.forEach((cat, i) => {
      text += `${i + 1}. ${cat.name} (${cat.items.length} items)\n`;
    });
    text += '\nReply with a category number or name to see items.';

    return {
      text,
      cards,
      quickReplies: [
        { label: '🛒 View Cart', value: 'cart' },
        { label: '🏠 Start Over', value: 'hi' },
      ],
    };
  }

  private async handleShowItemDetails(
    restaurantId: string,
    session: BotSession,
    entities: Record<string, any>,
    rawMessage: string
  ): Promise<BotReply> {
    // Get restaurant slug first
    const restaurant = await this.menuService.getRestaurantInfo(restaurantId);
    if (!restaurant) {
      return {
        text: 'Restaurant not found.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }

    const menu = await this.menuService.getPublicMenu(restaurant.slug);
    
    // Find item by number or name
    let item: any = null;
    
    if (entities.itemNumber) {
      const allItems = menu.categories.flatMap((c) => c.items);
      item = allItems[entities.itemNumber - 1];
    } else {
      // Search by name in message
      const normalized = rawMessage.toLowerCase();
      for (const category of menu.categories) {
        item = category.items.find((i) =>
          normalized.includes(i.name.toLowerCase())
        );
        if (item) break;
      }
    }

    if (!item) {
      return {
        text: "Sorry, I couldn't find that item. Please try again or browse the menu.",
        quickReplies: [
          { label: '📋 Browse Menu', value: 'menu' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }

    // Update context with current item
    session.context.currentItemId = item.id;

    let text = `🍽️ **${item.name}**\n\n`;
    text += `Price: $${item.price}\n\n`;
    if (item.description) {
      text += `${item.description}\n\n`;
    }

    if (item.options && item.options.length > 0) {
      text += '**Customization Options:**\n';
      item.options.forEach((opt: any) => {
        text += `\n${opt.name} ${opt.isRequired ? '(Required)' : '(Optional)'}\n`;
        opt.values.forEach((val: any) => {
          text += `  • ${val.value} ${val.priceModifier > 0 ? `+$${val.priceModifier}` : ''}\n`;
        });
      });
    }

    text += '\nWould you like to add this to your cart?';

    return {
      text,
      quickReplies: [
        { label: '✅ Add to Cart', value: 'add' },
        { label: '📋 Back to Menu', value: 'menu' },
        { label: '🏠 Start Over', value: 'hi' },
      ],
    };
  }

  private async handleAddToCart(
    restaurantId: string,
    session: BotSession,
    entities: Record<string, any>
  ): Promise<BotReply> {
    // Get restaurant slug first
    const restaurant = await this.menuService.getRestaurantInfo(restaurantId);
    if (!restaurant) {
      return {
        text: 'Restaurant not found.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }

    const currentItemId = session.context.currentItemId;

    if (!currentItemId) {
      return {
        text: 'Please select an item first before adding to cart.',
        quickReplies: [{ label: '📋 Browse Menu', value: 'menu' }],
      };
    }

    // Fetch item details
    const menu = await this.menuService.getPublicMenu(restaurant.slug);
    let item: any = null;
    for (const category of menu.categories) {
      item = category.items.find((i: any) => i.id === currentItemId);
      if (item) break;
    }

    if (!item) {
      return {
        text: 'Sorry, that item is no longer available.',
        quickReplies: [{ label: '📋 Browse Menu', value: 'menu' }],
      };
    }

    // Add to cart
    const quantity = entities.quantity || 1;
    const existingItem = session.cart.find((ci) => ci.menuItemId === currentItemId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      session.cart.push({
        menuItemId: currentItemId,
        name: item.name,
        quantity,
        unitPrice: parseFloat(item.price),
      });
    }

    const total = session.cart.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    return {
      text: `✅ Added ${quantity}x ${item.name} to your cart!\n\nCart Total: $${total.toFixed(2)}`,
      quickReplies: [
        { label: '📋 Continue Shopping', value: 'menu' },
        { label: '🛒 View Cart', value: 'cart' },
        { label: '💳 Checkout', value: 'checkout' },
      ],
    };
  }

  private handleShowCart(session: BotSession): BotReply {
    if (session.cart.length === 0) {
      return {
        text: '🛒 Your cart is empty.\n\nWould you like to browse our menu?',
        quickReplies: [
          { label: '📋 Browse Menu', value: 'menu' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }

    let text = '🛒 **Your Cart:**\n\n';
    let total = 0;

    session.cart.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      total += itemTotal;
      text += `${index + 1}. ${item.name} x${item.quantity} - $${itemTotal.toFixed(2)}\n`;
    });

    text += `\n**Total: $${total.toFixed(2)}**\n\n`;
    text += 'Reply with item number to remove, or proceed to checkout.';

    return {
      text,
      quickReplies: [
        { label: '💳 Checkout', value: 'checkout' },
        { label: '📋 Add More Items', value: 'menu' },
        { label: '🗑️ Clear Cart', value: 'remove all' },
      ],
    };
  }

  private handleRemoveFromCart(session: BotSession, rawMessage: string): BotReply {
    if (rawMessage.toLowerCase().includes('all') || rawMessage.toLowerCase().includes('clear')) {
      session.cart = [];
      return {
        text: '🗑️ Cart cleared.',
        quickReplies: [
          { label: '📋 Browse Menu', value: 'menu' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }

    const match = rawMessage.match(/\d+/);
    if (match) {
      const index = parseInt(match[0], 10) - 1;
      if (index >= 0 && index < session.cart.length) {
        const removed = session.cart.splice(index, 1)[0];
        return {
          text: `✅ Removed ${removed.name} from cart.`,
          quickReplies: [
            { label: '🛒 View Cart', value: 'cart' },
            { label: '📋 Browse Menu', value: 'menu' },
          ],
        };
      }
    }

    return {
      text: 'Please specify which item to remove (reply with item number).',
      quickReplies: [{ label: '🛒 View Cart', value: 'cart' }],
    };
  }

  private handleRequestCustomerInfo(session: BotSession): BotReply {
    const hasName = !!session.context.customerName;
    const hasEmail = !!session.context.customerEmail;
    const hasPhone = !!session.context.customerPhone;

    if (!hasName) {
      return {
        text: '📝 Great! To complete your order, I need some information.\n\nWhat is your name?',
      };
    }

    if (!hasEmail) {
      return {
        text: 'Thanks! What is your email address?',
      };
    }

    if (!hasPhone) {
      return {
        text: 'And finally, what is your phone number?',
      };
    }

    // All info collected, move to confirmation
    return this.handleShowConfirmation(session);
  }

  private handleCollectCustomerInfo(
    session: BotSession,
    entities: Record<string, any>,
    rawMessage: string
  ): BotReply {
    if (entities.email) {
      session.context.customerEmail = entities.email;
      return this.handleRequestCustomerInfo(session);
    }

    if (entities.phone) {
      session.context.customerPhone = entities.phone;
      return this.handleRequestCustomerInfo(session);
    }

    // Assume it's the name if not email or phone
    if (!session.context.customerName) {
      session.context.customerName = rawMessage.trim();
      return this.handleRequestCustomerInfo(session);
    }

    return this.handleRequestCustomerInfo(session);
  }

  private handleShowConfirmation(session: BotSession): BotReply {
    const total = session.cart.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    let text = '📋 **Order Confirmation**\n\n';
    text += '**Items:**\n';
    session.cart.forEach((item) => {
      text += `• ${item.name} x${item.quantity} - $${(item.quantity * item.unitPrice).toFixed(2)}\n`;
    });

    text += `\n**Total: $${total.toFixed(2)}**\n\n`;
    text += '**Delivery Info:**\n';
    text += `Name: ${session.context.customerName}\n`;
    text += `Email: ${session.context.customerEmail}\n`;
    text += `Phone: ${session.context.customerPhone}\n\n`;
    text += 'Everything look correct? Reply "yes" to place your order.';

    return {
      text,
      quickReplies: [
        { label: '✅ Confirm Order', value: 'yes' },
        { label: '✏️ Edit Info', value: 'edit' },
        { label: '🛒 Back to Cart', value: 'cart' },
      ],
    };
  }

  private async handleCreateOrder(
    restaurantId: string,
    session: BotSession
  ): Promise<BotReply> {
    try {
      const order = await this.ordersService.createOrder(restaurantId, {
        customerName: session.context.customerName,
        customerEmail: session.context.customerEmail,
        customerPhone: session.context.customerPhone,
        items: session.cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
        notes: 'Order placed via chatbot',
        idempotencyKey: `bot_${session.sessionId}_${Date.now()}`,
      });

      // Store order ID in context
      session.context.orderId = order.id;

      return {
        text: `✅ Order placed successfully!\n\nOrder ID: ${order.id.substring(0, 8)}\n\nWould you like to proceed to payment?`,
        quickReplies: [
          { label: '💳 Pay Now', value: 'pay' },
          { label: '📦 Check Status', value: 'status' },
        ],
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create order via bot',
        sessionId: session.sessionId,
        error: error.message,
      });
      return {
        text: 'Sorry, there was an error placing your order. Please try again later.',
        quickReplies: [
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }
  }

  private handleShowPayment(restaurantId: string, session: BotSession): BotReply {
    return {
      text: '💳 **Payment Options**\n\nYour order has been placed and is awaiting payment.\n\nReply "pay" to get a secure payment link.',
      quickReplies: [
        { label: '💳 Get Payment Link', value: 'pay' },
        { label: '📦 Check Status', value: 'status' },
      ],
    };
  }

  private async handleGenerateCheckout(
    restaurantId: string,
    session: BotSession
  ): Promise<BotReply> {
    const orderId = session.context.orderId;

    if (!orderId) {
      return {
        text: 'No active order found. Please place an order first.',
        quickReplies: [{ label: '📋 Browse Menu', value: 'menu' }],
      };
    }

    try {
      const payment = await this.paymentsService.createPaymentIntent(
        restaurantId,
        orderId,
        {
          orderId,
          successUrl: `${process.env.FRONTEND_URL}/order/${orderId}/success`,
          cancelUrl: `${process.env.FRONTEND_URL}/order/${orderId}`,
        }
      );

      session.context.checkoutUrl = payment.checkoutUrl;
      session.context.paymentId = payment.id;

      return {
        text: `💳 **Payment Ready**\n\nClick the link below to complete your payment securely:\n\n${payment.checkoutUrl}\n\nOnce payment is complete, your order will be processed!`,
        quickReplies: [
          { label: '📦 Check Status', value: 'status' },
        ],
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to generate checkout via bot',
        sessionId: session.sessionId,
        orderId,
        error: error.message,
      });
      return {
        text: 'Sorry, payment is not available right now. Please contact the restaurant directly.',
        quickReplies: [
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }
  }

  private async handleShowStatus(
    restaurantId: string,
    session: BotSession
  ): Promise<BotReply> {
    const orderId = session.context.orderId;

    if (!orderId) {
      return {
        text: 'No active order found. Would you like to place a new order?',
        quickReplies: [
          { label: '📋 Browse Menu', value: 'menu' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    }

    try {
      const order = await this.ordersService.getOrder(restaurantId, orderId);

      let statusText = '';
      switch (order.status) {
        case 'CREATED':
          statusText = '📝 Order Created - Awaiting payment';
          break;
        case 'PAYMENT_PENDING':
          statusText = '⏳ Payment Pending';
          break;
        case 'PAID':
          statusText = '💰 Payment Received - Order being processed';
          break;
        case 'ACCEPTED':
          statusText = '✅ Order Accepted';
          break;
        case 'PREPARING':
          statusText = '👨‍🍳 Being Prepared';
          break;
        case 'READY':
          statusText = '🎉 Ready for Pickup/Delivery';
          break;
        case 'COMPLETED':
          statusText = '✅ Order Completed';
          break;
        case 'CANCELLED':
          statusText = '❌ Order Cancelled';
          break;
        default:
          statusText = order.status;
      }

      let text = `📦 **Order Status**\n\n`;
      text += `Order ID: ${orderId.substring(0, 8)}\n`;
      text += `Status: ${statusText}\n`;
      text += `Total: $${order.total}\n\n`;

      return {
        text,
        quickReplies: [
          { label: '🔄 Refresh Status', value: 'status' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    } catch (error) {
      return {
        text: 'Sorry, I could not retrieve your order status. Please try again later.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }
  }

  private async handleCancelOrder(
    restaurantId: string,
    session: BotSession
  ): Promise<BotReply> {
    const orderId = session.context.orderId;

    if (!orderId) {
      return {
        text: 'No active order to cancel.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }

    try {
      await this.ordersService.cancelOrder(
        restaurantId,
        orderId,
        false,
        'Cancelled via chatbot'
      );

      return {
        text: '✅ Your order has been cancelled.\n\nWould you like to place a new order?',
        quickReplies: [
          { label: '📋 Browse Menu', value: 'menu' },
          { label: '🏠 Start Over', value: 'hi' },
        ],
      };
    } catch (error) {
      return {
        text: 'Sorry, I could not cancel your order. It may have already been processed. Please contact the restaurant.',
        quickReplies: [{ label: '🏠 Start Over', value: 'hi' }],
      };
    }
  }

  private handleHelp(session: BotSession): BotReply {
    let text = '❓ **Help Guide**\n\n';
    text += 'I can help you with:\n\n';
    text += '• 📋 Browse our menu\n';
    text += '• 🛒 Manage your cart\n';
    text += '• 💳 Place and pay for orders\n';
    text += '• 📦 Check order status\n';
    text += '• ❌ Cancel orders\n\n';
    text += 'Just tell me what you want to do in plain English!';

    return {
      text,
      quickReplies: [
        { label: '📋 Browse Menu', value: 'menu' },
        { label: '🛒 View Cart', value: 'cart' },
        { label: '🏠 Start Over', value: 'hi' },
      ],
    };
  }

  private handleInvalidTransition(session: BotSession): BotReply {
    return {
      text: "I'm not sure I can do that right now. Try one of these options:",
      quickReplies: [
        { label: '📋 Browse Menu', value: 'menu' },
        { label: '🛒 View Cart', value: 'cart' },
        { label: '❓ Help', value: 'help' },
        { label: '🏠 Start Over', value: 'hi' },
      ],
    };
  }

  private handleUnknown(session: BotSession): BotReply {
    return {
      text: "Sorry, I didn't understand that. Can you rephrase or choose from these options?",
      quickReplies: [
        { label: '📋 Browse Menu', value: 'menu' },
        { label: '🛒 View Cart', value: 'cart' },
        { label: '❓ Help', value: 'help' },
      ],
    };
  }

  // ========================================
  // Helpers
  // ========================================

  private toSessionDTO(session: BotSession): BotSessionDTO {
    return {
      sessionId: session.sessionId,
      state: session.state,
      cart: session.cart,
      context: session.context,
      lastMessageAt: session.updatedAt,
    };
  }
}
