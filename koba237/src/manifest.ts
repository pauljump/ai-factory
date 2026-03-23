import { z } from "zod";

/**
 * koba.yaml — the atomic artifact that bridges every stage of the factory line.
 * Enrichment writes it. Scaffold reads it. Deploy reads it. Fleet indexes it.
 */

export const StackPackage = z.enum([
  "api-kit",
  "web-templates",
  "ios-templates",
  "llm-kit",
  "teek",
  "etl-kit",
  "watch-kit",
  "notify-kit",
  "search-kit",
  "gamify-kit",
  "payments-kit",
  "analytics-kit",
  "storage-kit",
  "document-kit",
  "voice-kit",
  "predict-kit",
  "geo-registry",
  "socrata-kit",
  "event-bus",
  "job-queue",
  "pods-kit",
]);

export const Archetype = z.enum([
  "api-only",       // Fastify API, no frontend
  "api-web",        // Fastify API + Next.js frontend
  "web-only",       // Next.js only, no custom backend
  "ios-api",        // iOS app + Fastify API
  "ios-only",       // iOS app, no backend (or external API)
  "watchos-api",    // watchOS + companion iOS + API
  "agent",          // Consumer agent (WAD, etc.)
]);

export const Monetization = z.enum([
  "free",
  "waitlist-to-paid",
  "stripe-checkout",
  "storekit-iap",
  "usage-based",
  "lead-gen",
  "ad-supported",
  "open-source",
]);

export const DomainTag = z.enum([
  "consumer",
  "b2b",
  "data-product",
  "marketplace",
  "tool",
  "civic-tech",
  "health-wellness",
  "fintech",
  "developer-tools",
  "education",
  "real-estate",
  "sports-leisure",
  "media-content",
]);

export const KobaManifest = z.object({
  // Identity
  name: z.string().describe("Human-readable project name"),
  slug: z.string().regex(/^[a-z0-9-]+$/).describe("URL/directory-safe slug"),
  idea: z.string().regex(/^IDEA-\d+$/).describe("Idea card reference"),

  // Classification
  archetype: Archetype,
  domain: z.array(DomainTag).min(1),

  // Stack
  stack: z.array(StackPackage).min(1),

  // Environment
  env: z.record(z.string()).default({}),
  secrets: z.array(z.string()).default([]),

  // Deploy
  deploy: z.object({
    service: z.string().describe("Cloud Run service name"),
    region: z.string().default("us-east1"),
    memory: z.string().default("512Mi"),
    volume: z.boolean().default(false).describe("Persistent disk for SQLite"),
  }),

  // Health
  health: z.string().default("/health"),

  // Business
  monetization: Monetization,

  // Enrichment metadata
  enrichment: z.object({
    problem: z.string().describe("Who hurts and why"),
    concept: z.string().describe("What it does — one paragraph"),
    mvp: z.string().describe("Smallest thing that proves the concept"),
    killCriteria: z.array(z.string()).describe("What would make this not worth building"),
    capabilityGap: z.array(z.string()).default([]).describe("Factory capabilities needed but missing"),
  }),
});

export type KobaManifest = z.infer<typeof KobaManifest>;

/** Parse and validate a manifest object */
export function parseManifest(data: unknown): KobaManifest {
  return KobaManifest.parse(data);
}

/** Validate without throwing — returns result with errors */
export function validateManifest(data: unknown) {
  return KobaManifest.safeParse(data);
}
