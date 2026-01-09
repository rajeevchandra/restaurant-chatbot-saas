import { useState, useEffect } from 'react'

interface QuantityControlProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  onAdd: () => void
  disabled?: boolean
  soldOut?: boolean
}

export default function QuantityControl({
  quantity,
  onIncrement,
  onDecrement,
  onAdd,
  disabled = false,
  soldOut = false,
}: QuantityControlProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (quantity > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [quantity])

  if (soldOut) {
    return (
      <div className="quantity-control-wrapper">
        <button className="quantity-add-btn sold-out" disabled>
          🚫 Sold Out
        </button>
      </div>
    )
  }

  if (quantity === 0) {
    return (
      <div className="quantity-control-wrapper">
        <button
          className="quantity-add-btn"
          onClick={onAdd}
          disabled={disabled}
          aria-label="Add to cart"
        >
          ➕ Add
        </button>
      </div>
    )
  }

  return (
    <div className={`quantity-control-wrapper ${isAnimating ? 'animating' : ''}`}>
      <div className="quantity-stepper">
        <button
          className="quantity-btn decrement"
          onClick={onDecrement}
          disabled={disabled}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="quantity-display" aria-live="polite">
          {quantity}
        </span>
        <button
          className="quantity-btn increment"
          onClick={onIncrement}
          disabled={disabled}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  )
}
