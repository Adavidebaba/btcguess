# === BTC Guesser — Docker Image ===
# Multi-stage: build wallet data → run headless engine + dashboard

# Stage 1: build wallet set (bloom + table)
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY data/ ./data/
COPY scripts/ ./scripts/
COPY src/game/bloom.js ./src/game/bloom.js
COPY src/game/wallet-table.js ./src/game/wallet-table.js

RUN node scripts/build-wallet-set.js

# Stage 2: runtime
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src/ ./src/
COPY --from=builder /app/generated-data/ ./generated-data/

# Volume per persistenza stats tra riavvii
VOLUME /app/persistent

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3000/api/health || exit 1

CMD ["node", "src/main.js"]
