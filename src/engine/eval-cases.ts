import type { EvalCase } from './types.js'

/**
 * Built-in evaluation cases for common knowledge domains.
 * These test whether the knowledge store can retrieve relevant entries
 * for typical developer queries across the factory's supported stack.
 *
 * Users can extend these by adding cases to scorecards/eval-cases.json.
 */
export const BUILTIN_EVAL_CASES: EvalCase[] = [
  {
    id: 'eval-sqlite-wal',
    query: 'SQLite WAL mode concurrent reads',
    relevantIds: [],
    tags: ['sqlite', 'wal'],
  },
  {
    id: 'eval-cloud-run-deploy',
    query: 'deploy to Cloud Run with Dockerfile',
    relevantIds: [],
    tags: ['cloud-run', 'docker', 'deploy'],
  },
  {
    id: 'eval-ios-testflight',
    query: 'upload build to TestFlight App Store Connect',
    relevantIds: [],
    tags: ['ios', 'testflight', 'deploy'],
  },
  {
    id: 'eval-nextjs-standalone',
    query: 'Next.js standalone output for containerization',
    relevantIds: [],
    tags: ['nextjs', 'deploy', 'docker'],
  },
  {
    id: 'eval-auth-jwt',
    query: 'JWT authentication middleware',
    relevantIds: [],
    tags: ['auth', 'jwt', 'fastify'],
  },
  {
    id: 'eval-scraping-etl',
    query: 'web scraping with retry and rate limiting',
    relevantIds: [],
    tags: ['scraping', 'etl', 'puppeteer'],
  },
  {
    id: 'eval-storekit-iap',
    query: 'StoreKit in-app purchase implementation',
    relevantIds: [],
    tags: ['ios', 'storekit', 'payments'],
  },
]

/**
 * Resolve eval cases against the actual knowledge store.
 * For built-in cases with empty relevantIds, populate them by
 * finding entries that match the case's tags.
 */
export function resolveEvalCases(
  cases: EvalCase[],
  searchByTags: (tags: string[]) => { id: string }[],
): EvalCase[] {
  return cases.map(c => {
    if (c.relevantIds.length > 0) return c
    if (!c.tags || c.tags.length === 0) return c

    const matches = searchByTags(c.tags)
    return {
      ...c,
      relevantIds: matches.map(m => m.id),
    }
  })
}
