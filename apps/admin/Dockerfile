FROM node:20-alpine AS base

RUN npm install -g pnpm@8.15.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN pnpm install --frozen-lockfile

# Build shared package
RUN cd packages/shared && pnpm build

# Build admin
RUN cd apps/admin && pnpm build

FROM node:20-alpine AS runner

RUN npm install -g pnpm@8.15.0

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/admin ./apps/admin

WORKDIR /app/apps/admin

EXPOSE 3001

CMD ["pnpm", "start"]
