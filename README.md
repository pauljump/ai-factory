# AI Factory

A CLI tool that turns a collection of projects into a compounding production environment — where every project you ship makes the next one faster.

**The thesis:** AI coding agents produce prototypes. AI + a compounding knowledge system produces production-grade software at scale. The difference is institutional memory.

## What It Does

AI Factory analyzes your existing projects, extracts knowledge (architecture decisions, gotchas, conventions, playbooks), stores it in a searchable knowledge base, and automatically injects relevant context into every new coding session. The result: session 50 is fundamentally different from session 1.

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

## Design Docs

- [Design Spec](docs/2026-03-26-koba-v2-spec.md) — full architecture, Claude Code as intelligence layer
- [Factory Spec](docs/the-factory-spec.md) — thesis, product development lifecycle, validation metrics

## License

MIT
