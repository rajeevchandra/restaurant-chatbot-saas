FROM node:20-alpine AS base

RUN npm install -g pnpm@8.15.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/widget ./apps/widget

RUN pnpm install --frozen-lockfile

# Build shared package
RUN cd packages/shared && pnpm build

# Build widget
RUN cd apps/widget && pnpm build

FROM nginx:alpine AS runner

COPY --from=base /app/apps/widget/dist /usr/share/nginx/html

COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]
