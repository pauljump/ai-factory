import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/engine/db.js'
import { createKnowledgeStore } from '../src/engine/knowledge-store.js'
import type { KnowledgeEntry } from '../src/engine/types.js'

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
