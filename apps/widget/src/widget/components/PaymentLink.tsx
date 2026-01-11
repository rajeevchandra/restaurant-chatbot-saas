import { useState, useEffect, useRef } from 'react'

import QRCode from 'qrcode'

interface PaymentLinkProps {
  paymentLink: string
  amount: number | string
  orderId: string
  onCancelOrder: () => void
  apiUrl?: string
  restaurantSlug: string
}

function PaymentLink({
  paymentLink, 
  amount, 
  orderId,
  onCancelOrder,
  apiUrl
}: PaymentLinkProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Generate QR code when it becomes visible
  useEffect(() => {
    if (showQR && qrCanvasRef.current && paymentLink) {
      QRCode.toCanvas(qrCanvasRef.current, paymentLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      }).catch((err: unknown) => {
        console.error('Error generating QR code:', err)
      })
    }
  }, [showQR, paymentLink])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink)
    alert('Payment link copied to clipboard!')
  }

  const handlePaymentClick = async () => {
    // Start polling immediately when user clicks payment link
    setIsPolling(true)
    // Open payment link
    window.open(paymentLink, '_blank', 'noopener,noreferrer')

    // If polling API is available, trigger immediate poll
    if (apiUrl && orderId) {
      try {
        const response = await fetch(`${apiUrl}/api/v1/payments/poll/${orderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('Payment poll triggered:', result)
        }
      } catch (error) {
        console.error('Failed to trigger payment poll:', error)

      }
    }
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
        <p className="payment-instruction">
          {isPolling 
            ? '⏳ Waiting for payment confirmation...'
            : 'Click below to complete your payment securely:'
          }
        </p>

        {/* QR Code Section */}
        {!isPolling && (
          <div className="qr-code-section">
            <button 
              onClick={() => setShowQR(!showQR)}
              className="qr-toggle-btn"
            >
              {showQR ? '📱 Hide QR Code' : '📱 Show QR Code'}
            </button>
            
            {showQR && (
              <div className="qr-code-wrapper">
                <canvas ref={qrCanvasRef} className="qr-code-canvas" />
                <p className="qr-code-hint">Scan with your phone to pay</p>
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={handlePaymentClick}
          className="payment-button"
          disabled={isPolling}
        >
          <span className="payment-icon">🔒</span>
          {isPolling ? 'Payment Window Opened' : 'Pay Securely'}
        </button>
        
        {!isPolling && (
          <button 
            onClick={handleCopyLink}
            className="copy-link-btn secondary"
          >
            📋 Copy Payment Link
          </button>
        )}

        {!isPolling && (
          <div className="payment-actions">
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
        )}
      </div>
      
      <div className="payment-note">
        {isPolling ? (
          <small>
            ✨ <strong>We're checking your payment status automatically.</strong><br/>
            Once payment is complete, your order will be confirmed instantly!
          </small>
        ) : (
          <small>💡 Payment will be verified automatically after completion. No need to confirm manually!</small>
        )}
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
export default PaymentLink;

