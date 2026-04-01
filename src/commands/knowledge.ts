import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { parseEntry } from '../engine/parse-entry.js'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

export async function knowledgeCommand(action: string, query?: string): Promise<void> {
  const ws = requireWorkspace()

  if (action === 'search') {
    if (!query) {
      console.error('Usage: factory knowledge search <query>')
      process.exit(1)
    }
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)
    const results = store.search(query, 10)
    db.close()

    if (results.length === 0) {
      console.log('No results found.')
      return
    }
    console.log(`Found ${results.length} entries:\n`)
    for (const entry of results) {
      const firstLine = entry.body.split('\n')[0] ?? ''
      console.log(`  [${entry.domain}] ${entry.id}`)
      console.log(`    ${firstLine}`)
      console.log(`    (${entry.confidence}, from ${entry.sourceProject}, injected ${entry.timesInjected}x)\n`)
    }
  } else if (action === 'rebuild') {
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)
    db.exec('DELETE FROM knowledge_entries')

    const files = collectMarkdownFiles(ws.knowledge)
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
  } else if (action === 'stats') {
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)
    const all = store.list()
    db.close()

    const byDomain = new Map<string, number>()
    for (const entry of all) {
      byDomain.set(entry.domain, (byDomain.get(entry.domain) ?? 0) + 1)
    }
    console.log(`Knowledge base: ${all.length} entries\n`)
    for (const [domain, count] of [...byDomain.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${domain}: ${count}`)
    }
  } else {
    console.error(`Unknown action: ${action}. Use: search, rebuild, stats`)
    process.exit(1)
  }
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  try {
    for (const item of readdirSync(dir)) {
      const full = join(dir, item)
      if (statSync(full).isDirectory()) {
        files.push(...collectMarkdownFiles(full))
      } else if (item.endsWith('.md')) {
        files.push(full)
      }
    }
  } catch { /* directory might not exist yet */ }
  return files
}
