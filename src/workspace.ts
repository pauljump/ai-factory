import { existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

export interface WorkspacePaths {
  root: string
  projects: string
  packages: string
  knowledge: string
  playbooks: string
  research: string
  data: string
  scorecards: string
  config: string
  db: string
  claudeMd: string
  soul: string
}

export function findWorkspaceRoot(startDir: string): string | null {
  let dir = resolve(startDir)

  while (true) {
    if (existsSync(join(dir, 'factory.json'))) {
      return dir
    }

    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function getWorkspacePaths(root: string): WorkspacePaths {
  return {
    root,
    projects: join(root, 'projects'),
    packages: join(root, 'packages'),
    knowledge: join(root, 'knowledge'),
    playbooks: join(root, 'playbooks'),
    research: join(root, 'research'),
    data: join(root, 'data'),
    scorecards: join(root, 'scorecards'),
    config: join(root, 'factory.json'),
    db: join(root, 'data', 'factory.db'),
    claudeMd: join(root, 'CLAUDE.md'),
    soul: join(root, 'soul.md'),
  }
}

export function requireWorkspace(cwd?: string): WorkspacePaths {
  const root = findWorkspaceRoot(cwd ?? process.cwd())
  if (!root) {
    console.error('Error: not inside a factory workspace. Run `factory init` first.')
    process.exit(1)
  }
  return getWorkspacePaths(root)
}
