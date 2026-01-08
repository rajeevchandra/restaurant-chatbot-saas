# Restaurant Chatbot Widget

A commercial-grade, embeddable chatbot widget for restaurant ordering with menu browsing, cart management, checkout, and payment processing.

## 🚀 Quick Start

### For Restaurant Owners

Embed the widget on your website with a single line of code:

```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="your-restaurant"
        data-brand-name="Your Restaurant Name"
        data-primary-color="#667eea"></script>
```

**[📚 View Full Embed Guide →](./EMBED_GUIDE.md)**

**[🎯 See Implementation Details →](./IMPLEMENTATION_SUMMARY.md)**

**[🧪 Test Examples →](./embed-example.html)**

## ✨ Features

### Customer Experience
- 💬 Natural language ordering conversation
- 🍽️ Browse menu with images and descriptions
- 🛒 Add items to cart with quantity selector
- 📝 Simple checkout form (name, phone, email)
- 💳 Secure payment links
- 📦 Order status tracking
- ❌ Order cancellation

### Technical Features
- ⚡ **Shadow DOM Isolation** - Zero CSS conflicts
- 🎨 **Customizable Theming** - Match your brand colors
- 📱 **Mobile Responsive** - Works on all devices
- 🔒 **Secure** - XSS protection, CSP compatible
- 💾 **Session Persistence** - Cart saved across reloads
- 🌐 **Zero Dependencies** - Self-contained bundle
- 📦 **Small Bundle** - ~50KB gzipped

## 📋 Configuration

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-restaurant-slug` | ✅ Yes | - | Your unique restaurant ID |
| `data-position` | No | `bottom-right` | Widget position on page |
| `data-primary-color` | No | `#667eea` | Theme color (hex format) |
| `data-brand-name` | No | (slug) | Display name in chat |
| `data-api-url` | No | `localhost:3000` | Backend API endpoint |
| `data-z-index` | No | `9999` | CSS z-index value |

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
# Install dependencies
cd apps/widget
npm install

# Start development server
npm run dev
```

Widget runs on `http://localhost:3002` with hot reload.

### Build

```bash
npm run build
```

Creates production bundle in `dist/`:
- `widget.js` - Main React bundle
- `embed.js` - Embed loader script
- `style.css` - Widget styles

### Testing

Open `test-embed.html` in your browser to see the widget in action.

## 📖 Documentation

- **[Complete Embed Guide](./EMBED_GUIDE.md)** - Full integration documentation
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical architecture
- **[Visual Examples](./embed-example.html)** - Integration examples with code

## 🏗️ Architecture

```
Widget Embed System
├── embed.ts          - Embed loader (reads data-* attributes)
├── index.tsx         - Widget initialization
└── widget/
    ├── Widget.tsx    - Main React component
    └── components/   - UI components
        ├── ChatPanel.tsx
        ├── MessageList.tsx
        ├── MenuItemCard.tsx
        ├── CartSummary.tsx
        ├── CheckoutForm.tsx
        └── PaymentLink.tsx
```

### Shadow DOM Isolation

The widget uses Shadow DOM to prevent CSS conflicts:

```html
<div id="restaurant-widget-demo-bistro">
  #shadow-root (open)
  └── <div id="widget-root">
      └── [React App Here]
</div>
```

## 🎨 Customization

### Basic (Data Attributes)

```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="cafe-deluxe"
        data-position="bottom-left"
        data-primary-color="#10b981"
        data-brand-name="Café Deluxe"></script>
```

### Advanced (JavaScript API)

```javascript
window.RestaurantWidget.init({
  restaurantSlug: 'my-restaurant',
  position: 'bottom-right',
  primaryColor: '#667eea',
  brandName: 'My Restaurant',
  apiUrl: 'https://api.example.com'
});
```

## 🔧 API Integration

The widget communicates with your backend via these endpoints:

- `POST /api/v1/bot/message` - Send/receive messages
- `GET /api/v1/restaurants/:slug/menu` - Fetch menu
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order status
- `POST /api/v1/orders/:id/cancel` - Cancel order

See `@restaurant-saas/shared` package for API client details.

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

**Note:** Requires Shadow DOM support (IE11 not supported).

## 📦 Production Deployment

### 1. Build
```bash
npm run build
```

### 2. Upload to CDN
Upload `dist/` contents to your CDN (CloudFront, Cloudflare, etc.)

### 3. Cache Headers
```
Cache-Control: public, max-age=31536000, immutable
```

### 4. Embed Script
```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="your-restaurant"></script>
```

## 🐛 Troubleshooting

### Widget not appearing?
1. Check browser console for errors
2. Verify `data-restaurant-slug` is correct
3. Ensure API URL is accessible
4. Confirm `widget.js` loaded successfully

### Styling conflicts?
The widget uses Shadow DOM for isolation. If issues persist:
1. Verify Shadow DOM is supported
2. Check z-index conflicts
3. Ensure no parent `overflow: hidden`

### CORS errors?
1. Configure API to allow host domain
2. Set `Access-Control-Allow-Origin` headers
3. Use correct `data-api-url` for environment

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

- **Documentation:** [EMBED_GUIDE.md](./EMBED_GUIDE.md)
- **Issues:** Report on GitHub
- **Email:** support@example.com

---

**Built with ❤️ using React, TypeScript, and Vite**
