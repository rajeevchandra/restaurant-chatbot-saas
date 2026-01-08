// Commercial-grade embeddable widget loader
// Supports Shadow DOM isolation, theming, positioning, and multiple configuration options

export interface WidgetConfig {
  restaurantSlug: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  primaryColor?: string
  brandName?: string
  apiUrl?: string
  zIndex?: number
}

interface RestaurantWidgetAPI {
  instances: Map<string, any>
  init: (config: WidgetConfig) => void
  destroy: (containerId: string) => void
}

// Default configuration
const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  position: 'bottom-right',
  primaryColor: '#667eea',
  apiUrl: 'http://localhost:3000',
  zIndex: 9999
}

// Global namespace (only one pollution point)
declare global {
  interface Window {
    RestaurantWidget?: RestaurantWidgetAPI
  }
}

(function() {
  // Prevent multiple initialization
  if (window.RestaurantWidget) {
    return
  }

  const instances = new Map<string, any>()

  // Find the current script tag and extract configuration
  function getScriptConfig(): WidgetConfig | null {
    const scripts = document.getElementsByTagName('script')
    
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i]
      if (script.src.includes('widget.js') || script.src.includes('embed.js')) {
        const dataset = script.dataset
        const slug = dataset.restaurantSlug
        
        if (!slug) {
          console.error('[RestaurantWidget] data-restaurant-slug attribute is required')
          return null
        }

        return {
          restaurantSlug: slug,
          position: (dataset.position as any) || DEFAULT_CONFIG.position,
          primaryColor: dataset.primaryColor || DEFAULT_CONFIG.primaryColor,
          brandName: dataset.brandName || slug,
          apiUrl: dataset.apiUrl || DEFAULT_CONFIG.apiUrl,
          zIndex: dataset.zIndex ? parseInt(dataset.zIndex) : DEFAULT_CONFIG.zIndex
        }
      }
    }
    
    return null
  }

  // Create isolated container with Shadow DOM
  function createIsolatedContainer(config: WidgetConfig): HTMLElement {
    const containerId = `restaurant-widget-${config.restaurantSlug}`
    
    // Check if already exists
    let existing = document.getElementById(containerId)
    if (existing) {
      existing.remove()
    }

    // Create host element
    const host = document.createElement('div')
    host.id = containerId
    host.style.cssText = `
      position: fixed;
      ${getPositionStyles(config.position!)}
      z-index: ${config.zIndex};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `

    // Attach Shadow DOM for CSS isolation
    const shadowRoot = host.attachShadow({ mode: 'open' })

    // Create mount point inside shadow DOM
    const mountPoint = document.createElement('div')
    mountPoint.id = 'widget-root'
    mountPoint.dataset.restaurantSlug = config.restaurantSlug
    mountPoint.dataset.brandName = config.brandName
    mountPoint.dataset.primaryColor = config.primaryColor
    mountPoint.dataset.apiUrl = config.apiUrl
    
    shadowRoot.appendChild(mountPoint)
    document.body.appendChild(host)

    return host
  }

  // Get CSS positioning based on config
  function getPositionStyles(position: string): string {
    switch (position) {
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;'
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;'
      case 'top-right':
        return 'top: 20px; right: 20px;'
      case 'top-left':
        return 'top: 20px; left: 20px;'
      default:
        return 'bottom: 20px; right: 20px;'
    }
  }

  // Initialize widget
  function init(config: WidgetConfig) {
    const containerId = `restaurant-widget-${config.restaurantSlug}`
    
    if (instances.has(containerId)) {
      console.warn(`[RestaurantWidget] Instance for ${config.restaurantSlug} already exists`)
      return
    }

    try {
      const container = createIsolatedContainer(config)
      instances.set(containerId, { container, config })

      // Load and mount React widget
      // This will be handled by index.tsx when it loads
      console.log('[RestaurantWidget] Initialized:', config)
    } catch (error) {
      console.error('[RestaurantWidget] Initialization failed:', error)
    }
  }

  // Destroy widget instance
  function destroy(containerId: string) {
    const instance = instances.get(containerId)
    if (instance) {
      instance.container.remove()
      instances.delete(containerId)
      console.log('[RestaurantWidget] Destroyed:', containerId)
    }
  }

  // Expose global API
  window.RestaurantWidget = {
    instances,
    init,
    destroy
  }

  // Auto-initialize from script tag
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const config = getScriptConfig()
      if (config) {
        init(config)
      }
    })
  } else {
    const config = getScriptConfig()
    if (config) {
      init(config)
    }
  }
})()

// Export for TypeScript module usage
export default window.RestaurantWidget
