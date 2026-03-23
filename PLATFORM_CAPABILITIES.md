# Platform Capabilities Catalog

> **What this is:** A single reference of everything the factory can do. Use this when ideating — if a capability is here, any app can have it for free. The best ideas are the ones where 80% of what's needed is already on this list.

Last updated: 2026-03-15

---

## AI & Intelligence

### LLM Integration — `@pauljump/llm-kit`
Provider-agnostic LLM client (OpenAI + Anthropic). Chat, tool use, swap providers with zero code changes.
- **Use when:** Your app needs to generate text, classify input, extract entities, answer questions, or call tools.
- **Cost:** Per-token pricing from provider (~$3-15/M tokens depending on model).

### Streaming AI UI — `packages/web-templates/`
Vercel AI SDK patterns: `useChat()` hook, `streamText()` API route, Zod structured outputs. Drop-in chat component.
- **Use when:** Your web app needs a conversational interface where responses stream in word-by-word.
- **Cost:** Same as LLM — per-token.

### Real-Time Voice — `@pauljump/voice-kit`
OpenAI Realtime API. Full-duplex voice conversations via WebSocket. Server-side session + browser relay. Tool calling mid-conversation.
- **Use when:** Users should talk, not type. Hands-free, screen-free interactions. Phone bots.
- **Cost:** ~$0.04/minute of speech-to-speech.

### On-Device AI — `packages/ios-templates/FoundationModelManager.swift`
Apple Foundation Models (iOS 26+). Text generation, streaming, structured output via `@Generable`. Runs entirely on device.
- **Use when:** Intelligence that should be instant, free, and work offline. Summarization, classification, smart suggestions.
- **Cost:** Free. Zero API calls.

### Document Intelligence — `@pauljump/document-kit` + `DocumentScannerView.swift`
OCR and structured data extraction via Claude vision. iOS camera scanning via VisionKit.
- **Use when:** Users photograph documents and your app extracts structured data. Receipts, tax forms, competitor flyers, homework.
- **Cost:** ~$0.01-0.03 per document.

### MCP Server — `.claude/templates/mcp-server/`
Expose any project's data to AI agents via Model Context Protocol. Works with Claude Desktop, ChatGPT, Cursor.
- **Use when:** You want AI agents to be able to query your app's data or trigger actions.
- **Cost:** Free (runs locally or on your server).

---

## User Experience (iOS)

### Live Activities — `LiveActivityManager.swift`
Lock Screen + Dynamic Island. Show real-time data outside the app. Push-updatable.
- **Use when:** Users need glanceable, persistent info. Price tracking, timers, delivery status, live scores.

### Siri / App Intents — `AppIntentsManager.swift`
Voice control via Siri, Spotlight search, Shortcuts app integration. App actions without opening the app.
- **Use when:** Users should be able to say "Hey Siri, [do something in your app]." Also makes your app searchable.

### Deep Linking + QR — `DeepLinkRouter.swift`
Universal Links, custom URL schemes, QR code scanner. Centralized URL routing to typed destinations.
- **Use when:** Physical-world entry points (QR on a sign, NFC tap), sharing deep links, marketing campaigns.

### Background Processing — `BackgroundTaskManager.swift`
BGTaskScheduler for app refresh and heavy processing. Silent push triggers.
- **Use when:** Your app should sync data, process content, or update state while the user isn't looking.

### Push Notifications — `PushNotificationManager.swift`
APNs registration, token handling, foreground/background notification handling.
- **Use when:** Users need to know about something right now. Price drops, new matches, alerts.

### StoreKit Payments — `StoreManager.swift`
StoreKit 2 for in-app purchases. Single product template.
- **Use when:** Monetizing an iOS app via App Store (subscriptions, one-time purchases).

### Document Scanner — `DocumentScannerView.swift`
VisionKit camera scanner. Photograph documents, get clean images back.
- **Use when:** Users need to capture physical documents. Pairs with document-kit for extraction.

---

## Data & Search

### Data Pipelines — `@pauljump/etl-kit`
Fetch with retry + exponential backoff, rate limiting, HTML scraping (cheerio), pipeline orchestrator.
- **Use when:** Your app ingests external data. API polling, web scraping, data transformation.
- **Cost:** Free (compute only).

### Full-Text Search — `@pauljump/search-kit`
SQLite FTS5 with BM25 ranking, snippet generation, query sanitization. Composable multi-field filter builder.
- **Use when:** Users need to search and filter content. Class discovery, apartment search, product catalogs.
- **Cost:** Free (SQLite).

### Government Data — `@pauljump/socrata-kit`
Socrata/open-data API wrapper. Budget data, permits, inspections — any city's open data portal.
- **Use when:** Building civic tech. Budget transparency, public records, government service data.
- **Cost:** Free (public APIs).

### Geographic Data — `@pauljump/geo-registry`
Geographic registry with H3 hexagonal indexing. Clustering, density scoring.
- **Use when:** Location-based features. Service areas, density analysis, proximity search.
- **Cost:** Free.

