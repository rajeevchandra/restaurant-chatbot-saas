# Restaurant Chatbot SaaS Platform

A complete multi-tenant restaurant chatbot SaaS platform built with a modern monorepo architecture. Enables restaurants to deploy AI-powered chat widgets for menu browsing, order placement, and payment processing.

## 🏗️ Architecture

### Monorepo Structure
```
restaurant-chatbot-saas/
├── apps/
│   ├── api/              # Node.js + Express + TypeScript backend
│   ├── admin/            # Next.js admin dashboard
│   └── widget/           # Vite + React customer chat widget
├── packages/
│   └── shared/           # Shared types, validation, and API client
├── docker-compose.yml
└── README.md
```

## 🚀 Tech Stack

### Backend (API)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 16
- **Auth**: JWT (access + refresh tokens)
- **Validation**: Zod

### Admin Dashboard
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks

### Customer Widget
- **Build Tool**: Vite
- **Framework**: React 18
- **Language**: TypeScript
- **Embedding**: Standalone script

### Shared Package
- **Types**: TypeScript interfaces and enums
- **Validation**: Zod schemas
- **API Client**: Type-safe fetch wrapper

## 🎯 Core Features

### Multi-Tenancy
- Each restaurant is a separate tenant with isolated data
- Restaurant slug-based routing for public endpoints
- All queries automatically scoped by `restaurant_id`

### Role-Based Access Control (RBAC)
- **OWNER**: Full access, payment configuration
- **MANAGER**: Menu, inventory, order management
- **STAFF**: Update order status only

### Order Lifecycle
State machine with enforced transitions:
```
CREATED → PAYMENT_PENDING → PAID → ACCEPTED → 
PREPARING → READY → COMPLETED

Cancellable: CREATED, PAYMENT_PENDING, PAID
```

### Payment System
- **Modular Design**: Adapter pattern for multiple providers
- **Supported Providers**: Stripe, Square (placeholders ready)
- **Restaurant-Level Config**: Each restaurant uses their own credentials
- **Webhooks**: Signature verification endpoints

### Bot Engine
- **Deterministic FSM**: Finite-state machine for conversation flow
- **Session Management**: Persistent session state in database
- **States**: GREETING, BROWSING_MENU, BUILDING_CART, CHECKOUT, PAYMENT, ORDER_PLACED, ORDER_STATUS
- **Cart Management**: In-session cart with price calculation

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **pnpm**: v8.x or higher
- **Docker**: Latest version (optional, for containerized setup)
- **PostgreSQL**: v16 (if not using Docker)

## 🛠️ Local Development Setup

### 1. Clone and Install

```powershell
# Clone the repository
git clone <repository-url>
cd restaurant-chatbot-saas

# Install pnpm globally if not installed
npm install -g pnpm@8.15.0

# Install all dependencies
pnpm install
```

### 2. Environment Configuration

```powershell
# Copy example env file
cp .env.example .env

# Edit .env with your settings
notepad .env
```

**Required Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_saas
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000
```

### 3. Database Setup

```powershell
# Start PostgreSQL (if using Docker)
docker run -d `
  --name postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=restaurant_saas `
  -p 5432:5432 `
  postgres:16-alpine

# Generate Prisma client
cd apps/api
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with demo data
pnpm db:seed

cd ../..
```

### 4. Start Development Servers

**Option A: All services at once (recommended)**
```powershell
pnpm dev
```

**Option B: Individual services**
```powershell
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Admin Dashboard
cd apps/admin
pnpm dev

# Terminal 3 - Widget
cd apps/widget
pnpm dev
```

### 5. Access Applications

- **API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **Widget**: http://localhost:3002

**Demo Credentials:**
- Email: `owner@demo.com`
- Password: `password123`
- Restaurant Slug: `demo-restaurant`

## 🐳 Docker Setup

### Start All Services

```powershell
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

Services will be available at the same URLs as local development.

## 📁 Project Structure Details

### API (`apps/api/`)
```
src/
├── config/              # Environment configuration
├── db/                  # Prisma client
├── middleware/          # Auth, validation, tenant resolution
├── modules/
│   ├── auth/           # Login, JWT, refresh tokens
│   ├── restaurants/    # Restaurant management
│   ├── menu/           # Menu items, categories
│   ├── inventory/      # Stock management
│   ├── orders/         # Order CRUD + state machine
│   ├── payments/       # Payment adapters + config
│   ├── webhooks/       # Payment provider webhooks
│   └── bot/            # Chatbot engine + public routes
├── utils/              # Helper functions
├── app.ts              # Express app setup
└── server.ts           # Server entry point

