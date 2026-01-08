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
import { getSessionId } from '../lib/session'
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
  const sessionId = useRef(getSessionId())
  const API_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const apiClient = useRef(new ApiClient(API_URL))
  const displayName = brandName || restaurantSlug
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

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
      sendMessage('hi')
    }
  }, [isOpen])

  const sendMessage = async (text: string) => {
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
      console.log('Sending message:', text, 'to restaurant:', restaurantSlug)
      const response = await apiClient.current.sendBotMessage(
        restaurantSlug,
        sessionId.current,
        text
      )

      console.log('Bot response:', response)

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
        console.log('Full response data:', JSON.stringify(responseData, null, 2));
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: responseData.text || responseData.message || 'No response',
          sender: 'bot',
          timestamp: new Date(),
          data: responseData.data,
        }
        setMessages((prev) => [...prev, botMessage])
        setQuickReplies(responseData.quickReplies || [])
        console.log('Setting cards:', responseData.cards)
        setCards(responseData.cards || [])
        
        // Show checkout form if bot is asking for contact info
        if (responseData.text?.includes('Ready to checkout') || 
            responseData.text?.includes('Please provide') ||
            responseData.text?.includes('contact information')) {
          setShowCheckoutForm(true)
          setPaymentData(null)
        } else {
          setShowCheckoutForm(false)
        }
        
        // Show payment link if present in response
        if (responseData.data?.paymentLink) {
          console.log('Setting payment data:', responseData.data)
          setPaymentData(responseData.data)
        } else if (!responseData.text?.includes('pay') && !responseData.text?.includes('payment')) {
          // Only clear payment data if the message is not about payment
          setPaymentData(null)
        }
        
        // Update cart if present in response
        if (responseData.data?.cartItems) {
          console.log('Updating cart:', responseData.data.cartItems);
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
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
    setCurrentOrder(null)
    setPaymentData(null)
  }

  const startOrderPolling = (orderId: string) => {
    stopOrderPolling()
    
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await apiClient.current.getOrder(orderId)
        if (response.success && response.data) {
          const order = response.data as Order
          
          // Update order status
          setCurrentOrder(order)
          
          // Stop polling if order is in terminal state
          if (['PAID', 'FAILED', 'CANCELLED', 'DELIVERED'].includes(order.status)) {
            stopOrderPolling()
            
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
      } catch (error) {
        console.error('Error polling order status:', error)
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

    try {
      // Create order
      const orderData = {
        items: cart.map((item) => ({
          menuItemId: item.menuItemId || item.id,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
        })),
        customerName: 'Guest', // Will be updated with checkout form
        notes: `Session: ${sessionId.current}`,
      }

      const response = await apiClient.current.createOrder(orderData)

      if (response.success && response.data) {
        const order = response.data as Order
        setCurrentOrder(order)

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
          // Order created without payment (maybe cash on delivery)
          setCart([])
          
          const successMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `✅ Order #${order.id.slice(-8)} created successfully!`,
            sender: 'bot',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, successMessage])
        }
      } else {
        throw new Error(response.error || 'Failed to create order')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: '❌ Sorry, there was an error processing your order. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessingCheckout(false)
    }
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.08
    return subtotal + tax
  }

  const handleConfirmPayment = () => {
    console.log('handleConfirmPayment called', { pollingOrderId, paymentData })
    
    const orderId = pollingOrderId || paymentData?.orderId
    
    if (!orderId) {
      console.log('No order ID found, returning early')
      return
    }

    // Continue polling - user claims they paid
    const confirmMessage: Message = {
      id: Date.now().toString(),
      text: '🔄 Thank you! Checking your payment status...',
      sender: 'bot',
      timestamp: new Date(),
    }
    
    console.log('Adding confirm message and hiding payment data')
    setMessages((prev) => [...prev, confirmMessage])

    // Hide payment link to show processing state
    setPaymentData(null)
    
    // Ensure polling is active
    if (!pollingOrderId) {
      setPollingOrderId(orderId)
    }

    // Payment polling will automatically detect when payment is complete
  }

  const handleCancelOrder = async () => {
    if (!pollingOrderId) return

    try {
      stopOrderPolling()
      
      // Try to cancel the order on the backend
      const response = await apiClient.current.cancelOrder(pollingOrderId)
      
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
      <MessageList messages={messages} loading={loading} />
            
            {showCheckoutForm ? (
              <CheckoutForm 
                onSubmit={(contactInfo) => {
                  setShowCheckoutForm(false)
                  sendMessage(contactInfo)
                }}
                onCancel={() => {
                  setShowCheckoutForm(false)
                  sendMessage('Cancel')
                }}
              />
            ) : (
              <>
                {/* Order Status Card - shown when order is in terminal state */}
                {currentOrder && ['PAID', 'FAILED', 'CANCELLED', 'DELIVERED'].includes(currentOrder.status) && (
                  <OrderStatusCard
                    orderId={currentOrder.id}
                    status={currentOrder.status}
                    amount={currentOrder.totalAmount}
                    items={currentOrder.items?.map((item: any) => ({
                      name: item.menuItemName || 'Item',
                      quantity: item.quantity,
                      price: item.unitPrice,
                    }))}
                  />
                )}

                {/* Payment Link - shown when waiting for payment */}
                {paymentData?.paymentLink && !currentOrder?.status && (
                  <PaymentLink
                    paymentLink={paymentData.paymentLink}
                    amount={paymentData.amount}
                    orderId={paymentData.orderId}
                    onConfirmPayment={handleConfirmPayment}
                    onCancelOrder={handleCancelOrder}
                  />
                )}

                {/* Order Processing Indicator - shown while polling */}
                {pollingOrderId && !currentOrder?.status && !paymentData?.paymentLink && (
                  <div className="order-processing">
                    <div className="spinner"></div>
                    <div className="processing-text">
                      <div className="processing-title">Waiting for payment...</div>
                      <div className="processing-subtitle">Order #{pollingOrderId.slice(-8)}</div>
                    </div>
                  </div>
                )}
                
                {/* Menu Item Cards */}
                {cards.length > 0 && !pollingOrderId && !paymentData && (
                  <div className="cards-container">
                    {cards.map((card, index) => (
                      <MenuItemCard
                        key={index}
                        item={card}
                        onAction={(action) => {
                          console.log('Card action clicked:', action);
                          const message = action.data ? JSON.stringify(action.data) : action.label;
                          sendMessage(message);
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Quick Replies */}
                {quickReplies.length > 0 && !pollingOrderId && !paymentData && (
                  <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
                )}
                
                {/* Cart Summary */}
                {cart.length > 0 && !pollingOrderId && !currentOrder && !paymentData && (
                  <CartSummary 
                    items={cart}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onRemoveItem={handleRemoveCartItem}
                    onClearCart={handleClearCart}
                    onCheckout={handleCheckout}
                    isProcessing={isProcessingCheckout}
                  />
                )}
                
                {/* Message Input */}
                {!pollingOrderId && !paymentData && <MessageInput onSend={sendMessage} disabled={loading || isProcessingCheckout} />}
              </>
            )}
    </WidgetShell>
  )
}
