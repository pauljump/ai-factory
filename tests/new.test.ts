import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BIN = join(import.meta.dirname, '..', 'bin', 'factory.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')
const testDir = join(tmpdir(), 'factory-test-new')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: testDir,
  }).trim()
}

describe('factory new', () => {
  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    // Init workspace first
    execFileSync(TSX, [BIN, 'init', testDir], { encoding: 'utf-8', timeout: 30000 })
  })

  it('creates a web project', () => {
    run('new', 'my-web-app', '-t', 'web')

    expect(existsSync(join(testDir, 'projects', 'my-web-app', 'package.json'))).toBe(true)
    expect(existsSync(join(testDir, 'projects', 'my-web-app', 'CLAUDE.md'))).toBe(true)
    expect(existsSync(join(testDir, 'projects', 'my-web-app', 'src'))).toBe(true)

    const pkg = JSON.parse(readFileSync(join(testDir, 'projects', 'my-web-app', 'package.json'), 'utf-8'))
    expect(pkg.dependencies.next).toBeDefined()
  })

  it('creates an API project', () => {
    run('new', 'my-api', '-t', 'api')

    const pkg = JSON.parse(readFileSync(join(testDir, 'projects', 'my-api', 'package.json'), 'utf-8'))
    expect(pkg.dependencies.fastify).toBeDefined()
    expect(pkg.dependencies['better-sqlite3']).toBeDefined()
  })

  it('creates an iOS project', () => {
    run('new', 'my-ios-app', '-t', 'ios')

    expect(existsSync(join(testDir, 'projects', 'my-ios-app', 'project.yml'))).toBe(true)
    expect(existsSync(join(testDir, 'projects', 'my-ios-app', 'ios'))).toBe(true)
    // Should NOT have package.json
    expect(existsSync(join(testDir, 'projects', 'my-ios-app', 'package.json'))).toBe(false)
  })

  it('creates CLAUDE.md with project info', () => {
    run('new', 'test-project', '-t', 'api')

    const content = readFileSync(join(testDir, 'projects', 'test-project', 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('test-project')
    expect(content).toContain('Current State')
    expect(content).toContain('Gotchas')
  })

  it('refuses to create duplicate project', () => {
    run('new', 'duplicate', '-t', 'other')
    try {
      run('new', 'duplicate', '-t', 'other')
      expect.unreachable('should have thrown')
    } catch (e: unknown) {
      const err = e as { status: number }
      expect(err.status).not.toBe(0)
    }
  })
})
