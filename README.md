# AI Factory

**The problem with AI coding agents isn't intelligence — it's amnesia.**

Every session starts from zero. The agent doesn't know that you tried approach X last week and it failed, that module Y has a subtle invariant, or that the deploy requires a flag nobody documented. You re-explain the same context, hit the same walls, and wonder why session 50 doesn't feel faster than session 1.

AI Factory fixes this. It's a CLI that builds a persistent knowledge layer across your projects — harvesting architecture decisions, gotchas, conventions, and playbooks into a searchable store, then automatically injecting the right context into every coding session. The result: compounding returns on every hour you invest.

I built this to run my own monorepo (16 apps, 21 shared packages, TypeScript + Swift). It went from "explain the deploy process every session" to "the agent already knows."

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Your Code   │────▶│  Knowledge    │────▶│  Session        │
│  (projects)  │     │  Store (FTS5) │     │  Injection      │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │                      │
   conventions          playbooks            AI coding agent
   gotchas              soul/style           gets full context
   architecture         research             before writing code
```

## Install

```bash
git clone https://github.com/pauljump/ai-factory.git
cd ai-factory
npm install
npm link    # makes `factory` available globally
```

## Quick Start

```bash
# Create a new factory workspace
factory init my-factory
cd my-factory

# Import your existing projects
factory convert ~/path/to/your/monorepo

# Or start a new project from scratch
factory new my-app -t api
```

## Commands

| Command | What it does |
|---------|-------------|
| `factory init [name]` | Creates a workspace with knowledge store, hooks, and auto-generated CLAUDE.md |
| `factory convert <source>` | Scans existing projects — discovers frameworks, harvests knowledge, copies playbooks, seeds the soul file. Use `--dry-run` to preview. |
| `factory new <name> [-t type]` | Creates a new project (`web`, `api`, `ios`, `pipeline`, `other`) with relevant knowledge pre-loaded |
| `factory scan` | Re-analyzes all projects, regenerates auto-sections of CLAUDE.md |
| `factory status` | Factory dashboard — projects, packages, knowledge stats, session metrics, stale warnings |
| `factory knowledge <action>` | `search <query>`, `rebuild` the FTS5 index, or view `stats` by domain |
| `factory eval` | Run retrieval evaluation — scores knowledge retrieval quality with precision, recall, and MRR metrics |

## How It Works

### Knowledge Harvesting

When you run `factory convert`, the system reads every project's CLAUDE.md, domain knowledge files, and playbooks. It extracts structured knowledge entries — each tagged with domain, confidence level, source project, and verification date. These are stored in SQLite with FTS5 full-text indexing.

### Session Injection

Claude Code hooks fire on every session start. The injection engine:
1. Detects which project you're in (from package.json, project.yml, Dockerfile)
2. Loads the soul file (collaboration style, principles)
3. Matches relevant playbooks by tag
4. Retrieves knowledge entries — prioritizing same-project entries, then tag matches, then full-text search
5. Injects a formatted context payload into the session

### CLAUDE.md Regeneration

`factory scan` auto-generates sections of your workspace CLAUDE.md (stack, project table, package list, knowledge domains, factory health) while preserving your hand-written sections (how you work, what not to build). Uses `<!-- factory:auto-start -->` / `<!-- factory:user-start -->` markers.

### Retrieval Evaluation

`factory eval` runs a suite of test cases against your knowledge store, measuring:
- **Precision** — what fraction of retrieved entries are actually relevant?
- **Recall** — what fraction of relevant entries were retrieved?
- **MRR** (Mean Reciprocal Rank) — how high does the first relevant result rank?

Scorecards are saved to `scorecards/` so you can track retrieval quality as your knowledge base grows.

## Architecture

```
src/
├── commands/          # CLI commands (init, convert, new, scan, status, knowledge, eval)
├── engine/            # Core logic
│   ├── knowledge-store.ts   # SQLite FTS5 knowledge indexing + retrieval
│   ├── inject-knowledge.ts  # Session context injection engine
│   ├── eval.ts              # Retrieval evaluation harness
│   ├── harvester.ts         # Knowledge extraction from CLAUDE.md files
│   ├── scanner.ts           # Project framework/dependency detection
│   ├── claude-md-gen.ts     # Auto-regeneration of CLAUDE.md sections
│   ├── baseline.ts          # Git history analysis (sessions, deploy timing)
│   └── ...
├── lib/
│   ├── search.ts            # FTS5 search with BM25 ranking
│   └── analytics.ts         # Session event tracking
└── templates/               # Generated file templates (CLAUDE.md, hooks, config)

tests/                 # 76+ tests covering all commands and engine modules
```

## Built With

- TypeScript, Node 22, ESM
- SQLite + FTS5 (knowledge search with BM25 ranking)
- Claude Code hooks (SessionStart, Stop)
- commander (CLI framework)
- Vitest (test framework)

## What It Powers

This tool runs a production monorepo with 16 active projects across iOS, web, and backend — including data pipelines, prediction market feeds, a persona simulation engine, and consumer apps on TestFlight. The knowledge store currently holds architecture decisions, deploy playbooks, and cross-project patterns that make launching a new app a single-session operation.

Related projects extracted from the same monorepo:
- **[kits](https://github.com/pauljump/kits)** — 11 composable backend packages (search, analytics, job queues, payments, etc.) that the factory manages
- **[teek](https://github.com/pauljump/teek)** — persona simulation engine used by the factory's AI agent ecosystem
- **[polyfeeds](https://github.com/pauljump/polyfeeds)** — 106 data feeds for prediction markets, one of the apps the factory powers

## Context

These repos are recent because the work isn't. Everything here was built inside a private monorepo over months of daily shipping — 16 apps, 21 shared packages, hundreds of commits. I'm open-sourcing the pieces that turned out to be genuinely reusable, both to maintain them properly as standalone tools and because they solved problems I couldn't find good existing solutions for. This is a personal engineering exercise, not a plea for community contributions.

## Design Docs

- [Design Spec](docs/2026-03-26-koba-v2-spec.md) — full architecture, Claude Code as intelligence layer
- [Factory Spec](docs/the-factory-spec.md) — thesis, product development lifecycle, validation metrics

## License

MIT

---

**Part of a larger system.** See [pauljump/portfolio](https://github.com/pauljump/portfolio) for the full picture — 16 production apps, shared infrastructure, and the factory that builds them.
