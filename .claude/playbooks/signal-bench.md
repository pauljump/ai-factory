# Signal Bench — From Inspiration to Factory Product

> **When to use:** Paul saw something interesting (Twitter thread, GitHub repo, dataset, article, hot take) and wants to figure out what the factory can build with it.

## The Flow

### 1. Capture the Signal

Paul pastes the signal — a URL, text, screenshot, or description of what he saw.

**Your job:** Extract the core signal. Not a summary — the *transferable pattern*. What's the underlying mechanic stripped of its specific domain?

Examples:
- JoshKale/jobs repo → "scrape structured government data → LLM-score every item on a rubric → interactive visualization"
- Twitter thread about gym waitlists → "monitor availability → predict open slots → alert user"
- Article about restaurant inspection data → "public dataset + search + scoring = consumer transparency tool"

### 2. Load Signal Scout

Switch into the `signal-scout` role (see `packages/teek/roles/signal-scout/profile.md`).

```
pnpm ask --role signal-scout "Here's what I saw: [signal]. What does the factory want to build with this?"
```

Or just stay in the current Claude Code session and think through the signal-scout lens: run the capability scan, find the collisions, surface the product.

**The signal-scout sequence:**
1. **Pattern extraction** — what's the transferable shape?
2. **Capability scan** — which factory packages light up? (reference PLATFORM_CAPABILITIES.md)
3. **Combo discovery** — what emerges from combining the lit-up capabilities?
4. **Domain overlay** — put the domain back. Who's the user? What's their pain?
5. **Existing art** — does a sibling project already do this?
6. **One-session test** — can this ship in one session with what we have?

### 3. Jam Session (Optional: Layer a Persona)

If the signal-scout pass surfaces something promising, pressure-test it with a teek persona or role:

- **Travis** (`--persona travis`) — "Is the business model real? What's the distribution wedge? Would you fund this?"
- **Staff Eng** (`--role staff-eng`) — "Is the architecture sound? What breaks at scale? What's the maintenance cost?"
- **Product Manager** (`--role product-manager`) — "Who's the user? What's the smallest useful thing? How do they find it?"
- **Psychologist** (`--role psychologist`) — "Why would someone care about this? What's the emotional hook?"

You can chain them. Signal-scout finds the collision → Travis tests the business → PM sharpens the user → done.

### 4. Graduate to Idea Card (If It Survives)

If the session lands somewhere real, scaffold an idea card:

1. Create card at `open-pawl/system/ideas/cards/IDEA-{next}_slug.md` from template
2. The card should contain the raw materials from the jam:
   - **The Problem** — from the domain overlay step
   - **Core Concept** — from the combo discovery step
   - **MVP** — from the one-session test
   - **Stack Profile** — from the capability scan (checkboxes already filled)
   - **Open Questions** — gaps, kill criteria, things to validate
3. Append to `open-pawl/system/ideas/catalog.csv`
4. Log the signal that inspired it in the card's **Insights** section

### 5. Log the Signal (Even If It Doesn't Graduate)

Not every signal becomes an idea. But every signal that hits the bench should be logged. The pattern library grows even when individual ideas die.

If the signal revealed a useful pattern or capability gap, note it:
- New transferable pattern? Add it to the "Capability Combos" table in `PLATFORM_CAPABILITIES.md`
- Missing capability? File a GitHub Issue labeled `factory-capability`
- Interesting but not buildable yet? Note why in the idea card's Open Questions

## What a Good Session Produces

At minimum:
- **The pattern** — transferable, domain-agnostic, reusable
- **The capability collision** — which factory pieces combine and what emerges
- **The verdict** — build it, park it, or kill it — with clear reasoning

At best:
- A runnable idea card ready for the next build session
- A new entry in the capability combos table
- A factory-capability issue for a gap worth closing

## Anti-Patterns

- **Jumping to "let's build it"** before the capability scan. The factory assessment IS the value.
- **Cloning what you read.** The signal is inspiration, not a spec.
- **Skipping the jam.** One prompt to production skips the thinking. The thinking is the work.
- **Ignoring "no."** "The factory doesn't want to build this" is a valid, valuable outcome.
