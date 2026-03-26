import { describe, it, expect } from 'vitest'
import { findWorkspaceRoot, getWorkspacePaths } from '../src/workspace.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('findWorkspaceRoot', () => {
  const testDir = join(tmpdir(), 'koba-test-workspace')

  function setup() {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(join(testDir, 'projects', 'my-app'), { recursive: true })
    writeFileSync(join(testDir, 'koba.json'), JSON.stringify({ name: 'test-factory' }))
  }

  it('finds workspace root from project subdirectory', () => {
    setup()
    const root = findWorkspaceRoot(join(testDir, 'projects', 'my-app'))
    expect(root).toBe(testDir)
  })

  it('finds workspace root from root itself', () => {
    setup()
    const root = findWorkspaceRoot(testDir)
    expect(root).toBe(testDir)
  })

  it('returns null when no workspace found', () => {
    const root = findWorkspaceRoot('/tmp')
    expect(root).toBeNull()
  })
})

describe('getWorkspacePaths', () => {
  it('returns all standard paths from root', () => {
    const paths = getWorkspacePaths('/fake/root')
    expect(paths.root).toBe('/fake/root')
    expect(paths.projects).toBe('/fake/root/projects')
    expect(paths.packages).toBe('/fake/root/packages')
    expect(paths.knowledge).toBe('/fake/root/knowledge')
    expect(paths.data).toBe('/fake/root/data')
    expect(paths.scorecards).toBe('/fake/root/scorecards')
    expect(paths.config).toBe('/fake/root/koba.json')
    expect(paths.db).toBe('/fake/root/data/factory.db')
  })
})
