# Teek — Agent Ecosystem (`@pauljump/teek`)

## Purpose

Teek is the factory's agent ecosystem. Three kinds of entities live here:

| Kind | What it is | Example | Question it answers |
|------|-----------|---------|-------------------|
| **Persona** | Cognitive profile of a real person | Travis Kalanick | "What would *this person* say?" |
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
│       ├── context/    ← world files (company intel, thesis docs)
│       └── signals/    ← raw inputs (emails, articles, notes)
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
pnpm ask "what do you think of vertical SaaS?"           # default persona (travis)
pnpm ask --persona travis "pitch me on this"              # explicit

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
4. Signals go in `personas/<name>/signals/` — raw drop zone

### Role
1. Copy `templates/role-template.md` to `roles/<name>/profile.md`
2. Fill in: perspective, priorities, evaluation style, communication, push-back triggers
3. Add domain context to `roles/<name>/context/` if needed

### Agent
1. Copy `templates/agent-template.md` to `agents/<name>/profile.md`
2. Fill in: mission, trigger, cadence, scope, what to watch for, output format
3. Add reference material to `agents/<name>/context/` if needed

## Rules

1. **Codenames in persona files.** Use codenames, not real names, in all persona files and commits.
2. **Source everything (personas).** Every claim traces to a public source.
3. **Update, don't duplicate.** New info goes into existing files.
4. **Signals are raw.** The `signals/` directory is a drop zone. Claude processes them into the profile on demand.
5. **Narrative Gap is mandatory (personas).** Self-story vs. others' story.
6. **Cognitive Biases are mandatory (personas).** External analysis only.
7. **Agents need triggers.** A profile without trigger/cadence/scope is a role, not an agent.

## Current Roster

### Personas
| Name | Who | Status |
|------|-----|--------|
| travis | Teek (TK) | Active — profile + context + signals |
| pg | the operator Graham | Active — profile + sources (27 URLs) |
| naval | Naval Ravikant | Active — profile + sources (26 URLs) |
| karp | Alex Karp | Active — profile + sources (26 URLs) |
| thiel | Peter Thiel | Active — profile + sources (35 URLs) |
| benthomp | Ben Thompson | Active — profile + sources (26 URLs) |
| gurley | Bill Gurley | Active — profile + sources (27 URLs) |
| achen | Andrew Chen | Active — profile + sources (30 URLs) |
| tk-ops | Travis Kalanick (ops) | Active — profile + sources (27 URLs) |
| shreyas | Shreyas Doshi | Active — profile + sources (26 URLs) |
| finsamurai | Financial Samurai | Active — profile + sources (29 URLs) |
| jzhuo | Julie Zhuo | Active — profile + sources (22 URLs) |
| chesky | Brian Chesky | Active — profile + sources (26 URLs) |
| pmarca | Marc Andreessen | Active — profile + sources (32 URLs) |
| collison | Patrick Collison | Active — profile + sources (30 URLs) |

### Roles
| Name | Lens | Status |
|------|------|--------|
| staff-eng | Senior IC engineering judgment | Active |
| product-manager | Product strategy and prioritization | Active |
| psychologist | Cognitive-behavioral frameworks | Active |
| signal-scout | Capability matchmaker — finds the factory product hiding in an external signal | Active |

### Agents
| Name | Mission | Trigger |
|------|---------|---------|
| spotter | Find compounding opportunities across monorepo | Session start (background) |
| github | Handle git/GitHub ops while teaching the operator the mental model | Any git/GitHub operation or question |

## Git Workflow

Commit to main, no branches.

## How We Build Together

Same as monorepo root — scout first, surface decisions, tight loops.
