import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BIN = join(import.meta.dirname, '..', 'bin', 'koba.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')
const testDir = join(tmpdir(), 'koba-test-init')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: tmpdir(),
  }).trim()
}

describe('koba init', () => {
  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('creates all required directories and files', () => {
    run('init', testDir)

    expect(existsSync(join(testDir, 'koba.json'))).toBe(true)
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true)
    expect(existsSync(join(testDir, 'projects'))).toBe(true)
    expect(existsSync(join(testDir, 'packages'))).toBe(true)
    expect(existsSync(join(testDir, 'knowledge'))).toBe(true)
    expect(existsSync(join(testDir, 'data'))).toBe(true)
    expect(existsSync(join(testDir, 'scorecards'))).toBe(true)
    expect(existsSync(join(testDir, 'package.json'))).toBe(true)
    expect(existsSync(join(testDir, 'pnpm-workspace.yaml'))).toBe(true)
    expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(true)
    expect(existsSync(join(testDir, '.gitignore'))).toBe(true)
  })

  it('creates valid koba.json', () => {
    run('init', testDir)
    const config = JSON.parse(readFileSync(join(testDir, 'koba.json'), 'utf-8'))
    expect(config.name).toBe('koba-test-init')
    expect(config.version).toBe('1.0.0')
    expect(config.stack).toBeDefined()
    expect(config.scan).toBeDefined()
  })

  it('creates CLAUDE.md with factory markers', () => {
    run('init', testDir)
    const content = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('Koba Factory')
    expect(content).toContain('koba:user-start')
    expect(content).toContain('koba:auto-start')
  })

  it('wires hooks in .claude/settings.json', () => {
    run('init', testDir)
    const settings = JSON.parse(readFileSync(join(testDir, '.claude', 'settings.json'), 'utf-8'))
    expect(settings.hooks.SessionStart).toBeDefined()
    expect(settings.hooks.Stop).toBeDefined()
  })

  it('refuses to init in existing workspace', () => {
    run('init', testDir)
    try {
      run('init', testDir)
      expect.unreachable('should have thrown')
    } catch (e: unknown) {
      const err = e as { status: number }
      expect(err.status).not.toBe(0)
    }
  })
})
