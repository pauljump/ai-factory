import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { createTracker } from '../lib/analytics.js'
import { getSessionMetrics } from '../engine/capture-session.js'
import { loadPlaybooks } from '../engine/playbook-store.js'
import { readSoul } from '../engine/soul.js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export async function statusCommand(): Promise<void> {
  const ws = requireWorkspace()
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))

  console.log(`\nTHE FACTORY: ${config.name}`)
  console.log('\u2500'.repeat(40))

  // Soul
  const soul = readSoul(ws.soul)
  console.log(`\nSoul: ${soul ? 'present' : 'missing'}`)

  // Projects
  let activeProjects = 0
  let archivedProjects = 0
  try {
    activeProjects = readdirSync(ws.projects, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '_archive').length
    const archiveDir = join(ws.projects, '_archive')
    if (existsSync(archiveDir)) {
      archivedProjects = readdirSync(archiveDir, { withFileTypes: true })
        .filter(d => d.isDirectory()).length
    }
  } catch { /* projects dir might not exist */ }

  let packageCount = 0
  try {
    packageCount = readdirSync(ws.packages, { withFileTypes: true })
      .filter(d => d.isDirectory()).length
  } catch { /* packages dir might not exist */ }

  console.log(`Projects: ${activeProjects} active, ${archivedProjects} archived`)
  console.log(`Packages: ${packageCount} shared`)

  // Playbooks
  const playbooks = loadPlaybooks(ws.playbooks)
  if (playbooks.length > 0) {
    const highConf = playbooks.filter(p => p.confidence === 'high').length
    const templateOnly = playbooks.filter(p => p.confidence === 'low').length
    console.log(`Playbooks: ${playbooks.length} (${highConf} battle-tested, ${templateOnly} templates)`)

    const stalePlaybooks = playbooks.filter(p => {
      if (!p.lastVerified) return true
      return (Date.now() - new Date(p.lastVerified).getTime()) / (1000 * 60 * 60 * 24) > 90
    })
    if (stalePlaybooks.length > 0) {
      console.log(`  \u26a0 ${stalePlaybooks.length} stale: ${stalePlaybooks.map(p => p.name).join(', ')}`)
    }
  } else {
    console.log('Playbooks: none')
  }

  // Research
  let researchCount = 0
  try {
    if (existsSync(ws.research)) {
      researchCount = countMdFiles(ws.research)
    }
  } catch { /* */ }
  if (researchCount > 0) {
    console.log(`Research: ${researchCount} files`)
  }

  // Knowledge
  if (existsSync(ws.db)) {
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)
    const entries = store.list()
    const tracker = createTracker(db)
    const metrics = getSessionMetrics(tracker)
    db.close()

    const byDomain = new Map<string, number>()
    for (const entry of entries) {
      byDomain.set(entry.domain, (byDomain.get(entry.domain) ?? 0) + 1)
    }

    console.log(`Knowledge: ${entries.length} entries across ${byDomain.size} domains`)
    if (byDomain.size > 0) {
      const top5 = [...byDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      console.log(`  Top: ${top5.map(([d, c]) => `${d} (${c})`).join(', ')}`)
    }

    const stale = entries.filter(e => {
      const age = Date.now() - new Date(e.lastVerified).getTime()
      return age > 90 * 24 * 60 * 60 * 1000
    })
    if (stale.length > 0) {
      console.log(`  \u26a0 ${stale.length} entries stale (90+ days)`)
    }

    if (metrics.totalSessions > 0) {
      console.log(`\nSessions: ${metrics.totalSessions} tracked`)
      console.log(`  Knowledge injected: ${metrics.totalKnowledgeInjected} entries`)
      console.log(`  Knowledge captured: ${metrics.totalKnowledgeCaptured} entries`)
    }
  } else {
    console.log(`Knowledge: not initialized (run factory knowledge rebuild)`)
  }

  console.log('')
}

function countMdFiles(dir: string): number {
  let count = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count += countMdFiles(join(dir, entry.name))
      else if (entry.name.endsWith('.md')) count++
    }
  } catch { /* */ }
  return count
}
