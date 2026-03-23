/**
 * Place lookup functions — query the registry database.
 */

import type Database from "better-sqlite3";
import type { PlaceIdentifiers, Locality, County } from "./types.js";
import { STATES, STATE_ABBR_TO_FIPS } from "./constants.js";

/**
 * Look up a place by name and state abbreviation.
 * Returns null if not found.
 */
export function lookupPlace(
  db: Database.Database,
  name: string,
  stateAbbr: string
): PlaceIdentifiers | null {
  const stateFips = STATE_ABBR_TO_FIPS[stateAbbr.toUpperCase()];
  if (!stateFips) throw new Error(`Unknown state: ${stateAbbr}`);

  const row = db.prepare(`
    SELECT id, name, state_fips, place_fips, county_fips, centroid_lat, centroid_lon, population_2020, tier
    FROM localities
    WHERE LOWER(name) = LOWER(?) AND state_fips = ?
  `).get(name, stateFips) as {
    id: string; name: string; state_fips: string; place_fips: string;
    county_fips: string | null; centroid_lat: number; centroid_lon: number;
    population_2020: number; tier: string;
  } | undefined;

  if (!row) return null;

  const county = row.county_fips
    ? (db.prepare("SELECT name FROM counties WHERE fips = ?").get(row.county_fips) as { name: string } | undefined)
    : undefined;

  return {
    name: row.name,
    stateAbbr: stateAbbr.toUpperCase(),
    fipsState: row.state_fips,
    fipsPlace: row.place_fips,
    countyFips: row.county_fips,
    countyName: county?.name ?? null,
    lat: row.centroid_lat,
    lon: row.centroid_lon,
    population: row.population_2020,
    tier: row.tier,
  };
}

/**
 * Look up a place by FIPS state + place codes.
 * Returns null if not found.
 */
export function lookupPlaceByFips(
  db: Database.Database,
  stateFips: string,
  placeFips: string
): PlaceIdentifiers | null {
  const row = db.prepare(`
    SELECT id, name, state_fips, place_fips, county_fips, centroid_lat, centroid_lon, population_2020, tier
    FROM localities
    WHERE state_fips = ? AND place_fips = ?
  `).get(stateFips, placeFips) as {
    id: string; name: string; state_fips: string; place_fips: string;
    county_fips: string | null; centroid_lat: number; centroid_lon: number;
    population_2020: number; tier: string;
  } | undefined;

  if (!row) return null;

  const county = row.county_fips
    ? (db.prepare("SELECT name FROM counties WHERE fips = ?").get(row.county_fips) as { name: string } | undefined)
    : undefined;

  return {
    name: row.name,
    stateAbbr: STATES[stateFips] ?? "??",
    fipsState: row.state_fips,
    fipsPlace: row.place_fips,
    countyFips: row.county_fips,
    countyName: county?.name ?? null,
    lat: row.centroid_lat,
    lon: row.centroid_lon,
    population: row.population_2020,
    tier: row.tier,
  };
}

/**
 * Search for places by partial name match.
 * Returns up to `limit` results ordered by population.
 */
export function searchPlaces(
  db: Database.Database,
  query: string,
  options: { state?: string; tier?: string; limit?: number } = {}
): PlaceIdentifiers[] {
  const { state, tier, limit = 20 } = options;
  let sql = `
    SELECT id, name, state_fips, place_fips, state_abbr, county_fips, centroid_lat, centroid_lon, population_2020, tier
    FROM localities
    WHERE LOWER(name) LIKE LOWER(?)
  `;
  const params: unknown[] = [`%${query}%`];

  if (state) {
    const fips = STATE_ABBR_TO_FIPS[state.toUpperCase()];
    if (fips) {
      sql += " AND state_fips = ?";
      params.push(fips);
    }
  }
  if (tier) {
    sql += " AND tier = ?";
    params.push(tier);
  }

  sql += " ORDER BY population_2020 DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as {
    id: string; name: string; state_fips: string; place_fips: string; state_abbr: string;
    county_fips: string | null; centroid_lat: number; centroid_lon: number;
    population_2020: number; tier: string;
  }[];

  return rows.map((row) => {
    const county = row.county_fips
      ? (db.prepare("SELECT name FROM counties WHERE fips = ?").get(row.county_fips) as { name: string } | undefined)
      : undefined;

    return {
      name: row.name,
      stateAbbr: row.state_abbr,
      fipsState: row.state_fips,
      fipsPlace: row.place_fips,
      countyFips: row.county_fips,
      countyName: county?.name ?? null,
      lat: row.centroid_lat,
      lon: row.centroid_lon,
      population: row.population_2020,
      tier: row.tier,
    };
  });
}

/**
 * Get a county by FIPS code.
 */
export function getCounty(db: Database.Database, fips: string): County | null {
  const row = db.prepare("SELECT * FROM counties WHERE fips = ?").get(fips) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    fips: row.fips as string,
    name: row.name as string,
    stateFips: row.state_fips as string,
    stateAbbr: row.state_abbr as string,
    population2020: row.population_2020 as number | null,
    hasSocrata: !!(row.has_socrata as number),
    socrataUrl: row.socrata_url as string | null,
    hasArcgis: !!(row.has_arcgis as number),
    arcgisUrl: row.arcgis_url as string | null,
    localityCount: row.locality_count as number,
  };
}

/**
 * List all places in a state, ordered by population.
 */
export function listPlacesByState(
  db: Database.Database,
  stateAbbr: string,
  options: { tier?: string; limit?: number } = {}
): PlaceIdentifiers[] {
  const stateFips = STATE_ABBR_TO_FIPS[stateAbbr.toUpperCase()];
  if (!stateFips) throw new Error(`Unknown state: ${stateAbbr}`);

  const { tier, limit = 100 } = options;
  let sql = "SELECT id, name, state_fips, place_fips, county_fips, centroid_lat, centroid_lon, population_2020, tier FROM localities WHERE state_fips = ?";
  const params: unknown[] = [stateFips];

  if (tier) {
    sql += " AND tier = ?";
    params.push(tier);
  }

  sql += " ORDER BY population_2020 DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as {
    id: string; name: string; state_fips: string; place_fips: string;
    county_fips: string | null; centroid_lat: number; centroid_lon: number;
    population_2020: number; tier: string;
  }[];

  return rows.map((row) => ({
    name: row.name,
    stateAbbr: stateAbbr.toUpperCase(),
    fipsState: row.state_fips,
    fipsPlace: row.place_fips,
    countyFips: row.county_fips,
    countyName: null, // skip county lookup for bulk listing
    lat: row.centroid_lat,
    lon: row.centroid_lon,
    population: row.population_2020,
    tier: row.tier,
  }));
}
