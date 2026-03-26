import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { KnowledgeEntry } from './types.js'

export interface ProjectContext {
  projectName: string
  dependencies: string[]
  tags: string[]
}

interface InjectionResult {
  entries: KnowledgeEntry[]
  formatted: string
}

interface KnowledgeStoreReader {
  search(query: string, limit?: number): KnowledgeEntry[]
  searchByTags(tags: string[]): KnowledgeEntry[]
  list(): KnowledgeEntry[]
  recordInjection(id: string): void
}

const MAX_ENTRIES = 15

export function buildInjection(
  store: KnowledgeStoreReader,
  context: ProjectContext,
): InjectionResult {
  const seen = new Set<string>()
  const collected: KnowledgeEntry[] = []

  function add(entries: KnowledgeEntry[]) {
    for (const entry of entries) {
      if (!seen.has(entry.id) && collected.length < MAX_ENTRIES) {
        seen.add(entry.id)
        collected.push(entry)
      }
    }
  }

  // Priority 1: entries from the same source project
  const allEntries = store.list()
  add(allEntries.filter(e => e.sourceProject === context.projectName))

  // Priority 2: entries matching context tags (by tag field) or domain
  if (context.tags.length > 0) {
    add(store.searchByTags(context.tags))
    // Also FTS-search each tag so domain matches are caught
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
    formatted: formatInjection(collected, context),
  }
}

function formatInjection(entries: KnowledgeEntry[], context: ProjectContext): string {
  if (entries.length === 0) return ''

  const lines: string[] = [
    `## Factory Knowledge (${entries.length} entries for ${context.projectName})`,
    '',
  ]

  const byDomain = new Map<string, KnowledgeEntry[]>()
  for (const entry of entries) {
    const list = byDomain.get(entry.domain) ?? []
    list.push(entry)
    byDomain.set(entry.domain, list)
  }

  for (const [domain, domainEntries] of byDomain) {
    lines.push(`### ${domain}`)
    for (const entry of domainEntries) {
      const firstLine = entry.body.split('\n')[0] ?? ''
      lines.push(`- **${entry.id}** (${entry.confidence}, from ${entry.sourceProject}): ${firstLine}`)
    }
    lines.push('')
  }

  return lines.join('\n')
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
      if (allDeps['@pauljump/api-kit']) tags.push('api-kit', 'fastify', 'sqlite')
      if (allDeps['@pauljump/etl-kit']) tags.push('etl', 'scraping')
      if (allDeps['@pauljump/llm-kit']) tags.push('llm', 'ai')
      if (allDeps['@pauljump/search-kit']) tags.push('search', 'fts5')
      if (allDeps['@pauljump/voice-kit']) tags.push('voice', 'realtime')
      if (allDeps['@pauljump/payments-kit']) tags.push('stripe', 'payments')
      if (allDeps['@pauljump/socrata-kit']) tags.push('socrata', 'government-data')
    } catch { /* ignore */ }
  }

  if (existsSync(join(cwd, 'project.yml')) || existsSync(join(cwd, 'ios'))) {
    tags.push('ios', 'swift', 'xcodegen')
  }

  if (existsSync(join(cwd, 'Dockerfile'))) {
    tags.push('cloud-run', 'docker')
  }

  return { projectName, dependencies, tags }
}
