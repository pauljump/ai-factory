# Sub-Project 2: koba convert — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `koba convert <source>` command that ingests an existing monorepo (or scattered projects) into a koba factory workspace — copying projects, adopting packages, harvesting knowledge, generating config, and wiring hooks.

**Architecture:** The convert command does mechanical work (file discovery, copying, git history, knowledge harvesting from markdown). Claude Code handles the intelligence layer (deep pattern analysis, extraction recommendations) after conversion, guided by the generated CLAUDE.md. The command supports `--dry-run` to preview the plan without executing.

**Tech Stack:** TypeScript (ESM, Node 22), better-sqlite3, vitest.

**Working Directory:** `/Users/mini-home/Desktop/koba`

---

## File Structure (new/modified files)

```
src/
  commands/
    convert.ts              — koba convert <source> [--dry-run]
  engine/
    discover.ts             — find projects and packages in a source directory
    harvester.ts            — extract knowledge from CLAUDE.md, README, comments
    converter.ts            — execute the conversion plan (copy, wire, generate)
    types.ts                — add ConversionPlan, DiscoveryResult types
```

---

## Task 1: Add convert command to CLI + types

**Files:**
- Modify: `bin/koba.ts` (add convert command routing)
- Modify: `src/engine/types.ts` (add new types)
- Create: `src/commands/convert.ts` (stub)

- [ ] **Step 1: Add types to src/engine/types.ts**

Append these types to the existing file:

```ts
/** Result of discovering projects and packages in a source directory */
export interface DiscoveryResult {
  /** All project directories found */
  projects: DiscoveredProject[]
  /** All package directories found (from packages/ or similar) */
  packages: DiscoveredPackage[]
  /** Source root path */
  sourceRoot: string
}

export interface DiscoveredProject {
  name: string
  path: string
  framework: string
  hasClaudeMd: boolean
  hasDeployConfig: boolean
  /** active, dormant (30-90 days), dead (90+ days) */
  activity: 'active' | 'dormant' | 'dead'
  lastCommitDate: string | null
  commitCount: number
  estimatedSessions: number
  dependencies: string[]
  sharedPackages: string[]
}

export interface DiscoveredPackage {
  name: string
  path: string
  /** How many projects import this package */
  consumers: number
  /** Project names that import this package */
  consumerNames: string[]
}

/** The plan that convert generates before execution */
export interface ConversionPlan {
  source: string
  workspace: string
  projects: {
    active: DiscoveredProject[]
    archived: DiscoveredProject[]
  }
  packages: DiscoveredPackage[]
  knowledgeEntries: number
  summary: string
}
```

- [ ] **Step 2: Add convert command to bin/koba.ts**

Read `bin/koba.ts` and add this command before `program.parse()`:

```ts
program
  .command('convert <source>')
  .description('Import existing projects into the factory')
  .option('--dry-run', 'Show conversion plan without executing')
  .action(async (source: string, opts: { dryRun?: boolean }) => {
    const { convertCommand } = await import('../src/commands/convert.js')
    await convertCommand(source, opts.dryRun ?? false)
  })
```

- [ ] **Step 3: Create stub convert command**

```ts
// src/commands/convert.ts
export async function convertCommand(source: string, dryRun: boolean): Promise<void> {
  console.log(`koba convert: not yet implemented (source: ${source}, dryRun: ${dryRun})`)
  process.exit(1)
}
```

- [ ] **Step 4: Run tests, commit**

```bash
cd /Users/mini-home/Desktop/koba && npm test && git add -A && git commit -m "feat: add convert command stub + conversion types"
```

---

## Task 2: Discovery Engine

Finds all projects and packages in a source directory, analyzes each with the existing scanner + baseline, and identifies packages with their consumers.

