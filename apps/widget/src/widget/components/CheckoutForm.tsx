import { useState } from 'react'

interface CheckoutFormProps {
  onSubmit: (contactInfo: string) => void
  onCancel: () => void
}

export default function CheckoutForm({ onSubmit, onCancel }: CheckoutFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {}
    
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/\d{3}[-\s]?\d{3}[-\s]?\d{4}/.test(phone.trim())) {
      newErrors.phone = 'Invalid phone format (use: 555-123-4567 or 5551234567)'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      const contactInfo = email.trim() 
        ? `${name.trim()}, ${phone.trim()}, ${email.trim()}`
        : `${name.trim()}, ${phone.trim()}`
      
      console.log('Submitting contact info:', contactInfo)
      onSubmit(contactInfo)
    }
  }

  return (
    <div className="checkout-form-container">
      <div className="checkout-form-header">
        <h4>📋 Checkout Information</h4>
        <p>Please provide your contact details to complete the order</p>
      </div>
      
      <form onSubmit={handleSubmit} className="checkout-form">
        <div className="form-group">
          <label htmlFor="name">
            Name <span className="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">
            Phone Number <span className="required">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="555-123-4567"
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">
            Email <span className="optional">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Complete Order
          </button>
        </div>
      </form>
    </div>
  )
}
