import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './widget/Widget'

// Widget configuration interface
export interface WidgetConfig {
  restaurantSlug: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  primaryColor?: string
  brandName?: string
  apiUrl?: string
  zIndex?: number
}

console.log('Widget script loaded!')

// Enhanced initialization with full config support
export function initWidget(config: WidgetConfig | string, containerId?: string) {
  console.log('initWidget called with config:', config)
  
  // Backward compatibility: support old string-based initialization
  const widgetConfig: WidgetConfig = typeof config === 'string' 
    ? { restaurantSlug: config }
    : config

  // Find mount point (inside Shadow DOM or regular DOM)
  let container: HTMLElement | null = null
  
  if (containerId) {
    container = document.getElementById(containerId)
  } else {
    // Look for shadow root mount point
    const hostId = `restaurant-widget-${widgetConfig.restaurantSlug}`
    const host = document.getElementById(hostId)
    if (host?.shadowRoot) {
      container = host.shadowRoot.getElementById('widget-root')
    } else {
      // Fallback to regular DOM
      container = document.getElementById('restaurant-chat-widget')
    }
  }
  
  if (!container) {
    console.log('Container not found, creating new one')
    container = document.createElement('div')
    container.id = containerId || 'restaurant-chat-widget'
    document.body.appendChild(container)
  }

  // Apply custom primary color if provided
  if (widgetConfig.primaryColor && container) {
    container.style.setProperty('--widget-primary', widgetConfig.primaryColor)
  }

  console.log('Rendering widget to container:', container)
  const root = ReactDOM.createRoot(container)
  root.render(
    <React.StrictMode>
      <Widget 
        restaurantSlug={widgetConfig.restaurantSlug}
        brandName={widgetConfig.brandName}
        apiUrl={widgetConfig.apiUrl}
        primaryColor={widgetConfig.primaryColor}
      />
    </React.StrictMode>
  )
  console.log('Widget rendered!')
}

// Expose to window for embed script
declare global {
  interface Window {
    RestaurantWidget?: {
      instances: Map<string, any>
      init: typeof initWidget
      destroy: (containerId: string) => void
    }
    RestaurantChatWidget?: {
      initWidget: typeof initWidget
    }
  }
}

// Primary API: window.RestaurantWidget.init()
window.RestaurantWidget = {
  instances: new Map<string, any>(),
  init: initWidget,
  destroy: (containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      container.remove()
      window.RestaurantWidget?.instances.delete(containerId)
    }
  }
}

// Secondary API for backward compatibility
window.RestaurantChatWidget = {
  initWidget
}

// For development
if (import.meta.env.DEV) {
  console.log('DEV mode detected')
  const slug = (window as any).RESTAURANT_SLUG || 'demo-restaurant'
  console.log('Using restaurant slug:', slug)
  initWidget(slug)
}
