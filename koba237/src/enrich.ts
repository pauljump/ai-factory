import { loadEntity, buildSystemPrompt } from "@pauljump/teek";
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import type { KobaManifest } from "./manifest.js";
import { validateManifest } from "./manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(__dirname, "..", "..");

// ─── Idea Card ──────────────────────────────────────────────────────────────

/** Read an idea card by ID (e.g., "IDEA-067") */
export function findIdeaCard(ideaId: string): { path: string; content: string } {
  const cardsDir = join(monorepoRoot, "open-pawl/system/ideas/cards");
  const cardFile = readdirSync(cardsDir).find((f) => f.startsWith(ideaId));
  if (!cardFile) {
    throw new Error(`No idea card found for ${ideaId} in ${cardsDir}`);
  }
  const path = join(cardsDir, cardFile);
  return { path, content: readFileSync(path, "utf-8") };
}

// ─── Factory Capability Ledger ──────────────────────────────────────────────

/** Build a snapshot of factory capabilities for the signal-scout */
export function buildCapabilityLedger(): string {
  const packagesDir = join(monorepoRoot, "packages");
  const playbooksDir = join(monorepoRoot, ".claude/playbooks");

  const lines: string[] = ["# Factory Capability Ledger\n"];

  lines.push("## Packages");
  for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const pkgJson = join(packagesDir, pkg.name, "package.json");
    if (existsSync(pkgJson)) {
      const meta = JSON.parse(readFileSync(pkgJson, "utf-8"));
      lines.push(`- **${meta.name || pkg.name}**: ${meta.description || "(no description)"}`);
    } else {
      lines.push(`- **${pkg.name}**: (template directory — copy, don't import)`);
    }
  }

  lines.push("\n## Playbooks");
  if (existsSync(playbooksDir)) {
    for (const pb of readdirSync(playbooksDir).filter((f) => f.endsWith(".md"))) {
      const content = readFileSync(join(playbooksDir, pb), "utf-8");
      const title = content.match(/^#\s+(.+)$/m)?.[1] || pb;
      lines.push(`- **${pb}**: ${title}`);
    }
  }

  return lines.join("\n");
}

// ─── LLM Call ───────────────────────────────────────────────────────────────

/** Call Claude Code CLI in print mode — uses the user's existing subscription */
function callClaude(systemPrompt: string, userPrompt: string): string {
  const tmpSystem = join(monorepoRoot, "koba237/.tmp-system.txt");
  const tmpUser = join(monorepoRoot, "koba237/.tmp-user.txt");

  writeFileSync(tmpSystem, systemPrompt);
  writeFileSync(tmpUser, userPrompt);

  try {
    const result = execSync(
      `cat "${tmpUser}" | claude -p --system-prompt "$(cat "${tmpSystem}")" --model sonnet --no-session-persistence`,
      {
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
        timeout: 600_000, // 10 min per stage
        cwd: monorepoRoot,
      },
    );
    return result.trim();
  } finally {
    try { unlinkSync(tmpSystem); } catch {}
    try { unlinkSync(tmpUser); } catch {}
  }
}

// ─── Pipeline Types ─────────────────────────────────────────────────────────

type Domain = "marketplace" | "consumer" | "b2b-data" | "civic-public";

interface BoardMember {
  persona: string;
  kind: "persona" | "role";
  task: string;
  injectLedger?: boolean;
}

interface EnrichmentStage {
  role: string;
  prompt: string;
  output: string;
  stage: "gate" | "panel" | "factory";
}

export interface EnrichmentResult {
  ideaId: string;
  cardContent: string;
  stages: EnrichmentStage[];
  gateVerdict: "advance" | "kill";
  domain: Domain;
  panelMembers: string[];
  manifest: KobaManifest | null;
  errors: string[];
}

// ─── Gate Personas (always these 3) ─────────────────────────────────────────

const GATE_TASK_PREFIX = `You are part of a 3-person gate committee evaluating whether this idea deserves deeper analysis. Be concise and decisive.`;

