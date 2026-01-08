import { useState, KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <input
          type="text"
          className="message-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled}
        />
        <button 
          className="send-btn" 
          onClick={handleSend} 
          disabled={disabled || !text.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
