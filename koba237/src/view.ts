import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(__dirname, "..", "..");
const enrichmentsDir = join(monorepoRoot, "koba237/enrichments");

interface EnrichmentResult {
  ideaId: string;
  stages: { role: string; output: string }[];
  manifest: Record<string, unknown> | null;
  errors: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h4 class="role-h4">${renderInline(line.slice(4))}</h4>`;
      if (line.startsWith("## ")) return `<h3 class="role-h3">${renderInline(line.slice(3))}</h3>`;
      if (line.startsWith("# ")) return `<h2 class="role-h2">${renderInline(line.slice(2))}</h2>`;
      if (/^---+$/.test(line.trim())) return `<hr/>`;
      if (line.startsWith("```")) return ""; // skip fences (simplified)
      if (/^\d+\.\s/.test(line))
        return `<div class="list-item"><span class="list-num">${line.match(/^\d+/)?.[0]}.</span> ${renderInline(line.replace(/^\d+\.\s+/, ""))}</div>`;
      if (line.startsWith("- ") || line.startsWith("  - "))
        return `<div class="list-item ${line.startsWith("  ") ? "indent" : ""}"><span class="bullet">&#x2022;</span> ${renderInline(line.replace(/^\s*-\s+/, ""))}</div>`;
      if (line.includes("|") && line.trim().startsWith("|")) {
        if (/^[|\s:-]+$/.test(line.trim())) return "";
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        return `<div class="table-row">${cells.map((c, i) => `<span class="${i === 0 ? "cell-key" : "cell-val"}">${renderInline(c)}</span>`).join("")}</div>`;
      }
      if (!line.trim()) return `<div class="spacer"></div>`;
      return `<p>${renderInline(line)}</p>`;
    })
    .join("\n");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const roleColors: Record<string, string> = {
  naval: "#06b6d4",
  karp: "#dc2626",
  pg: "#f97316",
  achen: "#8b5cf6",
  "tk-ops": "#1d4ed8",
  shreyas: "#a78bfa",
  benthomp: "#0ea5e9",
  gurley: "#059669",
  thiel: "#6366f1",
  finsamurai: "#eab308",
  jzhuo: "#ec4899",
  chesky: "#f43f5e",
  "signal-scout": "#fbbf24",
};

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
};