**Files:**
- Create: `src/engine/discover.ts`
- Create: `tests/discover.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/discover.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { discoverSource } from '../src/engine/discover.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const testDir = join(tmpdir(), 'koba-test-discover')

function setup(files: Record<string, string>) {
  rmSync(testDir, { recursive: true, force: true })
  for (const [path, content] of Object.entries(files)) {
    const full = join(testDir, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
}

describe('discoverSource', () => {
  it('finds projects in top-level directories', () => {
    setup({
      'project-a/package.json': JSON.stringify({ dependencies: { fastify: '^5' } }),
      'project-b/package.json': JSON.stringify({ dependencies: { next: '^16' } }),
    })

    const result = discoverSource(testDir)
    expect(result.projects.length).toBe(2)
    expect(result.projects.map(p => p.name).sort()).toEqual(['project-a', 'project-b'])
  })

  it('finds packages in packages/ directory', () => {
    setup({
      'packages/api-kit/package.json': JSON.stringify({ name: '@test/api-kit' }),
      'packages/etl-kit/package.json': JSON.stringify({ name: '@test/etl-kit' }),
      'project-a/package.json': JSON.stringify({
        dependencies: { '@test/api-kit': 'workspace:*' },
      }),
    })

    const result = discoverSource(testDir)
    expect(result.packages.length).toBe(2)
    expect(result.packages.find(p => p.name === '@test/api-kit')?.consumers).toBe(1)
  })

  it('classifies projects by activity', () => {
    setup({
      'active-project/package.json': '{}',
      'dead-project/package.json': '{}',
    })

    // Without git history, all projects default to 'active'
    const result = discoverSource(testDir)
    expect(result.projects.every(p => p.activity === 'active')).toBe(true)
  })

  it('skips excluded directories', () => {
    setup({
      'real-project/package.json': '{}',
      'node_modules/fake/package.json': '{}',
      '.git/config': 'gitconfig',
    })

    const result = discoverSource(testDir)
    expect(result.projects.length).toBe(1)
    expect(result.projects[0]!.name).toBe('real-project')
  })

  it('detects iOS projects without package.json', () => {
    setup({
      'ios-app/project.yml': 'name: MyApp',
    })

    const result = discoverSource(testDir)
    expect(result.projects.length).toBe(1)
    expect(result.projects[0]!.framework).toBe('ios-swift')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/mini-home/Desktop/koba && npm test -- tests/discover.test.ts
```

- [ ] **Step 3: Implement discover.ts**

```ts
// src/engine/discover.ts
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { scanProject } from './scanner.js'
import type { DiscoveryResult, DiscoveredProject, DiscoveredPackage } from './types.js'

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude', 'dist', '.pnpm-store',
  '.turbo', '.next', '.swc', '__pycache__',
])

export function discoverSource(sourceRoot: string): DiscoveryResult {
  const projects: DiscoveredProject[] = []
  const packageMap = new Map<string, DiscoveredPackage>()

  // 1. Find packages/ directory if it exists
  const packagesDir = join(sourceRoot, 'packages')
  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue
      const pkgPath = join(packagesDir, entry.name)
      const pkgJsonPath = join(pkgPath, 'package.json')
      if (existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          const name = pkg.name ?? entry.name
          packageMap.set(name, {
            name,
            path: pkgPath,
            consumers: 0,
            consumerNames: [],
          })
        } catch { /* skip invalid */ }
      }
    }
  }

  // 2. Find all project directories
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
    if (entry.name === 'packages') continue // already handled

    const projectPath = join(sourceRoot, entry.name)
    const isProject = existsSync(join(projectPath, 'package.json'))
      || existsSync(join(projectPath, 'project.yml'))
      || existsSync(join(projectPath, 'CLAUDE.md'))

    if (!isProject) continue

    const scan = scanProject(projectPath)

    // Count package consumers
    for (const pkg of scan.sharedPackages) {
      const discovered = packageMap.get(pkg)
      if (discovered) {
        discovered.consumers++
        discovered.consumerNames.push(scan.name)
      }
    }

    projects.push({
      name: scan.name,
      path: projectPath,
      framework: scan.framework,
      hasClaudeMd: scan.hasClaudeMd,
      hasDeployConfig: scan.hasDeployConfig,
      activity: 'active', // default — git history analysis upgrades this
      lastCommitDate: null,
      commitCount: 0,
      estimatedSessions: 0,
      dependencies: scan.dependencies,
      sharedPackages: scan.sharedPackages,
    })
  }

  // 3. Try to get git history for activity classification
  try {
    for (const project of projects) {
      const relativePath = project.path.replace(sourceRoot + '/', '')
      try {
        const { execFileSync } = await import('node:child_process')
        const log = execFileSync(
          'git', ['log', '--format=%aI', '-1', '--', relativePath],
          { cwd: sourceRoot, encoding: 'utf-8', timeout: 5000 }
        ).trim()

        if (log) {
          project.lastCommitDate = log.slice(0, 10)
          const daysAgo = (Date.now() - new Date(log).getTime()) / (1000 * 60 * 60 * 24)
          if (daysAgo > 90) project.activity = 'dead'
          else if (daysAgo > 30) project.activity = 'dormant'
        }
      } catch { /* not a git repo or no history */ }
    }
  } catch { /* child_process import failed */ }

  return {
    projects,
    packages: Array.from(packageMap.values()),
    sourceRoot,
  }
}
```

