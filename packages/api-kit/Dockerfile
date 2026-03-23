FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# SQLite data lives here — mount a persistent volume at /data in Cloud Run
ENV DB_PATH=/data/app.db
EXPOSE 3000
CMD ["node", "dist/index.js"]
