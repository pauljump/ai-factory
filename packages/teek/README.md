# teek

AI persona engine. Simulate domain experts, think through professional lenses, or run autonomous agents — all via LLM with profile-driven system prompts.

## What It Does

Teek loads structured profiles from the filesystem and uses them to construct LLM conversations where the AI responds *as* that entity. Three kinds:

- **Personas** — Domain expert simulations, each built from 20-35 verified source URLs. Covers growth strategy, unit economics, platform dynamics, operations, design, pricing, and more.
- **Roles** — Professional lenses. Staff engineer, product manager, CFO, psychologist, brand designer. Bring domain expertise to any question.
- **Agents** — Autonomous background workers. The Spotter scans the monorepo for compounding opportunities. The GitHub agent handles git ops.

## CLI

```bash
# Ask a persona
pnpm ask --persona ops-execution "Should I pivot or double down?"
pnpm ask --persona founder "How do I find product-market fit?"
pnpm ask --persona leverage "Is this a good bet?"

# Ask a role
pnpm ask --role staff-eng "Review this architecture"
pnpm ask --role cfo "What's our burn rate exposure?"

# Interactive mode (maintains conversation history)
pnpm ask --persona experience
> How do you think about marketplace liquidity?
> What about cold start?
> quit

# List all available entities
pnpm roster
```

## Programmatic API

```typescript
import { loadEntity, buildSystemPrompt, listAll } from "@pauljump/teek";

const entity = await loadEntity("persona", "economics");
const systemPrompt = buildSystemPrompt(entity);
// Pass systemPrompt to any LLM client as the system message
```

## Available Entities

### Personas (16)

| Name | Lens |
|------|------|
| `leverage` | Leverage, specific knowledge, compounding |
| `founder` | Organic ideas, schlep, "do things that don't scale" |
| `ops-execution` | Operations, supply side, day-one playbook |
| `growth` | Growth loops, cold start, retention, distribution |
| `economics` | Revenue quality, unit economics, take rates |
| `contrarian` | Monopoly, secrets, 10x better |
| `aggregation` | Value chains, aggregation, platform dynamics |
| `experience` | 11-star experience, design-led, belonging |
| `scope` | Ruthless MVP scope, LNO, pre-mortems |
| `design` | UX quality, obviousness, design craft |
| `mission` | Mission weight, conviction, pain tolerance |
| `builder` | Infrastructure, developer tools, scaling systems |
| `techvision` | Tech optimism, platform shifts, software eating the world |
| `pricing` | Consumer willingness to pay, price reality |
| `mediator` | Conflict resolution, finding hidden agreement |
| `ops-systems` | Operational frameworks, supply-side strategy, city launches |

Each persona includes an 8-section cognitive profile built from verified source material.

### Roles (11)
`staff-eng`, `product-manager`, `engineering-manager`, `principal-eng-google`, `principal-eng-tesla`, `cfo`, `brand-designer`, `copywriter`, `psychologist`, `signal-scout`, `domain-classifier`

### Agents (2)
`spotter` (background factory scanner), `github` (git ops)

## How Profiles Work

Each entity is a directory containing:
- `profile.md` — The core identity, knowledge, and behavioral instructions
- `context/` — Optional additional markdown files loaded and appended

The system prompt is constructed: kind-specific instructions + profile + context. No hallucination in scope — the profile defines what the entity knows and how it thinks.

## Used In

The factory's evaluation pipeline uses teek personas as a multi-stage gate:
1. **Gate:** 3 personas vote on ideas (2/3 must advance)
2. **Panel:** Domain-specific pairs evaluate deeper — strategy, economics, growth, UX

## Stack

Built on `@pauljump/llm-kit`. Defaults to Anthropic (claude-sonnet-4-6), falls back to OpenAI (gpt-4o).
