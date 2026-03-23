#!/usr/bin/env node

import { enrich, formatResult, roadmap, formatRoadmap } from "./enrich.js";
import { buildCapabilityLedger } from "./enrich.js";
import { viewEnrichment, viewAll, viewRoadmap } from "./view.js";

const [command, ...args] = process.argv.slice(2);

function normalizeId(raw: string): string {
  return raw.startsWith("IDEA-") ? raw : `IDEA-${raw.padStart(3, "0")}`;
}

async function main() {
  switch (command) {
    case "enrich": {
      const ideaId = args[0];
      if (!ideaId) {
        console.error("Usage: pnpm koba enrich IDEA-XXX");
        process.exit(1);
      }
      const normalized = normalizeId(ideaId);

      console.log(`\nEnriching ${normalized}...\n`);
      const result = await enrich(normalized);
      console.log(formatResult(result));

      if (result.manifest) {
        console.log("\nManifest is valid. Ready for scaffold.");
        // Auto-generate and open the HTML view
        viewEnrichment(normalized);
      } else {
        console.log("\nManifest synthesis failed — review errors above.");
        process.exit(1);
      }
      break;
    }

    case "roadmap": {
      const ideaId = args[0];
      if (!ideaId) {
        console.error("Usage: pnpm koba roadmap IDEA-XXX");
        process.exit(1);
      }
      const normalizedRoadmap = normalizeId(ideaId);

      console.log(`\nGenerating roadmap for ${normalizedRoadmap}...\n`);
      const roadmapResult = await roadmap(normalizedRoadmap);
      console.log(formatRoadmap(roadmapResult));

      // Auto-generate and open the HTML view
      viewRoadmap(normalizedRoadmap);
      break;
    }

    case "view": {
      const ideaId = args[0];
      if (ideaId) {
        viewEnrichment(normalizeId(ideaId));
      } else {
        viewAll();
      }
      break;
    }

    case "ledger": {
      console.log(buildCapabilityLedger());
      break;
    }

    case "help":
    default: {
      console.log(`
koba — the factory line

Commands:
  enrich IDEA-XXX    Enrich an idea card through the 12-persona advisory board
  roadmap IDEA-XXX   Generate monetization, pricing, GTM roadmap (requires enrichment first)
  view [IDEA-XXX]    Open enrichment in browser (all if no ID given)
  ledger             Print the current factory capability ledger
  help               Show this message

Advisory Board:
  Naval Ravikant     Leverage, specific knowledge, compounding
  Alex Karp          Mission weight, conviction, pain tolerance
  Paul Graham        Organic ideas, schlep, "do things that don't scale"
  Andrew Chen        Growth loops, cold start, retention, distribution
  Travis Kalanick    Operations, supply side, day-one playbook
  Shreyas Doshi      Ruthless MVP scope, LNO, pre-mortems
  Ben Thompson       Value chains, aggregation, platform dynamics
  Bill Gurley        Revenue quality, unit economics, take rates
  Peter Thiel        Monopoly, secrets, 10x better, contrarian
  Financial Samurai  Consumer willingness to pay, price reality
  Julie Zhuo         UX quality, obviousness, design craft
  Brian Chesky       11-star experience, AI-native, belonging
  + Factory Scanner  Capability matching, stack profile, feasibility

Examples:
  pnpm koba enrich 80
  pnpm koba view 80
  pnpm koba ledger
`);
      break;
    }
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message || err);
  process.exit(1);
});
