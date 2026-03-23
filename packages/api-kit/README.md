# @pauljump/api-kit

Factory-standard Node.js backend. Fastify server with batteries included — JWT auth, SQLite, HTTP client, cron, environment validation. Every backend in the monorepo starts here.

## What's Included

- **`createApp(options)`** — Fastify instance with CORS, Helmet, rate limiting (60 req/min/IP), health check (`/health`), structured JSON logging, graceful shutdown
- **`getDb(options)`** — SQLite via better-sqlite3 in WAL mode. Foreign keys enabled. Pass `setupSQL` to create tables on init
- **`registerAuth(app, options)`** — JWT auth decorator. Includes `hashPassword()`, `verifyPassword()`, `generateToken()`, `generateMagicLink()`, `verifyMagicLink()`, `generateDeviceId()`
- **`fetchJSON(url, options)`** — HTTP client with retries (3x), exponential backoff (500ms → 1s → 2s), timeout via AbortController
- **`startCron(name, interval, fn)`** — In-process scheduled tasks. No Redis, no queues
- **`parseEnv(schema)`** + **`baseEnvSchema`** — Zod-based environment variable validation

## Usage

```typescript
import { createApp, getDb, parseEnv, baseEnvSchema } from "@pauljump/api-kit";
import { z } from "zod";

const env = parseEnv(baseEnvSchema.extend({
  DATABASE_PATH: z.string().default("./data.db"),
}));

const db = getDb({
  path: env.DATABASE_PATH,
  setupSQL: `CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`,
});

const app = await createApp({ logger: true });

app.get("/items", async () => {
  return db.prepare("SELECT * FROM items").all();
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
```

## Stack

Fastify 5, better-sqlite3, bcryptjs, @fastify/jwt, @fastify/cors, @fastify/helmet, @fastify/rate-limit, Zod
