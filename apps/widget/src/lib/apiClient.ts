import { ApiClient } from '@restaurant-saas/shared'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = new ApiClient(API_URL)
