# The Factory — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the factory's foundation — knowledge store, SessionStart hook, Stop hook, analytics wiring, and project scanner — so Phase 1 can begin building real projects through the factory with measured results.

**Architecture:** The factory lives at `factory/` in the monorepo as a pnpm workspace package. It uses `search-kit` for knowledge queries (FTS5), `analytics-kit` for metric collection, and `better-sqlite3` for persistence. Hook scripts are shell wrappers that invoke compiled TypeScript via `node`. Knowledge entries are structured markdown files (git-trackable, human-readable) indexed into SQLite for fast search.

**Tech Stack:** TypeScript (ESM, Node 22), better-sqlite3, @pauljump/search-kit, @pauljump/analytics-kit, Claude Code hooks (command type), vitest for tests.

**Spec:** `/Users/mini-home/Desktop/factory-knowledge-system/the-factory-spec.md`

---

## File Structure

```
factory/
  package.json                    — workspace package config
  tsconfig.json                   — TypeScript config (ESM, strict)
  vitest.config.ts                — test config

  src/
    db.ts                         — SQLite database setup + table init
    knowledge-store.ts            — CRUD + search over knowledge entries
    parse-entry.ts                — Parse markdown frontmatter files -> objects
    write-entry.ts                — Write objects -> markdown frontmatter files
    inject-knowledge.ts           — SessionStart logic: detect context, query, format
    cli-inject.ts                 — CLI entry point for SessionStart hook
    capture-session.ts            — Stop logic: write proposed entries, log metrics
    cli-capture.ts                — CLI entry point for Stop hook
    scanner.ts                    — Analyze a single project directory
    baseline.ts                   — Extract baseline metrics from git history
    types.ts                      — Shared type definitions

  hooks/
    session-start.sh              — Claude Code SessionStart hook wrapper
    stop.sh                       — Claude Code Stop hook wrapper

  scripts/
    bootstrap-knowledge.ts        — Convert DOMAIN_KNOWLEDGE.md into individual entries
    scan-monorepo.ts              — CLI: run scanner across all projects
    extract-baseline.ts           — CLI: extract baseline metrics from git history
    rebuild-index.ts              — CLI: rebuild FTS5 index from markdown files

  knowledge/                      — Structured markdown knowledge entries (git-tracked)
    cloud-run/
    ios/
    data-sources/
    apis/
    infrastructure/
    ...per domain

  data/
    factory.db                    — SQLite database (gitignored)

  scorecards/                     — Per-project scorecards (git-tracked)

  tests/
    knowledge-store.test.ts
    parse-entry.test.ts
    write-entry.test.ts
    inject-knowledge.test.ts
    capture-session.test.ts
    scanner.test.ts
    baseline.test.ts
```

---

## Task 1: Set Up Factory Package

**Files:**
- Create: `factory/package.json`
- Create: `factory/tsconfig.json`
- Create: `factory/vitest.config.ts`
- Create: `factory/src/types.ts`
- Create: `factory/.gitignore`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create factory/package.json**

```json
{
  "name": "@pauljump/factory",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "bootstrap": "node --import tsx scripts/bootstrap-knowledge.ts",
    "scan": "node --import tsx scripts/scan-monorepo.ts",
    "baseline": "node --import tsx scripts/extract-baseline.ts",
    "rebuild-index": "node --import tsx scripts/rebuild-index.ts"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "gray-matter": "^4.0.3",
    "glob": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "@pauljump/search-kit": "workspace:*",
    "@pauljump/analytics-kit": "workspace:*"
  }
}
```

- [ ] **Step 2: Create factory/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create factory/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Create factory/src/types.ts**

```ts
/** A structured knowledge entry as stored in markdown frontmatter files */
export interface KnowledgeEntry {
  /** Unique ID (filename without extension, e.g., "cloud-run-sqlite-wal") */
  id: string
  /** Domain category (e.g., "cloud-run", "ios", "data-sources") */
  domain: string
  /** Searchable tags */
  tags: string[]
  /** How confident we are: high, medium, low */
  confidence: 'high' | 'medium' | 'low'
  /** Which project this was learned from */
  sourceProject: string
  /** When this entry was created */
  date: string
  /** When this entry was last verified as still accurate */
  lastVerified: string
  /** How many times the SessionStart hook has injected this entry */
  timesInjected: number
  /** How many times the user marked this entry as useful in a session */
  timesUseful: number
  /** The knowledge content (markdown body) */
  body: string
}

/** Scanner output for a single project */
export interface ProjectScan {
  /** Project directory name */
  name: string
  /** Absolute path */
  path: string
  /** Detected language/framework */
  framework: string
  /** Direct dependencies (from package.json, Podfile, etc.) */
  dependencies: string[]
  /** Workspace package dependencies (from @pauljump/*) */
  sharedPackages: string[]
  /** Infrastructure patterns detected */
  infrastructure: string[]
  /** External data sources (APIs, scraped URLs) */
  dataSources: string[]
  /** Whether a CLAUDE.md exists */
  hasClaudeMd: boolean
  /** Whether a deploy config exists (Dockerfile, cloud-run config, etc.) */
  hasDeployConfig: boolean
}

/** Baseline metrics extracted from git history for one project */
export interface ProjectBaseline {
  name: string
  /** First commit date */
  firstCommit: string
  /** Last commit date */
  lastCommit: string
  /** Total number of commits */
  commitCount: number
  /** Estimated number of sessions (clusters of commits within 4 hours) */
  estimatedSessions: number
  /** Date of first deploy tag or Dockerfile commit, if found */
  firstDeploy: string | null
  /** Days from first commit to first deploy */
  daysToFirstDeploy: number | null
  /** Project category */
  category: 'ios' | 'web' | 'api' | 'data-pipeline' | 'other'
}

/** A factory session event logged to analytics */
export interface SessionEvent {
  event: string
  properties: Record<string, unknown>
}

/** Scorecard for a factory-built project */
export interface Scorecard {
  project: string
  category: string
  comparableBaseline: string | null
  phase: number
  controlGroup: boolean
  sessionsToProduction: number
  baselineSessions: number | null
  wallClockHours: number
  sharedPackagesUsed: string[]
  knowledgeInjected: number
  knowledgeUseful: number
  knowledgeCaptured: number
  knowledgeProposed: number
  bugsFromKnownGotchas: number
  newSharedCodeExtracted: number
  leverageRatio: number | null
  journalEntry: string
  sessionFeltFaster: boolean | null
  knownGotchaAvoided: string | null
}
```

- [ ] **Step 5: Create factory/.gitignore**

```
data/factory.db
data/factory.db-wal
data/factory.db-shm
data/scan-results.json
data/baselines.json
node_modules/
dist/
```

- [ ] **Step 6: Create directory placeholders**

```bash
mkdir -p factory/data factory/knowledge factory/scorecards factory/hooks factory/scripts factory/tests
touch factory/data/.gitkeep factory/knowledge/.gitkeep factory/scorecards/.gitkeep
```

- [ ] **Step 7: Add factory to pnpm workspace**

