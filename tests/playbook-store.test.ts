import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadPlaybooks, writePlaybook, matchPlaybooks } from '../src/engine/playbook-store.js'
import type { Playbook } from '../src/engine/types.js'

const testDir = join(tmpdir(), 'koba-test-playbooks')

beforeEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  mkdirSync(testDir, { recursive: true })
})

describe('playbook store', () => {
  it('writes and reads a playbook', () => {
    const playbook: Playbook = {
      id: 'deploy-cloud',
      name: 'Cloud Deploy',
      triggers: ['docker', 'cloud-run'],
      projectsUsing: ['app-a', 'app-b'],
      lastVerified: '2026-03-27',
      confidence: 'high',
      body: '## The recipe\n\n1. Build container\n2. Deploy',
    }

    writePlaybook(testDir, playbook)
    const loaded = loadPlaybooks(testDir)

    expect(loaded.length).toBe(1)
    expect(loaded[0]!.id).toBe('deploy-cloud')
    expect(loaded[0]!.name).toBe('Cloud Deploy')
    expect(loaded[0]!.triggers).toEqual(['docker', 'cloud-run'])
    expect(loaded[0]!.projectsUsing).toEqual(['app-a', 'app-b'])
    expect(loaded[0]!.confidence).toBe('high')
    expect(loaded[0]!.body).toContain('Build container')
  })

  it('matches playbooks by tags', () => {
    const playbooks: Playbook[] = [
      { id: 'deploy-ios', name: 'iOS Deploy', triggers: ['ios', 'swift'], projectsUsing: [], lastVerified: '', confidence: 'low', body: '' },
      { id: 'deploy-cloud', name: 'Cloud Deploy', triggers: ['docker', 'cloud-run'], projectsUsing: [], lastVerified: '', confidence: 'low', body: '' },
      { id: 'web-setup', name: 'Web Setup', triggers: ['nextjs', 'react'], projectsUsing: [], lastVerified: '', confidence: 'low', body: '' },
    ]

    expect(matchPlaybooks(playbooks, ['ios']).map(p => p.id)).toEqual(['deploy-ios'])
    expect(matchPlaybooks(playbooks, ['docker']).map(p => p.id)).toEqual(['deploy-cloud'])
    expect(matchPlaybooks(playbooks, ['nextjs', 'docker']).map(p => p.id)).toEqual(['deploy-cloud', 'web-setup'])
    expect(matchPlaybooks(playbooks, ['python'])).toEqual([])
  })

  it('skips template files starting with _', () => {
    writeFileSync(join(testDir, '_template.md'), '---\nname: Template\n---\nTemplate content')
    writeFileSync(join(testDir, 'real.md'), '---\nname: Real\n---\nReal content')

    const loaded = loadPlaybooks(testDir)
    expect(loaded.length).toBe(1)
    expect(loaded[0]!.name).toBe('Real')
  })

  it('returns empty for nonexistent directory', () => {
    expect(loadPlaybooks('/tmp/does-not-exist-koba')).toEqual([])
  })
})
