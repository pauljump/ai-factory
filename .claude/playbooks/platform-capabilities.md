# Playbook: Platform Capabilities

How to add, modify, and maintain shared code in `packages/`. The goal is simple: shared code should make every app faster to build without breaking existing apps.

Learned from: multiple package extraction sessions

## What Is a Platform Capability

Code that lives in `packages/` and benefits multiple projects. It's the factory floor — reusable primitives that make launching the next app trivially easy.

**Platform code** (lives in `packages/`):
- Server framework, database helpers, auth (`api-kit`)
- LLM client that works with any provider (`llm-kit`)
- Data access patterns for government APIs (`socrata-kit`)
- Anything where fixing a bug or adding a feature should ripple to all consumers at once

**App code** (lives in `<project>/`):
- Business logic specific to one product
- UI components branded for one app
- Routes, handlers, domain models that only make sense in context

**Templates** (also in `packages/`, but different):
- `ios-templates` and `web-templates` are copyable starters, not importable packages
- You copy them into your project and customize — they don't stay linked
- Changes to templates only affect new projects, not existing ones

The line is clear: if two apps would benefit from the same fix, it's platform code. If only one app cares, it's app code.

## Proposing a New Capability

### The Two-Strike Rule

Don't preemptively build shared code. Wait until the same problem shows up in two projects as copy-pasted custom code. That's your signal.

### Process

1. **Spot the pattern.** You solved the same problem twice — or the Spotter flagged it.
2. **File a GitHub Issue** with label `factory-capability`. Describe what capability is needed and which projects would benefit.
3. **Scout existing implementations.** Before designing the abstraction, read how each project solved it. The best shared code is extracted from working code, not designed in the abstract.
4. **Get approval before building.** Present the proposal: what it does, what it exports, which projects consume it, what the API looks like. No code until green light.

### After a New Capability Ships

Update these before closing the `factory-capability` issue:

1. **"Platform Capabilities Today"** in the monorepo CLAUDE.md
2. **"Choosing a Platform"** in the monorepo CLAUDE.md — add "use when" guidance
3. **Stack Profile** in `.claude/templates/idea-card.md` — add the new checkbox
4. **Write or update a playbook** if the capability has a build/deploy workflow
5. **Scan existing idea cards** — flag any blocked ideas this capability unblocks

A capability that isn't documented doesn't exist.

## Modifying an Existing Capability

### Before You Touch Anything

1. **Read the package README.** Understand what it exports and how consumers use it.
2. **Find all consumers.** Grep for the import across the monorepo:
   ```bash
   grep -r "@pauljump/api-kit" --include="*.ts" --include="*.json" -l
   ```
3. **Understand the blast radius.** A one-line change to `createApp()` can break every API in the monorepo.

### Making Changes

**Backwards-compatible changes (default path):**
- Adding new exports, new optional parameters, new functions
- These are safe — existing consumers don't break
- Update the package README with new exports or changed behavior
- Test against at least one consuming project before committing

**Breaking changes (requires migration):**
- Renamed exports, removed functions, changed signatures
- Plan the migration before writing code
- Update ALL consuming projects in the same commit
- The monorepo must never be in a state where `pnpm install && pnpm build` fails

### Commit Checklist

- [ ] Package code updated
- [ ] Package README updated with new/changed exports
- [ ] At least one consuming project tested
- [ ] If breaking: all consumers updated in same commit
- [ ] Monorepo CLAUDE.md architecture section updated (if exports changed)

## Package Requirements

Every package in `packages/` must meet these requirements:

1. **Lives under `@pauljump/` namespace.** Package name in `package.json` is `@pauljump/<name>`.
2. **Has a README** documenting: purpose (one sentence), what it exports, usage examples.
3. **Registered in `pnpm-workspace.yaml`** — already covered by the `packages/*` glob.
4. **Listed in the monorepo CLAUDE.md** architecture section with a description of what it provides.

Templates (`ios-templates`, `web-templates`) follow the same rules except they're copied, not imported. Their READMEs document what to copy and how to customize.

## Current Platform Capabilities

| Package | Type | What It Does |
|---------|------|-------------|
| `@pauljump/api-kit` | npm package | Server framework (`createApp`), SQLite (`getDb`), JWT auth (`registerAuth`), cron (`startCron`), HTTP client (`fetchJSON`), env validation (`parseEnv`) |
| `@pauljump/llm-kit` | npm package | Provider-agnostic LLM client. Supports OpenAI + Anthropic. Standard chat + tool use interface — swap providers with zero code changes |
| `@pauljump/socrata-kit` | npm package | Government open data API wrapper (Socrata/SODA). Query, paginate, cache civic datasets |
| `@pauljump/geo-registry` | npm package | Geographic data with H3 hex grid support. Boundary lookups, spatial indexing |
| `@pauljump/pods-kit` | npm package | Pods and streaming data structures for real-time data flow |
| `ios-templates` | copyable starters | Swift files for new iOS/watchOS apps: APIClient, Theme, StoreKit, Watch Connectivity, video player |
| `web-templates` | copyable starters | Next.js files for new web apps: globals.css (HSL tokens), layout, button component, Dockerfile, Tailwind config |

## Common Mistakes

**"I'll just add this to api-kit real quick."** Stop. Is it something every API needs, or something your app needs? If it's app-specific, it lives in your project directory. The bar for platform code is: multiple consumers benefit.

**"I'll make a breaking change and fix consumers later."** No. Fix them now, in the same commit. A broken monorepo wastes everyone's time — including future Claude sessions that pull and immediately hit errors.

**"I don't need to update the README."** You do. The next session won't know about your new export. Undocumented capabilities don't exist.

**"This is too small to extract."** If it's genuinely small (a utility function, a type), maybe. But if you're about to copy-paste it into a third project, extract it. Small things compound.
