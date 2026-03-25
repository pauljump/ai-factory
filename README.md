# AI Factory

A monorepo system for going from idea to production. 21 shared packages, 16 operational playbooks, a structured idea evaluation pipeline, and an AI agent operating system — built to make shipping products repeatable and fast.

**The thesis:** the hard part isn't the model call — it's everything between "someone had an idea" and "it's running in production with real users." This system treats the factory as the product. Every app conforms to shared primitives. Every capability upgrade benefits every tenant simultaneously. Every new project starts closer to production than the last one.

**The results:** 15+ products shipped through this system across iOS, web, and API — including a [civic finance framework](https://github.com/pauljump/findthemoney), a care intelligence platform, a prediction market data aggregator, a real-time voice agent, and a [psychology-grounded framework for AI agent onboarding](https://github.com/pauljump/agentspawn). A new idea goes from zero to deployed in a single session.

---

## What Makes This Different

Most AI projects are one-offs. You build a thing, it works (or doesn't), and the next thing starts from scratch. This system compounds. Every solved problem becomes a shared package. Every deployment becomes a playbook. Every mistake becomes a constraint that prevents the next team (or the next session) from making it again.

The test: session 50 should be dramatically faster than session 1. If it's not, the system is failing to compound.

**Concrete example:** The first iOS app took 3 sessions to reach TestFlight. By the fifth app, it took one. The delta isn't speed — it's that the factory now contains `ios-templates` (11 Swift managers for StoreKit, push notifications, Live Activities, Siri, deep linking, on-device AI, document scanning), a TestFlight deployment playbook, and an api-kit backend that handles auth, persistence, and cron out of the box. The work of the early sessions became the infrastructure of the later ones.

---

## The Idea Pipeline

Before any code gets written, every idea passes through a structured evaluation:

```
199 ideas entered the pipeline
 → Multi-agent persona panel (3 evaluators per idea, 2/3 must advance)
 → Domain-specific deep analysis (matched pairs)
 → Stack check (does the factory support this?)
 → 47 advanced. 101 killed. 51 pending.
```

The kill rate is the feature. The personas (16 AI personalities built from verified source material — 20-35 URLs each) aren't cheerleaders. They're adversarial filters. A Founder persona challenges market timing. A Staff Engineer persona challenges architecture. A Policy Analyst challenges regulatory risk. If an idea can't survive three skeptics, it doesn't deserve engineering time.

The pipeline also enforces a **stack check**: if the factory doesn't support what the idea needs, the idea waits or adapts. This constraint is intentional — it keeps the system simple and prevents one-off infrastructure from accumulating.

---

## Architecture

```
.claude/                    ← AI agent operating system
  playbooks/                ← 16 battle-tested workflows (deploy, test, scrape, handoff)
  research/                 ← Persistent research library (30+ deep dives)
  templates/                ← Project scaffolds, MCP server, idea cards
  agents/                   ← Background agents (factory scanner, git ops)
  soul.md                   ← Persistent agent identity across sessions

packages/                   ← Shared infrastructure (21 packages)
  api-kit/                  ← Server framework (Fastify + SQLite + JWT + cron)
  llm-kit/                  ← Provider-agnostic LLM client (OpenAI ↔ Anthropic, tool use)
  roundtable/               ← Persona engine → now its own repo (github.com/pauljump/roundtable)
  voice-kit/                ← Real-time voice (OpenAI Realtime API, WebSocket)
  document-kit/             ← OCR + structured extraction (Claude vision + Zod)
  etl-kit/                  ← Data pipelines (retry, rate limit, scrape, orchestrate)
  ...                       ← + 15 more (search, analytics, payments, events, jobs, etc.)

CLAUDE.md                   ← The operating protocol
PLATFORM_CAPABILITIES.md    ← Full capability catalog with use cases
```

---

## Key Primitives

### Provider-Agnostic LLM Client — `llm-kit`

Swap between OpenAI and Anthropic with zero code changes. Same interface for chat and tool use. The abstraction exists because production systems shouldn't be locked to a single provider — you need to A/B test models, fall back on outages, and chase the cost/quality frontier.

```typescript
const client = createLLMClient({ provider: "anthropic", apiKey });
const result = await client.chat(messages, { tools });
// Switch to OpenAI by changing one string. Same result shape.
```

### Persona Engine — [Roundtable](https://github.com/pauljump/roundtable)

16 AI personas built from verified source material. 12 professional roles. Each entity is a filesystem-based profile that constructs LLM system prompts — profiles define what the agent knows and how it thinks. Now its own standalone repo.

Beyond the idea evaluation pipeline, personas power strategy sessions (simulated advisory boards for product decisions) and code review (a Staff Engineer persona reviews architecture).

```bash
npx tsx src/cli.ts --persona leverage "Should we build or buy?"
npx tsx src/cli.ts --role staff-eng "Review this architecture"
```

### AI Agent Operating System — `.claude/`

The system that makes AI coding agents productive in a large codebase:

- **`soul.md`** — Persistent agent identity. Written by the agent, for the agent. Survives across sessions. Not a config file — a living document that evolves as the agent learns the codebase and the human it works with.
- **16 playbooks** — Executable workflows: Cloud Run deploy, TestFlight pipeline, data fetching, web app scaffold, watchOS setup, StoreKit integration, session handoff. A cold-start agent reads the playbook and executes — no ramp-up time.
- **Research library** — 30+ deep dives on topics from [fiscal flow architecture](https://github.com/pauljump/findthemoney) to [agent-human psychology](https://github.com/pauljump/agentspawn) to competitive landscapes. Token-efficient knowledge persistence — research once, reference forever.
- **Background agents** — The Spotter runs during sessions watching for cross-project patterns, duplicate code, and extraction candidates.
- **`CLAUDE.md`** — The operating protocol. Defines the scout→build→review→decide loop, stack check gates, and compounding rules that govern every session.

This isn't documentation. It's infrastructure for making AI agents productive at scale.

### Sandbox-to-Production Pattern

Every new project follows the same path:

1. **Evaluate** — Run the idea through the multi-agent persona panel
2. **Stack check** — Does the factory support what this needs? If not, the idea waits or adapts
3. **Scaffold** — Copy templates, wire shared packages, generate project CLAUDE.md
4. **Build** — Scout first (investigate, present tradeoffs), then code with narration
5. **Deploy** — Follow the playbook (Cloud Run for API/web, TestFlight for iOS)
6. **Extract** — Did we solve something reusable? Package it. Write a playbook. The factory grows.

The factory constrains the product. If the platform doesn't support a capability, the product doesn't have it — until the platform is extended and every tenant benefits.

---

## What's Been Built With This

A sample of products that shipped through the factory:

| Product | What It Does | Stack Used |
|---------|-------------|------------|
| **Care intelligence platform** | Scans a parent's email, builds a care team profile with gaps and recommendations in 90 seconds | api-kit, document-kit, llm-kit, ios-templates |
| **[Civic decision engine](https://github.com/pauljump/findthemoney)** | Connects your tax bill to actual government spending across 115 data sources | api-kit, etl-kit, socrata-kit, web-templates |
| **[Prediction market aggregator](https://github.com/pauljump/polyfeeds)** | 120 live feeds from prediction markets, unified API | api-kit, etl-kit, job-queue, web-templates |
| **Tee time predictor** | Cancellation probability scoring for golf courses | api-kit, predict-kit, watch-kit, notify-kit |
| **Real-time voice agent** | Conversational AI with tool calling mid-sentence | api-kit, voice-kit, llm-kit |
| **Writing style capturer** | Custom keyboard that builds a portable LLM prompt from your writing patterns | api-kit, llm-kit, ios-templates |
| **Lawn care marketplace** | H3 hex-grid clustering with economics-based pricing | api-kit, geo-registry, web-templates |
| **AI agent network** | Personal AI agents with persistent souls, traits, and agent-to-agent conversation | api-kit, llm-kit, roundtable, ios-templates |

Each product took 1-3 sessions from idea to deployed. The shared packages meant most of the infrastructure was already built.

---

## All Packages

| Package | What It Does | LOC |
|---------|-------------|-----|
| **api-kit** | Fastify server — JWT auth, SQLite (WAL), rate limiting, health check, HTTP client with retry, cron | ~415 |
| **llm-kit** | Provider-agnostic LLM client — OpenAI + Anthropic, tool use | ~260 |
| **[roundtable](https://github.com/pauljump/roundtable)** | Persona engine — 16 personas, 12 roles, CLI + library (standalone repo) | ~257 |
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

---

## Design Decisions

**SQLite everywhere.** Every package that needs persistence uses SQLite in WAL mode. One fewer thing to deploy, monitor, and pay for. Services own their own data. This isn't a toy choice — it's a deliberate bet that most applications don't need a database server, and the ones that do will outgrow the factory anyway.

**Provider-agnostic from day one.** The LLM client wraps OpenAI and Anthropic behind the same interface. Production systems need to swap models without rewriting integration code. When Anthropic ships a better model on Tuesday, every tenant can switch by Wednesday.

**Playbooks over documentation.** Knowledge lives in executable playbooks, not wiki pages. A playbook solves one problem completely — every command, every gotcha, every config. An agent (human or AI) reads it and executes. If a playbook doesn't get you from zero to done, it's broken.

**Templates for UI, packages for logic.** iOS and web templates are copied into each project (each app needs its own brand values). Backend packages are real npm imports via pnpm workspaces (one place to fix bugs, every tenant gets the fix).

**The factory constrains the product.** If the platform doesn't support it, the product doesn't have it. This sounds limiting — it is. That's the point. It keeps 15+ products consistent and makes capability upgrades benefit every tenant. When `notify-kit` learned to send push notifications, every app that needed push got it for free.

**Two-strike rule for new capabilities.** If the same problem gets solved with custom code in two different projects, it's a candidate for extraction into a shared package. Don't preemptively build capabilities "just in case." Wait for the pain to be real, then extract.

---

## Related Work

Research, tools, and frameworks that came out of building with this system:

- **[roundtable](https://github.com/pauljump/roundtable)** — AI persona engine extracted from this factory. 16 cognitive profiles built from verified source material, adversarial idea evaluation pipeline. 199 ideas evaluated, 51% kill rate. The filter is the feature.

- **[agentspawn](https://github.com/pauljump/agentspawn)** — A psychology-grounded framework for designing the first interaction between an AI agent and its maker. 10 principles from developmental psychology (Bowlby, Winnicott, Rogers), 18 personality archetypes for testing. Born from building the AI agent network listed above.

- **[findthemoney](https://github.com/pauljump/findthemoney)** — How NYC's budget actually works. A framework for tracing public dollars across three levels of government without double-counting. Born from building the civic decision engine.

- **[itchy](https://github.com/pauljump/itchy)** — A byte-level language model for OpenAI's Parameter Golf competition. First byte-level submission in the competition — 256-entry embedding table vs. 1024 frees hundreds of thousands of parameters for model capacity. 0.67 BPB vs. 2.56 baseline.

---

## Stack

- **Runtime:** Node 22, ESM, TypeScript strict
- **Backend:** Fastify 5, better-sqlite3, Zod
- **Web:** Next.js 16, React 19, Tailwind CSS 4
- **iOS:** Swift, SwiftUI, XcodeGen
- **AI:** OpenAI API, Anthropic API, Vercel AI SDK, Apple Foundation Models
- **Deploy:** Cloud Run (API + web), TestFlight (iOS)
- **Monorepo:** pnpm workspaces, Turborepo

---

## Author

**Paul Jump** — 12 years at Uber building API ecosystems, partner engineering, and operating models for 500+ FTE engineering orgs. Built this system to answer one question: what happens when you treat product development as a manufacturing problem and AI agents as factory workers?

The answer: you ship faster, compound knowledge across projects, and every product you build makes the next one trivially easy to launch.
