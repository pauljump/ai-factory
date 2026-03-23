# Teek — Agent Ecosystem (`@pauljump/teek`)

## Purpose

Teek is the factory's agent ecosystem. Three kinds of entities live here:

| Kind | What it is | Example | Question it answers |
|------|-----------|---------|-------------------|
| **Persona** | Cognitive profile of a domain expert | Operations Executive | "What would *this expert* say?" |
| **Role** | Functional professional lens | Staff Engineer | "What would *someone in this role* say?" |
| **Agent** | Proactive factory worker | The Spotter | "What needs to be done right now?" |

**Personas** are predictive — sourced from public material, structured for simulation.
**Roles** are advisory — bring depth of expertise to any question.
**Agents** are active — they have triggers, cadence, scope, and output formats. They act, not just advise.

## How This Works

```
packages/teek/
├── src/
│   ├── index.ts        ← clean exports (loadEntity, listAll, buildSystemPrompt)
│   ├── engine.ts       ← core logic: load entities, build system prompts
│   ├── cli.ts          ← interactive CLI (pnpm ask)
│   └── types.ts        ← EntityKind, TeekEntity, AskOptions
├── personas/
│   └── <name>/
│       ├── profile.md  ← cognitive profile (8-section schema)
│       └── context/    ← world files (company intel, thesis docs)
├── roles/
│   └── <name>/
│       ├── profile.md  ← role definition (perspective, priorities, evaluation, style)
│       └── context/    ← optional domain context
├── agents/
│   └── <name>/
│       ├── profile.md  ← agent definition (mission, trigger, cadence, scope, outputs)
│       └── context/    ← optional reference material
└── templates/
    ├── profile-template.md  ← persona template (8 sections)
    ├── role-template.md     ← role template
    └── agent-template.md    ← agent template (includes trigger + cadence + outputs)
```

## Usage

### CLI
```bash
# Personas (default kind)
pnpm ask "what do you think of vertical SaaS?"                  # default persona
pnpm ask --persona ops-execution "pitch me on this"              # explicit

# Roles
pnpm ask --role staff-eng "review this architecture"
pnpm ask --role psychologist "why do users drop off here?"

# Agents
pnpm ask --agent spotter "scan the monorepo"

# List everything
pnpm list
```

### Programmatic (from other packages)
```typescript
import { loadEntity, buildSystemPrompt } from "@pauljump/teek";

const entity = loadEntity("role", "staff-eng");
const prompt = buildSystemPrompt(entity);
// Use prompt as system message with any LLM client
```

## Creating New Entities

### Persona
1. Copy `templates/profile-template.md` to `personas/<name>/profile.md`
2. Fill in all 8 sections from public sources
3. Add context files to `personas/<name>/context/`

### Role
1. Copy `templates/role-template.md` to `roles/<name>/profile.md`
2. Fill in: perspective, priorities, evaluation style, communication, push-back triggers
3. Add domain context to `roles/<name>/context/` if needed

### Agent
1. Copy `templates/agent-template.md` to `agents/<name>/profile.md`
2. Fill in: mission, trigger, cadence, scope, what to watch for, output format
3. Add reference material to `agents/<name>/context/` if needed

## Rules

1. **Source everything (personas).** Every claim traces to a public source.
2. **Update, don't duplicate.** New info goes into existing files.
3. **Narrative Gap is mandatory (personas).** Self-story vs. others' story.
4. **Cognitive Biases are mandatory (personas).** External analysis only.
5. **Agents need triggers.** A profile without trigger/cadence/scope is a role, not an agent.

## Current Roster

### Personas (16)
| Name | Lens | Status |
|------|------|--------|
| ops-execution | Operations, supply side, day-one playbook | Active |
| founder | Organic ideas, schlep, "do things that don't scale" | Active |
| leverage | Leverage, specific knowledge, compounding | Active |
| mission | Mission weight, conviction, pain tolerance | Active |
| contrarian | Monopoly, secrets, 10x better | Active |
| aggregation | Value chains, platform dynamics | Active |
| economics | Revenue quality, unit economics, take rates | Active |
| growth | Growth loops, cold start, retention | Active |
| ops-systems | Operational frameworks, supply-side strategy | Active |
| scope | Ruthless MVP scope, LNO, pre-mortems | Active |
| pricing | Consumer willingness to pay, price reality | Active |
| design | UX quality, obviousness, design craft | Active |
| experience | 11-star experience, design-led, belonging | Active |
| techvision | Tech optimism, platform shifts | Active |
| builder | Infrastructure, developer tools, scaling systems | Active |
| mediator | Conflict resolution, finding hidden agreement | Active |

### Roles (11)
| Name | Lens | Status |
|------|------|--------|
| staff-eng | Senior IC engineering judgment | Active |
| product-manager | Product strategy and prioritization | Active |
| engineering-manager | Team leadership and delivery | Active |
| principal-eng-google | Systems design at scale | Active |
| principal-eng-tesla | Hardware-software integration | Active |
| cfo | Financial strategy and risk | Active |
| brand-designer | Brand identity and visual systems | Active |
| copywriter | Messaging and positioning | Active |
| psychologist | Cognitive-behavioral frameworks | Active |
| signal-scout | Capability matchmaker — maps signals to factory primitives | Active |
| domain-classifier | Categorization and taxonomy | Active |

### Agents (2)
| Name | Mission | Trigger |
|------|---------|---------|
| spotter | Find compounding opportunities across monorepo | Session start (background) |
| github | Handle git/GitHub ops while teaching the operator | Any git/GitHub operation |
