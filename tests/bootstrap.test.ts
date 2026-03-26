import { describe, it, expect } from 'vitest'
import { parseDomainKnowledge } from '../scripts/bootstrap-knowledge.js'

const SAMPLE_MD = `# Domain Knowledge Registry

---

## API Providers

### Anthropic
- Admin API requires a separate key (\`sk-ant-admin-...\`), not the regular API key, for usage/cost endpoints — **meter**
- Anthropic cost endpoint returns cents as strings (not numbers) — parse accordingly — **meter**

### Polymarket
- Gamma API is free with no authentication required — **paperclaw, polyfeeds**

---

## iOS & Apple Platforms

### XcodeGen
- Doesn't support \`messages-extension\` product type natively — must run \`sed\` fix after every \`xcodegen generate\` — **paperclaw**

### Keyboard Extensions
- Strict memory limits (30-50MB) — statistical engine must be lightweight — **barkey**
- Run in separate process from containing app — communication requires App Groups shared storage — **barkey**

---

## Cloud & Infrastructure

### Google Cloud Run
- GCS FUSE mount required for SQLite persistence — **stuywatch, kithome**
- SQLite with GCS FUSE cannot handle WAL mode — must use DELETE journal mode — **kithome**

---
`

describe('parseDomainKnowledge', () => {
  it('returns an array of KnowledgeEntry objects', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('correctly maps domain headers to clean domain names', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const domains = new Set(entries.map(e => e.domain))
    expect(domains.has('api-providers')).toBe(true)
    expect(domains.has('ios')).toBe(true)
    expect(domains.has('infrastructure')).toBe(true)
  })

  it('sets tags from ### subsection headers', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const anthropicEntry = entries.find(e => e.body.includes('Admin API requires a separate key'))
    expect(anthropicEntry).toBeDefined()
    expect(anthropicEntry?.tags).toContain('anthropic')
  })

  it('extracts sourceProject from **project** at end of bullet', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const meterEntry = entries.find(e => e.body.includes('Admin API requires a separate key'))
    expect(meterEntry?.sourceProject).toBe('meter')
  })

  it('handles comma-separated projects by using the first one as sourceProject', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const polyEntry = entries.find(e => e.body.includes('Gamma API is free'))
    expect(polyEntry).toBeDefined()
    // sourceProject is the raw string from the bullet
    expect(polyEntry?.sourceProject).toContain('paperclaw')
  })

  it('sets body to the text before the em-dash separator', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const entry = entries.find(e => e.body.includes('Admin API requires a separate key'))
    expect(entry?.body).not.toContain('**meter**')
    expect(entry?.body).not.toContain(' — **meter**')
  })

  it('generates IDs that are slugified from domain-subsection-body', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/)
      expect(entry.id.length).toBeLessThanOrEqual(80)
    }
  })

  it('all entries have required fields', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    for (const entry of entries) {
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBeGreaterThan(0)
      expect(typeof entry.domain).toBe('string')
      expect(entry.domain.length).toBeGreaterThan(0)
      expect(Array.isArray(entry.tags)).toBe(true)
      expect(typeof entry.body).toBe('string')
      expect(entry.body.length).toBeGreaterThan(0)
      expect(typeof entry.sourceProject).toBe('string')
      expect(typeof entry.date).toBe('string')
      expect(['high', 'medium', 'low']).toContain(entry.confidence)
    }
  })

  it('correctly maps infrastructure domain', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    const infraEntries = entries.filter(e => e.domain === 'infrastructure')
    expect(infraEntries.length).toBeGreaterThan(0)
    const walEntry = infraEntries.find(e => e.body.includes('WAL mode'))
    expect(walEntry).toBeDefined()
    expect(walEntry?.tags).toContain('google-cloud-run')
  })

  it('parses the correct number of entries from sample', () => {
    const entries = parseDomainKnowledge(SAMPLE_MD)
    // 2 Anthropic + 1 Polymarket + 1 XcodeGen + 2 Keyboard + 2 Cloud Run = 8
    expect(entries.length).toBe(8)
  })
})
