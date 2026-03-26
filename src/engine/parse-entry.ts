import matter from 'gray-matter'
import type { KnowledgeEntry } from './types.js'

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low'])

export function parseEntry(id: string, raw: string): KnowledgeEntry {
  const { data, content } = matter(raw)

  const date: string = data.date ?? ''
  const lastVerified: string = data.last_verified ?? date

  const rawConfidence = data.confidence
  const confidence: KnowledgeEntry['confidence'] = VALID_CONFIDENCE.has(rawConfidence)
    ? rawConfidence
    : 'medium'

  return {
    id,
    domain: data.domain ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    confidence,
    sourceProject: data.source_project ?? '',
    date,
    lastVerified,
    timesInjected: typeof data.times_injected === 'number' ? data.times_injected : 0,
    timesUseful: typeof data.times_useful === 'number' ? data.times_useful : 0,
    body: content.trim(),
  }
}
