interface QuickRepliesProps {
  replies: string[]
  onSelect: (reply: string) => void
}

export default function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="quick-replies">
      {replies.map((reply, index) => (
        <button
          key={index}
          className="quick-reply-btn"
          onClick={() => onSelect(reply)}
        >
          {reply}
        </button>
      ))}
    </div>
  )
}
