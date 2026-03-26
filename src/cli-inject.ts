import { openFactoryDb } from './db.js'
import { createKnowledgeStore } from './knowledge-store.js'
import { buildInjection, detectProjectContext } from './inject-knowledge.js'
import { createTracker } from './lib/analytics.js'
import { join } from 'node:path'

const cwd = process.argv[2] ?? process.cwd()
const factoryRoot = new URL('..', import.meta.url).pathname
const dbPath = join(factoryRoot, 'data', 'factory.db')

const db = openFactoryDb(dbPath)
const store = createKnowledgeStore(db)
const tracker = createTracker(db)
const context = detectProjectContext(cwd)
const injection = buildInjection(store, context)

// Log session start event
tracker.track({
  event: 'session_start',
  userId: 'factory',
  properties: {
    project: context.projectName,
    entriesInjected: injection.entries.length,
    tags: context.tags,
    timestamp: new Date().toISOString(),
  },
})

if (injection.formatted) {
  process.stdout.write(injection.formatted)
}

db.close()
