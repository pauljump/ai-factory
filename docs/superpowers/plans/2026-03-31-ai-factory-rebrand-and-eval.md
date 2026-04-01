# AI Factory — Rebrand, Honest README, Evaluation Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the koba repo into a polished, honest, technically impressive `ai-factory` — rebranded, with an honest README, and a real retrieval evaluation layer that demonstrates RAG/eval expertise.

**Architecture:** Three workstreams executed sequentially. (1) Rebrand all internal references from "koba" to "factory" — config file, CLI command, workspace detection, templates, tests. (2) Rewrite README to be honest about what exists and how to use it. (3) Add `factory eval` command with a retrieval evaluation harness that scores knowledge retrieval precision, recall, and MRR against test cases, outputting structured scorecards.

**Tech Stack:** TypeScript, Node 22, ESM, SQLite FTS5, Vitest, commander CLI

---

## File Map

**Rebrand (modify):**
- `package.json` — name, bin, scripts
- `bin/koba.ts` → `bin/factory.ts` — CLI entry point rename + internal `.name()` change
- `src/workspace.ts` — `koba.json` → `factory.json` references
- `src/commands/init.ts` — `koba.json` → `factory.json`, console messages
- `src/commands/convert.ts` — `koba.json` reference
- `src/commands/new.ts` — "koba factory" reference
- `src/commands/status.ts` — "koba knowledge" reference
- `src/commands/knowledge.ts` — "koba knowledge" reference
- `src/commands/scan.ts` — "koba convert" reference
- `src/templates/claude-md.ts` — all `koba:` markers → `factory:`, command references
- `src/templates/hooks.ts` — `koba _hook` → `factory _hook`
- `src/templates/koba-config.js` → `src/templates/factory-config.ts` — rename file
- `src/engine/claude-md-gen.ts` — `koba:` markers, command references
- `tests/init.test.ts` — `koba.json`, bin path, describe names
- `tests/new.test.ts` — bin path, describe names
- `tests/convert.test.ts` — `koba.json`, bin path, describe names
- `tests/cli.test.ts` — bin path, describe names
- `tests/workspace.test.ts` — `koba.json`, `koba-test-workspace`
- `tests/claude-md-gen.test.ts` — marker references
- `tests/conventions.test.ts` — temp dir names
- `tests/playbook-store.test.ts` — temp dir names
- `tests/discover.test.ts` — temp dir names
- `tests/soul.test.ts` — temp dir names

**README (modify):**
- `README.md` — complete rewrite

**Eval layer (create):**
- `src/commands/eval.ts` — new CLI command
- `src/engine/eval.ts` — evaluation harness (precision, recall, MRR scoring)
- `src/engine/eval-cases.ts` — built-in test case definitions
- `tests/eval.test.ts` — tests for evaluation engine

**Eval layer (modify):**
- `bin/factory.ts` — register `eval` command
- `src/engine/types.ts` — add `EvalCase`, `EvalResult`, `EvalScorecard` types

---

### Task 1: Rename bin/koba.ts → bin/factory.ts and update CLI name

**Files:**
- Rename: `bin/koba.ts` → `bin/factory.ts`
- Modify: `package.json`

- [ ] **Step 1: Rename the bin file**

```bash
cd /tmp/ai-factory-check
mv bin/koba.ts bin/factory.ts
```

- [ ] **Step 2: Update package.json**

In `package.json`, change:
```json
{
  "name": "koba",
  "description": "The Factory — AI-powered compounding production system",
  "bin": {
    "koba": "./bin/koba.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```
to:
```json
{
  "name": "ai-factory",
  "description": "AI Factory — a compounding production system for shipping software with AI coding agents",
  "bin": {
    "factory": "./bin/factory.ts"
  },
  "scripts": {
    "factory": "tsx bin/factory.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Update CLI name inside bin/factory.ts**

In `bin/factory.ts`, change `.name('koba')` to `.name('factory')` and update the description:

```typescript
program
  .name('factory')
  .description('AI Factory — compounding production system for shipping software with AI coding agents')
  .version(pkg.version)