prisma/
├── schema.prisma       # Database schema
├── migrations/         # Migration files
└── seed.ts             # Seed data script
```

### Admin Dashboard (`apps/admin/`)
```
src/
├── app/
│   ├── login/          # Authentication page
│   └── admin/          # Protected admin routes
│       ├── page.tsx    # Dashboard
│       ├── menu/       # Menu management
│       ├── inventory/  # Inventory management
│       ├── orders/     # Order management
│       ├── payments/   # Payment config
│       └── settings/   # Restaurant settings
├── components/         # Reusable UI components
└── lib/                # API client, auth helpers
```

### Widget (`apps/widget/`)
```
src/
├── widget/
│   ├── Widget.tsx      # Main widget component
│   ├── components/     # Chat UI components
│   └── styles/         # Widget CSS
├── lib/                # API client, session management
├── index.tsx           # Widget initialization
└── embed.ts            # Embeddable script
```

### Shared Package (`packages/shared/`)
```
src/
├── types.ts            # TypeScript types and interfaces
├── validation.ts       # Zod validation schemas
└── api.ts              # Type-safe API client
```

## 🔐 Authentication Flow

1. User logs in via `/api/auth/login`
2. Server validates credentials (bcrypt)
3. Server issues:
   - JWT access token (15min, in response body)
   - Refresh token (7 days, httpOnly cookie)
4. Client stores access token in localStorage/cookies
5. Client includes access token in `Authorization: Bearer <token>` header
6. When access token expires, client calls `/api/auth/refresh`
7. Server validates refresh token cookie and issues new access token

## 🛒 Order Flow

### Customer Perspective (Widget)
1. Opens chat widget on restaurant website
2. Bot greets and offers menu
3. Customer browses menu, adds items to cart
4. Customer proceeds to checkout
5. Provides contact details
6. Bot creates order (status: CREATED)
7. Customer clicks payment link
8. Payment processed (status: PAYMENT_PENDING → PAID)
9. Restaurant staff accepts order (status: ACCEPTED)
10. Order lifecycle continues until COMPLETED

### Restaurant Perspective (Admin)
1. New order notification
2. Staff views order details
3. Accepts order (PAID → ACCEPTED)
4. Updates status as order progresses
5. Marks as READY when prepared
6. Marks as COMPLETED when delivered/picked up

## 💳 Payment Integration

### Adding Stripe

1. Go to Admin → Payments
2. Select "Stripe" as provider
3. Enter:
   - Publishable Key: `pk_test_...`
   - Secret Key: `sk_test_...`
   - Webhook Secret: `whsec_...`
4. Save configuration

### Adding Square

1. Go to Admin → Payments
2. Select "Square" as provider
3. Enter:
   - Application ID: `sq0idp-...`
   - Access Token: `EAAAl...`
4. Save configuration

**Note**: Current implementation has placeholder adapters. Production requires:
- Implementing actual Stripe/Square SDK calls
- Encrypting secret keys before storage
- Setting up webhook endpoints with providers

## 🤖 Chatbot Customization

Current bot uses simple keyword matching. To enhance:

### Option 1: Rule-Based Enhancement
Edit `apps/api/src/modules/bot/engine.ts`:
- Add more intent patterns
- Expand state transitions
- Add menu item search logic

### Option 2: NLU Integration
Integrate services like:
- Dialogflow
- Rasa
- Wit.ai
- Custom ML model

Replace `processMessage()` method with NLU-based intent detection.

## 🎨 Widget Embedding

Add to any website:

```html
<script 
  src="http://localhost:3002/widget.js"
  data-restaurant-slug="demo-restaurant">
</script>
```

**Customization Options (Future Enhancement):**
```html
<script 
  src="http://localhost:3002/widget.js"
  data-restaurant-slug="demo-restaurant"
  data-primary-color="#667eea"
  data-position="bottom-left"
  data-greeting="Hi! How can I help you today?">
