# Restaurant Chatbot SaaS

Complete monorepo scaffold for a multi-tenant restaurant chatbot SaaS platform.

## Quick Start

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Manual Setup
```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Setup database (with Docker)
docker-compose up -d postgres

# Or use local PostgreSQL, then:
cd apps/api
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start all services
pnpm dev
```

## Access Points
- **API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **Chat Widget**: http://localhost:3002

## Demo Login
- Email: `owner@demo.com`
- Password: `password123`

## Full Documentation
See [README.md](./README.md) for complete setup guide, architecture details, and deployment instructions.

## Project Structure
```
/apps/api        - Backend API (Express + Prisma + PostgreSQL)
/apps/admin      - Admin Dashboard (Next.js + Tailwind)
/apps/widget     - Chat Widget (Vite + React)
/packages/shared - Shared types and utilities
```

## Key Features
✅ Multi-tenant architecture  
✅ Role-based access control (OWNER, MANAGER, STAFF)  
✅ Order state machine with lifecycle management  
✅ Modular payment system (Stripe/Square adapters)  
✅ Deterministic chatbot engine  
✅ Embeddable chat widget  
✅ Docker support for local development  

## Scripts
```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm typecheck    # Type check all packages
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with demo data
pnpm db:studio    # Open Prisma Studio
```

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Admin**: Next.js 14, React 18, Tailwind CSS
- **Widget**: Vite, React 18, TypeScript
- **Shared**: Zod validation, Type-safe API client
- **DevOps**: Docker, Docker Compose, pnpm workspaces
