import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { KnowledgeEntry, Playbook } from './types.js'
import { loadPlaybooks, matchPlaybooks } from './playbook-store.js'
import { readSoul } from './soul.js'
import type { WorkspacePaths } from '../workspace.js'

export interface ProjectContext {
  projectName: string
  dependencies: string[]
  tags: string[]
}

interface InjectionResult {
  entries: KnowledgeEntry[]
  playbooks: Playbook[]
  hasSoul: boolean
  formatted: string
}

interface KnowledgeStoreReader {
  search(query: string, limit?: number): KnowledgeEntry[]
  searchByTags(tags: string[]): KnowledgeEntry[]
  list(): KnowledgeEntry[]
  recordInjection(id: string): void
}

const MAX_ENTRIES = 15
const MAX_PLAYBOOKS = 5

/**
 * Build the full injection payload for a session.
 * Priority order: soul -> playbooks -> knowledge entries
 */
export function buildInjection(
  store: KnowledgeStoreReader,
  context: ProjectContext,
  ws?: WorkspacePaths,
): InjectionResult {
  const seen = new Set<string>()
  const collected: KnowledgeEntry[] = []
  const matchedPlaybooks: Playbook[] = []
  let hasSoul = false

  function add(entries: KnowledgeEntry[]) {
    for (const entry of entries) {
      if (!seen.has(entry.id) && collected.length < MAX_ENTRIES) {
        seen.add(entry.id)
        collected.push(entry)
      }
    }
  }

  // Load soul if workspace is provided
  let soulContent: string | null = null
  if (ws) {
    soulContent = readSoul(ws.soul)
    if (soulContent) hasSoul = true

    // Load and match playbooks
    const allPlaybooks = loadPlaybooks(ws.playbooks)
    const matched = matchPlaybooks(allPlaybooks, context.tags)
    matchedPlaybooks.push(...matched.slice(0, MAX_PLAYBOOKS))
  }

  // Priority 1: entries from the same source project
  const allEntries = store.list()
  add(allEntries.filter(e => e.sourceProject === context.projectName))

  // Priority 2: entries matching context tags
  if (context.tags.length > 0) {
    add(store.searchByTags(context.tags))
    for (const tag of context.tags) {
      add(store.search(tag, 10))
    }
  }

  // Priority 3: full-text search on project name + deps
  const terms = [context.projectName, ...context.dependencies.slice(0, 5)].join(' ')
  if (terms.trim()) {
    add(store.search(terms, 10))
  }

  // Record injections
  for (const entry of collected) {
    store.recordInjection(entry.id)
  }

  return {
    entries: collected,
    playbooks: matchedPlaybooks,
    hasSoul,
    formatted: formatInjection(soulContent, matchedPlaybooks, collected, context),
  }
}

function formatInjection(
  soul: string | null,
  playbooks: Playbook[],
  entries: KnowledgeEntry[],
  context: ProjectContext,
): string {
  const sections: string[] = []

  // Soul first — always
  if (soul) {
    sections.push(soul.trim())
    sections.push('')
    sections.push('---')
    sections.push('')
  }

  // Playbooks second
  if (playbooks.length > 0) {
    sections.push(`## Relevant Playbooks (${playbooks.length} for ${context.projectName})`)
    sections.push('')
    for (const p of playbooks) {
      sections.push(`### ${p.name}`)
      // Include just the gotchas and project-specific notes, not the full recipe
      const gotchasIdx = p.body.indexOf('## Gotchas')
      if (gotchasIdx !== -1) {
        const gotchas = p.body.slice(gotchasIdx)
        sections.push(gotchas.trim())
      }
      sections.push('')
    }
    sections.push('---')
    sections.push('')
  }

  // Knowledge entries third
  if (entries.length > 0) {
    sections.push(`## Factory Knowledge (${entries.length} entries for ${context.projectName})`)
    sections.push('')

    const byDomain = new Map<string, KnowledgeEntry[]>()
    for (const entry of entries) {
      const list = byDomain.get(entry.domain) ?? []
      list.push(entry)
      byDomain.set(entry.domain, list)
    }

    for (const [domain, domainEntries] of byDomain) {
      sections.push(`### ${domain}`)
      for (const entry of domainEntries) {
        const firstLine = entry.body.split('\n')[0] ?? ''
        sections.push(`- **${entry.id}** (${entry.confidence}, from ${entry.sourceProject}): ${firstLine}`)
      }
      sections.push('')
    }
  }

  return sections.join('\n')
}

export function detectProjectContext(cwd: string): ProjectContext {
  const projectName = basename(cwd)
  const dependencies: string[] = []
  const tags: string[] = []

  const pkgPath = join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
      const allDeps: Record<string, string> = {
        ...(pkg['dependencies'] as Record<string, string> | undefined),
        ...(pkg['devDependencies'] as Record<string, string> | undefined),
        ...(pkg['peerDependencies'] as Record<string, string> | undefined),
      }
      dependencies.push(...Object.keys(allDeps))

      if (allDeps['better-sqlite3']) tags.push('sqlite')
      if (allDeps['fastify']) tags.push('fastify', 'api')
      if (allDeps['next']) tags.push('nextjs', 'web')
      if (allDeps['express']) tags.push('express', 'api')
      if (allDeps['@pauljump/api-kit']) tags.push('api-kit', 'fastify', 'sqlite')
      if (allDeps['@pauljump/etl-kit']) tags.push('etl', 'scraping')
      if (allDeps['@pauljump/llm-kit']) tags.push('llm', 'ai')
      if (allDeps['@pauljump/search-kit']) tags.push('search', 'fts5')
      if (allDeps['@pauljump/voice-kit']) tags.push('voice', 'realtime')
      if (allDeps['@pauljump/payments-kit']) tags.push('stripe', 'payments')
      if (allDeps['@pauljump/socrata-kit']) tags.push('socrata', 'government-data')
      if (allDeps['puppeteer']) tags.push('scraping', 'puppeteer')
      if (allDeps['cheerio']) tags.push('scraping', 'cheerio')
    } catch { /* ignore */ }
  }

  if (existsSync(join(cwd, 'project.yml')) || existsSync(join(cwd, 'ios'))) {
    tags.push('ios', 'swift', 'xcodegen', 'ios-swift')
  }

  if (existsSync(join(cwd, 'Dockerfile'))) {
    tags.push('cloud-run', 'docker')
  }

  return { projectName, dependencies, tags }
}
