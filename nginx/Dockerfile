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

ENV NODE_ENV=development
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN pnpm install --frozen-lockfile --prod=false

COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/user ./apps/user
COPY apps/admin ./apps/admin
COPY apps/merchant ./apps/merchant
COPY apps/worker ./apps/worker

# Re-run install so app node_modules are linked (COPY overwrote the dirs pnpm had linked)
RUN pnpm install --frozen-lockfile --prod=false

# Build each app: cwd = app dir (so index.html + config resolve), vite binary from root node_modules
ENV VITE_API_BASE=/api
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
RUN cd /app/apps/user    && VITE_BASE_PATH=/user/    ../../node_modules/.bin/vite build
RUN cd /app/apps/admin   && VITE_BASE_PATH=/admin/   ../../node_modules/.bin/vite build
RUN cd /app/apps/merchant && VITE_BASE_PATH=/merchant/ ../../node_modules/.bin/vite build
RUN cd /app/apps/worker  && VITE_BASE_PATH=/worker/  ../../node_modules/.bin/vite build


# Stage 2: nginx with built assets
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy landing page
COPY landing/index.html /usr/share/nginx/html/index.html

# Copy built apps (each app's dist is at apps/<name>/dist)
COPY --from=frontend-builder /app/apps/user/dist   /usr/share/nginx/html/user
COPY --from=frontend-builder /app/apps/admin/dist  /usr/share/nginx/html/admin
COPY --from=frontend-builder /app/apps/merchant/dist /usr/share/nginx/html/merchant
COPY --from=frontend-builder /app/apps/worker/dist  /usr/share/nginx/html/worker

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
