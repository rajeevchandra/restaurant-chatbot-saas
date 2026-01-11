import { useState, useEffect } from 'react';
import { OrderStatus } from '@restaurant-saas/shared';

interface OrderStatusCardProps {
  orderId: string;
  status: OrderStatus;
  amount?: number;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  message?: string;
  estimatedTime?: string;
  onRefresh?: () => void;
  onCancel?: () => void;
  onDone?: () => void;
  isRefreshing?: boolean;
}

const STATUS_TIMELINE = [
  { key: OrderStatus.PAID, label: 'Paid', icon: '💳' },
  { key: OrderStatus.PREPARING, label: 'Preparing', icon: '👨‍🍳' },
  { key: OrderStatus.READY, label: 'Ready', icon: '🔔' },
];

export default function OrderStatusCard({ 
  orderId, 
  status, 
  amount, 
  items,
  message,
  estimatedTime,
  onRefresh,
  onCancel,
  onDone,
  isRefreshing = false
}: OrderStatusCardProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [autoRefreshIn, setAutoRefreshIn] = useState(10)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  // Auto-refresh countdown - but not for PAID status
  useEffect(() => {
    if (!onRefresh || [OrderStatus.PAID, OrderStatus.CANCELLED].includes(status)) {
      return
    }

    const interval = setInterval(() => {
      setAutoRefreshIn((prev) => {
        if (prev <= 1) {
          onRefresh()
          setLastRefresh(Date.now())
          return 10 // Reset to 10 seconds
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onRefresh, status, lastRefresh])

  const handleRefresh = () => {
    if (onRefresh && !isRefreshing) {
      onRefresh()
      setAutoRefreshIn(10)
      setLastRefresh(Date.now())
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case OrderStatus.PAID:
        return {
          icon: '💳',
          title: 'Order Paid',
          color: '#10b981',
          bgColor: '#d1fae5',
          description: message || 'Your order has been paid and will be prepared soon.'
        }
      case OrderStatus.PREPARING:
        return {
          icon: '👨‍🍳',
          title: 'Preparing Your Order',
          color: '#f59e0b',
          bgColor: '#fef3c7',
          description: message || 'Our kitchen is working on your order.'
        }
      case OrderStatus.READY:
        return {
          icon: '🔔',
          title: 'Order Ready!',
          color: '#10b981',
          bgColor: '#d1fae5',
          description: message || 'Your order is ready for pickup or delivery.'
        }
      case OrderStatus.CANCELLED:
        return {
          icon: '❌',
          title: 'Order Cancelled',
          color: '#ef4444',
          bgColor: '#fee2e2',
          description: message || 'This order has been cancelled.'
        }
      default:
        return {
          icon: '⏳',
          title: 'Processing...',
          color: '#6366f1',
          bgColor: '#e0e7ff',
          description: message || 'We are processing your order.'
        }
    }
  }

  const getStatusIndex = () => {
    const index = STATUS_TIMELINE.findIndex(s => s.key === status)
    return index >= 0 ? index : -1
  }

  const canCancel = [OrderStatus.PAID].includes(status)
  const showRefresh = ![OrderStatus.CANCELLED].includes(status)
  const config = getStatusConfig()
  const currentIndex = getStatusIndex()

  return (
    <div className="order-status-card-premium">
      <div className="order-status-header">
        <div className="order-status-badge" style={{ backgroundColor: config.bgColor, color: config.color }}>
          <span className="status-icon">{config.icon}</span>
          <span className="status-text">{config.title}</span>
        </div>
        
        {showRefresh && onRefresh && (
          <button 
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh status"
          >
            🔄
          </button>
        )}
      </div>

      <div className="order-details-section">
        <div className="order-detail-item">
          <span className="detail-label">Order ID</span>
          <span className="detail-value">#{orderId.slice(-8).toUpperCase()}</span>
        </div>
        {amount !== undefined && (
          <div className="order-detail-item">
            <span className="detail-label">Total</span>
            <span className="detail-value amount">${amount.toFixed(2)}</span>
          </div>
        )}
        {estimatedTime && (
          <div className="order-detail-item">
            <span className="detail-label">Estimated Time</span>
            <span className="detail-value">{estimatedTime}</span>
          </div>
        )}
      </div>

      {currentIndex >= 0 && (
        <div className="status-timeline">
          {STATUS_TIMELINE.map((step, index) => {
            const isComplete = index <= currentIndex
            const isCurrent = index === currentIndex
            const isLast = index === STATUS_TIMELINE.length - 1

            return (
              <div key={step.key} className="timeline-step">
                <div className={`timeline-node ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                  <span className="timeline-icon">{step.icon}</span>
                </div>
                <div className="timeline-label">
                  <span className={isComplete ? 'complete' : ''}>{step.label}</span>
                </div>
                {!isLast && (
                  <div className={`timeline-line ${isComplete ? 'complete' : ''}`}></div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="order-description">{config.description}</p>

      {items && items.length > 0 && (
        <div className="order-items-list">
          <div className="order-items-title">Order Items:</div>
          {items.map((item, index) => (
            <div key={index} className="order-item-summary">
              <span className="item-qty-name">{item.quantity}x {item.name}</span>
              <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {showRefresh && onRefresh && (
        <div className="auto-refresh-info">
          <span className="refresh-icon">🔄</span>
          Auto-refreshing in {autoRefreshIn}s
        </div>
      )}

      <div className="order-actions">
        {/* Done button for PAID status */}
        {status === OrderStatus.PAID && onDone && (
          <button
            className="done-order-action-btn"
            onClick={onDone}
          >
            ✓ Done
          </button>
        )}
        
        {canCancel && onCancel && (
          <button
            className="cancel-order-action-btn"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel Order
          </button>
        )}
      </div>

      {showCancelConfirm && (
        <div className="order-cancel-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="order-cancel-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-dialog-icon">⚠️</div>
            <h4>Cancel Order?</h4>
            <p>Are you sure you want to cancel order #{orderId.slice(-8).toUpperCase()}?</p>
            <p className="cancel-warning">This action cannot be undone.</p>
            <div className="order-cancel-actions">
              <button
                className="cancel-back-btn"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Order
              </button>
              <button
                className="cancel-confirm-btn"
                onClick={() => {
                  setShowCancelConfirm(false)
                  onCancel?.()
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
