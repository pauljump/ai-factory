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
