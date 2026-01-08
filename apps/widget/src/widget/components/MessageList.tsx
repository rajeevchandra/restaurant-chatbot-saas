import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { Message } from '../Widget'

interface MessageListProps {
  messages: Message[]
  loading: boolean
}

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Sanitize and render markdown
const renderMarkdown = (text: string): string => {
  const html = marked(text) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

export default function MessageList({ messages, loading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolled, setIsUserScrolled] = useState(false)
  const [showJumpButton, setShowJumpButton] = useState(false)

  // Auto-scroll logic
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsUserScrolled(!isAtBottom)
      setShowJumpButton(!isAtBottom && messages.length > 3)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  // Auto-scroll on new messages unless user scrolled up
  useEffect(() => {
    if (!isUserScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isUserScrolled])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setIsUserScrolled(false)
    setShowJumpButton(false)
  }

  // Check if message should be grouped with previous
  const shouldGroup = (index: number): boolean => {
    if (index === 0) return false
    const current = messages[index]
    const previous = messages[index - 1]
    const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime()
    return current.sender === previous.sender && timeDiff < 60000 // Within 1 minute
  }

  return (
    <div className="message-list" ref={containerRef}>
      {messages.map((message, index) => {
        const grouped = shouldGroup(index)
        const showTimestamp = !grouped || index === messages.length - 1
        
        return (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user' : 'bot'} ${
              grouped ? 'grouped' : ''
            } ${message.optimistic ? 'optimistic' : ''}`}
          >
            {message.sender === 'bot' && !grouped && (
              <div className="message-avatar">🍽️</div>
            )}
            <div className="message-content-wrapper">
              {message.sender === 'bot' ? (
                <div 
                  className="message-bubble"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
                />
              ) : (
                <div className="message-bubble">
                  {message.text}
                </div>
              )}
              {showTimestamp && (
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      {loading && (
        <div className="message bot loading">
          <div className="message-avatar">🍽️</div>
          <div className="message-content-wrapper">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      {showJumpButton && (
        <button 
          className="jump-to-latest" 
          onClick={scrollToBottom}
          aria-label="Jump to latest message"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
