# {Project Name}

<!--
  PROJECT CLAUDE.MD TEMPLATE

  Update rules for Claude:
  - Sections marked 🔓 AUTO-UPDATE: Update freely as you work. These are facts.
  - Sections marked 🔒 ASK OPERATOR: Only update with the operator's explicit input.
  - When you discover something that belongs in a 🔒 section, surface it to the operator
    and update only after he confirms.
  - When you update a 🔓 section, mention it briefly ("Updated CLAUDE.md with the new endpoint").
  - Delete this comment block after initial setup.
-->

## What This Is
<!-- 🔒 ASK OPERATOR — this is the product vision, not a technical summary -->

(One paragraph. What problem does this solve, for whom, and why does it matter.)

## How We Build Together

This project follows the monorepo collaboration protocol. See root `CLAUDE.md` for the full version. The short version:

1. Scout first, code never — investigate and present before building
2. Surface every decision — no stealth choices
3. Tight loops — check in after meaningful progress
4. the operator's "this feels wrong" is your most valuable signal
5. **Git: commit to main, no branches** — no feature branches, no worktrees. Push directly to main. Always.
6. **Session handoff** — when the operator ends a session, update `## Current State` below with what shipped, what's next, and what's blocking. See `.claude/playbooks/session-handoff.md`.

## Architecture
<!-- 🔓 AUTO-UPDATE as code changes -->

(How the system works. Data flow, key patterns, major components. Update this as the architecture evolves.)

### Key Files
<!-- 🔓 AUTO-UPDATE -->

| File | Purpose |
|------|---------|
| | |

### Stack
<!-- 🔓 AUTO-UPDATE -->

(Languages, frameworks, major dependencies.)

## Build & Run
<!-- 🔓 AUTO-UPDATE -->

```bash
# How to start/build/test this project
```

## What Runs Where
<!-- 🔓 AUTO-UPDATE -->

| Component | Environment | URL/Location |
|-----------|-------------|--------------|
| | | |

## External Dependencies
<!-- 🔓 AUTO-UPDATE -->

(APIs, services, databases this project talks to. What can break that we don't control.)

## Design Principles
<!-- 🔒 ASK OPERATOR — these are product decisions -->

(Rules that guide what we build and how. Hard constraints. The "why" behind architectural choices.)

## What NOT to Build
<!-- 🔒 ASK OPERATOR — only the operator adds to this list -->

(Explicit scope boundaries. Features we've decided against and why.)

## Critical Gotchas
<!-- 🔓 AUTO-UPDATE — add here when you hit something painful -->

(Platform quirks, non-obvious bugs, things that cost you 20+ minutes to figure out. Save the next session from the same pain.)

## Naming Conventions
<!-- 🔓 AUTO-UPDATE as patterns emerge -->

(Language-specific naming rules, file naming patterns. Only add when the project is large enough to need consistency.)

## Current State
<!-- 🔓 AUTO-UPDATE every session -->

**Status:** (exploring / building / shipping / maintaining)
**Last updated:** YYYY-MM-DD
**What just shipped:**
**What's next:**
**What's blocking:**

## Success Metrics
<!-- 🔒 ASK OPERATOR — he defines what winning looks like -->

(How do we know this project is working? Concrete targets, not vibes.)
