# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package files (Zeabur copies apps/server content to /app)
COPY . .

# Install dependencies
RUN npm install

# Build server
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install production dependencies
RUN npm install --omit=dev

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
