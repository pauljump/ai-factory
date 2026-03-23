# Playbook: Turnstile-Protected Scraping

How to scrape websites protected by Cloudflare Turnstile CAPTCHA.

Learned from: production registry scrape (2026-03-14)

## When to Use This

- Target site has Cloudflare Turnstile (you'll see a "Verify you are human" widget or a hidden `cf-turnstile-response` field)
- Simple fetch/cheerio won't work because the form requires a Turnstile token
- Content is server-rendered (not behind a JS SPA — for SPAs, use Puppeteer directly)

**Don't use this if:** the site has no CAPTCHA. Start with Pattern 1 (API) or Pattern 2 (cheerio) from `data-fetching.md`. This is Pattern 4 — last resort.

## Turnstile Modes — Know What You're Dealing With

Cloudflare Turnstile has three modes. **You must identify which one the target uses before choosing an approach.**

| Mode | What You See | How It Works | Auto-Solvable? |
|------|-------------|--------------|----------------|
| **Interactive** | Visible checkbox ("Verify you are human") | User clicks checkbox, Turnstile validates | Yes — `puppeteer-real-browser` auto-clicks |
| **Managed** | Widget may or may not appear | Cloudflare decides if challenge is needed | Sometimes — depends on browser fingerprint |
| **Invisible** | Nothing visible, hidden input only | Silent background verification via browser attestation | No — requires paid solver or data partnership |

### How to Detect the Mode

```typescript
// After page loads, check the .cf-turnstile div
const widgetInfo = await page.evaluate(() => {
  const div = document.querySelector('.cf-turnstile');
  const iframes = div?.querySelectorAll('iframe') ?? [];
  const input = div?.querySelector('input[name="cf-turnstile-response"]');
  return {
    hasDiv: !!div,
    sitekey: div?.getAttribute('data-sitekey'),
    iframeCount: iframes.length,
    hasCheckbox: iframes.length > 0,  // Interactive mode has an iframe with checkbox
    inputType: input?.type,            // 'hidden' = invisible mode
  };
});
```

- **Interactive:** iframe present inside `.cf-turnstile`, visible checkbox
- **Invisible/Managed:** Only a hidden input, no iframe renders, no visible widget

## Approach 1: puppeteer-real-browser (Interactive Turnstile Only)

```bash
pnpm add puppeteer-real-browser
```

Works for sites with **interactive** Turnstile (visible checkbox). Does NOT work for invisible/managed mode.

```typescript
import { connect } from 'puppeteer-real-browser'

const { browser, page } = await connect({
  headless: 'new',     // 'new' for headless, false for visible browser
  turnstile: true,      // auto-click Turnstile checkbox
  args: ['--start-maximized'],
  connectOption: { defaultViewport: null },
})

await page.goto('https://example.com/protected-form', {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
})

// Wait for Turnstile token (check BOTH textarea and input — sites vary)
await page.waitForFunction(
  () => {
    const textarea = document.querySelector('textarea[name="cf-turnstile-response"]');
    const input = document.querySelector('input[name="cf-turnstile-response"]');
    const el = textarea || input;
    return el && (el as HTMLInputElement).value?.length > 0;
  },
  { timeout: 15_000 },
)

// Form interaction + submit as normal...
await browser.close()
```

## Approach 2: Paid CAPTCHA Solver (All Turnstile Modes)

For invisible/managed Turnstile, use a solver service. You send them the sitekey + page URL, they return a valid token. No browser fingerprinting needed.

| Service | Cost | NPM Package |
|---------|------|-------------|
| 2Captcha | ~$2.99/1000 solves | `2captcha-ts` |
| CapSolver | ~$2.50/1000 solves | `capsolver-npm` |

```typescript
import TwoCaptcha from '2captcha-ts'

const solver = new TwoCaptcha.Solver('YOUR_API_KEY')
const result = await solver.turnstile({
  sitekey: '0x4AAAAAABiYpxHRMqcMQyx8',  // from data-sitekey attribute
  pageurl: 'https://example.com/protected-form',
})

// Inject the token into the form
await page.evaluate((token) => {
  const input = document.querySelector('input[name="cf-turnstile-response"]');
  if (input) (input as HTMLInputElement).value = token;
}, result.data)

// Submit form normally
```

## Approach 3: Data Partnership / Verification-on-Demand

For registries with invisible Turnstile + terms that prohibit bulk scraping:
- **Email the registry** requesting data access for consumer safety / verification use
- **Verify on demand** — one lookup at a time when a provider claims their listing
- This is often the right call for professional registries (BACB, state licensing boards)

## Key Decisions

### Rate Limiting
- **3+ seconds between requests** to the same domain
- **Fresh page load per search** — don't reuse form state
- **Save results per-partition** (e.g., per state) so you can resume if interrupted

### State Partitioning
Most registries let you search by state/region. Iterate state by state:
- Keeps result sets manageable
- Enables resume on failure (skip already-scraped states)
- Mirrors the NPI download pattern we already use

## Gotchas

1. **Turnstile tokens expire.** Navigate fresh for each search — don't cache tokens.
2. **The response field name varies.** Some sites use `<textarea>`, others use `<input type="hidden">`. Check both.
3. **puppeteer-real-browser stopped updates Feb 2026.** Still works for interactive mode. If it breaks, check community forks on GitHub.
4. **Don't run in CI/Docker without Xvfb.** The library needs a display server on Linux. macOS works natively.
5. **Invisible mode = 401 on attestation.** If you see `challenges.cloudflare.com/.../pat/` returning 401, the browser is failing fingerprint checks. Switch to Approach 2 or 3.
6. **Respect terms of service.** Many registries prohibit bulk scraping. Use data for verification/consumer safety, not resale.

## Case Study: Professional Certificant Registry

**Target:** A professional certification registry — 81K records, server-rendered HTML tables
**Turnstile mode:** Invisible (hidden input, no iframe/checkbox renders)
**puppeteer-real-browser result:** Failed — 401 on attestation endpoint, token never populated
**Resolution:** Verification-on-demand approach. Paid solver (~$200 for full scrape) remains an option if bulk data is needed later.

**What we learned:**
- Turnstile JS loads and executes, but the invisible challenge fails silently
- The form uses `input[name="cf-turnstile-response"]` (not textarea)
- All results load in one page (DataTables does client-side pagination only)
- Form fields: certType checkboxes, status checkboxes, country/state selects, terms checkbox

## When NOT to Use This

- **Site has an API** — use `fetchJSON()` (Pattern 1)
- **Site is plain HTML, no CAPTCHA** — use cheerio (Pattern 2)
- **Site needs auth but no CAPTCHA** — use Puppeteer directly (Pattern 3)
- **Site uses Akamai/PerimeterX** — different anti-bot, this won't help
