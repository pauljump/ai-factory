# Sub-Project 1: CLI Skeleton + Init Command — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform koba from a library with npm scripts into a globally installable CLI tool with a working `koba init` command that creates factory workspaces.

**Architecture:** Simple command-router via commander. Existing engine code moves into src/engine/. New commands in src/commands/. The `koba init` command creates a workspace with full factory structure, hooks, config, and CLAUDE.md.

**Tech Stack:** TypeScript (ESM, Node 22), commander, better-sqlite3, vitest.

**Working Directory:** `/Users/mini-home/Desktop/koba`

---

## Task 1: Restructure Into engine/ Directory

Move all existing source files into src/engine/ and update all imports. No new functionality.

**Files:**
- Move: all `src/*.ts` (except lib/) into `src/engine/`
- Update: all test imports
- Update: all internal cross-references
- Delete: `src/cli-inject.ts`, `src/cli-capture.ts`

- [ ] **Step 1: Create src/engine/ and move files**

```bash
cd /Users/mini-home/Desktop/koba
mkdir -p src/engine
mv src/db.ts src/engine/
mv src/knowledge-store.ts src/engine/
mv src/parse-entry.ts src/engine/
mv src/write-entry.ts src/engine/
mv src/inject-knowledge.ts src/engine/
mv src/capture-session.ts src/engine/
mv src/scanner.ts src/engine/
mv src/baseline.ts src/engine/
mv src/types.ts src/engine/
```

