import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanAllProjects } from '../src/engine/scanner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const monorepoRoot = join(__dirname, '..', '..')
const outputPath = join(__dirname, '..', 'data', 'scan-results.json')

console.log(`Scanning monorepo at: ${monorepoRoot}`)

const results = scanAllProjects(monorepoRoot)

// Save results
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(results, null, 2))
console.log(`\nSaved ${results.length} project scans to ${outputPath}`)

// Summary
const frameworkCounts: Record<string, number> = {}
for (const r of results) {
  frameworkCounts[r.framework] = (frameworkCounts[r.framework] ?? 0) + 1
}

const sharedPackageCounts: Record<string, number> = {}
for (const r of results) {
  for (const pkg of r.sharedPackages) {
    sharedPackageCounts[pkg] = (sharedPackageCounts[pkg] ?? 0) + 1
  }
}

const claudeMdCount = results.filter((r) => r.hasClaudeMd).length
const deployConfigCount = results.filter((r) => r.hasDeployConfig).length

console.log('\n=== Summary ===')
console.log(`\nTotal projects scanned: ${results.length}`)

console.log('\nFramework breakdown:')
const sortedFrameworks = Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1])
for (const [framework, count] of sortedFrameworks) {
  console.log(`  ${framework}: ${count}`)
}

console.log('\nShared package usage:')
const sortedPackages = Object.entries(sharedPackageCounts).sort((a, b) => b[1] - a[1])
if (sortedPackages.length === 0) {
  console.log('  (none)')
} else {
  for (const [pkg, count] of sortedPackages) {
    console.log(`  ${pkg}: ${count} project${count === 1 ? '' : 's'}`)
  }
}

console.log(`\nCLAUDE.md present: ${claudeMdCount} / ${results.length} projects`)
console.log(`Deploy config present: ${deployConfigCount} / ${results.length} projects`)
