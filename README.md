# Koba

A CLI tool that turns a collection of projects into a compounding production environment.

**The thesis:** AI alone produces prototypes. AI + a compounding system produces production-grade software at scale.

## Install

```bash
npm install -g koba
```

## Usage

### Create a factory workspace

```bash
koba init my-factory
cd my-factory
```

Creates: `projects/`, `packages/`, `knowledge/`, `koba.json`, `CLAUDE.md`, Claude Code hooks — all wired and ready.

### Import existing projects

```bash
koba convert ~/path/to/monorepo
```

Scans your projects, identifies shared patterns, harvests domain knowledge, and organizes everything into the factory workspace. *(Coming in v0.3)*

### Check factory health

```bash
koba status
```

### Search knowledge

```bash
koba knowledge search "sqlite cloud run"
koba knowledge stats
koba knowledge rebuild
```

### Scan for patterns

```bash
koba scan
```

## How It Works

Koba uses Claude Code to do the heavy lifting. The CLI provides structure — workspace layout, knowledge store, hooks. Claude Code provides intelligence — pattern recognition, knowledge harvesting, code extraction.

**SessionStart hook:** Every Claude Code session gets relevant knowledge injected automatically based on what project you're in.

**Knowledge capture:** At session end, new knowledge is proposed. You approve or reject.

**Shared code extraction:** When koba finds the same pattern in 3+ projects, it recommends extracting a shared package.

## What's Built

| Component | Status |
|-----------|--------|
| `koba init` — create factory workspace | Working |
| `koba status` — factory dashboard | Working |
| `koba scan` — project analysis | Working |
| `koba knowledge` — search, rebuild, stats | Working |
| `koba _hook` — Claude Code hook integration | Working |
| Knowledge store (FTS5 search) | Working |
| Session analytics | Working |
| Test suite | 49 tests passing |

## What's Next

| Feature | Version |
|---------|---------|
| `koba convert` — ingest existing monorepo | v0.3 |
| Deep scanner (source-level analysis via Claude Code) | v0.3 |
| `koba new` — create projects from templates | v0.4 |
| CLAUDE.md auto-regeneration | v0.4 |

## Stack

- TypeScript, Node 22, ESM
- SQLite + FTS5 (knowledge search)
- Claude Code hooks
- pnpm workspaces

## Docs

- [v2 Design Spec](docs/2026-03-26-koba-v2-spec.md) — full architecture
- [Original Factory Spec](docs/the-factory-spec.md) — thesis, PDLC, metrics
- [Phase 0 Plan](docs/2026-03-26-factory-phase-0-plan.md)
- [Sub-Project 1 Plan](docs/2026-03-26-sub1-cli-init-plan.md)

## License

MIT
