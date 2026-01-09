import { BotSessionState } from '@prisma/client';
import prisma from '../../db/prisma';

// Intent types for deterministic FSM
export type BotIntent = 
  | 'browse_menu'
  | 'add_to_cart'
  | 'remove_item'
  | 'checkout'
  | 'pay'
  | 'order_status'
  | 'cancel_order'
  | 'help'
  | 'view_cart'
  | 'confirm_order'
  | 'provide_contact';

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: Array<{
    optionId: string;
    optionName: string;
    valueId: string;
    valueName: string;
    priceModifier: number;
  }>;
}

export interface BotContext {
  state: BotSessionState;
  cartItems: CartItem[];
  lastIntent?: string;
  orderId?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  pendingItem?: {
    menuItemId: string;
    quantity: number;
  };
}

export interface BotResponse {
  text: string;
  quickReplies?: string[];
  cards?: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    price?: number;
    actions?: Array<{ label: string; intent: string; data?: any }>;
  }>;
  data?: any;
}

export class BotEngine {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // Main entry point - process user message and return bot response
  async processMessage(sessionId: string, message: string): Promise<BotResponse> {
    // Get or create session
    let session = await prisma.botSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      session = await prisma.botSession.create({
        data: {
          restaurantId: this.restaurantId,
          sessionId,
          state: 'GREETING',
          context: JSON.stringify({ cartItems: [] }),
        },
      });
    }

    const context: BotContext = session.context
      ? JSON.parse(session.context)
      : { state: session.state, cartItems: [] };

    // Ensure context.state matches session.state
    context.state = session.state;

    console.log('Current session state:', session.state, 'Context state:', context.state);
    console.log('Processing message:', message);

    // Detect intent from message
    const intent = this.detectIntent(message, context);
    console.log('Detected intent:', intent);

    // Process intent based on current state (FSM)
    const response = await this.handleIntent(intent, message, context, session.state);

    // Update session with new state and context
    await prisma.botSession.update({
      where: { sessionId },
      data: {
        state: response.newState || session.state,
        context: JSON.stringify(response.newContext || context),
        lastMessageAt: new Date(),
      },
    });