const GATE: BoardMember[] = [
  {
    persona: "naval",
    kind: "persona",
    task: `${GATE_TASK_PREFIX}

Evaluate through your lens of leverage and specific knowledge:
1. **Leverage** — Does this scale through code/media/capital, or require linear time?
2. **Specific Knowledge** — Does this need knowledge that can't be trained for?
3. **Compounding** — Does it get better over time?
4. **Domain** — Classify: marketplace, consumer, b2b-data, or civic-public.
5. **Verdict** — ADVANCE or KILL? One sentence why.`,
  },
  {
    persona: "pg",
    kind: "persona",
    task: `${GATE_TASK_PREFIX}

Evaluate through your lens of organic ideas and founder-market fit:
1. **Organic Test** — Does this come from genuine need, or brainstorming?
2. **Schlep Test** — Is there hard, unglamorous work most avoid? (Positive signal.)
3. **"Bad Idea" Test** — Does it look wrong but might be right?
4. **Domain** — Classify: marketplace, consumer, b2b-data, or civic-public.
5. **Verdict** — ADVANCE or KILL? One sentence why.`,
  },
  {
    persona: "tk-ops",
    kind: "persona",
    task: `${GATE_TASK_PREFIX}

Evaluate through your lens of operations and marketplace execution:
1. **Supply Side** — Is there a clear supply-side inefficiency to exploit?
2. **Unit Economics** — Does the basic math work? Cost to serve vs. willingness to pay?
3. **Day-One Feasibility** — Can you launch this tomorrow in one city/niche?
4. **Domain** — Classify: marketplace, consumer, b2b-data, or civic-public.
5. **Verdict** — ADVANCE or KILL? One sentence why.`,
  },
];

// ─── Panel Composition ──────────────────────────────────────────────────────

/** Fixed pair for each domain */
const DOMAIN_PANELS: Record<Domain, string[]> = {
  marketplace: ["benthomp", "gurley"],
  consumer: ["achen", "chesky"],
  "b2b-data": ["pmarca", "collison"],
  "civic-public": ["karp", "thiel"],
};

/** All personas eligible for random selection (everyone except the 3 gate members) */
const PANEL_POOL = [
  "benthomp", "karp", "achen", "chesky",
  "gurley", "thiel", "shreyas", "jzhuo", "finsamurai",
  "pmarca", "collison",
];

