import Database from 'better-sqlite3'
import { createSearchIndex } from './lib/search.js'
import { initAnalyticsTables } from './lib/analytics.js'

export function initFactoryDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      confidence TEXT NOT NULL DEFAULT 'medium',
      source_project TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      last_verified TEXT NOT NULL,
      times_injected INTEGER NOT NULL DEFAULT 0,
      times_useful INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  createSearchIndex(db, {
    table: 'knowledge_fts',
    sourceTable: 'knowledge_entries',
    columns: ['id', 'domain', 'tags', 'body'],
  })

  initAnalyticsTables(db)
}

export function openFactoryDb(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  initFactoryDb(db)
  return db
}
