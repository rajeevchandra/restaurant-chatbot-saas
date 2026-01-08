import { ReactNode } from 'react'

interface ChatPanelProps {
  children: ReactNode
  onClose: () => void
  brandName?: string
}

export default function ChatPanel({ children, onClose, brandName }: ChatPanelProps) {
  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="restaurant-avatar">🍽️</div>
          <div className="header-text">
            <h3>{brandName || 'Restaurant Assistant'}</h3>
            <span className="status-indicator">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="close-btn" 
          aria-label="Close chat"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path 
              d="M15 5L5 15M5 5L15 15" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Content area (scrollable) */}
      <div className="chat-content">
        {children}
      </div>
    </div>
  )
}
