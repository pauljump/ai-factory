import matter from 'gray-matter'
import type { KnowledgeEntry } from './types.js'

export function serializeEntry(entry: KnowledgeEntry): string {
  const frontmatter = {
    domain: entry.domain,
    tags: entry.tags,
    confidence: entry.confidence,
    source_project: entry.sourceProject,
    date: entry.date,
    last_verified: entry.lastVerified,
    times_injected: entry.timesInjected,
    times_useful: entry.timesUseful,
  }

  return matter.stringify(entry.body, frontmatter)
}
