import { describe, it, expect } from 'vitest'
import { scanProject } from '../src/engine/scanner.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('scanProject', () => {
  const testDir = join(tmpdir(), 'factory-test-scan')

  function setup(files: Record<string, string>) {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    for (const [path, content] of Object.entries(files)) {
      const full = join(testDir, path)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, content)
    }
  }

  it('detects a Node.js Fastify project', () => {
    setup({
      'package.json': JSON.stringify({
        dependencies: { fastify: '^5.0.0', 'better-sqlite3': '^11.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    })
    const result = scanProject(testDir)
    expect(result.framework).toBe('node-fastify')
    expect(result.dependencies).toContain('fastify')
    expect(result.infrastructure).toContain('sqlite')
  })

  it('detects shared package usage', () => {
    setup({
      'package.json': JSON.stringify({
        dependencies: { '@pauljump/api-kit': 'workspace:*', '@pauljump/etl-kit': 'workspace:*' },
      }),
    })
    const result = scanProject(testDir)
    expect(result.sharedPackages).toContain('@pauljump/api-kit')
    expect(result.sharedPackages).toContain('@pauljump/etl-kit')
  })

  it('detects Dockerfile', () => {
    setup({ 'package.json': '{}', 'Dockerfile': 'FROM node:22' })
    const result = scanProject(testDir)
    expect(result.hasDeployConfig).toBe(true)
    expect(result.infrastructure).toContain('docker')
  })

  it('detects iOS project', () => {
    setup({
      'project.yml': 'name: MyApp',
      'ios/MyApp/App.swift': 'import SwiftUI',
    })
    const result = scanProject(testDir)
    expect(result.framework).toBe('ios-swift')
  })

  it('detects CLAUDE.md', () => {
    setup({ 'package.json': '{}', 'CLAUDE.md': '# Project' })
    expect(scanProject(testDir).hasClaudeMd).toBe(true)
  })
})