- [ ] **Step 2: Update imports in engine files that reference lib/**

`src/engine/db.ts` — change `'./lib/search.js'` to `'../lib/search.js'` and `'./lib/analytics.js'` to `'../lib/analytics.js'`

`src/engine/knowledge-store.ts` — change `'./lib/search.js'` to `'../lib/search.js'`

`src/engine/capture-session.ts` — change `'./lib/analytics.js'` to `'../lib/analytics.js'`

Engine files that only import from `./types.js` or Node built-ins don't change.

- [ ] **Step 3: Update all test imports from `../src/X.js` to `../src/engine/X.js`**

Every test file. Also update `capture-session.test.ts` which imports from `../src/lib/analytics.js` — that path stays the same.

- [ ] **Step 4: Update script imports from `../src/X.js` to `../src/engine/X.js`**

All files in `scripts/`.

- [ ] **Step 5: Delete old CLI entry points**

```bash
rm src/cli-inject.ts src/cli-capture.ts
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: All 38 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "refactor: move engine code into src/engine/"
```

---

## Task 2: Add commander + CLI Entry Point

**Files:**
- Create: `bin/koba.ts`
- Create: `src/commands/init.ts` (stub)
- Create: `src/commands/scan.ts` (stub)
- Create: `src/commands/status.ts` (stub)
- Create: `src/commands/knowledge.ts` (stub)
- Create: `src/commands/hook.ts` (stub)
- Modify: `package.json`
- Create: `tests/cli.test.ts`

- [ ] **Step 1: Install commander**

```bash
npm install commander
```

- [ ] **Step 2: Write CLI test**

```ts
// tests/cli.test.ts
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const BIN = join(import.meta.dirname, '..', 'bin', 'koba.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim()
}

describe('koba CLI', () => {
  it('prints version with --version', () => {
    const output = run('--version')
    expect(output).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('prints help with --help', () => {
    const output = run('--help')
    expect(output).toContain('koba')
    expect(output).toContain('init')
  })
})
```

- [ ] **Step 3: Create bin/koba.ts**

```ts
#!/usr/bin/env node --import tsx

import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const program = new Command()

program
  .name('koba')
  .description('The Factory — AI-powered compounding production system')
  .version(pkg.version)

program
  .command('init [name]')
  .description('Create a new factory workspace')
  .action(async (name?: string) => {
    const { initCommand } = await import('../src/commands/init.js')
    await initCommand(name)
  })

program
  .command('scan')
  .description('Analyze all projects in the factory')
  .action(async () => {
    const { scanCommand } = await import('../src/commands/scan.js')
    await scanCommand()
  })

program
  .command('status')
  .description('Show factory dashboard')
  .action(async () => {
    const { statusCommand } = await import('../src/commands/status.js')
    await statusCommand()
  })

program
  .command('knowledge')
  .description('Manage the knowledge base')
  .argument('<action>', 'search | rebuild | stats')
  .argument('[query]', 'search query')
  .action(async (action: string, query?: string) => {
    const { knowledgeCommand } = await import('../src/commands/knowledge.js')
    await knowledgeCommand(action, query)
  })

program
  .command('_hook')
  .description('Internal: hook entry points')
  .argument('<event>', 'session-start | stop')
  .option('--cwd <dir>', 'working directory')
  .action(async (event: string, opts: { cwd?: string }) => {
    const { hookCommand } = await import('../src/commands/hook.js')
    await hookCommand(event, opts.cwd)
  })

program.parse()
```

- [ ] **Step 4: Create stub commands**

Each file in `src/commands/` exports one async function that prints "not yet implemented" and exits 1. Files: `init.ts`, `scan.ts`, `status.ts`, `knowledge.ts`, `hook.ts`.

- [ ] **Step 5: Update package.json**

Add `"bin": { "koba": "./bin/koba.ts" }`, add commander to dependencies, bump version to 0.2.0, remove `"private": true`, remove old script commands (bootstrap, scan, baseline, rebuild-index).

- [ ] **Step 6: Make bin executable**

```bash
chmod +x bin/koba.ts
```

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: All tests pass (38 existing + 2 new CLI tests).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add CLI entry point with commander"
```

---

## Task 3: Workspace Discovery

**Files:**
- Create: `src/workspace.ts`
- Create: `tests/workspace.test.ts`

- [ ] **Step 1: Write test**

Test `findWorkspaceRoot` (walks up dirs looking for koba.json) and `getWorkspacePaths` (returns standard paths from root). Use temp dirs.

- [ ] **Step 2: Implement src/workspace.ts**

Exports:
- `findWorkspaceRoot(startDir: string): string | null` — walks up looking for koba.json
- `getWorkspacePaths(root: string): WorkspacePaths` — returns all standard paths
- `requireWorkspace(cwd?: string): WorkspacePaths` — finds workspace or exits with error

`WorkspacePaths` interface: `root`, `projects`, `packages`, `knowledge`, `data`, `scorecards`, `config` (koba.json), `db` (factory.db), `claudeMd`.

- [ ] **Step 3: Run tests, commit**

```bash
npm test && git add -A && git commit -m "feat: add workspace discovery"
```

---

## Task 4: koba init Command

**Files:**
- Modify: `src/commands/init.ts`
- Create: `src/templates/koba-config.ts`
- Create: `src/templates/claude-md.ts`
- Create: `src/templates/hooks.ts`
- Create: `tests/init.test.ts`

- [ ] **Step 1: Write init test**

Test that `koba init <tmpdir>` creates: koba.json, CLAUDE.md, projects/, packages/, knowledge/, data/, scorecards/, package.json, pnpm-workspace.yaml, .claude/settings.json, .gitignore. Test koba.json is valid. Test CLAUDE.md has factory header. Test hooks are wired. Test it refuses to init twice.

- [ ] **Step 2: Create src/templates/koba-config.ts**

`generateKobaConfig(name: string): object` — returns default koba.json content with name, version, stack, conventions, scan config.

- [ ] **Step 3: Create src/templates/claude-md.ts**

`generateClaudeMd(name: string): string` — returns CLAUDE.md with auto/user section markers. User sections wrapped in `<!-- koba:user-start:X -->` / `<!-- koba:user-end:X -->`. Auto sections wrapped in `<!-- koba:auto-start:X -->` / `<!-- koba:auto-end:X -->`.

- [ ] **Step 4: Create src/templates/hooks.ts**

`generateSessionStartHook(): string` and `generateStopHook(): string` — return shell scripts that call `koba _hook session-start --cwd "$CWD"` and `koba _hook stop --cwd "$CWD"`.

- [ ] **Step 5: Implement src/commands/init.ts**

Creates all directories, writes koba.json, CLAUDE.md, package.json (pnpm workspace root), pnpm-workspace.yaml, hook scripts (chmod 755), .claude/settings.json (hooks wired), .gitignore. Guards against existing koba.json. Prints progress and next steps.

- [ ] **Step 6: Run tests, commit**

```bash
npm test && git add -A && git commit -m "feat: add koba init — creates factory workspace"
```

---

## Task 5: koba _hook Command

Wire the existing knowledge injection and session capture engine into the CLI.

**Files:**
- Modify: `src/commands/hook.ts`
- Delete: `hooks/` directory

- [ ] **Step 1: Implement hook command**

`hookCommand(event: string, cwd?: string)`:
- Calls `requireWorkspace(cwd)` to find the workspace
- Opens factory db
- For `session-start`: detects project context, queries knowledge, logs session_start event, outputs formatted knowledge to stdout
- For `stop`: logs session_end event
- Closes db

- [ ] **Step 2: Delete old hooks/ directory**

```bash
rm -rf hooks/
```

- [ ] **Step 3: Run tests, commit**

```bash
npm test && git add -A && git commit -m "feat: add koba _hook command"
```

---

## Task 6: koba knowledge + scan + status Commands

Wire remaining commands to the engine.

**Files:**
- Modify: `src/commands/knowledge.ts`
- Modify: `src/commands/scan.ts`
- Modify: `src/commands/status.ts`

- [ ] **Step 1: Implement knowledge command**

Actions: `search <query>` (FTS5 search, print results), `rebuild` (reindex from markdown files), `stats` (count by domain).

- [ ] **Step 2: Implement scan command**

Calls `scanAllProjects(ws.projects)`, saves to data/scan-results.json, prints summary.

- [ ] **Step 3: Implement status command**

Reads workspace state: project count, package count, knowledge stats, session metrics, stale warnings.

- [ ] **Step 4: Run tests, commit**

```bash
npm test && git add -A && git commit -m "feat: add knowledge, scan, status commands"
```

---

## Task 7: Clean Up + README + Push

- [ ] **Step 1: Delete old scripts/ directory and bootstrap test**

```bash
rm -rf scripts/ tests/bootstrap.test.ts
rm -rf knowledge/*/ scorecards/
touch knowledge/.gitkeep scorecards/.gitkeep
```

- [ ] **Step 2: Write new README.md**

Honest README: what koba is, install, usage (init, convert, scan, status, knowledge search), how it works (Claude Code does heavy lifting), stack, links to docs.

- [ ] **Step 3: Run final tests**

```bash
npm test
```

- [ ] **Step 4: Test koba init end-to-end**

```bash
cd /tmp && npx tsx /Users/mini-home/Desktop/koba/bin/koba.ts init e2e-test && ls e2e-test/ && rm -rf e2e-test
```

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "chore: clean up Phase 0 artifacts, honest README" && git push
```

---

## What This Delivers

1. **CLI** (`bin/koba.ts`) with commander routing to all commands
2. **`koba init`** creates full factory workspace
3. **`koba _hook`** replaces shell scripts — knowledge injection via CLI
4. **`koba knowledge`** search, rebuild, stats
5. **`koba scan`** lightweight project analysis
6. **`koba status`** factory dashboard
7. **Workspace discovery** from any subdirectory
8. **Clean structure** — engine/, commands/, templates/, lib/
9. **Honest README**

**Next:** Sub-project 2 (deep scanner) + Sub-project 3 (convert command)
