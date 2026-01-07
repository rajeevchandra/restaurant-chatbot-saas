const SESSION_KEY = 'restaurant_chat_session_id'

export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY)
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  
  return sessionId
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
