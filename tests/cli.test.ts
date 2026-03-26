import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const BIN = join(import.meta.dirname, '..', 'bin', 'koba.ts')
const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx')

function run(...args: string[]): string {
  return execFileSync(TSX, [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim()
}

describe('koba CLI', () => {
  it('prints version with --version', () => {
    const output = run('--version')
    expect(output).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('prints help with --help', () => {
    const output = run('--help')
    expect(output).toContain('koba')
    expect(output).toContain('init')
  })
})
