import type Database from 'better-sqlite3'
import { search, rebuildSearchIndex } from './lib/search.js'
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
