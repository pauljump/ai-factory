import { existsSync, cpSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { requireWorkspace } from '../workspace.js'
import { discoverSource } from '../engine/discover.js'
import { harvestFromClaudeMd, harvestFromDomainKnowledge } from '../engine/harvester.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { serializeEntry } from '../engine/write-entry.js'
import { harvestPlaybooks } from '../engine/playbook-harvester.js'
import { writePlaybook } from '../engine/playbook-store.js'
import { extractConventions, formatConventions } from '../engine/conventions.js'
import { seedSoul, writeSoul } from '../engine/soul.js'
import type { KnowledgeEntry } from '../engine/types.js'

/** Directories to skip when copying projects/packages */
const COPY_SKIP = new Set([
  'node_modules', '.git', 'dist', '.next', '.turbo',
  '.pnpm-store', '.swc', '__pycache__', '.build',
  'DerivedData', 'build', '.gradle', 'Pods',
])

/** cpSync filter — skips build artifacts, deps, and VCS dirs */
function copyFilter(src: string): boolean {
  return !COPY_SKIP.has(basename(src))
}

export async function convertCommand(source: string, dryRun: boolean): Promise<void> {
  const sourcePath = resolve(source)
  if (!existsSync(sourcePath)) {
    console.error(`Error: source directory not found: ${sourcePath}`)
    process.exit(1)
  }

  const ws = requireWorkspace()

  console.log(`\nScanning ${sourcePath}...\n`)

  // ── Phase 1: Discover ─────────────────────────────────────────
  const discovery = discoverSource(sourcePath)

  const active = discovery.projects.filter(p => p.activity !== 'dead')
  const archived = discovery.projects.filter(p => p.activity === 'dead')
  const frameworks = new Set(discovery.projects.map(p => p.framework).filter(f => f !== 'unknown'))

  console.log(`Found ${discovery.projects.length} projects, ${discovery.packages.length} packages\n`)

  // ── Phase 2: Harvest conventions ──────────────────────────────
  const conventions = extractConventions(discovery.projects)

  // ── Phase 3: Harvest playbooks ────────────────────────────────
  const playbookResult = harvestPlaybooks(sourcePath, discovery.projects)
  const allPlaybooks = [...playbookResult.copied, ...playbookResult.activated]

  // ── Phase 4: Seed soul ────────────────────────────────────────
  const soulContent = seedSoul(sourcePath)

  // ── Phase 5: Harvest knowledge ────────────────────────────────
  const allKnowledge: KnowledgeEntry[] = []

  for (const project of discovery.projects) {
    const claudePath = join(project.path, 'CLAUDE.md')
    if (existsSync(claudePath)) {
      const content = readFileSync(claudePath, 'utf-8')
      const entries = harvestFromClaudeMd(project.name, content)
      allKnowledge.push(...entries)
    }
  }

  const domainKnowledgePath = join(sourcePath, 'DOMAIN_KNOWLEDGE.md')
  if (existsSync(domainKnowledgePath)) {
    const content = readFileSync(domainKnowledgePath, 'utf-8')
    const entries = harvestFromDomainKnowledge(content)
    allKnowledge.push(...entries)
  }

  // ── Phase 6: Detect research ──────────────────────────────────
  const researchDirs = [
    join(sourcePath, '.claude', 'research'),
    join(sourcePath, 'research'),
  ]
  const researchSource = researchDirs.find(d => existsSync(d))
  let researchFileCount = 0
  if (researchSource) {
    researchFileCount = countFiles(researchSource, '.md')
  }

  // ── Print conversion plan ─────────────────────────────────────
  console.log('CONVERSION PLAN')
  console.log('\u2500'.repeat(60))

  console.log(`\nActive projects (${active.length}):`)
  for (const p of active) {
    const tags = [p.framework, p.hasClaudeMd ? 'CLAUDE.md' : '', p.hasDeployConfig ? 'deploy' : ''].filter(Boolean).join(', ')
    console.log(`  ${p.name.padEnd(30)} ${tags}`)
  }

  if (archived.length > 0) {
    console.log(`\nArchived projects (${archived.length}):`)
    for (const p of archived) {
      console.log(`  ${p.name.padEnd(30)} last: ${p.lastCommitDate ?? 'unknown'}`)
    }
  }

  if (discovery.packages.length > 0) {
    console.log(`\nPackages (${discovery.packages.length}):`)
    for (const pkg of discovery.packages) {
      const consumers = pkg.consumerNames.length > 0
        ? pkg.consumerNames.slice(0, 5).join(', ') + (pkg.consumerNames.length > 5 ? ` +${pkg.consumerNames.length - 5} more` : '')
        : 'no consumers'
      console.log(`  ${pkg.name.padEnd(25)} ${pkg.consumers} consumers (${consumers})`)
    }
  }

  console.log(`\nFrameworks: ${[...frameworks].join(', ') || 'none detected'}`)

  if (conventions.length > 0) {
    console.log(`\nConventions detected (${conventions.length}):`)
    for (const c of conventions.slice(0, 10)) {
      console.log(`  ${c.pattern.padEnd(50)} ${c.projectCount} projects`)
    }
  }

  if (allPlaybooks.length > 0) {
    console.log(`\nPlaybooks (${allPlaybooks.length}):`)
    for (const p of allPlaybooks) {
      const source = playbookResult.copied.includes(p) ? 'copied' : 'template'
      console.log(`  ${p.name.padEnd(35)} ${p.projectsUsing.length} projects (${source})`)
    }
    if (playbookResult.gotchasRouted > 0) {
      console.log(`  ${playbookResult.gotchasRouted} gotchas routed into playbooks`)
    }
  }

  console.log(`\nSoul: ${soulContent.includes('Roles') || soulContent.includes('Principles') ? 'seeded from source' : 'default template'}`)
  console.log(`Knowledge: ${allKnowledge.length} entries harvested`)
  if (researchSource) {
    console.log(`Research: ${researchFileCount} files found`)
  }

  if (dryRun) {
    console.log('\n--dry-run: no changes made.')
    return
  }

  // ── Execute ───────────────────────────────────────────────────
  console.log('\nConverting...\n')

  // Copy active projects
  for (const project of active) {
    const dest = join(ws.projects, project.name)
    if (!existsSync(dest)) {
      cpSync(project.path, dest, { recursive: true, filter: copyFilter })
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
        cpSync(project.path, dest, { recursive: true, filter: copyFilter })
        console.log(`  \u2713 projects/_archive/${project.name}`)
      }
    }
  }

  // Copy packages
  for (const pkg of discovery.packages) {
    const shortName = pkg.name.replace(/^@[^/]+\//, '')
    const dest = join(ws.packages, shortName)
    if (!existsSync(dest)) {
      cpSync(pkg.path, dest, { recursive: true, filter: copyFilter })
      console.log(`  \u2713 packages/${shortName}`)
    }
  }

  // Write playbooks
  mkdirSync(ws.playbooks, { recursive: true })
  for (const playbook of allPlaybooks) {
    writePlaybook(ws.playbooks, playbook)
  }
  console.log(`  \u2713 ${allPlaybooks.length} playbooks (${playbookResult.copied.length} copied, ${playbookResult.activated.length} from templates)`)

  // Write soul
  writeSoul(ws.soul, soulContent)
  console.log(`  \u2713 soul.md`)

  // Write conventions to CLAUDE.md
  if (conventions.length > 0) {
    const conventionsMd = formatConventions(conventions)
    // Append conventions section to CLAUDE.md
    const claudeContent = readFileSync(ws.claudeMd, 'utf-8')
    if (!claudeContent.includes('Factory Conventions')) {
      writeFileSync(ws.claudeMd, claudeContent.trimEnd() + '\n\n' + conventionsMd)
    }
    console.log(`  \u2713 ${conventions.length} conventions documented`)
  }

  // Copy research
  if (researchSource) {
    mkdirSync(ws.research, { recursive: true })
    cpSync(researchSource, ws.research, { recursive: true, filter: copyFilter })
    console.log(`  \u2713 research/ (${researchFileCount} files)`)
  }

  // Write knowledge entries
  if (allKnowledge.length > 0) {
    mkdirSync(ws.data, { recursive: true })
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)

    for (const entry of allKnowledge) {
      const domainDir = join(ws.knowledge, entry.domain)
      mkdirSync(domainDir, { recursive: true })
      writeFileSync(join(domainDir, `${entry.id}.md`), serializeEntry(entry))
      store.index(entry)
    }

    db.close()
    console.log(`  \u2713 ${allKnowledge.length} knowledge entries indexed`)
  }

  // Update koba.json
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))
  config.stack.supported = [...frameworks]
  writeFileSync(ws.config, JSON.stringify(config, null, 2) + '\n')
  console.log(`  \u2713 koba.json updated`)

  // Update pnpm-workspace.yaml
  writeFileSync(join(ws.root, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n  - "projects/*"\n')

  console.log(`\nConversion complete.`)
  console.log(`  ${active.length} projects imported`)
  console.log(`  ${discovery.packages.length} packages adopted`)
  console.log(`  ${allPlaybooks.length} playbooks activated`)
  console.log(`  ${conventions.length} conventions detected`)
  console.log(`  ${allKnowledge.length} knowledge entries captured`)
  if (researchSource) console.log(`  ${researchFileCount} research files copied`)
  console.log(`  soul.md seeded`)
  console.log(`\nNext: Start a Claude Code session — hooks will inject soul + playbooks + knowledge.`)
}

/** Count files with a given extension recursively */
function countFiles(dir: string, ext: string): number {
  let count = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !COPY_SKIP.has(entry.name)) {
        count += countFiles(join(dir, entry.name), ext)
      } else if (entry.name.endsWith(ext)) {
        count++
      }
    }
  } catch { /* permission errors, etc */ }
  return count
}
