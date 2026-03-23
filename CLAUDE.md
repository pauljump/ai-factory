# AI Factory — Claude Operating File

Read this first every session.

## The Point

The individual products don't matter. They're reps. Training runs. The product is **the system that builds products.** Every app shipped should make the next app trivially easy to launch. If we build something and the next project isn't faster because of it, we failed.

This means: when choosing between "make this app better" and "make the system better," choose the system. Extract, generalize, document. The monorepo is a factory, not a portfolio.

**Products conform to the factory — not the other way around.** If the shared infra has JWT auth, every app uses JWT auth. If it has SQLite, every app uses SQLite. Don't build product-specific infrastructure. If a feature isn't in the kit, the app doesn't have it — until the kit supports it. This constraint is a feature: it keeps the factory simple and every app consistent. We expand the factory's capabilities over time, and every tenant benefits at once.

## How We Build Together

This is the most important section in this file. Everything else is logistics.

**We do not work in a "human requests, AI delivers" loop.** That's outsourcing. We build together.

### The Loop

**1. Scout** (before any code) — Investigate, present findings in plain english. "Here are 3 approaches. Tradeoffs are..." No code until green light.

**2. Build** (with narration) — Write code but surface decisions. "I'm about to delete this file — it looks unused but wanted to confirm."

**3. Review** (not just the output) — Describe what changed, show the diff, explain the structure. Review with fresh eyes.

**4. Decide** (at every fork) — Present options with tradeoffs. Human decides. Architecture decisions expressed as business logic ("the referral loop should feed the points economy") are still architecture decisions.

### Principles

1. **Scout first, code never.** The thinking IS the work.
2. **Teach as you go.** If you can't explain it simply, the design is wrong.
3. **Surface every decision.** These aren't interruptions — they're the collaboration.
4. **Tight loops, not marathons.** Five 2-minute check-ins beat one 30-minute code dump.
5. **"This feels wrong" is your most valuable signal.** Stop. Figure out what the human is seeing.
6. **Challenge.** "Are you sure? Here's why that might not work" is part of the job.
7. **No rush.** Speed is not the bottleneck. Alignment is.

## Rules — Every Session

### Startup
1. Read `.claude/soul.md`
2. Read the project's CLAUDE.md before touching code
3. Check playbooks before solving a problem from scratch

### While Building
4. **No stealth decisions** — if you pick between two approaches, say so
5. **No marathon runs** — check in after meaningful progress, not after everything is done

### Propagation & Maintenance
6. **Auto-update factual sections as you work** — architecture, key files, build commands, gotchas
7. **Ask for product sections** — vision, design principles, success metrics

## Shared Infrastructure

### Backend — `packages/api-kit`
- `createApp()` — Fastify server with helmet, CORS, rate limiting, health check, logging
- `parseEnv()` + `baseEnvSchema` — Zod-based environment validation
- `getDb()` — SQLite via better-sqlite3 (WAL mode, setup SQL, foreign keys)
- `registerAuth()` — JWT auth with per-route decorator
- `fetchJSON()` — HTTP client for external APIs (retries, timeout, error handling)
- `startCron()` — In-process scheduled tasks

### AI — `packages/llm-kit`
- `createLLMClient({ provider, apiKey })` — provider-agnostic LLM client
- Supports OpenAI + Anthropic (extensible)
- Standard chat + tool use interface — swap providers with zero code changes

### Agent Engine — `packages/teek`
- 16 AI personas built from verified source material
- 12 professional roles (staff-eng, product-manager, cfo, etc.)
- 2 autonomous agents (background factory scanner, git ops)
- CLI: `pnpm ask --persona travis "question"` or `--role`/`--agent`

### Web — `packages/web-templates` (copyable starter files)
- Next.js 16 + React 19 + Tailwind CSS 4
- HSL token system with light/dark mode
- AI streaming chat component (Vercel AI SDK)
- Dockerfile for Cloud Run

### iOS — `packages/ios-templates` (copyable starter files)
- APIClient, Theme, StoreManager, LiveActivityManager
- FoundationModelManager (on-device AI, iOS 26+)
- PushNotificationManager, AppIntentsManager, DeepLinkRouter
- DocumentScannerView, BackgroundTaskManager

### MCP Server — `.claude/templates/mcp-server/`
- TypeScript scaffold for Model Context Protocol servers
- Expose any project's data to AI agents (Claude Desktop, Cursor, etc.)

## Stack Check — The Gate Before Building

Before writing code for a new project:

1. Does this idea use only supported platform capabilities?
2. If not — **STOP.** Don't build custom infra. Either the idea waits, or it changes to fit.
3. If a feature isn't in the kit, the app doesn't have it — until the kit supports it.

## When to Add a New Platform Capability

1. **Two-strike rule.** Same problem solved in two projects by copy-pasting custom code → candidate for the platform.
2. **The constraint is a feature.** Most apps can be simpler than you think.
3. **Platform changes benefit all tenants.** If it only helps one app, it's not a platform capability.
4. **Keep the surface area small.** Fewer, more powerful primitives over many specialized ones.

## Compounding

Every session should make the next one faster.

**Before building anything:**
1. Check sibling projects for solved versions of the same problem
2. Check `packages/` for shared code that already does what you need
3. Check `.claude/playbooks/` for documented patterns

**After building anything:**
1. Did we solve a problem that transfers? → Extract to `packages/` or write a playbook
2. Did we make an architecture decision? → Update the CLAUDE.md
3. Did we discover a gotcha? → Document it where the next session will find it

**The test:** Session 50 should be dramatically faster than session 1. If it's not, we're failing to compound.

## Where Knowledge Lives

| What | Where |
|------|-------|
| Solved problems (reusable) | `.claude/playbooks/` |
| Background agents | `.claude/agents/` |
| Templates | `.claude/templates/` |
| Platform capabilities | `PLATFORM_CAPABILITIES.md` |

## Playbooks

Solved problems that transfer across projects. Don't re-solve these — read the playbook.

| Playbook | Covers |
|----------|--------|
| `cloud-run-deploy.md` | Cloud Run: API apps + web apps, infra, secrets, databases, cost controls |
| `ios-testflight.md` | XcodeGen → archive → upload to App Store Connect |
| `web-app-setup.md` | Next.js 16 + Tailwind 4 + TypeScript scaffold |
| `data-fetching.md` | API fetching, Socrata/gov data, HTML scraping, browser automation, caching |
| `llm-key-management.md` | LLM API key strategy: per-app keys, env vars, cost monitoring |
| `storekit-iap.md` | StoreKit 2: non-consumable + consumable patterns |
| `watchos-app-setup.md` | watchOS scaffold: XcodeGen, Watch Connectivity, AVPlayer |
| `ios-testing-debugging.md` | CLI-only iOS testing, SwiftUI patterns, simulator management |
| `dead-code-detection.md` | Periphery: scan iOS projects for unused Swift code |
| `session-handoff.md` | End-of-session protocol: update state, commit everything |
| `research.md` | Token-efficient knowledge persistence |
| `signal-bench.md` | Signal intake → factory scan → idea evaluation |
| `observability.md` | Logging, error handling, Cloud Logging |
| `platform-capabilities.md` | Adding/maintaining shared packages |
| `turnstile-scraping.md` | Anti-bot scraping patterns (Cloudflare Turnstile) |
