---
id: "IDEA-XXX"
title: ""
status: "exploring"
confidence: "medium"
one_liner: ""
source: ""
created_at: ""
updated_at: ""
domain_tags: []
user_tags: []
capability_tags: []
distribution_tags: []
risk_tags: []
related: []
---

# Title

## The Problem

(Who hurts and why. Be specific — name the user, the situation, and what's broken.)

## Core Concept

(What the user does, what happens. One paragraph that makes someone say "oh, I get it.")

## MVP

(The smallest thing that proves the concept. 3-5 bullet points max. This is what gets built first.)

## Open Questions

(What you'd need to figure out before or during the build.)

## Stack Profile

Choose from the factory's current capabilities. If the idea needs something the factory doesn't support yet, say so in Open Questions — don't invent custom infra.

**Frontend:**
- [ ] iOS app (Swift — ios-templates + TestFlight playbook)
- [ ] watchOS app (Swift — watchos-app-setup playbook, requires iPhone companion)
- [ ] Web app (Next.js — web-app-setup playbook)
- [ ] Consumer agent (chat-based, no traditional UI)
- [ ] None (API/backend only)

**Backend:**
- [ ] api-kit (Fastify + SQLite + JWT auth + Cloud Run)
- [ ] None (client-only / static)

**Data:**
- [ ] SQLite via api-kit (single-writer, persistent on Cloud Run)
- [ ] Prisma + PostgreSQL (multi-user, relational)
- [ ] User-local only (no server storage)
- [ ] None

**AI:**
- [ ] LLM calls needed (specify: classification, generation, extraction, etc.)
- [ ] engram-proxy (if repeated LLM patterns expected)
- [ ] None

**Payments:**
- [ ] StoreKit 2 (iOS in-app purchase)
- [ ] None / free

**Distribution:**
- [ ] App Store (TestFlight → production)
- [ ] Web (Cloud Run / Vercel)
- [ ] WhatsApp / SMS (Twilio)
- [ ] API-only (other apps consume it)

(Agent: fill this out based on the idea. If only a one-liner was provided, make your best guess and flag anything uncertain in Open Questions.)

## Insights

(Append new learnings here as the idea evolves. Any session that discovers something relevant — a new factory capability, a technical constraint, a user insight — adds a dated entry. Cards get smarter over time.)

<!-- Example:
- 2026-03-10: Xcode 26.3 MCP integration could speed up SwiftUI iteration for this app
- 2026-03-15: Similar auth pattern already solved in a sibling project — reuse that approach
-->
