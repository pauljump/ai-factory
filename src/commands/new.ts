import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'

const TEMPLATES: Record<string, object> = {
  web: {
    dependencies: { next: '^16', react: '^19', 'react-dom': '^19' },
    devDependencies: { typescript: '^5.5.0', '@types/react': '^19' },
  },
  api: {
    dependencies: { fastify: '^5', 'better-sqlite3': '^11' },
    devDependencies: { typescript: '^5.5.0', '@types/better-sqlite3': '^7' },
  },
  ios: {},
  pipeline: {
    dependencies: { 'better-sqlite3': '^11' },
    devDependencies: { typescript: '^5.5.0', tsx: '^4' },
  },
  other: {
    devDependencies: { typescript: '^5.5.0' },
  },
}

export async function newCommand(name: string, type: string): Promise<void> {
  const ws = requireWorkspace()
  const projectDir = join(ws.projects, name)

  if (existsSync(projectDir)) {
    console.error(`Error: projects/${name} already exists.`)
    process.exit(1)
  }

  console.log(`\nCreating projects/${name} (${type})...\n`)

  mkdirSync(projectDir, { recursive: true })

  // Generate package.json (skip for iOS)
  if (type !== 'ios') {
    const template = TEMPLATES[type] ?? TEMPLATES['other']!
    const pkg = {
      name,
      version: '0.1.0',
      type: 'module',
      private: true,
      scripts: {
        build: 'tsc',
        dev: type === 'web' ? 'next dev' : 'tsx watch src/index.ts',
        start: type === 'web' ? 'next start' : 'node dist/index.js',
      },
      ...template,
    }
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
    console.log('  \u2713 package.json')
  }

  // Generate project CLAUDE.md
  const claudeMd = generateProjectClaudeMd(name, type)
  writeFileSync(join(projectDir, 'CLAUDE.md'), claudeMd)
  console.log('  \u2713 CLAUDE.md')

  // Create src directory
  if (type !== 'ios') {
    mkdirSync(join(projectDir, 'src'), { recursive: true })
    console.log('  \u2713 src/')
  }

  // For iOS, create project.yml stub
  if (type === 'ios') {
    writeFileSync(join(projectDir, 'project.yml'), `name: ${name}\noptions:\n  bundleIdPrefix: com.factory\n`)
    mkdirSync(join(projectDir, 'ios', name, 'Sources'), { recursive: true })
    console.log('  \u2713 project.yml')
    console.log('  \u2713 ios/')
  }

  // Pre-load relevant knowledge
  let knowledgeCount = 0
  try {
    mkdirSync(ws.data, { recursive: true })
    const db = openFactoryDb(ws.db)
    const store = createKnowledgeStore(db)

    const typeTags: Record<string, string[]> = {
      web: ['nextjs', 'react', 'web'],
      api: ['fastify', 'api', 'sqlite'],
      ios: ['ios', 'swift', 'xcodegen'],
      pipeline: ['etl', 'scraping', 'data'],
      other: [],
    }

    const tags = typeTags[type] ?? []
    if (tags.length > 0) {
      const entries = store.searchByTags(tags)
      knowledgeCount = entries.length
    }

    db.close()
  } catch { /* knowledge store might not be initialized */ }

  console.log(`\nProject ready.`)
  if (knowledgeCount > 0) {
    console.log(`  ${knowledgeCount} relevant knowledge entries will be injected on session start.`)
  }
  console.log(`\n  cd projects/${name}`)
  console.log(`  # Start building!`)
}

function generateProjectClaudeMd(name: string, type: string): string {
  const typeDescriptions: Record<string, string> = {
    web: 'Next.js web application',
    api: 'Fastify + SQLite API',
    ios: 'iOS Swift application',
    pipeline: 'Data pipeline',
    other: 'Project',
  }

  return `# ${name}

${typeDescriptions[type] ?? 'Project'} — part of the factory.

## Current State

**Status:** exploring
**Last updated:** ${new Date().toISOString().slice(0, 10)}
**What just shipped:** Initial scaffold
**What's next:** [fill in]
**What's blocking:** Nothing

## Architecture

[Describe the architecture as it develops]

## Gotchas

[Document gotchas as you discover them — these get harvested into the factory knowledge base]
`
}
