import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const BIN = join(import.meta.dirname, '..', 'bin', 'factory.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')
const workspaceDir = join(tmpdir(), 'factory-test-convert-ws')
const sourceDir = join(tmpdir(), 'factory-test-convert-src')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 60000,
    cwd: workspaceDir,
  }).trim()
}

describe('factory convert', () => {
  beforeEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true })
    rmSync(sourceDir, { recursive: true, force: true })

    // Create fake source monorepo
    mkdirSync(join(sourceDir, 'project-a'), { recursive: true })
    writeFileSync(join(sourceDir, 'project-a', 'package.json'), JSON.stringify({
      dependencies: { fastify: '^5', 'better-sqlite3': '^11' },
    }))
    writeFileSync(join(sourceDir, 'project-a', 'CLAUDE.md'), '# Project A\n\n## Gotchas\n- SQLite needs DELETE journal mode on Cloud Run\n')

    mkdirSync(join(sourceDir, 'project-b'), { recursive: true })
    writeFileSync(join(sourceDir, 'project-b', 'package.json'), JSON.stringify({
      dependencies: { next: '^16' },
    }))

    mkdirSync(join(sourceDir, 'packages', 'api-kit'), { recursive: true })
    writeFileSync(join(sourceDir, 'packages', 'api-kit', 'package.json'), JSON.stringify({
      name: '@test/api-kit',
    }))

    // Init workspace first
    execFileSync(TSX, [BIN, 'init', workspaceDir], {
      encoding: 'utf-8',
      timeout: 30000,
    })
  })

  it('copies projects into workspace', () => {
    run('convert', sourceDir)
    expect(existsSync(join(workspaceDir, 'projects', 'project-a', 'package.json'))).toBe(true)
    expect(existsSync(join(workspaceDir, 'projects', 'project-b', 'package.json'))).toBe(true)
  })

  it('copies packages into workspace', () => {
    run('convert', sourceDir)
    expect(existsSync(join(workspaceDir, 'packages', 'api-kit', 'package.json'))).toBe(true)
  })

  it('harvests knowledge from CLAUDE.md files', () => {
    run('convert', sourceDir)
    const knowledgeDir = join(workspaceDir, 'knowledge')
    expect(existsSync(knowledgeDir)).toBe(true)
  })

  it('updates factory.json with detected stack', () => {
    run('convert', sourceDir)
    const config = JSON.parse(readFileSync(join(workspaceDir, 'factory.json'), 'utf-8'))
    expect(config.stack.supported.length).toBeGreaterThan(0)
  })

  it('dry run does not copy files', () => {
    run('convert', sourceDir, '--dry-run')
    expect(existsSync(join(workspaceDir, 'projects', 'project-a'))).toBe(false)
  })
})
