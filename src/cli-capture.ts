import { openFactoryDb } from './db.js'
import { createTracker } from './lib/analytics.js'
import { logSessionEvent } from './capture-session.js'
import { basename, join } from 'node:path'

const cwd = process.argv[2] ?? process.cwd()
const factoryRoot = new URL('..', import.meta.url).pathname
const dbPath = join(factoryRoot, 'data', 'factory.db')

const db = openFactoryDb(dbPath)
const tracker = createTracker(db)

logSessionEvent(tracker, 'session_end', {
  project: basename(cwd),
  cwd,
})

db.close()
