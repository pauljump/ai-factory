#!/usr/bin/env node --import tsx

import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const program = new Command()

program
  .name('koba')
  .description('The Factory — AI-powered compounding production system')
  .version(pkg.version)

program
  .command('init [name]')
  .description('Create a new factory workspace')
  .action(async (name?: string) => {
    const { initCommand } = await import('../src/commands/init.js')
    await initCommand(name)
  })

program
  .command('convert <source>')
  .description('Import existing projects into the factory')
  .option('--dry-run', 'Show conversion plan without executing')
  .action(async (source: string, opts: { dryRun?: boolean }) => {
    const { convertCommand } = await import('../src/commands/convert.js')
    await convertCommand(source, opts.dryRun ?? false)
  })

program
  .command('scan')
  .description('Analyze all projects in the factory')
  .action(async () => {
    const { scanCommand } = await import('../src/commands/scan.js')
    await scanCommand()
  })

program
  .command('status')
  .description('Show factory dashboard')
  .action(async () => {
    const { statusCommand } = await import('../src/commands/status.js')
    await statusCommand()
  })

program
  .command('knowledge')
  .description('Manage the knowledge base')
  .argument('<action>', 'search | rebuild | stats')
  .argument('[query]', 'search query')
  .action(async (action: string, query?: string) => {
    const { knowledgeCommand } = await import('../src/commands/knowledge.js')
    await knowledgeCommand(action, query)
  })

program
  .command('new <name>')
  .description('Create a new project in the factory')
  .option('-t, --type <type>', 'Project type: web, api, ios, pipeline, other', 'other')
  .action(async (name: string, opts: { type: string }) => {
    const { newCommand } = await import('../src/commands/new.js')
    await newCommand(name, opts.type)
  })

program
  .command('_hook')
  .description('Internal: hook entry points')
  .argument('<event>', 'session-start | stop')
  .option('--cwd <dir>', 'working directory')
  .action(async (event: string, opts: { cwd?: string }) => {
    const { hookCommand } = await import('../src/commands/hook.js')
    await hookCommand(event, opts.cwd)
  })

program.parse()