Wait — there's a problem. The `await import()` is inside a non-async context. Let me fix that. The function should be async, or we use a synchronous import. Since `execFileSync` is from `node:child_process` which is always available, just import it at the top.

Let me revise:

```ts
// src/engine/discover.ts
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { scanProject } from './scanner.js'
import type { DiscoveryResult, DiscoveredProject, DiscoveredPackage } from './types.js'

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude', 'dist', '.pnpm-store',
  '.turbo', '.next', '.swc', '__pycache__',
])

export function discoverSource(sourceRoot: string): DiscoveryResult {
  const projects: DiscoveredProject[] = []
  const packageMap = new Map<string, DiscoveredPackage>()

  // 1. Find packages/ directory if it exists
  const packagesDir = join(sourceRoot, 'packages')
  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue
      const pkgPath = join(packagesDir, entry.name)
      const pkgJsonPath = join(pkgPath, 'package.json')
      if (existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          const name: string = pkg.name ?? entry.name
          packageMap.set(name, {
            name,
            path: pkgPath,
            consumers: 0,
            consumerNames: [],
          })
        } catch { /* skip invalid */ }
      }
    }
  }

  // 2. Find all project directories
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
    if (entry.name === 'packages') continue

    const projectPath = join(sourceRoot, entry.name)
    const isProject = existsSync(join(projectPath, 'package.json'))
      || existsSync(join(projectPath, 'project.yml'))
      || existsSync(join(projectPath, 'CLAUDE.md'))

    if (!isProject) continue

    const scan = scanProject(projectPath)

    for (const pkg of scan.sharedPackages) {
      const discovered = packageMap.get(pkg)
      if (discovered) {
        discovered.consumers++
        discovered.consumerNames.push(scan.name)
      }
    }

    projects.push({
      name: scan.name,
      path: projectPath,
      framework: scan.framework,
      hasClaudeMd: scan.hasClaudeMd,
      hasDeployConfig: scan.hasDeployConfig,
      activity: 'active',
      lastCommitDate: null,
      commitCount: 0,
      estimatedSessions: 0,
      dependencies: scan.dependencies,
      sharedPackages: scan.sharedPackages,
    })
  }

  // 3. Git history for activity classification
  for (const project of projects) {
    const relativePath = project.path.replace(sourceRoot + '/', '')
    try {
      const log = execFileSync(
        'git', ['log', '--format=%aI', '-1', '--', relativePath],
        { cwd: sourceRoot, encoding: 'utf-8', timeout: 5000 }
      ).trim()

      if (log) {
        project.lastCommitDate = log.slice(0, 10)
        const daysAgo = (Date.now() - new Date(log).getTime()) / (1000 * 60 * 60 * 24)
        if (daysAgo > 90) project.activity = 'dead'
        else if (daysAgo > 30) project.activity = 'dormant'
      }
    } catch { /* not a git repo or no history for this path */ }
  }

  return {
    projects,
    packages: Array.from(packageMap.values()),
    sourceRoot,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/mini-home/Desktop/koba && npm test -- tests/discover.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add discovery engine — find projects and packages in source"
```

