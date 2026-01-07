import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import MessageList from './components/MessageList'
import MessageInput from './components/MessageInput'
import QuickReplies from './components/QuickReplies'
import CartSummary from './components/CartSummary'
import { getSessionId } from '../lib/session'
import { ApiClient } from '@restaurant-saas/shared'
import './styles/widget.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  data?: any
}

interface WidgetProps {
  restaurantSlug: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Widget({ restaurantSlug }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(getSessionId())
  const apiClient = useRef(new ApiClient(API_URL))

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage('hi')
    }
  }, [isOpen])

  const sendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await apiClient.current.sendBotMessage(
        restaurantSlug,
        sessionId.current,
        text
      )

      if (response.success && response.data) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message,
          sender: 'bot',
          timestamp: new Date(),
          data: response.data.data,
        }
        setMessages((prev) => [...prev, botMessage])
        setQuickReplies(response.data.quickReplies || [])
        
        if (response.data.data?.cart) {
          setCart(response.data.data.cart)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    sendMessage(reply)
  }

  return (
    <div className="restaurant-chat-widget">
      {/* Chat button */}
      {!isOpen && (
        <button
          className="widget-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <ChatPanel onClose={() => setIsOpen(false)}>
          <div className="widget-content">
            <MessageList messages={messages} loading={loading} />
            
            {quickReplies.length > 0 && (
              <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />
            )}
            
            {cart.length > 0 && <CartSummary items={cart} />}
            
            <MessageInput onSend={sendMessage} disabled={loading} />
          </div>
        </ChatPanel>
      )}
    </div>
  )
}
