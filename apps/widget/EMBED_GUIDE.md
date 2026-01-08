# Restaurant Chatbot Widget - Commercial Embed System

## Overview

This is a production-ready, plug-and-play chatbot widget that restaurants can embed on their websites with a single `<script>` tag. The widget provides a complete ordering experience with menu browsing, cart management, checkout, and payment processing.

## Quick Start

### For Restaurant Owners (Embedding)

Add this single line to your website's HTML (before the closing `</body>` tag):

```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="your-restaurant-slug"
        data-position="bottom-right"
        data-primary-color="#667eea"
        data-brand-name="Your Restaurant Name"></script>
```

**That's it!** The widget will automatically load and position itself on your page.

## Configuration Options

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `data-restaurant-slug` | string | ✅ Yes | - | Your unique restaurant identifier |
| `data-position` | string | No | `bottom-right` | Widget position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `data-primary-color` | string | No | `#667eea` | Theme color (hex format) to match your brand |
| `data-brand-name` | string | No | (uses slug) | Display name shown in chat header |
| `data-api-url` | string | No | `http://localhost:3000` | Backend API endpoint |
| `data-z-index` | number | No | `9999` | CSS z-index for widget positioning |

## Examples

### Minimal Setup (Required Only)
```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="my-restaurant"></script>
```

### Custom Branding & Position
```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="cafe-deluxe"
        data-position="bottom-left"
        data-primary-color="#10b981"
        data-brand-name="Café Deluxe"></script>
```

### Production Configuration
```html
<script src="https://cdn.yourcompany.com/widget.js"
        data-restaurant-slug="pizza-palace"
        data-position="bottom-right"
        data-primary-color="#ef4444"
        data-brand-name="Pizza Palace"
        data-api-url="https://api.yourcompany.com"></script>
```

## Architecture

### Technical Features

#### 1. **Shadow DOM Isolation**
- Widget uses Shadow DOM to encapsulate styles
- Zero CSS conflicts with host website
- Complete style independence

#### 2. **Zero Global Pollution**
- Single global namespace: `window.RestaurantWidget`
- No library conflicts
- Safe to embed on any website

#### 3. **Responsive Design**
- Mobile-first approach
- Full-screen on mobile devices
- Floating panel on desktop
- Touch-friendly interface

#### 4. **Session Persistence**
- Conversations saved in localStorage
- Cart persists across page loads
- No data loss on refresh

#### 5. **Security**
- Content Security Policy (CSP) compatible
- Secure iframe for payment links
- XSS protection built-in

### File Structure

```
apps/widget/
├── src/
│   ├── embed.ts              # Main embed loader script
│   ├── index.tsx             # Widget initialization
│   └── widget/
│       ├── Widget.tsx        # Main React component
│       ├── components/       # UI components
│       │   ├── ChatPanel.tsx
│       │   ├── MessageList.tsx
│       │   ├── MenuItemCard.tsx
│       │   ├── CheckoutForm.tsx
│       │   └── PaymentLink.tsx
│       └── styles/
│           └── widget.css    # Isolated widget styles
├── embed-example.html        # Integration examples
├── vite.config.ts           # Build configuration
└── README.md                # This file
```

## Development

### Build for Production

```bash
cd apps/widget
npm run build
```

This creates:
- `dist/widget.js` - Main widget bundle
- `dist/embed.js` - Embed loader script
- `dist/style.css` - Compiled styles

### Local Development

```bash
npm run dev
```

Widget runs on `http://localhost:3002` with hot reload.

### Testing the Embed

1. Build the widget: `npm run build`
2. Serve the dist folder (or use a CDN)
3. Open `embed-example.html` in a browser
4. The widget should appear in the specified position

## Advanced Usage

### Programmatic Control

For advanced integrations, you can control the widget via JavaScript:

```javascript
// Initialize manually
window.RestaurantWidget.init({
  restaurantSlug: 'my-restaurant',
  position: 'bottom-right',
  primaryColor: '#667eea',
  brandName: 'My Restaurant',
  apiUrl: 'https://api.example.com',
  zIndex: 9999
});

// Destroy widget instance
window.RestaurantWidget.destroy('restaurant-widget-my-restaurant');

// Access active instances
console.log(window.RestaurantWidget.instances);
```

### Multiple Instances

The system supports multiple widget instances (e.g., for multi-location restaurants):

