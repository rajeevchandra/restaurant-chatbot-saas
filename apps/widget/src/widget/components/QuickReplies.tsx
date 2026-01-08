interface QuickRepliesProps {
  replies: string[]
  onSelect: (reply: string) => void
}

const getReplyIcon = (reply: string): string => {
  const lower = reply.toLowerCase()
  if (lower.includes('cart')) return '🛒'
  if (lower.includes('checkout')) return '✅'
  if (lower.includes('menu')) return '📋'
  if (lower.includes('add')) return '➕'
  if (lower.includes('remove')) return '🗑️'
  if (lower.includes('help')) return '❓'
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