```

- [ ] **Step 4: Run tests to see what breaks**

Run: `cd /tmp/ai-factory-check && npm test 2>&1 | tail -30`
Expected: Several test failures referencing `bin/koba.ts` — that's what we fix next.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename CLI from koba to factory"
```

---

### Task 2: Rebrand workspace detection — koba.json → factory.json

**Files:**
- Modify: `src/workspace.ts`
- Modify: `src/commands/init.ts`
- Modify: `src/commands/convert.ts`
- Rename: `src/templates/koba-config.js` → `src/templates/factory-config.ts`

- [ ] **Step 1: Update workspace.ts**

In `src/workspace.ts`, make these three changes:

Line 23 — change `'koba.json'` to `'factory.json'`:
```typescript
    if (existsSync(join(dir, 'factory.json'))) {
```

Line 43 — change config path:
```typescript
    config: join(root, 'factory.json'),
```

Line 53 — change error message:
```typescript
    console.error('Error: not inside a factory workspace. Run `factory init` first.')
```

- [ ] **Step 2: Rename koba-config template**

```bash
cd /tmp/ai-factory-check
mv src/templates/koba-config.js src/templates/factory-config.ts
```

If the file uses `koba` in its function name, rename `generateKobaConfig` → `generateFactoryConfig`.

- [ ] **Step 3: Update init.ts**

In `src/commands/init.ts`:

Change the import:
```typescript
import { generateFactoryConfig } from '../templates/factory-config.js'
```

Change line 11 (`koba.json` check):
```typescript
  if (existsSync(join(dir, 'factory.json'))) {
    console.error(`Error: ${dir} is already a factory workspace.`)
```

Change line 23 (write config):
```typescript
  writeFileSync(join(dir, 'factory.json'), JSON.stringify(generateFactoryConfig(name), null, 2) + '\n')
  console.log('  ✓ factory.json')
```

Change lines 74-75 (next steps):
```typescript
  console.log(`  factory convert ~/path/to/existing/projects   # import existing work`)
  console.log(`  factory new my-first-project                  # or start fresh`)
```

- [ ] **Step 4: Update convert.ts**

In `src/commands/convert.ts`, change lines 228-232:
```typescript
  // Update factory.json
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))
  config.stack.supported = [...frameworks]
  writeFileSync(ws.config, JSON.stringify(config, null, 2) + '\n')
  console.log(`  ✓ factory.json updated`)
```

- [ ] **Step 5: Run tests**

Run: `cd /tmp/ai-factory-check && npm test 2>&1 | tail -30`
Expected: More failures fixed, but template/test files still reference koba.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename workspace config from koba.json to factory.json"
```

---

### Task 3: Rebrand templates and remaining commands

**Files:**
- Modify: `src/templates/claude-md.ts`
- Modify: `src/templates/hooks.ts`
- Modify: `src/commands/new.ts`
- Modify: `src/commands/status.ts`
- Modify: `src/commands/knowledge.ts`
- Modify: `src/commands/scan.ts`
- Modify: `src/engine/claude-md-gen.ts`

- [ ] **Step 1: Update claude-md.ts template**

In `src/templates/claude-md.ts`, replace ALL occurrences:
- `koba:user-start` → `factory:user-start`
- `koba:user-end` → `factory:user-end`
- `koba:auto-start` → `factory:auto-start`
- `koba:auto-end` → `factory:auto-end`
- `koba will never overwrite` → `factory will never overwrite`
- `koba scan` → `factory scan`
- `Koba Factory` → `AI Factory`

The function signature and export stay the same.

- [ ] **Step 2: Update hooks.ts**

In `src/templates/hooks.ts`, change both hook scripts:
- `koba _hook session-start` → `factory _hook session-start`
- `koba _hook stop` → `factory _hook stop`
- `# Koba SessionStart hook` → `# Factory SessionStart hook`
- `# Koba Stop hook` → `# Factory Stop hook`

- [ ] **Step 3: Update new.ts**

In `src/commands/new.ts` line 120, change:
```typescript
${typeDescriptions[type] ?? 'Project'} — part of the factory.
```

