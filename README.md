# Koba

A CLI tool that turns a collection of projects into a compounding production environment.

**The thesis:** AI alone produces prototypes. AI + a compounding system produces production-grade software at scale.

## Install

```bash
npm install -g koba
```

## Quick Start

```bash
# Create a new factory workspace
koba init my-factory
cd my-factory

# Import your existing projects
koba convert ~/path/to/your/monorepo

# Or start a new project from scratch
koba new my-app -t api
```

## Commands

### `koba init [name]`

Creates a factory workspace with everything wired: `projects/`, `packages/`, `knowledge/`, `koba.json`, `CLAUDE.md`, Claude Code hooks.

### `koba convert <source> [--dry-run]`

Scans an existing monorepo or project directory. Discovers projects and packages, harvests domain knowledge from CLAUDE.md files, detects your stack, and copies everything into the factory workspace. Use `--dry-run` to preview without copying.

### `koba new <name> [-t web|api|ios|pipeline|other]`

Creates a new project with the right scaffold for its type. Generates `package.json`, `CLAUDE.md`, and tells you how many knowledge entries will be injected on your next session.

### `koba scan`

Re-analyzes all projects. Detects frameworks, counts shared package usage, and regenerates the auto-generated sections of CLAUDE.md (stack, project table, package list, knowledge domains).

### `koba status`

Factory dashboard: project count, package count, knowledge stats, session metrics, stale knowledge warnings.

### `koba knowledge search|rebuild|stats`

Search the knowledge base, rebuild the FTS5 index from markdown files, or view stats by domain.

## How It Works

Koba uses Claude Code to do the heavy lifting. The CLI provides structure — workspace layout, knowledge store, hooks. Claude Code provides intelligence — pattern recognition, knowledge harvesting, code extraction.

**SessionStart hook:** Every Claude Code session gets relevant knowledge injected automatically based on what project you're in.

**Knowledge capture:** At session end, new knowledge is proposed. You approve or reject.

**CLAUDE.md as OS:** The workspace CLAUDE.md is auto-generated from factory state. User-written sections (how you work, your principles) are preserved across regeneration. Everything else updates when you run `koba scan`.

## What's Built

| Component | Status |
|-----------|--------|
| `koba init` | Working |
| `koba convert` | Working |
| `koba new` | Working |
| `koba scan` + CLAUDE.md regeneration | Working |
| `koba status` | Working |
| `koba knowledge` search/rebuild/stats | Working |
| `koba _hook` session-start/stop | Working |
| Knowledge store (SQLite FTS5) | Working |
| Knowledge harvester (CLAUDE.md + DOMAIN_KNOWLEDGE.md) | Working |
| Project discovery + package adoption | Working |
| Session analytics | Working |
| Test suite | 61 tests passing |

## Stack

- TypeScript, Node 22, ESM
- SQLite + FTS5 (knowledge search)
- Claude Code hooks (SessionStart, Stop)
- pnpm workspaces
- commander (CLI)

## Docs

- [Design Spec](docs/2026-03-26-koba-v2-spec.md) — full architecture, Claude Code as intelligence layer
- [Factory Spec](docs/the-factory-spec.md) — thesis, PDLC, metrics, panel validation

## License

MIT
