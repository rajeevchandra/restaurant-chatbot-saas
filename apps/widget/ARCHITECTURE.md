# Widget Architecture Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Customer's Website                          │
│                                                                 │
│  <html>                                                         │
│    <body>                                                       │
│      <!-- Their content -->                                     │
│      <h1>Welcome to My Site</h1>                               │
│      <p>Check out our menu!</p>                                │
│                                                                 │
│      <!-- Widget Embed Script -->                              │
│      <script src="https://cdn.com/widget.js"                  │
│              data-restaurant-slug="demo-bistro"                │
│              data-brand-name="Demo Bistro"                     │
│              data-primary-color="#667eea"></script>            │
│    </body>                                                      │
│  </html>                                                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Loads widget.js
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     embed.ts (Loader)                           │
│                                                                 │
│  1. Find <script> tag with data-* attributes                   │
│  2. Read configuration (slug, position, color, etc.)           │
│  3. Create Shadow DOM host element                             │
│  4. Apply positioning styles                                   │
│  5. Call initWidget() from index.tsx                           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Initializes
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    index.tsx (Init)                             │
│                                                                 │
│  1. Accept WidgetConfig                                        │
│  2. Find mount point (Shadow DOM or regular)                   │
│  3. Apply custom theme colors                                  │
│  4. Mount React app with ReactDOM.createRoot()                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Mounts
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Widget.tsx (Main React Component)                  │
│                                                                 │
│  Props:                                                         │
│    - restaurantSlug                                            │
│    - brandName                                                 │
│    - apiUrl                                                    │
│    - primaryColor                                              │
│                                                                 │
│  State:                                                         │
│    - messages, cart, quickReplies, cards                       │
│    - showCheckoutForm, paymentData                            │
│    - loading, isOpen                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Shadow DOM Isolation

```
Customer's Website DOM
│
├── <html>
│   └── <body>
│       ├── <!-- Customer's content -->
│       ├── <h1>Their Site</h1>
│       └── <!-- Widget injected here -->
│           │
│           └── <div id="restaurant-widget-demo-bistro">
│                   │
│                   └── #shadow-root (mode: open)  ← CSS ISOLATION
│                       │
│                       └── <div id="widget-root">
│                           │
│                           └── [React App Tree]
│                               ├── <div class="widget-container">
│                               │   ├── Chat Launcher
│                               │   └── <ChatPanel>
│                               │       ├── Header
│                               │       ├── Messages
│                               │       ├── Menu Cards
│                               │       ├── Cart
│                               │       └── Input
│                               └── <style> (scoped)
```

**Key Point:** Styles inside `#shadow-root` cannot affect customer's website!

## Component Hierarchy

```
<Widget>
│
├── State Management
│   ├── messages[]
│   ├── cart[]
│   ├── quickReplies[]
│   ├── cards[]
│   ├── showCheckoutForm
│   └── paymentData
│
├── API Client
│   └── communicates with backend
│
└── Render
    │
    ├── Chat Launcher Button (when closed)
    │   └── 💬 icon with badge
    │
    └── <ChatPanel> (when open)
        │
        ├── Header
        │   ├── Restaurant Avatar (🍽️)
        │   ├── Brand Name (props.brandName)
        │   ├── Online Status (pulse dot)
        │   └── Close Button (✕)
        │
        ├── <MessageList>
        │   ├── Bot Messages (left)
        │   └── User Messages (right)
        │
        ├── Content Area (conditional)
        │   │
        │   ├── IF showCheckoutForm:
        │   │   └── <CheckoutForm>
        │   │       ├── Name Input
        │   │       ├── Phone Input
        │   │       ├── Email Input (optional)
        │   │       ├── Submit Button
        │   │       └── Cancel Button
        │   │
        │   └── ELSE:
        │       ├── <PaymentLink> (if paymentData exists)
        │       │   ├── Amount Display
        │       │   ├── Order ID
        │       │   ├── "Pay Securely" Link
        │       │   └── "Copy Link" Button
        │       │
        │       ├── <MenuItemCard>[] (if cards exist)
        │       │   ├── Image
        │       │   ├── Title & Description
        │       │   ├── Price
        │       │   ├── Quantity Selector (+/-)
        │       │   └── "Add to Cart" Button
        │       │
        │       └── <QuickReplies> (if exists)
        │           └── Chips with icons
        │
        ├── <CartSummary> (if cart not empty AND no paymentData)
        │   ├── Item List
        │   ├── Subtotal
        │   ├── Tax
        │   └── Total
        │
        └── <MessageInput> (if no paymentData)
            ├── Text Input
            └── Send Button
```

## Data Flow

```
User Action
    │
    ▼
Component Handler
    │
    ▼
sendMessage(text)
    │
    ▼
ApiClient.sendBotMessage()
    │
    ├── POST /api/v1/bot/message
    │   Headers: { sessionId }
    │   Body: { message, restaurantSlug }
    │
    ▼
Backend Bot Engine
    │
    ├── Detect Intent
    ├── Process State
    ├── Update Session
    └── Generate Response
    │
    ▼
Response
    │
    ├── text: string
    ├── quickReplies: string[]
    ├── cards: Card[]
    └── data: any
    │
    ▼
Widget Updates State
    │
    ├── setMessages()
    ├── setQuickReplies()
    ├── setCards()
    ├── setCart()
    ├── setShowCheckoutForm()
    └── setPaymentData()
    │
    ▼
React Re-renders
    │
    └── UI Updates
```

