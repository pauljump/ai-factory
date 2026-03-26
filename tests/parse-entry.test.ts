import { describe, it, expect } from 'vitest'
import { parseEntry } from '../src/engine/parse-entry.js'

describe('parseEntry', () => {
  it('parses a well-formed knowledge entry', () => {
    const markdown = `---
domain: cloud-run
tags: [sqlite, gcs-fuse, journal-mode]
confidence: high
source_project: kithome
date: "2026-03-15"
last_verified: "2026-03-15"
times_injected: 5
times_useful: 3
---

SQLite with GCS FUSE cannot handle WAL mode.

**Context:** Discovered during kithome deployment.

**Applies when:** Any project using SQLite + Cloud Run.`

    const entry = parseEntry('cloud-run-sqlite-wal', markdown)

    expect(entry.id).toBe('cloud-run-sqlite-wal')
    expect(entry.domain).toBe('cloud-run')
    expect(entry.tags).toEqual(['sqlite', 'gcs-fuse', 'journal-mode'])
    expect(entry.confidence).toBe('high')
    expect(entry.sourceProject).toBe('kithome')
    expect(entry.date).toBe('2026-03-15')
    expect(entry.lastVerified).toBe('2026-03-15')
    expect(entry.timesInjected).toBe(5)
    expect(entry.timesUseful).toBe(3)
    expect(entry.body).toContain('SQLite with GCS FUSE cannot handle WAL mode.')
    expect(entry.body).toContain('**Applies when:**')
  })

  it('handles missing optional fields with defaults', () => {
    const markdown = `---
domain: ios
tags: [storekit]
confidence: medium
source_project: barkey
date: "2026-03-20"
---

StoreKit 2 wiring is non-trivial.`

    const entry = parseEntry('ios-storekit-wiring', markdown)
    expect(entry.lastVerified).toBe('2026-03-20')
    expect(entry.timesInjected).toBe(0)
    expect(entry.timesUseful).toBe(0)
  })
})
