# Playbook: Data Fetching & Scraping

Patterns for pulling data from external sources — public APIs, HTML scraping, browser automation. Every data-driven project in the monorepo follows one of these patterns.

Learned from: wuxtry, classgrid, bookem, paperclaw, upstreamdown (2026-03-11)

## Decision: Which Pattern?

| Pattern | When to use | Reference project |
|---------|-------------|-------------------|
| **API fetch** | JSON APIs, government data, Socrata portals | wuxtry, paperclaw |
| **HTML scrape** | No API available, need to parse web pages | classgrid |
| **Browser automation** | Sites behind auth, JS-rendered content | bookem |
| **Turnstile-protected** | Cloudflare Turnstile CAPTCHA blocks fetch/cheerio | foundry (BACB) |

Start with the simplest pattern that works. Don't use Puppeteer if fetch + cheerio will do.

## Pattern 1: API Fetching (Most Common)

Use `fetchJSON()` from `@pauljump/api-kit` for all external API calls. It handles retries, timeouts, and error recovery.

```typescript
import { fetchJSON } from "@pauljump/api-kit"

// Basic usage — GET with retries and 10s timeout
const data = await fetchJSON<MyType[]>("https://api.example.com/data")

// With options
const data = await fetchJSON<MyType[]>("https://api.example.com/data", {
  timeout: 30_000,  // 30s for slow government APIs
  retries: 3,
  headers: { "X-App-Token": process.env.APP_TOKEN },
})
```

### Socrata APIs (NYC OpenData, etc.)

Many government datasets use Socrata (SODA API). Same base pattern everywhere:

```typescript
const SODA_BASE = "https://data.cityofnewyork.us/resource"
const DATASET_ID = "ic3t-wcy2"  // DOB Job Application Filings

// Simple query
const jobs = await fetchJSON<DOBJob[]>(
  `${SODA_BASE}/${DATASET_ID}.json?$where=job_type='NB'&$limit=1000`
)

// Complex query with SoQL
const stalled = await fetchJSON<DOBJob[]>(
  `${SODA_BASE}/${DATASET_ID}.json?` + new URLSearchParams({
    "$where": "job_type='NB' AND proposed_dwelling_units > '10'",
    "$select": "job__,borough,house__,street_name,proposed_dwelling_units,job_status,gis_council_district",
    "$limit": "50000",
    "$order": "latest_action_date DESC",
  })
)
```

**Socrata gotchas:**
- Default limit is 1000 rows. Always set `$limit` explicitly.
- Numeric comparisons on string fields don't work as expected. Filter client-side if needed.
- Some queries on large datasets time out (~60s). Cache results server-side.
- No API key required for most datasets, but rate limits apply (~1000 req/hour without a token).
- App tokens (free, optional) raise the rate limit. Register at the data portal.

### NYC-Specific APIs (No Key Required)

| API | What it does | URL pattern |
|-----|-------------|-------------|
| NYC GeoSearch (Pelias) | Address → lat/lng + BBL | `geosearch.planninglabs.nyc/v2/search?text=120+Broadway` |
| NYC OpenData (Socrata) | DOB permits, 311, inspections | `data.cityofnewyork.us/resource/{id}.json` |
| Census ACS | Demographics, housing, income | `api.census.gov/data/2022/acs/acs5` (key recommended) |

### Caching & Refresh

For data that doesn't change frequently (permits, census, etc.), cache server-side:

```typescript
// Next.js Route Handler with revalidation
export async function GET() {
  const data = await fetchJSON<Project[]>(NYC_OPENDATA_URL)
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=86400" },  // 24h
  })
}

// Or use api-kit cron for background refresh
import { startCron } from "@pauljump/api-kit"

startCron({
  name: "refresh-permits",
  intervalMs: 24 * 60 * 60 * 1000,  // daily
  runImmediately: true,
  fn: async () => {
    const data = await fetchJSON(NYC_OPENDATA_URL)
    db.prepare("DELETE FROM permits").run()
    // batch insert...
  },
})
```

## Pattern 2: HTML Scraping (cheerio)

When there's no API. Based on classgrid's BaseScraper pattern.

```bash
pnpm add cheerio
```

```typescript
import * as cheerio from "cheerio"

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return cheerio.load(await res.text())
}

// Usage
const $ = await fetchHtml("https://example.com/listings")
const items = $(".listing-card").map((_, el) => ({
  title: $(el).find("h3").text().trim(),
  price: $(el).find(".price").text().trim(),
  url: $(el).find("a").attr("href"),
})).get()
```

### Rate Limiting

Be polite. Every scraper should have deliberate delays:

```typescript
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Between requests to the same domain
for (const url of urls) {
  const data = await fetchHtml(url)
  // process...
  await sleep(300)  // 300ms between requests
}
```

**Conventions:**
- 300ms minimum between requests to the same domain
- 3s+ for sites with aggressive rate limiting (courts, government)
- Include a User-Agent header (don't pretend to be a bot, but don't hide either)

## Pattern 3: Browser Automation (Puppeteer)

Last resort. Only when content is JS-rendered or behind auth/Cloudflare.

```bash
pnpm add puppeteer
```

See `bookem/apps/web/src/lib/scraper.ts` for a full reference implementation with:
- Session management and re-login on token expiration
- Mobile URL bypass for Cloudflare
- Backfill with progress tracking
- Deduplication via composite keys

**Don't templatize this.** Browser scraping is too domain-specific. Copy from bookem and adapt.

## Pattern 4: Turnstile-Protected Scraping (puppeteer-real-browser / paid solver)

When the target site has Cloudflare Turnstile CAPTCHA. **See `.claude/playbooks/turnstile-scraping.md` for the full playbook** — it covers the three Turnstile modes (interactive, managed, invisible), what works for each, and when to use a paid solver vs. data partnership instead.

## Database Pattern: Upsert on Conflict

All data pipelines should use upsert to handle re-fetches gracefully:

```typescript
const upsert = db.prepare(`
  INSERT INTO projects (id, address, units, status, district, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    status = excluded.status,
    updated_at = excluded.updated_at
`)

const insertMany = db.transaction((projects: Project[]) => {
  for (const p of projects) {
    upsert.run(p.id, p.address, p.units, p.status, p.district)
  }
})

insertMany(projects)
```

## Error Handling

Standard across all patterns:

1. **Retry on transient failures** — `fetchJSON` handles this automatically
2. **Skip on permanent failures** — log and continue, don't crash the pipeline
3. **Track provenance** — record when data was fetched and from where

```typescript
// Provenance tracking (from wuxtry pattern)
interface FetchResult<T> {
  data: T | null
  source: string
  fetchedAt: string
  status: "ok" | "error" | "empty" | "skipped"
  recordCount: number
  error?: string
}
```

## Data Streams as Platform Capabilities

Data connectors built for one project can serve others. When you build a data pipeline:

1. **Keep the fetcher separate from the consumer.** Don't mix "get DOB data" with "render the UI."
2. **Store raw data in a standard format.** SQLite tables or JSON files that any project can read.
3. **Document the data shape.** What fields exist, what they mean, what's nullable.
4. **Consider who else might use this data.** NYC permit data isn't just for UNIGNORABLE — it could power a real estate tool, a neighborhood tracker, a construction dashboard.

When a data stream is used by 2+ projects, extract it into a shared package or a standalone data service.
