import { describe, it, expect } from 'vitest'
import { serializeEntry } from '../src/engine/write-entry.js'
import { parseEntry } from '../src/engine/parse-entry.js'
import type { KnowledgeEntry } from '../src/engine/types.js'

describe('serializeEntry', () => {
  it('round-trips a knowledge entry through serialize then parse', () => {
    const entry: KnowledgeEntry = {
      id: 'cloud-run-sqlite-wal',
      domain: 'cloud-run',
      tags: ['sqlite', 'gcs-fuse'],
      confidence: 'high',
      sourceProject: 'kithome',
      date: '2026-03-15',
      lastVerified: '2026-03-15',
      timesInjected: 0,
      timesUseful: 0,
      body: 'SQLite WAL mode breaks on GCS FUSE.\n\n**Applies when:** Cloud Run + SQLite.',
    }

    const markdown = serializeEntry(entry)

    expect(markdown).toContain('domain: cloud-run')
    expect(markdown).toContain('confidence: high')
    expect(markdown).toContain('source_project: kithome')
    expect(markdown).toContain('SQLite WAL mode breaks on GCS FUSE.')

    const roundTripped = parseEntry(entry.id, markdown)
    expect(roundTripped.domain).toBe(entry.domain)
    expect(roundTripped.tags).toEqual(entry.tags)
    expect(roundTripped.confidence).toBe(entry.confidence)
    expect(roundTripped.body).toBe(entry.body)
  })
})
