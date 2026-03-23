"use client"

import { useState } from "react"

interface IdeaCard {
  id: string
  slug: string
  filename: string
  title: string
  status: string
  oneLiner: string
  hasEnrichment: boolean
}

interface EnrichmentResult {
  ideaId: string
  stages: { role: string; output: string }[]
  manifest: {
    name: string
    slug: string
    archetype: string
    domain: string[]
    stack: string[]
    deploy: { service: string; region: string; memory: string; volume: boolean }
    monetization: string
    enrichment: {
      problem: string
      concept: string
      mvp: string
      killCriteria: string[]
      capabilityGap: string[]
    }
  } | null
  errors: string[]
}

const statusColors: Record<string, string> = {
  exploring: "bg-blue-500/20 text-blue-400",
  building: "bg-amber-500/20 text-amber-400",
  shipped: "bg-emerald-500/20 text-emerald-400",
  parked: "bg-zinc-500/20 text-zinc-400",
  "catalog-imported": "bg-zinc-500/20 text-zinc-400",
  unknown: "bg-zinc-500/20 text-zinc-400",
}

const roleLabels: Record<string, { label: string; color: string }> = {
  "domain-classifier": { label: "Domain Classifier", color: "text-blue-400" },
  "product-manager": { label: "Product Manager", color: "text-violet-400" },
  "signal-scout": { label: "Signal Scout", color: "text-amber-400" },
  cfo: { label: "CFO", color: "text-emerald-400" },
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-[hsl(var(--muted))] rounded-md p-4 text-xs font-mono overflow-x-auto my-3">
            {codeLines.join("\n")}
          </pre>
        )
        codeLines = []
      }
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) { codeLines.push(line); continue }
    if (!line.trim()) { elements.push(<div key={`br-${i}`} className="h-2" />); continue }
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={i} className="border-[hsl(var(--border))] my-4" />); continue }

    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-4 mb-2">{renderInline(line.slice(4))}</h4>)
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-semibold mt-5 mb-2">{renderInline(line.slice(3))}</h3>)
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 mb-1">
          <span className="text-[hsl(var(--muted-foreground))] text-sm shrink-0">{line.match(/^\d+/)?.[0]}.</span>
          <span className="text-sm">{renderInline(line.replace(/^\d+\.\s+/, ""))}</span>
        </div>
      )
      continue
    }

    if (line.startsWith("- ") || line.startsWith("  - ")) {
      const indent = line.startsWith("  - ") ? "ml-6" : "ml-2"
      elements.push(
        <div key={i} className={`flex gap-2 ${indent} mb-1`}>
          <span className="text-[hsl(var(--primary))] mt-1.5 shrink-0">&bull;</span>
          <span className="text-sm">{renderInline(line.replace(/^\s*-\s+/, ""))}</span>
        </div>
      )
      continue
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      if (/^[|\s:-]+$/.test(line.trim())) continue
      const cells = line.split("|").filter(Boolean).map(c => c.trim())
      elements.push(
        <div key={i} className="grid grid-cols-2 gap-2 text-sm py-1 border-b border-[hsl(var(--border))]/50">
          {cells.map((cell, j) => (
            <span key={j} className={j === 0 ? "font-medium" : "text-[hsl(var(--muted-foreground))]"}>{renderInline(cell)}</span>
          ))}
        </div>
      )
      continue
    }

    elements.push(<p key={i} className="text-sm leading-relaxed mb-1">{renderInline(line)}</p>)
  }

  return <div>{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded font-mono text-[hsl(var(--primary))]">{part.slice(1, -1)}</code>
    }
    return part
  })
}

