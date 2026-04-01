import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireWorkspace } from '../workspace.js'
import { openFactoryDb } from '../engine/db.js'
import { createKnowledgeStore } from '../engine/knowledge-store.js'
import { runEvalSuite, generateScorecard } from '../engine/eval.js'
import { BUILTIN_EVAL_CASES, resolveEvalCases } from '../engine/eval-cases.js'
import type { EvalCase } from '../engine/types.js'

export async function evalCommand(): Promise<void> {
  const ws = requireWorkspace()

  if (!existsSync(ws.db)) {
    console.error('No knowledge store found. Run `factory convert` or `factory knowledge rebuild` first.')
    process.exit(1)
  }

  const db = openFactoryDb(ws.db)
  const store = createKnowledgeStore(db)

  // Load built-in cases
  let cases: EvalCase[] = [...BUILTIN_EVAL_CASES]

  // Load custom cases if they exist
  const customPath = join(ws.scorecards, 'eval-cases.json')
  if (existsSync(customPath)) {
    const custom = JSON.parse(readFileSync(customPath, 'utf-8')) as EvalCase[]
    cases.push(...custom)
  }

  // Resolve cases — populate relevantIds from knowledge store for built-in cases
  cases = resolveEvalCases(cases, (tags) => store.searchByTags(tags))

  // Filter out cases with no relevant entries (nothing to evaluate against)
  const runnable = cases.filter(c => c.relevantIds.length > 0)
  const skipped = cases.length - runnable.length

  if (runnable.length === 0) {
    console.log('No eval cases have matching knowledge entries. Add more knowledge first.')
    db.close()
    return
  }

  console.log(`\nRunning ${runnable.length} eval cases (${skipped} skipped — no matching entries)...\n`)

  const scorecard = runEvalSuite(store, runnable)
  db.close()

  // Print summary
  console.log('RETRIEVAL EVALUATION')
  console.log('\u2500'.repeat(40))
  console.log(`  Precision:  ${(scorecard.meanPrecision * 100).toFixed(1)}%`)
  console.log(`  Recall:     ${(scorecard.meanRecall * 100).toFixed(1)}%`)
  console.log(`  MRR:        ${(scorecard.meanReciprocalRank * 100).toFixed(1)}%`)
  console.log('')

  for (const r of scorecard.results) {
    const status = r.recall === 1.0 ? '\u2713' : r.recall > 0 ? '~' : '\u2717'
    console.log(`  ${status} ${r.caseId}: P=${(r.precision * 100).toFixed(0)}% R=${(r.recall * 100).toFixed(0)}% RR=${r.reciprocalRank.toFixed(2)}`)
  }

  // Save scorecard
  mkdirSync(ws.scorecards, { recursive: true })
  const filename = `eval-${scorecard.timestamp.slice(0, 10)}.md`
  const scorecardPath = join(ws.scorecards, filename)
  writeFileSync(scorecardPath, generateScorecard(scorecard))

  console.log(`\nScorecard saved to scorecards/${filename}`)
}
