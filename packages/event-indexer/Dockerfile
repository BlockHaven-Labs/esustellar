FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
COPY packages/event-indexer/package.json ./packages/event-indexer/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/event-indexer/node_modules ./packages/event-indexer/node_modules
COPY . .
WORKDIR /app/packages/event-indexer
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 indexer &&     adduser --system --uid 1001 indexer
COPY --from=builder --chown=indexer:indexer /app/packages/event-indexer/dist ./dist
COPY --from=builder --chown=indexer:indexer /app/node_modules ./node_modules
USER indexer
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
