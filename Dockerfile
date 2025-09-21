FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# Instala deps com dev para permitir gerar Prisma Client
RUN npm ci

FROM deps AS generate
WORKDIR /app
COPY prisma ./prisma
# Gera Prisma Client (usa devDeps da stage deps)
RUN npx prisma generate

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Copia artefatos de build e deps (incluindo Prisma Client gerado)
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=generate /app/node_modules/.prisma ./node_modules/.prisma
# Remove devDeps, preservando client gerado em node_modules/.prisma
RUN npm prune --omit=dev
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD curl -fsS http://localhost:3000/live || exit 1
CMD ["node", "dist/server.js"]