# Playbook: Web App Setup (Next.js)

Learned from: 20+ production projects and web-templates extraction

## The Stack

Every web app in the monorepo uses the same base. Don't deviate unless there's a reason.

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **TypeScript 5.9**

That's the floor. Everything else is a per-project decision.

## Scaffold a New Web App

**Option A: From templates (preferred)**

```bash
cd <project>
mkdir -p src/app src/lib src/components/ui

# Copy starter files from web-templates
cp packages/web-templates/globals.css src/app/
cp packages/web-templates/app/layout.tsx src/app/
cp packages/web-templates/lib/utils.ts src/lib/
cp packages/web-templates/components/ui/button.tsx src/components/ui/
cp packages/web-templates/tailwind.config.ts .
cp packages/web-templates/next.config.ts .
cp packages/web-templates/tsconfig.json .
cp packages/web-templates/.env.example .
cp packages/web-templates/.gitignore .
cp packages/web-templates/Dockerfile .

# Install dependencies
pnpm add next@latest react@latest react-dom@latest
pnpm add tailwindcss@latest tailwindcss-animate class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-slot lucide-react
pnpm add -D typescript@latest @types/react @types/node

# Customize: globals.css (colors), layout.tsx (font, metadata)
```

See `packages/web-templates/README.md` for full details on what to customize.

**Option B: From create-next-app (if you need the full scaffold)**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Then copy over our templates to replace the defaults:
cp packages/web-templates/globals.css src/app/
cp packages/web-templates/lib/utils.ts src/lib/
# etc.
```

## Decision Points

These vary by project. Pick one at the start and note it in the project's CLAUDE.md.

### Database

| Option | When to use |
|--------|-------------|
| None | Static/client-only apps |
| Prisma + PostgreSQL | Multi-user apps with relational data |
| SQLite via api-kit | Simple apps with a separate API server |

If using Prisma:
```bash
pnpm add @prisma/client prisma
npx prisma init
```

### API Layer

| Option | When to use |
|--------|-------------|
| Next.js Route Handlers | Simple CRUD, no real-time needs |
| tRPC | Type-safe client-server when frontend and backend are in the same repo |
| Separate Fastify API (api-kit) | When the backend serves iOS + web, or needs cron/workers |

### Testing

| Option | When to use |
|--------|-------------|
| Vitest | Preferred for new projects. Faster, better ESM support |
| Jest | Legacy projects that already use it |

```bash
# Vitest setup
pnpm add -D vitest jsdom
# Add to package.json scripts:
#   "test": "vitest run"
#   "test:watch": "vitest"
```

### Component Libraries

| Option | When to use |
|--------|-------------|
| Raw Tailwind | Most projects. Keep it simple |
| Radix UI + CVA + tailwind-merge | When you need accessible primitives (modals, dropdowns, tabs) |
| Recharts | Data visualization |

Don't install a component library "just in case." Start with raw Tailwind and add Radix when you hit a real accessibility need (modals, popovers, comboboxes).

## Project Structure

```
src/
  app/              # Next.js App Router pages
    layout.tsx      # Root layout (fonts, metadata, providers)
    page.tsx        # Home page
    api/            # Route handlers (if not using tRPC or separate API)
  components/       # Shared UI components
  lib/              # Utilities, API client, config
```

For monorepo-style projects with multiple packages:
```
apps/
  web/              # Next.js frontend
  api/              # Fastify backend (if separate)
  worker/           # Background jobs (if needed)
packages/
  shared/           # Shared types/utils between apps
```

## Deploy

Web apps deploy the same way as any other Cloud Run service. See `cloud-run-deploy.md` with one difference:

- **Static/SSG apps** can also deploy to Vercel or Cloudflare Pages (zero config)
- **SSR apps** use Cloud Run with the Next.js standalone output:

```js
// next.config.js
module.exports = {
  output: 'standalone',
}
```

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## Gotchas

- **Tailwind v4 uses CSS-first config** — no more `tailwind.config.js`. Config goes in your CSS file with `@theme`. Check the Tailwind v4 docs if you're used to v3.
- **App Router is the default** — don't use Pages Router for new projects. All existing projects use App Router.
- **`"use client"` directive** — components using hooks (useState, useEffect) or browser APIs need this at the top. Server Components are the default in App Router.
- **Environment variables** — prefix with `NEXT_PUBLIC_` for client-side access. Server-only vars (API keys, DB URLs) should NOT have this prefix.
- **Import alias** — use `@/*` mapped to `./src/*` for clean imports. All projects follow this convention.
