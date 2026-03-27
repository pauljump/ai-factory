# Koba Knowledge System Redesign

**Date:** 2026-03-27
**Status:** Designed — approved by Paul
**Trigger:** Ran `koba convert` against real monorepo (75 projects, 19 packages). Comparison revealed Koba captures ~20% of what makes the monorepo work. The other 80% — doctrine, playbooks, research, templates, soul — gets left behind.

---

## The Problem

Koba treats knowledge as **extracted bullet points in a SQLite FTS5 database.** The monorepo treats knowledge as **living documents with narrative context.** The result: 387 "knowledge entries" where 70% are fragments that lose meaning outside their source CLAUDE.md.

Examples of low-quality entries the current system produces:
- `"LLM-powered analysis (Claude API)"` — a label, not knowledge
- `"api-kit -> createApp(), getDb(), parseEnv()"` — an API reference already in the README
- `"TypeScript, minimal dependencies"` — tells you nothing

Examples of what the monorepo has that Koba misses entirely:
- 17 playbooks (200+ line workflows with judgment calls and gotchas)
- 39 research directories with deep competitive/technical analysis
- A 400-line root CLAUDE.md that functions as an operating system
- A soul file that defines how the AI collaborates
- An idea pipeline with 232 runnable cards
- A data streams registry with 100+ external sources
- Templates for new projects, ideas, research topics

---

## The Redesign: Four Layers

Knowledge in Koba has a hierarchy. Each layer feeds the one above it.

```
Doctrine (soul.md + CLAUDE.md)     <- how we work (rarely changes)
    |
Playbooks (playbooks/)             <- how we solve specific problems (evolves with patterns)
    |
Knowledge (knowledge/)             <- specific facts that inform playbooks (changes frequently)
    |
Research (research/)               <- deep dives that inform decisions (archived, rarely revisited)
```

Movement between layers:
- Research produces insights -> some become knowledge entries
- Knowledge entries that cluster around a pattern -> become a playbook
- Playbooks that reveal a recurring philosophy -> update the doctrine
- Doctrine tells you which playbooks to write
- Playbooks tell you what knowledge to harvest
- Knowledge gaps tell you what to research

**Koba's job is to watch for movement between layers.**

---

## Layer 1: Doctrine (CLAUDE.md + soul.md)

### CLAUDE.md as Operating System

The generated CLAUDE.md has two halves:

**Human half** (never overwritten by `koba scan`):
- How We Work — roles, the collaboration loop, principles
- What NOT to Build — constraints and philosophy
- Design Principles — product-level decisions
- Success Metrics

**Machine half** (auto-regenerated):
- Stack, projects, packages (existing)
- Playbook index (new)
- Convention summary — extracted from patterns across projects (new)
- Health signals — stale projects, unused packages, outdated playbooks (new)

### Convention Extraction (new capability)

During `koba convert`, read all project CLAUDE.md files and find repeated patterns:
- 60/75 projects say "commit to main, no branches" -> factory convention
- 12 projects use the same TestFlight pipeline -> factory convention
- Every project CLAUDE.md has a "Current State" section -> factory convention

Surface to user: "I detected these conventions. Want to codify them?"
Codified conventions go into the doctrine section and propagate back to every project via `koba scan`.

### The Soul

Every factory has a soul file at `.koba/soul.md`.

- **During `koba init`:** Starts as a functional template
- **During `koba convert`:** Seeded from collaboration patterns in source CLAUDE.md files
- **During ongoing use:** Evolves via Stop hook proposals ("You've been corrected about X 3 times — add to soul?")
- **Injected at SessionStart** before any project context — first thing Claude reads

---

## Layer 2: Playbooks

### What a playbook is

A playbook is **executable knowledge** — a complete workflow with steps, judgment calls, gotchas, and project-specific notes. It's not a fact. It's a capability.

### Playbook structure

```markdown
---
name: Cloud Run Deploy
triggers: [dockerfile, gcloud, cloud-run]
projects_using: [polyfeeds, populus, scoop, kithome]
last_verified: 2026-03-27
confidence: high
---

## When to use this
[auto-generated from project patterns]

## The recipe
[generalized steps with decision points]

## Project-specific notes
[harvested from individual CLAUDE.md files]

## Gotchas
[aggregated from all projects that use this pattern]
```

`projects_using` is the compounding signal. Growing = more valuable. Deviation = either a playbook bug or a fork.

### How playbooks get created

**Option A: Koba ships generalized templates.** Not the user's playbooks, but the patterns underneath them:

```
playbooks/
  _templates/              <- ships with koba (the product)
    deploy-cloud.md        <- "deploying a containerized app"
    deploy-ios.md          <- "getting an iOS app to TestFlight"
    deploy-local.md        <- "running on your own hardware"
    data-pipeline.md       <- "fetching external data reliably"
    auth-pattern.md        <- "adding auth to an API"

  cloud-run-deploy.md      <- YOUR version, populated from YOUR context
  ios-testflight.md        <- YOUR version, populated from YOUR context
```

**Option B: Detected during convert.** If the source has playbooks (`.claude/playbooks/`), copy them as the factory's starting playbooks. If not, detect patterns and suggest playbook creation.

**Option C: Emerge during use.** The two-strike rule, automated:
- Same problem solved in 2 projects -> "This looks like a playbook candidate"
- A workflow takes 20+ minutes to figure out -> "Save as playbook?"
- You deviate from an existing playbook -> "Update the playbook?"

All three should exist. Templates are the floor. Convert brings existing playbooks. Ongoing use grows new ones.

### Playbook maintenance

