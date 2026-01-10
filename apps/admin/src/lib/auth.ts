import { ApiClient } from '@restaurant-saas/shared'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export function getApiClient() {
  // Always use the latest token from the cookie
  const token = Cookies.get('accessToken');
  return new ApiClient(API_URL, token);
}

export async function login(email: string, password: string) {
  const client = new ApiClient(API_URL)
  const response = await client.login(email, password)
  
  if (response.success && response.data) {
    Cookies.set('accessToken', response.data.accessToken, { expires: 7, path: '/' })
    Cookies.set('user', JSON.stringify(response.data.user), { expires: 7, path: '/' })
    return response.data
  } else {
    throw new Error(response.error || 'Login failed')
  }
}

export function logout() {
  // Remove cookies with explicit path to ensure they're actually deleted
  Cookies.remove('accessToken', { path: '/' })
  Cookies.remove('user', { path: '/' })
  // No need to clear apiClient, always use latest token now
  // Force a hard reload to clear any cached state
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export function getUser() {
  const userStr = Cookies.get('user')
  return userStr ? JSON.parse(userStr) : null
}

export function isAuthenticated() {
  return !!Cookies.get('accessToken')
}
