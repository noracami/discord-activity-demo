# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy files
COPY . .

# Debug: show what directory we have
RUN ls -la /app/ && cat /app/package.json | head -5

# Handle both cases: full monorepo or just apps/client
# If apps/client exists, we have full monorepo
RUN if [ -d "/app/apps/client" ]; then \
      echo "Full monorepo detected, switching to apps/client"; \
      cd /app/apps/client; \
    fi

# Set working directory based on structure
WORKDIR /app/apps/client

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

# Remove workspace dependency
RUN sed -i '/"@shared\/types"/d' package.json

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY --from=builder /app/apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
