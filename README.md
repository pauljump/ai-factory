# AI Factory

A monorepo system for shipping AI-native products. 21 shared packages, 16 operational playbooks, an agent persona engine, and an MCP server template — extracted from a private monorepo powering 80+ shipped projects (Cloud Run, TestFlight, App Store).

This isn't a framework or a starter kit. It's a production factory: the infrastructure, workflows, and AI agent operating system I use to go from idea to deployed product in a single session.

## What's Here

### `packages/` — Shared Infrastructure (21 packages)

Every package is a single-responsibility npm module. Average ~350 LOC. No bloat.

| Package | What It Does |
|---------|-------------|
| **api-kit** | Fastify server scaffold — JWT auth, SQLite (WAL), rate limiting, health check, HTTP client with retry, cron |
| **llm-kit** | Provider-agnostic LLM client — OpenAI + Anthropic, same interface, tool use baked in |
| **teek** | AI persona engine — 16 personas (Naval, PG, Travis Kalanick, etc.), 12 professional roles, 2 autonomous agents |
| **voice-kit** | Real-time voice via OpenAI Realtime API — WebSocket sessions, browser relay, tool calling mid-conversation |
| **document-kit** | OCR + structured extraction via Claude vision — Zod schema validation on extracted data |
| **etl-kit** | Data pipelines — fetch with exponential backoff, rate limiting, HTML scraping (cheerio), pipeline orchestrator |
| **search-kit** | SQLite FTS5 — BM25 ranking, snippet generation, composable multi-field filters |
| **watch-kit** | Availability monitoring — snapshot store, diff engine, condition evaluation, action dispatch |
| **predict-kit** | Pattern prediction — segmented bucketing, outcome probability learning, confidence scoring |
| **event-bus** | In-process pub/sub + webhook delivery with HMAC signing and retry |
| **job-queue** | Persistent scheduled jobs — cron syntax, retry on failure, job history. SQLite-backed |
| **notify-kit** | Notifications — Resend email, APNs push |
| **payments-kit** | Stripe — checkout sessions, billing portal, webhook verification |
| **analytics-kit** | Event tracking, funnels, retention. Self-hosted, SQLite-backed |
| **gamify-kit** | Points ledger, streaks, achievements/badges |
| **storage-kit** | Google Cloud Storage — uploads, signed URLs, delete |
| **socrata-kit** | Government open data API wrapper (Socrata/SODA) |
| **geo-registry** | Geographic registry with H3 hexagonal indexing, clustering, density scoring |
| **pods-kit** | Direct messaging + group messaging infrastructure |
| **ios-templates** | 12 Swift managers — StoreKit, Live Activities, Siri, deep links, push, background tasks, on-device AI, document scanning |
| **web-templates** | Next.js 16 + React 19 + Tailwind 4 — design tokens, AI streaming chat, maps, charts, Dockerfile |

### `.claude/` — AI Agent Operating System

This is how AI coding agents operate in this codebase. It's a structured system for human-AI collaboration.

| Component | Purpose |
|-----------|---------|
| **`soul.md`** | Written by Claude, for Claude. Self-reflective guidance that persists across sessions. |
| **`playbooks/`** | 16 battle-tested workflows — Cloud Run deploy, TestFlight pipeline, data fetching patterns, LLM key management, StoreKit IAP, watchOS setup, session handoff protocol |
| **`templates/mcp-server/`** | MCP (Model Context Protocol) server scaffold — TypeScript, ready to expose any project's data to AI agents |
| **`templates/`** | Project scaffolding — idea cards, project docs, research templates |
| **`agents/`** | Background agents that run during sessions — the Spotter watches for cross-project patterns and extraction candidates |

### `koba237/` — The Factory Pipeline

The meta-tool: takes idea cards through a multi-stage enrichment pipeline using AI personas, then scaffolds and deploys projects.

**Pipeline stages:**
1. **Gate** — Naval Ravikant + Paul Graham + Travis Kalanick vote (2/3 must advance)
2. **Panel** — Domain-specific persona pair + 1 random from 11-person panel
3. **Factory** — Signal scout scans capability ledger, maps idea to existing infrastructure

149 ideas processed. 47 advanced. 101 killed. The filter is the feature.

## Architecture Decisions

**SQLite everywhere.** Not Postgres, not Redis. SQLite in WAL mode with better-sqlite3. Every package that needs persistence uses it. One fewer thing to deploy, monitor, and pay for. This works because each service owns its own data.

**Provider-agnostic AI.** `llm-kit` wraps OpenAI and Anthropic behind the same interface. Swap models in config, not code. Tool use (function calling) works identically across providers.

**Templates over packages for UI.** iOS and web templates are copied, not imported. Each app needs its own brand colors, fonts, metadata. Copy-paste beats dependency management for presentation code. Backend packages are real npm packages — `pnpm` workspace handles sharing cleanly.

**Playbooks over documentation.** Knowledge lives in executable playbooks (`.claude/playbooks/`), not wiki pages. Each playbook solves a specific problem: "how do I deploy to Cloud Run?" has a 10K character playbook with every command, gotcha, and config. A cold-start session reads the playbook and executes.

**Personas as thought partners.** `teek` simulates specific people (Travis Kalanick, Paul Graham, etc.) from verified source material — each persona built from 20-35 URLs. Used in the factory pipeline to evaluate ideas from multiple perspectives before writing code.

## Stack

- **Runtime:** Node 22, ESM, TypeScript strict
- **Backend:** Fastify 5, better-sqlite3, Zod
- **Web:** Next.js 16, React 19, Tailwind CSS 4
- **iOS:** Swift, SwiftUI, XcodeGen
- **AI:** OpenAI API, Anthropic API, Vercel AI SDK, Apple Foundation Models
- **Deploy:** Cloud Run (API + web), TestFlight (iOS)
- **Monorepo:** pnpm workspaces, Turborepo

## How It Works in Practice

A new product starts as an idea card (markdown with frontmatter). The card goes through the Koba pipeline — AI personas evaluate it, the factory scanner checks what infrastructure already exists. If the idea passes, a session reads the relevant playbooks and scaffolds the project using shared packages.

Every backend starts with `api-kit`. Every web app copies `web-templates`. Every iOS app copies `ios-templates`. The factory constraints are intentional: if the platform doesn't support it, the product doesn't have it — until the platform is extended. This keeps 80+ products consistent and every capability upgrade benefits all of them simultaneously.

A typical shipping session: read the playbook, scaffold from templates, wire up packages, deploy. Idea to production in hours, not weeks.

## Related

- **MCP server template** — `.claude/templates/mcp-server/` exposes project data to AI agents via the Model Context Protocol
- **Platform capabilities catalog** — `PLATFORM_CAPABILITIES.md` lists every factory capability with use cases and cost
