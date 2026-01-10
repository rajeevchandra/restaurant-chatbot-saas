import { useState, useEffect, useRef } from 'react'
import WidgetShell from './components/WidgetShell'
import MessageList from './components/MessageList'
import MessageInput from './components/MessageInput'
import QuickReplies from './components/QuickReplies'
import CartSummary from './components/CartSummary'
import MenuItemCard from './components/MenuItemCard'
import CheckoutForm from './components/CheckoutForm'
import PaymentLink from './components/PaymentLink'
import OrderStatusCard from './components/OrderStatusCard'
import NotificationOptIn from './components/NotificationOptIn'
import { getSessionId } from '../lib/session'
import { getCart, saveCart, clearCart } from '../lib/cart'
import { ApiClient } from '@restaurant-saas/shared'
import './styles/widget.css'

export interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  data?: any
  optimistic?: boolean
}

interface BotResponseData {
  text?: string
  message?: string
  quickReplies?: string[]
  cards?: any[]
  data?: {
    paymentLink?: string
    orderId?: string
    amount?: string | number
    cartItems?: any[]
    showCheckoutForm?: boolean
  }
}

interface Order {
  id: string
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
  totalAmount?: number
  checkoutUrl?: string
  items?: Array<{
    menuItemName: string
    quantity: number
    unitPrice: number
  }>
}

interface WidgetProps {
  restaurantSlug: string
  brandName?: string
  apiUrl?: string
  primaryColor?: string
}