- [ ] **Step 4: Update status.ts**

In `src/commands/status.ts` line 107, change:
```typescript
    console.log(`Knowledge: not initialized (run factory knowledge rebuild)`)
```

- [ ] **Step 5: Update knowledge.ts**

In `src/commands/knowledge.ts` line 13, change:
```typescript
      console.error('Usage: factory knowledge search <query>')
```

- [ ] **Step 6: Update scan.ts**

In `src/commands/scan.ts` line 64, change:
```typescript
    console.log('\nSoul: missing (run factory convert to seed)')
```

- [ ] **Step 7: Update claude-md-gen.ts**

In `src/engine/claude-md-gen.ts`:
- Line 11 comment: `koba:user-start` → `factory:user-start`, `koba:user-end` → `factory:user-end`
- Lines 49-50: change marker strings from `koba:auto-start` and `koba:auto-end` to `factory:auto-start` and `factory:auto-end`
- Line 68: `koba convert` → `factory convert`
- Line 74: `koba new` → `factory new`

- [ ] **Step 8: Run tests**

Run: `cd /tmp/ai-factory-check && npm test 2>&1 | tail -30`
Expected: Template-related tests may still fail (they check for old marker strings).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: rebrand all templates and commands from koba to factory"
```

---

### Task 4: Update all tests for rebrand

**Files:**
- Modify: `tests/init.test.ts`
- Modify: `tests/new.test.ts`
- Modify: `tests/convert.test.ts`
- Modify: `tests/cli.test.ts`
- Modify: `tests/workspace.test.ts`
- Modify: `tests/claude-md-gen.test.ts`
- Modify: `tests/conventions.test.ts`
- Modify: `tests/playbook-store.test.ts`
- Modify: `tests/discover.test.ts`
- Modify: `tests/soul.test.ts`

- [ ] **Step 1: Bulk rename in test files**

Across ALL test files, apply these replacements:
- `'bin', 'koba.ts'` → `'bin', 'factory.ts'`
- `'koba-test-` → `'factory-test-`
- `'koba-discover-test'` → `'factory-discover-test'`
- `describe('koba ` → `describe('factory `
- `'koba.json'` → `'factory.json'`
- `'koba-test-init'` (expected config name) → `'factory-test-init'`
- `'koba:user-start'` → `'factory:user-start'`
- `'koba:auto-start'` → `'factory:auto-start'`

Do NOT change any imports or module paths that don't reference "koba".

- [ ] **Step 2: Run full test suite**

Run: `cd /tmp/ai-factory-check && npm test 2>&1`
Expected: All 76 tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: update all tests for factory rebrand"
```

---

### Task 5: Rewrite README.md — honest and impressive

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the new README**

Replace the entire contents of `README.md` with:

```markdown
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
```

- [ ] **Step 2: Verify README renders correctly**

Skim the markdown for broken formatting. Ensure the ASCII diagram renders as a code block.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README — honest install, real commands, architecture overview"
```

---

### Task 6: Add evaluation types

**Files:**
- Modify: `src/engine/types.ts`

- [ ] **Step 1: Write failing test for eval types**

Create `tests/eval.test.ts` with the first test:

```typescript
import { describe, it, expect } from 'vitest'
import type { EvalCase, EvalResult, EvalScorecard } from '../src/engine/types.js'

describe('eval types', () => {
  it('EvalCase has required fields', () => {
    const testCase: EvalCase = {
      id: 'test-sqlite-wal',
      query: 'SQLite WAL mode',
      relevantIds: ['cloud-run-sqlite-wal', 'sqlite-wal-gotcha'],
      tags: ['sqlite', 'cloud-run'],
    }
    expect(testCase.id).toBe('test-sqlite-wal')
    expect(testCase.relevantIds.length).toBe(2)
  })

  it('EvalResult captures retrieval metrics', () => {
    const result: EvalResult = {
      caseId: 'test-sqlite-wal',
      query: 'SQLite WAL mode',
      retrievedIds: ['cloud-run-sqlite-wal', 'unrelated-entry', 'sqlite-wal-gotcha'],
      relevantIds: ['cloud-run-sqlite-wal', 'sqlite-wal-gotcha'],
      precision: 2 / 3,
      recall: 1.0,
      reciprocalRank: 1.0,
    }
    expect(result.precision).toBeCloseTo(0.667, 2)
    expect(result.recall).toBe(1.0)
  })

  it('EvalScorecard aggregates results', () => {
    const scorecard: EvalScorecard = {
      timestamp: '2026-03-31T12:00:00Z',
      totalCases: 5,
      meanPrecision: 0.8,
      meanRecall: 0.9,
      meanReciprocalRank: 0.85,
      results: [],
    }
    expect(scorecard.meanPrecision).toBe(0.8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /tmp/ai-factory-check && npx vitest run tests/eval.test.ts 2>&1 | tail -10`
Expected: PASS (these are type-only checks that compile if the types exist). If types don't exist yet, TypeScript will error.

- [ ] **Step 3: Add types to types.ts**

Append to `src/engine/types.ts`:

```typescript
/** A test case for evaluating knowledge retrieval quality */
export interface EvalCase {
  /** Unique test case ID */
  id: string
  /** The search query to run against the knowledge store */
  query: string
  /** IDs of knowledge entries that SHOULD be retrieved for this query */
  relevantIds: string[]
  /** Optional tags to also search by */
  tags?: string[]
}

/** Result of running one eval case against the knowledge store */
export interface EvalResult {
  /** Which test case this result is for */
  caseId: string
  /** The query that was run */
  query: string
  /** IDs of entries actually retrieved (in rank order) */
  retrievedIds: string[]
  /** IDs of entries that should have been retrieved */
  relevantIds: string[]
  /** Precision: |retrieved ∩ relevant| / |retrieved| */
  precision: number
  /** Recall: |retrieved ∩ relevant| / |relevant| */
  recall: number
  /** Reciprocal rank: 1 / position of first relevant result (0 if none) */
  reciprocalRank: number
}

/** Aggregated scorecard from running all eval cases */
export interface EvalScorecard {
  /** When this eval was run */
  timestamp: string
  /** Total number of test cases */
  totalCases: number
  /** Mean precision across all cases */
  meanPrecision: number
  /** Mean recall across all cases */
  meanRecall: number
  /** Mean reciprocal rank across all cases */
  meanReciprocalRank: number
  /** Individual case results */
  results: EvalResult[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /tmp/ai-factory-check && npx vitest run tests/eval.test.ts 2>&1 | tail -10`
Expected: PASS — all 3 type-check tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts tests/eval.test.ts
git commit -m "feat: add evaluation types — EvalCase, EvalResult, EvalScorecard"
```

---

### Task 7: Implement the evaluation engine

**Files:**
- Create: `src/engine/eval.ts`
- Modify: `tests/eval.test.ts`

- [ ] **Step 1: Write failing tests for the eval engine**

Append to `tests/eval.test.ts`:

```typescript
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/engine/db.js'
import { createKnowledgeStore } from '../src/engine/knowledge-store.js'
import { runEvalCase, runEvalSuite, generateScorecard } from '../src/engine/eval.js'
import type { KnowledgeEntry, EvalCase } from '../src/engine/types.js'

function makeEntry(id: string, domain: string, tags: string[], body: string): KnowledgeEntry {
  return {
    id, domain, tags, body,
    confidence: 'high',
    sourceProject: 'test-project',
    date: '2026-03-31',
    lastVerified: '2026-03-31',
    timesInjected: 0,
    timesUseful: 0,
  }
}

describe('runEvalCase', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite', 'wal'], 'SQLite WAL mode enables concurrent reads during writes'))
    store.index(makeEntry('sqlite-fk', 'sqlite', ['sqlite', 'foreign-keys'], 'Always enable foreign keys with PRAGMA foreign_keys = ON'))
    store.index(makeEntry('cloud-run-volume', 'cloud-run', ['cloud-run', 'sqlite'], 'Mount a persistent volume for SQLite on Cloud Run'))
    store.index(makeEntry('nextjs-standalone', 'nextjs', ['nextjs', 'deploy'], 'Use output: standalone for Cloud Run deployment'))
    store.index(makeEntry('ios-bundle-id', 'ios', ['ios', 'xcode'], 'Bundle ID must match App Store Connect exactly'))
  })

  it('computes precision and recall for a matching query', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-sqlite',
      query: 'SQLite WAL mode',
      relevantIds: ['sqlite-wal', 'cloud-run-volume'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.caseId).toBe('test-sqlite')
    expect(result.retrievedIds.length).toBeGreaterThan(0)
    // sqlite-wal should definitely be retrieved
    expect(result.retrievedIds).toContain('sqlite-wal')
    expect(result.recall).toBeGreaterThan(0)
    expect(result.precision).toBeGreaterThan(0)
    expect(result.reciprocalRank).toBeGreaterThan(0)
  })

  it('returns zero metrics when nothing matches', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-no-match',
      query: 'quantum computing entanglement',
      relevantIds: ['does-not-exist'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.recall).toBe(0)
    expect(result.reciprocalRank).toBe(0)
  })

  it('handles perfect retrieval', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-ios',
      query: 'iOS bundle ID Xcode',
      relevantIds: ['ios-bundle-id'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.retrievedIds).toContain('ios-bundle-id')
    expect(result.recall).toBe(1.0)
    expect(result.reciprocalRank).toBe(1.0)
  })
})

describe('runEvalSuite', () => {
  it('runs multiple cases and aggregates', () => {
    const db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite'], 'WAL mode'))
    store.index(makeEntry('ios-bundle', 'ios', ['ios'], 'Bundle ID'))

    const cases: EvalCase[] = [
      { id: 'c1', query: 'SQLite WAL', relevantIds: ['sqlite-wal'] },
      { id: 'c2', query: 'iOS bundle', relevantIds: ['ios-bundle'] },
    ]

    const scorecard = runEvalSuite(store, cases)
    expect(scorecard.totalCases).toBe(2)
    expect(scorecard.results.length).toBe(2)
    expect(scorecard.meanRecall).toBeGreaterThan(0)
    expect(scorecard.meanReciprocalRank).toBeGreaterThan(0)
  })
})

describe('generateScorecard', () => {
  it('formats scorecard as markdown', () => {
    const db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite'], 'WAL mode'))

    const cases: EvalCase[] = [
      { id: 'c1', query: 'SQLite WAL', relevantIds: ['sqlite-wal'] },
    ]

    const scorecard = runEvalSuite(store, cases)
    const markdown = generateScorecard(scorecard)

    expect(markdown).toContain('Retrieval Evaluation')
    expect(markdown).toContain('Precision')
    expect(markdown).toContain('Recall')
    expect(markdown).toContain('MRR')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /tmp/ai-factory-check && npx vitest run tests/eval.test.ts 2>&1 | tail -15`
Expected: FAIL — `runEvalCase`, `runEvalSuite`, `generateScorecard` don't exist yet.

- [ ] **Step 3: Implement src/engine/eval.ts**

Create `src/engine/eval.ts`:

```typescript
import type { EvalCase, EvalResult, EvalScorecard, KnowledgeEntry } from './types.js'

interface EvalStore {
  search(query: string, limit?: number): KnowledgeEntry[]
  searchByTags(tags: string[]): KnowledgeEntry[]
}

const EVAL_LIMIT = 10

/**
 * Run a single eval case against the knowledge store.
 * Retrieves entries via FTS5 search (and tag search if tags provided),
 * then computes precision, recall, and reciprocal rank.
 */
export function runEvalCase(store: EvalStore, evalCase: EvalCase): EvalResult {
  const retrieved = new Map<string, number>() // id → rank position

  // Primary: FTS5 search
  const searchResults = store.search(evalCase.query, EVAL_LIMIT)
  for (let i = 0; i < searchResults.length; i++) {
    if (!retrieved.has(searchResults[i]!.id)) {
      retrieved.set(searchResults[i]!.id, retrieved.size + 1)
    }
  }

  // Secondary: tag search if tags provided
  if (evalCase.tags && evalCase.tags.length > 0) {
    const tagResults = store.searchByTags(evalCase.tags)
    for (const entry of tagResults) {
      if (!retrieved.has(entry.id)) {
        retrieved.set(entry.id, retrieved.size + 1)
      }
    }
  }

  const retrievedIds = [...retrieved.keys()]
  const relevantSet = new Set(evalCase.relevantIds)

  // Precision: |retrieved ∩ relevant| / |retrieved|
  const hits = retrievedIds.filter(id => relevantSet.has(id))
  const precision = retrievedIds.length > 0 ? hits.length / retrievedIds.length : 0

  // Recall: |retrieved ∩ relevant| / |relevant|
  const recall = relevantSet.size > 0 ? hits.length / relevantSet.size : 0

  // Reciprocal rank: 1 / position of first relevant result
  let reciprocalRank = 0
  for (const [id, rank] of retrieved) {
    if (relevantSet.has(id)) {
      reciprocalRank = 1 / rank
      break
    }
  }

  return {
    caseId: evalCase.id,
    query: evalCase.query,
    retrievedIds,
    relevantIds: evalCase.relevantIds,
    precision,
    recall,
    reciprocalRank,
  }
}

/**
 * Run all eval cases and produce an aggregated scorecard.
 */
export function runEvalSuite(store: EvalStore, cases: EvalCase[]): EvalScorecard {
  const results = cases.map(c => runEvalCase(store, c))

  const totalCases = results.length
  const meanPrecision = totalCases > 0
    ? results.reduce((sum, r) => sum + r.precision, 0) / totalCases
    : 0
  const meanRecall = totalCases > 0
    ? results.reduce((sum, r) => sum + r.recall, 0) / totalCases
    : 0
  const meanReciprocalRank = totalCases > 0
    ? results.reduce((sum, r) => sum + r.reciprocalRank, 0) / totalCases
    : 0

  return {
    timestamp: new Date().toISOString(),
    totalCases,
    meanPrecision,
    meanRecall,
    meanReciprocalRank,
    results,
  }
}

/**
 * Format a scorecard as a markdown report.
 */
export function generateScorecard(scorecard: EvalScorecard): string {
  const lines: string[] = []

  lines.push('# Retrieval Evaluation Scorecard')
  lines.push('')
  lines.push(`**Run:** ${scorecard.timestamp}`)
  lines.push(`**Cases:** ${scorecard.totalCases}`)
  lines.push('')
  lines.push('## Aggregate Metrics')
  lines.push('')
  lines.push('| Metric | Score |')
  lines.push('|--------|-------|')
  lines.push(`| Precision | ${(scorecard.meanPrecision * 100).toFixed(1)}% |`)
  lines.push(`| Recall | ${(scorecard.meanRecall * 100).toFixed(1)}% |`)
  lines.push(`| MRR | ${(scorecard.meanReciprocalRank * 100).toFixed(1)}% |`)
  lines.push('')
  lines.push('## Per-Case Results')
  lines.push('')
  lines.push('| Case | Query | Precision | Recall | RR | Retrieved | Relevant |')
  lines.push('|------|-------|-----------|--------|----|-----------|----------|')

  for (const r of scorecard.results) {
    const p = (r.precision * 100).toFixed(0) + '%'
    const rec = (r.recall * 100).toFixed(0) + '%'
    const rr = r.reciprocalRank.toFixed(2)
    const retrieved = r.retrievedIds.length.toString()
    const relevant = r.relevantIds.length.toString()
    lines.push(`| ${r.caseId} | ${r.query} | ${p} | ${rec} | ${rr} | ${retrieved} | ${relevant} |`)
  }

  lines.push('')
  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /tmp/ai-factory-check && npx vitest run tests/eval.test.ts 2>&1 | tail -20`
Expected: All eval tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/eval.ts tests/eval.test.ts
git commit -m "feat: add retrieval evaluation engine — precision, recall, MRR scoring"
```

---

### Task 8: Add built-in eval cases and CLI command

**Files:**
- Create: `src/engine/eval-cases.ts`
- Create: `src/commands/eval.ts`
- Modify: `bin/factory.ts`

- [ ] **Step 1: Create built-in eval cases**

Create `src/engine/eval-cases.ts`:

```typescript
import type { EvalCase } from './types.js'

/**
 * Built-in evaluation cases for common knowledge domains.
 * These test whether the knowledge store can retrieve relevant entries
 * for typical developer queries across the factory's supported stack.
 *
 * Users can extend these by adding cases to scorecards/eval-cases.json.
 */
export const BUILTIN_EVAL_CASES: EvalCase[] = [
  {
    id: 'eval-sqlite-wal',
    query: 'SQLite WAL mode concurrent reads',
    relevantIds: [],  // populated dynamically from knowledge store
    tags: ['sqlite', 'wal'],
  },
  {
    id: 'eval-cloud-run-deploy',
    query: 'deploy to Cloud Run with Dockerfile',
    relevantIds: [],
    tags: ['cloud-run', 'docker', 'deploy'],
  },
  {
    id: 'eval-ios-testflight',
    query: 'upload build to TestFlight App Store Connect',
    relevantIds: [],
    tags: ['ios', 'testflight', 'deploy'],
  },
  {
    id: 'eval-nextjs-standalone',
    query: 'Next.js standalone output for containerization',
    relevantIds: [],
    tags: ['nextjs', 'deploy', 'docker'],
  },
  {
    id: 'eval-auth-jwt',
    query: 'JWT authentication middleware',
    relevantIds: [],
    tags: ['auth', 'jwt', 'fastify'],
  },
  {
    id: 'eval-scraping-etl',
    query: 'web scraping with retry and rate limiting',
    relevantIds: [],
    tags: ['scraping', 'etl', 'puppeteer'],
  },
  {
    id: 'eval-storekit-iap',
    query: 'StoreKit in-app purchase implementation',
    relevantIds: [],
    tags: ['ios', 'storekit', 'payments'],
  },
]

/**
 * Resolve eval cases against the actual knowledge store.
 * For built-in cases with empty relevantIds, populate them by
 * finding entries that match the case's tags.
 */
export function resolveEvalCases(
  cases: EvalCase[],
  searchByTags: (tags: string[]) => { id: string }[],
): EvalCase[] {
  return cases.map(c => {
    if (c.relevantIds.length > 0) return c
    if (!c.tags || c.tags.length === 0) return c

    const matches = searchByTags(c.tags)
    return {
      ...c,
      relevantIds: matches.map(m => m.id),
    }
  })
}
```

- [ ] **Step 2: Create the eval CLI command**

Create `src/commands/eval.ts`:

```typescript
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { runEvalSuite, generateScorecard } from '../engine/eval.js'
import { BUILTIN_EVAL_CASES, resolveEvalCases } from '../engine/eval-cases.js'
import type { EvalCase } from '../engine/types.js'

export async function evalCommand(): Promise<void> {
  const ws = requireWorkspace()

  if (!existsSync(ws.db)) {
    console.error('No knowledge store found. Run `factory convert` or `factory knowledge rebuild` first.')
    process.exit(1)
  }

  const db = openFactoryDb(ws.db)
  const store = createKnowledgeStore(db)

  // Load built-in cases
  let cases: EvalCase[] = [...BUILTIN_EVAL_CASES]

  // Load custom cases if they exist
  const customPath = join(ws.scorecards, 'eval-cases.json')
  if (existsSync(customPath)) {
    const custom = JSON.parse(readFileSync(customPath, 'utf-8')) as EvalCase[]
    cases.push(...custom)
  }

  // Resolve cases — populate relevantIds from knowledge store for built-in cases
  cases = resolveEvalCases(cases, (tags) => store.searchByTags(tags))

  // Filter out cases with no relevant entries (nothing to evaluate against)
  const runnable = cases.filter(c => c.relevantIds.length > 0)
  const skipped = cases.length - runnable.length

  if (runnable.length === 0) {
    console.log('No eval cases have matching knowledge entries. Add more knowledge first.')
    db.close()
    return
  }

  console.log(`\nRunning ${runnable.length} eval cases (${skipped} skipped — no matching entries)...\n`)

  const scorecard = runEvalSuite(store, runnable)
  db.close()

  // Print summary
  console.log('RETRIEVAL EVALUATION')
  console.log('─'.repeat(40))
  console.log(`  Precision:  ${(scorecard.meanPrecision * 100).toFixed(1)}%`)
  console.log(`  Recall:     ${(scorecard.meanRecall * 100).toFixed(1)}%`)
  console.log(`  MRR:        ${(scorecard.meanReciprocalRank * 100).toFixed(1)}%`)
  console.log('')

  for (const r of scorecard.results) {
    const status = r.recall === 1.0 ? '✓' : r.recall > 0 ? '~' : '✗'
    console.log(`  ${status} ${r.caseId}: P=${(r.precision * 100).toFixed(0)}% R=${(r.recall * 100).toFixed(0)}% RR=${r.reciprocalRank.toFixed(2)}`)
  }

  // Save scorecard
  mkdirSync(ws.scorecards, { recursive: true })
  const filename = `eval-${scorecard.timestamp.slice(0, 10)}.md`
  const scorecardPath = join(ws.scorecards, filename)
  writeFileSync(scorecardPath, generateScorecard(scorecard))

  console.log(`\nScorecard saved to scorecards/${filename}`)
}
```

- [ ] **Step 3: Register eval command in bin/factory.ts**

Add after the `_hook` command registration in `bin/factory.ts`:

```typescript
program
  .command('eval')
  .description('Evaluate knowledge retrieval quality')
  .action(async () => {
    const { evalCommand } = await import('../src/commands/eval.js')
    await evalCommand()
  })
```

- [ ] **Step 4: Write test for eval-cases.ts**

Append to `tests/eval.test.ts`:

```typescript
import { BUILTIN_EVAL_CASES, resolveEvalCases } from '../src/engine/eval-cases.js'

describe('eval-cases', () => {
  it('has built-in cases', () => {
    expect(BUILTIN_EVAL_CASES.length).toBeGreaterThan(0)
    for (const c of BUILTIN_EVAL_CASES) {
      expect(c.id).toBeTruthy()
      expect(c.query).toBeTruthy()
    }
  })

  it('resolves cases with empty relevantIds from tag search', () => {
    const cases: EvalCase[] = [
      { id: 'c1', query: 'test', relevantIds: [], tags: ['sqlite'] },
      { id: 'c2', query: 'test', relevantIds: ['already-set'], tags: ['ios'] },
    ]

    const resolved = resolveEvalCases(cases, (tags) => {
      if (tags.includes('sqlite')) return [{ id: 'sqlite-entry-1' }, { id: 'sqlite-entry-2' }]
      return []
    })

    expect(resolved[0]!.relevantIds).toEqual(['sqlite-entry-1', 'sqlite-entry-2'])
    expect(resolved[1]!.relevantIds).toEqual(['already-set'])
  })
})
```

- [ ] **Step 5: Run full test suite**

Run: `cd /tmp/ai-factory-check && npm test 2>&1`
Expected: All tests pass (76 original + new eval tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add factory eval command — retrieval quality scoring with built-in test cases"
```

---

### Task 9: Run full suite, verify, push

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd /tmp/ai-factory-check && npm test 2>&1`
Expected: All tests pass.

- [ ] **Step 2: Verify CLI runs**

```bash
cd /tmp/ai-factory-check && npx tsx bin/factory.ts --help
```

Expected output should show `factory` as the program name with all commands listed including `eval`.

- [ ] **Step 3: Verify the README is accurate**

Read through `README.md`. Every command listed should match the CLI help output. The install instructions should work (git clone + npm install + npm link).

- [ ] **Step 4: Push to GitHub**

```bash
cd /tmp/ai-factory-check && git push origin main
```

This updates `github.com/pauljump/ai-factory` with the rebranded, honest, eval-equipped codebase.
