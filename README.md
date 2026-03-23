# AI Factory

A monorepo system for going from prompt to production. 21 shared packages, 16 operational playbooks, an agentic persona engine, and an MCP server template — built to make shipping AI-native products repeatable and fast.

The thesis: the hard part of GenAI isn't the model call — it's the infrastructure between "someone had an idea" and "it's running in production." This system solves that by treating the factory as the product. Every app conforms to shared primitives. Every capability upgrade benefits every tenant simultaneously. Every new project starts closer to production than the last one.

80+ projects have shipped through this system. The primitives are the point.

## Architecture

```
.claude/                    ← AI agent operating system
  playbooks/                ← 16 battle-tested workflows (deploy, test, scrape, handoff)
  templates/mcp-server/     ← MCP server scaffold for tool use
  agents/                   ← Background agents (factory scanner, git ops)
  soul.md                   ← Persistent agent identity across sessions

packages/                   ← Shared infrastructure (21 packages)
  api-kit/                  ← Server framework (Fastify + SQLite + JWT + cron)
  llm-kit/                  ← Provider-agnostic LLM client (OpenAI ↔ Anthropic, tool use)
  teek/                     ← Agentic persona engine (16 personas, 12 roles, 2 agents)
  voice-kit/                ← Real-time voice (OpenAI Realtime API, WebSocket)
  document-kit/             ← OCR + structured extraction (Claude vision + Zod)
  etl-kit/                  ← Data pipelines (retry, rate limit, scrape, orchestrate)
  ...                       ← + 15 more (search, analytics, payments, events, jobs, etc.)

CLAUDE.md                   ← The operating protocol (how AI agents work in this codebase)
PLATFORM_CAPABILITIES.md    ← Full capability catalog with use cases
```

## Key Primitives

### Provider-Agnostic LLM Client — `llm-kit`

Swap between OpenAI and Anthropic with zero code changes. Same interface for chat and tool use. The abstraction exists because production systems shouldn't be locked to a single provider — you need to A/B test models, fall back on outages, and chase the cost/quality frontier.

```typescript
const client = createLLMClient({ provider: "anthropic", apiKey });
const result = await client.chat(messages, { tools });
// Switch to OpenAI by changing one string. Same result shape.
```

### Agentic Persona Engine — `teek`

16 AI personas built from verified source material (20-35 URLs each). 12 professional roles. 2 autonomous agents. Each entity is a filesystem-based profile that constructs LLM system prompts — no hallucination in scope, profiles define what the agent knows and how it thinks.

Used in the evaluation pipeline as a multi-agent advisory board: ideas pass through a 3-persona gate (2/3 must advance), then get deeper analysis from domain-specific pairs. 149 ideas evaluated. 47 advanced. 101 killed. The filter is the feature.

```bash
pnpm ask --persona naval "Should we build or buy?"
pnpm ask --role staff-eng "Review this architecture"
pnpm ask --agent spotter  # autonomous background scanner
```

### MCP Server Template — `.claude/templates/mcp-server/`

TypeScript scaffold for Model Context Protocol servers. Expose any project's data to AI agents (Claude Desktop, Cursor, ChatGPT). Ready to clone and extend — resource definitions, tool handlers, stdio transport.

### AI Agent Operating System — `.claude/`

The system that makes AI coding agents productive in a large codebase:

- **`soul.md`** — Persistent agent identity. Written by the agent, for the agent. Survives across sessions.
- **16 playbooks** — Executable workflows: Cloud Run deploy, TestFlight pipeline, data fetching, LLM key management, session handoff. A cold-start agent reads the playbook and executes — no ramp-up time.
- **Background agents** — The Spotter runs during sessions watching for cross-project patterns, duplicate code, and extraction candidates.
- **`CLAUDE.md`** — The operating protocol. Defines the scout→build→review→decide loop, stack check gates, and compounding rules.

This isn't documentation. It's infrastructure for making AI agents productive at scale.

### Sandbox-to-Production Pattern

