# Build stage - compile TypeScript modules
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy all workspace files (Zeabur sets root as build context)
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build nakama runtime module
RUN pnpm --filter @nakama/runtime build

# Production stage - Nakama server with custom modules
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

# Copy built JavaScript modules
COPY --from=builder /app/packages/nakama/build /nakama/data/modules/build

# Copy production config
COPY --from=builder /app/packages/nakama/config.yml /nakama/data/nakama.yml

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/nakama/nakama migrate up --database.address $DATABASE_URL && exec /nakama/nakama --config /nakama/data/nakama.yml --database.address $DATABASE_URL"]
