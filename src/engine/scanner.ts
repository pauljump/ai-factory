import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { ProjectScan } from './types.js'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  'packages',
  '_archive',
  'dist',
  '.pnpm-store',
  '.turbo',
  'factory',
])

export function scanProject(projectPath: string): ProjectScan {
  const name = basename(projectPath)

  // Collect all dependency keys from package.json
  const dependencies: string[] = []
  let pkgJson: Record<string, unknown> = {}

  const pkgJsonPath = join(projectPath, 'package.json')
  if (existsSync(pkgJsonPath)) {
    try {
      pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as Record<string, unknown>
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        const section = pkgJson[field]
        if (section && typeof section === 'object') {
          dependencies.push(...Object.keys(section as Record<string, unknown>))
        }
      }
    } catch {
      // ignore malformed package.json
    }
  }

  const hasProjectYml = existsSync(join(projectPath, 'project.yml'))
  const hasIosDir = existsSync(join(projectPath, 'ios'))
  const hasDockerfile = existsSync(join(projectPath, 'Dockerfile'))
  const hasClaudeMd = existsSync(join(projectPath, 'CLAUDE.md'))

  // Detect framework
  let framework = 'unknown'
  if (hasProjectYml || hasIosDir) {
    framework = 'ios-swift'
  } else if (dependencies.includes('next')) {
    framework = 'nextjs'
  } else if (dependencies.includes('fastify')) {
    framework = 'node-fastify'
  } else if (dependencies.includes('express')) {
    framework = 'node-express'
  } else if (dependencies.includes('typescript') || dependencies.length > 0) {
    // Has a package.json with deps but no specific framework detected
    if (dependencies.includes('typescript')) {
      framework = 'node-typescript'
    } else {
      framework = 'node'
    }
  } else if (existsSync(pkgJsonPath)) {
    // package.json exists but no recognizable deps
    framework = 'node'
  }

  // Shared packages
  const sharedPackages = dependencies.filter((d) => d.startsWith('@pauljump/'))

  // Infrastructure
  const infrastructure: string[] = []
  if (dependencies.includes('better-sqlite3')) infrastructure.push('sqlite')
  if (dependencies.includes('@pauljump/api-kit')) infrastructure.push('api-kit')
  if (dependencies.includes('stripe')) infrastructure.push('stripe')
  if (hasDockerfile) infrastructure.push('docker')
  if (hasProjectYml) infrastructure.push('xcodegen')

  return {
    name,
    path: projectPath,
    framework,
    dependencies,
    sharedPackages,
    infrastructure,
    dataSources: [],
    hasClaudeMd,
    hasDeployConfig: hasDockerfile,
  }
}

export function scanAllProjects(monorepoRoot: string): ProjectScan[] {
  const entries = readdirSync(monorepoRoot, { withFileTypes: true })
  const results: ProjectScan[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.name.startsWith('.')) continue

    const projectPath = join(monorepoRoot, entry.name)

    const hasPackageJson = existsSync(join(projectPath, 'package.json'))
    const hasProjectYml = existsSync(join(projectPath, 'project.yml'))
    const hasClaudeMd = existsSync(join(projectPath, 'CLAUDE.md'))

    if (!hasPackageJson && !hasProjectYml && !hasClaudeMd) continue

    results.push(scanProject(projectPath))
  }

  return results
}
