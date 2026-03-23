/**
 * Shared utility functions for the geo registry.
 */

import type { Tier } from "./types.js";

const ACS_MISSING = -666666666;

export function slugify(name: string, stateAbbr: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "")}-${stateAbbr.toLowerCase()}`;
}

export function classifyTier(pop: number): Tier {
  if (pop >= 250000) return "metro";
  if (pop >= 100000) return "midsize";
  if (pop >= 15000) return "sweet";
  if (pop >= 5000) return "viable";
  if (pop >= 1000) return "small";
  return "micro";
}

export function parseLocalityType(fullName: string): { name: string; type: string } {
  const beforeComma = fullName.split(",")[0]!.trim();
  const suffixes = ["city", "village", "town", "cdp", "borough", "municipality"];

  for (const suffix of suffixes) {
    if (beforeComma.toLowerCase().endsWith(` ${suffix}`)) {
      return {
        name: beforeComma.slice(0, -(suffix.length + 1)).trim(),
        type: suffix,
      };
    }
  }

  return { name: beforeComma, type: "city" };
}

export function safeInt(val: unknown): number | null {
  const n = parseInt(String(val));
  if (isNaN(n) || n === ACS_MISSING) return null;
  return n;
}

export function safeFloat(val: unknown): number | null {
  const n = parseFloat(String(val));
  if (isNaN(n) || n === ACS_MISSING) return null;
  return n;
}

export async function fetchWithRetry(url: string, retries = 3): Promise<unknown> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          await sleep(2000 * attempt);
          continue;
        }
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return res.json();
    } catch (err: unknown) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