### Analytics — `@pauljump/analytics-kit`
Event tracking, user identification, counts by time period, funnel analysis. SQLite-backed.
- **Use when:** You need to understand how people use your app. Feature adoption, conversion funnels, retention.
- **Cost:** Free (self-hosted).

---

## Commerce & Engagement

### Stripe Payments — `@pauljump/payments-kit`
Checkout sessions, billing portal, webhook verification. Subscription and one-time modes.
- **Use when:** Charging money on the web. Subscriptions, one-time purchases, marketplace fees.
- **Cost:** Stripe fees (2.9% + 30¢).

### Gamification — `@pauljump/gamify-kit`
Points ledger, streak tracking, achievement/badge system. SQLite-backed.
- **Use when:** Users should feel progress. Learning apps, loyalty programs, habit formation, leaderboards.
- **Cost:** Free.

---

## Communication

### Email — `@pauljump/notify-kit` (email channel)
Resend transactional email. Magic links, alerts, reports.
- **Use when:** Sending email to users. Auth flows, notifications, weekly digests.
- **Cost:** Resend pricing (free tier: 100/day, 3K/mo).

### Push Notifications — `@pauljump/notify-kit` (push channel)
APNs push sending (types defined, implementation pending full HTTP/2 client).
- **Use when:** Server-side push delivery. Pairs with PushNotificationManager.swift on iOS.

### Event Bus — `@pauljump/event-bus`
In-process pub/sub + cross-service webhook delivery with HMAC signing and retry.
- **Use when:** Services need to react to each other. Price drop → notification → Live Activity update.
- **Cost:** Free.

---

## Monitoring & Prediction

### Availability Monitoring — `@pauljump/watch-kit`
Snapshot store, diff engine, condition evaluation, action dispatch. "Alert me when X changes."
- **Use when:** Your app watches external data and users want alerts on changes. Tee times, price drops, inventory availability.
- **Cost:** Free (compute + storage only).

### Pattern Prediction — `@pauljump/predict-kit`
Segmented bucketing, outcome probability learning, confidence scoring. "How likely is X to happen?"
- **Use when:** Your app has historical data and users want predictions. Price drop probability, availability forecasting.
- **Cost:** Free (SQLite-backed math, no ML APIs).

---

## Infrastructure

### Server Framework — `@pauljump/api-kit`
Fastify server with helmet, CORS, rate limiting, health check, SQLite, JWT auth, env validation, cron, HTTP client.
- **Use when:** Building any backend. This is the foundation.

### File Storage — `@pauljump/storage-kit`
Google Cloud Storage uploads, signed URLs, delete, existence check. Zero-config on Cloud Run.
- **Use when:** Users upload files/images. Profile photos, document scans, attachments.
- **Cost:** GCS pricing (~$0.02/GB/month).

### Job Queue — `@pauljump/job-queue`
Persistent scheduled jobs with cron expressions, retry on failure, job history. SQLite-backed.
- **Use when:** Reliable scheduling. Weekly reports, nightly data refreshes, deferred processing.
- **Cost:** Free.

### Dockerfile Template — `.claude/templates/Dockerfile.api`
Parameterized multi-stage Docker build for monorepo API projects.
- **Use when:** Deploying any API project to Cloud Run.

---

## Web UI

### Maps — `packages/web-templates/components/ui/map.tsx`
Leaflet + OpenStreetMap. Markers, GeoJSON overlays, clustering. No API key needed.
- **Use when:** Showing locations on a map. Service areas, property locations, event venues.
- **Cost:** Free.

### Design System — `packages/web-templates/globals.css`
HSL token system with light/dark mode. Swap values to rebrand any app.
- **Use when:** Starting any web app. Copy and change the colors.

### Button Component — `packages/web-templates/components/ui/button.tsx`
CVA button with 6 variants + 4 sizes.
- **Use when:** You need buttons. Which is always.

---

## Ideation Prompt

When evaluating a new idea, ask:

1. **Which capabilities does it use?** Count them. If it uses 5+, the factory is built for this idea.
2. **What's missing?** If only 1-2 things are missing, the idea is close. If 5+ are missing, the idea is fighting the factory.
3. **What's the unique value?** The capabilities are commodity. The idea's value comes from the *combination* and the *domain knowledge* — not from the infrastructure.
4. **Can it ship in one session?** If the factory has everything, idea-to-live-app should take hours, not weeks.

### Capability Combos That Create Products

| Combo | Product Category |
|---|---|
| LLM + streaming UI + search | Conversational search engine |
| Voice + LLM + domain data | Voice-first advisor |
| Document scanner + OCR + structured extraction | Paper-to-data converter |
| Live Activities + push + event bus | Real-time monitoring app |
| Gamification + streaks + push | Habit/learning app |
| Maps + geo + etl + search | Location intelligence platform |
| Payments + analytics + gamification | Marketplace with engagement loop |
| On-device AI + background processing | Smart assistant that works offline |
| Siri + deep linking + Live Activities | Ambient app (lives outside the app icon) |
| MCP + search + analytics | AI-queryable data product |
| Watch-kit + predict-kit + push + Live Activities | "Alert me when X is likely" app |
| Voice + payments + analytics + job-queue | AI receptionist / phone agent |
