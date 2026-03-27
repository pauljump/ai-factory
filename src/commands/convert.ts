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
    const shortName = pkg.name.replace(/^@[^/]+\//, '')
    const dest = join(ws.packages, shortName)
    if (!existsSync(dest)) {
      cpSync(pkg.path, dest, { recursive: true })
      console.log(`  \u2713 packages/${shortName}`)
    }
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
  console.log(`  ${allKnowledge.length} knowledge entries captured`)
  console.log(`\nNext: Start a Claude Code session for deep analysis.`)
}
