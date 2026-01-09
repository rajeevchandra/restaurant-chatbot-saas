import { useState } from 'react'
import QuantityControl from './QuantityControl'

interface MenuItemOption {
  id: string
  name: string
  type: 'single' | 'multi'
  required: boolean
  choices: {
    id: string
    name: string
    price: number
  }[]
  maxSelections?: number
}

interface MenuItemCardProps {
  item: {
    id: string
    title: string
    description?: string
    imageUrl?: string
    price?: number
    soldOut?: boolean
    options?: MenuItemOption[]
    actions?: Array<{
      label: string
      intent: string
      data?: any
    }>
  }
  currentQuantity?: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}

export default function MenuItemCard({ 
  item, 
  currentQuantity = 0,
  onAdd,
  onIncrement,
  onDecrement 
}: MenuItemCardProps) {
  const [showCustomizer, setShowCustomizer] = useState(false)

  const handleAddClick = () => {
    if (item.soldOut) return
    
    if (item.options && item.options.length > 0) {
      setShowCustomizer(true)
    } else {
      onAdd()
    }
  }

  const handleCustomizationComplete = (_customization: any) => {
    setShowCustomizer(false)
    onAdd() // Call onAdd after customization
  }

  return (
    <>
      <div className={`menu-card ${item.soldOut ? 'sold-out' : ''}`}>
        {/* Image or gradient placeholder */}
        <div className="menu-card-image-wrapper">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="menu-card-image" />
          ) : (
            <div className="menu-card-image-placeholder">
              <span className="placeholder-icon">🍽️</span>
            </div>
          )}
          {item.soldOut && (
            <div className="sold-out-badge">Sold Out</div>
          )}
        </div>

        <div className="menu-card-content">
          <div className="menu-card-header">
            <h4 className="menu-card-title">{item.title}</h4>
          </div>
          
          {item.description && (
            <p className="menu-card-description">{item.description}</p>
          )}

          {item.price !== undefined && (
            <div className="menu-card-price">${item.price.toFixed(2)}</div>
          )}

          <QuantityControl
            quantity={currentQuantity}
            onAdd={handleAddClick}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            soldOut={item.soldOut}
          />
        </div>
      </div>

      {showCustomizer && (
        <ItemCustomizer
          item={item}
          onComplete={handleCustomizationComplete}
          onCancel={() => setShowCustomizer(false)}
        />
      )}
    </>
  )
}

// Item Customizer Modal Component
interface ItemCustomizerProps {
  item: MenuItemCardProps['item']
  onComplete: (customization: any) => void
  onCancel: () => void
}

function ItemCustomizer({ item, onComplete, onCancel }: ItemCustomizerProps) {
  const [quantity, setQuantity] = useState(1)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleOptionChange = (optionId: string, choiceId: string, type: 'single' | 'multi', maxSelections?: number) => {
    setSelections(prev => {
      const current = prev[optionId] || []
      
      if (type === 'single') {
        return { ...prev, [optionId]: [choiceId] }
      } else {
        // Multi-select
        if (current.includes(choiceId)) {
          return { ...prev, [optionId]: current.filter(id => id !== choiceId) }
        } else {
          if (maxSelections && current.length >= maxSelections) {
            return prev // Don't add if max reached
          }
          return { ...prev, [optionId]: [...current, choiceId] }
        }
      }
    })
    
    // Clear error for this option
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[optionId]
      return newErrors
    })
  }

  const calculateTotalPrice = (): number => {
    let total = (item.price || 0) * quantity
    
    item.options?.forEach(option => {
      const selected = selections[option.id] || []
      selected.forEach(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId)
        if (choice) {
          total += choice.price * quantity
        }
      })
    })
    
    return total
  }

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {}
    
    item.options?.forEach(option => {
      if (option.required) {
        const selected = selections[option.id] || []
        if (selected.length === 0) {
          newErrors[option.id] = `Please select ${option.name}`
        }
      }
    })
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    onComplete({
      itemId: item.id,
      quantity,
      options: selections,
      totalPrice: calculateTotalPrice()
    })
  }

  return (
    <div className="customizer-overlay" onClick={onCancel}>
      <div className="customizer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="customizer-header">
          <h3>{item.title}</h3>
          <button className="customizer-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="customizer-content">
          {/* Quantity Selector */}
          <div className="customizer-section">
            <label className="customizer-label">Quantity</label>
            <div className="quantity-stepper">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="quantity-btn"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="quantity-value">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(99, quantity + 1))}
                className="quantity-btn"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Options */}
          {item.options?.map(option => (
            <div key={option.id} className="customizer-section">
              <label className="customizer-label">
                {option.name}
                {option.required && <span className="required"> *</span>}
                {option.type === 'multi' && option.maxSelections && (
                  <span className="option-hint"> (Max {option.maxSelections})</span>
                )}
              </label>
              
              <div className="option-choices">
                {option.choices.map(choice => {
                  const isSelected = (selections[option.id] || []).includes(choice.id)
                  
                  return (
                    <button
                      key={choice.id}
                      className={`option-choice ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionChange(option.id, choice.id, option.type, option.maxSelections)}
                    >
                      <span className="choice-radio">
                        {option.type === 'single' ? (
                          isSelected ? '●' : '○'
                        ) : (
                          isSelected ? '☑' : '☐'
                        )}
                      </span>
                      <span className="choice-name">{choice.name}</span>
                      {choice.price > 0 && (
                        <span className="choice-price">+${choice.price.toFixed(2)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              
              {errors[option.id] && (
                <span className="option-error">{errors[option.id]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="customizer-footer">
          <div className="customizer-total">
            <span>Total</span>
            <span className="total-price">${calculateTotalPrice().toFixed(2)}</span>
          </div>
          <button 
            className="customizer-submit"
            onClick={validateAndSubmit}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