```html
<script>
  window.RestaurantWidget.init({
    restaurantSlug: 'location-downtown',
    position: 'bottom-right',
    brandName: 'Downtown Location'
  });
  
  window.RestaurantWidget.init({
    restaurantSlug: 'location-uptown',
    position: 'bottom-left',
    brandName: 'Uptown Location'
  });
</script>
```

## API Integration

The widget communicates with your backend API via the `ApiClient` from `@restaurant-saas/shared`. 

### Required Endpoints

Your API must implement these endpoints:

- `POST /api/v1/bot/message` - Send messages and receive responses
- `GET /api/v1/restaurants/:slug/menu` - Fetch menu items
- `POST /api/v1/orders` - Create new orders
- `GET /api/v1/orders/:id` - Get order status
- `POST /api/v1/orders/:id/cancel` - Cancel orders

### Response Format

```typescript
{
  sessionId: string
  text: string
  quickReplies?: string[]
  cards?: Array<{
    title: string
    description: string
    image?: string
    actions: Array<{ label: string, intent: string }>
  }>
  data?: any
}
```

## Customization

### Theming

The widget uses CSS custom properties for theming. You can override these:

```html
<style>
  #restaurant-widget-my-restaurant {
    --widget-primary: #10b981;
    --widget-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --widget-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
  }
</style>
```

### Positioning

Use `data-position` attribute:
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

Or manually position with CSS:

```css
#restaurant-widget-my-restaurant {
  position: fixed !important;
  bottom: 100px !important;
  right: 40px !important;
}
```

## Features

### Customer Features
- 💬 Natural language conversation
- 🍽️ Browse menu with images
- 🛒 Add items to cart with quantity selector
- 📝 Checkout with contact information
- 💳 Secure payment links
- 📦 Order tracking
- ❌ Order cancellation
- 💰 Real-time cart totals with tax

### Business Features
- 🎨 Brand customization (colors, name)
- 📱 Mobile-responsive design
- 🔒 Shadow DOM isolation (no CSS conflicts)
- ⚡ Fast loading and performance
- 📊 Session tracking
- 🔄 Cart persistence
- 🌐 Multi-language support (future)

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

**Note:** Shadow DOM is required. IE11 is not supported.

## Performance

- Initial load: ~50KB gzipped
- Time to interactive: <1s on 3G
- Lazy loading of images
- Optimized React bundle
- No external dependencies at runtime

## Security

- ✅ Shadow DOM prevents CSS injection
- ✅ Content Security Policy compatible
- ✅ XSS protection via React
- ✅ Secure payment link handling
- ✅ Session tokens in localStorage only
- ✅ No sensitive data in URL

## Troubleshooting

### Widget not appearing

1. Check browser console for errors
2. Verify `data-restaurant-slug` is correct
3. Ensure API URL is accessible
4. Check that `widget.js` loaded successfully

### Styling conflicts

The widget uses Shadow DOM to prevent conflicts. If you see styling issues:
1. Verify Shadow DOM is supported in the browser
2. Check z-index conflicts
3. Ensure no parent elements have `overflow: hidden`

### CORS errors

If you see CORS errors:
1. Configure your API to allow the host domain
2. Set proper `Access-Control-Allow-Origin` headers
3. Use the correct `data-api-url` for your environment

## Production Checklist

Before deploying to production:

- [ ] Build optimized bundle: `npm run build`
- [ ] Upload to CDN (CloudFront, Cloudflare, etc.)
- [ ] Set correct `data-api-url` for production
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify payment flow end-to-end
- [ ] Set up error monitoring
- [ ] Configure CSP headers
- [ ] Enable gzip compression
- [ ] Set cache headers for static assets

## CDN Deployment

### Recommended CDN Setup

```
https://cdn.yourcompany.com/
├── widget/
│   ├── v1/
│   │   ├── widget.js        (main bundle)
│   │   ├── embed.js         (loader)
│   │   └── style.css        (styles)
│   └── latest/
│       ├── widget.js
│       ├── embed.js
│       └── style.css
```

### Cache Headers

```
Cache-Control: public, max-age=31536000, immutable
```

For versioned files (`/v1/widget.js`)

```
Cache-Control: public, max-age=300
```

For `/latest/widget.js` (5-minute cache)

## Support

- **Documentation:** https://docs.yourcompany.com
- **Email:** support@yourcompany.com
- **Issues:** https://github.com/yourcompany/restaurant-widget/issues

## License

Proprietary - All rights reserved

---

**Built with ❤️ for restaurants everywhere**
