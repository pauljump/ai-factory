import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { Playbook } from './types.js'

/** Read all playbooks from the playbooks/ directory */
export function loadPlaybooks(playbooksDir: string): Playbook[] {
  if (!existsSync(playbooksDir)) return []

  const files = readdirSync(playbooksDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
  return files.map(f => readPlaybook(join(playbooksDir, f))).filter((p): p is Playbook => p !== null)
}

/** Read a single playbook file */
export function readPlaybook(filePath: string): Playbook | null {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)
    return {
      id: basename(filePath, '.md'),
      name: String(data['name'] ?? basename(filePath, '.md')),
      triggers: (data['triggers'] as string[]) ?? [],
      projectsUsing: (data['projects_using'] as string[]) ?? [],
      lastVerified: String(data['last_verified'] ?? ''),
      confidence: (data['confidence'] as Playbook['confidence']) ?? 'low',
      body: content.trim(),
    }
  } catch {
    return null
  }
}

/** Write a playbook to disk */
export function writePlaybook(playbooksDir: string, playbook: Playbook): void {
  mkdirSync(playbooksDir, { recursive: true })
  const frontmatter = {
    name: playbook.name,
    triggers: playbook.triggers,
    projects_using: playbook.projectsUsing,
    last_verified: playbook.lastVerified,
    confidence: playbook.confidence,
  }
  const content = matter.stringify(playbook.body, frontmatter)
  writeFileSync(join(playbooksDir, `${playbook.id}.md`), content)
}

/** Find playbooks relevant to a project based on its tags/framework */
export function matchPlaybooks(playbooks: Playbook[], tags: string[]): Playbook[] {
  if (tags.length === 0) return []
  const tagSet = new Set(tags.map(t => t.toLowerCase()))
  return playbooks.filter(p =>
    p.triggers.some(t => tagSet.has(t.toLowerCase())),
  )
}

/** Add a project to a playbook's projects_using list if not already there */
export function addProjectToPlaybook(playbook: Playbook, projectName: string): boolean {
  if (playbook.projectsUsing.includes(projectName)) return false
  playbook.projectsUsing.push(projectName)
  return true
}
