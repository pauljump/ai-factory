# Web Templates

Copyable starter files for Next.js web apps. The web equivalent of `packages/ios-templates/`.

**These are templates, not a package.** Copy them into your project and customize. Don't import from here.

## How to Use

```bash
# From your project directory (e.g. unignorable/)
mkdir -p src/app src/lib src/components/ui

# Copy the templates
cp packages/web-templates/globals.css src/app/
cp packages/web-templates/app/layout.tsx src/app/
cp packages/web-templates/lib/utils.ts src/lib/
cp packages/web-templates/components/ui/button.tsx src/components/ui/
cp packages/web-templates/tailwind.config.ts .
cp packages/web-templates/next.config.ts .
cp packages/web-templates/tsconfig.json .
cp packages/web-templates/.env.example .
cp packages/web-templates/.gitignore .
cp packages/web-templates/Dockerfile .

# AI streaming (if your app needs conversational UI)
mkdir -p src/app/api/chat
cp packages/web-templates/lib/ai.ts src/lib/
cp packages/web-templates/app/api/chat/route.ts src/app/api/chat/
cp packages/web-templates/components/ui/chat.tsx src/components/ui/

# Map (if your app needs interactive maps)
cp packages/web-templates/components/ui/map.tsx src/components/ui/
cp packages/web-templates/lib/geo.ts src/lib/
```

## What to Customize

| File | What to change |
|------|---------------|
| `globals.css` | Swap HSL values in `:root` to rebrand. Everything adapts. |
| `app/layout.tsx` | Font, metadata (title, description, OG image) |
| `next.config.ts` | Add `serverExternalPackages` if using native modules |
| `.env.example` | Add project-specific env vars |
| `Dockerfile` | Usually works as-is for Cloud Run deploy |
| `components/ui/map.tsx` | Default center, zoom, tile layer URL, marker icon |
| `lib/geo.ts` | Implement `geocode()` with your chosen provider |
| `lib/ai.ts` | Swap provider (Anthropic/OpenAI), change default model |
| `app/api/chat/route.ts` | Change system prompt, add structured output schema |

## What's Included

- **`globals.css`** — HSL token system with light/dark mode
- **`lib/utils.ts`** — `cn()` for className merging (clsx + tailwind-merge)
- **`tailwind.config.ts`** — HSL color extension, container, border radius
- **`app/layout.tsx`** — Google Font + metadata + body wrapper
- **`next.config.ts`** — Standalone output for containerization
- **`components/ui/button.tsx`** — CVA button with 6 variants + 4 sizes
- **`tsconfig.json`** — Strict mode, `@/*` path alias, Next.js plugin
- **`Dockerfile`** — Multi-stage build for Cloud Run (node:22-alpine)
- **`.env.example`** — Organized template for common env vars
- **`lib/ai.ts`** — AI provider config (Anthropic default, easy to swap)
- **`app/api/chat/route.ts`** — Streaming chat API route with `streamText()` + structured output example
- **`components/ui/chat.tsx`** — Drop-in chat UI with `useChat()` hook, streaming responses
- **`components/ui/map.tsx`** — Interactive map with markers + GeoJSON (react-leaflet + OpenStreetMap)
- **`lib/geo.ts`** — Geocode stub (Nominatim/Google/Mapbox) + haversineDistance()
- **`.gitignore`** — Standard Next.js + database + IDE ignores

## Dependencies to Install

```bash
# Base
pnpm add next@latest react@latest react-dom@latest

# Styling
pnpm add tailwindcss@latest tailwindcss-animate class-variance-authority clsx tailwind-merge

# UI primitives (add as needed)
pnpm add @radix-ui/react-slot
# pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu ...

# Icons
pnpm add lucide-react

# AI streaming (add for conversational UI)
pnpm add ai @ai-sdk/anthropic
# pnpm add @ai-sdk/openai  # if using OpenAI instead
# pnpm add zod              # if using structured outputs

# Maps (add for location/map apps)
pnpm add react-leaflet leaflet
pnpm add -D @types/leaflet

# Data visualization (add for dashboard/chart apps)
pnpm add recharts

# Dev
pnpm add -D typescript@latest @types/react @types/node
```

