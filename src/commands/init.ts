import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'
import { generateKobaConfig } from '../templates/koba-config.js'
import { generateClaudeMd } from '../templates/claude-md.js'
import { generateSessionStartHook, generateStopHook } from '../templates/hooks.js'

export async function initCommand(target?: string): Promise<void> {
  const dir = resolve(target ?? '.')
  const name = basename(dir)

  if (existsSync(join(dir, 'koba.json'))) {
    console.error(`Error: ${dir} is already a koba workspace.`)
    process.exit(1)
  }

  console.log(`Creating factory workspace at ${dir}...\n`)

  const dirs = ['projects', 'packages', 'knowledge', 'data', 'scorecards', '.claude']
  for (const d of dirs) {
    mkdirSync(join(dir, d), { recursive: true })
  }

  writeFileSync(join(dir, 'koba.json'), JSON.stringify(generateKobaConfig(name), null, 2) + '\n')
  console.log('  \u2713 koba.json')

  writeFileSync(join(dir, 'CLAUDE.md'), generateClaudeMd(name))
  console.log('  \u2713 CLAUDE.md')

  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name,
    private: true,
    type: 'module',
    scripts: {},
  }, null, 2) + '\n')
  console.log('  \u2713 package.json')

  writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n  - "projects/*"\n')
  console.log('  \u2713 pnpm-workspace.yaml')

  const hooksDir = join(dir, '.claude', 'hooks')
  mkdirSync(hooksDir, { recursive: true })

  const sessionStartPath = join(hooksDir, 'session-start.sh')
  writeFileSync(sessionStartPath, generateSessionStartHook())
  chmodSync(sessionStartPath, 0o755)

  const stopPath = join(hooksDir, 'stop.sh')
  writeFileSync(stopPath, generateStopHook())
  chmodSync(stopPath, 0o755)

  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({
    hooks: {
      SessionStart: [{
        matcher: '',
        hooks: [{ type: 'command', command: './.claude/hooks/session-start.sh', timeout: 15 }],
      }],
      Stop: [{
        matcher: '',
        hooks: [{ type: 'command', command: './.claude/hooks/stop.sh', timeout: 10 }],
      }],
    },
  }, null, 2) + '\n')
  console.log('  \u2713 Hooks wired')

  writeFileSync(join(dir, '.gitignore'), [
    'node_modules/', 'dist/',
    'data/factory.db', 'data/factory.db-wal', 'data/factory.db-shm',
    'data/scan-results.json', 'data/baselines.json', '',
  ].join('\n'))
  console.log('  \u2713 .gitignore')

  console.log(`\nFactory ready. Next steps:`)
  console.log(`  cd ${dir}`)
  console.log(`  koba convert ~/path/to/existing/projects   # import existing work`)
  console.log(`  koba new my-first-project                  # or start fresh`)
}
