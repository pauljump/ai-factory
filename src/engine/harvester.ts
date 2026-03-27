import type { KnowledgeEntry } from './types.js'

const TODAY = new Date().toISOString().slice(0, 10)

/** Lowercase, replace non-alphanumeric runs with hyphens, trim hyphens, max 80 chars */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const RELEVANT_KEYWORDS = ['gotcha', 'architecture', 'critical', 'known issue', 'important', 'caveat', 'warning']

function isRelevantHeader(header: string): boolean {
  const lower = header.toLowerCase()
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw))
}

function isArchitectureSection(header: string): boolean {
  return header.toLowerCase().includes('architecture')
}

/**
 * Parse a project's CLAUDE.md and extract knowledge entries from relevant sections.
 */
export function harvestFromClaudeMd(projectName: string, content: string): KnowledgeEntry[] {
  const lines = content.split('\n')
  const entries: KnowledgeEntry[] = []

  let currentDomain: string | null = null
  let inArchitecture = false

  for (const line of lines) {
    // Check for a ## header (section boundary)
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headerMatch) {
      const headerText = headerMatch[1].trim()
      if (isRelevantHeader(headerText)) {
        currentDomain = slugify(headerText)
        inArchitecture = isArchitectureSection(headerText)
      } else {
        currentDomain = null
        inArchitecture = false
      }
      continue
    }

    if (currentDomain === null) continue

    // Extract bullet points
    const bulletMatch = line.match(/^-\s+(.+)$/)
    if (bulletMatch) {
      const text = bulletMatch[1].trim()
      if (text.length >= 20) {
        entries.push(makeEntry(text, currentDomain, projectName))
      }
      continue
    }

    // In architecture sections, also extract non-bullet prose lines > 40 chars
    if (inArchitecture) {
      const trimmed = line.trim()
      if (trimmed.length > 40 && !trimmed.startsWith('#')) {
        entries.push(makeEntry(trimmed, currentDomain, projectName))
      }
    }
  }

  return entries
}

function makeEntry(body: string, domain: string, projectName: string): KnowledgeEntry {
  return {
    id: slugify(`${projectName}-${body.slice(0, 40)}`),
    domain,
    tags: [projectName],
    confidence: 'medium',
    sourceProject: projectName,
    date: TODAY,
    lastVerified: TODAY,
    timesInjected: 0,
    timesUseful: 0,
    body,
  }
}

/**
 * Parse a DOMAIN_KNOWLEDGE.md file and extract curated knowledge entries.
 *
 * Format:
 *   ## Domain Header        -> sets domain (slugified)
 *   ### Subheader           -> sets tags for subsequent entries
 *   - Bullet text — **project**   -> creates an entry
 */
export function harvestFromDomainKnowledge(content: string): KnowledgeEntry[] {
  const lines = content.split('\n')
  const entries: KnowledgeEntry[] = []

  let currentDomain = ''
  let currentTags: string[] = []

  for (const line of lines) {
    // ## Domain header
    const domainMatch = line.match(/^##\s+(.+)$/)
    if (domainMatch) {
      currentDomain = slugify(domainMatch[1].trim())
      currentTags = []
      continue
    }

    // ### Subheader (tags)
    const subMatch = line.match(/^###\s+(.+)$/)
    if (subMatch) {
      currentTags = [slugify(subMatch[1].trim())]
      continue
    }

    // - Bullet text — **project**
    // em-dash variants: — (U+2014) or --
    const bulletMatch = line.match(/^-\s+(.+?)\s+[—\-]{1,2}\s+\*\*(.+?)\*\*\s*$/)
    if (bulletMatch) {
      const body = bulletMatch[1].trim()
      const sourceProject = bulletMatch[2].trim()

      entries.push({
        id: slugify(`${currentDomain}-${body.slice(0, 40)}`),
        domain: currentDomain,
        tags: [...currentTags],
        confidence: 'high',
        sourceProject,
        date: TODAY,
        lastVerified: TODAY,
        timesInjected: 0,
        timesUseful: 0,
        body,
      })
    }
  }

  return entries
}
