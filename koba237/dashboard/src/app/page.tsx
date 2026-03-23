import { loadIdeaCards, loadAllEnrichments } from "@/lib/data"
import { Dashboard } from "@/components/dashboard"

export const dynamic = "force-dynamic"

export default function HomePage() {
  const cards = loadIdeaCards()
  const enrichments = loadAllEnrichments()

  return <Dashboard cards={cards} enrichments={enrichments} />
}
