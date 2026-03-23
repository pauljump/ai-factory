# koba237

The factory pipeline. Takes idea cards through a multi-stage AI evaluation, then scaffolds and deploys projects.

Named after 工場 (kōba) — Japanese for "workshop" or "factory."

## How It Works

An idea starts as a markdown card with frontmatter (problem, concept, MVP, open questions). Koba enriches it by running the idea through a 12-persona advisory board — each persona is a real person's thinking model built from verified source material (via `@pauljump/teek`).

### Pipeline Stages

**Stage 1 — Gate (3 personas)**
Naval Ravikant, Paul Graham, and Travis Kalanick evaluate the idea. 2/3 must vote to advance. This kills ~70% of ideas early.

**Stage 2 — Panel (domain-specific pairs)**
Ideas that pass the gate get deeper analysis from domain-relevant personas. Ben Thompson on platform dynamics, Bill Gurley on unit economics, Andrew Chen on growth loops, etc.

**Stage 3 — Factory Scanner**
Maps the idea against the factory's capability ledger. Which packages already solve parts of this? What's missing? Outputs a stack profile and feasibility assessment.

### Post-Enrichment
- **Roadmap generation** — monetization, pricing, GTM strategy
- **HTML visualization** — browse enrichment results in the browser

## CLI

```bash
# Enrich an idea through the advisory board
pnpm koba enrich IDEA-080

# Generate roadmap (requires enrichment first)
pnpm koba roadmap IDEA-080

# View enrichment results in browser
pnpm koba view IDEA-080
pnpm koba view          # view all

# Print current factory capability ledger
pnpm koba ledger
```

## Advisory Board

| Persona | Lens |
|---------|------|
| Naval Ravikant | Leverage, specific knowledge, compounding |
| Alex Karp | Mission weight, conviction, pain tolerance |
| Paul Graham | Organic ideas, schlep, "do things that don't scale" |
| Andrew Chen | Growth loops, cold start, retention |
| Travis Kalanick | Operations, supply side, day-one playbook |
| Shreyas Doshi | Ruthless MVP scope, LNO, pre-mortems |
| Ben Thompson | Value chains, aggregation, platform dynamics |
| Bill Gurley | Revenue quality, unit economics, take rates |
| Peter Thiel | Monopoly, secrets, 10x better, contrarian |
| Financial Samurai | Consumer willingness to pay, price reality |
| Julie Zhuo | UX quality, obviousness, design craft |
| Brian Chesky | 11-star experience, AI-native, belonging |

## Results

149 ideas processed. 47 advanced. 101 killed. The filter is the feature.

## Stack

TypeScript, `@pauljump/teek` for personas, Claude CLI for LLM calls.
