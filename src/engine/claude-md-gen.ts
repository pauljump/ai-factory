import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import type { WorkspacePaths } from '../workspace.js'
import type { ProjectScan, KnowledgeEntry } from './types.js'

/**
 * Regenerate the auto-generated sections of CLAUDE.md
 * Preserves everything between koba:user-start and koba:user-end markers.
 */
export function regenerateClaudeMd(
  ws: WorkspacePaths,
  scans: ProjectScan[],
  knowledgeEntries: KnowledgeEntry[],
): void {
  if (!existsSync(ws.claudeMd)) return

  const content = readFileSync(ws.claudeMd, 'utf-8')
  const config = JSON.parse(readFileSync(ws.config, 'utf-8'))

  // Generate auto sections
  const stackSection = generateStackSection(config)
  const projectsSection = generateProjectsSection(scans)
  const packagesSection = generatePackagesSection(ws)
  const knowledgeSection = generateKnowledgeSection(knowledgeEntries)

  // Replace auto sections, preserve user sections
  let updated = content
  updated = replaceAutoSection(updated, 'stack', stackSection)
  updated = replaceAutoSection(updated, 'active-projects', projectsSection)
  updated = replaceAutoSection(updated, 'packages', packagesSection)
  updated = replaceAutoSection(updated, 'knowledge', knowledgeSection)

  writeFileSync(ws.claudeMd, updated)
}

function replaceAutoSection(content: string, name: string, newContent: string): string {
  const startMarker = `<!-- koba:auto-start:${name} -->`
  const endMarker = `<!-- koba:auto-end:${name} -->`

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
  if (supported.length === 0) return '## Stack\n\nRun `koba convert` to detect your stack.\n'

  return '## Stack\n\n' + supported.map(s => `- ${s}`).join('\n') + '\n'
}

function generateProjectsSection(scans: ProjectScan[]): string {
  if (scans.length === 0) return '## Active Projects\n\nNo projects yet. Run `koba new <name>` to create one.\n'

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
