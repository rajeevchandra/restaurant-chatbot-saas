export interface PaymentConfigDTO {
  id: string;
  provider: PaymentProvider;
  isActive: boolean;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  connectionStatus?: 'connected' | 'error' | 'not_tested';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
// ============ ORDER DTOs (shared) ============

export interface SelectedOption {
  optionId: string;
  valueIds: string[]; // Array of selected value IDs
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: SelectedOption[];
}

export interface OrderDTO {
  id: string;
  restaurantId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: OrderItemDTO[];
  checkoutUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSummaryDTO {
  id: string;
  customerName?: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedOrders {
  items: OrderSummaryDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type OrderWithItems = Order & {
  items: OrderItem[];
};
// ============ ENUMS ============

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export enum OrderStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  SQUARE = 'SQUARE'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum BotSessionState {
  GREETING = 'GREETING',
  BROWSING_MENU = 'BROWSING_MENU',
  BUILDING_CART = 'BUILDING_CART',
  CHECKOUT = 'CHECKOUT',
  PAYMENT = 'PAYMENT',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_STATUS = 'ORDER_STATUS'
}

// ============ ENTITIES ============

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantUser {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemOption {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemOptionValue {
  id: string;
  optionId: string;
  value: string;
  priceModifier: number;
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  restaurantId: string;
  menuItemId: string;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

export interface Order {
  id: string;
  restaurantId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: string; // JSON string
  createdAt: Date;
}

export interface Payment {
  id: string;
  restaurantId: string;
  orderId: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantPaymentConfig {
  id: string;
  restaurantId: string;
  provider: PaymentProvider;
  isActive: boolean;
  publicKey?: string;
  encryptedSecretKey: string;
  webhookSecret?: string;
  metadata?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface BotSession {
  id: string;
  restaurantId: string;
  sessionId: string;
  state: BotSessionState;
  context?: string; // JSON string
  cartItems?: string; // JSON string
  orderId?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ DTOs ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    restaurantId: string;
  };
}

export interface CreateMenuItemRequest {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface UpdateMenuItemRequest {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface CreateOrderRequest {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: {
    menuItemId: string;
    quantity: number;
    selectedOptions?: Record<string, string[]>;
  }[];
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface BotMessageRequest {
  sessionId: string;
  message: string;
}

export interface BotMessageResponse {
  sessionId: string;
  message: string;
  quickReplies?: string[];
  data?: any;
}

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: Record<string, string[]>;
}

export interface PaymentIntentRequest {
  orderId: string;
  returnUrl?: string;
}

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret?: string;
  checkoutUrl?: string;
}

// ============ API RESPONSE WRAPPERS ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
