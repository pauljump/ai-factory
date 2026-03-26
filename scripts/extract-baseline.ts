import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { extractBaseline } from '../src/engine/baseline.js'
import type { ProjectBaseline, ProjectScan } from '../src/engine/types.js'

const factoryRoot = new URL('..', import.meta.url).pathname
const monorepoRoot = join(factoryRoot, '..')
const scanPath = join(factoryRoot, 'data', 'scan-results.json')

const scans: ProjectScan[] = JSON.parse(readFileSync(scanPath, 'utf-8'))
console.log(`Extracting baselines for ${scans.length} projects...\n`)

const baselines: ProjectBaseline[] = []
for (const scan of scans) {
  const baseline = extractBaseline(scan, monorepoRoot)
  if (baseline) {
    baselines.push(baseline)
    console.log(`  ${baseline.name}: ${baseline.commitCount} commits, ~${baseline.estimatedSessions} sessions [${baseline.category}]`)
  }
}

mkdirSync(join(factoryRoot, 'data'), { recursive: true })
writeFileSync(join(factoryRoot, 'data', 'baselines.json'), JSON.stringify(baselines, null, 2))

const byCategory = new Map<string, number[]>()
for (const b of baselines) {
  const list = byCategory.get(b.category) ?? []
  list.push(b.estimatedSessions)
  byCategory.set(b.category, list)
}

console.log(`\n--- Summary ---`)
console.log(`Total: ${baselines.length} projects`)
for (const [cat, sessions] of byCategory) {
  const avg = sessions.reduce((a, b) => a + b, 0) / sessions.length
  console.log(`  ${cat}: ${sessions.length} projects, avg ${avg.toFixed(1)} sessions`)
}
