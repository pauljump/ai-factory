import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { seedSoul, writeSoul, readSoul } from '../src/engine/soul.js'

const testDir = join(tmpdir(), 'factory-test-soul')

beforeEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  mkdirSync(testDir, { recursive: true })
})

describe('seedSoul', () => {
  it('returns default soul when no CLAUDE.md exists', () => {
    const soul = seedSoul(testDir)
    expect(soul).toContain('Factory Soul')
    expect(soul).toContain('Scout first')
    expect(soul).toContain('Factory Awareness')
  })

  it('uses existing soul.md from .claude/ if present', () => {
    mkdirSync(join(testDir, '.claude'), { recursive: true })
    writeFileSync(join(testDir, '.claude', 'soul.md'), '# My Soul\n\nCustom soul content.\n')

    const soul = seedSoul(testDir)
    expect(soul).toContain('My Soul')
    expect(soul).toContain('Custom soul content')
    expect(soul).toContain('Factory Awareness')
  })

  it('extracts principles from CLAUDE.md', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), `# My Factory

## How We Build Together

### Principles

1. **Scout first, code never.** The thinking IS the work.
2. **Surface every decision.** No stealth choices.
3. **Tight loops, not marathons.** Check in often.
`)

    const soul = seedSoul(testDir)
    expect(soul).toContain('Scout first')
    expect(soul).toContain('Surface every decision')
    expect(soul).toContain('Tight loops')
  })

  it('extracts roles from CLAUDE.md', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), `# Factory

## Who You're Working With

**Paul: Product brain + creative architect.**
**Claude: Code hands + challenger + researcher.**
`)

    const soul = seedSoul(testDir)
    expect(soul).toContain('Paul')
    expect(soul).toContain('Claude')
  })
})

describe('writeSoul / readSoul', () => {
  it('writes and reads soul file', () => {
    const path = join(testDir, 'soul.md')
    writeSoul(path, '# Test Soul\n\nContent here.\n')

    const content = readSoul(path)
    expect(content).toContain('Test Soul')
  })

  it('returns null for nonexistent soul', () => {
    expect(readSoul(join(testDir, 'nope.md'))).toBeNull()
  })
})
