# teek

AI persona engine. Simulate specific people, think through professional lenses, or run autonomous agents — all via LLM with profile-driven system prompts.

## What It Does

Teek loads structured profiles from the filesystem and uses them to construct LLM conversations where the AI responds *as* that entity. Three kinds:

- **Personas** — Simulations of real people, built from 20-35 verified source URLs each. Naval Ravikant, Paul Graham, Travis Kalanick, Marc Andreessen, Ben Thompson, etc.
- **Roles** — Professional lenses. Staff engineer, product manager, CFO, psychologist, brand designer. Bring domain expertise to any question.
- **Agents** — Autonomous background workers. The Spotter scans the monorepo for compounding opportunities. The GitHub agent handles git ops.

## CLI

```bash
# Ask a persona
pnpm ask --persona travis "Should I pivot or double down?"
pnpm ask --persona pg "How do I find product-market fit?"
pnpm ask --persona naval "Is this a good bet?"

# Ask a role
pnpm ask --role staff-eng "Review this architecture"
pnpm ask --role cfo "What's our burn rate exposure?"

# Interactive mode (maintains conversation history)
pnpm ask --persona chesky
> How do you think about marketplace liquidity?
> What about cold start?
> quit

# List all available entities
pnpm roster
```

## Programmatic API

```typescript
import { loadEntity, buildSystemPrompt, listAll } from "@pauljump/teek";

const entity = await loadEntity("persona", "travis");
const systemPrompt = buildSystemPrompt(entity);
// Pass systemPrompt to any LLM client as the system message
```

## Available Entities

### Personas (16)
Naval Ravikant, Paul Graham, Travis Kalanick, Brian Chesky, Marc Andreessen, Ben Thompson, Bill Gurley, Andrew Chen, Patrick Collison, Alex Karp, Peter Thiel, Shreyas Doshi, Julie Zhuo, Financial Samurai, and others.

Each persona includes a cognitive profile (8 sections) and a `sources.yaml` listing every URL used to build the profile.

### Roles (12)
`staff-eng`, `product-manager`, `engineering-manager`, `principal-eng-google`, `principal-eng-tesla`, `cfo`, `brand-designer`, `copywriter`, `psychologist`, `parent-advocate`, `signal-scout`, `domain-classifier`

### Agents (2)
`spotter` (background factory scanner), `github` (git ops + teaching)

## How Profiles Work

Each entity is a directory containing:
- `profile.md` — The core identity, knowledge, and behavioral instructions
- `sources.yaml` — (Personas only) Every URL used to build the profile
- `context/` — Optional additional markdown files loaded and appended

The system prompt is constructed: kind-specific instructions + profile + context. No hallucination in scope — the profile defines what the entity knows and how it thinks.

## Used In

The factory's evaluation pipeline uses teek personas as a multi-stage gate:
1. **Gate:** 3 personas vote on ideas (2/3 must advance)
2. **Panel:** Domain-specific pairs evaluate deeper — strategy, economics, growth, UX

## Stack

Built on `@pauljump/llm-kit`. Defaults to Anthropic (claude-sonnet-4-6), falls back to OpenAI (gpt-4o).
