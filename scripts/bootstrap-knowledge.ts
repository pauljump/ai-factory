import fs from 'node:fs'
import path from 'node:path'
import type { KnowledgeEntry } from '../src/engine/types.js'
import { serializeEntry } from '../src/engine/write-entry.js'
import { openFactoryDb } from '../src/engine/db.js'
import { createKnowledgeStore } from '../src/engine/knowledge-store.js'

const DOMAIN_KNOWLEDGE_PATH = path.resolve(import.meta.dirname, '../DOMAIN_KNOWLEDGE.md')
const DB_PATH = path.resolve(import.meta.dirname, '../data/factory.db')
const KNOWLEDGE_DIR = path.resolve(import.meta.dirname, '../knowledge')

/** Domain header slug -> clean domain name */
const DOMAIN_MAP: Record<string, string> = {
  'api-providers': 'api-providers',
  'ios-apple-platforms': 'ios',
  'cloud-infrastructure': 'infrastructure',
  'data-sources-government-apis': 'data-sources',
  'data-sources-government': 'data-sources',
  'web-scraping-anti-bot': 'scraping',
  'ui-design': 'ui-ux',
  'ui-ux': 'ui-ux',
  'ai-llm-integration': 'llm',
  'llm-integration': 'llm',
  'security-bug-bounty': 'security',
  'security-auth': 'security',
  'scraping-data-collection': 'scraping',
  'business-model-pricing': 'pricing',
  'pricing-monetization': 'pricing',
  'legal-compliance': 'legal',
  'data-modeling-quality': 'data-modeling',
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function mapDomain(rawHeader: string): string {
  const slug = slugify(rawHeader)
  return DOMAIN_MAP[slug] ?? slug
}

/**
 * Parse DOMAIN_KNOWLEDGE.md content into KnowledgeEntry objects.
 * Exported for testing.
 */
export function parseDomainKnowledge(content: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  const today = new Date().toISOString().slice(0, 10)

  let currentDomain = ''
  let currentSubsection = ''

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()

    // ## Domain header
    if (line.startsWith('## ')) {
      currentDomain = mapDomain(line.slice(3).trim())
      currentSubsection = ''
      continue
    }

    // ### Subsection header
    if (line.startsWith('### ')) {
      currentSubsection = line.slice(4).trim()
      continue
    }

    // Bullet point entry: starts with "- " or "* "
    if (!line.match(/^[-*]\s+/) || !currentDomain) {
      continue
    }

    const bulletText = line.replace(/^[-*]\s+/, '').trim()

    // Extract **project** at the end: "some text — **project**"
    // The separator is an em-dash (—) or double hyphen (--)
    const projectMatch = bulletText.match(/\s+—\s+\*\*([^*]+)\*\*\s*$/)
    if (!projectMatch) {
      // No project attribution found — skip or include without project
      // Per spec, entries must have **project** — skip entries without it
      continue
    }

    const sourceProject = projectMatch[1].trim()
    const body = bulletText.slice(0, projectMatch.index).trim()

    if (!body) continue

    // Build ID: {domain}-{subsection}-{first 50 chars of body}
    const subsectionSlug = slugify(currentSubsection)
    const bodySlug = slugify(body).slice(0, 50)
    const id = slugify(`${currentDomain}-${subsectionSlug}-${bodySlug}`)

    const tags: string[] = []
    if (currentSubsection) {
      tags.push(slugify(currentSubsection))
    }

    const entry: KnowledgeEntry = {
      id,
      domain: currentDomain,
      tags,
      confidence: 'medium',
      sourceProject,
      date: today,
      lastVerified: today,
      timesInjected: 0,
      timesUseful: 0,
      body,
    }

    entries.push(entry)
  }

  return entries
}

// CLI entry point
if (process.argv[1]?.endsWith('bootstrap-knowledge.ts')) {
  console.log(`Reading ${DOMAIN_KNOWLEDGE_PATH}...`)
  const content = fs.readFileSync(DOMAIN_KNOWLEDGE_PATH, 'utf-8')

  const entries = parseDomainKnowledge(content)
  console.log(`Parsed ${entries.length} knowledge entries`)

  // Open DB
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = openFactoryDb(DB_PATH)
  const store = createKnowledgeStore(db)

  let written = 0
  let indexed = 0

  for (const entry of entries) {
    // Write markdown file
    const dir = path.join(KNOWLEDGE_DIR, entry.domain)
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, `${entry.id}.md`)
    fs.writeFileSync(filePath, serializeEntry(entry), 'utf-8')
    written++

    // Index into SQLite
    store.index(entry)
    indexed++
  }

  console.log(`Wrote ${written} files to ${KNOWLEDGE_DIR}/`)
  console.log(`Indexed ${indexed} entries into ${DB_PATH}`)
  db.close()
}
