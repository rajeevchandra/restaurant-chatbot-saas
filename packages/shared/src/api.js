"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
class ApiClient {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    setToken(token) {
        this.token = token;
    }
    clearToken() {
        this.token = undefined;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
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
            const data = await response.json();
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }
    // ============ AUTH ============
    async login(email, password) {
        return this.request('/api/auth/login', {
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
        return this.request('/api/auth/refresh', {
            method: 'POST',
        });
    }
    // ============ MENU ============
    async getMenu(restaurantSlug) {
        return this.request(`/api/public/restaurants/${restaurantSlug}/menu`, {
            method: 'GET',
        });
    }
    async getMenuItems() {
        return this.request('/api/v1/admin/menu/items', {
            method: 'GET',
        });
    }
    async createMenuItem(data) {
        return this.request('/api/v1/admin/menu/items', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateMenuItem(id, data) {
        return this.request(`/api/v1/admin/menu/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    async deleteMenuItem(id) {
        return this.request(`/api/v1/admin/menu/items/${id}`, {
            method: 'DELETE',
        });
    }
    // ============ ORDERS ============
    async getOrders(params) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/v1/admin/orders?${query}`, {
            method: 'GET',
        });
    }
    async getOrder(id) {
        return this.request(`/api/v1/admin/orders/${id}`, {
            method: 'GET',
        });
    }
    async getPublicOrder(restaurantSlug, orderId) {
        return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders/${orderId}`, {
            method: 'GET',
        });
    }
    async createOrder(data) {
        return this.request('/api/v1/admin/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async createPublicOrder(restaurantSlug, data) {
        return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateOrderStatus(id, status) {
        return this.request(`/api/v1/admin/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }
    async cancelOrder(id) {
        return this.request(`/api/v1/admin/orders/${id}/cancel`, {
            method: 'POST',
        });
    }
    async cancelPublicOrder(restaurantSlug, orderId, reason) {
        return this.request(`/api/v1/public/restaurants/${restaurantSlug}/orders/${orderId}/cancel`, {
            method: 'POST',
            body: reason ? JSON.stringify({ reason }) : undefined,
        });
    }
    // ============ BOT ============
    async sendBotMessage(restaurantSlug, sessionId, message) {
        return this.request(`/api/public/restaurants/${restaurantSlug}/bot/message`, {
            method: 'POST',
            body: JSON.stringify({ sessionId, message }),
        });
    }
    // ============ PAYMENTS ============
    async createPaymentIntent(orderId, returnUrl) {
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
    async updatePaymentConfig(data) {
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
    async updateInventory(menuItemId, data) {
        return this.request(`/api/inventory/${menuItemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
}
exports.ApiClient = ApiClient;
