import { execFileSync } from 'node:child_process'
import type { ProjectBaseline, ProjectScan } from './types.js'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function estimateSessions(timestamps: string[]): number {
  if (timestamps.length === 0) return 0
  if (timestamps.length === 1) return 1

  let sessions = 1
  for (let i = 1; i < timestamps.length; i++) {
    const prev = new Date(timestamps[i - 1]!).getTime()
    const curr = new Date(timestamps[i]!).getTime()
    if (curr - prev > FOUR_HOURS_MS) sessions++
  }
  return sessions
}

export function detectCategory(
  framework: string,
  sharedPackages: string[],
): ProjectBaseline['category'] {
  if (framework === 'ios-swift') return 'ios'
  if (framework === 'nextjs') return 'web'
  if (framework === 'node-fastify' || sharedPackages.includes('@pauljump/api-kit')) return 'api'
  if (sharedPackages.includes('@pauljump/etl-kit')) return 'data-pipeline'
  return 'other'
}

export function extractBaseline(scan: ProjectScan, monorepoRoot: string): ProjectBaseline | null {
  const relativePath = scan.path.replace(monorepoRoot + '/', '')

  try {
    const logOutput = execFileSync(
      'git', ['log', '--format=%aI', '--reverse', '--', relativePath],
      { cwd: monorepoRoot, encoding: 'utf-8', timeout: 30000 }
    ).trim()

    if (!logOutput) return null

    const timestamps = logOutput.split('\n').filter(Boolean)
    if (timestamps.length === 0) return null

    const firstCommit = timestamps[0]!
    const lastCommit = timestamps[timestamps.length - 1]!

    let firstDeploy: string | null = null
    try {
      const deployLog = execFileSync(
        'git', ['log', '--format=%aI', '--reverse', '--',
          `${relativePath}/Dockerfile`, `${relativePath}/web/Dockerfile`],
        { cwd: monorepoRoot, encoding: 'utf-8', timeout: 10000 }
      ).trim()
      if (deployLog) firstDeploy = deployLog.split('\n')[0]!
    } catch { /* no deploy found */ }

    let daysToFirstDeploy: number | null = null
    if (firstDeploy) {
      const start = new Date(firstCommit).getTime()
      const deploy = new Date(firstDeploy).getTime()
      daysToFirstDeploy = Math.round((deploy - start) / (1000 * 60 * 60 * 24))
    }

    return {
      name: scan.name,
      firstCommit: firstCommit.slice(0, 10),
      lastCommit: lastCommit.slice(0, 10),
      commitCount: timestamps.length,
      estimatedSessions: estimateSessions(timestamps),
      firstDeploy: firstDeploy?.slice(0, 10) ?? null,
      daysToFirstDeploy,
      category: detectCategory(scan.framework, scan.sharedPackages),
    }
  } catch {
    return null
  }
}
