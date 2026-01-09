import { useState } from 'react'

interface CartItem {
  id?: string
  menuItemId?: string
  menuItemName: string
  quantity: number
  unitPrice: number
  selectedOptions?: Record<string, string[]>
  imageUrl?: string
}

interface CartSummaryProps {
  items: CartItem[]
  onUpdateQuantity: (index: number, newQuantity: number) => void
  onRemoveItem: (index: number) => void
  onClearCart: () => void
  onCheckout: () => void
  isProcessing?: boolean
}

// Helper function to get food icon based on item name
function getFoodIcon(itemName: string): string {
  const name = itemName.toLowerCase()
  
  // Bread & Bakery
  if (name.includes('bread') || name.includes('toast') || name.includes('baguette')) return '🥖'
  if (name.includes('croissant')) return '🥐'
  if (name.includes('bagel')) return '🥯'
  if (name.includes('pretzel')) return '🥨'
  
  // Pizza & Italian
  if (name.includes('pizza')) return '🍕'
  if (name.includes('pasta') || name.includes('spaghetti') || name.includes('linguine')) return '🍝'
  if (name.includes('lasagna')) return '🍝'
  
  // Burgers & Sandwiches
  if (name.includes('burger') || name.includes('cheeseburger')) return '🍔'
  if (name.includes('sandwich') || name.includes('sub')) return '🥪'
  if (name.includes('hot dog') || name.includes('hotdog')) return '🌭'
  if (name.includes('taco')) return '🌮'
  if (name.includes('burrito') || name.includes('wrap')) return '🌯'
  
  // Mexican & Tex-Mex
  if (name.includes('nachos')) return '🧀'
  if (name.includes('quesadilla')) return '🧀'
  if (name.includes('fajita')) return '🌮'
  
  // Asian
  if (name.includes('sushi') || name.includes('roll') && name.includes('california')) return '🍣'
  if (name.includes('ramen') || name.includes('noodle')) return '🍜'
  if (name.includes('rice bowl') || name.includes('fried rice')) return '🍚'
  if (name.includes('dumpling') || name.includes('gyoza')) return '🥟'
  if (name.includes('bento')) return '🍱'
  if (name.includes('curry')) return '🍛'
  if (name.includes('tempura')) return '🍤'
  
  // Meat & Protein
  if (name.includes('steak') || name.includes('beef')) return '🥩'
  if (name.includes('chicken') || name.includes('wings') || name.includes('drumstick')) return '🍗'
  if (name.includes('bacon')) return '🥓'
  if (name.includes('ham')) return '🍖'
  if (name.includes('ribs')) return '🍖'
  
  // Seafood
  if (name.includes('shrimp') || name.includes('prawn')) return '🍤'
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return '🐟'
  if (name.includes('lobster')) return '🦞'
  if (name.includes('crab')) return '🦀'
  if (name.includes('oyster') || name.includes('clam')) return '🦪'
  
  // Breakfast
  if (name.includes('egg') || name.includes('omelette') || name.includes('omelet')) return '🍳'
  if (name.includes('pancake')) return '🥞'
  if (name.includes('waffle')) return '🧇'
  if (name.includes('bacon')) return '🥓'
  
  // Sides
  if (name.includes('fries') || name.includes('french fries')) return '🍟'
  if (name.includes('potato') && name.includes('baked')) return '🥔'
  if (name.includes('salad') || name.includes('greens')) return '🥗'
  if (name.includes('soup')) return '🍲'
  if (name.includes('popcorn')) return '🍿'
  
  // Desserts
  if (name.includes('cake') || name.includes('birthday')) return '🍰'
  if (name.includes('pie')) return '🥧'
  if (name.includes('cookie')) return '🍪'
  if (name.includes('donut') || name.includes('doughnut')) return '🍩'
  if (name.includes('ice cream') || name.includes('gelato')) return '🍨'
  if (name.includes('sundae')) return '🍨'
  if (name.includes('cupcake')) return '🧁'
  if (name.includes('chocolate')) return '🍫'
  if (name.includes('candy')) return '🍬'
  if (name.includes('lollipop')) return '🍭'
  if (name.includes('pudding') || name.includes('custard')) return '🍮'
  
  // Beverages
  if (name.includes('coffee') || name.includes('espresso') || name.includes('latte')) return '☕'
  if (name.includes('tea')) return '🍵'
  if (name.includes('juice') || name.includes('orange juice')) return '🧃'
  if (name.includes('smoothie')) return '🥤'
  if (name.includes('soda') || name.includes('cola') || name.includes('pop')) return '🥤'
  if (name.includes('beer')) return '🍺'
  if (name.includes('wine')) return '🍷'
  if (name.includes('cocktail') || name.includes('martini')) return '🍸'
  if (name.includes('milk') || name.includes('shake')) return '🥛'
  if (name.includes('water') || name.includes('bottle')) return '💧'
  
  // Fruits
  if (name.includes('apple')) return '🍎'
  if (name.includes('banana')) return '🍌'
  if (name.includes('strawberry')) return '🍓'
  if (name.includes('watermelon')) return '🍉'
  if (name.includes('grape')) return '🍇'
  if (name.includes('orange')) return '🍊'
  if (name.includes('lemon')) return '🍋'
  if (name.includes('peach')) return '🍑'
  if (name.includes('mango')) return '🥭'
  if (name.includes('pineapple')) return '🍍'
  
  // Vegetables & Vegetarian
  if (name.includes('mushroom')) return '🍄'
  if (name.includes('avocado')) return '🥑'
  if (name.includes('corn')) return '🌽'
  if (name.includes('carrot')) return '🥕'
  if (name.includes('broccoli')) return '🥦'
  if (name.includes('tomato')) return '🍅'
  if (name.includes('eggplant')) return '🍆'
  if (name.includes('cucumber')) return '🥒'
  if (name.includes('pepper') || name.includes('bell pepper')) return '🫑'
  
  // Cheese & Dairy
  if (name.includes('cheese') && !name.includes('burger') && !name.includes('cake')) return '🧀'
  
  // Default for generic items
  return '🍽️'
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
            <div key={index} className="cart-item-wrapper">
              <div className="cart-item-card">
                <div className="cart-item-image-wrapper">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.menuItemName} 
                      className="cart-item-image" 
                    />
                  ) : (
                    <div className="cart-item-image-placeholder">
                      <span className="placeholder-icon">{getFoodIcon(item.menuItemName)}</span>
                    </div>
                  )}
                </div>
                <div className="cart-item-content">
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

                    <button
                      className="cart-item-remove"
                      onClick={() => onRemoveItem(index)}
                      disabled={isProcessing}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
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
              </div>
              
              <div className="cart-item-quantity-control">
                <button
                  className="quantity-control-btn"
                  onClick={() => handleQuantityChange(index, -1)}
                  disabled={isProcessing}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="quantity-control-value">{item.quantity}</span>
                <button
                  className="quantity-control-btn"
                  onClick={() => handleQuantityChange(index, 1)}
                  disabled={isProcessing}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
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