</script>
```

## 📊 Database Schema

### Key Tables

**restaurants**: Tenant data
**restaurant_users**: Admin users with roles
**menu_categories**: Menu sections
**menu_items**: Products with pricing
**menu_item_options**: Customization options (size, toppings, etc.)
**menu_item_option_values**: Available option choices
**inventory**: Stock levels per item
**orders**: Order headers
**order_items**: Order line items
**payments**: Payment transactions
**restaurant_payment_configs**: Per-tenant payment credentials
**bot_sessions**: Conversation state storage

## 🧪 Testing

```powershell
# API tests (TODO)
cd apps/api
pnpm test

# Admin tests (TODO)
cd apps/admin
pnpm test

# Widget tests (TODO)
cd apps/widget
pnpm test
```

## 🚀 Deployment

### Environment Setup

1. Set production environment variables
2. Use strong JWT secrets
3. Configure production database
4. Set up SSL certificates
5. Configure payment provider webhooks

### Build for Production

```powershell
# Build all packages
pnpm build

# Or build individually
cd packages/shared && pnpm build
cd apps/api && pnpm build
cd apps/admin && pnpm build
cd apps/widget && pnpm build
```

### Docker Production Deployment

```powershell
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Platform-Specific Deployment

**API**: Deploy to Railway, Render, AWS ECS, Google Cloud Run
**Admin**: Deploy to Vercel, Netlify, AWS Amplify
**Widget**: Deploy to CDN (Cloudflare, AWS CloudFront)
**Database**: Use managed PostgreSQL (AWS RDS, Supabase, Neon)

## 📝 API Endpoints

### Public Endpoints
- `GET /api/public/restaurants/:slug/menu` - Get restaurant menu
- `POST /api/public/restaurants/:slug/bot/message` - Send bot message

### Auth Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Protected Endpoints (Require Auth)
- `GET /api/restaurant` - Get restaurant details
- `GET /api/menu` - Get menu with categories
- `POST /api/menu/items` - Create menu item
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/payments/config` - Get payment config
- `PUT /api/payments/config` - Update payment config

### Webhook Endpoints
- `POST /api/webhooks/stripe` - Stripe webhook
- `POST /api/webhooks/square` - Square webhook

## 🔧 Configuration

### Prisma Studio (Database GUI)

```powershell
cd apps/api
pnpm db:studio
```

Opens at http://localhost:5555

### TypeScript Compilation

```powershell
# Check types across all packages
pnpm typecheck

# Or individually
cd packages/shared && pnpm typecheck
cd apps/api && pnpm typecheck
```

## 🐛 Troubleshooting

### Database Connection Issues
```powershell
# Check if PostgreSQL is running
docker ps | findstr postgres

# Restart database
docker restart postgres
```

### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Prisma Client Out of Sync
```powershell
cd apps/api
pnpm db:generate
```

### Module Resolution Issues
```powershell
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## 📚 Next Implementation Steps

### High Priority
- [ ] Implement actual Stripe payment processing
- [ ] Implement actual Square payment processing
- [ ] Add real-time order updates (WebSocket/SSE)
- [ ] Implement menu item search in bot
- [ ] Add cart modification in bot (remove items, change quantity)
- [ ] Encrypt payment provider credentials
- [ ] Add webhook signature verification
- [ ] Implement refresh token rotation
- [ ] Add rate limiting and CORS configuration

### Medium Priority
- [ ] Add email notifications (order confirmation, status updates)
- [ ] Add SMS notifications (Twilio integration)
- [ ] Implement analytics dashboard
- [ ] Add restaurant onboarding flow
- [ ] Implement menu item images upload
- [ ] Add support for item modifiers pricing
- [ ] Create comprehensive test suite
- [ ] Add logging (Winston/Pino)
- [ ] Implement error tracking (Sentry)

### Nice to Have
- [ ] Multi-language support (i18n)
- [ ] Advanced NLU integration
- [ ] Voice ordering capability
- [ ] Table reservation system
- [ ] Loyalty program integration
- [ ] Delivery driver management
- [ ] Kitchen display system (KDS)
- [ ] Customer order history
- [ ] Restaurant analytics and reporting
- [ ] A/B testing for bot responses

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please read contributing guidelines before submitting PRs.

## 📞 Support

For issues and questions, please open a GitHub issue or contact support.
