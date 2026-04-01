import { describe, it, expect } from 'vitest'
import { harvestFromClaudeMd, harvestFromDomainKnowledge } from '../src/engine/harvester.js'

describe('harvestFromClaudeMd', () => {
  it('extracts gotchas from a CLAUDE.md with ## Gotchas section', () => {
    const content = `# My Project

## Overview

Some general info here.

## Gotchas

- Never run migrations without backing up the database first, this is critical
- The auth token expires after 1 hour of inactivity, causing silent failures
- Short
`
    const entries = harvestFromClaudeMd('my-project', content)
    expect(entries.length).toBe(2)
    expect(entries[0]!.body).toContain('Never run migrations')
    expect(entries[0]!.tags).toEqual(['my-project'])
    expect(entries[0]!.confidence).toBe('medium')
    expect(entries[0]!.sourceProject).toBe('my-project')
    expect(entries[0]!.timesInjected).toBe(0)
    expect(entries[0]!.timesUseful).toBe(0)
    expect(entries[1]!.body).toContain('auth token expires')
  })

  it('extracts from architecture sections including non-bullet long lines', () => {
    const content = `# Project

## Architecture

- Uses event-driven design with a Redis message queue for async processing
- Redis is used for session caching across all microservices in the cluster

This system relies on microservices deployed to Cloud Run with GCS as the primary object store for files.

## API Reference

Some docs here.
`
    const entries = harvestFromClaudeMd('arch-project', content)
    const bodies = entries.map((e) => e.body)
    expect(bodies.some(b => b.includes('event-driven'))).toBe(true)
    expect(bodies.some(b => b.includes('Redis'))).toBe(true)
    expect(bodies.some(b => b.includes('Cloud Run'))).toBe(true)
    // Domains should use richer taxonomy
    entries.forEach((e) => {
      expect(e.tags).toEqual(['arch-project'])
    })
  })

  it('filters out low-quality entries (too short, labels)', () => {
    const content = `# Project

## Architecture

- TypeScript, ESM
- Short note
- api-kit provides createApp(), getDb(), parseEnv() for all backend services with validation

## Gotchas

- ok
- SQLite WAL mode causes data corruption on Cloud Run with GCS FUSE volume mounts
`
    const entries = harvestFromClaudeMd('test', content)
    // Short entries and label-like entries should be filtered
    const bodies = entries.map(e => e.body)
    expect(bodies.some(b => b.includes('TypeScript, ESM'))).toBe(false)
    expect(bodies.some(b => b.includes('Short note'))).toBe(false)
    // Real knowledge should remain
    expect(bodies.some(b => b.includes('SQLite WAL mode'))).toBe(true)
  })

  it('returns empty for a minimal CLAUDE.md with no relevant sections', () => {
    const content = `# My Project

## Setup

Run npm install to get started.

## Usage

Call the CLI with factory run.
`
    const entries = harvestFromClaudeMd('boring-project', content)
    expect(entries).toEqual([])
  })
})

describe('harvestFromDomainKnowledge', () => {
  it('parses domain knowledge sections with ** attribution', () => {
    const content = `## Cloud Run

### SQLite

- SQLite WAL mode does not work with GCS FUSE mounts at all — **kithome**
- Use journal_mode=DELETE when deploying on Cloud Run with GCS volumes — **api-server**

### Networking

- Always set Cloud Run concurrency to 1 for stateful services — **backend**

## iOS

### StoreKit

- StoreKit 2 requires iOS 15+ and entitlement setup before testing works — **barkey**
`
    const entries = harvestFromDomainKnowledge(content)
    expect(entries.length).toBe(4)

    const first = entries[0]!
    expect(first.domain).toBe('cloud-run')
    expect(first.tags).toContain('sqlite')
    expect(first.body).toContain('SQLite WAL mode')
    expect(first.sourceProject).toBe('kithome')
    expect(first.confidence).toBe('high')

    const second = entries[1]!
    expect(second.domain).toBe('cloud-run')
    expect(second.body).toContain('journal_mode=DELETE')
    expect(second.sourceProject).toBe('api-server')

    const fourth = entries[3]!
    expect(fourth.domain).toBe('ios')
    expect(fourth.tags).toContain('storekit')
    expect(fourth.sourceProject).toBe('barkey')
  })
})
