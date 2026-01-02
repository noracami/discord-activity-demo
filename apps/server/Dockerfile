# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy all workspace files (Zeabur sets root as build context)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build server
RUN pnpm --filter @app/server build

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Copy package files for production install
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/apps/server

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
