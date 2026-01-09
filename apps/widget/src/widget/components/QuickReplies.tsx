interface QuickRepliesProps {
  replies: string[]
  onSelect: (reply: string) => void
}

const getReplyIcon = (reply: string): string => {
  const lower = reply.toLowerCase()
  
  // Category icons
  if (lower.includes('appetizer')) return '🥗'
  if (lower.includes('main') && (lower.includes('course') || lower.includes('dish'))) return '🍽️'
  if (lower.includes('dessert')) return '🍰'
  if (lower.includes('beverage') || lower.includes('drink')) return '🥤'
  if (lower.includes('salad')) return '🥗'
  if (lower.includes('soup')) return '🍲'
  if (lower.includes('pasta')) return '🍝'
  if (lower.includes('pizza')) return '🍕'
  if (lower.includes('burger')) return '🍔'
  if (lower.includes('sandwich')) return '🥪'
  if (lower.includes('seafood') || lower.includes('fish')) return '🐟'
  if (lower.includes('steak') || lower.includes('meat')) return '🥩'
  if (lower.includes('chicken')) return '🍗'
  if (lower.includes('vegetarian') || lower.includes('vegan')) return '🌱'
  if (lower.includes('breakfast')) return '🍳'
  if (lower.includes('side')) return '🍟'
  
  // Action icons
  if (lower.includes('cart')) return '🛒'
  if (lower.includes('checkout')) return '✅'
  if (lower.includes('menu')) return '📋'
  if (lower.includes('special') || lower.includes('offer')) return '💸'
  if (lower.includes('order')) return '📦'
  if (lower.includes('add')) return '➕'
  if (lower.includes('remove')) return '🗑️'
  if (lower.includes('help')) return '❓'
  if (lower.includes('cancel')) return '❌'
  if (lower.includes('pay')) return '💳'
  
  return '💬'
}

export default function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="quick-replies">
      {replies.map((reply, index) => (
        <button
          key={index}
          className="quick-reply-btn"
          onClick={() => {
            console.log('Quick reply clicked:', reply);
            onSelect(reply);
          }}
        >
          <span className="reply-icon">{getReplyIcon(reply)}</span>
          {reply}
        </button>
      ))}
    </div>
  )
}
