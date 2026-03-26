import type { Tracker } from '../lib/analytics.js'

export function logSessionEvent(
  tracker: Tracker,
  event: string,
  properties: Record<string, unknown>,
): void {
  tracker.track({
    event,
    userId: 'factory',
    properties: { ...properties, timestamp: new Date().toISOString() },
  })
}

export interface SessionMetrics {
  totalSessions: number
  totalKnowledgeInjected: number
  totalKnowledgeCaptured: number
  totalKnowledgeProposed: number
}

export function getSessionMetrics(tracker: Tracker): SessionMetrics {
  const starts = tracker.getEvents({ event: 'session_start' })
  const ends = tracker.getEvents({ event: 'session_end' })

  let totalInjected = 0
  for (const e of starts) {
    totalInjected += Number(e.properties?.['entriesInjected'] ?? 0)
  }

  let totalCaptured = 0
  let totalProposed = 0
  for (const e of ends) {
    totalCaptured += Number(e.properties?.['knowledgeCaptured'] ?? 0)
    totalProposed += Number(e.properties?.['knowledgeProposed'] ?? 0)
  }

  return {
    totalSessions: starts.length,
    totalKnowledgeInjected: totalInjected,
    totalKnowledgeCaptured: totalCaptured,
    totalKnowledgeProposed: totalProposed,
  }
}
