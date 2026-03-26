# Koba

A living system that turns a collection of projects into a compounding production environment. Not documentation — real code, real automation, real infrastructure.

**The thesis:** AI alone produces prototypes. AI + a compounding system produces production-grade software at scale. Koba is that system.

---

## What It Does

Point Koba at your projects. It scans them, learns your patterns, extracts domain knowledge, and builds a knowledge base that gets smarter with every session. The next time you start building, the system already knows what you know.

**Three pillars:**

1. **Shared Knowledge** — A structured, growing knowledge base organized by domain. Captures expertise as you build. Researches expertise you don't have. Injects the right knowledge at the right moment via Claude Code hooks. Not markdown files you hope someone reads — a real system with FTS5 search that automatically loads what's relevant.

2. **Shared Code** — Scanner scripts find duplicated patterns across your projects, identify the best implementation, and extract into shared packages. The factory has opinions — it pushes toward standardization.

3. **Shared Process** — The factory loop: Idea, Research, Build, Deploy, Polish, Iterate, Extract. Every cycle makes the factory smarter. New shared code extracted. New domain knowledge captured.

## How It Works

**Conversion (getting in):**
1. Scanner analyzes all your projects — framework, dependencies, patterns, infrastructure
2. AI reads the scan and makes judgment calls — what to standardize, what to extract, what knowledge to harvest
3. You approve the plan. Koba builds a new structure with shared packages wired and knowledge base bootstrapped.

**Living system (staying in):**
- **SessionStart hook** detects what project you're in, queries the knowledge base, injects relevant expertise into your Claude Code session
- **Stop hook** logs session metrics
- **Knowledge capture** at session end — AI proposes what was learned, you approve or reject
- Every session makes the next one faster

## What's Built (Phase 0)

| Component | Status |
|-----------|--------|
| Knowledge store (FTS5 search over structured markdown) | Working |
| SessionStart hook (context-aware knowledge injection) | Working |
| Stop hook (session metrics logging) | Working |
| Project scanner (framework/dependency detection) | Working |
| Baseline extraction (git history metrics) | Working |
| Analytics wiring (automated event tracking) | Working |
| Test suite (38 tests) | Passing |

## Quick Start

```bash
git clone https://github.com/pauljump/koba.git
cd koba
npm install
```

### Bootstrap from existing knowledge

If you have a `DOMAIN_KNOWLEDGE.md` file (a flat list of things you've learned across projects), convert it into structured entries:

```bash
# Edit scripts/bootstrap-knowledge.ts to point at your file
npm run bootstrap
```

### Scan your projects

```bash
# Edit scripts/scan-monorepo.ts to point at your project root
npm run scan
npm run baseline
```

### Install hooks

Add to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/koba/hooks/session-start.sh",
            "timeout": 15
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/koba/hooks/stop.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Now every Claude Code session automatically gets relevant knowledge injected.

## The PDLC

Koba measures itself. Every project built through it gets a scorecard compared against a baseline of how you built things before. The thesis is testable: plot project number vs. sessions-to-production. Old way = flat line. Koba = declining curve.

See [docs/the-factory-spec.md](docs/the-factory-spec.md) for the full design — metrics, go/no-go thresholds, phase gates, and kill criteria.

## What's Next

**Phase 1** (in progress): Build 5 projects through Koba, measure against baselines, prove knowledge injection makes sessions measurably better.

**Phase 2**: Extract shared packages from real patterns across projects. Prove code extraction works.

**Phase 3**: Full factory loop — idea to production in 1-2 sessions. Deep research fills knowledge gaps automatically. Teek personas informed by accumulated knowledge.

**Phase 4**: 50+ projects. Prove compounding. Open-source with measured evidence.

See [docs/2026-03-26-factory-phase-0-plan.md](docs/2026-03-26-factory-phase-0-plan.md) for the Phase 0 implementation plan.

## Design

Full design spec with architecture, PDLC, metrics, risk register, and panel validation (12 personas + 6 roles):

[docs/the-factory-spec.md](docs/the-factory-spec.md)

## Stack

- TypeScript (ESM, Node 22, strict)
- SQLite (better-sqlite3, FTS5 for knowledge search)
- Claude Code hooks (SessionStart, Stop)
- vitest for tests

## Author

**Paul Jump** — 12 years at Uber building API ecosystems and operating models. Built this to answer: what happens when you treat product development as a manufacturing problem and AI agents as factory workers?

The answer: you ship faster, compound knowledge across projects, and every product you build makes the next one trivially easy to launch.
