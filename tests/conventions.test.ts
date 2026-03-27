import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { extractConventions, formatConventions } from '../src/engine/conventions.js'
import type { DiscoveredProject } from '../src/engine/types.js'

const testDir = join(tmpdir(), 'koba-test-conventions')

function makeProject(name: string, claudeContent?: string): DiscoveredProject {
  const dir = join(testDir, name)
  mkdirSync(dir, { recursive: true })
  if (claudeContent) {
    writeFileSync(join(dir, 'CLAUDE.md'), claudeContent)
  }
  return {
    name,
    path: dir,
    framework: 'node-typescript',
    hasClaudeMd: !!claudeContent,
    hasDeployConfig: false,
    activity: 'active',
    lastCommitDate: null,
    commitCount: 0,
    estimatedSessions: 0,
    dependencies: [],
    sharedPackages: [],
  }
}

beforeEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  mkdirSync(testDir, { recursive: true })
})

describe('extractConventions', () => {
  it('detects git workflow convention', () => {
    const projects = [
      makeProject('a', '# A\n\nCommit to main, no branches.\n'),
      makeProject('b', '# B\n\nCommit to main only.\n'),
      makeProject('c', '# C\n\nNo branches, commit to main.\n'),
    ]

    const conventions = extractConventions(projects, 3)
    const gitConvention = conventions.find(c => c.pattern.includes('main'))
    expect(gitConvention).toBeDefined()
    expect(gitConvention!.projectCount).toBe(3)
  })

  it('detects CLAUDE.md structure conventions', () => {
    const claude = '# App\n\n## Architecture\n\nFastify + SQLite\n\n## Current State\n\nBuilding\n\n## Gotchas\n- Something\n'
    const projects = [
      makeProject('a', claude),
      makeProject('b', claude),
      makeProject('c', claude),
    ]

    const conventions = extractConventions(projects, 3)
    expect(conventions.some(c => c.pattern.includes('Architecture'))).toBe(true)
    expect(conventions.some(c => c.pattern.includes('Current State'))).toBe(true)
    expect(conventions.some(c => c.pattern.includes('Gotchas'))).toBe(true)
  })

  it('ignores patterns below threshold', () => {
    const projects = [
      makeProject('a', '# A\n\nCommit to main.\n'),
      makeProject('b', '# B\n\nUse feature branches.\n'),
      makeProject('c', '# C\n\nNo git workflow mentioned.\n'),
    ]

    const conventions = extractConventions(projects, 3)
    // Only 1 project mentions "commit to main" — below threshold
    const gitConvention = conventions.find(c => c.pattern.includes('commit to main'))
    expect(gitConvention).toBeUndefined()
  })

  it('formats conventions as markdown', () => {
    const conventions = [
      { pattern: 'Git: commit to main', projectCount: 10, projects: [], source: 'git workflow' },
      { pattern: 'SQLite with WAL mode', projectCount: 5, projects: [], source: 'architecture' },
    ]

    const md = formatConventions(conventions)
    expect(md).toContain('## Factory Conventions')
    expect(md).toContain('Git: commit to main')
    expect(md).toContain('10 projects')
  })
})
