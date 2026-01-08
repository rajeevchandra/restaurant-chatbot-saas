interface WidgetLauncherProps {
  onClick: () => void
  unreadCount?: number
}

export default function WidgetLauncher({ onClick, unreadCount }: WidgetLauncherProps) {
  return (
    <button
      className="widget-launcher"
      onClick={onClick}
      aria-label="Open chat"
      aria-expanded="false"
    >
      <svg 
        className="launcher-icon" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" 
          fill="currentColor"
        />
      </svg>
      {unreadCount && unreadCount > 0 && (
        <span className="launcher-badge" aria-label={`${unreadCount} unread messages`}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
