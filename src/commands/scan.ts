import { requireWorkspace } from '../workspace.js'
import { scanAllProjects } from '../engine/scanner.js'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { regenerateClaudeMd } from '../engine/claude-md-gen.js'

export async function scanCommand(): Promise<void> {
  const ws = requireWorkspace()

  console.log(`Scanning factory at ${ws.root}...\n`)
  const scans = scanAllProjects(ws.projects)

  mkdirSync(ws.data, { recursive: true })
  writeFileSync(join(ws.data, 'scan-results.json'), JSON.stringify(scans, null, 2))

  const frameworks = new Map<string, number>()
  const sharedPkgs = new Map<string, number>()

  for (const scan of scans) {
    frameworks.set(scan.framework, (frameworks.get(scan.framework) ?? 0) + 1)
    for (const pkg of scan.sharedPackages) {
      sharedPkgs.set(pkg, (sharedPkgs.get(pkg) ?? 0) + 1)
    }
  }

  console.log(`Scanned ${scans.length} projects:\n`)
  if (frameworks.size > 0) {
    console.log('Frameworks:')
    for (const [fw, count] of [...frameworks.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${fw}: ${count}`)
    }
  }
  if (sharedPkgs.size > 0) {
    console.log('\nShared packages:')
    for (const [pkg, count] of [...sharedPkgs.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pkg}: ${count} projects`)
    }
  }
  console.log(`\nResults saved to data/scan-results.json`)

  // Regenerate CLAUDE.md
  if (existsSync(ws.claudeMd)) {
    let knowledgeEntries: import('../engine/types.js').KnowledgeEntry[] = []
    try {
      mkdirSync(ws.data, { recursive: true })
      const db = openFactoryDb(ws.db)
      const store = createKnowledgeStore(db)
      knowledgeEntries = store.list()
      db.close()
    } catch { /* knowledge store might not be initialized */ }

    regenerateClaudeMd(ws, scans, knowledgeEntries)
    console.log('\nCLAUDE.md regenerated.')
  }
}