---

## Task 3: Knowledge Harvester

Extracts knowledge entries from existing CLAUDE.md files, README.md files, and a DOMAIN_KNOWLEDGE.md if one exists in the source.

**Files:**
- Create: `src/engine/harvester.ts`
- Create: `tests/harvester.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/harvester.test.ts
import { describe, it, expect } from 'vitest'
import { harvestFromClaudeMd, harvestFromDomainKnowledge } from '../src/engine/harvester.js'

describe('harvestFromClaudeMd', () => {
  it('extracts gotchas from a CLAUDE.md', () => {
    const content = `# StuyWatch

## Gotchas
- SQLite WAL mode breaks on Cloud Run with GCS FUSE
- The Beam Living API returns all 5 properties, not just Stuytown

## Current State
**Status:** Building
`
    const entries = harvestFromClaudeMd('stuywatch', content)
    expect(entries.length).toBe(2)
    expect(entries[0]!.sourceProject).toBe('stuywatch')
    expect(entries[0]!.body).toContain('SQLite WAL mode')
  })

  it('extracts from architecture sections', () => {
    const content = `# MyApp

## Architecture
Backend uses Fastify with SQLite in DELETE journal mode for Cloud Run compatibility.
`
    const entries = harvestFromClaudeMd('myapp', content)
    expect(entries.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty for minimal CLAUDE.md', () => {
    const entries = harvestFromClaudeMd('empty', '# Empty Project\n')
    expect(entries.length).toBe(0)
  })
})

describe('harvestFromDomainKnowledge', () => {
  it('parses domain knowledge sections', () => {
    const content = `# Domain Knowledge

## Cloud Infrastructure

### Google Cloud Run
- GCS FUSE mount required for SQLite persistence — **stuywatch**
- SQLite WAL mode breaks on GCS FUSE — **kithome**
`
    const entries = harvestFromDomainKnowledge(content)
    expect(entries.length).toBe(2)
    expect(entries[0]!.domain).toContain('cloud')
    expect(entries[0]!.sourceProject).toBe('stuywatch')
  })
})
```

- [ ] **Step 2: Implement harvester.ts**

```ts
// src/engine/harvester.ts
import type { KnowledgeEntry } from './types.js'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Extract knowledge entries from a project's CLAUDE.md.
 * Looks for gotchas, architecture notes, and key decisions.
 */
export function harvestFromClaudeMd(projectName: string, content: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  const lines = content.split('\n')

  let inRelevantSection = false
  let currentSection = ''

  for (const line of lines) {
    // Track which section we're in
    if (line.startsWith('## ')) {
      const section = line.replace('## ', '').trim().toLowerCase()
      inRelevantSection = isRelevantSection(section)
      currentSection = section
      continue
    }

    // Extract bullet points from relevant sections
    if (inRelevantSection && line.startsWith('- ')) {
      const body = line.slice(2).trim()
      if (body.length < 20) continue // skip trivial bullets

      const id = slugify(`${projectName}-${currentSection}-${body.slice(0, 50)}`)
      entries.push({
        id,
        domain: sectionToDomain(currentSection),
        tags: [projectName],
        confidence: 'medium',
        sourceProject: projectName,
        date: today(),
        lastVerified: today(),
        timesInjected: 0,
        timesUseful: 0,
        body,
      })
    }

    // Extract non-bullet content from architecture sections (sentences)
    if (inRelevantSection && currentSection.includes('architecture') && !line.startsWith('#') && !line.startsWith('-') && line.trim().length > 40) {
      const body = line.trim()
      const id = slugify(`${projectName}-arch-${body.slice(0, 50)}`)
      entries.push({
        id,
        domain: 'architecture',
        tags: [projectName],
        confidence: 'medium',
        sourceProject: projectName,
        date: today(),
        lastVerified: today(),
        timesInjected: 0,
        timesUseful: 0,
        body,
      })
    }
  }

  return entries
}

/**
 * Parse a DOMAIN_KNOWLEDGE.md file into individual entries.
 * Format: ## domain headers, ### subsection headers, - bullet entries with **project** attribution.
 */
export function harvestFromDomainKnowledge(content: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  const lines = content.split('\n')
  let currentDomain = ''
  let currentSubsection = ''

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
      const id = slugify(`${currentDomain}-${currentSubsection}-${body.slice(0, 50)}`)

      entries.push({
        id,
        domain: currentDomain,
        tags,
        confidence: 'high',
        sourceProject,
        date: today(),
        lastVerified: today(),
        timesInjected: 0,
        timesUseful: 0,
        body,
      })
    }
  }

  return entries
}

function isRelevantSection(section: string): boolean {
  const relevant = ['gotcha', 'architecture', 'critical', 'known issue', 'important', 'caveat', 'warning', 'note']
  return relevant.some(r => section.includes(r))
}

function sectionToDomain(section: string): string {
  if (section.includes('gotcha') || section.includes('caveat')) return 'gotchas'
  if (section.includes('architecture')) return 'architecture'
  if (section.includes('deploy')) return 'infrastructure'
  return 'general'
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/mini-home/Desktop/koba && npm test -- tests/harvester.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add knowledge harvester — extract from CLAUDE.md and DOMAIN_KNOWLEDGE.md"
```

