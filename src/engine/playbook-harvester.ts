import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Playbook, DiscoveredProject } from './types.js'
import { readPlaybook, addProjectToPlaybook } from './playbook-store.js'
import { getRelevantTemplates } from './playbook-templates.js'

interface HarvestResult {
  /** Playbooks activated from templates based on detected patterns */
  activated: Playbook[]
  /** Existing playbooks copied from source */
  copied: Playbook[]
  /** Gotchas routed into playbooks instead of flat knowledge */
  gotchasRouted: number
}

/**
 * Harvest playbooks during convert:
 * 1. Copy existing playbooks from source if they exist
 * 2. Activate relevant templates based on detected frameworks
 * 3. Route gotchas from CLAUDE.md files into the right playbooks
 */
export function harvestPlaybooks(
  sourceRoot: string,
  projects: DiscoveredProject[],
): HarvestResult {
  const copied: Playbook[] = []
  const activatedMap = new Map<string, Playbook>()
  let gotchasRouted = 0

  // Step 1: Copy existing playbooks from source
  const playbookDirs = [
    join(sourceRoot, '.claude', 'playbooks'),
    join(sourceRoot, 'playbooks'),
  ]

  for (const dir of playbookDirs) {
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const playbook = readPlaybook(join(dir, file))
      if (playbook) {
        playbook.confidence = 'high' // existing playbooks are battle-tested
        copied.push(playbook)
      }
    }
  }

  // Step 2: Collect all framework tags across projects
  const allTags = new Set<string>()
  for (const project of projects) {
    if (project.framework !== 'unknown') allTags.add(project.framework)
    if (project.hasDeployConfig) allTags.add('docker')
    // Infer tags from dependencies
    for (const dep of project.dependencies) {
      if (dep.includes('fastify')) allTags.add('fastify')
      if (dep.includes('next')) allTags.add('nextjs')
      if (dep.includes('express')) allTags.add('express')
      if (dep.includes('puppeteer') || dep.includes('cheerio')) allTags.add('scraping')
      if (dep.includes('etl-kit')) allTags.add('etl')
      if (dep.includes('socrata')) allTags.add('socrata')
      if (dep.includes('storekit') || dep.includes('StoreKit')) allTags.add('storekit')
    }
  }

  // Activate templates that match, unless a copied playbook already covers the same triggers
  const copiedTriggers = new Set(copied.flatMap(p => p.triggers))
  const templates = getRelevantTemplates([...allTags])
  for (const template of templates) {
    // Skip if an existing playbook already covers this
    if (template.triggers.some(t => copiedTriggers.has(t))) continue
    activatedMap.set(template.id, { ...template, projectsUsing: [] })
  }

  // Step 3: Route project tags into playbooks and populate projects_using
  for (const project of projects) {
    const projectTags = new Set<string>()
    if (project.framework !== 'unknown') projectTags.add(project.framework)
    if (project.hasDeployConfig) projectTags.add('docker')
    for (const dep of project.dependencies) {
      if (dep.includes('fastify')) projectTags.add('fastify')
      if (dep.includes('next')) projectTags.add('nextjs')
      if (dep.includes('express')) projectTags.add('express')
    }

    // Add project to matching activated templates
    for (const playbook of activatedMap.values()) {
      if (playbook.triggers.some(t => projectTags.has(t))) {
        addProjectToPlaybook(playbook, project.name)
      }
    }

    // Also update copied playbooks
    for (const playbook of copied) {
      if (playbook.triggers.some(t => projectTags.has(t))) {
        addProjectToPlaybook(playbook, project.name)
      }
    }
  }

  // Step 4: Route gotchas from CLAUDE.md files into playbooks
  for (const project of projects) {
    const claudePath = join(project.path, 'CLAUDE.md')
    if (!existsSync(claudePath)) continue

    const content = readFileSync(claudePath, 'utf-8')
    const gotchas = extractGotchas(content)

    for (const gotcha of gotchas) {
      const allPlaybooks = [...copied, ...activatedMap.values()]
      const target = findPlaybookForGotcha(gotcha, allPlaybooks, project)
      if (target) {
        appendGotcha(target, gotcha, project.name)
        gotchasRouted++
      }
    }
  }

  return {
    activated: [...activatedMap.values()],
    copied,
    gotchasRouted,
  }
}

