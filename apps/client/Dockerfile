# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy all workspace files (Zeabur sets root as build context)
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build client
RUN pnpm --filter @app/client build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Copy nginx config
COPY --from=builder /app/apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