## Configuration Flow

```
1. Script Tag Attributes
   ↓
   data-restaurant-slug="demo-bistro"
   data-position="bottom-right"
   data-primary-color="#667eea"
   data-brand-name="Demo Bistro"
   ↓
2. embed.ts reads via script.dataset
   ↓
3. Creates WidgetConfig object
   ↓
   {
     restaurantSlug: "demo-bistro",
     position: "bottom-right",
     primaryColor: "#667eea",
     brandName: "Demo Bistro",
     apiUrl: "http://localhost:3000",
     zIndex: 9999
   }
   ↓
4. Passes to initWidget(config)
   ↓
5. Widget.tsx receives as props
   ↓
6. Applied to:
   - ChatPanel.brandName
   - ApiClient.apiUrl
   - CSS variables (primaryColor)
   - Container positioning
```

## Build Process

```
Source Files
│
├── src/embed.ts          → Build → dist/embed.js
├── src/index.tsx         → Build → dist/widget.js
├── src/widget/Widget.tsx → Build ↗
└── src/widget/styles/    → Build → dist/style.css
    └── widget.css

Vite Configuration:
├── Entry Points: embed.ts, index.tsx
├── Format: IIFE (Immediately Invoked Function Expression)
├── Output: widget.js, embed.js
└── Bundle: React + all dependencies (self-contained)
```

## API Communication

```
Widget                          Backend API
  │                                 │
  ├─ POST /api/v1/bot/message ────→│
  │  { message, restaurantSlug }   │
  │                                 │
  │←─ Response ─────────────────────┤
  │  {                              │
  │    sessionId,                   │
  │    text,                        │
  │    quickReplies,                │
  │    cards,                       │
  │    data: {                      │
  │      cartItems,                 │
  │      paymentLink,               │
  │      orderId                    │
  │    }                            │
  │  }                              │
  │                                 │
  ├─ GET /api/v1/restaurants/:slug/menu →│
  │                                 │
  │←─ { items: MenuItem[] } ────────┤
  │                                 │
  ├─ POST /api/v1/orders ─────────→│
  │  { restaurantId, items, ... }  │
  │                                 │
  │←─ { order: Order } ─────────────┤
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│          Customer's Website                 │
│  (untrusted environment)                    │
│                                             │
│  ┌───────────────────────────────────┐    │
│  │   Shadow DOM Boundary             │    │
│  │   (CSS isolated)                  │    │
│  │                                   │    │
│  │   ┌─────────────────────────┐    │    │
│  │   │   Widget (trusted)      │    │    │
│  │   │   - XSS protected       │    │    │
│  │   │   - React sanitization  │    │    │
│  │   │   - CSP compatible      │    │    │
│  │   │   - No eval()           │    │    │
│  │   └─────────────────────────┘    │    │
│  └───────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                   │
                   │ HTTPS only
                   ▼
┌─────────────────────────────────────────────┐
│          Backend API (secure)               │
│  - Tenant isolation                         │
│  - Rate limiting                            │
│  - Input validation (Zod)                   │
│  - Session tokens                           │
│  - CORS configured                          │
└─────────────────────────────────────────────┘
```

## Positioning System

```
Customer's Viewport
┌─────────────────────────────────────────────┐
│                                             │
│  top-left          top-right               │
│     ╔═══╗             ╔═══╗                │
│     ║ 💬 ║             ║ 💬 ║                │
│     ╚═══╝             ╚═══╝                │
│                                             │
│                                             │
│         [Customer's Content]               │
│                                             │
│                                             │
│  bottom-left    bottom-right               │
│     ╔═══╗             ╔═══╗                │
│     ║ 💬 ║             ║ 💬 ║  ← Default    │
│     ╚═══╝             ╚═══╝                │
└─────────────────────────────────────────────┘

CSS Applied by embed.ts:
position: fixed;
z-index: 9999;
[position]-[side]: 20px;  // e.g., bottom: 20px; right: 20px;
```

## Session Management

```
┌─────────────────────────────────────────────┐
│          Browser localStorage               │
│                                             │
│  Key: restaurantChatSessionId              │
│  Value: sess_1767833557337_i5totjj16id     │
└─────────────────────────────────────────────┘
                   │
                   ├─ Read on init
                   ├─ Sent with every API call
                   └─ Persists across page loads
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          Backend Session Store              │
│          (Prisma BotSession)                │
│                                             │
│  {                                          │
│    id: "sess_...",                         │
│    restaurantId: "...",                    │
│    state: "BROWSING_MENU",                 │
│    context: { cart: [...] },               │
│    lastActivity: Date                      │
│  }                                          │
└─────────────────────────────────────────────┘
```

---

## Summary

The widget architecture is designed for:

✅ **Isolation** - Shadow DOM prevents CSS conflicts
✅ **Security** - XSS protection, CSP compatible
✅ **Performance** - Self-contained, optimized bundle
✅ **Flexibility** - Configurable via data attributes
✅ **Maintainability** - Clear component hierarchy
✅ **Scalability** - Multiple instances supported

**Result:** A commercial-grade embed system that works everywhere!
