# Build stage - compile TypeScript modules
FROM node:20-alpine AS builder

WORKDIR /app

# Copy nakama package files (Zeabur copies packages/nakama content to /app)
COPY . .

# Debug: Check what files are available
RUN echo "=== Root /app ===" && ls -la /app/

# Install esbuild directly
RUN npm install esbuild

# Build nakama runtime module
RUN npx esbuild src/main.ts \
    --bundle \
    --outfile=build/index.js \
    --format=esm \
    --target=es2020 \
    --external:nakama-runtime

# Verify build output
RUN ls -la build/

# Production stage - Nakama server with custom modules
FROM registry.heroiclabs.com/heroiclabs/nakama:3.24.2

# Copy built JavaScript modules
COPY --from=builder /app/build /nakama/data/modules/build

# Copy production config
COPY --from=builder /app/config.yml /nakama/data/nakama.yml

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/nakama/nakama migrate up --database.address $DATABASE_URL && exec /nakama/nakama --config /nakama/data/nakama.yml --database.address $DATABASE_URL"]
