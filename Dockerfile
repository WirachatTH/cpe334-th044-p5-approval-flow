# Production image: the API (Express) and the built UI (React, Vite) in one container, on one port.
#
# Adapted from the Lab 5 Starter Kit (see docs/labs/lab-05/deployment.md, section 1, for the changes).
# Build from the repository root:  docker build .
#
# Stage 1  client-builder  compiles the UI
# Stage 2  server-builder  compiles the API and generates the Prisma client
# Stage 3  production      small runtime image with the build output only
#
# Notes
# - The container listens on $PORT (Cloud Run sets it; 3000 here). CLIENT_DIST_DIR makes the API serve the UI
#   (F-05 contract v0.7), so nothing else is needed to show the Login screen.
# - No secret is baked into the image. DATABASE_URL, DEMO_USER_PASSWORD, and CLIENT_ORIGINS are given at run time.
# - prisma/ and the dev dependencies stay in the runtime image on purpose: the migration job runs
#   `prisma migrate deploy` and the seed from this same image.
# - The last stage runs as the unprivileged `node` user.

# ---- Stage 1: UI ------------------------------------------------------------------------------------------
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: API -----------------------------------------------------------------------------------------
FROM node:24-alpine AS server-builder
WORKDIR /app/server
# Prisma needs openssl on Alpine.
RUN apk add --no-cache openssl
COPY server/package*.json ./
# The postinstall script runs `prisma generate`, which reads the schema, so the schema comes before `npm ci`.
COPY server/prisma ./prisma
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

# ---- Stage 3: runtime -------------------------------------------------------------------------------------
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl

COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src ./src
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-builder /app/client/dist /app/client/dist

# A checkout with Windows line endings would break the shebang line, so they are removed here.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
ENV CLIENT_DIST_DIR=/app/client/dist
EXPOSE 3000

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
