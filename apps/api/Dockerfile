FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/fhir/package.json ./packages/fhir/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/fhir/node_modules ./packages/fhir/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY packages/config ./packages/config
COPY packages/types ./packages/types
COPY packages/db ./packages/db
COPY packages/fhir ./packages/fhir
COPY apps/api ./apps/api

RUN pnpm --filter @repo/types build
RUN pnpm --filter @repo/fhir build
RUN pnpm --filter @repo/db generate
RUN pnpm --filter @repo/api build

# Production image
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/fhir/dist ./packages/fhir/dist
COPY --from=builder /app/packages/fhir/package.json ./packages/fhir/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 4000

USER node

CMD ["node", "apps/api/dist/index.js"]
