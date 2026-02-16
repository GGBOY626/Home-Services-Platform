# Stage 1: build all frontend apps
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/user/package.json ./apps/user/
COPY apps/admin/package.json ./apps/admin/
COPY apps/merchant/package.json ./apps/merchant/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/user ./apps/user
COPY apps/admin ./apps/admin
COPY apps/merchant ./apps/merchant
COPY apps/worker ./apps/worker

# Build each app with production base path and relative API
ENV VITE_API_BASE=/api
RUN VITE_BASE_PATH=/user/   pnpm --filter user build
RUN VITE_BASE_PATH=/admin/  pnpm --filter admin build
RUN VITE_BASE_PATH=/merchant/ pnpm --filter merchant build
RUN VITE_BASE_PATH=/worker/  pnpm --filter worker build

# Stage 2: nginx with built assets
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built apps (each app's dist is at apps/<name>/dist)
COPY --from=frontend-builder /app/apps/user/dist   /usr/share/nginx/html/user
COPY --from=frontend-builder /app/apps/admin/dist  /usr/share/nginx/html/admin
COPY --from=frontend-builder /app/apps/merchant/dist /usr/share/nginx/html/merchant
COPY --from=frontend-builder /app/apps/worker/dist  /usr/share/nginx/html/worker

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
