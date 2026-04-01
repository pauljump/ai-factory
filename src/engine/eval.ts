import type { EvalCase, EvalResult, EvalScorecard, KnowledgeEntry } from './types.js'

interface EvalStore {
  search(query: string, limit?: number): KnowledgeEntry[]
  searchByTags(tags: string[]): KnowledgeEntry[]
}

const EVAL_LIMIT = 10

/**
 * Run a single eval case against the knowledge store.
 * Retrieves entries via FTS5 search (and tag search if tags provided),
 * then computes precision, recall, and reciprocal rank.
 */
export function runEvalCase(store: EvalStore, evalCase: EvalCase): EvalResult {
  const retrieved = new Map<string, number>() // id → rank position

  // Primary: FTS5 search
  const searchResults = store.search(evalCase.query, EVAL_LIMIT)
  for (let i = 0; i < searchResults.length; i++) {
    if (!retrieved.has(searchResults[i]!.id)) {
      retrieved.set(searchResults[i]!.id, retrieved.size + 1)
    }
  }

  // Secondary: tag search if tags provided
  if (evalCase.tags && evalCase.tags.length > 0) {
    const tagResults = store.searchByTags(evalCase.tags)
    for (const entry of tagResults) {
      if (!retrieved.has(entry.id)) {
        retrieved.set(entry.id, retrieved.size + 1)
      }
    }
  }

  const retrievedIds = [...retrieved.keys()]
  const relevantSet = new Set(evalCase.relevantIds)

  // Precision: |retrieved ∩ relevant| / |retrieved|
  const hits = retrievedIds.filter(id => relevantSet.has(id))
  const precision = retrievedIds.length > 0 ? hits.length / retrievedIds.length : 0

  // Recall: |retrieved ∩ relevant| / |relevant|
  const recall = relevantSet.size > 0 ? hits.length / relevantSet.size : 0

  // Reciprocal rank: 1 / position of first relevant result
  let reciprocalRank = 0
  for (const [id, rank] of retrieved) {
    if (relevantSet.has(id)) {
      reciprocalRank = 1 / rank
      break
    }
  }

  return {
    caseId: evalCase.id,
    query: evalCase.query,
    retrievedIds,
    relevantIds: evalCase.relevantIds,
    precision,
    recall,
    reciprocalRank,
  }
}

/**
 * Run all eval cases and produce an aggregated scorecard.
 */
export function runEvalSuite(store: EvalStore, cases: EvalCase[]): EvalScorecard {
  const results = cases.map(c => runEvalCase(store, c))

  const totalCases = results.length
  const meanPrecision = totalCases > 0
    ? results.reduce((sum, r) => sum + r.precision, 0) / totalCases
    : 0
  const meanRecall = totalCases > 0
    ? results.reduce((sum, r) => sum + r.recall, 0) / totalCases
    : 0
  const meanReciprocalRank = totalCases > 0
    ? results.reduce((sum, r) => sum + r.reciprocalRank, 0) / totalCases
    : 0

  return {
    timestamp: new Date().toISOString(),
    totalCases,
    meanPrecision,
    meanRecall,
    meanReciprocalRank,
    results,
  }
}

/**
 * Format a scorecard as a markdown report.
 */
export function generateScorecard(scorecard: EvalScorecard): string {
  const lines: string[] = []

  lines.push('# Retrieval Evaluation Scorecard')
  lines.push('')
  lines.push(`**Run:** ${scorecard.timestamp}`)
  lines.push(`**Cases:** ${scorecard.totalCases}`)
  lines.push('')
  lines.push('## Aggregate Metrics')
  lines.push('')
  lines.push('| Metric | Score |')
  lines.push('|--------|-------|')
  lines.push(`| Precision | ${(scorecard.meanPrecision * 100).toFixed(1)}% |`)
  lines.push(`| Recall | ${(scorecard.meanRecall * 100).toFixed(1)}% |`)
  lines.push(`| MRR | ${(scorecard.meanReciprocalRank * 100).toFixed(1)}% |`)
  lines.push('')
  lines.push('## Per-Case Results')
  lines.push('')
  lines.push('| Case | Query | Precision | Recall | RR | Retrieved | Relevant |')
  lines.push('|------|-------|-----------|--------|----|-----------|----------|')

  for (const r of scorecard.results) {
    const p = (r.precision * 100).toFixed(0) + '%'
    const rec = (r.recall * 100).toFixed(0) + '%'
    const rr = r.reciprocalRank.toFixed(2)
    const retrieved = r.retrievedIds.length.toString()
    const relevant = r.relevantIds.length.toString()
    lines.push(`| ${r.caseId} | ${r.query} | ${p} | ${rec} | ${rr} | ${retrieved} | ${relevant} |`)
  }

  lines.push('')
  return lines.join('\n')
}