    return response.botResponse;
  }

  // Intent detection using keywords
  private detectIntent(message: string, context: BotContext): BotIntent {
    const lowerMessage = message.toLowerCase().trim();

    // Try to parse JSON data from button actions
    try {
      const jsonData = JSON.parse(message);
      if (jsonData.itemId && jsonData.quantity) {
        return 'add_to_cart';
      }
    } catch {
      // Not JSON, continue with keyword detection
    }

    // Help intent
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return 'help';
    }

    // Order status intent
    if (
      lowerMessage.includes('order status') ||
      lowerMessage.includes('track order') ||
      lowerMessage.includes('my order')
    ) {
      return 'order_status';
    }

    // Cancel order intent
    if (lowerMessage.includes('cancel order') || lowerMessage.includes('cancel my order')) {
      return 'cancel_order';
    }

    // Cancel checkout / go back to shopping
    if (context.state === 'CHECKOUT' && (
      lowerMessage === 'cancel' || 
      lowerMessage.includes('continue shopping') ||
      lowerMessage.includes('go back') ||
      lowerMessage.includes('back to menu')
    )) {
      return 'browse_menu';
    }

    // View cart intent
    if (
      lowerMessage.includes('cart') ||
      lowerMessage.includes('basket') ||
      lowerMessage.includes('what did i order')
    ) {
      return 'view_cart';
    }

    // Remove item intent
    if (lowerMessage.includes('remove') || lowerMessage.includes('delete')) {
      return 'remove_item';
    }

    // Checkout intent
    if (
      lowerMessage.includes('checkout') ||
      lowerMessage.includes('complete order')
    ) {
      return 'checkout';
    }

    // Payment intent
    if (
      lowerMessage.includes('pay now') ||
      lowerMessage.includes('make payment') ||
      (lowerMessage.includes('pay') && !lowerMessage.includes('checkout'))
    ) {
      return 'pay';
    }

    // Confirm order intent
    if (
      lowerMessage.includes('confirm') ||
      lowerMessage.includes('yes') ||
      lowerMessage.includes('proceed') ||
      lowerMessage.includes('i\'ve paid') ||
      lowerMessage.includes('paid')
    ) {
      if (context.state === 'CHECKOUT') {
        return 'confirm_order';
      }
      if (context.state === 'PAYMENT') {
        return 'confirm_order'; // Reuse for payment confirmation
      }
    }

    // Browse menu intent - check before "add to cart" to handle "Add More"
    if (
      lowerMessage.includes('menu') ||
      lowerMessage.includes('browse') ||
      lowerMessage.includes('show') ||
      lowerMessage.includes('add more') ||
      lowerMessage.includes('view menu')
    ) {
      return 'browse_menu';
    }

    // Add to cart intent
    if (
      lowerMessage.includes('add') ||
      lowerMessage.match(/\d+\s*x\s*/i) ||
      lowerMessage.includes('i want') ||
      lowerMessage.includes("i'll have")
    ) {
      return 'add_to_cart';
    }

    // Check if user is providing contact info (when in CHECKOUT state)
    if (context.state === 'CHECKOUT' && (
      lowerMessage.includes('@') || 
      /\d{3}[-\s]?\d{3}[-\s]?\d{4}/.test(message) ||
      (lowerMessage.includes(',') && /\d/.test(message))
    )) {
      return 'provide_contact';
    }

    return 'browse_menu';
  }

  // FSM: Handle intent based on current state
  private async handleIntent(
    intent: BotIntent,
    message: string,
    context: BotContext,
    currentState: BotSessionState
  ): Promise<{
    botResponse: BotResponse;
    newState?: BotSessionState;
    newContext?: BotContext;
  }> {
    // Help intent - available from any state
    if (intent === 'help') {
      return {
        botResponse: {
          text: `I can help you with:
• Browse our menu
• Add items to cart
• Remove items from cart
• View your cart
• Checkout and pay
• Check order status
• Cancel orders

What would you like to do?`,
          quickReplies: ['View Menu', 'My Cart', 'Order Status'],
        },
      };
    }

    // Order status - available from any state
    if (intent === 'order_status') {
      return await this.handleOrderStatus(context);
    }

    // Payment intent - available from PAYMENT or ORDER_PLACED states
    if (intent === 'pay' && context.orderId) {
      return await this.handlePayment(context);
    }

    // Cancel order - available from any state
    if (intent === 'cancel_order') {
      return await this.handleCancelOrder(context);
    }

    // State-based intent handling
    switch (currentState) {
      case 'GREETING':
        return await this.handleGreetingState(intent, message, context);

      case 'BROWSING_MENU':
        return await this.handleBrowsingMenuState(intent, message, context);

      case 'BUILDING_CART':
        return await this.handleBuildingCartState(intent, message, context);

      case 'CHECKOUT':
        return await this.handleCheckoutState(intent, message, context);

      case 'PAYMENT':
        return await this.handlePaymentState(intent, message, context);

      case 'ORDER_PLACED':
        return await this.handleOrderPlacedState(intent, message, context);

      default:
        return {
          botResponse: {
            text: "I'm not sure what to do. Type 'help' for assistance.",
            quickReplies: ['Help', 'View Menu'],
          },
        };
    }
  }

  // GREETING state handlers
  private async handleGreetingState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    if (intent === 'browse_menu') {
      const categories = await this.getMenuCategories();
      const categoryNames = categories.map(cat => cat.name);
      
      return {
        botResponse: {
          text: "Welcome! Browse our menu by category:",
          quickReplies: [...categoryNames, 'My Cart'],
        },
        newState: 'BROWSING_MENU' as BotSessionState,
      };
    }

    return {
      botResponse: {
        text: "👋 Welcome! I'm here to help you order delicious food. Would you like to see our menu?",
        quickReplies: ['View Menu', 'Order Status', 'Help'],
      },
    };
  }

  // BROWSING_MENU state handlers
  private async handleBrowsingMenuState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    if (intent === 'add_to_cart') {
      return await this.handleAddToCart(message, context);
    }

    if (intent === 'view_cart') {
      if (context.cartItems.length > 0) {
        return {
          botResponse: this.formatCartResponse(context),
          newState: 'BUILDING_CART' as BotSessionState,
        };
      }
      return {
        botResponse: {
          text: 'Your cart is empty. Browse our menu to add items!',
          quickReplies: ['View Menu'],
        },
      };
    }

    if (intent === 'checkout') {
      if (context.cartItems.length === 0) {
        return {
          botResponse: {
            text: 'Your cart is empty! Add some items first.',
            quickReplies: ['View Menu'],
          },
        };
      }
      return {
        botResponse: {
          text: 'Great! To complete your order, please provide:\n• Your name\n• Phone number\n• Email (optional)',
          quickReplies: [],
        },
        newState: 'CHECKOUT' as BotSessionState,
      };
    }

    // Check if user selected a category
    const categories = await this.getMenuCategories();
    const selectedCategory = categories.find(cat => 
      message.toLowerCase().includes(cat.name.toLowerCase())
    );

    if (selectedCategory) {
      const categoryItems = await this.getMenuByCategory(selectedCategory.id);
      const categoryNames = categories.map(cat => cat.name);
      
      return {
        botResponse: {
          text: `${selectedCategory.name}:`,
          quickReplies: [...categoryNames, 'My Cart', 'Checkout'],
          cards: this.formatMenuCards([{ ...selectedCategory, menuItems: categoryItems }]),
        },
      };
    }

    // Default: show category buttons
    const categoryNames = categories.map(cat => cat.name);
    return {
      botResponse: {
        text: "Browse our menu by category:",
        quickReplies: [...categoryNames, 'My Cart', 'Checkout'],
      },
    };
  }

  // BUILDING_CART state handlers
  private async handleBuildingCartState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    if (intent === 'add_to_cart') {
      return await this.handleAddToCart(message, context);
    }

    if (intent === 'remove_item') {
      return this.handleRemoveItem(message, context);
    }

    if (intent === 'view_cart') {
      return {
        botResponse: this.formatCartResponse(context),
      };
    }

    if (intent === 'checkout') {
      if (context.cartItems.length === 0) {
        return {
          botResponse: {
            text: 'Your cart is empty!',
            quickReplies: ['View Menu'],
          },
          newState: 'BROWSING_MENU' as BotSessionState,
        };
      }
      return {
        botResponse: {
          text: 'Ready to checkout! Please provide:\n• Your name\n• Phone number\n• Email (optional)\n\nExample: John Doe, 555-1234, john@email.com',
          quickReplies: [],
        },
        newState: 'CHECKOUT' as BotSessionState,
      };
    }

    if (intent === 'browse_menu') {
      const categories = await this.getMenuCategories();
      const categoryNames = categories.map(cat => cat.name);
      
      return {
        botResponse: {
          text: 'Browse our menu by category:',
          quickReplies: [...categoryNames, 'My Cart', 'Checkout'],
        },
        newState: 'BROWSING_MENU' as BotSessionState,
      };
    }

    return {
      botResponse: this.formatCartResponse(context),
    };
  }

  // CHECKOUT state handlers
  private async handleCheckoutState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    // Allow user to navigate back to menu/browsing
    if (intent === 'browse_menu') {
      const categories = await this.getMenuCategories();
      const categoryNames = categories.map(cat => cat.name);
      
      return {
        botResponse: {
          text: "Sure! Browse our menu by category:",
          quickReplies: [...categoryNames, 'My Cart', 'Checkout'],
        },
        newState: 'BROWSING_MENU' as BotSessionState,
      };
    }

    // Allow user to view cart
    if (intent === 'view_cart') {
      return {
        botResponse: this.formatCartResponse(context),
        newState: 'BUILDING_CART' as BotSessionState,
      };
    }

    if (intent === 'provide_contact' || intent === 'confirm_order') {
      // Parse contact info from message
      const contactInfo = this.parseContactInfo(message);
      
      if (!contactInfo.name || !contactInfo.phone) {
        return {
          botResponse: {
            text: 'Please provide your name and phone number. Example: John Doe, 555-1234',
            quickReplies: ['Cancel'],
          },
        };
      }

      // Create order
      const newContext = { ...context, customerInfo: contactInfo };
      const order = await this.createOrder(newContext);

      if (!order) {
        return {
          botResponse: {
            text: 'Sorry, there was an error creating your order. Please try again.',
            quickReplies: ['Try Again', 'View Cart'],
          },
        };
      }

      newContext.orderId = order.id;

      return {
        botResponse: {
          text: `Order #${order.id.slice(0, 8)} created! Total: $${Number(order.total).toFixed(2)}\n\nClick below to pay securely.`,
          quickReplies: ['Pay Now', 'Cancel Order'],
          data: { orderId: order.id, total: order.total },
        },
        newState: 'PAYMENT' as BotSessionState,
        newContext,
      };
    }

    return {
      botResponse: {
        text: 'Please provide your contact information to continue.',
        quickReplies: ['Cancel'],
      },
    };
  }

  // PAYMENT state handlers
  private async handlePaymentState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    if (!context.orderId) {
      return {
        botResponse: {
          text: 'No order found. Please start over.',
          quickReplies: ['View Menu'],
        },
        newState: 'GREETING' as BotSessionState,
      };
    }

    // Check payment confirmation
    if (intent === 'confirm_order') {
      const order = await prisma.order.findUnique({
        where: { id: context.orderId },
        include: { payments: true },
      });

      if (!order) {
        return {
          botResponse: {
            text: 'Order not found.',
            quickReplies: ['Start Over'],
          },
          newState: 'GREETING' as BotSessionState,
        };
      }

      // Check if payment actually completed (in real app, verify with payment provider)
      if (order.status === 'PAID' || order.payments.some(p => p.status === 'COMPLETED')) {
        return {
          botResponse: {
            text: `✅ Payment confirmed! Your order #${order.id.slice(0, 8)} is being prepared.\n\nTotal: $${Number(order.total).toFixed(2)}\n\nThank you for your order!`,
            quickReplies: ['Order Status', 'New Order'],
          },
          newState: 'ORDER_PLACED' as BotSessionState,
        };
      } else {
        return {
          botResponse: {
            text: `⚠️ We haven't received your payment yet. Please complete the payment and try again.\n\nOrder #${order.id.slice(0, 8)}\nTotal: $${Number(order.total).toFixed(2)}`,
            quickReplies: ['Pay Now', 'Cancel Order', 'Order Status'],
          },
        };
      }
    }

    // Check payment status
    const order = await prisma.order.findUnique({
      where: { id: context.orderId },
      include: { payments: true },
    });

    if (!order) {
      return {
        botResponse: {
          text: 'Order not found.',
          quickReplies: ['Start Over'],
        },
        newState: 'GREETING' as BotSessionState,
      };
    }

    if (order.status === 'PAID') {
      return {
        botResponse: {
          text: `✅ Payment received! Your order #${order.id.slice(0, 8)} is confirmed.\n\nStatus: ${order.status}`,
          quickReplies: ['Order Status', 'New Order'],
        },
        newState: 'ORDER_PLACED' as BotSessionState,
      };
    }

    return {
      botResponse: {
        text: `Order #${order.id.slice(0, 8)} is awaiting payment.\n\nTotal: $${Number(order.total).toFixed(2)}`,
        quickReplies: ['Pay Now', 'Cancel Order', 'Order Status'],
      },
    };
  }

  // ORDER_PLACED state handlers
  private async handleOrderPlacedState(
    intent: BotIntent,
    message: string,
    context: BotContext
  ): Promise<any> {
    if (intent === 'browse_menu') {
      // Start new order
      const menu = await this.getMenu();
      return {
        botResponse: {
          text: 'Starting a new order! Here\'s our menu.',
          quickReplies: ['My Cart'],
          cards: this.formatMenuCards(menu),
        },
        newState: 'BROWSING_MENU' as BotSessionState,
        newContext: { cartItems: [], state: 'BROWSING_MENU' as BotSessionState },
      };
    }

    if (intent === 'order_status') {
      return await this.handleOrderStatus(context);
    }

    return {
      botResponse: {
        text: 'Your order has been placed! Would you like to start a new order?',
        quickReplies: ['New Order', 'Order Status'],
      },
    };
  }

  // Helper: Add item to cart
  private async handleAddToCart(message: string, context: BotContext): Promise<any> {
    // Try to parse JSON data from button actions first
    let itemId: string | null = null;
    let quantity = 1;
    let itemName: string | null = null;
    
    try {
      const jsonData = JSON.parse(message);
      if (jsonData.itemId) {
        itemId = jsonData.itemId;
        quantity = jsonData.quantity || 1;
      }
    } catch {
      // Not JSON, try parsing as natural language
      const parsed = this.parseAddToCartMessage(message);
      if (!parsed) {
        return {
          botResponse: {
            text: 'Please specify what you\'d like to add. Example: "Add 2 Spring Rolls" or click on menu items.',
            quickReplies: ['View Menu', 'My Cart'],
          },
        };
      }
      itemName = parsed.itemName;
      quantity = parsed.quantity;
    }

    // Find menu item by ID or name
    const menuItem = await prisma.menuItem.findFirst({
      where: itemId 
        ? { id: itemId, restaurantId: this.restaurantId, isAvailable: true }
        : {
            restaurantId: this.restaurantId,
            name: { contains: itemName!, mode: 'insensitive' },
            isAvailable: true,
          },
      include: {
        inventory: true,
        options: {
          where: { isRequired: true },
          include: { values: true },
        },
      },
    });

    if (!menuItem) {
      return {
        botResponse: {
          text: itemId ? 'Sorry, this item is no longer available.' : `Sorry, I couldn't find that item on our menu. Please check the menu.`,
          quickReplies: ['View Menu', 'My Cart'],
        },
      };
    }

    // Check inventory
    if (menuItem.inventory && menuItem.inventory.quantity < quantity) {
      return {
        botResponse: {
          text: `Sorry, we only have ${menuItem.inventory.quantity} ${menuItem.name} available.`,
          quickReplies: ['View Menu', 'My Cart'],
        },
      };
    }

    // Check for required options
    if (menuItem.options.length > 0) {
      return {
        botResponse: {
          text: `${menuItem.name} has required options. Please select from our menu or specify your choices.`,
          quickReplies: ['View Menu', 'My Cart'],
        },
      };
    }

    // Add to cart
    const newContext = { ...context };
    const existingItem = newContext.cartItems.find((item) => item.menuItemId === menuItem.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      newContext.cartItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: quantity,
        unitPrice: Number(menuItem.price),
      });
    }

    return {
      botResponse: {
        text: `✅ Added ${quantity}x ${menuItem.name} to your cart!`,
        quickReplies: ['View Cart', 'Add More', 'Checkout'],
      },
      newState: 'BUILDING_CART' as BotSessionState,
      newContext,
    };
  }

  // Helper: Remove item from cart
  private handleRemoveItem(message: string, context: BotContext): any {
    const itemName = message.toLowerCase().replace(/remove|delete/gi, '').trim();

    const newContext = { ...context };
    const itemIndex = newContext.cartItems.findIndex((item) =>
      item.menuItemName.toLowerCase().includes(itemName)
    );

    if (itemIndex === -1) {
      return {
        botResponse: {
          text: `Item not found in cart. Current items: ${newContext.cartItems.map((i) => i.menuItemName).join(', ')}`,
          quickReplies: ['View Cart'],
        },
      };
    }

    const removed = newContext.cartItems.splice(itemIndex, 1)[0];

    return {
      botResponse: {
        text: `Removed ${removed.menuItemName} from cart.`,
        quickReplies: newContext.cartItems.length > 0 ? ['View Cart', 'Checkout'] : ['View Menu'],
      },
      newState: newContext.cartItems.length > 0 ? 'BUILDING_CART' as BotSessionState : 'BROWSING_MENU' as BotSessionState,
      newContext,
    };
  }

  // Helper: Handle order status
  private async handleOrderStatus(context: BotContext): Promise<any> {
    if (!context.orderId) {
      return {
        botResponse: {
          text: 'You don\'t have any active orders.',
          quickReplies: ['View Menu'],
        },
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: context.orderId },
      include: { items: true },
    });

    if (!order) {
      return {
        botResponse: {
          text: 'Order not found.',
          quickReplies: ['View Menu'],
        },
      };
    }

    const statusEmoji = order.status === 'PAID' ? '✅' : order.status === 'CANCELLED' ? '❌' : '⏳';
    
    return {
      botResponse: {
        text: `${statusEmoji} Order #${order.id.slice(0, 8)}\nStatus: ${order.status}\nTotal: $${Number(order.total).toFixed(2)}\nItems: ${order.items.length}`,
        quickReplies: order.status === 'PAYMENT_PENDING' ? ['Pay Now', 'Cancel Order', 'View Menu'] : ['New Order', 'View Menu'],
      },
    };
  }

  // Helper: Handle payment
  private async handlePayment(context: BotContext): Promise<any> {
    if (!context.orderId) {
      return {
        botResponse: {
          text: 'No order found to pay for.',
          quickReplies: ['View Menu'],
        },
        newState: 'GREETING' as BotSessionState,
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: context.orderId },
    });

    if (!order) {
      return {
        botResponse: {
          text: 'Order not found.',
          quickReplies: ['View Menu'],
        },
        newState: 'GREETING' as BotSessionState,
      };
    }

    if (order.status === 'PAID') {
      return {
        botResponse: {
          text: `✅ This order has already been paid!`,
          quickReplies: ['Order Status', 'New Order'],
        },
        newState: 'ORDER_PLACED' as BotSessionState,
      };
    }

    // Generate payment link (placeholder - you'll integrate with Stripe/PayPal later)
    const paymentLink = `${process.env.APP_URL || 'http://localhost:3000'}/payment/${order.id}`;
    
    return {
      botResponse: {
        text: `💳 Ready to pay $${Number(order.total).toFixed(2)}?\n\nClick the link below to complete your payment securely:\n${paymentLink}\n\nAfter payment, return here to confirm!`,
        quickReplies: ['I\'ve Paid', 'Cancel Order', 'Order Status'],
        data: { paymentLink, orderId: order.id, amount: order.total },
      },
      newState: 'PAYMENT' as BotSessionState,
    };
  }

  // Helper: Handle cancel order
  private async handleCancelOrder(context: BotContext): Promise<any> {
    if (!context.orderId) {
      return {
        botResponse: {
          text: 'No active order to cancel.',
          quickReplies: ['View Menu'],
        },
      };
    }

    try {
      // Call orders API to cancel (uses state machine)
      const order = await prisma.order.findUnique({
        where: { id: context.orderId },
      });

      if (!order) {
        return {
          botResponse: {
            text: 'Order not found.',
            quickReplies: ['View Menu'],
          },
        };
      }

      // Import state machine to check if cancellable
      const { canCustomerCancel } = await import('../orders/stateMachine');

      if (!canCustomerCancel(order.status)) {
        return {
          botResponse: {
            text: `Cannot cancel order in ${order.status} status. Please contact support.`,
            quickReplies: ['Order Status', 'New Order'],
          },
        };
      }

      await prisma.order.update({
        where: { id: context.orderId },
        data: { status: 'CANCELLED' },
      });

      return {
        botResponse: {
          text: '✅ Order cancelled successfully.',
          quickReplies: ['New Order'],
        },
        newState: 'GREETING' as BotSessionState,
        newContext: { cartItems: [], state: 'GREETING' as BotSessionState },
      };
    } catch (error) {
      return {
        botResponse: {
          text: 'Error cancelling order. Please try again.',
          quickReplies: ['Order Status'],
        },
      };
    }
  }

  // Helper: Create order
  private async createOrder(context: BotContext) {
    if (context.cartItems.length === 0) {
      return null;
    }

    const subtotal = context.cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        restaurantId: this.restaurantId,
        customerName: context.customerInfo?.name || 'Guest',
        customerEmail: context.customerInfo?.email,
        customerPhone: context.customerInfo?.phone,
        status: 'CREATED',
        subtotal,
        tax,
        total,
        items: {
          create: context.cartItems.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            selectedOptions: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
          })),
        },
      },
    });

    // Decrement inventory
    for (const item of context.cartItems) {
      await prisma.inventory.updateMany({
        where: { menuItemId: item.menuItemId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return order;
  }

  // Helper: Get menu
  private async getMenu() {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: this.restaurantId, isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true },
          include: { inventory: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return categories;
  }

  // Helper: Get menu categories only
  private async getMenuCategories() {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: this.restaurantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return categories;
  }

  // Helper: Get menu items by category
  private async getMenuByCategory(categoryId: string) {
    const items = await prisma.menuItem.findMany({
      where: { 
        categoryId: categoryId,
        isAvailable: true 
      },
      include: { inventory: true },
      orderBy: { displayOrder: 'asc' },
    });

    return items;
  }

  // Helper: Format menu as cards
  private formatMenuCards(menu: any[]): any[] {
    const cards: any[] = [];

    for (const category of menu) {
      for (const item of category.menuItems) {
        const isSoldOut = item.inventory && item.inventory.quantity === 0;
        
        cards.push({
          id: item.id,
          title: item.name,
          description: item.description || undefined,
          imageUrl: item.imageUrl || undefined,
          price: Number(item.price),
          actions: isSoldOut
            ? []
            : [
                { label: 'Add 1', intent: 'add_to_cart', data: { itemId: item.id, quantity: 1 } },
                { label: 'Add 2', intent: 'add_to_cart', data: { itemId: item.id, quantity: 2 } },
              ],
        });
      }
    }

    return cards.slice(0, 10); // Limit to 10 cards
  }

  // Helper: Format cart response
  private formatCartResponse(context: BotContext): BotResponse {
    if (context.cartItems.length === 0) {
      return {
        text: 'Your cart is empty.',
        quickReplies: ['View Menu'],
      };
    }

    const subtotal = context.cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const itemsList = context.cartItems
      .map((item) => `• ${item.quantity}x ${item.menuItemName} - $${(item.unitPrice * item.quantity).toFixed(2)}`)
      .join('\n');

    return {
      text: `🛒 Your Cart:\n\n${itemsList}\n\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)}`,
      quickReplies: ['Checkout', 'Add More', 'Remove Item'],
      data: { cartItems: context.cartItems, total },
    };
  }

  // Helper: Parse "add to cart" message
  private parseAddToCartMessage(message: string): { itemName: string; quantity: number } | null {
    // Pattern: "add 2 spring rolls" or "2x spring rolls" or "spring rolls"
    const match = message.match(/(?:add\s+)?(\d+)?\s*(?:x\s+)?(.+)/i);

    if (!match) {
      return null;
    }

    const quantity = match[1] ? parseInt(match[1], 10) : 1;
    const itemName = match[2].trim();

    return { itemName, quantity };
  }

  // Helper: Parse contact info
  private parseContactInfo(message: string): { name?: string; phone?: string; email?: string } {
    const parts = message.split(',').map((p) => p.trim());

    const info: any = {};

    for (const part of parts) {
      if (part.includes('@')) {
        info.email = part;
      } else if (/\d{3}[-\s]?\d{3}[-\s]?\d{4}/.test(part)) {
        // Extract and normalize phone number
        const phoneMatch = part.match(/(\d{3})[-\s]?(\d{3})[-\s]?(\d{4})/);
        if (phoneMatch) {
          info.phone = phoneMatch[1] + phoneMatch[2] + phoneMatch[3];
        }
      } else if (!info.name && part.length > 2) {
        info.name = part;
      }
    }

    console.log('Parsed contact info:', info, 'from message:', message);

    return info;
  }
}
