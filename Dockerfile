FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --production=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json .
RUN npm install --omit=dev
EXPOSE 3000
RUN apk add --no-cache curl
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD curl -fsS http://localhost:3000/live || exit 1
CMD ["node", "dist/server.js"]