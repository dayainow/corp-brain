FROM node:20-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET=build-time-placeholder-32-chars-min
ENV AUTH_URL=http://localhost:3000
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl libgomp1 && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/vault ./vault
# @xenova/transformers — standalone 외부 패키지 + onnxruntime 네이티브 라이브러리
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@xenova ./node_modules/@xenova
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common

RUN mkdir -p /app/data /app/src/data && chown -R nextjs:nodejs /app/data /app/src/data

# arm64·x64 모두 경로 등록 (해당 아키텍처 .so만 존재)
ENV LD_LIBRARY_PATH=/app/node_modules/onnxruntime-node/bin/napi-v3/linux/arm64:/app/node_modules/onnxruntime-node/bin/napi-v3/linux/x64

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
