interface OrderStatusCardProps {
  orderId: string
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
  amount?: number
  items?: Array<{
    name: string
    quantity: number
    price: number
  }>
  message?: string
}

export default function OrderStatusCard({ 
  orderId, 
  status, 
  amount, 
  items,
  message 
}: OrderStatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'PAID':
      case 'CONFIRMED':
        return {
          icon: '✅',
          title: 'Order Confirmed!',
          color: '#10b981',
          description: 'Your order has been confirmed and is being prepared.'
        }
      case 'PREPARING':
        return {
          icon: '👨‍🍳',
          title: 'Preparing Your Order',
          color: '#f59e0b',
          description: 'Our kitchen is working on your order.'
        }
      case 'READY':
        return {
          icon: '🎉',
          title: 'Order Ready!',
          color: '#10b981',
          description: 'Your order is ready for pickup or delivery.'
        }
      case 'DELIVERED':
        return {
          icon: '🚀',
          title: 'Delivered!',
          color: '#10b981',
          description: 'Your order has been delivered. Enjoy your meal!'
        }
      case 'CANCELLED':
        return {
          icon: '❌',
          title: 'Order Cancelled',
          color: '#ef4444',
          description: 'This order has been cancelled.'
        }
      case 'FAILED':
        return {
          icon: '⚠️',
          title: 'Payment Failed',
          color: '#ef4444',
          description: 'Payment could not be processed. Please try again.'
        }
      case 'PENDING':
      default:
        return {
          icon: '⏳',
          title: 'Processing...',
          color: '#6366f1',
          description: 'We are processing your order.'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="order-status-card">
      <div className="order-status-icon" style={{ backgroundColor: `${config.color}20` }}>
        <span style={{ fontSize: '32px' }}>{config.icon}</span>
      </div>

      <div className="order-status-content">
        <h3 className="order-status-title" style={{ color: config.color }}>
          {config.title}
        </h3>
        <p className="order-status-description">
          {message || config.description}
        </p>

        <div className="order-status-details">
          <div className="order-detail-row">
            <span className="order-detail-label">Order ID:</span>
            <span className="order-detail-value">{orderId}</span>
          </div>
          {amount !== undefined && (
            <div className="order-detail-row">
              <span className="order-detail-label">Total:</span>
              <span className="order-detail-value order-amount">${amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {items && items.length > 0 && (
          <div className="order-items-summary">
            <div className="order-items-header">Order Items:</div>
            {items.map((item, index) => (
              <div key={index} className="order-item-row">
                <span>{item.quantity}x {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {(status === 'PAID' || status === 'CONFIRMED' || status === 'PREPARING') && (
          <div className="order-status-note">
            <span className="note-icon">💡</span>
            <span>We'll notify you when your order status changes.</span>
          </div>
        )}
      </div>
    </div>
  )
}
