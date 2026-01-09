const CART_KEY_PREFIX = 'restaurant_cart_'

export interface CartItem {
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  selectedOptions?: any
}

export function getCart(restaurantSlug: string): CartItem[] {
  try {
    const key = `${CART_KEY_PREFIX}${restaurantSlug}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading cart:', error)
    return []
  }
}

export function saveCart(restaurantSlug: string, cart: CartItem[]): void {
  try {
    const key = `${CART_KEY_PREFIX}${restaurantSlug}`
    localStorage.setItem(key, JSON.stringify(cart))
  } catch (error) {
    console.error('Error saving cart:', error)
  }
}

export function clearCart(restaurantSlug: string): void {
  try {
    const key = `${CART_KEY_PREFIX}${restaurantSlug}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error clearing cart:', error)
  }
}
