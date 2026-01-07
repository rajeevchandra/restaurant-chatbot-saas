// This file is the embed script that should be loaded on customer websites
// It looks for <script> tags with data-restaurant-slug attribute

(function() {
  // Find the script tag
  const scripts = document.getElementsByTagName('script')
  let restaurantSlug = ''
  
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
    if (script.src.includes('widget.js') || script.src.includes('embed.js')) {
      restaurantSlug = script.getAttribute('data-restaurant-slug') || ''
      break
    }
  }

  if (!restaurantSlug) {
    console.error('Restaurant slug not provided in widget script')
    return
  }

  // Create container
  const container = document.createElement('div')
  container.id = 'restaurant-chat-widget'
  document.body.appendChild(container)

  // Load widget styles and script
  const widgetScript = document.createElement('script')
  widgetScript.type = 'module'
  widgetScript.src = new URL('./index.tsx', import.meta.url).href
  widgetScript.onload = () => {
    // @ts-ignore
    if (window.RestaurantChatWidget) {
      // @ts-ignore
      window.RestaurantChatWidget.initWidget(restaurantSlug, container.id)
    }
  }
  document.body.appendChild(widgetScript)
})()
