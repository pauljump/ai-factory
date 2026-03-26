# The Factory — Design Specification

**Date:** 2026-03-26
**Status:** Designed — ready for implementation planning
**Author:** Paul Jump + Claude (collaborative design session)
**Validated by:** 12-persona + 6-role teek panel, competitive landscape research

---

## The Thesis

AI alone produces prototypes. AI + a compounding system produces production-grade software at scale.

The secret (per Thiel's reframe): the value isn't in code generation — it's in **persistent institutional memory that compounds**. A knowledge base built across 50+ projects creates production capability that cannot be replicated by starting from scratch. The knowledge is the moat. The shared code is the moat. The accumulated decisions of 50 project builds are the moat.

**For the world:** AI is not "AI slop" when you apply a system like this. It produces genuinely production-grade software. Here's the measured evidence from 50+ projects to prove it.

---

## What The Factory Is

A living system that takes someone's existing projects (or starts from scratch) and builds a compounding production environment. Not documentation — real code, real automation, real infrastructure.

The factory has opinions. It pushes toward standardization. It learns over time. It researches expertise you don't have. It takes ideas end-to-end: from concept to production to polish to iteration. Every project makes the next one faster, and the data proves it.

### Two Audiences, One System

- **Open-source users** start from scratch or point the factory at their existing projects. The factory analyzes, converts, and starts compounding.
- **Paul's monorepo** (67 projects, 21 packages) is the test case. If the factory can convert and run this, it works for anyone.

---

## Architecture: Three Pillars

### Pillar 1: Shared Knowledge (The Core)

A structured, growing knowledge base organized by domain. This is the factory's brain — the thing that makes session 50 fundamentally different from session 1.

**Storage:** Structured markdown files with frontmatter (domain, tags, confidence, source project, date, last-verified). Queryable via `search-kit` (SQLite FTS5 with BM25 ranking, snippets, multi-field filtering). Not grep — the panel was unanimous that the knowledge engine's effectiveness is the entire thesis, so don't handicap it with the weakest query mechanism when a better one already exists in the platform.

**Index:** A lightweight SQLite database (via search-kit) that indexes all knowledge entries. The markdown files are the source of truth; the index is rebuilt from them. This gives us full-text search with ranking while keeping the underlying data human-readable and git-trackable.

**Four capabilities:**

1. **Capture** — At session end, the AI proposes knowledge entries learned during the session. Human approves or rejects each one. Approved entries are written as structured markdown files and indexed. No auto-capture — the human gates quality. This prevents the noise accumulation that killed the old system.

2. **Research** — When the factory detects a knowledge gap ("you're building a scraper for NYC housing data but have no domain knowledge about HPD"), it does deep structured research. Sources, confidence levels, gotchas, practical recommendations. Output goes into the same knowledge store. Research can also be triggered manually or via teek personas exploring a domain.

3. **Inject** — SessionStart hook reads the current project context (directory, dependencies, what you're working on), queries the knowledge index, and injects the most relevant entries. This is the one hook that must work from day one. It replaces "hope Claude reads the right file" with "the system automatically loads what you need."

4. **Curate** — Scheduled job (via `job-queue`) that maintains knowledge quality. Flags entries not accessed in 90 days. Detects near-duplicate entries. Tracks which entries are actually used in sessions (via `analytics-kit`). Surfaces curation decisions to the human — the factory proposes, the human disposes.

**Knowledge entry format:**
```markdown
---
domain: cloud-run
tags: [sqlite, gcs-fuse, journal-mode]
confidence: high
source_project: kithome
date: 2026-03-15
last_verified: 2026-03-15
times_injected: 0
times_useful: 0
---

SQLite with GCS FUSE cannot handle WAL mode — must use DELETE journal
mode. Attempting WAL breaks cloud deployments silently (writes succeed
locally but don't persist after container restart).

**Context:** Discovered during kithome Cloud Run deployment. The default
better-sqlite3 configuration enables WAL. Must explicitly set
`PRAGMA journal_mode=DELETE` at connection time.

**Applies when:** Any project using SQLite + Cloud Run + GCS FUSE mount.
```

### Pillar 2: Shared Code

Scanner scripts analyze all projects, find duplicated patterns, identify the best implementation, extract into shared packages, and wire all projects to use the shared version.

**The scanner** is real TypeScript tooling (built on `etl-kit` patterns) that produces structured JSON:
- Per-project: language/framework, dependency map, infrastructure patterns, external data sources, code fingerprints for near-duplicate detection
- Cross-project: pattern frequency map, shared code candidates, dependency overlap, platform map
- New factory capability needed: `code-analysis-kit` (AST parsing, fingerprinting, similarity scoring)

**The extraction process:**
1. Scanner identifies candidates (mechanical, deterministic)
2. AI evaluates candidates and recommends standardization (judgment call — human-reviewed)
3. Human approves the extraction plan
4. Factory extracts the shared package with tests and types
5. Factory wires one project first (canary), verifies it works
6. Factory propagates to remaining projects incrementally
7. Shared package gets semver versioning from day one

**Rollback:** Every extraction is a git commit (or series of commits). Every dependent project pins to a specific version. If a shared package breaks, projects can pin to the previous version while the fix is developed. The `event-bus` notifies dependent projects when a shared package updates. `watch-kit` monitors for breaking changes.

### Pillar 3: Shared Process

The factory loop that drives every project end-to-end:

**Station 1: Idea Intake**
- Input: idea (verbal, card, signal)
- Process: factory evaluates against knowledge base + stack capabilities. Teek personas pressure-test. Deep research fills gaps.
- Output: validated scope with knowledge prerequisites identified
- Defect: idea proceeds without knowledge check

**Station 2: Knowledge Injection**
- Input: project context (directory, dependencies, scope)
- Process: SessionStart hook queries knowledge index, selects relevant entries, injects into session context
- Output: targeted briefing (30-50 lines, not 1,200)
- Defect: irrelevant entries injected (precision < target)

**Station 3: Scaffold**
- Input: validated scope + knowledge
- Process: factory scaffolds from shared packages and templates. Wires dependencies. Generates project CLAUDE.md.
- Output: project skeleton that builds and runs
- Defect: scaffold doesn't build, or uses wrong shared packages

**Station 4: Build**
- Input: skeleton + knowledge + human direction
- Process: human + AI collaborative build. Scout → Build → Review → Decide loop. Knowledge informs every decision.
- Output: working feature code
- Defect: bug, knowledge gap that should have been caught

**Station 5: Test**
- Input: code
- Process: automated test execution
- Output: test results (pass/fail)
- Defect: tests pass but behavior is wrong

**Station 6: Deploy**
- Input: tested code
- Process: automated deployment (Cloud Run, TestFlight, or whatever the factory supports)
- Output: live product
- Defect: deploy failure, configuration error

**Station 7: Polish**
- Input: deployed product + human feedback
- Process: factory shifts to collaboration mode. UX refinement, edge cases, performance. Teek personas can review from different angles.
- Output: production-quality product
- Defect: polish introduces regressions

**Station 8: Extract**
- Input: shipped project
- Process: scanner identifies new shared code candidates. AI proposes knowledge entries. Human approves.
- Output: new shared packages, new knowledge entries
- Defect: valuable pattern not captured, noise captured

Each station has a cycle time and defect rate tracked by `analytics-kit`. The bottleneck station determines the factory's throughput.

---

## The Conversion Engine (How You Get In)

For users with existing projects who want to start building the factory way.

### Phase 1: Scan

Mechanical TypeScript scripts (built on `etl-kit`) analyze every project:
- Language/framework detection
- Dependency map (imports, external packages)
- Infrastructure patterns (deploy configs, DB access, auth, API clients)
- External data sources (APIs, scraped sites, datasets)
- Code fingerprints for near-duplicate detection across projects

Output: structured JSON per project + cross-project analysis (pattern frequency, shared code candidates, dependency overlap, platform map).

Deterministic. Run twice, get the same result.

### Phase 2: Analyze

AI reads scanner output and makes judgment calls:
- **Standardization recommendations:** which implementation is best and why
- **Extraction candidates:** what to pull into shared packages
- **Kill list:** dead projects, redundant projects, projects that overlap
- **Knowledge harvest:** domain expertise embedded in code, comments, READMEs, configs
- **Efficiency suggestions:** consolidation opportunities, architecture improvements

Output: a **conversion plan** — structured document with every proposed change.

**Critical: every judgment call is human-reviewed.** The AI proposes, the human approves. No bulk-automated migrations without explicit approval. The staff engineer was clear: AI judgment calls about architecture are unreliable. The human stays in the loop.

### Phase 3: Build Sandbox

The factory creates a new repo (or restructures an existing one) according to the approved plan:
- Shared packages extracted with tests, types, semver versioning
- Projects restructured to import from shared code
- Deploy automation generated from detected patterns
- Knowledge base bootstrapped from harvested domain expertise
- Hook scripts installed and configured
- Factory config generated (supported stack, standards, conventions)

**The sandbox is a working repo.** Every project in it builds and runs. If it doesn't, the conversion failed.

### For New Users (No Existing Projects)

The conversion engine still works — it just has less to scan. The user describes what they want to build. The factory:
1. Researches the domain (deep research → knowledge store)
2. Scaffolds from templates and shared packages
3. Installs hooks
4. The factory starts lean and grows with the user

---

## The Hook System (System Enforcement)

Real shell scripts that run automatically. The structural part that turns "please read this file" into "the system handles it."

### SessionStart — The Factory Boots Up
- Detects project context (cwd, git branch, project CLAUDE.md)
- Checks for uncommitted work from crashed/stuck sessions
- Queries knowledge index for relevant entries (via search-kit)
- Injects a targeted briefing — relevant knowledge only, not everything
- Logs session start event to analytics-kit

### PreCompact — Preserve Memory Before Compression
- Before context compression, saves: decisions made, facts discovered, current task state, knowledge entries used
- Writes to a temp file that PostCompact reads
- This is the highest-value hook after SessionStart — it addresses the exact moment memory is lost

### PostCompact — Restore After Compression
- Re-injects saved state from PreCompact
- Re-injects factory briefing relevant to current work
- Session continues without losing context

### Stop — Session Cleanup
- AI proposes knowledge entries learned during session
- Human approves/rejects each entry
- Approved entries written to knowledge store + indexed
- Scanner runs lightweight diff: any new shared code candidates?
- Updates project CLAUDE.md current state
- Logs session metrics to analytics-kit (duration, stations visited, knowledge used)
- Commits all changes

---

## The PDLC — Measured Against History

The conversion engine (above) is how existing projects get restructured into the factory. The PDLC is how the factory proves itself going forward — by building new projects (and converting existing ones) through the factory system and measuring against the old way. Phase 0 uses the conversion engine's scanner to establish the baseline and bootstrap the knowledge store. Phases 1-4 run new projects through the factory loop and measure improvement.

### The Baseline Dataset

Paul has 70-250 existing projects built the old way. These are the control group. For every existing project, the scanner extracts from git history:
- Time from first commit to first deploy
- Number of sessions (estimated from commit patterns)
- Pattern fingerprints (what code was written from scratch vs. could have been shared)
- Domain knowledge that was rediscovered (same gotchas hit in multiple projects)

This baseline never changes. Every factory project is measured against it.

### The Metrics

**Machine metrics** (is the factory getting faster?):

| Metric | How Measured | Collected By |
|--------|-------------|--------------|
| Sessions to production | Commit history + analytics-kit session logs | Automated |
| Time to first deploy (wall clock) | Git timestamps: first commit → first deploy tag | Automated |
| Code duplication score | Scanner fingerprint comparison across projects | Automated |
| Knowledge injection precision | Entries injected ÷ entries marked useful in session | analytics-kit |
| Research re-done | Research requested that already existed in knowledge store | analytics-kit |
| Standardization score | Distinct patterns per category (auth, deploy, DB, etc.) | Scanner |
| Station cycle time | Time spent at each station per project | analytics-kit |
| Station defect rate | Rework events per station | analytics-kit |

**Output metrics** (is what the factory produces valuable?):

| Metric | How Measured | Collected By |
|--------|-------------|--------------|
| Time to first user | Deploy timestamp → first non-builder user event | analytics-kit or manual |
| Users at 30 days | Active users 30 days after deploy | analytics-kit or manual |
| Revenue generated | Dollars earned per project | Manual |
| Cost per project | LLM tokens + cloud infra + builder time | analytics-kit + billing |
| Factory Leverage Ratio | (Baseline sessions for comparable project) ÷ (Factory sessions) | Computed |

**Human metrics** (what does it feel like?):

| Metric | How Measured | Collected By |
|--------|-------------|--------------|
| Builder journal entry | One paragraph after each project: what surprised, what frustrated, what delighted | Manual |
| Knowledge save rate | % of proposed entries approved vs. rejected (signal of AI proposal quality) | analytics-kit |
| Session felt faster? | Binary yes/no after each session | Manual |
| Known-gotcha avoidance | Did knowledge injection prevent a known mistake? Binary. | Manual |

### The Control Group

To control for the confounder that the builder gets faster through repetition regardless of the factory (AChen's concern):

During Phase 1-2, alternate: build one project WITH the factory, one WITHOUT. Same complexity category. Compare metrics. If factory projects aren't measurably better than non-factory projects of the same type, the factory isn't the cause of improvement.

After Phase 2, if the factory is proven, stop alternating — the control group has served its purpose.

### Go/No-Go Thresholds

Defined BEFORE Phase 1 begins, when we're objective:

**Phase 0 → Phase 1:**
- Scanner successfully analyzes all projects and produces structured output
- Knowledge store bootstrapped with 50+ entries from existing projects
- SessionStart hook runs in <5 seconds and injects relevant entries
- All metrics collection is automated (no manual scorecard filling)

**Phase 1 → Phase 2:** (after 5 factory projects)
- Sessions-to-production is 30%+ lower than baseline for same-category projects
- Knowledge injection precision is 60%+ (more relevant entries than irrelevant)
- Zero bugs from known gotchas (knowledge engine caught them)
- Factory projects measurably outperform control-group (non-factory) projects
- Builder journal entries are net positive (not frustrated by overhead)
- **KILL if:** Factory projects take MORE sessions than baseline, or knowledge injection precision is below 40%

**Phase 2 → Phase 3:** (after 15 total factory projects)
- At least 3 shared packages extracted from real patterns
- Sessions-to-production is 50%+ lower than baseline
- Code duplication score trending down
- At least one factory-produced project has real users
- **KILL if:** Shared package extraction creates more bugs than it solves, or builder stops using the factory voluntarily

**Phase 3 → Phase 4:** (after 35 total factory projects)
- Factory Leverage Ratio is 3x+ (baseline sessions ÷ factory sessions)
- Knowledge store has 200+ curated entries with <10% staleness
- Full factory loop (idea → deploy) achievable in 1-2 sessions for standard projects
- At least one person OTHER than the builder has used the factory and reported results
- **KILL if:** Leverage ratio plateaus below 2x, or the knowledge base is >30% stale

**Phase 4 success:** (after 50+ factory projects)
- Factory Leverage Ratio is 5x+
- The declining curve is real: plot project number vs. sessions-to-production, fit a curve, demonstrate the trend
- Multiple external users have replicated results
- Total factory ROI is positive (cumulative sessions saved > sessions invested in building the factory)

### The Phases

**Phase 0: Establish Baseline + Build Infrastructure**
- Run scanner against full monorepo
- Extract baseline metrics from git history for all existing projects
- Build knowledge store v1 (search-kit index over structured markdown)
- Bootstrap knowledge base from existing projects (scan code, comments, READMEs, existing research, DOMAIN_KNOWLEDGE.md)
- Build and install SessionStart hook
- Build and install Stop hook (knowledge capture)
- Wire analytics-kit for automated metric collection
- Define project categories for fair baseline comparisons (iOS app, web app, API, data pipeline)

**Phase 1: First 5 Projects — Prove Knowledge Injection**
- Build 5 projects through the factory (alternating with control-group projects)
- Focus: does the SessionStart hook make sessions measurably better?
- After each project: automated scorecard + builder journal entry
- End of phase: evaluate against go/no-go thresholds
- Adjust knowledge capture quality based on approval rates

**Phase 2: Next 10 Projects — Prove Code Extraction**
- Scanner has now seen enough projects to identify real extraction candidates
- Extract first shared packages from actual patterns (not guesses)
- Build 10 more projects using shared packages + knowledge engine
- Implement PreCompact/PostCompact hooks
- Direct comparison: "Project X (old way) took 8 sessions. Project Y (same category, factory way) took 2."
- End of phase: evaluate against go/no-go thresholds

**Phase 3: Next 20 Projects — Prove Full Loop**
- Full factory loop operational: idea → research → scaffold → build → deploy → polish → extract
- Teek personas informed by growing knowledge base
- Deep research fills gaps automatically
- Scheduled knowledge curation running (job-queue)
- Shared package update propagation via event-bus
- First external user attempts the factory
- End of phase: evaluate against go/no-go thresholds

**Phase 4: 50+ Projects — Prove Compounding**
- Plot leverage ratio over time. Must be a rising curve.
- The chart: project number on X, sessions-to-production on Y. Old way = flat line. Factory = declining curve.
- Multiple external users reporting results
- Open-source release with full measured evidence
- Total ROI calculation: was building the factory worth it?

### The Scorecard (Per Project)

Automated collection via analytics-kit except where marked manual:

```
Project: [name]
Category: [iOS app / web app / API / data pipeline / other]
Comparable baseline: [most similar old-way project]
Phase: [1/2/3/4]
Control group: [yes/no — was this built without the factory?]

--- Machine Metrics ---
Sessions to production:       [n] (baseline: [n], delta: [%])
Wall-clock time to deploy:    [hours] (baseline: [hours])
Shared packages used:         [n] (list them)
Knowledge entries injected:   [n]
Knowledge entries useful:     [n] (precision: [%])
New knowledge captured:       [n] (proposed: [n], approved: [n])
Bugs from known gotchas:      [n] (target: 0)
New shared code extracted:    [n packages]
Station cycle times:          [intake: Xm, inject: Xs, scaffold: Xm, build: Xh, test: Xm, deploy: Xm, polish: Xh, extract: Xm]
Factory Leverage Ratio:       [baseline sessions / factory sessions]

--- Output Metrics ---
Users at 30 days:             [n] (manual)
Revenue generated:            [$] (manual)
Cost (tokens + cloud + time): [$]

--- Human Metrics ---
Journal entry:                [one paragraph — what surprised, frustrated, delighted]
Session felt faster:          [yes/no]
Known-gotcha avoided:         [yes/no — describe]
```

---

## Teek Integration

The persona and role engine becomes knowledge-informed:

- **Idea evaluation:** Teek personas evaluate ideas with access to the factory's full knowledge base. A "staff engineer" review knows your actual codebase patterns. A "real estate data" expert knows HPD violations are unreliable pre-2010 — because the factory learned that from stuywatch.
- **Domain research:** Teek roles (signal-scout, domain-classifier) can be deployed to research new domains. Findings go into the knowledge store.
- **Architecture review:** Before major decisions, the factory can run a teek panel (like we did during this design) informed by accumulated knowledge.
- **Polish sessions:** After deploy, teek personas (jzhuo for UX, chesky for experience design, shreyas for product thinking) review the output informed by what the factory knows about the user's domain.

---

## What Gets Built On The Factory's Own Capabilities

The Signal Scout identified 8 existing factory capabilities that serve the factory itself. Eat your own cooking:

| Factory Need | Existing Capability | How It's Used |
|-------------|---------------------|---------------|
| Knowledge queries | `search-kit` (FTS5) | Index and search knowledge entries with ranking |
| Metric collection | `analytics-kit` | Automated scorecard, session logging, usage tracking |
| Scanner pipeline | `etl-kit` | Scan projects: scrape → transform → load |
| Knowledge maintenance | `job-queue` | Scheduled curation: flag stale, detect duplicates |
| Package update propagation | `event-bus` | Notify dependent projects when shared code changes |
| Relevance prediction | `predict-kit` | Learn which knowledge entries are relevant per context |
| Breaking change detection | `watch-kit` | Monitor shared packages for breaking changes |
| Knowledge-informed personas | `teek` | Persona reviews enriched with real domain knowledge |

**New capability needed:** `code-analysis-kit` — AST parsing, code fingerprinting, similarity scoring for near-duplicate detection across projects. File a `factory-capability` issue.

---

## Open-Source Design

### What Ships

1. **The factory repo** — scanner scripts, hook scripts, knowledge store format spec, conversion engine, templates, analytics wiring
2. **The measured evidence** — every scorecard from 50+ projects, the declining curve chart, the control group comparison, the journal entries, the ROI calculation
3. **The knowledge store format** — so anyone can build their own knowledge base
4. **The hook scripts** — Claude Code hooks that work out of the box (non-Claude-Code users get the protocol without enforcement)
5. **The teek templates** — persona, role, and agent formats for knowledge-informed evaluation

### What Stays Private

- Paul's actual knowledge base (domain-specific expertise from 70+ projects)
- Paul's project code
- Paul's monorepo configuration

### The Open-Source Story

Not "here's a tool." Instead: "We built 50+ projects through this system. Here's every metric, including the failures. The factory produced [X]x improvement over building without it. Here's the system. Use it."

Evidence, not claims.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Knowledge base becomes noise | High | Critical | Human approval gate, scheduled curation, precision tracking, kill threshold at <40% |
| Shared package extraction introduces bugs | Medium | High | Canary deploys, semver, version pinning, rollback via git |
| Scanner makes wrong standardization call | Medium | High | Every judgment call is human-reviewed, no bulk automation |
| Builder stops using factory (overhead > benefit) | Medium | Critical | Journal entries detect frustration early, kill thresholds enforce honesty |
| Knowledge store scales poorly | Low | Medium | search-kit FTS5 handles thousands of entries, index rebuilt from markdown source |
| GPT-N makes the factory obsolete | Low | Medium | The knowledge base compounds regardless of model capability — institutional memory is model-agnostic |
| Factory optimizes production of things nobody wants | High | Critical | Output metrics (users, revenue) on every scorecard, not just machine metrics |

---

## What This Is Not

- **Not documentation.** The old system was 1,177 lines of markdown that nobody read. The factory is real code, real hooks, real automation.
- **Not a CLI tool.** There's no `npx factory init`. The factory is a repo structure + hook scripts + knowledge engine. The AI does the heavy lifting, not a CLI.
- **Not a one-time migration.** The conversion is how you get in. The living system is what you stay in.
- **Not just for Paul.** The test case is one monorepo. The system is designed to work for anyone with projects they want to compound.

---

## To Resume This Work

This spec is ready for implementation planning. The next step is:

1. Create a detailed implementation plan (writing-plans skill)
2. Start with Phase 0: scanner, knowledge store, SessionStart hook, analytics wiring
3. Define baseline metrics from existing monorepo
4. Begin Phase 1: first 5 factory projects with control group

The factory builds itself by building things through it.
