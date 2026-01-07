import { ApiClient } from '@restaurant-saas/shared'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

let apiClient: ApiClient | null = null

export function getApiClient() {
  if (!apiClient) {
    const token = Cookies.get('accessToken')
    apiClient = new ApiClient(API_URL, token)
  }
  return apiClient
}

export async function login(email: string, password: string) {
  const client = new ApiClient(API_URL)
  const response = await client.login(email, password)
  
  if (response.success && response.data) {
    Cookies.set('accessToken', response.data.accessToken, { expires: 7 })
    Cookies.set('user', JSON.stringify(response.data.user), { expires: 7 })
    apiClient = new ApiClient(API_URL, response.data.accessToken)
    return response.data
  } else {
    throw new Error(response.error || 'Login failed')
  }
}

export function logout() {
  Cookies.remove('accessToken')
  Cookies.remove('user')
  apiClient = null
}

export function getUser() {
  const userStr = Cookies.get('user')
  return userStr ? JSON.parse(userStr) : null
}

export function isAuthenticated() {
  return !!Cookies.get('accessToken')
}
