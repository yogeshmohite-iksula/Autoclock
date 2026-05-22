# AutoClock — multi-stage Dockerfile for Fly.io deployment.
# Stage 1: build the React web app.
# Stage 2: run the Node backend; serve web/dist statically via Express.
# SQLite lives on the Fly.io persistent volume at /data/autoclock.db (DB_FILE secret).

# ── Stage 1: build web ────────────────────────────────────────────────────
FROM node:18-alpine AS web-builder
WORKDIR /build
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: run backend ──────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app/backend

# Install production deps only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy web build output — Express serves this at /
# server.js resolves: path.join(__dirname, '..', 'web', 'dist') = /app/web/dist
COPY --from=web-builder /build/dist /app/web/dist

EXPOSE 4000
CMD ["node", "server.js"]
