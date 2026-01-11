import { Prisma } from '@prisma/client';

/**
 * Bot DTOs and Types
 */

// ========================================
// Bot States (FSM)
// ========================================

export type BotState =
  | 'GREETING'
  | 'BROWSE_MENU'
  | 'ITEM_DETAILS'
  | 'CART'
  | 'CUSTOMER_INFO'
  | 'CONFIRM'
  | 'PAYMENT'
  | 'STATUS'
  | 'CANCEL'
  | 'HELP';

// ========================================
// Request DTOs
// ========================================

export interface SendMessageDTO {
  sessionId: string;
  message: string;
  channel?: 'WEB' | 'SMS' | 'WHATSAPP';
}

// ========================================
// Response DTOs
// ========================================

export interface QuickReply {
  label: string;
  value: string;
  type?: 'text' | 'postback';
}

export interface Card {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: QuickReply[];
}

export interface BotReply {
  text: string;
  quickReplies?: QuickReply[];
  cards?: Card[];
}

export interface BotResponse {
  reply: BotReply;
  sessionState: BotSessionDTO;
}

export interface BotSessionDTO {
  sessionId: string;
  state: BotState;
  cart: CartItem[];
  context: Record<string, any>;
  lastMessageAt: Date;
}

// ========================================
// Internal Types
// ========================================

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: {
    optionId: string;
    optionName: string;
    valueIds: string[];
    valueNames: string[];
  }[];
}

export interface BotContext {
  currentItemId?: string;
  currentCategoryId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  paymentId?: string;
  checkoutUrl?: string;
  lastIntent?: string;
  errorCount?: number;
  [key: string]: any;
}

export interface BotSession {
  sessionId: string;
  restaurantId: string;
  state: BotState;
  cart: CartItem[];
  context: BotContext;
  updatedAt: Date;
}

// ========================================
// Intent Detection
// ========================================

export type Intent =
  | 'GREETING'
  | 'BROWSE_MENU'
  | 'VIEW_ITEM'
  | 'ADD_TO_CART'
  | 'VIEW_CART'
  | 'REMOVE_FROM_CART'
  | 'CHECKOUT'
  | 'PROVIDE_INFO'
  | 'CONFIRM_ORDER'
  | 'MAKE_PAYMENT'
  | 'CHECK_STATUS'
  | 'CANCEL_ORDER'
  | 'HELP'
  | 'GO_BACK'
  | 'UNKNOWN';

export interface DetectedIntent {
  intent: Intent;
  entities: Record<string, any>;
  confidence: number;
}

// ========================================
// State Transition
// ========================================

export interface StateTransition {
  nextState: BotState;
  action?: string;
  updateContext?: Partial<BotContext>;
}
