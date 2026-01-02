# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy files
COPY . .

# Debug: show directory structure
RUN echo "=== Directory structure ===" && ls -la /app/

# Prepare client directory - handle monorepo structure
# Move client code to /build for consistent paths
RUN mkdir -p /build && \
    if [ -d "/app/apps/client" ]; then \
      echo "Full monorepo detected"; \
      cp -r /app/apps/client/* /build/; \
    else \
      echo "Standalone client detected"; \
      cp -r /app/* /build/; \
    fi

WORKDIR /build

# Debug: show build directory
RUN echo "=== Build directory ===" && ls -la /build/

# Create shared types locally
RUN mkdir -p src/shared

# Download shared types from GitHub raw
RUN wget -O src/shared/index.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/index.ts && \
    wget -O src/shared/opcodes.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/opcodes.ts && \
    wget -O src/shared/game-types.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/game-types.ts && \
    wget -O src/shared/constants.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/constants.ts

# Update imports from @shared/types to @/shared
RUN find src -name "*.ts" -o -name "*.vue" | xargs sed -i "s|from '@shared/types'|from '@/shared'|g" && \
    find src -name "*.ts" -o -name "*.vue" | xargs sed -i "s|'@shared/types'|'@/shared'|g"

# Remove workspace dependency from package.json
RUN sed -i '/"@shared\/types"/d' package.json

# Debug: show package.json
RUN echo "=== package.json ===" && cat package.json

# Install dependencies
RUN npm install

# Build with vite directly (not pnpm)
RUN npx vite build

# Production stage
FROM nginx:alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY --from=builder /build/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
