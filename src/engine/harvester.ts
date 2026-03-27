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

/** Minimum body length to be considered real knowledge (not a label) */
const MIN_BODY_LENGTH = 30

/** Patterns that indicate a line is just a label, not real knowledge */
const LABEL_PATTERNS = [
  /^[A-Z][a-z]+,\s+[a-z]+$/,                   // "TypeScript, minimal dependencies"
  /^[`@][\w/-]+[`]?\s*$/,                        // just a package name
  /^\w+\s*→\s*`?\w+\(\)`?$/,                    // "api-kit → createApp()"
  /^[A-Z][a-z]+-powered\s/,                      // "LLM-powered analysis"
]

/** Richer domain taxonomy based on content analysis */
const DOMAIN_MAP: [RegExp, string][] = [
  [/docker|container|image|build stage/i, 'infrastructure'],
  [/cloud run|gcloud|gcs|cloud build|deploy/i, 'infrastructure'],
  [/sqlite|database|postgres|migration|schema/i, 'data'],
  [/api|endpoint|route|cors|helmet|fastify|express/i, 'api'],
  [/scrape|crawl|puppeteer|cheerio|rate limit|fetch/i, 'data'],
  [/ios|swift|xcode|testflight|storekit|watchos/i, 'platform-ios'],
  [/next\.?js|react|tailwind|css|component/i, 'platform-web'],
  [/auth|jwt|token|session|cookie|oauth/i, 'security'],
  [/stripe|payment|billing|subscription|storekit/i, 'payments'],
  [/llm|gpt|claude|anthropic|openai|ai|model/i, 'ai'],
  [/test|vitest|jest|mock|assert/i, 'testing'],
  [/cron|schedule|queue|job|background/i, 'infrastructure'],
]

function classifyDomain(body: string, sectionHeader: string): string {
  // Try content-based classification first
  for (const [pattern, domain] of DOMAIN_MAP) {
    if (pattern.test(body)) return domain
  }

  // Fall back to section header
  const lower = sectionHeader.toLowerCase()
  if (lower.includes('gotcha') || lower.includes('caveat') || lower.includes('warning')) return 'gotchas'
  if (lower.includes('architecture')) return 'architecture'
  if (lower.includes('deploy')) return 'infrastructure'
  if (lower.includes('critical')) return 'gotchas'

  return 'general'
}

/** Returns true if the entry is likely just a label and not real knowledge */
function isLowQuality(body: string): boolean {
  if (body.length < MIN_BODY_LENGTH) return true
  if (LABEL_PATTERNS.some(p => p.test(body))) return true
  // Lines that are just API references like "createApp(), getDb(), parseEnv()"
  if (/^[`]?[\w.]+\(\)[`]?,?\s*[`]?[\w.]+\(\)[`]?/.test(body)) return true
  return false
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
 * Applies quality gate: minimum length, no labels, richer domain classification.
 */
export function harvestFromClaudeMd(projectName: string, content: string): KnowledgeEntry[] {
  const lines = content.split('\n')
  const entries: KnowledgeEntry[] = []

  let currentHeader: string | null = null
  let inRelevantSection = false
  let inArchitecture = false

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headerMatch) {
      const headerText = headerMatch[1]!.trim()
      if (isRelevantHeader(headerText)) {
        currentHeader = headerText
        inRelevantSection = true
        inArchitecture = isArchitectureSection(headerText)
      } else {
        currentHeader = null
        inRelevantSection = false
        inArchitecture = false
      }
      continue
    }

    if (!inRelevantSection || !currentHeader) continue

    // Extract bullet points
    const bulletMatch = line.match(/^-\s+(.+)$/)
    if (bulletMatch) {
      const text = bulletMatch[1]!.trim()
      if (!isLowQuality(text)) {
        const domain = classifyDomain(text, currentHeader)
        entries.push(makeEntry(text, domain, projectName))
      }
      continue
    }

    // In architecture sections, also extract non-bullet prose lines > 50 chars
    if (inArchitecture) {
      const trimmed = line.trim()
      if (trimmed.length > 50 && !trimmed.startsWith('#') && !isLowQuality(trimmed)) {
        const domain = classifyDomain(trimmed, currentHeader)
        entries.push(makeEntry(trimmed, domain, projectName))
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
 */
export function harvestFromDomainKnowledge(content: string): KnowledgeEntry[] {
  const lines = content.split('\n')
  const entries: KnowledgeEntry[] = []

  let currentDomain = ''
  let currentTags: string[] = []

  for (const line of lines) {
    const domainMatch = line.match(/^##\s+(.+)$/)
    if (domainMatch) {
      currentDomain = slugify(domainMatch[1]!.trim())
      currentTags = []
      continue
    }

    const subMatch = line.match(/^###\s+(.+)$/)
    if (subMatch) {
      currentTags = [slugify(subMatch[1]!.trim())]
      continue
    }

    const bulletMatch = line.match(/^-\s+(.+?)\s+[—\-]{1,2}\s+\*\*(.+?)\*\*\s*$/)
    if (bulletMatch) {
      const body = bulletMatch[1]!.trim()
      const sourceProject = bulletMatch[2]!.trim()

      if (!isLowQuality(body)) {
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
  }

  return entries
}
