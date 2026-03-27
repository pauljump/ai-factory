import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Convention, DiscoveredProject } from './types.js'

/**
 * Extract conventions by finding repeated patterns across project CLAUDE.md files.
 * A convention is something that appears in 3+ projects (or 30%+ of projects).
 */
export function extractConventions(
  projects: DiscoveredProject[],
  threshold = 3,
): Convention[] {
  const patternCounts = new Map<string, { projects: string[]; source: string }>()

  for (const project of projects) {
    const claudePath = join(project.path, 'CLAUDE.md')
    if (!existsSync(claudePath)) continue

    const content = readFileSync(claudePath, 'utf-8')
    const patterns = detectPatterns(content)

    for (const pattern of patterns) {
      const key = pattern.normalized
      const existing = patternCounts.get(key)
      if (existing) {
        if (!existing.projects.includes(project.name)) {
          existing.projects.push(project.name)
        }
      } else {
        patternCounts.set(key, {
          projects: [project.name],
          source: pattern.source,
        })
      }
    }
  }

  // Filter to patterns that meet threshold
  const minCount = Math.max(threshold, Math.floor(projects.length * 0.15))
  const conventions: Convention[] = []

  for (const [pattern, data] of patternCounts) {
    if (data.projects.length >= Math.min(minCount, threshold)) {
      conventions.push({
        pattern,
        projectCount: data.projects.length,
        projects: data.projects,
        source: data.source,
      })
    }
  }

  // Sort by frequency
  conventions.sort((a, b) => b.projectCount - a.projectCount)
  return conventions
}

interface DetectedPattern {
  normalized: string
  source: string
}

function detectPatterns(content: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []
  const lower = content.toLowerCase()

  // Git workflow patterns
  if (lower.includes('commit to main') || lower.includes('no branches') || lower.includes('main only')) {
    patterns.push({ normalized: 'Git: commit to main, no branches', source: 'git workflow' })
  }
  if (lower.includes('feature branch')) {
    patterns.push({ normalized: 'Git: feature branches', source: 'git workflow' })
  }

  // Session patterns
  if (lower.includes('session handoff') || lower.includes('current state')) {
    patterns.push({ normalized: 'Session handoff with Current State updates', source: 'session management' })
  }
  if (lower.includes('scout first') || lower.includes('scout before') || lower.includes('investigate before')) {
    patterns.push({ normalized: 'Scout first, code never — investigate before building', source: 'collaboration' })
  }
  if (lower.includes('surface every decision') || lower.includes('no stealth')) {
    patterns.push({ normalized: 'Surface every decision — no stealth choices', source: 'collaboration' })
  }
  if (lower.includes('tight loops') || lower.includes('check in after')) {
    patterns.push({ normalized: 'Tight loops — check in after meaningful progress', source: 'collaboration' })
  }

  // Deploy patterns
  if (lower.includes('testflight')) {
    patterns.push({ normalized: 'iOS apps deploy to TestFlight', source: 'deployment' })
  }
  if (lower.includes('cloud run')) {
    patterns.push({ normalized: 'Backend deploys to Cloud Run', source: 'deployment' })
  }
  if (lower.includes('mac mini') || lower.includes('cloudflare tunnel') || lower.includes('local deploy')) {
    patterns.push({ normalized: 'Local deploy via Mac Mini + tunnel', source: 'deployment' })
  }

  // Architecture patterns
  if (lower.includes('sqlite') && lower.includes('wal')) {
    patterns.push({ normalized: 'SQLite with WAL mode', source: 'architecture' })
  }
  if (lower.includes('api-kit') || lower.includes('createapp')) {
    patterns.push({ normalized: 'Uses api-kit for backend services', source: 'architecture' })
  }
  if (lower.includes('xcodegen') || lower.includes('project.yml')) {
    patterns.push({ normalized: 'iOS projects use XcodeGen', source: 'architecture' })
  }

  // CLAUDE.md structure patterns
  if (content.includes('## Architecture') || content.includes('### Architecture')) {
    patterns.push({ normalized: 'CLAUDE.md has Architecture section', source: 'documentation' })
  }
  if (content.includes('## Current State')) {
    patterns.push({ normalized: 'CLAUDE.md has Current State section', source: 'documentation' })
  }
  if (content.includes('## Gotchas') || content.includes('## Critical Gotchas')) {
    patterns.push({ normalized: 'CLAUDE.md has Gotchas section', source: 'documentation' })
  }

  return patterns
}

/** Format conventions as markdown for inclusion in CLAUDE.md */
export function formatConventions(conventions: Convention[]): string {
  if (conventions.length === 0) return ''

  const lines = ['## Factory Conventions\n']
  lines.push('Detected across multiple projects:\n')

  const bySource = new Map<string, Convention[]>()
  for (const c of conventions) {
    const list = bySource.get(c.source) ?? []
    list.push(c)
    bySource.set(c.source, list)
  }

  for (const [source, convs] of bySource) {
    lines.push(`### ${source.charAt(0).toUpperCase() + source.slice(1)}`)
    for (const c of convs) {
      lines.push(`- **${c.pattern}** (${c.projectCount} projects)`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
