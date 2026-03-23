import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export interface DbOptions {
  /** Path to the SQLite database file. Defaults to './data.db' */
  path?: string
  /** SQL statements to run on first connection (create tables, indexes, etc.) */
  setup?: string
  /** Enable WAL mode for better concurrent read performance. Defaults to true. */
  wal?: boolean
}

let _db: Database.Database | null = null

/**
 * Open (or return existing) SQLite database connection.
 * Runs setup SQL on first call. Enables WAL mode by default.
 */
export function getDb(options: DbOptions = {}): Database.Database {
  if (_db) return _db

  const dbPath = options.path ?? './data.db'
  const dir = dirname(dbPath)
  if (dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true })

  _db = new Database(dbPath)

  if (options.wal !== false) {
    _db.pragma('journal_mode = WAL')
  }
  _db.pragma('foreign_keys = ON')

  if (options.setup) {
    _db.exec(options.setup)
  }

  return _db
}

/** Close the database connection. */
export function closeDb() {
  if (_db) {
    _db.close()
    _db = null
  }
}