export default function Widget({ 
  restaurantSlug, 
  brandName, 
  apiUrl, 
  primaryColor 
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notificationPreferences, setNotificationPreferences] = useState<{
    smsUpdates: boolean
    emailReceipt: boolean
    phone?: string
    email?: string
  } | null>(null)
  const [showNotificationOptIn, setShowNotificationOptIn] = useState(false)
  const sessionId = useRef(getSessionId(restaurantSlug))
  const API_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const apiClient = useRef(new ApiClient(API_URL))
  const displayName = brandName || restaurantSlug
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const terminalMessageShown = useRef<string | null>(null) // Track if terminal message shown for orderId

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = getCart(restaurantSlug)
    if (savedCart.length > 0) {
      setCart(savedCart)
    }
  }, [restaurantSlug])

  // 🚀 OPTIMIZED: Send welcome message immediately when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg: Message = {
        id: Date.now().toString(),
        text: `Welcome to ${displayName}! 👋\n\nHow can I help you today?`,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages([welcomeMsg])
      setQuickReplies(['View Menu', 'Check Order Status', 'Contact Support'])
    }
  }, [isOpen, displayName])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    saveCart(restaurantSlug, cart)
  }, [cart, restaurantSlug])

  // Apply custom primary color if provided
  useEffect(() => {
    if (primaryColor) {
      const root = document.documentElement
      root.style.setProperty('--widget-primary', primaryColor)
    }
  }, [primaryColor])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [])

  // Start polling order status
  useEffect(() => {
    if (pollingOrderId) {
      startOrderPolling(pollingOrderId)
    } else {
      stopOrderPolling()
    }
  }, [pollingOrderId])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Show welcome message immediately without API call
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: '👋 Welcome! How can I assist you today?',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
      
      // Set initial quick replies
      setQuickReplies(['View Menu', 'Special Offers', 'My Orders'])
    }
  }, [isOpen])

  const sendMessage = async (text: string) => {
    // Close checkout form if user is navigating away (viewing menu, browsing, etc.)
    const lowerText = text.toLowerCase()
    const isNavigatingToMenu = lowerText.includes('menu') || 
        lowerText.includes('browse') || 
        lowerText.includes('view') ||
        lowerText.includes('show') ||
        lowerText.includes('back') ||
        lowerText.includes('special') ||
        lowerText.includes('offer')
    
    if (isNavigatingToMenu) {
      setShowCheckoutForm(false)
    }
    
    // Add optimistic user message
    const optimisticId = `optimistic-${Date.now()}`
    const userMessage: Message = {
      id: optimisticId,
      text,
      sender: 'user',
      timestamp: new Date(),
      optimistic: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      setError(null)
      
      let response = await apiClient.current.sendBotMessage(
        restaurantSlug,
        sessionId.current,
        text
      )

      // Retry once on failure
      if (!response.success && response.error) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        response = await apiClient.current.sendBotMessage(
          restaurantSlug,
          sessionId.current,
          text
        )
      }

      // Remove optimistic flag and update ID
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === optimisticId 
            ? { ...msg, id: Date.now().toString(), optimistic: false }
            : msg
        )
      )

      if (response.success && response.data) {
        const responseData = response.data as BotResponseData;
        
        // Check if user just requested navigation (menu, special offers, etc.)
        const userWantedNavigation = isNavigatingToMenu
        
        // Detect if bot is stuck in wrong state (user asked for menu but bot returned checkout)
        const botStuckInCheckout = userWantedNavigation && 
          responseData.text?.toLowerCase().includes('contact information') &&
          !responseData.cards
        
        let botMessage: Message
        
        if (botStuckInCheckout) {
          // Override with helpful fallback message
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: "I'm having trouble loading the menu right now. Please click 'View Menu' again or type 'menu' to try again.",
            sender: 'bot',
            timestamp: new Date(),
          }
          setQuickReplies(['View Menu', 'My Orders', 'Special Offers'])
          setCards([])
          setShowCheckoutForm(false)
        } else {
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: responseData.text || responseData.message || '',
            sender: 'bot',
            timestamp: new Date(),
            data: responseData.data,
          }
          setQuickReplies(responseData.quickReplies || [])
          setCards(responseData.cards || [])
          
          // Show checkout form if bot is asking for contact info
          const isAskingForContactInfo = 
            responseData.text?.toLowerCase().includes('contact information') ||
            responseData.text?.toLowerCase().includes('provide your details') ||
            responseData.text?.toLowerCase().includes('checkout information') ||
            (responseData.quickReplies?.includes('Cancel') && 
             responseData.text?.toLowerCase().includes('provide'))
          
          // OVERRIDE: If user just asked to view menu/browse/etc., NEVER show checkout form
          if (userWantedNavigation) {
            setShowCheckoutForm(false)
          } else if (responseData.data?.showCheckoutForm === true || isAskingForContactInfo) {
            setShowCheckoutForm(true)
            setPaymentData(null)
          } else if (responseData.data?.showCheckoutForm === false || 
                     (responseData.cards && responseData.cards.length > 0) || // Menu is being shown
                     responseData.text?.toLowerCase().includes('menu') ||
                     responseData.text?.toLowerCase().includes('browse')) {
            // Explicitly hide checkout form when showing menu or other content
            setShowCheckoutForm(false)
          }
          // Otherwise, maintain current state (don't change showCheckoutForm)
        }
        
        // Only add message to chat if it has text content
        if (botMessage.text && botMessage.text.trim().length > 0) {
          setMessages((prev) => [...prev, botMessage])
        }
        
        // Show payment link if present in response
        if (responseData.data?.paymentLink) {
          setPaymentData(responseData.data)
        } else if (!responseData.text?.includes('pay') && !responseData.text?.includes('payment')) {
          // Only clear payment data if the message is not about payment
          setPaymentData(null)
        }
        
        // Update cart if present in response
        if (responseData.data?.cartItems) {
          setCart(responseData.data.cartItems)
        }
      } else {
        console.error('Bot response error:', response.error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Unable to send message. Please check your connection and try again.')
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    // If user clicks Cancel quick reply when checkout form is visible, close the form
    if (reply.toLowerCase() === 'cancel' && showCheckoutForm) {
      setShowCheckoutForm(false)
      // Optionally send a message to inform the bot
      sendMessage('I want to continue shopping')
      return
    }
    
    // If user clicks View Menu or similar, force close checkout form
    const replyLower = reply.toLowerCase()
    if (replyLower.includes('menu') || 
        replyLower.includes('browse') || 
        replyLower.includes('special') ||
        replyLower.includes('offer')) {
      setShowCheckoutForm(false)
    }
    
    sendMessage(reply)
  }

  const handleUpdateCartQuantity = (index: number, newQuantity: number) => {
    setCart((prevCart) => {
      const updatedCart = [...prevCart]
      updatedCart[index] = { ...updatedCart[index], quantity: newQuantity }
      return updatedCart
    })
  }

  const handleRemoveCartItem = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index))
  }

  const handleClearCart = () => {
    setCart([])
    clearCart(restaurantSlug)
    setCurrentOrder(null)
    setPaymentData(null)
    setNotificationPreferences(null)
    setShowNotificationOptIn(false)
  }

  // Get quantity of item in cart
  const getItemQuantity = (itemId: string): number => {
    const item = cart.find(i => i.menuItemId === itemId || i.id === itemId)
    return item ? item.quantity : 0
  }

  // Add item to cart (quantity = 1)
  const handleAddItemToCart = (itemId: string, itemName: string, unitPrice: number) => {
    const existingItem = cart.find(i => (i.menuItemId === itemId || i.id === itemId))
    
    if (existingItem) {
      // Item exists, increment quantity
      setCart(prevCart => 
        prevCart.map(item => 
          (item.menuItemId === itemId || item.id === itemId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      // New item, add to cart
      setCart(prevCart => [
        ...prevCart,
        {
          menuItemId: itemId,
          menuItemName: itemName,
          quantity: 1,
          unitPrice: unitPrice,
        }
      ])
    }
  }

  // Increment item quantity
  const handleIncrementItem = (itemId: string) => {
    setCart(prevCart => 
      prevCart.map(item => 
        (item.menuItemId === itemId || item.id === itemId)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    )
  }

  // Decrement item quantity (remove if reaches 0)
  const handleDecrementItem = (itemId: string) => {
    setCart(prevCart => {
      const item = prevCart.find(i => (i.menuItemId === itemId || i.id === itemId))
      if (!item) return prevCart
      
      if (item.quantity <= 1) {
        // Remove item if quantity reaches 0
        return prevCart.filter(i => (i.menuItemId !== itemId && i.id !== itemId))
      } else {
        // Decrement quantity
        return prevCart.map(i => 
          (i.menuItemId === itemId || i.id === itemId)
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
      }
    })
  }

  const startOrderPolling = (orderId: string) => {
    stopOrderPolling()
    
    let pollCount = 0
    
    pollingInterval.current = setInterval(async () => {
      pollCount++
      
      try {
        const response = await apiClient.current.getPublicOrder(restaurantSlug, orderId)
        if (response.success && response.data) {
          const order = response.data as Order
          
          // Update order status
          setCurrentOrder(order)
          
          // Stop polling if order is in terminal state
          if (['PAID', 'FAILED', 'CANCELLED', 'DELIVERED'].includes(order.status)) {
            stopOrderPolling()
            
            // Only show terminal state message once per order
            if (terminalMessageShown.current !== orderId) {
              terminalMessageShown.current = orderId
              
              if (order.status === 'PAID') {
                // Clear cart on successful payment
                setCart([])
                setPaymentData(null)
                
                // Add success message
                const successMessage: Message = {
                  id: Date.now().toString(),
                  text: `✅ Payment successful! Your order #${orderId.slice(-8)} has been confirmed.`,
                  sender: 'bot',
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, successMessage])
              } else if (order.status === 'FAILED') {
                // Add failure message
                const failMessage: Message = {
                  id: Date.now().toString(),
                  text: `⚠️ Payment failed for order #${orderId.slice(-8)}. Please try again.`,
                  sender: 'bot',
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, failMessage])
              }
            }
          }
        } else {
          // API failed - log for debugging
          console.warn(`Failed to poll order ${orderId}, attempt ${pollCount}`)
        }
      } catch (error) {
        console.error('Error polling order status:', error)
        // Continue polling - don't stop on error
      }
    }, 3000) // Poll every 3 seconds
  }

  const stopOrderPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    setIsProcessingCheckout(true)
    setError(null)

    try {
      // Create order via public endpoint
      const orderData = {
        items: cart.map((item) => {
          const orderItem: any = {
            menuItemId: item.menuItemId || item.id,
            quantity: item.quantity,
          }
          // Only include selectedOptions if it exists and is an array
          if (item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
            orderItem.selectedOptions = item.selectedOptions
          }
          return orderItem
        }),
        customerName: 'Guest', // Will be updated with checkout form
        customerPhone: notificationPreferences?.phone,
        customerEmail: notificationPreferences?.email,
        notes: `Session: ${sessionId.current}${notificationPreferences ? ` | SMS: ${notificationPreferences.smsUpdates ? 'Yes' : 'No'}, Email: ${notificationPreferences.emailReceipt ? 'Yes' : 'No'}` : ''}`,
      }

      let response = await apiClient.current.createPublicOrder(restaurantSlug, orderData)

      // Retry once on failure
      if (!response.success && response.error) {
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        response = await apiClient.current.createPublicOrder(restaurantSlug, orderData)
      }

      if (response.success && response.data) {
        const order = response.data as Order
        setCurrentOrder(order)
        
        // Reset terminal message flag for new order
        terminalMessageShown.current = null

        // Add processing message
        const processingMessage: Message = {
          id: Date.now().toString(),
          text: `🔄 Processing your order... Order ID: #${order.id.slice(-8)}`,
          sender: 'bot',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, processingMessage])

        // If order has checkout URL, show payment link
        if (order.checkoutUrl) {
          setPaymentData({
            paymentLink: order.checkoutUrl,
            orderId: order.id,
            amount: order.totalAmount || calculateTotal(),
          })

          // Start polling for payment status
          setPollingOrderId(order.id)

          const paymentMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: '💳 Please complete your payment using the link below.',
            sender: 'bot',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, paymentMessage])
        } else {
          // Order created without payment link - show order status instead
          setPollingOrderId(order.id)
          
          const statusMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `✅ Order #${order.id.slice(-8)} has been received! Please contact the restaurant to complete payment.`,
            sender: 'bot',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, statusMessage])
        }
      } else {
        throw new Error(response.error || 'Failed to create order')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setError('Unable to place your order. Please check your connection and try again.')
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'I\'m having trouble placing your order right now. Please try again in a moment, or contact the restaurant directly.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setQuickReplies(['Try Again', 'View Cart', 'View Menu'])
    } finally {
      setIsProcessingCheckout(false)
    }
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.08
    return subtotal + tax
  }

  const handleCancelOrder = async () => {
    if (!pollingOrderId) return

    try {
      stopOrderPolling()
      
      // Try to cancel the order on the backend using public endpoint
      const response = await apiClient.current.cancelPublicOrder(restaurantSlug, pollingOrderId)
      
      if (response.success) {
        const cancelMessage: Message = {
          id: Date.now().toString(),
          text: `❌ Order #${pollingOrderId.slice(-8)} has been cancelled.`,
          sender: 'bot',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, cancelMessage])
      }
      
      // Reset state
      setPollingOrderId(null)
      setPaymentData(null)
      setCurrentOrder(null)
      setCart([])
      
      // Offer to start over
      setTimeout(() => {
        const helpMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: '👋 No problem! Would you like to browse our menu again?',
          sender: 'bot',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, helpMessage])
      }, 500)
      
    } catch (error) {
      console.error('Error cancelling order:', error)
      
      // Still reset state even if backend call fails
      setPollingOrderId(null)
      setPaymentData(null)
      setCurrentOrder(null)
      setCart([])
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: '⚠️ Order cancelled locally. You may need to contact support if you were charged.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  return (
    <WidgetShell 
      isOpen={isOpen} 
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      brandName={displayName}
    >
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button 
            className="error-close" 
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <MessageList messages={messages} loading={loading} />
            
            {showCheckoutForm ? (
              <CheckoutForm 
                onSubmit={(contactInfo) => {
                  setShowCheckoutForm(false)
                  sendMessage(contactInfo)
                }}
                onCancel={() => {
                  setShowCheckoutForm(false)
                  // Don't send any message - just close the form
                }}
              />
            ) : (
              <>
                {/* Payment Link - shown when waiting for payment */}
                {paymentData?.paymentLink && currentOrder?.status === 'PAYMENT_PENDING' && (
                  <PaymentLink
                    paymentLink={paymentData.paymentLink}
                    amount={paymentData.amount}
                    orderId={paymentData.orderId}
                    onCancelOrder={handleCancelOrder}
                    apiUrl={API_URL}
                    restaurantSlug={restaurantSlug}
                  />
                )}

                {/* Order Processing Indicator - shown while polling without payment link */}
                {pollingOrderId && currentOrder?.status === 'PAYMENT_PENDING' && !paymentData?.paymentLink && (
                  <div className="order-processing">
                    <div className="spinner"></div>
                    <div className="processing-text">
                      <div className="processing-title">Waiting for payment...</div>
                      <div className="processing-subtitle">Order #{pollingOrderId.slice(-8)}</div>
                    </div>
                  </div>
                )}

                {/* Order Status Card - shown when order is in terminal state */}
                {currentOrder && ['PAID', 'FAILED', 'CANCELLED', 'DELIVERED', 'CONFIRMED', 'PREPARING', 'READY'].includes(currentOrder.status) && (
                  <OrderStatusCard
                    orderId={currentOrder.id}
                    status={currentOrder.status}
                    amount={currentOrder.totalAmount}
                    items={currentOrder.items?.map((item: any) => ({
                      name: item.menuItemName || 'Item',
                      quantity: item.quantity,
                      price: item.unitPrice,
                    }))}
                    onRefresh={async () => {
                      if (currentOrder.id) {
                        try {
                          const response = await apiClient.current.getPublicOrder(restaurantSlug, currentOrder.id)
                          if (response.success && response.data) {
                            setCurrentOrder(response.data as Order)
                          }
                        } catch (error) {
                          console.error('Failed to refresh order:', error)
                        }
                      }
                    }}
                    onCancel={['PAID', 'CONFIRMED'].includes(currentOrder.status) ? handleCancelOrder : undefined}
                    onDone={() => {
                      // Clear order state and show menu again
                      setCurrentOrder(null)
                      setPollingOrderId(null)
                      setPaymentData(null)
                      
                      // Add a thank you message
                      const thankYouMessage: Message = {
                        id: Date.now().toString(),
                        text: '👋 Thank you for your order! Feel free to browse our menu again.',
                        sender: 'bot',
                        timestamp: new Date(),
                      }
                      setMessages((prev) => [...prev, thankYouMessage])
                    }}
                    isRefreshing={loading}
                  />
                )}
                
                {/* Menu Item Cards */}
                {cards.length > 0 && !pollingOrderId && !paymentData && !currentOrder && (
                  <div className="cards-container">
                    {cards.map((card, index) => {
                      const quantity = getItemQuantity(card.id)
                      return (
                        <MenuItemCard
                          key={index}
                          item={card}
                          currentQuantity={quantity}
                          onAdd={() => handleAddItemToCart(card.id, card.title, card.price || 0)}
                          onIncrement={() => handleIncrementItem(card.id)}
                          onDecrement={() => handleDecrementItem(card.id)}
                        />
                      )
                    })}
                  </div>
                )}
                
                {/* Quick Replies */}
                {quickReplies.length > 0 && !pollingOrderId && !paymentData && !currentOrder && (
                  <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
                )}
                
                {/* Cart Summary */}
                {cart.length > 0 && !pollingOrderId && !currentOrder && !paymentData && (
                  <>
                    <CartSummary 
                      items={cart}
                      onUpdateQuantity={handleUpdateCartQuantity}
                      onRemoveItem={handleRemoveCartItem}
                      onClearCart={handleClearCart}
                      onCheckout={handleCheckout}
                      isProcessing={isProcessingCheckout}
                    />
                    
                    {/* Notification Opt-In */}
                    {!showNotificationOptIn && (
                      <NotificationOptIn
                        existingPhone={undefined}
                        existingEmail={undefined}
                        onConfirm={(preferences) => {
                          setNotificationPreferences(preferences)
                          setShowNotificationOptIn(true)
                        }}
                        isProcessing={isProcessingCheckout}
                      />
                    )}
                  </>
                )}
                
                {/* Message Input */}
                {!pollingOrderId && !paymentData && <MessageInput onSend={sendMessage} disabled={loading || isProcessingCheckout} />}
              </>
            )}
    </WidgetShell>
  )
}
