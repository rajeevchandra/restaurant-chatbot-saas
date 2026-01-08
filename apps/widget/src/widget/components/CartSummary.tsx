import { useState } from 'react'

interface CartItem {
  id?: string
  menuItemId?: string
  menuItemName: string
  quantity: number
  unitPrice: number
  selectedOptions?: Record<string, string[]>
}

interface CartSummaryProps {
  items: CartItem[]
  onUpdateQuantity: (index: number, newQuantity: number) => void
  onRemoveItem: (index: number) => void
  onClearCart: () => void
  onCheckout: () => void
  isProcessing?: boolean
}

export default function CartSummary({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onCheckout,
  isProcessing = false
}: CartSummaryProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const taxRate = 0.08 // 8% tax
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const toggleItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const handleQuantityChange = (index: number, delta: number) => {
    const newQuantity = items[index].quantity + delta
    if (newQuantity > 0) {
      onUpdateQuantity(index, newQuantity)
    }
  }

  const handleClearCart = () => {
    onClearCart()
    setShowClearConfirm(false)
  }

  if (items.length === 0) return null

  return (
    <div className="cart-summary-card">
      <div className="cart-summary-header">
        <h4 className="cart-summary-title">Your Cart ({items.length})</h4>
        <button 
          className="cart-clear-btn" 
          onClick={() => setShowClearConfirm(true)}
          disabled={isProcessing}
          aria-label="Clear cart"
        >
          🗑️
        </button>
      </div>

      <div className="cart-items-list">
        {items.map((item, index) => {
          const isExpanded = expandedItems.has(index)
          const hasOptions = item.selectedOptions && Object.keys(item.selectedOptions).length > 0

          return (
            <div key={index} className="cart-item-card">
              <div className="cart-item-main">
                <div className="cart-item-info">
                  <div 
                    className="cart-item-name"
                    onClick={() => hasOptions && toggleItemExpanded(index)}
                    style={{ cursor: hasOptions ? 'pointer' : 'default' }}
                  >
                    {item.menuItemName}
                    {hasOptions && (
                      <span className="cart-item-options-indicator">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                  <div className="cart-item-price">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>

                <div className="cart-item-actions">
                  <div className="cart-item-quantity">
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(index, -1)}
                      disabled={isProcessing}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(index, 1)}
                      disabled={isProcessing}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => onRemoveItem(index)}
                    disabled={isProcessing}
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isExpanded && hasOptions && (
                <div className="cart-item-options">
                  {Object.entries(item.selectedOptions!).map(([optionName, choices]) => (
                    <div key={optionName} className="cart-item-option">
                      <span className="option-name">{optionName}:</span>
                      <span className="option-value">{choices.join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="cart-summary-totals">
        <div className="cart-summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="cart-summary-row">
          <span>Tax (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="cart-summary-row cart-summary-total">
          <span>Total</span>
          <span className="total-amount">${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        className="cart-checkout-btn"
        onClick={onCheckout}
        disabled={isProcessing || items.length === 0}
      >
        {isProcessing ? (
          <>
            <span className="spinner-small"></span>
            Processing...
          </>
        ) : (
          <>
            🛒 Checkout
          </>
        )}
      </button>

      {showClearConfirm && (
        <div className="cart-clear-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="cart-clear-dialog" onClick={(e) => e.stopPropagation()}>
            <h4>Clear Cart?</h4>
            <p>Are you sure you want to remove all items from your cart?</p>
            <div className="cart-clear-actions">
              <button
                className="cart-clear-cancel"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="cart-clear-confirm"
                onClick={handleClearCart}
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
