import type { Playbook } from './types.js'

const TODAY = new Date().toISOString().slice(0, 10)

/**
 * Generalized playbook templates that ship with the AI Factory.
 * These get activated and populated based on detected project patterns.
 */
export const PLAYBOOK_TEMPLATES: Playbook[] = [
  {
    id: 'deploy-cloud',
    name: 'Cloud Deploy (Docker/Container)',
    triggers: ['docker', 'dockerfile', 'cloud-run', 'gcloud', 'fly', 'railway'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your project has a Dockerfile or deploys to a cloud container service.

## Prerequisites

- Docker installed locally
- Cloud provider CLI configured (gcloud, flyctl, etc.)
- Container registry access

## The recipe

1. **Build the container image**
   - Ensure Dockerfile uses multi-stage builds for smaller images
   - Use .dockerignore to exclude node_modules, .git, test files

2. **Configure environment**
   - Map secrets from your provider's secret manager
   - Set memory limits appropriate for your app
   - Configure health check endpoint

3. **Deploy**
   - Push image to container registry
   - Deploy to service with appropriate flags
   - Verify health check responds

4. **Post-deploy**
   - Confirm service is healthy
   - Check logs for startup errors
   - Verify external connectivity

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'deploy-ios',
    name: 'iOS TestFlight Deploy',
    triggers: ['ios', 'swift', 'xcode', 'xcodegen', 'ios-swift'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your project is an iOS app that needs to go to TestFlight.

## Prerequisites

- Xcode installed
- Apple Developer account configured
- App Store Connect app created
- Signing certificates and provisioning profiles

## The recipe

1. **Generate project** (if using XcodeGen)
   - Run xcodegen to generate .xcodeproj
   - Verify scheme exists and builds

2. **Archive**
   - Clean build folder
   - Archive with release configuration
   - Verify archive succeeded

3. **Export**
   - Export archive for App Store distribution
   - Sign with distribution certificate

4. **Upload**
   - Upload to App Store Connect
   - Wait for processing
   - Verify build appears in TestFlight

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'deploy-local',
    name: 'Local Server Deploy',
    triggers: ['pm2', 'systemd', 'local-deploy', 'cloudflared', 'tunnel'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your project runs on your own hardware (Mac Mini, home server, VPS) with a tunnel or reverse proxy.

## Prerequisites

- Server accessible via SSH or local terminal
- Process manager (pm2, systemd) installed
- Tunnel or reverse proxy configured (Cloudflare Tunnel, nginx, etc.)

## The recipe

1. **Deploy code**
   - Pull latest from git or copy build artifacts
   - Install dependencies
   - Build if needed

2. **Configure process manager**
   - Add to pm2 ecosystem or systemd unit file
   - Set environment variables
   - Configure restart policy

3. **Wire networking**
   - Add route to tunnel/proxy config
   - Reload tunnel/proxy
   - Verify external access

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline / Scraping',
    triggers: ['etl', 'scraping', 'puppeteer', 'cheerio', 'socrata', 'data-pipeline', 'cron'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your project fetches data from external sources — APIs, scrapers, government datasets.

## Prerequisites

- Data source identified and accessible
- Rate limits understood
- Storage destination configured

## The recipe

1. **Fetch**
   - Use retry with exponential backoff
   - Respect rate limits
   - Handle pagination

2. **Transform**
   - Validate incoming data shape
   - Normalize fields
   - Handle missing/null values

3. **Store**
   - Write to database or file
   - Deduplicate on natural key
   - Log record counts

4. **Schedule**
   - Set up cron or recurring job
   - Configure alerting for failures
   - Monitor freshness

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'web-app-setup',
    name: 'Web App Setup (Next.js / React)',
    triggers: ['nextjs', 'next', 'react', 'web', 'tailwind'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

You're building a web application with a JavaScript/TypeScript framework.

## Prerequisites

- Node.js installed
- Package manager configured (pnpm, npm, yarn)

## The recipe

1. **Scaffold**
   - Create project structure
   - Configure TypeScript
   - Set up CSS framework (Tailwind, etc.)

2. **Layout**
   - Configure fonts and metadata
   - Set up global styles and theme tokens
   - Create root layout with providers

3. **Build**
   - Add routes and pages
   - Create components
   - Wire API handlers if needed

4. **Deploy**
   - Configure for your deploy target (standalone, serverless, etc.)
   - Set environment variables
   - Deploy and verify

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'api-setup',
    name: 'API Server Setup',
    triggers: ['fastify', 'express', 'api', 'api-kit', 'rest'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

You're building a backend API service.

## Prerequisites

- Node.js installed
- Database chosen (SQLite, PostgreSQL, etc.)

## The recipe

1. **Scaffold**
   - Create server with framework (Fastify, Express)
   - Configure CORS, helmet, rate limiting
   - Add health check endpoint
   - Set up environment validation

2. **Database**
   - Create schema
   - Set up migrations or setup SQL
   - Configure connection (WAL mode for SQLite, pool for Postgres)

3. **Routes**
   - Define route handlers
   - Add validation (Zod, etc.)
   - Wire authentication if needed

4. **Deploy**
   - Create Dockerfile
   - Configure persistent storage for SQLite
   - Deploy to container service

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'storekit-payments',
    name: 'StoreKit / In-App Purchases',
    triggers: ['storekit', 'iap', 'in-app-purchase'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your iOS app has paid features via App Store.

## Prerequisites

- App Store Connect agreements signed
- Product IDs created in App Store Connect
- Sandbox test accounts configured

## The recipe

1. **Configure products**
   - Define product IDs in App Store Connect
   - Set pricing and availability
   - Add to StoreKit configuration file for testing

2. **Implement StoreKit 2**
   - Listen for transactions on app launch
   - Request products from App Store
   - Handle purchase flow
   - Verify and finish transactions

3. **Test**
   - Test in Xcode sandbox
   - Test restore purchases
   - Test subscription lifecycle (if applicable)

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
  {
    id: 'watchos-app',
    name: 'watchOS App Setup',
    triggers: ['watchos', 'watch', 'apple-watch'],
    projectsUsing: [],
    lastVerified: TODAY,
    confidence: 'low',
    body: `## When to use this

Your project includes an Apple Watch companion app.

## Prerequisites

- Xcode with watchOS SDK
- iPhone companion app (required)

## The recipe

1. **Scaffold**
   - Add watchOS target
   - Configure Watch Connectivity for iPhone <-> Watch communication
   - Set up complications if needed

2. **Build**
   - Design for small screen (focus on glanceable info)
   - Use haptic feedback for interactions
   - Handle background refresh

3. **Deploy**
   - Watch app deploys with iPhone app via TestFlight
   - Test on physical device (simulator is unreliable for Watch Connectivity)

## Gotchas

[Populated from your projects during convert and ongoing use]

## Project-specific notes

[Populated from your projects during convert and ongoing use]`,
  },
]

/** Get playbook templates that match detected frameworks/patterns */
export function getRelevantTemplates(tags: string[]): Playbook[] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()))
  return PLAYBOOK_TEMPLATES.filter(t =>
    t.triggers.some(trigger => tagSet.has(trigger)),
  )
}
