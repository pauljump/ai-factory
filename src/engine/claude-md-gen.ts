import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WorkspacePaths } from '../workspace.js'
import type { ProjectScan, KnowledgeEntry, Playbook } from './types.js'
import { loadPlaybooks } from './playbook-store.js'
import { extractConventions, formatConventions } from './conventions.js'

/**
 * Regenerate the auto-generated sections of CLAUDE.md.
 * Preserves everything between factory:user-start and factory:user-end markers.
 */
export function regenerateClaudeMd(
  ws: WorkspacePaths,
  scans: ProjectScan[],
  knowledgeEntries: KnowledgeEntry[],
): void {
  if (!existsSync(ws.claudeMd)) return

  const content = readFileSync(ws.claudeMd, 'utf-8')
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))

  // Load playbooks
  const playbooks = loadPlaybooks(ws.playbooks)

  // Generate auto sections
  const stackSection = generateStackSection(config)
  const projectsSection = generateProjectsSection(scans)
  const packagesSection = generatePackagesSection(ws)
  const knowledgeSection = generateKnowledgeSection(knowledgeEntries)
  const playbooksSection = generatePlaybooksSection(playbooks)
  const conventionsSection = generateConventionsSection(ws, scans)
  const healthSection = generateHealthSection(ws, scans, playbooks, knowledgeEntries)

  // Replace auto sections, preserve user sections
  let updated = content
  updated = replaceAutoSection(updated, 'stack', stackSection)
  updated = replaceAutoSection(updated, 'active-projects', projectsSection)
  updated = replaceAutoSection(updated, 'packages', packagesSection)
  updated = replaceAutoSection(updated, 'knowledge', knowledgeSection)
  updated = replaceAutoSection(updated, 'playbooks', playbooksSection)
  updated = replaceAutoSection(updated, 'conventions', conventionsSection)
  updated = replaceAutoSection(updated, 'health', healthSection)

  writeFileSync(ws.claudeMd, updated)
}

function replaceAutoSection(content: string, name: string, newContent: string): string {
  const startMarker = `<!-- factory:auto-start:${name} -->`
  const endMarker = `<!-- factory:auto-end:${name} -->`

  const startIdx = content.indexOf(startMarker)
  const endIdx = content.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) return content

  const before = content.slice(0, startIdx + startMarker.length)
  const after = content.slice(endIdx)

  return before + '\n' + newContent + '\n' + after
}

function generateStackSection(config: Record<string, unknown>): string {
  const stack = config['stack'] as Record<string, unknown> | undefined
  if (!stack) return '## Stack\n\nNo stack configured.\n'

  const supported = (stack['supported'] as string[]) ?? []
  if (supported.length === 0) return '## Stack\n\nRun `factory convert` to detect your stack.\n'

  return '## Stack\n\n' + supported.map(s => `- ${s}`).join('\n') + '\n'
}

function generateProjectsSection(scans: ProjectScan[]): string {
  if (scans.length === 0) return '## Active Projects\n\nNo projects yet. Run `factory new <name>` to create one.\n'

  const lines = ['## Active Projects\n']
  lines.push('| Project | Framework | Packages | Deploy |')
  lines.push('|---------|-----------|----------|--------|')

  for (const scan of scans.slice(0, 50)) {
    const pkgs = scan.sharedPackages.length > 0 ? scan.sharedPackages.length.toString() : '-'
    const deploy = scan.hasDeployConfig ? 'yes' : '-'
    lines.push(`| ${scan.name} | ${scan.framework} | ${pkgs} | ${deploy} |`)
  }

  if (scans.length > 50) {
    lines.push(`\n*...and ${scans.length - 50} more projects*`)
  }

  return lines.join('\n') + '\n'
}

function generatePackagesSection(ws: WorkspacePaths): string {
  try {
    const entries = readdirSync(ws.packages, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)

    if (entries.length === 0) return '## Shared Packages\n\nNo shared packages yet.\n'

    return '## Shared Packages\n\n' + entries.map(e => `- ${e}`).join('\n') + '\n'
  } catch {
    return '## Shared Packages\n\nNo shared packages yet.\n'
  }
}