/** Build the panel task for a given persona */
function buildPanelTask(persona: string): string {
  const tasks: Record<string, string> = {
    benthomp: `Analyze business model dynamics and value capture:
1. **Value Chain** — Map it. Suppliers, distributors, consumers. How does money flow?
2. **Aggregator or Platform?** — Intermediates (aggregator) or enables (platform)?
3. **Integration Point** — Where is the defensibility? What gets commoditized?
4. **Verdict** — One sentence: where does value accrue, and can this idea capture it?`,

    "tk-ops": `Evaluate operational feasibility and the day-one playbook:
1. **Supply Side** — What's the supply? Where's the underutilized asset?
2. **Day-One Playbook** — How do you launch with zero users? What's the accelerant?
3. **Unit Economics** — Cost to serve one user. Break it down.
4. **Verdict** — One sentence: can this be operated profitably, and what's the first move?`,

    achen: `Evaluate growth and distribution potential:
1. **Distribution Theory** — How does the first user find this? Embedded in product or bolted on?
2. **Atomic Network** — Smallest viable group that gets value from each other?
3. **Retention** — Will users come back without being pushed?
4. **Cold Start Plan** — Specific plan from zero to atomic network. No hand-waving.
5. **Verdict** — One sentence: organic growth potential, or dependent on paid acquisition?`,

    chesky: `Imagine the 11-star version, then find the buildable sweet spot:
1. **5-Star** — What's the adequate experience today?
2. **7-Star** — The achievable but extraordinary version people tell friends about?
3. **11-Star** — The science-fiction version. Push to absurd.
4. **AI-Native** — What would this look like reimagined with AI? Not a chatbot — the experience rebuilt.
5. **Verdict** — One sentence: what's the 7-star version that's buildable today?`,

    gurley: `Stress-test the business fundamentals:
1. **Revenue Quality** — Moat, network effects, switching costs, organic demand, margins. Durable or fragile?
2. **TAM Reality** — Market size based on old world or new? Does this expand the market?
3. **Unit Economics** — Strip the growth narrative. Positive marginal cash flow per transaction?
4. **Verdict** — One sentence: real business or "selling dollars for $0.85"?`,

    thiel: `Evaluate for monopoly potential and contrarian insight:
1. **The Secret** — What does this know that nobody else does? No secret = derivative.
2. **10x Better** — Order of magnitude better at what specific thing?
3. **Monopoly Potential** — Can this become the only one? How?
4. **Small Market First** — Who are the first 100 fanatical users?
5. **Verdict** — One sentence: 0-to-1 or 1-to-n?`,

    shreyas: `Scope the ruthless MVP:
1. **LNO Classification** — Leverage features (perfect), Neutral (do well), Overhead (skip)?
2. **Opinionated Scoping** — WHO is the specific target user? Pick a narrow segment.
3. **Table Stakes vs. Wow** — Minimum to not be embarrassing? The ONE wow feature?
4. **Pre-Mortem** — Assume it failed. Tigers, Paper Tigers, Elephants?
5. **Verdict** — One sentence: what gets built, what gets cut?`,

    jzhuo: `Evaluate the product experience and design quality:
1. **Obviousness** — Would a new user know what to do without instructions?
2. **Real Problem vs. Surface** — Solving actual pain or a symptom?
3. **Blank Page Problem** — First-run experience: guides or intimidates?
4. **Craft Signal** — ONE design detail that signals someone cared deeply?
5. **Verdict** — One sentence: made for them, or made for everyone?`,

    karp: `Evaluate whether this idea matters enough to endure the pain of building:
1. **Mission Weight** — Does this matter beyond profit? Would someone endure years of pain?
2. **Parasitism Test** — Creates genuine value or extracts it?
3. **Conviction Required** — How much contrarian conviction does this need?
4. **Constraints** — What constraints would make this stronger?
5. **Verdict** — One sentence: worth the pain, or "light hedonism"?`,

    pmarca: `Evaluate this through your lens of technology waves and platform shifts:
1. **Software Eating** — Which existing industry or process does this replace with software?
2. **Why Now?** — What technology shift makes this possible today but not 5 years ago?
3. **Market First** — Is the market large and growing? Market matters more than product.
4. **Platform Shift** — Does this ride a platform shift, or is it incremental improvement on existing platforms?
5. **Verdict** — One sentence: is this building the future, or rearranging the present?`,

    collison: `Evaluate this through your lens of infrastructure and developer experience:
1. **Infrastructure Layer** — Is this building a foundation others will build on? Or is it a leaf node?
2. **Speed** — Could this be built and shipped surprisingly fast? What's blocking speed?
3. **Developer Experience** — If this has an API or platform surface, is the developer experience 10x better than alternatives?
4. **Growth Contribution** — Does this increase economic activity, or just redistribute it?
5. **Verdict** — One sentence: does this expand the pie, or fight over existing slices?`,

    finsamurai: `Evaluate whether real consumers would actually pay:
1. **Income-Indexed Price** — For target income bracket, is this reasonable? Frame as % of income.
2. **Time-Value Test** — Does this save meaningful time?
3. **Free Alternative** — What's free? Is paid dramatically better, or marginally?
4. **Subscription Skepticism** — If monthly, can it justify itself every month?
5. **Verdict** — One sentence: would a financially disciplined person actually buy this?`,
  };

  return tasks[persona] || `Evaluate this idea through your distinctive lens. Be specific and concise. End with a one-sentence verdict.`;
}

