FROM node:26-alpine AS base

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
