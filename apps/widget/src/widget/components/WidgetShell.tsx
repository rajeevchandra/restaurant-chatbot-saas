import { ReactNode, useEffect, useRef } from 'react'
import WidgetLauncher from './WidgetLauncher'
import ChatPanel from './ChatPanel'

interface WidgetShellProps {
  children: ReactNode
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  brandName?: string
}

export default function WidgetShell({ 
  children, 
  isOpen, 
  onOpen, 
  onClose, 
  brandName 
}: WidgetShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Focus trapping for accessibility
  useEffect(() => {
    if (!isOpen || !panelRef.current) return

    const panel = panelRef.current
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleTab as any)
    
    // Focus first element when opened
    setTimeout(() => firstElement?.focus(), 100)

    return () => panel.removeEventListener('keydown', handleTab as any)
  }, [isOpen])

  // Prevent body scroll when widget is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle click outside (desktop only)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && window.innerWidth > 768) {
      onClose()
    }
  }

  return (
    <div className="widget-shell">
      {/* Launcher button */}
      {!isOpen && <WidgetLauncher onClick={onOpen} />}

      {/* Backdrop (visible on desktop, click to close) */}
      {isOpen && (
        <div 
          ref={backdropRef}
          className="widget-backdrop"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="widget-panel-wrapper"
          role="dialog"
          aria-modal="true"
          aria-label="Chat with restaurant"
        >
          <ChatPanel onClose={onClose} brandName={brandName}>
            {children}
          </ChatPanel>
        </div>
      )}
    </div>
  )
}
