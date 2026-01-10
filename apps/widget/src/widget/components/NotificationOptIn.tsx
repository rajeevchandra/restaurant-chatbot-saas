import { useState, useEffect } from 'react'

interface NotificationOptInProps {
  existingPhone?: string
  existingEmail?: string
  onConfirm: (preferences: {
    smsUpdates: boolean
    emailReceipt: boolean
    phone?: string
    email?: string
  }) => void
  isProcessing?: boolean
}

export default function NotificationOptIn({
  existingPhone,
  existingEmail,
  onConfirm,
  isProcessing = false
}: NotificationOptInProps) {
  const [smsUpdates, setSmsUpdates] = useState(!!existingPhone)
  const [emailReceipt, setEmailReceipt] = useState(!!existingEmail)
  const [phone, setPhone] = useState(existingPhone || '')
  const [email, setEmail] = useState(existingEmail || '')
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({})
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (existingPhone) setSmsUpdates(true)
    if (existingEmail) setEmailReceipt(true)
  }, [existingPhone, existingEmail])

  const validatePhone = (value: string): boolean => {
    if (!value) return true // Optional
    const phoneRegex = /^[\d\s\-\(\)]+$/
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10
  }

  const validateEmail = (value: string): boolean => {
    if (!value) return true // Optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleConfirm = () => {
    const newErrors: { phone?: string; email?: string } = {}

    if (smsUpdates && !phone) {
      newErrors.phone = 'Phone number required for SMS updates'
    } else if (smsUpdates && !validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (emailReceipt && !email) {
      newErrors.email = 'Email required for receipt'
    } else if (emailReceipt && !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onConfirm({
      smsUpdates,
      emailReceipt,
      phone: smsUpdates ? phone : undefined,
      email: emailReceipt ? email : undefined,
    })
  }

  return (
    <div className="notification-optin-card">
      <div 
        className="notification-optin-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="notification-optin-title">
          <span className="notification-icon">📬</span>
          <span>Get updates & receipt</span>
        </div>
        <span className="notification-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="notification-optin-content">
          <div className="notification-option">
            <label className="notification-checkbox-label">
              <input
                type="checkbox"
                checked={smsUpdates}
                onChange={(e) => {
                  setSmsUpdates(e.target.checked)
                  if (!e.target.checked) setErrors({ ...errors, phone: undefined })
                }}
                disabled={isProcessing}
              />
              <span className="notification-label-text">
                📱 Text me order updates
              </span>
            </label>
            {smsUpdates && !existingPhone && (
              <div className="notification-input-group">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setErrors({ ...errors, phone: undefined })
                  }}
                  placeholder="(555) 123-4567"
                  className={`notification-input ${errors.phone ? 'error' : ''}`}
                  disabled={isProcessing}
                />
                {errors.phone && (
                  <span className="notification-error">{errors.phone}</span>
                )}
              </div>
            )}
            {smsUpdates && existingPhone && (
              <div className="notification-existing">
                Sending to: {existingPhone}
              </div>
            )}
          </div>

          <div className="notification-option">
            <label className="notification-checkbox-label">
              <input
                type="checkbox"
                checked={emailReceipt}
                onChange={(e) => {
                  setEmailReceipt(e.target.checked)
                  if (!e.target.checked) setErrors({ ...errors, email: undefined })
                }}
                disabled={isProcessing}
              />
              <span className="notification-label-text">
                📧 Email me receipt
              </span>
            </label>
            {emailReceipt && !existingEmail && (
              <div className="notification-input-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors({ ...errors, email: undefined })
                  }}
                  placeholder="your@email.com"
                  className={`notification-input ${errors.email ? 'error' : ''}`}
                  disabled={isProcessing}
                />
                {errors.email && (
                  <span className="notification-error">{errors.email}</span>
                )}
              </div>
            )}
            {emailReceipt && existingEmail && (
              <div className="notification-existing">
                Sending to: {existingEmail}
              </div>
            )}
          </div>

          <div className="notification-footer">
            <p className="notification-disclaimer">
              Optional - helps us keep you informed
            </p>
            <button
              className="notification-confirm-btn"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Confirm preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
