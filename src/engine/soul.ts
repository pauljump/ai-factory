import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_SOUL = `# Factory Soul

Read this first, every session. This defines how you work in this factory.

## Who You Are

You are an AI coding assistant working inside a factory workspace — a system designed to make every project faster than the last. You write code, surface decisions, and challenge assumptions.

## How We Work

1. **Scout first, code never.** Investigate and present findings before writing code. The thinking IS the work.
2. **Surface every decision.** If you pick between two approaches, say so. These aren't interruptions — they're the collaboration.
3. **Tight loops, not marathons.** Check in after meaningful progress. Five 2-minute check-ins beat one 30-minute code dump.
4. **Challenge assumptions.** "Are you sure? Here's why that might not work" is part of the job.

## Factory Awareness

- Check playbooks before solving a problem from scratch
- Check knowledge base for gotchas relevant to the current project
- After building anything, ask: "did we solve something reusable?"
- If a pattern appears in 2+ projects, it's a playbook candidate
`

/**
 * Seed the soul from a source repository's CLAUDE.md files.
 * Looks for collaboration patterns, roles, principles, and constraints.
 */
export function seedSoul(sourceRoot: string): string {
  const rootClaudeMd = join(sourceRoot, 'CLAUDE.md')
  const soulFile = join(sourceRoot, '.claude', 'soul.md')

  // If source has an explicit soul file, use it directly
  if (existsSync(soulFile)) {
    const content = readFileSync(soulFile, 'utf-8')
    return wrapAsSoul(content)
  }

  // Otherwise, extract from root CLAUDE.md
  if (!existsSync(rootClaudeMd)) return DEFAULT_SOUL

  const content = readFileSync(rootClaudeMd, 'utf-8')
  const extracted = extractCollaborationPatterns(content)

  if (extracted.principles.length === 0 && extracted.roles.length === 0) {
    return DEFAULT_SOUL
  }

  return buildSoul(extracted)
}

interface ExtractedPatterns {
  principles: string[]
  roles: string[]
  loop: string[]
  constraints: string[]
  rawSections: string[]
}

function extractCollaborationPatterns(content: string): ExtractedPatterns {
  const principles: string[] = []
  const roles: string[] = []
  const loop: string[] = []
  const constraints: string[] = []
  const rawSections: string[] = []

  const lines = content.split('\n')
  let currentSection = ''
  let inRelevantSection = false
  let sectionBuffer: string[] = []

  const relevantHeaders = [
    'how we build', 'how we work', 'principles', 'roles',
    'the loop', 'collaboration', 'what not to build',
    'design principles', 'who you\'re working with',
  ]

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headerMatch) {
      // Save previous section
      if (inRelevantSection && sectionBuffer.length > 0) {
        rawSections.push(sectionBuffer.join('\n'))
      }

      const header = headerMatch[1]!.toLowerCase().trim()
      inRelevantSection = relevantHeaders.some(h => header.includes(h))
      currentSection = header
      sectionBuffer = []
      continue
    }

    if (inRelevantSection) {
      sectionBuffer.push(line)

      // Extract numbered items as principles/loop steps
      const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—-]*\s*(.*)$/)
      if (numberedMatch) {
        const item = `${numberedMatch[1]!.trim()}${numberedMatch[2] ? ' — ' + numberedMatch[2].trim() : ''}`
        if (currentSection.includes('loop')) {
          loop.push(item)
        } else if (currentSection.includes('principle') || currentSection.includes('how we build') || currentSection.includes('how we work')) {
          principles.push(item)
        }
      }

      // Extract role descriptions
      const roleMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/)
      if (roleMatch && (currentSection.includes('role') || currentSection.includes('who'))) {
        const roleName = roleMatch[1]!.trim().replace(/:$/, '')
        const roleDesc = roleMatch[2]?.trim() ?? ''
        roles.push(roleDesc ? `${roleName}: ${roleDesc}` : roleName)
      }

      // Extract constraints
      if (currentSection.includes('not to build') || currentSection.includes('constraint')) {
        const bulletMatch = line.match(/^-\s+(.+)$/)
        if (bulletMatch) {
          constraints.push(bulletMatch[1]!.trim())
        }
      }
    }
  }

  // Save last section
  if (inRelevantSection && sectionBuffer.length > 0) {
    rawSections.push(sectionBuffer.join('\n'))
  }

  return { principles, roles, loop, constraints, rawSections }
}

function buildSoul(patterns: ExtractedPatterns): string {
  const sections: string[] = ['# Factory Soul\n\nRead this first, every session. This defines how you work in this factory.\n']

  if (patterns.roles.length > 0) {
    sections.push('## Roles\n')
    for (const role of patterns.roles) {
      sections.push(`- ${role}`)
    }
    sections.push('')
  }

  if (patterns.loop.length > 0) {
    sections.push('## The Loop\n')
    for (let i = 0; i < patterns.loop.length; i++) {
      sections.push(`${i + 1}. ${patterns.loop[i]}`)
    }
    sections.push('')
  }

  if (patterns.principles.length > 0) {
    sections.push('## Principles\n')
    for (let i = 0; i < patterns.principles.length; i++) {
      sections.push(`${i + 1}. ${patterns.principles[i]}`)
    }
    sections.push('')
  }

  if (patterns.constraints.length > 0) {
    sections.push('## Constraints\n')
    for (const c of patterns.constraints) {
      sections.push(`- ${c}`)
    }
    sections.push('')
  }

  sections.push(`## Factory Awareness

- Check playbooks before solving a problem from scratch
- Check knowledge base for gotchas relevant to the current project
- After building anything, ask: "did we solve something reusable?"
- If a pattern appears in 2+ projects, it's a playbook candidate
`)

  return sections.join('\n')
}

function wrapAsSoul(existingSoul: string): string {
  // If it already has the factory awareness section, return as-is
  if (existingSoul.includes('Factory Awareness') || existingSoul.includes('playbook')) {
    return existingSoul
  }

  // Append factory awareness
  return existingSoul.trimEnd() + `

## Factory Awareness

- Check playbooks before solving a problem from scratch
- Check knowledge base for gotchas relevant to the current project
- After building anything, ask: "did we solve something reusable?"
- If a pattern appears in 2+ projects, it's a playbook candidate
`
}

/** Write the soul file to the workspace */
export function writeSoul(soulPath: string, content: string): void {
  writeFileSync(soulPath, content)
}

/** Read the soul file */
export function readSoul(soulPath: string): string | null {
  if (!existsSync(soulPath)) return null
  return readFileSync(soulPath, 'utf-8')
}
