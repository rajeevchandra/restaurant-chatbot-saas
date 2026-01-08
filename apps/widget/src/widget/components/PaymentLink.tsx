import { useState } from 'react'

interface PaymentLinkProps {
  paymentLink: string
  amount: number | string
  orderId: string
  onConfirmPayment: () => void
  onCancelOrder: () => void
}

export default function PaymentLink({ 
  paymentLink, 
  amount, 
  orderId, 
  onConfirmPayment,
  onCancelOrder 
}: PaymentLinkProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink)
    alert('Payment link copied to clipboard!')
  }

  const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount

  return (
    <div className="payment-link-container">
      <div className="payment-header">
        <h4>💳 Payment Required</h4>
        <p className="payment-amount">${amountNumber.toFixed(2)}</p>
      </div>
      
      <div className="payment-details">
        <p className="order-id">Order #{orderId.slice(0, 8)}</p>
        <p className="payment-instruction">Click below to complete your payment securely:</p>
        
        <a 
          href={paymentLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="payment-button"
        >
          <span className="payment-icon">🔒</span>
          Pay Securely
        </a>
        
        <button 
          onClick={handleCopyLink}
          className="copy-link-btn secondary"
        >
          📋 Copy Payment Link
        </button>

        <div className="payment-actions">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onConfirmPayment()
            }}
            className="confirm-payment-btn"
          >
            ✅ I've Paid
          </button>
          
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setShowCancelConfirm(true)
            }}
            className="cancel-order-btn"
          >
            ❌ Cancel Order
          </button>
        </div>
      </div>
      
      <div className="payment-note">
        <small>💡 After payment, click "I've Paid" so we can start preparing your order!</small>
      </div>

      {showCancelConfirm && (
        <div className="payment-cancel-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="payment-cancel-dialog" onClick={(e) => e.stopPropagation()}>
            <h4>Cancel Order?</h4>
            <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div className="payment-cancel-actions">
              <button
                className="payment-cancel-back"
                onClick={() => setShowCancelConfirm(false)}
              >
                Go Back
              </button>
              <button
                className="payment-cancel-confirm"
                onClick={() => {
                  setShowCancelConfirm(false)
                  onCancelOrder()
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
