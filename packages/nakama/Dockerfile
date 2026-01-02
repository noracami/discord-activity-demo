# Build stage - compile TypeScript modules
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy all workspace files (Zeabur sets root as build context)
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Debug: Check what files are available
RUN echo "=== Root /app ===" && ls -la /app/ && \
    echo "=== Packages ===" && ls -la /app/packages/ 2>/dev/null || echo "No packages dir" && \
    echo "=== Nakama ===" && ls -la /app/packages/nakama/ 2>/dev/null || echo "No nakama dir"

# Build nakama runtime module with absolute paths
RUN npx esbuild /app/packages/nakama/src/main.ts \
    --bundle \
    --outfile=/app/packages/nakama/build/index.js \
    --format=esm \
    --target=es2020 \
    --external:nakama-runtime

# Verify build output
RUN ls -la /app/packages/nakama/build/

# Production stage - Nakama server with custom modules
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

# Copy built JavaScript modules
COPY --from=builder /app/packages/nakama/build /nakama/data/modules/build

# Copy production config
COPY --from=builder /app/packages/nakama/config.yml /nakama/data/nakama.yml

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/nakama/nakama migrate up --database.address $DATABASE_URL && exec /nakama/nakama --config /nakama/data/nakama.yml --database.address $DATABASE_URL"]