Every new project follows the same path:
1. **Evaluate** — Run the idea through a multi-agent persona panel (teek)
2. **Stack check** — Does the factory already support what this needs? If not, the idea waits or adapts
3. **Scaffold** — Copy templates, wire up shared packages
4. **Deploy** — Follow the playbook (Cloud Run for API/web, TestFlight for iOS)

The factory constrains the product. If the platform doesn't support a capability, the product doesn't have it — until the platform is extended and every tenant benefits.

## All Packages

| Package | What It Does | LOC |
|---------|-------------|-----|
| **api-kit** | Fastify server — JWT auth, SQLite (WAL), rate limiting, health check, HTTP client with retry, cron | ~415 |
| **llm-kit** | Provider-agnostic LLM client — OpenAI + Anthropic, tool use | ~260 |
| **teek** | Agentic persona engine — 16 personas, 12 roles, 2 agents, CLI + library | ~257 |
| **voice-kit** | Real-time voice — OpenAI Realtime API, WebSocket, tool calling mid-conversation | ~447 |
| **document-kit** | OCR + structured extraction — Claude vision, Zod schemas | ~257 |
| **etl-kit** | Data pipelines — exponential backoff, rate limiting, cheerio scraping, orchestrator | ~255 |
| **search-kit** | Full-text search — SQLite FTS5, BM25 ranking, snippets, composable filters | ~306 |
| **watch-kit** | Availability monitoring — snapshot store, diff engine, condition evaluation, action dispatch | ~810 |
| **predict-kit** | Pattern prediction — segmented bucketing, outcome probability, confidence scoring | ~277 |
| **event-bus** | Pub/sub + webhook delivery — HMAC signing, retry | ~206 |
| **job-queue** | Persistent job scheduling — cron syntax, retry on failure, SQLite-backed | ~460 |
| **notify-kit** | Notifications — Resend email, APNs push | ~296 |
| **payments-kit** | Stripe — checkout, billing portal, webhook verification | ~266 |
| **analytics-kit** | Event tracking, funnels, retention — self-hosted, SQLite | ~315 |
| **gamify-kit** | Points ledger, streaks, achievements/badges | ~431 |
| **storage-kit** | Google Cloud Storage — uploads, signed URLs, delete | ~93 |
| **socrata-kit** | Government open data API wrapper (Socrata/SODA) | ~499 |
| **geo-registry** | Geographic registry — H3 hexagonal indexing, clustering, density scoring | ~930 |
| **pods-kit** | Direct messaging + group messaging infrastructure | ~858 |
| **ios-templates** | 11 Swift managers — StoreKit, Live Activities, Siri, deep links, push, on-device AI, doc scanning | — |
| **web-templates** | Next.js 16 + React 19 + Tailwind 4 — design tokens, AI streaming chat, maps, charts, Dockerfile | — |

## Design Decisions

**SQLite everywhere.** Every package that needs persistence uses SQLite in WAL mode. One fewer thing to deploy, monitor, and pay for. Services own their own data.

**Provider-agnostic from day one.** The LLM client wraps OpenAI and Anthropic behind the same interface because production systems need to swap models without rewriting integration code.

**Playbooks over documentation.** Knowledge lives in executable playbooks, not wiki pages. A playbook solves one problem completely — every command, every gotcha, every config. An agent reads it and executes.

**Templates for UI, packages for logic.** iOS and web templates are copied (each app needs its own brand). Backend packages are real npm imports (one place to fix bugs).

**The factory constrains the product.** If the platform doesn't support it, the product doesn't have it. This keeps 80+ products consistent and makes capability upgrades benefit every tenant.

## Stack

- **Runtime:** Node 22, ESM, TypeScript strict
- **Backend:** Fastify 5, better-sqlite3, Zod
- **Web:** Next.js 16, React 19, Tailwind CSS 4
- **iOS:** Swift, SwiftUI, XcodeGen
- **AI:** OpenAI API, Anthropic API, Vercel AI SDK, Apple Foundation Models
- **Deploy:** Cloud Run (API + web), TestFlight (iOS)
- **Monorepo:** pnpm workspaces, Turborepo
