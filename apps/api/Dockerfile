FROM node:22-alpine AS base
WORKDIR /app

# ── Dependency layer (cached until package files change) ──────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json   ./packages/types/
COPY packages/db/package.json      ./packages/db/
COPY packages/fhir/package.json    ./packages/fhir/
COPY apps/api/package.json         ./apps/api/
RUN npm ci --ignore-scripts

# ── Build layer ───────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/config ./packages/config
COPY packages/types  ./packages/types
COPY packages/db     ./packages/db
COPY packages/fhir   ./packages/fhir
COPY apps/api        ./apps/api

# Build in dependency order:
# 1. Generate Prisma client (required before compiling @repo/db)
# 2. Compile @repo/db and @repo/fhir to CJS dist/
# 3. Compile the API
RUN npm run db:generate -w @repo/db && \
    npm run build -w @repo/db      && \
    npm run build -w @repo/fhir    && \
    npm run build -w @repo/api

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma needs the query engine binary and the generated client
COPY --from=builder /app/node_modules/.prisma        ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma        ./node_modules/@prisma

# Runtime npm packages (express, pino, jsonwebtoken, etc.)
COPY --from=builder /app/node_modules                ./node_modules

# Compiled workspace packages
COPY --from=builder /app/packages/db/dist            ./packages/db/dist
COPY --from=builder /app/packages/db/package.json    ./packages/db/package.json
COPY --from=builder /app/packages/fhir/dist          ./packages/fhir/dist
COPY --from=builder /app/packages/fhir/package.json  ./packages/fhir/package.json
COPY --from=builder /app/packages/types/src          ./packages/types/src
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json

# Compiled API
COPY --from=builder /app/apps/api/dist          ./apps/api/dist
COPY --from=builder /app/apps/api/package.json  ./apps/api/package.json

# Prisma schema needed at runtime for migrate deploy
COPY --from=builder /app/packages/db/prisma     ./packages/db/prisma

# Root package.json needed for npm workspace resolution
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000
USER node
# Run pending migrations then start the server.
# migrate deploy is idempotent — safe to run on every container start.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma && node apps/api/dist/index.js"]