// ─── Domain Detection ───────────────────────────────────────────────────────

/** Extract domain classification from gate outputs via majority vote */
function detectDomain(gateOutputs: string[]): Domain {
  const domainCounts: Record<Domain, number> = {
    marketplace: 0,
    consumer: 0,
    "b2b-data": 0,
    "civic-public": 0,
  };

  const domainAliases: Record<string, Domain> = {
    marketplace: "marketplace",
    consumer: "consumer",
    "b2b-data": "b2b-data",
    "b2b": "b2b-data",
    data: "b2b-data",
    "civic-public": "civic-public",
    civic: "civic-public",
    public: "civic-public",
  };

  for (const output of gateOutputs) {
    const lower = output.toLowerCase();
    // Look for domain classification in the output
    for (const [alias, domain] of Object.entries(domainAliases)) {
      if (lower.includes(`domain`) && lower.includes(alias)) {
        domainCounts[domain]++;
        break;
      }
    }
  }

  // Return the domain with the most votes, default to consumer
  const sorted = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? (sorted[0][0] as Domain) : "consumer";
}

/** Check if the gate voted to advance (2/3 must say ADVANCE) */
function gateAdvances(gateOutputs: string[]): boolean {
  let advances = 0;
  for (const output of gateOutputs) {
    const upper = output.toUpperCase();
    if (upper.includes("ADVANCE")) advances++;
  }
  return advances >= 2;
}

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Assemble the panel for a given domain */
function assemblePanel(domain: Domain): string[] {
  if (domain === "civic-public") {
    // All 3 random from pool
    const shuffled = [...PANEL_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  const fixed = DOMAIN_PANELS[domain];
  // Random third from pool, excluding the fixed pair
  const eligible = PANEL_POOL.filter((p) => !fixed.includes(p));
  const randomThird = pickRandom(eligible);
  return [...fixed, randomThird];
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/** Run a single board member and return the stage result */
function runMember(
  member: BoardMember,
  accumulated: string,
  ledger: string,
  stageName: "gate" | "panel" | "factory",
): EnrichmentStage {
  const entity = loadEntity(member.kind, member.persona);
  const systemPrompt = buildSystemPrompt(entity);

  let userPrompt = accumulated;
  if (member.injectLedger) {
    userPrompt += `\n\n---\n\n${ledger}`;
  }
  userPrompt += `\n\n---\n\n**YOUR TASK:**\n${member.task}`;

  const label = member.kind === "persona" ? member.persona : `[${member.persona}]`;
  console.log(`  ${label}...`);

  const output = callClaude(systemPrompt, userPrompt);
  console.log(`  ${label} complete (${output.length} chars)`);

  return { role: member.persona, prompt: userPrompt, output, stage: stageName };
}

/** Run the full staged enrichment pipeline */
export async function enrich(ideaId: string): Promise<EnrichmentResult> {
  const card = findIdeaCard(ideaId);
  const ledger = buildCapabilityLedger();
  const stages: EnrichmentStage[] = [];
  let accumulated = `# Idea Card\n\n${card.content}`;

  // ── Stage 1: The Gate ──────────────────────────────────────────────────
  console.log(`\n  ── STAGE 1: THE GATE ──\n`);

  const gateOutputs: string[] = [];
  for (const member of GATE) {
    const stage = runMember(member, accumulated, ledger, "gate");
    stages.push(stage);
    gateOutputs.push(stage.output);
    accumulated += `\n\n---\n\n## ${member.persona} (Gate)\n\n${stage.output}`;
  }

  // Tally gate votes
  const advances = gateAdvances(gateOutputs);
  const domain = detectDomain(gateOutputs);

  console.log(`\n  Gate verdict: ${advances ? "ADVANCE" : "KILL"}`);
  console.log(`  Domain: ${domain}\n`);

  if (!advances) {
    console.log("  Idea killed at the gate. No further evaluation.\n");

    const result: EnrichmentResult = {
      ideaId,
      cardContent: card.content,
      stages,
      gateVerdict: "kill",
      domain,
      panelMembers: [],
      manifest: null,
      errors: ["Killed at gate — fewer than 2 of 3 voted ADVANCE"],
    };
    saveEnrichment(result);
    return result;
  }

  // ── Stage 2: The Panel ─────────────────────────────────────────────────
  const panelMembers = assemblePanel(domain);
  console.log(`  ── STAGE 2: THE PANEL (${domain}) ──`);
  console.log(`  Members: ${panelMembers.join(", ")}\n`);

  for (const persona of panelMembers) {
    const member: BoardMember = {
      persona,
      kind: "persona",
      task: buildPanelTask(persona),
    };
    const stage = runMember(member, accumulated, ledger, "panel");
    stages.push(stage);
    accumulated += `\n\n---\n\n## ${persona} (Panel)\n\n${stage.output}`;
  }

  // ── Stage 3: Factory Scanner ───────────────────────────────────────────
  console.log(`\n  ── STAGE 3: FACTORY SCANNER ──\n`);

  const factoryMember: BoardMember = {
    persona: "signal-scout",
    kind: "role",
    injectLedger: true,
    task: `Using the gate evaluations and panel analysis above, plus the factory capability ledger, determine what we can actually build.

1. **Stack Profile** — Which factory packages does this need? List each with a one-line reason.
2. **Archetype** — What's the right archetype? (api-only, api-web, web-only, ios-api, ios-only, watchos-api, agent)
3. **Capability Coverage** — What percentage of this product is already in the factory?
4. **Capability Gaps** — What's missing? Factory-capability issue or just app code?
5. **Sibling Products** — Existing projects with similar patterns to borrow from?
6. **One-Session Feasible?** — Scaffold to deployed in one session? What blocks it?
7. **Board Synthesis** — Key insights from gate + panel: what did they agree on? Disagree? Strongest signal?`,
  };

  const factoryStage = runMember(factoryMember, accumulated, ledger, "factory");
  stages.push(factoryStage);
  accumulated += `\n\n---\n\n## Factory Scanner\n\n${factoryStage.output}`;

  // ── Manifest Synthesis ─────────────────────────────────────────────────
  const manifest = synthesizeManifest(ideaId, accumulated);

  const result: EnrichmentResult = {
    ideaId,
    cardContent: card.content,
    stages,
    gateVerdict: "advance",
    domain,
    panelMembers,
    manifest: manifest.manifest,
    errors: manifest.errors,
  };

  saveEnrichment(result);
  return result;
}

// ─── Persistence ────────────────────────────────────────────────────────────

/** Save enrichment result as JSON for the dashboard to read */
function saveEnrichment(result: EnrichmentResult): void {
  const outDir = join(monorepoRoot, "koba237/enrichments");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${result.ideaId}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n  Saved enrichment to ${outPath}`);
}

/** Ask Claude to synthesize a koba.yaml manifest from enrichment output */
function synthesizeManifest(
  ideaId: string,
  enrichmentOutput: string,
): { manifest: KobaManifest | null; errors: string[] } {
  console.log("\n  Synthesizing manifest...");

  const systemPrompt =
    "You are a precise data synthesizer. Output only valid JSON. No markdown, no explanation, no code fences.";

  const userPrompt = `${enrichmentOutput}

---

**YOUR TASK:**

Synthesize all the enrichment output above into a koba.yaml manifest. Output ONLY valid JSON (no markdown fences, no explanation) matching this exact schema:

{
  "name": "Human-Readable Name",
  "slug": "url-safe-slug",
  "idea": "${ideaId}",
  "archetype": "api-web|api-only|web-only|ios-api|ios-only|watchos-api|agent",
  "domain": ["tag1", "tag2"],
  "stack": ["package-name-1", "package-name-2"],
  "env": { "PORT": "3000", "DATABASE_URL": "/data/app.db" },
  "secrets": ["SECRET_NAME"],
  "deploy": {
    "service": "service-name",
    "region": "us-east1",
    "memory": "512Mi",
    "volume": true
  },
  "health": "/health",
  "monetization": "free|waitlist-to-paid|stripe-checkout|storekit-iap|usage-based|lead-gen|ad-supported|open-source",
  "enrichment": {
    "problem": "Who hurts and why",
    "concept": "What it does",
    "mvp": "Smallest proving thing",
    "killCriteria": ["criterion 1", "criterion 2"],
    "capabilityGap": ["gap 1 if any"]
  }
}

Valid stack values: api-kit, web-templates, ios-templates, llm-kit, teek, etl-kit, watch-kit, notify-kit, search-kit, gamify-kit, payments-kit, analytics-kit, storage-kit, document-kit, voice-kit, predict-kit, geo-registry, socrata-kit, event-bus, job-queue, pods-kit

Valid domain values: consumer, b2b, data-product, marketplace, tool, civic-tech, health-wellness, fintech, developer-tools, education, real-estate, sports-leisure, media-content

Output ONLY the JSON object. Nothing else.`;

  const result = callClaude(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(result);
    const validation = validateManifest(parsed);
    if (validation.success) {
      console.log("  Manifest synthesized and validated");
      return { manifest: validation.data, errors: [] };
    } else {
      const errors = validation.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      );
      console.log(`  Manifest has validation errors: ${errors.join(", ")}`);
      return { manifest: null, errors };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  Failed to parse manifest JSON: ${msg}`);
    return { manifest: null, errors: [`JSON parse error: ${msg}`] };
  }
}

// ─── Roadmap Pipeline ────────────────────────────────────────────────────────

export interface RoadmapStage {
  role: string;
  prompt: string;
  output: string;
}

export interface RoadmapResult {
  ideaId: string;
  stages: RoadmapStage[];
  synthesis: string;
  errors: string[];
}

/** Personas and tasks for the roadmap (monetization/GTM/pricing) stage */
const ROADMAP_MEMBERS: { persona: string; kind: "persona" | "role"; task: string }[] = [
  {
    persona: "gurley",
    kind: "persona",
    task: `You've seen the enrichment analysis above. Now focus ONLY on the money:

1. **Revenue Model** — What's the right model? Per-seat SaaS, usage-based, report sales, API calls? Pick one and defend it.
2. **Pricing** — Specific price points. What does the first tier cost? Premium tier? What's the anchor?
3. **Unit Economics** — Cost to serve one customer per month (LLM API, compute, storage). Gross margin at scale.
4. **Revenue Timeline** — Month 1, Month 3, Month 6, Month 12 revenue estimates. Be specific with numbers.
5. **Verdict** — One sentence: how fast does this get to $5K/mo MRR, and what has to be true?`,
  },
  {
    persona: "tk-ops",
    kind: "persona",
    task: `You've seen the enrichment analysis above. Now design the go-to-market playbook:

1. **First 10 Customers** — Who are they specifically? Job title, company type, where do they hang out?
2. **Day-One Sales Motion** — Cold outreach? Content? Community? Free report as lead magnet? Be specific.
3. **Pricing Psychology** — What makes someone pull out a credit card for this? What's the "holy shit" moment?
4. **Competitive Positioning** — How do you describe this in one sentence to a medical device PM? What's the comparison anchor?
5. **Verdict** — One sentence: what's the first move on day one after the product is live?`,
  },
  {
    persona: "finsamurai",
    kind: "persona",
    task: `You've seen the enrichment analysis above. Now pressure-test the pricing from the BUYER's perspective:

1. **Budget Reality** — A medical device PM at a mid-size company: what's their discretionary software budget? Can they expense this or does it need procurement?
2. **Price Sensitivity** — $500/mo vs $2K/mo vs $5K/mo — which tier actually gets purchased without a committee? Which needs sign-off?
3. **ROI Justification** — What does the buyer tell their boss to justify this expense? Frame the ROI in their language.
4. **Churn Risk** — After month 3, why would they cancel? What makes this sticky vs one-time?
5. **Verdict** — One sentence: what's the maximum price a single PM can expense without procurement, and is that enough to build a business?`,
  },
  {
    persona: "achen",
    kind: "persona",
    task: `You've seen the enrichment analysis above. Now design the growth engine:

1. **Distribution Channel** — Where do medical device PMs discover tools? LinkedIn? Conferences? Slack communities? Reddit? Newsletters?
2. **Lead Magnet** — What free artifact do you create that spreads? A report? A benchmark? A comparison tool?
3. **Viral Mechanic** — Is there a natural sharing motion? "Look what I found in the adverse event data" → colleague signs up?
4. **Expansion Path** — First vertical is FDA MAUDE / medical devices. What's the second vertical? Third? How do you sequence?
5. **Verdict** — One sentence: what's the CAC for the first 50 customers, and does the LTV math work?`,
  },
];

/** Run the roadmap pipeline against an already-enriched idea */
export async function roadmap(ideaId: string): Promise<RoadmapResult> {
  const enrichmentPath = join(monorepoRoot, `koba237/enrichments/${ideaId}.json`);
  if (!existsSync(enrichmentPath)) {
    throw new Error(`No enrichment found for ${ideaId}. Run: pnpm koba enrich ${ideaId} first.`);
  }

  const enrichment: EnrichmentResult = JSON.parse(readFileSync(enrichmentPath, "utf-8"));

  // Build context from enrichment stages
  let context = `# ${ideaId} — Enrichment Summary\n\n`;
  context += `**Gate verdict:** ${enrichment.gateVerdict}\n`;
  context += `**Domain:** ${enrichment.domain}\n`;
  if (enrichment.manifest) {
    const e = enrichment.manifest.enrichment;
    context += `\n## Problem\n${e.problem}\n`;
    context += `\n## Concept\n${e.concept}\n`;
    context += `\n## MVP\n${e.mvp}\n`;
    context += `\n## Kill Criteria\n${e.killCriteria.map((k) => `- ${k}`).join("\n")}\n`;
  }
  context += `\n## Panel Analysis\n\n`;
  for (const stage of enrichment.stages) {
    context += `### ${stage.role} (${stage.stage})\n\n${stage.output}\n\n---\n\n`;
  }

  const stages: RoadmapStage[] = [];
  let accumulated = context;

  console.log(`\n  ── ROADMAP: MONETIZATION & GTM ──\n`);

  for (const member of ROADMAP_MEMBERS) {
    const entity = loadEntity(member.kind, member.persona);
    const systemPrompt = buildSystemPrompt(entity);

    const userPrompt = accumulated + `\n\n---\n\n**YOUR TASK:**\n${member.task}`;

    const label = member.persona;
    console.log(`  ${label}...`);

    const output = callClaude(systemPrompt, userPrompt);
    console.log(`  ${label} complete (${output.length} chars)`);

    stages.push({ role: member.persona, prompt: userPrompt, output });
    accumulated += `\n\n---\n\n## ${member.persona} (Roadmap)\n\n${output}`;
  }

  // Save partial result before synthesis (so we don't lose persona outputs on timeout)
  const outDir = join(monorepoRoot, "koba237/enrichments");
  const outPath = join(outDir, `${ideaId}-roadmap.json`);
  const partialResult: RoadmapResult = { ideaId, stages, synthesis: "", errors: ["synthesis pending"] };
  writeFileSync(outPath, JSON.stringify(partialResult, null, 2));
  console.log(`\n  Saved partial roadmap (4 personas) to ${outPath}`);

  // ── Synthesis: extract actionable roadmap ──
  console.log(`\n  Synthesizing roadmap...\n`);

  const synthesisPrompt = `${accumulated}

---

**YOUR TASK:**
You are a startup operator. Synthesize the 4 analyses above into ONE actionable monetization roadmap. Output ONLY these sections:

## Pricing
- Tier names, prices, what's included. Be specific.

## Unit Economics
- Cost to serve per customer/month
- Gross margin
- Break-even customer count

## Revenue Timeline
- Month 1, 3, 6, 12 MRR estimates with assumptions

## GTM Playbook
- First 10 customers: who and how
- Lead magnet strategy
- Sales motion (self-serve vs outreach)

## Expansion Sequence
- Vertical 1, 2, 3 with rationale

## Time to $5K MRR
- Specific path with milestones

Be concise. Numbers over narratives.`;

  const synthesisOutput = callClaude(
    "You are a concise startup operator. Output structured, actionable plans with specific numbers. No fluff.",
    synthesisPrompt,
  );

  console.log(`  Synthesis complete (${synthesisOutput.length} chars)`);

  const result: RoadmapResult = {
    ideaId,
    stages,
    synthesis: synthesisOutput,
    errors: [],
  };

  // Save final roadmap result (overwrites partial)
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n  Saved roadmap to ${outPath}`);

  return result;
}

/** Format roadmap result for console output */
export function formatRoadmap(result: RoadmapResult): string {
  const lines: string[] = [];
  lines.push(`\n${"=".repeat(60)}`);
  lines.push(`ROADMAP: ${result.ideaId} — Monetization & GTM`);
  lines.push(`${"=".repeat(60)}\n`);

  for (const stage of result.stages) {
    const label = roleLabels[stage.role] || stage.role;
    lines.push(`--- ${label.toUpperCase()} ---\n`);
    lines.push(stage.output);
    lines.push("");
  }

  lines.push(`\n${"=".repeat(60)}`);
  lines.push(`SYNTHESIS — ACTIONABLE ROADMAP`);
  lines.push(`${"=".repeat(60)}\n`);
  lines.push(result.synthesis);

  return lines.join("\n");
}

// ─── Roadmap HTML Viewer ────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  naval: "Naval Ravikant",
  karp: "Alex Karp",
  pg: "Paul Graham",
  achen: "Andrew Chen",
  "tk-ops": "Travis Kalanick",
  shreyas: "Shreyas Doshi",
  benthomp: "Ben Thompson",
  gurley: "Bill Gurley",
  thiel: "Peter Thiel",
  finsamurai: "Financial Samurai",
  jzhuo: "Julie Zhuo",
  chesky: "Brian Chesky",
  "signal-scout": "Factory Scanner",
  pmarca: "Marc Andreessen",
  collison: "Patrick Collison",
};

// ─── Formatting ─────────────────────────────────────────────────────────────

/** Pretty-print an enrichment result */
export function formatResult(result: EnrichmentResult): string {
  const lines: string[] = [];
  lines.push(`\n${"=".repeat(60)}`);
  lines.push(`ENRICHMENT: ${result.ideaId}`);
  lines.push(`Gate: ${result.gateVerdict.toUpperCase()} | Domain: ${result.domain}`);
  if (result.panelMembers.length > 0) {
    lines.push(`Panel: ${result.panelMembers.join(", ")}`);
  }
  lines.push(`${"=".repeat(60)}\n`);

  for (const stage of result.stages) {
    const stageTag = stage.stage === "gate" ? " (Gate)" : stage.stage === "panel" ? " (Panel)" : " (Factory)";
    lines.push(`--- ${stage.role.toUpperCase()}${stageTag} ---\n`);
    lines.push(stage.output);
    lines.push("");
  }

  if (result.manifest) {
    lines.push(`--- MANIFEST ---\n`);
    lines.push(JSON.stringify(result.manifest, null, 2));
  }

  if (result.errors.length > 0) {
    lines.push(`\n--- ERRORS ---`);
    for (const err of result.errors) {
      lines.push(`  ! ${err}`);
    }
  }

  return lines.join("\n");
}
