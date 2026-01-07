import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './widget/Widget'

export function initWidget(restaurantSlug: string, containerId: string = 'restaurant-chat-widget') {
  let container = document.getElementById(containerId)
  
  if (!container) {
    container = document.createElement('div')
    container.id = containerId
    document.body.appendChild(container)
  }

  const root = ReactDOM.createRoot(container)
  root.render(
    <React.StrictMode>
      <Widget restaurantSlug={restaurantSlug} />
    </React.StrictMode>
  )
}

// For development
if (import.meta.env.DEV) {
  const slug = (window as any).RESTAURANT_SLUG || 'demo-restaurant'
  initWidget(slug)
}
