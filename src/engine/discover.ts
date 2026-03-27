import { readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { scanProject } from './scanner.js'
import type { DiscoveryResult, DiscoveredProject, DiscoveredPackage } from './types.js'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  'dist',
  '.pnpm-store',
  '.turbo',
  'packages',
])

function getActivityFromGit(
  sourceRoot: string,
  projectPath: string,
): { activity: 'active' | 'dormant' | 'dead'; lastCommitDate: string | null } {
  try {
    const relativePath = relative(sourceRoot, projectPath)
    const output = execFileSync(
      'git',
      ['log', '--format=%aI', '-1', '--', relativePath],
      { cwd: sourceRoot, encoding: 'utf8' },
    ).trim()

    if (!output) {
      return { activity: 'active', lastCommitDate: null }
    }

    const lastCommitDate = output
    const commitTime = new Date(lastCommitDate).getTime()
    const now = Date.now()
    const daysSince = (now - commitTime) / (1000 * 60 * 60 * 24)

    let activity: 'active' | 'dormant' | 'dead'
    if (daysSince < 30) {
      activity = 'active'
    } else if (daysSince <= 90) {
      activity = 'dormant'
    } else {
      activity = 'dead'
    }

    return { activity, lastCommitDate }
  } catch {
    // Source is not a git repo or git is unavailable
    return { activity: 'active', lastCommitDate: null }
  }
}

export function discoverSource(sourceRoot: string): DiscoveryResult {
  const projects: DiscoveredProject[] = []
  const packages: DiscoveredPackage[] = []

  // Step 1: Find packages in packages/ subdirectory
  const packagesDir = join(sourceRoot, 'packages')
  if (existsSync(packagesDir)) {
    const entries = readdirSync(packagesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pkgPath = join(packagesDir, entry.name)
      if (existsSync(join(pkgPath, 'package.json'))) {
        packages.push({
          name: entry.name,
          path: pkgPath,
          consumers: 0,
          consumerNames: [],
        })
      }
    }
  }

  // Step 2: Scan top-level directories for projects
  const topEntries = readdirSync(sourceRoot, { withFileTypes: true })
  for (const entry of topEntries) {
    if (!entry.isDirectory()) continue
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.name.startsWith('.')) continue

    const projectPath = join(sourceRoot, entry.name)

    const hasPackageJson = existsSync(join(projectPath, 'package.json'))
    const hasProjectYml = existsSync(join(projectPath, 'project.yml'))
    const hasClaudeMd = existsSync(join(projectPath, 'CLAUDE.md'))

    if (!hasPackageJson && !hasProjectYml && !hasClaudeMd) continue

    const scan = scanProject(projectPath)
    const { activity, lastCommitDate } = getActivityFromGit(sourceRoot, projectPath)

    projects.push({
      name: scan.name,
      path: scan.path,
      framework: scan.framework,
      hasClaudeMd: scan.hasClaudeMd,
      hasDeployConfig: scan.hasDeployConfig,
      activity,
      lastCommitDate,
      commitCount: 0,
      estimatedSessions: 0,
      dependencies: scan.dependencies,
      sharedPackages: scan.sharedPackages,
    })
  }

  // Step 3: Count package consumers
  for (const pkg of packages) {
    for (const project of projects) {
      // A project is a consumer if it lists any dependency that ends with the package name
      // e.g. @pauljump/api-kit matches package name "api-kit"
      const isConsumer = project.dependencies.some((dep) => {
        // Match exact package name or scoped package ending in /name
        return dep === pkg.name || dep.endsWith(`/${pkg.name}`)
      })
      if (isConsumer) {
        pkg.consumers++
        pkg.consumerNames.push(project.name)
      }
    }
  }

  return {
    projects,
    packages,
    sourceRoot,
  }
}