export function Dashboard({ cards, enrichments }: { cards: IdeaCard[]; enrichments: EnrichmentResult[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const enrichmentMap = new Map(enrichments.map(e => [e.ideaId, e]))
  const enriched = cards.filter(c => c.hasEnrichment)
  const total = cards.length
  const stubs = cards.filter(c => c.status === "catalog-imported").length

  const selectedCard = selectedId ? cards.find(c => c.id === selectedId) : null
  const selectedEnrichment = selectedId ? enrichmentMap.get(selectedId) : null

  if (selectedCard) {
    return (
      <main className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors mb-6 inline-block"
        >
          &larr; All Ideas
        </button>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-[hsl(var(--muted-foreground))]">{selectedCard.id}</span>
            {selectedCard.hasEnrichment && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Enriched</span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{selectedCard.title}</h1>
          {selectedCard.oneLiner && (
            <p className="mt-2 text-lg text-[hsl(var(--muted-foreground))]">{selectedCard.oneLiner}</p>
          )}
        </header>

        {selectedEnrichment ? (
          <div className="space-y-6">
            {selectedEnrichment.manifest && (
              <div className="rounded-lg border-2 border-[hsl(var(--primary))]/30 bg-[hsl(var(--accent))]/20 p-6">
                <h2 className="text-lg font-semibold text-[hsl(var(--primary))] mb-4">Manifest</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Archetype", selectedEnrichment.manifest.archetype],
                    ["Monetization", selectedEnrichment.manifest.monetization],
                    ["Service", selectedEnrichment.manifest.deploy.service],
                    ["Region", selectedEnrichment.manifest.deploy.region],
                    ["Memory", selectedEnrichment.manifest.deploy.memory],
                    ["Volume", selectedEnrichment.manifest.deploy.volume ? "Yes" : "No"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{label}</span>
                      <p className="font-mono text-sm mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Domains</span>
                  <div className="flex gap-2 mt-1">
                    {selectedEnrichment.manifest.domain.map(d => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">{d}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Stack</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedEnrichment.manifest.stack.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-mono">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["Problem", selectedEnrichment.manifest.enrichment.problem],
                    ["Concept", selectedEnrichment.manifest.enrichment.concept],
                    ["MVP", selectedEnrichment.manifest.enrichment.mvp],
                  ].map(([label, text]) => (
                    <div key={label}>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{label}</span>
                      <p className="text-sm mt-1 leading-relaxed">{text}</p>
                    </div>
                  ))}
                  {selectedEnrichment.manifest.enrichment.killCriteria.length > 0 && (
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Kill Criteria</span>
                      <ul className="mt-1 space-y-1">
                        {selectedEnrichment.manifest.enrichment.killCriteria.map((k, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-red-400 shrink-0">&#x2715;</span>{k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedEnrichment.manifest.enrichment.capabilityGap.length > 0 && (
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Capability Gaps</span>
                      <ul className="mt-1 space-y-1">
                        {selectedEnrichment.manifest.enrichment.capabilityGap.map((g, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-amber-400 shrink-0">&#x26A0;</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedEnrichment.stages.map(stage => {
              const meta = roleLabels[stage.role] || { label: stage.role, color: "" }
              return (
                <section key={stage.role} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                  <h2 className={`text-lg font-semibold mb-4 ${meta.color}`}>{meta.label}</h2>
                  <MarkdownContent content={stage.output} />
                </section>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
            <p className="text-[hsl(var(--muted-foreground))]">No enrichment yet.</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
              Run <code className="bg-[hsl(var(--muted))] px-2 py-0.5 rounded font-mono text-xs">pnpm koba enrich {selectedCard.id}</code>
            </p>
          </div>
        )}
      </main>
    )
  }

  // List view
  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[hsl(var(--primary))]">Koba</span> Factory Dashboard
        </h1>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">
          {total} ideas &middot; {enriched.length} enriched &middot; {stubs} stubs
        </p>
      </header>

      {enriched.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-[hsl(var(--primary))]">Enriched</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedId(card.id)}
                className="group block rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-colors hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]/30 text-left"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{card.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[card.status] || statusColors.unknown}`}>
                    {card.status}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-[hsl(var(--primary))] transition-colors">{card.title}</h3>
                {card.oneLiner && (
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">{card.oneLiner}</p>
                )}
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-500 font-medium">Enriched</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">All Ideas ({total})</h2>
        <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                <th className="text-left p-3 font-medium text-[hsl(var(--muted-foreground))]">ID</th>
                <th className="text-left p-3 font-medium text-[hsl(var(--muted-foreground))]">Title</th>
                <th className="text-left p-3 font-medium text-[hsl(var(--muted-foreground))] hidden md:table-cell">One-Liner</th>
                <th className="text-left p-3 font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="text-center p-3 font-medium text-[hsl(var(--muted-foreground))]">Enriched</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => (
                <tr
                  key={card.id}
                  className={`border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))]/30 transition-colors ${card.hasEnrichment ? "cursor-pointer" : ""}`}
                  onClick={() => card.hasEnrichment && setSelectedId(card.id)}
                >
                  <td className="p-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                    {card.hasEnrichment ? (
                      <span className="text-[hsl(var(--primary))]">{card.id}</span>
                    ) : card.id}
                  </td>
                  <td className="p-3 font-medium">{card.title}</td>
                  <td className="p-3 text-[hsl(var(--muted-foreground))] hidden md:table-cell max-w-md truncate">{card.oneLiner}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[card.status] || statusColors.unknown}`}>
                      {card.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`h-2 w-2 rounded-full inline-block ${card.hasEnrichment ? "bg-emerald-500" : "bg-zinc-700"}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