## Data Visualization (Recharts)

For apps that need charts, graphs, or data dashboards, use **Recharts**. It's the factory-standard charting library — composable React components built on D3.

```bash
pnpm add recharts
```

Common chart types:
- `LineChart` — price trends, time series
- `BarChart` — comparisons, distributions
- `AreaChart` — volume over time
- `PieChart` — breakdowns

Example usage:
```tsx
"use client"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export function PriceChart({ data }: { data: Array<{ date: string; price: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

Key patterns:
- Always use `"use client"` — Recharts requires browser APIs
- Wrap in `ResponsiveContainer` for responsive sizing
- Use HSL CSS vars from `globals.css` for theme-consistent colors
- `dot={false}` for cleaner line charts with many data points

## Maps (react-leaflet + OpenStreetMap)

For apps that need interactive maps — property listings, service areas, location pickers, geo dashboards. Uses OpenStreetMap tiles (free, no API key required).

```bash
pnpm add react-leaflet leaflet
pnpm add -D @types/leaflet
```

Two files work together:

| File | Purpose |
|------|---------|
| `components/ui/map.tsx` | Drop-in map with markers, popups, and GeoJSON overlay support. |
| `lib/geo.ts` | Geocoding stub (pick a provider) + `haversineDistance()` utility. |

### Quick start

1. Copy both files (see copy commands above)
2. Import Leaflet CSS in your `layout.tsx` or page: `import "leaflet/dist/leaflet.css"`
3. Use the `<Map />` component:

```tsx
import { Map } from "@/components/ui/map"

export default function Page() {
  return (
    <Map
      markers={[
        { lat: 40.7128, lng: -74.006, popup: "New York City" },
        { lat: 40.7580, lng: -73.9855, label: "Times Square" },
      ]}
      center={[40.7128, -74.006]}
      zoom={13}
      height="500px"
    />
  )
}
```

### GeoJSON overlay

Pass a GeoJSON object to render boundaries, zones, or shapes:

```tsx
<Map geojson={neighborhoodBoundaries} markers={listings} />
```

### Distance calculation

```ts
import { haversineDistance } from "@/lib/geo"

const km = haversineDistance(
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7580, lng: -73.9855 },
)
// ~5.1 km
```

Key patterns:
- `"use client"` is required — Leaflet uses browser APIs
- Leaflet CSS must be imported or the map renders incorrectly
- Default center is NYC — change it for your app's geography
- The marker icon fix in `map.tsx` handles a known Next.js/webpack issue with Leaflet icons

## AI Streaming (Vercel AI SDK)

For apps that need conversational AI interfaces — chatbots, "ask about your data" features, content generation. Uses Vercel AI SDK with Anthropic (Claude) by default.

```bash
pnpm add ai @ai-sdk/anthropic
```

Three files work together:

| File | Purpose |
|------|---------|
| `lib/ai.ts` | Provider config. Swap `createAnthropic` for `createOpenAI` to change providers. |
| `app/api/chat/route.ts` | API route that streams responses via `streamText()`. |
| `components/ui/chat.tsx` | Drop-in chat UI with `useChat()` hook. |

### Quick start

1. Copy the three files (see copy commands above)
2. Set `ANTHROPIC_API_KEY` in your `.env`
3. Use the `<Chat />` component in any page:

```tsx
import { Chat } from "@/components/ui/chat"

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Chat />
    </main>
  )
}
```

### Structured outputs (Zod schemas)

The API route includes a commented example for structured JSON output using `streamObject()` + Zod. Uncomment and customize the schema to get typed, validated AI responses instead of freeform text.

### Swapping providers

Edit `lib/ai.ts` — change the import and constructor:

```ts
// OpenAI
import { createOpenAI } from "@ai-sdk/openai"
export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
export const defaultModel = openai("gpt-4o")
```

Key patterns:
- `lib/ai.ts` is server-only — never import it in client components
- `useChat()` auto-calls `/api/chat` — change the `api` option to use a different endpoint
- Use HSL CSS vars from `globals.css` for theme-consistent styling
- The chat component handles loading states, errors, and message history out of the box