---

## Task 4: The Convert Command

The main event. Ties discovery + harvesting + workspace creation together.

**Files:**
- Modify: `src/commands/convert.ts`
- Create: `tests/convert.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/convert.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BIN = join(import.meta.dirname, '..', 'bin', 'koba.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')
const workspaceDir = join(tmpdir(), 'koba-test-convert-ws')
const sourceDir = join(tmpdir(), 'koba-test-convert-src')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 60000,
    cwd: workspaceDir,
  }).trim()
}

describe('koba convert', () => {
  beforeEach(() => {
    // Clean up
    rmSync(workspaceDir, { recursive: true, force: true })
    rmSync(sourceDir, { recursive: true, force: true })

    // Create a fake source monorepo
    mkdirSync(join(sourceDir, 'project-a'), { recursive: true })
    writeFileSync(join(sourceDir, 'project-a', 'package.json'), JSON.stringify({
      dependencies: { fastify: '^5', 'better-sqlite3': '^11' },
    }))
    writeFileSync(join(sourceDir, 'project-a', 'CLAUDE.md'), '# Project A\n\n## Gotchas\n- SQLite needs DELETE journal mode on Cloud Run\n')

    mkdirSync(join(sourceDir, 'project-b'), { recursive: true })
    writeFileSync(join(sourceDir, 'project-b', 'package.json'), JSON.stringify({
      dependencies: { next: '^16' },
    }))

    mkdirSync(join(sourceDir, 'packages', 'api-kit'), { recursive: true })
    writeFileSync(join(sourceDir, 'packages', 'api-kit', 'package.json'), JSON.stringify({
      name: '@test/api-kit',
    }))

    // Init workspace first
    execFileSync(TSX, [BIN, 'init', workspaceDir], {
      encoding: 'utf-8',
      timeout: 30000,
    })
  })

  it('copies projects into workspace', () => {
    run('convert', sourceDir)

    expect(existsSync(join(workspaceDir, 'projects', 'project-a', 'package.json'))).toBe(true)
    expect(existsSync(join(workspaceDir, 'projects', 'project-b', 'package.json'))).toBe(true)
  })

  it('copies packages into workspace', () => {
    run('convert', sourceDir)

    expect(existsSync(join(workspaceDir, 'packages', 'api-kit', 'package.json'))).toBe(true)
  })

  it('harvests knowledge from CLAUDE.md files', () => {
    run('convert', sourceDir)

    // Check that knowledge directory has entries
    const knowledgeDir = join(workspaceDir, 'knowledge')
    const hasFiles = existsSync(knowledgeDir)
    expect(hasFiles).toBe(true)
  })

  it('updates koba.json with detected stack', () => {
    run('convert', sourceDir)

    const config = JSON.parse(readFileSync(join(workspaceDir, 'koba.json'), 'utf-8'))
    expect(config.stack.supported.length).toBeGreaterThan(0)
  })

  it('dry run does not copy files', () => {
    run('convert', sourceDir, '--dry-run')

    expect(existsSync(join(workspaceDir, 'projects', 'project-a'))).toBe(false)
  })
})
```

