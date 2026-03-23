/**
 * Socrata query builder and data fetcher.
 */

import type { SocrataQueryOptions, SocrataCatalogEntry, SocrataCatalogResponse, SocrataDatasetConfig } from "./types.js";

const CATALOG_API = "/api/catalog/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build a Socrata SODA API URL from components.
 */
export function buildSoQLUrl(
  portal: string,
  datasetId: string,
  options: SocrataQueryOptions = {}
): string {
  const { where, select, groupBy, orderBy, limit = 1000, offset } = options;
  let url = `https://${portal}/resource/${datasetId}.json`;
  const params: string[] = [];

  if (where) params.push(`$where=${encodeURIComponent(where)}`);
  if (select) params.push(`$select=${encodeURIComponent(select)}`);
  if (groupBy) params.push(`$group=${encodeURIComponent(groupBy)}`);
  if (orderBy) params.push(`$order=${encodeURIComponent(orderBy)}`);
  if (limit) params.push(`$limit=${limit}`);
  if (offset) params.push(`$offset=${offset}`);

  if (params.length > 0) url += `?${params.join("&")}`;
  return url;
}

/**
 * Query a Socrata dataset. Returns typed JSON results.
 */
export async function querySocrata<T = Record<string, unknown>>(
  portal: string,
  datasetId: string,
  options: SocrataQueryOptions = {}
): Promise<{ data: T[]; url: string }> {
  const url = buildSoQLUrl(portal, datasetId, options);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Socrata query failed: ${res.status} ${res.statusText} — ${url}`);
  }

  const data = (await res.json()) as T[];
  return { data, url };
}

/**
 * Query a Socrata dataset using a pre-configured dataset definition.
 * Resolves filter values from place/county names.
 */
export async function queryConfiguredDataset<T = Record<string, unknown>>(
  portal: string,
  config: SocrataDatasetConfig,
  context: { placeName: string; countyName?: string | null }
): Promise<{ data: T[]; url: string; filterField: string | null }> {
  let filterValue: string;
  switch (config.filterValue) {
    case "UPPER_PLACE": filterValue = context.placeName.toUpperCase(); break;
    case "UPPER_COUNTY":
      if (!context.countyName) throw new Error(`Dataset ${config.name} requires county name`);
      filterValue = context.countyName.replace(/ County$/i, "").toUpperCase();
      break;
    case "PLACE": filterValue = context.placeName; break;
    case "COUNTY":
      if (!context.countyName) throw new Error(`Dataset ${config.name} requires county name`);
      filterValue = context.countyName.replace(/ County$/i, "");
      break;
  }

  // Auto-discover filter field if not configured
  let filterField = config.filterField;
  if (!filterField) {
    const fields = await discoverFields(portal, config.id);
    const candidates = ["city", "city_name", "county", "county_name", "name", "valla_name", "location_name"];
    filterField = candidates.find((c) => fields.includes(c)) ?? null;
    if (!filterField) {
      throw new Error(`Cannot find filter field for ${config.name}. Available: ${fields.join(", ")}`);
    }
  }

  let where = `upper(${filterField})='${filterValue}'`;
  if (config.dateFilter) {
    where += ` AND ${config.dateFilter.field}>='${config.dateFilter.since}'`;
  }

  const result = await querySocrata<T>(portal, config.id, {
    where,
    select: config.selectAgg,
    groupBy: config.groupBy,
    orderBy: config.orderBy ?? undefined,
    limit: config.limit,
  });

  return { ...result, filterField };
}

/**
 * Probe a domain to check if it hosts a Socrata portal.
 * Returns dataset count or -1 if not a Socrata portal.
 */
export async function probeSocrataPortal(domain: string): Promise<number> {
  try {
    const url = `https://${domain}${CATALOG_API}?domains=${domain}&limit=1&only=datasets`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return -1;
    const data = (await res.json()) as SocrataCatalogResponse;
    if (typeof data.resultSetSize === "number") return data.resultSetSize;
    return -1;
  } catch {
    return -1;
  }
}

/**
 * Fetch the full dataset catalog from a Socrata portal.
 * Paginates through all results up to maxDatasets.
 */
export async function fetchCatalog(
  domain: string,
  options: { maxDatasets?: number; delay?: number } = {}
): Promise<SocrataCatalogEntry[]> {
  const { maxDatasets = 500, delay = 300 } = options;
  const datasets: SocrataCatalogEntry[] = [];
  const pageSize = 100;
  let offset = 0;

  while (offset < maxDatasets) {
    try {
      const url = `https://${domain}${CATALOG_API}?domains=${domain}&search_context=${domain}&limit=${pageSize}&offset=${offset}&only=datasets`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) break;
      const data = (await res.json()) as SocrataCatalogResponse;
      if (!data.results || data.results.length === 0) break;
      datasets.push(...data.results);
      if (data.results.length < pageSize) break;
      offset += pageSize;
      await sleep(delay);
    } catch {
      break;
    }
  }

  return datasets;
}

/**
 * Discover field names for a dataset by fetching a single row.
 */
export async function discoverFields(portal: string, datasetId: string): Promise<string[]> {
  try {
    const { data } = await querySocrata(portal, datasetId, { limit: 1 });
    const record = data[0];
    return record ? Object.keys(record) : [];
  } catch {
    return [];
  }
}

/**
 * Generate common domain patterns to probe for a county's Socrata portal.
 */
export function domainCandidates(countyName: string): string[] {
  const slug = countyName
    .toLowerCase()
    .replace(/ county$/i, "")
    .replace(/[^a-z0-9]/g, "");
  const slugDash = countyName
    .toLowerCase()
    .replace(/ county$/i, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/\s+/g, "-");

  return [
    `data.${slug}county.gov`,
    `data.${slug}county.org`,
    `data.${slugDash}.gov`,
    `opendata.${slug}county.gov`,
    `opendata.${slug}county.org`,
    `data.${slug}.gov`,
    `data.${slug}.org`,
  ];
}