/** Extract gotcha bullet points from a CLAUDE.md */
function extractGotchas(content: string): string[] {
  const gotchas: string[] = []
  const lines = content.split('\n')
  let inGotchaSection = false

  for (const line of lines) {
    if (line.match(/^#{1,3}\s+/)) {
      const header = line.toLowerCase()
      inGotchaSection = header.includes('gotcha') || header.includes('caveat')
        || header.includes('critical') || header.includes('known issue')
        || header.includes('warning')
    }

    if (inGotchaSection && line.startsWith('- ')) {
      const text = line.slice(2).trim()
      if (text.length >= 30) gotchas.push(text)
    }
  }

  return gotchas
}

/** Find the best playbook for a gotcha based on keyword matching */
function findPlaybookForGotcha(
  gotcha: string,
  playbooks: Playbook[],
  project: DiscoveredProject,
): Playbook | null {
  const lower = gotcha.toLowerCase()

  // Try to match by keywords in the gotcha text
  const keywordMap: Record<string, string[]> = {
    'docker': ['dockerfile', 'container', 'image', 'build stage', 'dockerignore'],
    'cloud-run': ['cloud run', 'gcloud', 'gcs fuse', 'cloud build'],
    'ios': ['xcode', 'testflight', 'archive', 'provisioning', 'signing', 'bundle id'],
    'swift': ['swift', 'swiftui', 'uikit', 'xcodeproj'],
    'storekit': ['storekit', 'in-app', 'purchase', 'sandbox', 'subscription'],
    'sqlite': ['sqlite', 'wal mode', 'journal mode', 'database', 'better-sqlite3'],
    'nextjs': ['next.js', 'nextjs', 'server component', 'app router'],
    'fastify': ['fastify', 'route', 'middleware', 'helmet'],
    'scraping': ['scrape', 'puppeteer', 'cheerio', 'rate limit', 'captcha'],
    'watchos': ['watchos', 'watch connectivity', 'complication', 'apple watch'],
  }

  for (const playbook of playbooks) {
    for (const trigger of playbook.triggers) {
      // Direct trigger match in gotcha text
      if (lower.includes(trigger)) return playbook

      // Keyword expansion
      const keywords = keywordMap[trigger]
      if (keywords?.some(kw => lower.includes(kw))) return playbook
    }
  }

  // Fallback: match by project framework
  for (const playbook of playbooks) {
    if (playbook.triggers.some(t => t === project.framework)) return playbook
  }

  return null
}

/** Append a gotcha to a playbook's Gotchas section */
function appendGotcha(playbook: Playbook, gotcha: string, projectName: string): void {
  const gotchaLine = `- ${gotcha} — *${projectName}*`

  // Replace the placeholder if it exists
  if (playbook.body.includes('[Populated from your projects during convert and ongoing use]')) {
    // Replace first occurrence in Gotchas section
    const parts = playbook.body.split('## Gotchas')
    if (parts.length >= 2) {
      const afterGotchas = parts[1]!
      const nextSection = afterGotchas.indexOf('\n## ')
      if (nextSection !== -1) {
        const gotchaSection = afterGotchas.slice(0, nextSection)
        const rest = afterGotchas.slice(nextSection)
        const cleaned = gotchaSection.replace('[Populated from your projects during convert and ongoing use]', '')
        playbook.body = parts[0] + '## Gotchas' + cleaned.trimEnd() + '\n' + gotchaLine + '\n' + rest
      } else {
        const cleaned = afterGotchas.replace('[Populated from your projects during convert and ongoing use]', '')
        playbook.body = parts[0] + '## Gotchas' + cleaned.trimEnd() + '\n' + gotchaLine
      }
    }
  } else {
    // Just append to the end of the Gotchas section
    const parts = playbook.body.split('## Gotchas')
    if (parts.length >= 2) {
      const afterGotchas = parts[1]!
      const nextSection = afterGotchas.indexOf('\n## ')
      if (nextSection !== -1) {
        const gotchaSection = afterGotchas.slice(0, nextSection)
        const rest = afterGotchas.slice(nextSection)
        playbook.body = parts[0] + '## Gotchas' + gotchaSection.trimEnd() + '\n' + gotchaLine + '\n' + rest
      } else {
        playbook.body = parts[0] + '## Gotchas' + afterGotchas.trimEnd() + '\n' + gotchaLine
      }
    }
  }
}