- [ ] **Step 2: Implement convert.ts**

```ts
// src/commands/convert.ts
import { existsSync, cpSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { requireWorkspace } from '../workspace.js'
import { discoverSource } from '../engine/discover.js'
import { harvestFromClaudeMd, harvestFromDomainKnowledge } from '../engine/harvester.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { serializeEntry } from '../engine/write-entry.js'
import type { KnowledgeEntry } from '../engine/types.js'

export async function convertCommand(source: string, dryRun: boolean): Promise<void> {
  const sourcePath = resolve(source)
  if (!existsSync(sourcePath)) {
    console.error(`Error: source directory not found: ${sourcePath}`)
    process.exit(1)
  }

  const ws = requireWorkspace()

  console.log(`\nScanning ${sourcePath}...\n`)

  // Phase 1: Discover
  const discovery = discoverSource(sourcePath)

  const active = discovery.projects.filter(p => p.activity !== 'dead')
  const archived = discovery.projects.filter(p => p.activity === 'dead')

  // Detect stack from frameworks
  const frameworks = new Set(discovery.projects.map(p => p.framework).filter(f => f !== 'unknown'))

  console.log(`Found ${discovery.projects.length} projects, ${discovery.packages.length} packages\n`)

  console.log('CONVERSION PLAN')
  console.log('\u2500'.repeat(40))
  console.log(`\nProjects:`)
  console.log(`  ${active.length} active \u2192 projects/`)
  if (archived.length > 0) {
    console.log(`  ${archived.length} archived \u2192 projects/_archive/`)
  }

  if (discovery.packages.length > 0) {
    console.log(`\nPackages:`)
    for (const pkg of discovery.packages) {
      console.log(`  ${pkg.name} (${pkg.consumers} consumers)`)
    }
  }

  console.log(`\nFrameworks: ${[...frameworks].join(', ') || 'none detected'}`)

  // Harvest knowledge
  const allKnowledge: KnowledgeEntry[] = []

  // From CLAUDE.md files
  for (const project of discovery.projects) {
    const claudePath = join(project.path, 'CLAUDE.md')
    if (existsSync(claudePath)) {
      const content = readFileSync(claudePath, 'utf-8')
      const entries = harvestFromClaudeMd(project.name, content)
      allKnowledge.push(...entries)
    }
  }

  // From DOMAIN_KNOWLEDGE.md if it exists
  const domainKnowledgePath = join(sourcePath, 'DOMAIN_KNOWLEDGE.md')
  if (existsSync(domainKnowledgePath)) {
    const content = readFileSync(domainKnowledgePath, 'utf-8')
    const entries = harvestFromDomainKnowledge(content)
    allKnowledge.push(...entries)
  }

  console.log(`\nKnowledge: ${allKnowledge.length} entries harvested`)

  if (dryRun) {
    console.log('\n--dry-run: no changes made.')
    return
  }

  // Phase 2: Execute
  console.log('\nConverting...\n')

  // Copy active projects
  for (const project of active) {
    const dest = join(ws.projects, project.name)
    if (!existsSync(dest)) {
      cpSync(project.path, dest, { recursive: true })
      console.log(`  \u2713 projects/${project.name}`)
    } else {
      console.log(`  \u2022 projects/${project.name} (already exists, skipped)`)
    }
  }

  // Copy archived projects
  if (archived.length > 0) {
    const archiveDir = join(ws.projects, '_archive')
    mkdirSync(archiveDir, { recursive: true })
    for (const project of archived) {
      const dest = join(archiveDir, project.name)
      if (!existsSync(dest)) {
        cpSync(project.path, dest, { recursive: true })
        console.log(`  \u2713 projects/_archive/${project.name}`)
      }
    }
  }

  // Copy packages
  for (const pkg of discovery.packages) {
    const dest = join(ws.packages, pkg.name.replace(/^@[^/]+\//, ''))
    if (!existsSync(dest)) {
      cpSync(pkg.path, dest, { recursive: true })
      console.log(`  \u2713 packages/${pkg.name.replace(/^@[^/]+\//, '')}`)
    }
  }

  // Write knowledge entries
  if (allKnowledge.length > 0) {
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)

    for (const entry of allKnowledge) {
      // Write markdown file
      const domainDir = join(ws.knowledge, entry.domain)
      mkdirSync(domainDir, { recursive: true })
      writeFileSync(join(domainDir, `${entry.id}.md`), serializeEntry(entry))

      // Index in SQLite
      store.index(entry)
    }

    db.close()
    console.log(`  \u2713 ${allKnowledge.length} knowledge entries indexed`)
  }

  // Update koba.json with detected stack
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))
  config.stack.supported = [...frameworks]
  writeFileSync(ws.config, JSON.stringify(config, null, 2) + '\n')
  console.log(`  \u2713 koba.json updated`)

  // Update pnpm-workspace.yaml to include new packages
  const workspaceYaml = [
    'packages:',
    '  - "packages/*"',
    '  - "projects/*"',
    '',
  ].join('\n')
  writeFileSync(join(ws.root, 'pnpm-workspace.yaml'), workspaceYaml)

  console.log(`\nConversion complete.`)
  console.log(`  ${active.length} projects imported`)
  console.log(`  ${discovery.packages.length} packages adopted`)
  console.log(`  ${allKnowledge.length} knowledge entries captured`)
  console.log(`\nNext: Start a Claude Code session to run deep analysis.`)
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/mini-home/Desktop/koba && npm test -- tests/convert.test.ts
```

Expected: PASS

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/mini-home/Desktop/koba && npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add koba convert — ingest existing monorepo into factory workspace"
```

