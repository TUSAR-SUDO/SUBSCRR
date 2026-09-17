# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# sqlite3 needs build tools to compile its native binding
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production dependencies for the runtime layer
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy production node_modules (includes compiled sqlite3 binding from the
# same alpine base — ABI compatible) and the built output.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json

# Data + uploads directories (mount volumes here for persistence)
RUN mkdir -p /app/data /app/uploads && chown -R app:app /app/data /app/uploads

USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run before boot (idempotent); then start the API.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
