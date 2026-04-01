import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { regenerateClaudeMd } from '../src/engine/claude-md-gen.js'
import type { WorkspacePaths } from '../src/workspace.js'
import type { ProjectScan, KnowledgeEntry } from '../src/engine/types.js'

const testDir = join(tmpdir(), 'factory-test-claudemd')

function makeWs(): WorkspacePaths {
  return {
    root: testDir,
    projects: join(testDir, 'projects'),
    packages: join(testDir, 'packages'),
    knowledge: join(testDir, 'knowledge'),
    data: join(testDir, 'data'),
    scorecards: join(testDir, 'scorecards'),
    config: join(testDir, 'factory.json'),
    db: join(testDir, 'data', 'factory.db'),
    claudeMd: join(testDir, 'CLAUDE.md'),
  }
}

describe('regenerateClaudeMd', () => {
  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(join(testDir, 'packages', 'api-kit'), { recursive: true })
    writeFileSync(join(testDir, 'factory.json'), JSON.stringify({
      stack: { supported: ['nextjs', 'fastify'] },
    }))
  })

  it('updates auto sections while preserving user sections', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), `# Test Factory

<!-- factory:user-start:how-we-work -->
## How We Work

My custom content here.

<!-- factory:user-end:how-we-work -->

<!-- factory:auto-start:stack -->
## Stack

Old stack content.

<!-- factory:auto-end:stack -->

<!-- factory:auto-start:active-projects -->
## Active Projects

Old projects.

<!-- factory:auto-end:active-projects -->

<!-- factory:auto-start:packages -->
## Shared Packages

Old packages.

<!-- factory:auto-end:packages -->

<!-- factory:auto-start:knowledge -->
## Knowledge Domains

Old knowledge.

<!-- factory:auto-end:knowledge -->
`)

    const scans: ProjectScan[] = [{
      name: 'test-app', path: '/fake', framework: 'nextjs',
      dependencies: [], sharedPackages: [], infrastructure: [],
      dataSources: [], hasClaudeMd: true, hasDeployConfig: false,
    }]

    const knowledge: KnowledgeEntry[] = [{
      id: 'k1', domain: 'web', tags: [], confidence: 'high',
      sourceProject: 'test', date: '2026-03-27', lastVerified: '2026-03-27',
      timesInjected: 0, timesUseful: 0, body: 'test',
    }]

    regenerateClaudeMd(makeWs(), scans, knowledge)

    const result = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8')

    // User section preserved
    expect(result).toContain('My custom content here.')

    // Auto sections updated
    expect(result).toContain('nextjs')
    expect(result).toContain('fastify')
    expect(result).toContain('test-app')
    expect(result).toContain('api-kit')
    expect(result).toContain('1 entries across 1 domains')

    // Old content gone
    expect(result).not.toContain('Old stack content.')
    expect(result).not.toContain('Old projects.')
  })
})
