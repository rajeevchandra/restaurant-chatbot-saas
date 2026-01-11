# Copilot Instructions for AI Agents

## Project Overview
- **Monorepo** for a multi-tenant restaurant chatbot SaaS platform.
- Major apps:
  - `apps/api`: Node.js/Express backend (TypeScript, Prisma, PostgreSQL)
  - `apps/admin`: Next.js 14 admin dashboard (TypeScript, Tailwind)
  - `apps/widget`: Vite + React 18 embeddable chat widget (TypeScript)
  - `packages/shared`: Shared types, validation, and API client (TypeScript, Zod)

## Architecture & Data Flow
- **Multi-tenancy**: All data is scoped by `restaurant_id` (tenant slug routing).
- **RBAC**: OWNER, MANAGER, STAFF roles (see `apps/api/src/modules/auth/` and README).
- **Order & Payment**: FSM for order lifecycle; modular payment adapters (Stripe, Square placeholders).
- **Bot Engine**: FSM-based, extensible via `apps/api/src/modules/bot/engine.ts`.
- **Widget**: Embeds via `<script>` tag, customizable via data attributes.

## Developer Workflows
- **Install**: `pnpm install` (root)
- **Build**: `pnpm build` (all) or per-package (`cd apps/api && pnpm build`)
- **Dev**: `pnpm dev` (all) or per-app (`cd apps/widget && pnpm dev`)
- **Test**: `pnpm test` in each app (see TODOs in README)
- **Typecheck**: `pnpm typecheck` (all) or per-package
- **DB**: Prisma migrations/seeds via `pnpm db:migrate`, `pnpm db:seed` in `apps/api`
- **Docker**: `docker-compose up -d` (dev), `docker-compose -f ...prod.yml up -d` (prod)

## Conventions & Patterns
- **Type Safety**: All API/data contracts in `packages/shared` (import, do not duplicate types)
- **Validation**: Use Zod schemas from `packages/shared/validation.ts`
- **API Client**: Use fetch wrapper in `packages/shared/api.ts`
- **Env Config**: All apps expect `.env` (see `.env.example`)
- **Testing**: Test structure exists, but coverage is TODO (see `__tests__` folders)
- **Styling**: Tailwind for admin, CSS modules for widget
- **Widget**: Shadow DOM for style isolation

## Integration Points
- **Payments**: Extend adapters in `apps/api/src/modules/payments/`
- **Webhooks**: Implement endpoints in `apps/api/src/modules/webhooks/`
- **Bot Logic**: Enhance in `apps/api/src/modules/bot/engine.ts`
- **Widget Embed**: See `apps/widget/EMBED_GUIDE.md`

## Key Files/Dirs
- `apps/api/src/modules/` — business logic modules
- `apps/admin/src/app/` — Next.js app routes
- `apps/widget/src/widget/` — main widget logic
- `packages/shared/` — types, validation, API client
- `README.md` — full setup, workflows, and architecture

## Examples
- Add a new menu field: update Prisma schema, Zod types, and shared types, then propagate to API and widget.
- Add a payment provider: create adapter in `payments/`, update config, and add webhook handler.

---

For more, see the root `README.md` and per-app docs. When in doubt, prefer type-safe, shared code and follow the monorepo structure.