# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy client files (Zeabur copies apps/client to /app)
COPY . .

# Create shared types locally (inline the types)
RUN mkdir -p /app/src/shared

# Download shared types from GitHub raw
RUN wget -O /app/src/shared/index.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/index.ts && \
    wget -O /app/src/shared/opcodes.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/opcodes.ts && \
    wget -O /app/src/shared/game-types.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/game-types.ts && \
    wget -O /app/src/shared/constants.ts https://raw.githubusercontent.com/noracami/discord-activity-demo/main/packages/shared/src/constants.ts

# Update imports from @shared/types to ./shared or ../shared
RUN find /app/src -name "*.ts" -o -name "*.vue" | xargs sed -i "s|from '@shared/types'|from '@/shared'|g" && \
    find /app/src -name "*.ts" -o -name "*.vue" | xargs sed -i "s|'@shared/types'|'@/shared'|g"

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
