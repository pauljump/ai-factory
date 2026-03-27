import { describe, it, expect } from 'vitest'
import { harvestFromClaudeMd, harvestFromDomainKnowledge } from '../src/engine/harvester.js'

describe('harvestFromClaudeMd', () => {
  it('extracts gotchas from a CLAUDE.md with ## Gotchas section', () => {
    const content = `# My Project

## Overview

Some general info here.

## Gotchas

- Never run migrations without backing up first
- The auth token expires after 1 hour of inactivity
- Short
`
    const entries = harvestFromClaudeMd('my-project', content)
    expect(entries.length).toBe(2)
    expect(entries[0].body).toBe('Never run migrations without backing up first')
    expect(entries[0].domain).toBe('gotchas')
    expect(entries[0].tags).toEqual(['my-project'])
    expect(entries[0].confidence).toBe('medium')
    expect(entries[0].sourceProject).toBe('my-project')
    expect(entries[0].timesInjected).toBe(0)
    expect(entries[0].timesUseful).toBe(0)
    expect(entries[1].body).toBe('The auth token expires after 1 hour of inactivity')
  })

  it('extracts from architecture sections including non-bullet long lines', () => {
    const content = `# Project

## Architecture

- Uses event-driven design with a message queue
- Redis is used for session caching across services

This system relies on microservices deployed to Cloud Run with GCS as the primary object store.

## API Reference

Some docs here.
`
    const entries = harvestFromClaudeMd('arch-project', content)
    // Should include the two bullets and the long prose line
    const bodies = entries.map((e) => e.body)
    expect(bodies).toContain('Uses event-driven design with a message queue')
    expect(bodies).toContain('Redis is used for session caching across services')
    expect(bodies).toContain(
      'This system relies on microservices deployed to Cloud Run with GCS as the primary object store.'
    )
    entries.forEach((e) => {
      expect(e.domain).toBe('architecture')
      expect(e.tags).toEqual(['arch-project'])
    })
  })

  it('returns empty for a minimal CLAUDE.md with no relevant sections', () => {
    const content = `# My Project

## Setup

Run npm install to get started.

## Usage

Call the CLI with koba run.
`
    const entries = harvestFromClaudeMd('boring-project', content)
    expect(entries).toEqual([])
  })
})

describe('harvestFromDomainKnowledge', () => {
  it('parses domain knowledge sections with ## and ### headers and - bullets with **project** attribution', () => {
    const content = `## Cloud Run

### SQLite

- SQLite WAL mode does not work with GCS FUSE mounts — **kithome**
- Use journal_mode=DELETE when deploying on Cloud Run with GCS — **api-server**

### Networking

- Always set Cloud Run concurrency to 1 for stateful services — **backend**

## iOS

### StoreKit

- StoreKit 2 requires iOS 15+ and entitlement setup before testing — **barkey**
`
    const entries = harvestFromDomainKnowledge(content)
    expect(entries.length).toBe(4)

    const first = entries[0]
    expect(first.domain).toBe('cloud-run')
    expect(first.tags).toContain('sqlite')
    expect(first.body).toBe('SQLite WAL mode does not work with GCS FUSE mounts')
    expect(first.sourceProject).toBe('kithome')
    expect(first.confidence).toBe('high')
    expect(first.timesInjected).toBe(0)
    expect(first.timesUseful).toBe(0)

    const second = entries[1]
    expect(second.domain).toBe('cloud-run')
    expect(second.tags).toContain('sqlite')
    expect(second.body).toBe('Use journal_mode=DELETE when deploying on Cloud Run with GCS')
    expect(second.sourceProject).toBe('api-server')

    const third = entries[2]
    expect(third.domain).toBe('cloud-run')
    expect(third.tags).toContain('networking')
    expect(third.sourceProject).toBe('backend')

    const fourth = entries[3]
    expect(fourth.domain).toBe('ios')
    expect(fourth.tags).toContain('storekit')
    expect(fourth.sourceProject).toBe('barkey')
  })
})
