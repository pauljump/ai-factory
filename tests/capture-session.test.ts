import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/db.js'
import { createTracker } from '../src/lib/analytics.js'
import { logSessionEvent, getSessionMetrics } from '../src/capture-session.js'

describe('capture-session', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
  })

  it('logs a session start event', () => {
    const tracker = createTracker(db)
    logSessionEvent(tracker, 'session_start', { project: 'stuywatch', entriesInjected: 5 })
    const events = tracker.getEvents({ event: 'session_start' })
    expect(events.length).toBe(1)
  })

  it('computes session metrics', () => {
    const tracker = createTracker(db)
    logSessionEvent(tracker, 'session_start', { project: 'a', entriesInjected: 5 })
    logSessionEvent(tracker, 'session_start', { project: 'b', entriesInjected: 3 })
    logSessionEvent(tracker, 'session_end', { project: 'a', knowledgeCaptured: 2 })
    const metrics = getSessionMetrics(tracker)
    expect(metrics.totalSessions).toBe(2)
    expect(metrics.totalKnowledgeInjected).toBe(8)
  })
})
