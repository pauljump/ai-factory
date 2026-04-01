import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { discoverSource } from '../src/engine/discover.js'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('discoverSource', () => {
  const testDir = join(tmpdir(), 'factory-discover-test')

  function setup(files: Record<string, string>) {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    for (const [filePath, content] of Object.entries(files)) {
      const full = join(testDir, filePath)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, content)
    }
  }

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('finds projects in top-level directories', () => {
    setup({
      'my-api/package.json': JSON.stringify({ dependencies: { fastify: '^5.0.0' } }),
      'my-web/package.json': JSON.stringify({ dependencies: { next: '^14.0.0' } }),
    })

    const result = discoverSource(testDir)

    expect(result.sourceRoot).toBe(testDir)
    expect(result.projects.map((p) => p.name)).toContain('my-api')
    expect(result.projects.map((p) => p.name)).toContain('my-web')
    expect(result.projects.find((p) => p.name === 'my-api')?.framework).toBe('node-fastify')
    expect(result.projects.find((p) => p.name === 'my-web')?.framework).toBe('nextjs')
  })

  it('finds packages in packages/ directory with consumer counting', () => {
    setup({
      'packages/api-kit/package.json': JSON.stringify({ name: '@pauljump/api-kit' }),
      'packages/etl-kit/package.json': JSON.stringify({ name: '@pauljump/etl-kit' }),
      'my-api/package.json': JSON.stringify({
        dependencies: { '@pauljump/api-kit': 'workspace:*' },
      }),
      'my-worker/package.json': JSON.stringify({
        dependencies: {
          '@pauljump/api-kit': 'workspace:*',
          '@pauljump/etl-kit': 'workspace:*',
        },
      }),
    })

    const result = discoverSource(testDir)

    const apiKit = result.packages.find((p) => p.name === 'api-kit')
    const etlKit = result.packages.find((p) => p.name === 'etl-kit')

    expect(apiKit).toBeDefined()
    expect(apiKit?.consumers).toBe(2)
    expect(apiKit?.consumerNames).toContain('my-api')
    expect(apiKit?.consumerNames).toContain('my-worker')

    expect(etlKit).toBeDefined()
    expect(etlKit?.consumers).toBe(1)
    expect(etlKit?.consumerNames).toContain('my-worker')
  })

  it('classifies projects as active by default without git', () => {
    setup({
      'my-app/package.json': JSON.stringify({ dependencies: { express: '^4.0.0' } }),
    })

    const result = discoverSource(testDir)
    const project = result.projects.find((p) => p.name === 'my-app')

    expect(project).toBeDefined()
    expect(project?.activity).toBe('active')
    expect(project?.lastCommitDate).toBeNull()
  })

  it('skips excluded directories (node_modules, .git, dist, etc.)', () => {
    setup({
      'node_modules/some-dep/package.json': JSON.stringify({ name: 'some-dep' }),
      '.git/config': '[core]',
      'dist/bundle.js': 'console.log("built")',
      '.turbo/cache': 'data',
      '.hidden-dir/package.json': JSON.stringify({ name: 'hidden' }),
      'real-project/package.json': JSON.stringify({ name: 'real-project' }),
    })

    // dist was created as a directory by setup above; ensure it exists as a dir
    rmSync(join(testDir, 'dist'), { recursive: true, force: true })
    mkdirSync(join(testDir, 'dist'), { recursive: true })
    writeFileSync(join(testDir, 'dist', 'index.js'), 'built')

    const result = discoverSource(testDir)
    const names = result.projects.map((p) => p.name)

    expect(names).toContain('real-project')
    expect(names).not.toContain('some-dep')
    expect(names).not.toContain('hidden')
    expect(names).not.toContain('.git')
    expect(names).not.toContain('dist')
  })

  it('detects iOS projects without package.json', () => {
    setup({
      'my-ios-app/project.yml': 'name: MyApp\ntargets:\n  MyApp:\n    type: application',
    })

    const result = discoverSource(testDir)
    const iosProject = result.projects.find((p) => p.name === 'my-ios-app')

    expect(iosProject).toBeDefined()
    expect(iosProject?.framework).toBe('ios-swift')
  })

  it('detects projects with only CLAUDE.md', () => {
    setup({
      'legacy-app/CLAUDE.md': '# Legacy App\n\nSome notes',
    })

    const result = discoverSource(testDir)
    const project = result.projects.find((p) => p.name === 'legacy-app')

    expect(project).toBeDefined()
    expect(project?.hasClaudeMd).toBe(true)
  })

  it('returns empty projects and packages for empty source directory', () => {
    setup({})

    const result = discoverSource(testDir)

    expect(result.projects).toHaveLength(0)
    expect(result.packages).toHaveLength(0)
    expect(result.sourceRoot).toBe(testDir)
  })
})