export function generateHtml(enrichment: EnrichmentResult): string {
  const m = enrichment.manifest as Record<string, unknown> | null;
  const e = (m?.enrichment || {}) as Record<string, unknown>;
  const deploy = (m?.deploy || {}) as Record<string, unknown>;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${enrichment.ideaId} — Koba Enrichment</title>
<style>
  :root { --bg: #0f1117; --card: #161922; --border: #252830; --text: #e2e4e9; --dim: #8b8fa3; --accent: #f97316; --blue: #60a5fa; --violet: #a78bfa; --green: #34d399; --amber: #fbbf24; --red: #f87171; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
  .subtitle { color: var(--dim); font-size: 1.1rem; margin-bottom: 2rem; }
  .badge { display: inline-block; font-size: 0.7rem; padding: 2px 8px; border-radius: 100px; font-weight: 600; }
  .badge-enriched { background: rgba(52,211,153,0.15); color: var(--green); }
  .manifest { border: 2px solid rgba(249,115,22,0.3); background: rgba(249,115,22,0.05); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .manifest h2 { color: var(--accent); font-size: 1.1rem; margin-bottom: 1rem; }
  .manifest-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .manifest-field label { display: block; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dim); }
  .manifest-field p { font-family: 'SF Mono', monospace; font-size: 0.85rem; margin-top: 2px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tag { font-size: 0.7rem; padding: 2px 8px; border-radius: 100px; font-weight: 500; font-family: monospace; }
  .tag-domain { background: rgba(96,165,250,0.15); color: var(--blue); }
  .tag-stack { background: rgba(167,139,250,0.15); color: var(--violet); }
  .section-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dim); margin-top: 1rem; }
  .section-text { font-size: 0.9rem; line-height: 1.7; margin-top: 4px; }
  .kill-item { display: flex; gap: 8px; font-size: 0.9rem; margin-top: 4px; }
  .kill-x { color: var(--red); flex-shrink: 0; }
  .gap-warn { color: var(--amber); flex-shrink: 0; }
  .role-section { border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .role-section h2 { font-size: 1.1rem; margin-bottom: 1rem; }
  .role-section p { font-size: 0.9rem; margin-bottom: 4px; }
  .role-section strong { color: var(--text); }
  .role-section code { font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; color: var(--accent); }
  .role-h2 { font-size: 1.1rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
  .role-h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .role-h4 { font-size: 0.9rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
  .list-item { display: flex; gap: 8px; font-size: 0.9rem; margin: 2px 0 2px 8px; }
  .list-item.indent { margin-left: 24px; }
  .bullet { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
  .list-num { color: var(--dim); flex-shrink: 0; min-width: 18px; }
  .table-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .cell-key { font-weight: 600; }
  .cell-val { color: var(--dim); }
  .spacer { height: 8px; }
  hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
  @media (max-width: 640px) { .manifest-grid { grid-template-columns: repeat(2, 1fr); } body { padding: 1rem; } }
</style>
</head>
<body>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
    <span style="font-size:0.85rem;font-family:monospace;color:var(--dim)">${enrichment.ideaId}</span>
    <span class="badge badge-enriched">Enriched</span>
  </div>
  <h1>${m ? escapeHtml(String(m.name || enrichment.ideaId)) : enrichment.ideaId}</h1>
  ${e.concept ? `<p class="subtitle">${escapeHtml(String(e.concept)).slice(0, 200)}...</p>` : ""}

  ${m ? `
  <div class="manifest">
    <h2>Manifest</h2>
    <div class="manifest-grid">
      <div class="manifest-field"><label>Archetype</label><p>${m.archetype}</p></div>
      <div class="manifest-field"><label>Monetization</label><p>${m.monetization}</p></div>
      <div class="manifest-field"><label>Service</label><p>${deploy.service}</p></div>
      <div class="manifest-field"><label>Region</label><p>${deploy.region}</p></div>
      <div class="manifest-field"><label>Memory</label><p>${deploy.memory}</p></div>
      <div class="manifest-field"><label>Volume</label><p>${deploy.volume ? "Yes" : "No"}</p></div>
    </div>
    <div class="manifest-field"><label>Domains</label><div class="tags">${(m.domain as string[]).map((d) => `<span class="tag tag-domain">${d}</span>`).join("")}</div></div>
    <div class="manifest-field" style="margin-top:8px"><label>Stack</label><div class="tags">${(m.stack as string[]).map((s) => `<span class="tag tag-stack">${s}</span>`).join("")}</div></div>

    <div class="section-label" style="margin-top:1.25rem">Problem</div>
    <div class="section-text">${escapeHtml(String(e.problem || ""))}</div>
    <div class="section-label">Concept</div>
    <div class="section-text">${escapeHtml(String(e.concept || ""))}</div>
    <div class="section-label">MVP</div>
    <div class="section-text">${escapeHtml(String(e.mvp || ""))}</div>
    ${(e.killCriteria as string[] || []).length > 0 ? `
    <div class="section-label">Kill Criteria</div>
    ${(e.killCriteria as string[]).map((k) => `<div class="kill-item"><span class="kill-x">&#x2715;</span>${escapeHtml(k)}</div>`).join("")}` : ""}
    ${(e.capabilityGap as string[] || []).length > 0 ? `
    <div class="section-label">Capability Gaps</div>
    ${(e.capabilityGap as string[]).map((g) => `<div class="kill-item"><span class="gap-warn">&#x26A0;</span>${escapeHtml(g)}</div>`).join("")}` : ""}
  </div>` : ""}

  ${enrichment.stages.map((stage) => `
  <div class="role-section">
    <h2 style="color:${roleColors[stage.role] || "inherit"}">${roleLabels[stage.role] || stage.role}</h2>
    ${renderMarkdown(stage.output)}
  </div>`).join("\n")}
</body>
</html>`;
}

/** Generate and open an enrichment HTML file */
export function viewEnrichment(ideaId: string): void {
  const jsonPath = join(enrichmentsDir, `${ideaId}.json`);
  if (!existsSync(jsonPath)) {
    throw new Error(`No enrichment found for ${ideaId}. Run: pnpm koba enrich ${ideaId}`);
  }

  const enrichment: EnrichmentResult = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const html = generateHtml(enrichment);
  const outPath = join(enrichmentsDir, `${ideaId}.html`);
  writeFileSync(outPath, html);
  console.log(`Generated: ${outPath}`);

  // Open in browser
  execSync(`open "${outPath}"`);
}

/** Generate and open a roadmap HTML file */
export function viewRoadmap(ideaId: string): void {
  const jsonPath = join(enrichmentsDir, `${ideaId}-roadmap.json`);
  if (!existsSync(jsonPath)) {
    throw new Error(`No roadmap found for ${ideaId}. Run: pnpm koba roadmap ${ideaId}`);
  }

  const roadmap = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const html = generateRoadmapHtml(roadmap);
  const outPath = join(enrichmentsDir, `${ideaId}-roadmap.html`);
  writeFileSync(outPath, html);
  console.log(`Generated: ${outPath}`);
  execSync(`open "${outPath}"`);
}

function generateRoadmapHtml(roadmap: { ideaId: string; stages: { role: string; output: string }[]; synthesis: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${roadmap.ideaId} — Roadmap</title>
<style>
  :root { --bg: #0f1117; --card: #161922; --border: #252830; --text: #e2e4e9; --dim: #8b8fa3; --accent: #f97316; --green: #34d399; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
  .subtitle { color: var(--dim); font-size: 1.1rem; margin-bottom: 2rem; }
  .synthesis { border: 2px solid rgba(52,211,153,0.3); background: rgba(52,211,153,0.05); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .synthesis h2 { color: var(--green); font-size: 1.1rem; margin-bottom: 1rem; }
  .role-section { border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .role-section h2 { font-size: 1.1rem; margin-bottom: 1rem; }
  .role-section p, .synthesis p { font-size: 0.9rem; margin-bottom: 4px; }
  .role-section strong, .synthesis strong { color: var(--text); }
  .role-section code, .synthesis code { font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; color: var(--accent); }
  h3, h4 { margin: 1rem 0 0.5rem; }
  .spacer { height: 8px; }
  hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
</style>
</head>
<body>
  <span style="font-size:0.85rem;font-family:monospace;color:var(--dim)">${roadmap.ideaId}</span>
  <h1>Monetization &amp; GTM Roadmap</h1>
  <p class="subtitle">Brain trust analysis: pricing, unit economics, go-to-market, growth</p>

  <div class="synthesis">
    <h2>Synthesis — Actionable Roadmap</h2>
    ${renderMarkdown(roadmap.synthesis)}
  </div>

  ${roadmap.stages.map((stage: { role: string; output: string }) => `
  <div class="role-section">
    <h2 style="color:${roleColors[stage.role] || "inherit"}">${roleLabels[stage.role] || stage.role}</h2>
    ${renderMarkdown(stage.output)}
  </div>`).join("\n")}
</body>
</html>`;
}

/** Generate HTML for all enrichments */
export function viewAll(): void {
  if (!existsSync(enrichmentsDir)) {
    throw new Error("No enrichments directory found.");
  }

  const files = readdirSync(enrichmentsDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    throw new Error("No enrichments found. Run: pnpm koba enrich IDEA-XXX");
  }

  for (const file of files) {
    const enrichment: EnrichmentResult = JSON.parse(readFileSync(join(enrichmentsDir, file), "utf-8"));
    const html = generateHtml(enrichment);
    const outPath = join(enrichmentsDir, file.replace(".json", ".html"));
    writeFileSync(outPath, html);
    console.log(`Generated: ${outPath}`);
  }

  // Open the first one
  const firstHtml = join(enrichmentsDir, files[0].replace(".json", ".html"));
  execSync(`open "${firstHtml}"`);
}
