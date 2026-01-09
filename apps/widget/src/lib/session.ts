const SESSION_KEY = 'restaurant_chat_session_id'
const RESTAURANT_KEY = 'restaurant_chat_restaurant_slug'

export function getSessionId(restaurantSlug?: string): string {
  // Check if restaurant changed
  if (restaurantSlug) {
    const lastRestaurant = localStorage.getItem(RESTAURANT_KEY)
    if (lastRestaurant && lastRestaurant !== restaurantSlug) {
      // Restaurant changed, clear old session
      clearSession()
    }
    localStorage.setItem(RESTAURANT_KEY, restaurantSlug)
  }

  let sessionId = localStorage.getItem(SESSION_KEY)
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  
  return sessionId
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function clearRestaurantData(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(RESTAURANT_KEY)
}
