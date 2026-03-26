import type Database from 'better-sqlite3'

// ── Types ────────────────────────────────────────────────────

export interface TrackParams {
  event: string
  userId?: string
  properties?: Record<string, unknown>
}

export interface IdentifyParams {
  userId: string
  traits: Record<string, unknown>
}

export interface EventQuery {
  event?: string
  userId?: string
  since?: string
  until?: string
  limit?: number
}

export interface CountQuery {
  event: string
  groupBy: 'hour' | 'day' | 'week' | 'month'
  since?: string
  until?: string
}

export interface UniqueQuery {
  event: string
  groupBy: 'hour' | 'day' | 'week' | 'month'
  since?: string
  until?: string
}

export interface FunnelQuery {
  steps: string[]
  since?: string
  until?: string
}

export interface Event {
  id: number
  event: string
  userId: string | null
  properties: Record<string, unknown>
  timestamp: string
}

export interface CountResult {
  period: string
  count: number
}

export interface UniqueResult {
  period: string
  count: number
}

export interface FunnelResult {
  step: string
  count: number
}

export interface Tracker {
  track(params: TrackParams): void
  identify(params: IdentifyParams): void
  getEvents(query?: EventQuery): Event[]
  getCounts(query: CountQuery): CountResult[]
  getUniques(query: UniqueQuery): UniqueResult[]
  getFunnel(query: FunnelQuery): FunnelResult[]
}

// ── Functions ────────────────────────────────────────────────

/**
 * Creates the analytics_events and analytics_users tables if they don't exist.
 * Call once at app startup after getDb().
 */
export function initAnalyticsTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      userId TEXT,
      properties TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_event_ts ON analytics_events (event, timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_user_ts ON analytics_events (userId, timestamp);

    CREATE TABLE IF NOT EXISTS analytics_users (
      userId TEXT PRIMARY KEY,
      traits TEXT DEFAULT '{}',
      firstSeen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      lastSeen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `)
}

function groupByFormat(groupBy: 'hour' | 'day' | 'week' | 'month'): string {
  switch (groupBy) {
    case 'hour':
      return '%Y-%m-%dT%H:00:00Z'
    case 'day':
      return '%Y-%m-%d'
    case 'week':
      return '%Y-W%W'
    case 'month':
      return '%Y-%m'
  }
}

/**
 * Creates a tracker instance bound to the given SQLite database.
 * Call initAnalyticsTables(db) before using the tracker.
 */
export function createTracker(db: Database.Database): Tracker {
  const insertEvent = db.prepare(
    `INSERT INTO analytics_events (event, userId, properties, timestamp)
     VALUES (@event, @userId, @properties, @timestamp)`
  )

  const upsertUser = db.prepare(
    `INSERT INTO analytics_users (userId, traits, firstSeen, lastSeen)
     VALUES (@userId, @traits, @now, @now)
     ON CONFLICT(userId) DO UPDATE SET
       traits = json_patch(analytics_users.traits, @traits),
       lastSeen = @now`
  )

  return {
    track(params: TrackParams): void {
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      insertEvent.run({
        event: params.event,
        userId: params.userId ?? null,
        properties: JSON.stringify(params.properties ?? {}),
        timestamp: now,
      })
    },

    identify(params: IdentifyParams): void {
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      upsertUser.run({
        userId: params.userId,
        traits: JSON.stringify(params.traits),
        now,
      })
    },

    getEvents(query?: EventQuery): Event[] {
      const conditions: string[] = []
      const bindings: Record<string, unknown> = {}

      if (query?.event) {
        conditions.push('event = @event')
        bindings.event = query.event
      }
      if (query?.userId) {
        conditions.push('userId = @userId')
        bindings.userId = query.userId
      }
      if (query?.since) {
        conditions.push('timestamp >= @since')
        bindings.since = query.since
      }
      if (query?.until) {
        conditions.push('timestamp <= @until')
        bindings.until = query.until
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limit = query?.limit ? `LIMIT ${Number(query.limit)}` : ''

      const rows = db
        .prepare(`SELECT id, event, userId, properties, timestamp FROM analytics_events ${where} ORDER BY timestamp DESC ${limit}`)
        .all(bindings) as Array<{ id: number; event: string; userId: string | null; properties: string; timestamp: string }>

      return rows.map((row) => ({
        id: row.id,
        event: row.event,
        userId: row.userId,
        properties: JSON.parse(row.properties) as Record<string, unknown>,
        timestamp: row.timestamp,
      }))
    },

    getCounts(query: CountQuery): CountResult[] {
      const fmt = groupByFormat(query.groupBy)
      const conditions: string[] = ['event = @event']
      const bindings: Record<string, unknown> = { event: query.event }

      if (query.since) {
        conditions.push('timestamp >= @since')
        bindings.since = query.since
      }
      if (query.until) {
        conditions.push('timestamp <= @until')
        bindings.until = query.until
      }

      const where = conditions.join(' AND ')

      const rows = db
        .prepare(
          `SELECT strftime('${fmt}', timestamp) AS period, COUNT(*) AS count
           FROM analytics_events
           WHERE ${where}
           GROUP BY period
           ORDER BY period ASC`
        )
        .all(bindings) as Array<{ period: string; count: number }>

      return rows
    },

    getUniques(query: UniqueQuery): UniqueResult[] {
      const fmt = groupByFormat(query.groupBy)
      const conditions: string[] = ['event = @event']
      const bindings: Record<string, unknown> = { event: query.event }

      if (query.since) {
        conditions.push('timestamp >= @since')
        bindings.since = query.since
      }
      if (query.until) {
        conditions.push('timestamp <= @until')
        bindings.until = query.until
      }

      const where = conditions.join(' AND ')

      const rows = db
        .prepare(
          `SELECT strftime('${fmt}', timestamp) AS period, COUNT(DISTINCT userId) AS count
           FROM analytics_events
           WHERE ${where}
           GROUP BY period
           ORDER BY period ASC`
        )
        .all(bindings) as Array<{ period: string; count: number }>

      return rows
    },

    getFunnel(query: FunnelQuery): FunnelResult[] {
      const conditions: string[] = []
      const bindings: Record<string, unknown> = {}

      if (query.since) {
        conditions.push('timestamp >= @since')
        bindings.since = query.since
      }
      if (query.until) {
        conditions.push('timestamp <= @until')
        bindings.until = query.until
      }

      const timeFilter = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

      return query.steps.map((step) => {
        const row = db
          .prepare(
            `SELECT COUNT(*) AS count FROM analytics_events WHERE event = @step ${timeFilter}`
          )
          .get({ ...bindings, step }) as { count: number }

        return { step, count: row.count }
      })
    },
  }
}
