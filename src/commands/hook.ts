import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { buildInjection, detectProjectContext } from '../engine/inject-knowledge.js'
import { createTracker } from '../lib/analytics.js'
import { logSessionEvent } from '../engine/capture-session.js'
import { basename } from 'node:path'

export async function hookCommand(event: string, cwd?: string): Promise<void> {
  const dir = cwd ?? process.cwd()
  const ws = requireWorkspace(dir)
  const db = openFactoryDb(ws.db)

  try {
    if (event === 'session-start') {
      const store = createKnowledgeStore(db)
      const tracker = createTracker(db)
      const context = detectProjectContext(dir)
      const injection = buildInjection(store, context)

      logSessionEvent(tracker, 'session_start', {
        project: context.projectName,
        entriesInjected: injection.entries.length,
        tags: context.tags,
      })

      if (injection.formatted) {
        process.stdout.write(injection.formatted)
      }
    } else if (event === 'stop') {
      const tracker = createTracker(db)
      logSessionEvent(tracker, 'session_end', {
        project: basename(dir),
        cwd: dir,
      })
    } else {
      console.error(`Unknown hook event: ${event}`)
      process.exit(1)
    }
  } finally {
    db.close()
  }
}