---

## Task 5: Test Against Real Monorepo (Manual)

This is a manual verification task — run koba convert against the actual monorepo.

- [ ] **Step 1: Create a test workspace**

```bash
cd /tmp && npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts init real-test
cd real-test
```

- [ ] **Step 2: Run convert against the monorepo**

```bash
npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts convert /Users/mini-home/Desktop/monorepo --dry-run
```

Expected: Shows the conversion plan — ~67 projects, ~21 packages, knowledge entries harvested. Does NOT copy anything.

- [ ] **Step 3: Run for real (if dry-run looks good)**

```bash
npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts convert /Users/mini-home/Desktop/monorepo
```

Expected: Copies all projects and packages, indexes knowledge.

- [ ] **Step 4: Verify**

```bash
npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts status
ls projects/ | head -20
ls packages/
npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts knowledge stats
```

- [ ] **Step 5: Clean up test workspace**

```bash
rm -rf /tmp/real-test
```

- [ ] **Step 6: Push**

```bash
cd /Users/mini-home/Desktop/koba && git push
```

---

## What This Delivers

1. **`koba convert <source>`** — ingests an existing monorepo into a factory workspace
2. **`koba convert <source> --dry-run`** — previews the plan without executing
3. **Discovery engine** — finds projects and packages, classifies activity
4. **Knowledge harvester** — extracts from CLAUDE.md and DOMAIN_KNOWLEDGE.md
5. **Automatic stack detection** — populates koba.json from discovered frameworks
6. **Package adoption** — copies existing shared packages with consumer counting

After this, you can run `koba init` + `koba convert ~/Desktop/monorepo` and have a working factory workspace with all 67 projects, 21 packages, and harvested knowledge.
