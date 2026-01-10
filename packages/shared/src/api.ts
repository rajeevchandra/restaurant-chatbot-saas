import type { ApiResponse, PaginatedResponse } from './types';

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // For refresh token cookie
      });

      const data = await response.json() as any;

      if (!response.ok) {
        // Global 401 handler: redirect to login if unauthorized
        if (response.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ============ AUTH ============

  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken() {
    return this.request<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
    });
  }

  // ============ MENU ============

  async getMenu(restaurantSlug: string) {
    return this.request(`/api/public/restaurants/${restaurantSlug}/menu`, {
      method: 'GET',
    });
  }

  async getMenuItems() {
    return this.request('/api/v1/admin/menu/items', {
      method: 'GET',
    });
  }

  async createMenuItem(data: any) {
    return this.request('/api/v1/admin/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenuItem(id: string, data: any) {
    return this.request(`/api/v1/admin/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMenuItem(id: string) {
    return this.request(`/api/v1/admin/menu/items/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ ORDERS ============

  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<any>>(`/api/v1/admin/orders?${query}`, {
      method: 'GET',
    });
  }

  async getOrder(id: string) {
    return this.request(`/api/v1/admin/orders/${id}`, {
      method: 'GET',
    });
  }

  async getPublicOrder(restaurantSlug: string, orderId: string) {
    return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders/${orderId}`, {
      method: 'GET',
    });
  }

  async createOrder(data: any) {
    return this.request('/api/v1/admin/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPublicOrder(restaurantSlug: string, data: any) {
    return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/api/v1/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async cancelOrder(id: string) {
    return this.request(`/api/v1/admin/orders/${id}/cancel`, {
      method: 'POST',
    });
  }

  async cancelPublicOrder(restaurantSlug: string, orderId: string, reason?: string) {
    return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  }

  // ============ BOT ============

  async sendBotMessage(restaurantSlug: string, sessionId: string, message: string) {
    return this.request(`/api/public/restaurants/${restaurantSlug}/bot/message`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    });
  }

  // ============ PAYMENTS ============

  async createPaymentIntent(orderId: string, returnUrl?: string) {
    return this.request('/api/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ orderId, returnUrl }),
    });
  }

  async getPaymentConfig() {
    return this.request('/api/v1/admin/payments/config', {
      method: 'GET',
    });
  }

  async updatePaymentConfig(data: any) {
    return this.request('/api/v1/admin/payments/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ INVENTORY ============

  async getInventory() {
    return this.request('/api/inventory', {
      method: 'GET',
    });
  }

  async updateInventory(menuItemId: string, data: any) {
    return this.request(`/api/inventory/${menuItemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
