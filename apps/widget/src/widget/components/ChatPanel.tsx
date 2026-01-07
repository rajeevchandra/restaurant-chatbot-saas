import { ReactNode } from 'react'

interface ChatPanelProps {
  children: ReactNode
  onClose: () => void
}

export default function ChatPanel({ children, onClose }: ChatPanelProps) {
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat with us</h3>
        <button onClick={onClose} className="close-btn" aria-label="Close chat">
          ✕
        </button>
      </div>
      {children}
    </div>
  )
}