Playbooks rot. A playbook last verified 6 months ago with a framework that's moved 3 versions is dangerous.

`koba scan` should:
- Flag playbooks not verified in 90+ days
- Flag playbooks whose `projects_using` list has shrunk (projects removed or dead)
- Flag playbooks that conflict with current project configs
- Update `projects_using` lists from scan results

---

## Layer 3: Knowledge (redesigned)

Knowledge entries still exist, but their job changes. Instead of being the primary knowledge store, they're **facts that feed into playbooks.**

### What changes

**Harvesting gets smarter.** Instead of extracting every bullet from "Gotchas" and "Architecture" sections, the harvester should:
1. Check if a bullet belongs in an existing playbook -> file it there
2. Check if a bullet clusters with other entries -> suggest a playbook
3. Only create standalone knowledge entries for genuinely isolated facts

**Quality gate.** Entries under 30 characters are almost always useless. Entries that are just labels ("TypeScript, minimal dependencies") get filtered out. Entries that reference a specific API or config that's already in the code get filtered out.

**Domain taxonomy gets richer.** Current domains: architecture, critical-gotchas, docker-gotchas, two-database-architecture. That's just what the section headers happened to be. Real domains should be:
- infrastructure (deploy, hosting, networking)
- data (sources, pipelines, formats)
- platform (iOS, web, watchOS specifics)
- integration (APIs, third-party services)
- gotchas (cross-cutting pain points)

---

## Layer 4: Research

Research is deep analysis that informs decisions. It doesn't get injected at SessionStart — it's pulled when needed.

### During convert

If the source has a research directory (`.claude/research/` or similar), copy it into the factory's `research/` directory. Tag by topic. These are the factory's institutional memory.

### During ongoing use

When a Claude session does significant research (competitive analysis, architectural debate, technology evaluation), the Stop hook should propose saving it to `research/`.

Research doesn't rot the same way playbooks do — a competitive analysis from 6 months ago is still useful context even if the market has shifted.

---

## What changes in `koba convert`

The convert command goes from "copy files, extract bullets" to a multi-phase intelligence operation:

### Phase 1: Discover (existing)
Find projects, packages, frameworks, git activity.

### Phase 2: Harvest conventions (new)
Read all CLAUDE.md files. Find repeated patterns:
- Git workflow conventions
- Deploy patterns
- Naming conventions
- Collaboration patterns
- Structural patterns (what sections appear in every CLAUDE.md)

Surface to user, codify approved conventions into root CLAUDE.md doctrine.

### Phase 3: Activate playbooks (new)
Detect which playbook templates are relevant:
- iOS projects found -> ios-testflight playbook
- Dockerfiles found -> cloud deploy playbook
- Data fetching code found -> data pipeline playbook

If source has existing playbooks, copy them (they override templates).
Populate playbooks with project-specific gotchas and notes.

### Phase 4: Seed the soul (new)
Read source CLAUDE.md for collaboration patterns:
- Roles defined? Extract them.
- "How We Work" section? Seed the soul.
- Repeated corrections or principles? Include them.

If no collaboration patterns found, use the default soul template.

### Phase 5: Harvest knowledge (existing, upgraded)
Extract knowledge entries but:
- Route playbook-relevant entries INTO playbooks, not flat knowledge
- Apply quality gate (min length, no duplicates of code comments)
- Use richer domain taxonomy

### Phase 6: Copy first-class artifacts (new)
- Research directories -> research/
- Templates -> templates/
- Agent definitions -> agents/
- Data stream registries -> data-streams.md

### Phase 7: Copy projects + packages (existing)
Same as today, with the copy filter.

---

## What changes in ongoing use

### SessionStart hook
1. Inject soul (always, first)
2. Inject relevant playbooks (matched by project framework + stack)
3. Inject relevant knowledge entries (existing behavior, improved)

### Stop hook
1. Log session metrics (existing)
2. Propose new knowledge entries (existing)
3. **Detect playbook moments:**
   - Problem solved that matches no existing playbook -> "Save as playbook?"
   - Same pattern as another project -> "Extract to shared playbook?"
   - Deviated from existing playbook -> "Update playbook?"
4. **Detect doctrine moments:**
   - Convention violated or established -> "Update factory conventions?"
   - Soul correction received -> "Update soul?"

### `koba scan`
1. Regenerate CLAUDE.md machine sections (existing)
2. **Detect convention drift** — projects whose CLAUDE.md diverges from factory doctrine
3. **Playbook health** — flag stale, shrinking, or conflicting playbooks
4. **Knowledge quality** — flag orphaned entries that don't connect to any playbook

---

## Implementation sequence

1. **Playbook system** — templates, structure, activation during convert, scan integration
2. **CLAUDE.md doctrine** — convention extraction, human/machine split, propagation
3. **Soul** — template, seeding during convert, SessionStart injection, Stop evolution
4. **Research layer** — copy during convert, propose-to-save during Stop
5. **Knowledge upgrade** — quality gate, playbook routing, richer taxonomy
6. **Ongoing detection** — Stop hook playbook/doctrine moments, scan health checks

Each phase delivers standalone value. Phase 1 (playbooks) is the highest-impact change.

---

## Success criteria

After this redesign:
- `koba convert` against the monorepo should capture ~80% of what makes the factory work (up from ~20%)
- The generated CLAUDE.md should be an operating manual, not a dashboard
- A new Claude session in the factory should get: soul + relevant playbooks + relevant knowledge (in that order)
- Playbooks should grow organically as you work, not just during convert
- A cold-start session should be nearly as productive as a warm one
