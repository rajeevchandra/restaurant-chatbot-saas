interface CartItem {
  menuItemName: string
  quantity: number
  unitPrice: number
}

interface CartSummaryProps {
  items: CartItem[]
}

export default function CartSummary({ items }: CartSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <div className="cart-summary">
      <h4>Your Cart</h4>
      <div className="cart-items">
        {items.map((item, index) => (
          <div key={index} className="cart-item">
            <span>{item.quantity}x {item.menuItemName}</span>
            <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <strong>Total:</strong>
        <strong>${total.toFixed(2)}</strong>
      </div>
    </div>
  )
}
