import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"

// Use absolute path — process.cwd() is unreliable in Next.js dev vs build
const monorepoRoot = "/Users/mini-home/Desktop/monorepo"
const cardsDir = join(monorepoRoot, "open-pawl/system/ideas/cards")
const enrichmentsDir = join(monorepoRoot, "koba237/enrichments")

export interface IdeaCard {
  id: string
  slug: string
  filename: string
  title: string
  status: string
  oneLiner: string
  content: string
  hasEnrichment: boolean
}

export interface EnrichmentStage {
  role: string
  output: string
}

export interface EnrichmentManifest {
  name: string
  slug: string
  idea: string
  archetype: string
  domain: string[]
  stack: string[]
  env: Record<string, string>
  secrets: string[]
  deploy: {
    service: string
    region: string
    memory: string
    volume: boolean
  }
  health: string
  monetization: string
  enrichment: {
    problem: string
    concept: string
    mvp: string
    killCriteria: string[]
    capabilityGap: string[]
  }
}

export interface EnrichmentResult {
  ideaId: string
  cardContent: string
  stages: EnrichmentStage[]
  manifest: EnrichmentManifest | null
  errors: string[]
}

/** Parse frontmatter from an idea card */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":")
    if (key && rest.length) {
      fm[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "")
    }
  }
  return fm
}

/** Load all idea cards */
export function loadIdeaCards(): IdeaCard[] {
  if (!existsSync(cardsDir)) return []

  const files = readdirSync(cardsDir).filter((f) => f.endsWith(".md"))
  const enrichedIds = new Set<string>()

  if (existsSync(enrichmentsDir)) {
    for (const f of readdirSync(enrichmentsDir).filter((f) => f.endsWith(".json"))) {
      enrichedIds.add(f.replace(".json", ""))
    }
  }

  return files.map((filename) => {
    const content = readFileSync(join(cardsDir, filename), "utf-8")
    const fm = parseFrontmatter(content)

    // Extract ID from filename (e.g., "IDEA-080_glare-graph.md" → "IDEA-080")
    const id = filename.match(/^(IDEA-\d+)/)?.[1] || filename
    const slug = filename.replace(/^IDEA-\d+_?/, "").replace(/\.md$/, "")

    // Extract title from first heading or frontmatter
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = fm.title || titleMatch?.[1] || slug

    // Extract one-liner
    const oneLineMatch = content.match(/## One-Liner\n+(.+)/m)
    const oneLiner = fm.one_liner || oneLineMatch?.[1]?.replace(/^['"]|['"]$/g, "") || ""

    return {
      id,
      slug,
      filename,
      title,
      status: fm.status || "unknown",
      oneLiner,
      content,
      hasEnrichment: enrichedIds.has(id),
    }
  }).sort((a, b) => {
    // Enriched cards first, then by ID
    if (a.hasEnrichment !== b.hasEnrichment) return a.hasEnrichment ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}

/** Load a single enrichment result */
export function loadEnrichment(ideaId: string): EnrichmentResult | null {
  const path = join(enrichmentsDir, `${ideaId}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf-8"))
}

/** Load all enrichments */
export function loadAllEnrichments(): EnrichmentResult[] {
  if (!existsSync(enrichmentsDir)) return []
  return readdirSync(enrichmentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(enrichmentsDir, f), "utf-8")))
}