In `pnpm-workspace.yaml`, add `- 'factory'` to the packages list.

- [ ] **Step 8: Install dependencies**

```bash
cd /Users/mini-home/Desktop/monorepo && pnpm install
```

- [ ] **Step 9: Verify setup**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test
```

Expected: vitest runs, finds no tests, exits 0.

- [ ] **Step 10: Commit**

```bash
git add factory/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(factory): scaffold Phase 0 package structure"
```

---

## Task 2: Knowledge Entry Parser (Read)

**Files:**
- Create: `factory/src/parse-entry.ts`
- Create: `factory/tests/parse-entry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/parse-entry.test.ts
import { describe, it, expect } from 'vitest'
import { parseEntry } from '../src/parse-entry.js'

describe('parseEntry', () => {
  it('parses a well-formed knowledge entry', () => {
    const markdown = `---
domain: cloud-run
tags: [sqlite, gcs-fuse, journal-mode]
confidence: high
source_project: kithome
date: "2026-03-15"
last_verified: "2026-03-15"
times_injected: 5
times_useful: 3
---

SQLite with GCS FUSE cannot handle WAL mode.

**Context:** Discovered during kithome deployment.

**Applies when:** Any project using SQLite + Cloud Run.`

    const entry = parseEntry('cloud-run-sqlite-wal', markdown)

    expect(entry.id).toBe('cloud-run-sqlite-wal')
    expect(entry.domain).toBe('cloud-run')
    expect(entry.tags).toEqual(['sqlite', 'gcs-fuse', 'journal-mode'])
    expect(entry.confidence).toBe('high')
    expect(entry.sourceProject).toBe('kithome')
    expect(entry.date).toBe('2026-03-15')
    expect(entry.lastVerified).toBe('2026-03-15')
    expect(entry.timesInjected).toBe(5)
    expect(entry.timesUseful).toBe(3)
    expect(entry.body).toContain('SQLite with GCS FUSE cannot handle WAL mode.')
    expect(entry.body).toContain('**Applies when:**')
  })

  it('handles missing optional fields with defaults', () => {
    const markdown = `---
domain: ios
tags: [storekit]
confidence: medium
source_project: barkey
date: "2026-03-20"
---

StoreKit 2 wiring is non-trivial.`

    const entry = parseEntry('ios-storekit-wiring', markdown)

    expect(entry.lastVerified).toBe('2026-03-20')
    expect(entry.timesInjected).toBe(0)
    expect(entry.timesUseful).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/parse-entry.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement parseEntry**

```ts
// factory/src/parse-entry.ts
import matter from 'gray-matter'
import type { KnowledgeEntry } from './types.js'

export function parseEntry(id: string, raw: string): KnowledgeEntry {
  const { data, content } = matter(raw)

  return {
    id,
    domain: String(data['domain'] ?? ''),
    tags: Array.isArray(data['tags']) ? data['tags'].map(String) : [],
    confidence: validateConfidence(data['confidence']),
    sourceProject: String(data['source_project'] ?? ''),
    date: String(data['date'] ?? ''),
    lastVerified: String(data['last_verified'] ?? data['date'] ?? ''),
    timesInjected: Number(data['times_injected'] ?? 0),
    timesUseful: Number(data['times_useful'] ?? 0),
    body: content.trim(),
  }
}

function validateConfidence(val: unknown): 'high' | 'medium' | 'low' {
  if (val === 'high' || val === 'medium' || val === 'low') return val
  return 'medium'
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/parse-entry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add factory/src/parse-entry.ts factory/tests/parse-entry.test.ts
git commit -m "feat(factory): add knowledge entry markdown parser"
```

---

## Task 3: Knowledge Entry Writer

**Files:**
- Create: `factory/src/write-entry.ts`
- Create: `factory/tests/write-entry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/write-entry.test.ts
import { describe, it, expect } from 'vitest'
import { serializeEntry } from '../src/write-entry.js'
import { parseEntry } from '../src/parse-entry.js'
import type { KnowledgeEntry } from '../src/types.js'

describe('serializeEntry', () => {
  it('round-trips a knowledge entry through serialize then parse', () => {
    const entry: KnowledgeEntry = {
      id: 'cloud-run-sqlite-wal',
      domain: 'cloud-run',
      tags: ['sqlite', 'gcs-fuse'],
      confidence: 'high',
      sourceProject: 'kithome',
      date: '2026-03-15',
      lastVerified: '2026-03-15',
      timesInjected: 0,
      timesUseful: 0,
      body: 'SQLite WAL mode breaks on GCS FUSE.\n\n**Applies when:** Cloud Run + SQLite.',
    }

    const markdown = serializeEntry(entry)

    expect(markdown).toContain('domain: cloud-run')
    expect(markdown).toContain('confidence: high')
    expect(markdown).toContain('source_project: kithome')
    expect(markdown).toContain('SQLite WAL mode breaks on GCS FUSE.')

    const roundTripped = parseEntry(entry.id, markdown)
    expect(roundTripped.domain).toBe(entry.domain)
    expect(roundTripped.tags).toEqual(entry.tags)
    expect(roundTripped.confidence).toBe(entry.confidence)
    expect(roundTripped.body).toBe(entry.body)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/write-entry.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement serializeEntry**

```ts
// factory/src/write-entry.ts
import matter from 'gray-matter'
import type { KnowledgeEntry } from './types.js'

export function serializeEntry(entry: KnowledgeEntry): string {
  const frontmatter: Record<string, unknown> = {
    domain: entry.domain,
    tags: entry.tags,
    confidence: entry.confidence,
    source_project: entry.sourceProject,
    date: entry.date,
    last_verified: entry.lastVerified,
    times_injected: entry.timesInjected,
    times_useful: entry.timesUseful,
  }

  return matter.stringify('\n' + entry.body + '\n', frontmatter)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/write-entry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add factory/src/write-entry.ts factory/tests/write-entry.test.ts
git commit -m "feat(factory): add knowledge entry serializer with round-trip support"
```

---

## Task 4: Database Setup + Knowledge Store

**Files:**
- Create: `factory/src/db.ts`
- Create: `factory/src/knowledge-store.ts`
- Create: `factory/tests/knowledge-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/knowledge-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/db.js'
import { createKnowledgeStore } from '../src/knowledge-store.js'
import type { KnowledgeEntry } from '../src/types.js'

function makeEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: 'test-entry',
    domain: 'testing',
    tags: ['unit-test'],
    confidence: 'high',
    sourceProject: 'factory',
    date: '2026-03-26',
    lastVerified: '2026-03-26',
    timesInjected: 0,
    timesUseful: 0,
    body: 'This is a test entry.',
    ...overrides,
  }
}

describe('KnowledgeStore', () => {
  let db: Database.Database
  let store: ReturnType<typeof createKnowledgeStore>

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
    store = createKnowledgeStore(db)
  })

  it('indexes an entry and retrieves it by search', () => {
    store.index(makeEntry({ id: 'sqlite-wal', body: 'SQLite WAL mode breaks on GCS FUSE' }))

    const results = store.search('SQLite WAL')
    expect(results.length).toBe(1)
    expect(results[0]!.id).toBe('sqlite-wal')
  })

  it('filters by domain', () => {
    store.index(makeEntry({ id: 'entry-1', domain: 'cloud-run', body: 'Cloud Run gotcha' }))
    store.index(makeEntry({ id: 'entry-2', domain: 'ios', body: 'iOS gotcha' }))

    const results = store.searchByDomain('cloud-run')
    expect(results.length).toBe(1)
    expect(results[0]!.id).toBe('entry-1')
  })

  it('returns entries matching tags', () => {
    store.index(makeEntry({ id: 'e1', tags: ['sqlite', 'cloud-run'], body: 'SQLite on Cloud Run' }))
    store.index(makeEntry({ id: 'e2', tags: ['storekit', 'ios'], body: 'StoreKit setup' }))
    store.index(makeEntry({ id: 'e3', tags: ['sqlite', 'wal'], body: 'SQLite WAL mode' }))

    const results = store.searchByTags(['sqlite'])
    expect(results.length).toBe(2)
    expect(results.map(r => r.id).sort()).toEqual(['e1', 'e3'])
  })

  it('increments injection count', () => {
    store.index(makeEntry({ id: 'e1', timesInjected: 0 }))
    store.recordInjection('e1')
    store.recordInjection('e1')

    const entry = store.get('e1')
    expect(entry?.timesInjected).toBe(2)
  })

  it('increments useful count', () => {
    store.index(makeEntry({ id: 'e1', timesUseful: 0 }))
    store.recordUseful('e1')

    const entry = store.get('e1')
    expect(entry?.timesUseful).toBe(1)
  })

  it('lists all entries', () => {
    store.index(makeEntry({ id: 'a' }))
    store.index(makeEntry({ id: 'b' }))
    store.index(makeEntry({ id: 'c' }))

    expect(store.list().length).toBe(3)
  })

  it('deletes an entry', () => {
    store.index(makeEntry({ id: 'e1' }))
    store.delete('e1')
    expect(store.get('e1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/knowledge-store.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement db.ts**

```ts
// factory/src/db.ts
import Database from 'better-sqlite3'
import { createSearchIndex } from '@pauljump/search-kit'
import { initAnalyticsTables } from '@pauljump/analytics-kit'

export function initFactoryDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      confidence TEXT NOT NULL DEFAULT 'medium',
      source_project TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      last_verified TEXT NOT NULL,
      times_injected INTEGER NOT NULL DEFAULT 0,
      times_useful INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  createSearchIndex(db, {
    table: 'knowledge_fts',
    sourceTable: 'knowledge_entries',
    columns: ['id', 'domain', 'tags', 'body'],
  })

  initAnalyticsTables(db)
}

export function openFactoryDb(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  initFactoryDb(db)
  return db
}
```

- [ ] **Step 4: Implement knowledge-store.ts**

```ts
// factory/src/knowledge-store.ts
import type Database from 'better-sqlite3'
import { search, rebuildSearchIndex } from '@pauljump/search-kit'
import type { KnowledgeEntry } from './types.js'

export function createKnowledgeStore(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO knowledge_entries
    (id, domain, tags, confidence, source_project, date, last_verified,
     times_injected, times_useful, body, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const getStmt = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?')
  const listStmt = db.prepare('SELECT * FROM knowledge_entries ORDER BY domain, id')
  const deleteStmt = db.prepare('DELETE FROM knowledge_entries WHERE id = ?')
  const byDomainStmt = db.prepare('SELECT * FROM knowledge_entries WHERE domain = ? ORDER BY id')
  const byTagStmt = db.prepare('SELECT * FROM knowledge_entries WHERE tags LIKE ? ORDER BY id')
  const incrInjectedStmt = db.prepare('UPDATE knowledge_entries SET times_injected = times_injected + 1 WHERE id = ?')
  const incrUsefulStmt = db.prepare('UPDATE knowledge_entries SET times_useful = times_useful + 1 WHERE id = ?')

  function toEntry(row: Record<string, unknown>): KnowledgeEntry {
    return {
      id: String(row['id']),
      domain: String(row['domain']),
      tags: JSON.parse(String(row['tags'])),
      confidence: String(row['confidence']) as KnowledgeEntry['confidence'],
      sourceProject: String(row['source_project']),
      date: String(row['date']),
      lastVerified: String(row['last_verified']),
      timesInjected: Number(row['times_injected']),
      timesUseful: Number(row['times_useful']),
      body: String(row['body']),
    }
  }

  return {
    index(entry: KnowledgeEntry): void {
      insertStmt.run(
        entry.id, entry.domain, JSON.stringify(entry.tags), entry.confidence,
        entry.sourceProject, entry.date, entry.lastVerified,
        entry.timesInjected, entry.timesUseful, entry.body
      )
      rebuildSearchIndex(db, 'knowledge_fts')
    },

    get(id: string): KnowledgeEntry | null {
      const row = getStmt.get(id) as Record<string, unknown> | undefined
      return row ? toEntry(row) : null
    },

    list(): KnowledgeEntry[] {
      return (listStmt.all() as Record<string, unknown>[]).map(toEntry)
    },

    delete(id: string): void {
      deleteStmt.run(id)
      rebuildSearchIndex(db, 'knowledge_fts')
    },

    search(query: string, limit = 20): KnowledgeEntry[] {
      const results = search<Record<string, unknown>>(db, {
        table: 'knowledge_fts',
        query,
        limit,
      })
      return results.map(r => toEntry(r))
    },

    searchByDomain(domain: string): KnowledgeEntry[] {
      return (byDomainStmt.all(domain) as Record<string, unknown>[]).map(toEntry)
    },

    searchByTags(tags: string[]): KnowledgeEntry[] {
      const allResults = new Map<string, KnowledgeEntry>()
      for (const tag of tags) {
        const rows = byTagStmt.all(`%"${tag}"%`) as Record<string, unknown>[]
        for (const row of rows) {
          const entry = toEntry(row)
          allResults.set(entry.id, entry)
        }
      }
      return Array.from(allResults.values())
    },

    recordInjection(id: string): void {
      incrInjectedStmt.run(id)
    },

    recordUseful(id: string): void {
      incrUsefulStmt.run(id)
    },
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/knowledge-store.test.ts
```

Expected: PASS (all 7 tests)

- [ ] **Step 6: Commit**

```bash
git add factory/src/db.ts factory/src/knowledge-store.ts factory/tests/knowledge-store.test.ts
git commit -m "feat(factory): add knowledge store with FTS5 search, domain/tag filtering"
```

---

## Task 5: Bootstrap Script

**Files:**
- Create: `factory/scripts/bootstrap-knowledge.ts`
- Create: `factory/tests/bootstrap.test.ts`

Converts the existing `DOMAIN_KNOWLEDGE.md` (~120 facts) into individual markdown entries in `factory/knowledge/`.

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/bootstrap.test.ts
import { describe, it, expect } from 'vitest'
import { parseDomainKnowledge } from '../scripts/bootstrap-knowledge.js'

describe('parseDomainKnowledge', () => {
  it('parses sections with bullet points into entries', () => {
    const markdown = `# Domain Knowledge Registry

## API Providers

### Anthropic
- Admin API requires a separate key -- not the regular API key — **meter**
- Cost endpoint returns cents as strings — **meter**

### OpenAI
- Costs endpoint only supports daily granularity — **meter**

## iOS & Apple Platforms

### XcodeGen
- Does not support messages-extension product type natively — **paperclaw**
`

    const entries = parseDomainKnowledge(markdown)

    expect(entries.length).toBe(4)
    expect(entries[0]!.domain).toBe('api-providers')
    expect(entries[0]!.tags).toContain('anthropic')
    expect(entries[0]!.sourceProject).toBe('meter')
    expect(entries[0]!.body).toContain('Admin API requires a separate key')
    expect(entries[3]!.domain).toBe('ios')
    expect(entries[3]!.tags).toContain('xcodegen')
    expect(entries[3]!.sourceProject).toBe('paperclaw')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/bootstrap.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement bootstrap-knowledge.ts**

```ts
// factory/scripts/bootstrap-knowledge.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { KnowledgeEntry } from '../src/types.js'
import { serializeEntry } from '../src/write-entry.js'
import { openFactoryDb } from '../src/db.js'
import { createKnowledgeStore } from '../src/knowledge-store.js'

export function parseDomainKnowledge(markdown: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  const lines = markdown.split('\n')
  let currentDomain = ''
  let currentSubsection = ''
  const today = new Date().toISOString().slice(0, 10)

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentDomain = slugify(line.replace('## ', '').trim())
      currentSubsection = ''
      continue
    }

    if (line.startsWith('### ')) {
      currentSubsection = line.replace('### ', '').trim().toLowerCase()
      continue
    }

    if (line.startsWith('- ') && currentDomain) {
      const text = line.slice(2).trim()
      const sourceMatch = text.match(/\*\*(\w[\w-]*)\*\*\s*$/)
      const sourceProject = sourceMatch ? sourceMatch[1]! : ''
      const body = sourceMatch
        ? text.slice(0, sourceMatch.index).replace(/\s*[—-]\s*$/, '').trim()
        : text

      const tags = [currentSubsection].filter(Boolean)
      const id = slugify(
        `${currentDomain}-${currentSubsection}-${body.slice(0, 50)}`
      )

      entries.push({
        id,
        domain: mapDomain(currentDomain),
        tags,
        confidence: 'high',
        sourceProject,
        date: today,
        lastVerified: today,
        timesInjected: 0,
        timesUseful: 0,
        body,
      })
    }
  }

  return entries
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function mapDomain(raw: string): string {
  const map: Record<string, string> = {
    'api-providers': 'api-providers',
    'ios-apple-platforms': 'ios',
    'cloud-infrastructure': 'infrastructure',
    'data-sources-government': 'data-sources',
    'data-modeling-architecture': 'architecture',
    'ui-ux': 'ui-ux',
    'llm-integration': 'llm',
    'security-auth': 'security',
    'scraping-data-collection': 'scraping',
    'pricing-monetization': 'pricing',
    'legal-compliance': 'legal',
  }
  return map[raw] ?? raw
}

// CLI entry point
const isMain = process.argv[1]?.endsWith('bootstrap-knowledge.ts')
if (isMain) {
  const factoryRoot = new URL('..', import.meta.url).pathname
  const domainKnowledgePath = '/Users/mini-home/Desktop/factory-knowledge-system/DOMAIN_KNOWLEDGE.md'

  if (!existsSync(domainKnowledgePath)) {
    console.error('DOMAIN_KNOWLEDGE.md not found at', domainKnowledgePath)
    process.exit(1)
  }

  const markdown = readFileSync(domainKnowledgePath, 'utf-8')
  const entries = parseDomainKnowledge(markdown)

  // Write individual markdown files
  const knowledgeDir = join(factoryRoot, 'knowledge')
  for (const entry of entries) {
    const domainDir = join(knowledgeDir, entry.domain)
    mkdirSync(domainDir, { recursive: true })
    writeFileSync(join(domainDir, `${entry.id}.md`), serializeEntry(entry))
  }

  // Index into SQLite
  const dbPath = join(factoryRoot, 'data', 'factory.db')
  mkdirSync(join(factoryRoot, 'data'), { recursive: true })
  const db = openFactoryDb(dbPath)
  const store = createKnowledgeStore(db)
  for (const entry of entries) {
    store.index(entry)
  }
  db.close()

  console.log(
    `Bootstrapped ${entries.length} knowledge entries across ` +
    `${new Set(entries.map(e => e.domain)).size} domains`
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/bootstrap.test.ts
```

Expected: PASS

- [ ] **Step 5: Run the bootstrap against real data**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm bootstrap
```

Expected: "Bootstrapped ~120 knowledge entries across ~11 domains"

- [ ] **Step 6: Verify files were created**

```bash
ls factory/knowledge/*/
```

Expected: directories per domain with markdown files.

- [ ] **Step 7: Commit**

```bash
git add factory/scripts/bootstrap-knowledge.ts factory/tests/bootstrap.test.ts factory/knowledge/
git commit -m "feat(factory): bootstrap knowledge base from DOMAIN_KNOWLEDGE.md"
```

---

## Task 6: Rebuild Index Script

**Files:**
- Create: `factory/scripts/rebuild-index.ts`

- [ ] **Step 1: Implement rebuild-index.ts**

```ts
// factory/scripts/rebuild-index.ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { openFactoryDb } from '../src/db.js'
import { createKnowledgeStore } from '../src/knowledge-store.js'
import { parseEntry } from '../src/parse-entry.js'

const factoryRoot = new URL('..', import.meta.url).pathname
const knowledgeDir = join(factoryRoot, 'knowledge')
const dbPath = join(factoryRoot, 'data', 'factory.db')

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  for (const item of readdirSync(dir)) {
    const full = join(dir, item)
    if (statSync(full).isDirectory()) {
      files.push(...collectMarkdownFiles(full))
    } else if (item.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

const db = openFactoryDb(dbPath)
const store = createKnowledgeStore(db)

db.exec('DELETE FROM knowledge_entries')

const files = collectMarkdownFiles(knowledgeDir)
let count = 0

for (const filePath of files) {
  const id = basename(filePath, '.md')
  const raw = readFileSync(filePath, 'utf-8')
  const entry = parseEntry(id, raw)
  store.index(entry)
  count++
}

db.close()
console.log(`Rebuilt index: ${count} entries from ${files.length} files`)
```

- [ ] **Step 2: Run it**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm rebuild-index
```

Expected: "Rebuilt index: ~120 entries from ~120 files"

- [ ] **Step 3: Commit**

```bash
git add factory/scripts/rebuild-index.ts
git commit -m "feat(factory): add rebuild-index script for FTS5 maintenance"
```

---

## Task 7: SessionStart Hook

**Files:**
- Create: `factory/src/inject-knowledge.ts`
- Create: `factory/src/cli-inject.ts`
- Create: `factory/hooks/session-start.sh`
- Create: `factory/tests/inject-knowledge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/inject-knowledge.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/db.js'
import { createKnowledgeStore } from '../src/knowledge-store.js'
import { buildInjection } from '../src/inject-knowledge.js'
import type { KnowledgeEntry } from '../src/types.js'

function makeEntry(overrides: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    id: 'test', domain: 'testing', tags: [], confidence: 'high',
    sourceProject: '', date: '2026-03-26', lastVerified: '2026-03-26',
    timesInjected: 0, timesUseful: 0, body: 'test body',
    ...overrides,
  }
}

describe('buildInjection', () => {
  let db: Database.Database
  let store: ReturnType<typeof createKnowledgeStore>

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
    store = createKnowledgeStore(db)
  })

  it('returns entries matching project tags', () => {
    store.index(makeEntry({
      id: 'sqlite-wal', domain: 'cloud-run',
      tags: ['sqlite', 'gcs-fuse'], body: 'WAL breaks on GCS FUSE',
    }))
    store.index(makeEntry({
      id: 'storekit-wiring', domain: 'ios',
      tags: ['storekit'], body: 'StoreKit 2 is non-trivial',
    }))

    const result = buildInjection(store, {
      projectName: 'stuywatch',
      dependencies: ['better-sqlite3', 'fastify'],
      tags: ['sqlite', 'cloud-run'],
    })

    expect(result.entries.some(e => e.id === 'sqlite-wal')).toBe(true)
    expect(result.entries.some(e => e.id === 'storekit-wiring')).toBe(false)
  })

  it('includes entries from the same source project', () => {
    store.index(makeEntry({
      id: 'stuywatch-tip', sourceProject: 'stuywatch',
      body: 'StuyWatch specific tip',
    }))

    const result = buildInjection(store, {
      projectName: 'stuywatch',
      dependencies: [],
      tags: [],
    })

    expect(result.entries.some(e => e.id === 'stuywatch-tip')).toBe(true)
  })

  it('formats output as readable context', () => {
    store.index(makeEntry({ id: 'e1', domain: 'cloud-run', body: 'Tip one' }))

    const result = buildInjection(store, {
      projectName: 'test', dependencies: [], tags: ['cloud-run'],
    })

    expect(result.formatted).toContain('Factory Knowledge')
    expect(result.formatted).toContain('Tip one')
  })

  it('caps entries at 15', () => {
    for (let i = 0; i < 50; i++) {
      store.index(makeEntry({
        id: `e${i}`, domain: 'testing', tags: ['common'],
        body: `Entry number ${i}`,
      }))
    }

    const result = buildInjection(store, {
      projectName: 'test', dependencies: [], tags: ['common'],
    })

    expect(result.entries.length).toBeLessThanOrEqual(15)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/inject-knowledge.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement inject-knowledge.ts**

```ts
// factory/src/inject-knowledge.ts
import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { KnowledgeEntry } from './types.js'

export interface ProjectContext {
  projectName: string
  dependencies: string[]
  tags: string[]
}

interface InjectionResult {
  entries: KnowledgeEntry[]
  formatted: string
}

interface KnowledgeStoreReader {
  search(query: string, limit?: number): KnowledgeEntry[]
  searchByTags(tags: string[]): KnowledgeEntry[]
  list(): KnowledgeEntry[]
  recordInjection(id: string): void
}

const MAX_ENTRIES = 15

export function buildInjection(
  store: KnowledgeStoreReader,
  context: ProjectContext,
): InjectionResult {
  const seen = new Set<string>()
  const collected: KnowledgeEntry[] = []

  function add(entries: KnowledgeEntry[]) {
    for (const entry of entries) {
      if (!seen.has(entry.id) && collected.length < MAX_ENTRIES) {
        seen.add(entry.id)
        collected.push(entry)
      }
    }
  }

  // Priority 1: entries from the same source project
  const allEntries = store.list()
  add(allEntries.filter(e => e.sourceProject === context.projectName))

  // Priority 2: entries matching context tags
  if (context.tags.length > 0) {
    add(store.searchByTags(context.tags))
  }

  // Priority 3: full-text search on project name + deps
  const terms = [context.projectName, ...context.dependencies.slice(0, 5)].join(' ')
  if (terms.trim()) {
    add(store.search(terms, 10))
  }

  // Record injections
  for (const entry of collected) {
    store.recordInjection(entry.id)
  }

  return {
    entries: collected,
    formatted: formatInjection(collected, context),
  }
}

function formatInjection(entries: KnowledgeEntry[], context: ProjectContext): string {
  if (entries.length === 0) return ''

  const lines: string[] = [
    `## Factory Knowledge (${entries.length} entries for ${context.projectName})`,
    '',
  ]

  const byDomain = new Map<string, KnowledgeEntry[]>()
  for (const entry of entries) {
    const list = byDomain.get(entry.domain) ?? []
    list.push(entry)
    byDomain.set(entry.domain, list)
  }

  for (const [domain, domainEntries] of byDomain) {
    lines.push(`### ${domain}`)
    for (const entry of domainEntries) {
      const firstLine = entry.body.split('\n')[0] ?? ''
      lines.push(`- **${entry.id}** (${entry.confidence}, from ${entry.sourceProject}): ${firstLine}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function detectProjectContext(cwd: string): ProjectContext {
  const projectName = basename(cwd)
  const dependencies: string[] = []
  const tags: string[] = []

  const pkgPath = join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const allDeps: Record<string, string> = {
        ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies,
      }
      dependencies.push(...Object.keys(allDeps))

      if (allDeps['better-sqlite3']) tags.push('sqlite')
      if (allDeps['fastify']) tags.push('fastify', 'api')
      if (allDeps['next']) tags.push('nextjs', 'web')
      if (allDeps['@pauljump/api-kit']) tags.push('api-kit', 'fastify', 'sqlite')
      if (allDeps['@pauljump/etl-kit']) tags.push('etl', 'scraping')
      if (allDeps['@pauljump/llm-kit']) tags.push('llm', 'ai')
      if (allDeps['@pauljump/search-kit']) tags.push('search', 'fts5')
      if (allDeps['@pauljump/voice-kit']) tags.push('voice', 'realtime')
      if (allDeps['@pauljump/payments-kit']) tags.push('stripe', 'payments')
      if (allDeps['@pauljump/socrata-kit']) tags.push('socrata', 'government-data')
    } catch { /* ignore */ }
  }

  if (existsSync(join(cwd, 'project.yml')) || existsSync(join(cwd, 'ios'))) {
    tags.push('ios', 'swift', 'xcodegen')
  }

  if (existsSync(join(cwd, 'Dockerfile'))) {
    tags.push('cloud-run', 'docker')
  }

  return { projectName, dependencies, tags }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/inject-knowledge.test.ts
```

Expected: PASS

- [ ] **Step 5: Create cli-inject.ts**

```ts
// factory/src/cli-inject.ts
import { openFactoryDb } from './db.js'
import { createKnowledgeStore } from './knowledge-store.js'
import { buildInjection, detectProjectContext } from './inject-knowledge.js'
import { createTracker } from '@pauljump/analytics-kit'
import { logSessionEvent } from './capture-session.js'
import { join } from 'node:path'

const cwd = process.argv[2] ?? process.cwd()
const factoryRoot = new URL('..', import.meta.url).pathname
const dbPath = join(factoryRoot, 'data', 'factory.db')

const db = openFactoryDb(dbPath)
const store = createKnowledgeStore(db)
const tracker = createTracker(db)
const context = detectProjectContext(cwd)
const injection = buildInjection(store, context)

logSessionEvent(tracker, 'session_start', {
  project: context.projectName,
  entriesInjected: injection.entries.length,
  tags: context.tags,
})

if (injection.formatted) {
  process.stdout.write(injection.formatted)
}

db.close()
```

- [ ] **Step 6: Create session-start.sh**

```bash
#!/usr/bin/env bash
# factory/hooks/session-start.sh
# Claude Code SessionStart hook
set -euo pipefail

FACTORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Read CWD from stdin JSON (Claude provides it)
INPUT=$(cat)
CWD=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).cwd || ''); }
    catch { console.log(''); }
  });
")

if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

node --import tsx "$FACTORY_ROOT/src/cli-inject.ts" "$CWD"
```

- [ ] **Step 7: Make hook executable**

```bash
chmod +x factory/hooks/session-start.sh
```

- [ ] **Step 8: Commit**

```bash
git add factory/src/inject-knowledge.ts factory/src/cli-inject.ts factory/hooks/session-start.sh factory/tests/inject-knowledge.test.ts
git commit -m "feat(factory): add SessionStart hook with knowledge injection"
```

---

## Task 8: Stop Hook

**Files:**
- Create: `factory/src/capture-session.ts`
- Create: `factory/src/cli-capture.ts`
- Create: `factory/hooks/stop.sh`
- Create: `factory/tests/capture-session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/capture-session.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/db.js'
import { createTracker } from '@pauljump/analytics-kit'
import { logSessionEvent, getSessionMetrics } from '../src/capture-session.js'

describe('capture-session', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
  })

  it('logs a session start event', () => {
    const tracker = createTracker(db)
    logSessionEvent(tracker, 'session_start', { project: 'stuywatch', entriesInjected: 5 })

    const events = tracker.getEvents({ event: 'session_start' })
    expect(events.length).toBe(1)
  })

  it('computes session metrics', () => {
    const tracker = createTracker(db)
    logSessionEvent(tracker, 'session_start', { project: 'a', entriesInjected: 5 })
    logSessionEvent(tracker, 'session_start', { project: 'b', entriesInjected: 3 })
    logSessionEvent(tracker, 'session_end', { project: 'a', knowledgeCaptured: 2 })

    const metrics = getSessionMetrics(tracker)
    expect(metrics.totalSessions).toBe(2)
    expect(metrics.totalKnowledgeInjected).toBe(8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/capture-session.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement capture-session.ts**

```ts
// factory/src/capture-session.ts
import type { Tracker } from '@pauljump/analytics-kit'

export function logSessionEvent(
  tracker: Tracker,
  event: string,
  properties: Record<string, unknown>,
): void {
  tracker.track({
    event,
    userId: 'factory',
    properties: { ...properties, timestamp: new Date().toISOString() },
  })
}

export interface SessionMetrics {
  totalSessions: number
  totalKnowledgeInjected: number
  totalKnowledgeCaptured: number
  totalKnowledgeProposed: number
}

export function getSessionMetrics(tracker: Tracker): SessionMetrics {
  const starts = tracker.getEvents({ event: 'session_start' })
  const ends = tracker.getEvents({ event: 'session_end' })

  let totalInjected = 0
  for (const e of starts) {
    totalInjected += Number(e.properties?.['entriesInjected'] ?? 0)
  }

  let totalCaptured = 0
  let totalProposed = 0
  for (const e of ends) {
    totalCaptured += Number(e.properties?.['knowledgeCaptured'] ?? 0)
    totalProposed += Number(e.properties?.['knowledgeProposed'] ?? 0)
  }

  return {
    totalSessions: starts.length,
    totalKnowledgeInjected: totalInjected,
    totalKnowledgeCaptured: totalCaptured,
    totalKnowledgeProposed: totalProposed,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/capture-session.test.ts
```

Expected: PASS

- [ ] **Step 5: Create cli-capture.ts**

```ts
// factory/src/cli-capture.ts
import { openFactoryDb } from './db.js'
import { createTracker } from '@pauljump/analytics-kit'
import { logSessionEvent } from './capture-session.js'
import { basename, join } from 'node:path'

const cwd = process.argv[2] ?? process.cwd()
const factoryRoot = new URL('..', import.meta.url).pathname
const dbPath = join(factoryRoot, 'data', 'factory.db')

const db = openFactoryDb(dbPath)
const tracker = createTracker(db)

logSessionEvent(tracker, 'session_end', {
  project: basename(cwd),
  cwd,
})

db.close()
```

- [ ] **Step 6: Create stop.sh**

```bash
#!/usr/bin/env bash
# factory/hooks/stop.sh
set -euo pipefail

FACTORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

INPUT=$(cat)
CWD=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).cwd || ''); }
    catch { console.log(''); }
  });
")

if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

node --import tsx "$FACTORY_ROOT/src/cli-capture.ts" "$CWD"
```

- [ ] **Step 7: Make hook executable and commit**

```bash
chmod +x factory/hooks/stop.sh
git add factory/src/capture-session.ts factory/src/cli-capture.ts factory/hooks/stop.sh factory/tests/capture-session.test.ts
git commit -m "feat(factory): add Stop hook with session metrics logging"
```

---

## Task 9: Project Scanner

**Files:**
- Create: `factory/src/scanner.ts`
- Create: `factory/scripts/scan-monorepo.ts`
- Create: `factory/tests/scanner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/scanner.test.ts
import { describe, it, expect } from 'vitest'
import { scanProject } from '../src/scanner.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('scanProject', () => {
  const testDir = join(tmpdir(), 'factory-test-scan')

  function setup(files: Record<string, string>) {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    for (const [path, content] of Object.entries(files)) {
      const full = join(testDir, path)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, content)
    }
  }

  it('detects a Node.js project with dependencies', () => {
    setup({
      'package.json': JSON.stringify({
        dependencies: { fastify: '^5.0.0', 'better-sqlite3': '^11.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    })

    const result = scanProject(testDir)
    expect(result.framework).toBe('node-fastify')
    expect(result.dependencies).toContain('fastify')
    expect(result.infrastructure).toContain('sqlite')
  })

  it('detects shared package usage', () => {
    setup({
      'package.json': JSON.stringify({
        dependencies: {
          '@pauljump/api-kit': 'workspace:*',
          '@pauljump/etl-kit': 'workspace:*',
        },
      }),
    })

    const result = scanProject(testDir)
    expect(result.sharedPackages).toContain('@pauljump/api-kit')
    expect(result.sharedPackages).toContain('@pauljump/etl-kit')
  })

  it('detects Dockerfile', () => {
    setup({ 'package.json': '{}', 'Dockerfile': 'FROM node:22' })

    const result = scanProject(testDir)
    expect(result.hasDeployConfig).toBe(true)
    expect(result.infrastructure).toContain('docker')
  })

  it('detects iOS project', () => {
    setup({
      'project.yml': 'name: MyApp',
      'ios/MyApp/App.swift': 'import SwiftUI',
    })

    const result = scanProject(testDir)
    expect(result.framework).toBe('ios-swift')
  })

  it('detects CLAUDE.md', () => {
    setup({ 'package.json': '{}', 'CLAUDE.md': '# Project' })
    expect(scanProject(testDir).hasClaudeMd).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/scanner.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement scanner.ts**

```ts
// factory/src/scanner.ts
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ProjectScan } from './types.js'

export function scanProject(projectPath: string): ProjectScan {
  const name = basename(projectPath)
  const dependencies: string[] = []
  const sharedPackages: string[] = []
  const infrastructure: string[] = []
  const dataSources: string[] = []
  let framework = 'unknown'
  const hasClaudeMd = existsSync(join(projectPath, 'CLAUDE.md'))
  let hasDeployConfig = false

  const pkgPath = join(projectPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const allDeps: Record<string, string> = {
        ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies,
      }

      for (const dep of Object.keys(allDeps)) {
        dependencies.push(dep)
        if (dep.startsWith('@pauljump/')) sharedPackages.push(dep)
      }

      if (allDeps['next']) framework = 'nextjs'
      else if (allDeps['fastify']) framework = 'node-fastify'
      else if (allDeps['express']) framework = 'node-express'
      else if (allDeps['typescript']) framework = 'node-typescript'
      else framework = 'node'

      if (allDeps['better-sqlite3']) infrastructure.push('sqlite')
      if (allDeps['@pauljump/api-kit']) infrastructure.push('api-kit')
      if (allDeps['stripe']) infrastructure.push('stripe')
    } catch { /* ignore */ }
  }

  if (existsSync(join(projectPath, 'project.yml'))) {
    framework = 'ios-swift'
    infrastructure.push('xcodegen')
  } else if (existsSync(join(projectPath, 'ios'))) {
    framework = 'ios-swift'
  }

  if (existsSync(join(projectPath, 'Dockerfile'))) {
    hasDeployConfig = true
    infrastructure.push('docker')
  }

  return {
    name, path: projectPath, framework, dependencies, sharedPackages,
    infrastructure, dataSources, hasClaudeMd, hasDeployConfig,
  }
}

export function scanAllProjects(monorepoRoot: string): ProjectScan[] {
  const scans: ProjectScan[] = []
  const skip = new Set([
    'node_modules', '.git', '.claude', 'packages', '_archive',
    'dist', '.pnpm-store', '.turbo', 'factory',
  ])

  for (const entry of readdirSync(monorepoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || skip.has(entry.name) || entry.name.startsWith('.')) continue

    const projectPath = join(monorepoRoot, entry.name)
    const isProject = existsSync(join(projectPath, 'package.json'))
      || existsSync(join(projectPath, 'project.yml'))
      || existsSync(join(projectPath, 'CLAUDE.md'))

    if (isProject) scans.push(scanProject(projectPath))
  }

  return scans
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/scanner.test.ts
```

Expected: PASS

- [ ] **Step 5: Create scan-monorepo.ts**

```ts
// factory/scripts/scan-monorepo.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { scanAllProjects } from '../src/scanner.js'

const factoryRoot = new URL('..', import.meta.url).pathname
const monorepoRoot = join(factoryRoot, '..')

console.log(`Scanning projects in ${monorepoRoot}...`)
const scans = scanAllProjects(monorepoRoot)

mkdirSync(join(factoryRoot, 'data'), { recursive: true })
writeFileSync(join(factoryRoot, 'data', 'scan-results.json'), JSON.stringify(scans, null, 2))

const frameworks = new Map<string, number>()
const sharedPkgs = new Map<string, number>()
for (const scan of scans) {
  frameworks.set(scan.framework, (frameworks.get(scan.framework) ?? 0) + 1)
  for (const pkg of scan.sharedPackages) {
    sharedPkgs.set(pkg, (sharedPkgs.get(pkg) ?? 0) + 1)
  }
}

console.log(`\nScanned ${scans.length} projects:\n`)
console.log('Frameworks:')
for (const [fw, count] of [...frameworks.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${fw}: ${count}`)
}
console.log('\nShared package usage:')
for (const [pkg, count] of [...sharedPkgs.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pkg}: ${count} projects`)
}
console.log(`\nWith CLAUDE.md: ${scans.filter(s => s.hasClaudeMd).length}`)
console.log(`With deploy config: ${scans.filter(s => s.hasDeployConfig).length}`)
```

- [ ] **Step 6: Run against the real monorepo**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm scan
```

- [ ] **Step 7: Commit**

```bash
git add factory/src/scanner.ts factory/scripts/scan-monorepo.ts factory/tests/scanner.test.ts
git commit -m "feat(factory): add project scanner with framework and dependency detection"
```

---

## Task 10: Baseline Metrics Extraction

**Files:**
- Create: `factory/src/baseline.ts`
- Create: `factory/scripts/extract-baseline.ts`
- Create: `factory/tests/baseline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// factory/tests/baseline.test.ts
import { describe, it, expect } from 'vitest'
import { estimateSessions, detectCategory } from '../src/baseline.js'

describe('estimateSessions', () => {
  it('clusters commits within 4 hours into sessions', () => {
    const timestamps = [
      '2026-03-20 10:00:00',
      '2026-03-20 10:30:00',
      '2026-03-20 11:00:00',
      '2026-03-20 20:00:00',
      '2026-03-20 21:00:00',
      '2026-03-21 10:00:00',
    ]
    expect(estimateSessions(timestamps)).toBe(3)
  })

  it('handles single commit', () => {
    expect(estimateSessions(['2026-03-20 10:00:00'])).toBe(1)
  })

  it('handles empty array', () => {
    expect(estimateSessions([])).toBe(0)
  })
})

describe('detectCategory', () => {
  it('detects iOS', () => {
    expect(detectCategory('ios-swift', [])).toBe('ios')
  })
  it('detects web', () => {
    expect(detectCategory('nextjs', [])).toBe('web')
  })
  it('detects API', () => {
    expect(detectCategory('node-fastify', ['@pauljump/api-kit'])).toBe('api')
  })
  it('detects data pipeline', () => {
    expect(detectCategory('node-typescript', ['@pauljump/etl-kit'])).toBe('data-pipeline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/baseline.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement baseline.ts**

```ts
// factory/src/baseline.ts
import { execFileSync } from 'node:child_process'
import type { ProjectBaseline, ProjectScan } from './types.js'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function estimateSessions(timestamps: string[]): number {
  if (timestamps.length === 0) return 0
  if (timestamps.length === 1) return 1

  let sessions = 1
  for (let i = 1; i < timestamps.length; i++) {
    const prev = new Date(timestamps[i - 1]!).getTime()
    const curr = new Date(timestamps[i]!).getTime()
    if (curr - prev > FOUR_HOURS_MS) sessions++
  }
  return sessions
}

export function detectCategory(
  framework: string,
  sharedPackages: string[],
): ProjectBaseline['category'] {
  if (framework === 'ios-swift') return 'ios'
  if (framework === 'nextjs') return 'web'
  if (framework === 'node-fastify' || sharedPackages.includes('@pauljump/api-kit')) return 'api'
  if (sharedPackages.includes('@pauljump/etl-kit')) return 'data-pipeline'
  return 'other'
}

export function extractBaseline(scan: ProjectScan, monorepoRoot: string): ProjectBaseline | null {
  const relativePath = scan.path.replace(monorepoRoot + '/', '')

  try {
    const logOutput = execFileSync(
      'git', ['log', '--format=%aI', '--reverse', '--', relativePath],
      { cwd: monorepoRoot, encoding: 'utf-8', timeout: 30000 }
    ).trim()

    if (!logOutput) return null

    const timestamps = logOutput.split('\n').filter(Boolean)
    if (timestamps.length === 0) return null

    const firstCommit = timestamps[0]!
    const lastCommit = timestamps[timestamps.length - 1]!

    let firstDeploy: string | null = null
    try {
      const deployLog = execFileSync(
        'git', ['log', '--format=%aI', '--reverse', '--',
          `${relativePath}/Dockerfile`, `${relativePath}/web/Dockerfile`],
        { cwd: monorepoRoot, encoding: 'utf-8', timeout: 10000 }
      ).trim()
      if (deployLog) firstDeploy = deployLog.split('\n')[0]!
    } catch { /* no deploy found */ }

    let daysToFirstDeploy: number | null = null
    if (firstDeploy) {
      const start = new Date(firstCommit).getTime()
      const deploy = new Date(firstDeploy).getTime()
      daysToFirstDeploy = Math.round((deploy - start) / (1000 * 60 * 60 * 24))
    }

    return {
      name: scan.name,
      firstCommit: firstCommit.slice(0, 10),
      lastCommit: lastCommit.slice(0, 10),
      commitCount: timestamps.length,
      estimatedSessions: estimateSessions(timestamps),
      firstDeploy: firstDeploy?.slice(0, 10) ?? null,
      daysToFirstDeploy,
      category: detectCategory(scan.framework, scan.sharedPackages),
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test -- tests/baseline.test.ts
```

Expected: PASS

- [ ] **Step 5: Create extract-baseline.ts**

```ts
// factory/scripts/extract-baseline.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { extractBaseline } from '../src/baseline.js'
import type { ProjectScan } from '../src/types.js'

const factoryRoot = new URL('..', import.meta.url).pathname
const monorepoRoot = join(factoryRoot, '..')
const scanPath = join(factoryRoot, 'data', 'scan-results.json')

const scans: ProjectScan[] = JSON.parse(readFileSync(scanPath, 'utf-8'))
console.log(`Extracting baselines for ${scans.length} projects...\n`)

const baselines = []
for (const scan of scans) {
  const baseline = extractBaseline(scan, monorepoRoot)
  if (baseline) {
    baselines.push(baseline)
    console.log(`  ${baseline.name}: ${baseline.commitCount} commits, ~${baseline.estimatedSessions} sessions [${baseline.category}]`)
  }
}

mkdirSync(join(factoryRoot, 'data'), { recursive: true })
writeFileSync(join(factoryRoot, 'data', 'baselines.json'), JSON.stringify(baselines, null, 2))

const byCategory = new Map<string, number[]>()
for (const b of baselines) {
  const list = byCategory.get(b.category) ?? []
  list.push(b.estimatedSessions)
  byCategory.set(b.category, list)
}

console.log(`\n--- Summary ---`)
console.log(`Total: ${baselines.length} projects`)
for (const [cat, sessions] of byCategory) {
  const avg = sessions.reduce((a, b) => a + b, 0) / sessions.length
  console.log(`  ${cat}: ${sessions.length} projects, avg ${avg.toFixed(1)} sessions`)
}
```

- [ ] **Step 6: Run scan then baseline**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm scan && pnpm baseline
```

- [ ] **Step 7: Commit**

```bash
git add factory/src/baseline.ts factory/scripts/extract-baseline.ts factory/tests/baseline.test.ts
git commit -m "feat(factory): add baseline metrics extraction from git history"
```

---

## Task 11: Wire Hooks Into Claude Code

**Files:**
- Create or modify: `.claude/settings.json`

- [ ] **Step 1: Create hook configuration**

If `.claude/settings.json` does not exist, create it. If it exists, merge the hooks key into it.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "./factory/hooks/session-start.sh",
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
            "command": "./factory/hooks/stop.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Test hooks manually**

```bash
echo '{"cwd": "/Users/mini-home/Desktop/monorepo/stuywatch"}' | ./factory/hooks/session-start.sh
```

Expected: Outputs factory knowledge entries relevant to stuywatch.

```bash
echo '{"cwd": "/Users/mini-home/Desktop/monorepo/stuywatch"}' | ./factory/hooks/stop.sh
```

Expected: Logs session_end event (no output expected).

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(factory): wire SessionStart and Stop hooks into Claude Code"
```

---

## Task 12: Full Test Suite + Integration Verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm test
```

Expected: All tests pass (7 test files, ~20+ tests).

- [ ] **Step 2: Run the full pipeline**

```bash
cd /Users/mini-home/Desktop/monorepo/factory && pnpm bootstrap && pnpm rebuild-index && pnpm scan && pnpm baseline
```

Expected: All four scripts complete successfully.

- [ ] **Step 3: Verify SessionStart hook output for different projects**

```bash
echo '{"cwd": "/Users/mini-home/Desktop/monorepo/stuywatch"}' | ./factory/hooks/session-start.sh
echo '---'
echo '{"cwd": "/Users/mini-home/Desktop/monorepo/barkey"}' | ./factory/hooks/session-start.sh
echo '---'
echo '{"cwd": "/Users/mini-home/Desktop/monorepo/polyfeeds"}' | ./factory/hooks/session-start.sh
```

Expected: Different knowledge entries injected for each project based on their dependencies and tags.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(factory): Phase 0 complete — knowledge store, hooks, scanner, baselines"
```

---

## What Phase 0 Delivers

After completing all 12 tasks:

1. **Knowledge store** — ~120 entries bootstrapped, searchable via FTS5, organized by domain
2. **SessionStart hook** — detects project context, injects relevant knowledge automatically
3. **Stop hook** — logs session metrics to analytics database
4. **Project scanner** — analyzes all monorepo projects
5. **Baseline metrics** — extracted from git history for every project
6. **Analytics wiring** — automated event tracking for sessions

**Phase 1 is ready:** Build 5 projects through the factory, measure against baselines.
