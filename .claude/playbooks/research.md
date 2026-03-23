# Playbook: Research

Research is expensive. Every web search, source read, and synthesis costs tokens and time. This playbook ensures we never pay that cost twice.

## The Rule

**Check before you search. Extend before you redo. Save everything.**

## Where Research Lives

```
.claude/research/
├── spawn-psychology/
│   ├── report.md        ← synthesized findings (read this first)
│   ├── sources.md       ← raw excerpts, quotes, data
│   └── meta.json        ← when, why, staleness
├── music-personality/
│   ├── report.md
│   ├── sources.md
│   └── meta.json
└── ...
```

Each topic gets a directory. Directory name is a kebab-case slug describing the topic.

## The Workflow

### 1. Check — Before Any Research

Before spending tokens on research, check what exists:

```
ls .claude/research/
```

Scan directory names. If the topic (or something adjacent) exists, read the report first. You may already have what you need.

### 2. Read — Assess What We Have

Read `report.md` for the synthesized findings. Check `meta.json` for:
- `researched_at` — when was this done? Is it likely stale?
- `triggered_by` — why was it researched? Same context as now?
- `confidence` — how thorough was the original research?
- `extensions` — has it been updated since the original?

If the report answers your question, stop. Use it. Don't re-research.

### 3. Decide — Do We Need More?

Research is **sufficient** if:
- The report covers your specific question
- The sources are credible and cited
- The `researched_at` date is recent enough for the domain (psychology = years, API docs = weeks)
- Confidence is "high" or "medium" and you're not making a critical decision

Research needs **extending** if:
- Your question is adjacent but not directly covered
- The report is old and the domain moves fast
- Confidence is "low" and you need to act on this
- You found something that contradicts the existing findings

Research needs **starting fresh** if:
- No existing topic is even close
- The existing research was on a fundamentally different question

### 4. Research — Do the Work

When researching:
- **Use the Agent tool** with a detailed prompt. Be specific about what you need.
- **Save raw data.** Every quote, excerpt, data point, URL goes into `sources.md`. This is the evidence layer — it's what lets future sessions verify or extend without re-fetching.
- **Synthesize into `report.md`.** Follow the template at `.claude/templates/research-topic.md`. Lead with findings, not process.
- **Create `meta.json`** with the metadata (see format below).

### 5. Extend — Adding to Existing Research

When extending existing research:
- **Append to `sources.md`** — add new sources with a date header
- **Update `report.md`** — integrate new findings into existing sections, or add new sections
- **Update `meta.json`** — add an entry to the `extensions` array
- **Don't delete old findings** unless they're proven wrong. Mark contradictions explicitly.

### 6. Use — Applying Research

When using research in a session:
- Reference the report path so it's traceable: "Per `.claude/research/spawn-psychology/report.md`..."
- If you discover something that updates the research during building, note it — update the report at the end of the session, not mid-flow
- If the research drove a product decision, note that in the report's implications section

## File Formats

### meta.json

```json
{
  "topic": "Human-readable topic name",
  "slug": "kebab-case-directory-name",
  "researched_at": "2026-03-11",
  "triggered_by": "What prompted this research — e.g., 'onboarding UX design'",
  "confidence": "high | medium | low",
  "token_estimate": "rough estimate of tokens spent on this research",
  "related_projects": ["my-project"],
  "tags": ["psychology", "ux", "onboarding"],
  "extensions": [
    {
      "date": "2026-03-15",
      "reason": "Added anthropomorphism research after user testing",
      "sections_updated": ["report.md § Anthropomorphism", "sources.md"]
    }
  ]
}
```

### report.md

Use the template at `.claude/templates/research-topic.md`. Key rules:
- **Lead with findings, not process.** Don't say "I searched for X and found Y." Say "Y."
- **Be opinionated.** Research that says "it depends" is useless. Say what the evidence points to and flag where it's uncertain.
- **Keep it scannable.** A session should be able to read the report in 30 seconds and know if it's relevant.
- **Cite inline.** Reference sources by name/author, not just URLs. "Todorov's thin-slicing research shows..." not "according to [1]..."

### sources.md

Raw material. Structure:

```markdown
## Source: {Author/Title} ({Year})
**URL:** {url}
**Type:** {paper | article | book | documentation | interview}
**Key excerpts:**
> Direct quotes or close paraphrases of the most relevant passages.

**What this tells us:** {1-2 sentence summary of why this source matters}

---
```

Save generously here. This is the cheap part — text is small. The expensive part is finding and reading the sources in the first place. Future sessions can skim `sources.md` to decide if they need to re-read the original.

## When to Research

Research is warranted when:
- We're designing something new and the design depends on understanding human behavior, technical constraints, or market context
- The operator asks "can you look into..." or "what does the research say about..."
- We're about to make an irreversible decision and want evidence
- We've hit a design disagreement and need external input to break the tie

Research is NOT warranted when:
- The answer is in our codebase or documentation
- It's a simple technical question (use docs, not research)
- We're bikeshedding — research can be a procrastination tool

## Compounding

Every research topic is a permanent asset. The goal: session 50 never re-researches what session 5 already covered. The research library grows over time and becomes a knowledge base that makes every future decision faster and better-informed.

When research from one project applies to another, note it in both project's CLAUDE.md files. Research is monorepo-level, not project-level.
