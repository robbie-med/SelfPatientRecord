# Stage 1: Build frontend
FROM node:20-alpine AS web-builder

WORKDIR /app

# Copy web package files
COPY apps/web/package*.json ./apps/web/
WORKDIR /app/apps/web
RUN npm ci

# Copy web source and build
COPY apps/web ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder

WORKDIR /app

# Copy server package files
COPY apps/server/package*.json ./apps/server/
COPY packages ./packages
WORKDIR /app/apps/server
RUN npm ci

# Copy server source and build
COPY apps/server ./
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

# Copy built server + production deps
COPY --from=server-builder /app/apps/server/dist ./dist
COPY --from=server-builder /app/apps/server/node_modules ./node_modules

# Copy built frontend into server's public dir
COPY --from=web-builder /app/apps/web/dist ./public

# Data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/public

EXPOSE 3000

CMD ["node", "dist/index.js"]
