import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/engine/db.js'
import { createKnowledgeStore } from '../src/engine/knowledge-store.js'
import { buildInjection } from '../src/engine/inject-knowledge.js'
import type { KnowledgeEntry } from '../src/engine/types.js'

function makeEntry(overrides: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    id: 'test', domain: 'testing', tags: [], confidence: 'high',
    sourceProject: '', date: '2026-03-26', lastVerified: '2026-03-26',
    timesInjected: 0, timesUseful: 0, body: 'test body',
    ...overrides,
  }
}

describe('buildInjection', () => {
  let db: Database.Database
  let store: ReturnType<typeof createKnowledgeStore>

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
    store = createKnowledgeStore(db)
  })

  it('returns entries matching project tags', () => {
    store.index(makeEntry({
      id: 'sqlite-wal', domain: 'cloud-run',
      tags: ['sqlite', 'gcs-fuse'], body: 'WAL breaks on GCS FUSE',
    }))
    store.index(makeEntry({
      id: 'storekit-wiring', domain: 'ios',
      tags: ['storekit'], body: 'StoreKit 2 is non-trivial',
    }))

    const result = buildInjection(store, {
      projectName: 'stuywatch',
      dependencies: ['better-sqlite3', 'fastify'],
      tags: ['sqlite', 'cloud-run'],
    })

    expect(result.entries.some(e => e.id === 'sqlite-wal')).toBe(true)
    expect(result.entries.some(e => e.id === 'storekit-wiring')).toBe(false)
  })

  it('includes entries from the same source project', () => {
    store.index(makeEntry({
      id: 'stuywatch-tip', sourceProject: 'stuywatch',
      body: 'StuyWatch specific tip',
    }))

    const result = buildInjection(store, {
      projectName: 'stuywatch', dependencies: [], tags: [],
    })

    expect(result.entries.some(e => e.id === 'stuywatch-tip')).toBe(true)
  })

  it('formats output as readable context', () => {
    store.index(makeEntry({ id: 'e1', domain: 'cloud-run', body: 'Tip one' }))

    const result = buildInjection(store, {
      projectName: 'test', dependencies: [], tags: ['cloud-run'],
    })

    expect(result.formatted).toContain('Factory Knowledge')
    expect(result.formatted).toContain('Tip one')
  })

  it('caps entries at 15', () => {
    for (let i = 0; i < 50; i++) {
      store.index(makeEntry({
        id: `e${i}`, domain: 'testing', tags: ['common'],
        body: `Entry number ${i}`,
      }))
    }

    const result = buildInjection(store, {
      projectName: 'test', dependencies: [], tags: ['common'],
    })

    expect(result.entries.length).toBeLessThanOrEqual(15)
  })
})