function generateKnowledgeSection(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '## Knowledge Domains\n\nNo knowledge entries yet. Build projects to grow the knowledge base.\n'

  const byDomain = new Map<string, number>()
  for (const entry of entries) {
    byDomain.set(entry.domain, (byDomain.get(entry.domain) ?? 0) + 1)
  }

  const sorted = [...byDomain.entries()].sort((a, b) => b[1] - a[1])
  const lines = [`## Knowledge Domains\n\n${entries.length} entries across ${byDomain.size} domains:\n`]

  for (const [domain, count] of sorted) {
    lines.push(`- **${domain}**: ${count} entries`)
  }

  return lines.join('\n') + '\n'
}

function generatePlaybooksSection(playbooks: Playbook[]): string {
  if (playbooks.length === 0) return '## Playbooks\n\nNo playbooks yet. They\'ll be created as you work.\n'

  const lines = ['## Playbooks\n']
  lines.push(`${playbooks.length} playbooks available:\n`)
  lines.push('| Playbook | Projects | Confidence | Triggers |')
  lines.push('|----------|----------|------------|----------|')

  for (const p of playbooks) {
    lines.push(`| ${p.name} | ${p.projectsUsing.length} | ${p.confidence} | ${p.triggers.slice(0, 3).join(', ')} |`)
  }

  return lines.join('\n') + '\n'
}

function generateConventionsSection(ws: WorkspacePaths, scans: ProjectScan[]): string {
  // Re-extract conventions from project CLAUDE.md files in the workspace
  const projects = scans.map(s => ({
    name: s.name,
    path: join(ws.projects, s.name),
    framework: s.framework,
    hasClaudeMd: s.hasClaudeMd,
    hasDeployConfig: s.hasDeployConfig,
    activity: 'active' as const,
    lastCommitDate: null,
    commitCount: 0,
    estimatedSessions: 0,
    dependencies: s.dependencies,
    sharedPackages: s.sharedPackages,
  }))

  const conventions = extractConventions(projects)
  if (conventions.length === 0) return '## Factory Conventions\n\nNo conventions detected yet.\n'

  return formatConventions(conventions)
}

function generateHealthSection(
  ws: WorkspacePaths,
  scans: ProjectScan[],
  playbooks: Playbook[],
  knowledge: KnowledgeEntry[],
): string {
  const lines = ['## Factory Health\n']

  // Projects without CLAUDE.md
  const noClaude = scans.filter(s => !s.hasClaudeMd)
  if (noClaude.length > 0) {
    lines.push(`**${noClaude.length} projects missing CLAUDE.md:** ${noClaude.map(s => s.name).join(', ')}`)
    lines.push('')
  }

  // Stale playbooks (> 90 days since last_verified)
  const now = Date.now()
  const stalePlaybooks = playbooks.filter(p => {
    if (!p.lastVerified) return true
    const verified = new Date(p.lastVerified).getTime()
    return (now - verified) / (1000 * 60 * 60 * 24) > 90
  })
  if (stalePlaybooks.length > 0) {
    lines.push(`**${stalePlaybooks.length} stale playbooks:** ${stalePlaybooks.map(p => p.name).join(', ')}`)
    lines.push('')
  }

  // Unused packages
  const usedPackages = new Set(scans.flatMap(s => s.sharedPackages))
  try {
    const allPackages = readdirSync(ws.packages, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
    const unused = allPackages.filter(p => !usedPackages.has(p) && !usedPackages.has(`@pauljump/${p}`))
    if (unused.length > 0) {
      lines.push(`**${unused.length} unused packages:** ${unused.join(', ')}`)
      lines.push('')
    }
  } catch { /* packages dir might not exist */ }

  // Template-only playbooks (no real project-specific content yet)
  const templateOnly = playbooks.filter(p => p.confidence === 'low' && p.projectsUsing.length === 0)
  if (templateOnly.length > 0) {
    lines.push(`**${templateOnly.length} playbooks need real-world validation:** ${templateOnly.map(p => p.name).join(', ')}`)
    lines.push('')
  }

  if (lines.length === 1) {
    lines.push('Everything looks good.')
    lines.push('')
  }

  return lines.join('\n')
}
