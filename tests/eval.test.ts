import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFactoryDb } from '../src/engine/db.js'
import { createKnowledgeStore } from '../src/engine/knowledge-store.js'
import { runEvalCase, runEvalSuite, generateScorecard } from '../src/engine/eval.js'
import type { KnowledgeEntry, EvalCase } from '../src/engine/types.js'

function makeEntry(id: string, domain: string, tags: string[], body: string): KnowledgeEntry {
  return {
    id, domain, tags, body,
    confidence: 'high',
    sourceProject: 'test-project',
    date: '2026-03-31',
    lastVerified: '2026-03-31',
    timesInjected: 0,
    timesUseful: 0,
  }
}

describe('eval types', () => {
  it('EvalCase has required fields', () => {
    const testCase: EvalCase = {
      id: 'test-sqlite-wal',
      query: 'SQLite WAL mode',
      relevantIds: ['cloud-run-sqlite-wal', 'sqlite-wal-gotcha'],
      tags: ['sqlite', 'cloud-run'],
    }
    expect(testCase.id).toBe('test-sqlite-wal')
    expect(testCase.relevantIds.length).toBe(2)
  })
})

describe('runEvalCase', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite', 'wal'], 'SQLite WAL mode enables concurrent reads during writes'))
    store.index(makeEntry('sqlite-fk', 'sqlite', ['sqlite', 'foreign-keys'], 'Always enable foreign keys with PRAGMA foreign_keys = ON'))
    store.index(makeEntry('cloud-run-volume', 'cloud-run', ['cloud-run', 'sqlite'], 'Mount a persistent volume for SQLite on Cloud Run'))
    store.index(makeEntry('nextjs-standalone', 'nextjs', ['nextjs', 'deploy'], 'Use output: standalone for Cloud Run deployment'))
    store.index(makeEntry('ios-bundle-id', 'ios', ['ios', 'xcode'], 'Bundle ID must match App Store Connect exactly'))
  })

  it('computes precision and recall for a matching query', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-sqlite',
      query: 'SQLite WAL mode',
      relevantIds: ['sqlite-wal', 'cloud-run-volume'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.caseId).toBe('test-sqlite')
    expect(result.retrievedIds.length).toBeGreaterThan(0)
    expect(result.retrievedIds).toContain('sqlite-wal')
    expect(result.recall).toBeGreaterThan(0)
    expect(result.precision).toBeGreaterThan(0)
    expect(result.reciprocalRank).toBeGreaterThan(0)
  })

  it('returns zero metrics when nothing matches', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-no-match',
      query: 'quantum computing entanglement',
      relevantIds: ['does-not-exist'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.recall).toBe(0)
    expect(result.reciprocalRank).toBe(0)
  })

  it('handles perfect retrieval', () => {
    const store = createKnowledgeStore(db)
    const evalCase: EvalCase = {
      id: 'test-ios',
      query: 'iOS bundle ID Xcode',
      relevantIds: ['ios-bundle-id'],
    }
    const result = runEvalCase(store, evalCase)

    expect(result.retrievedIds).toContain('ios-bundle-id')
    expect(result.recall).toBe(1.0)
    expect(result.reciprocalRank).toBe(1.0)
  })
})

describe('runEvalSuite', () => {
  it('runs multiple cases and aggregates', () => {
    const db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite'], 'WAL mode'))
    store.index(makeEntry('ios-bundle', 'ios', ['ios'], 'Bundle ID'))

    const cases: EvalCase[] = [
      { id: 'c1', query: 'SQLite WAL', relevantIds: ['sqlite-wal'] },
      { id: 'c2', query: 'iOS bundle', relevantIds: ['ios-bundle'] },
    ]

    const scorecard = runEvalSuite(store, cases)
    expect(scorecard.totalCases).toBe(2)
    expect(scorecard.results.length).toBe(2)
    expect(scorecard.meanRecall).toBeGreaterThan(0)
    expect(scorecard.meanReciprocalRank).toBeGreaterThan(0)
  })
})

describe('generateScorecard', () => {
  it('formats scorecard as markdown', () => {
    const db = new Database(':memory:')
    initFactoryDb(db)
    const store = createKnowledgeStore(db)

    store.index(makeEntry('sqlite-wal', 'sqlite', ['sqlite'], 'WAL mode'))

    const cases: EvalCase[] = [
      { id: 'c1', query: 'SQLite WAL', relevantIds: ['sqlite-wal'] },
    ]

    const scorecard = runEvalSuite(store, cases)
    const markdown = generateScorecard(scorecard)

    expect(markdown).toContain('Retrieval Evaluation')
    expect(markdown).toContain('Precision')
    expect(markdown).toContain('Recall')
    expect(markdown).toContain('MRR')
  })
})
