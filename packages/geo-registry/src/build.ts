/**
 * Build the full US locality registry from Census Bureau data.
 *
 * Pulls all Census Places (cities, towns, villages, CDPs) from every state,
 * enriches with ACS demographics, resolves counties via FCC, stores as SQLite.
 *
 * Run:   npx tsx packages/geo-registry/src/build.ts <db-path>
 * Resume: npx tsx packages/geo-registry/src/build.ts <db-path> --resume
 */

import Database from "better-sqlite3";
import { existsSync, unlinkSync, statSync } from "fs";
import { initRegistryDB } from "./schema.js";
import { STATES, KNOWN_COUNTY_PORTALS } from "./constants.js";
import { slugify, classifyTier, parseLocalityType, safeInt, safeFloat, fetchWithRetry, sleep } from "./helpers.js";
import type { BuildRegistryOptions } from "./types.js";

const CENSUS_API = "https://api.census.gov/data";
const FCC_API = "https://geo.fcc.gov/api/census/area";

function isStepDone(db: Database.Database, step: string): boolean {
  const row = db.prepare("SELECT completed_at FROM build_progress WHERE step = ?").get(step) as { completed_at: string } | undefined;
  return !!row?.completed_at;
}

function markStepDone(db: Database.Database, step: string, details?: string): void {
  db.prepare(
    "INSERT OR REPLACE INTO build_progress (step, completed_at, details) VALUES (?, datetime('now'), ?)"
  ).run(step, details ?? null);
}

// ─── Step 1: Pull all Census Places ─────────────────────────────────────────

async function pullCensusPlaces(db: Database.Database, opts: BuildRegistryOptions): Promise<void> {
  console.log("[1/5] Pulling Census Places from all states...");

  const insert = db.prepare(`
    INSERT OR IGNORE INTO localities (id, name, full_name, state_fips, state_abbr, place_fips, locality_type, population_2020, tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: unknown[][]) => {
    for (const row of rows) insert.run(...row);
  });

  const stateFips = (opts.states ?? Object.keys(STATES)).sort();
  let totalPlaces = 0;

  for (let i = 0; i < stateFips.length; i++) {
    const sf = stateFips[i];
    const abbr = STATES[sf];
    if (!abbr) continue;
    const stepKey = `census_places_${sf}`;

    if (isStepDone(db, stepKey)) {
      process.stdout.write(`  [${i + 1}/${stateFips.length}] ${abbr} — skipped (done)\n`);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${stateFips.length}] ${abbr}...`);

    try {
      const data = await fetchWithRetry(
        `${CENSUS_API}/2020/dec/pl?get=NAME,P1_001N&for=place:*&in=state:${sf}`
      ) as string[][];

      const places = data.slice(1);
      const rows: unknown[][] = [];

      for (const row of places) {
        const fullName = row[0];
        const pop = parseInt(row[1]) || 0;
        const placeFips = row[3];

        const { name, type } = parseLocalityType(fullName);
        const slug = slugify(name, abbr);
        const tier = classifyTier(pop);

        rows.push([slug, name, fullName, sf, abbr, placeFips, type, pop, tier]);
      }

      insertMany(rows);
      markStepDone(db, stepKey, `${places.length} places`);
      totalPlaces += places.length;
      console.log(` ${places.length} places`);
    } catch (err: unknown) {
      console.log(` ERROR: ${(err as Error).message}`);
    }

    if (i < stateFips.length - 1) await sleep(200);
  }

  console.log(`  Total: ${totalPlaces} places loaded\n`);
}

// ─── Step 2: ACS Demographics ───────────────────────────────────────────────

async function pullACSDemographics(db: Database.Database): Promise<void> {
  console.log("[2/5] Pulling ACS demographics...");

  const update = db.prepare(`
    UPDATE localities
    SET acs_population = ?, median_income = ?, median_age = ?,
        race_white = ?, race_black = ?, hispanic_latino = ?,
        updated_at = datetime('now')
    WHERE state_fips = ? AND place_fips = ?
  `);

  const updateMany = db.transaction((rows: unknown[][]) => {
    for (const row of rows) update.run(...row);
  });

  const statesWithTargets = db.prepare(
    "SELECT DISTINCT state_fips FROM localities WHERE tier IN ('metro','midsize','sweet','viable') ORDER BY state_fips"
  ).all() as { state_fips: string }[];

  let acsCount = 0;
  const acsVars = "NAME,B01003_001E,B19013_001E,B01002_001E,B02001_002E,B02001_003E,B03003_003E";

  for (let i = 0; i < statesWithTargets.length; i++) {
    const sf = statesWithTargets[i].state_fips;
    const abbr = STATES[sf] || sf;
    const stepKey = `acs_${sf}`;

    if (isStepDone(db, stepKey)) {
      process.stdout.write(`  [${i + 1}/${statesWithTargets.length}] ${abbr} — skipped (done)\n`);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${statesWithTargets.length}] ${abbr}...`);

    try {
      const data = await fetchWithRetry(
        `${CENSUS_API}/2022/acs/acs5?get=${acsVars}&for=place:*&in=state:${sf}`
      ) as string[][];

      const rows: unknown[][] = [];
      for (const row of data.slice(1)) {
        const placeFips = row[8];
        rows.push([
          safeInt(row[1]),
          safeInt(row[2]),
          safeFloat(row[3]),
          safeInt(row[4]),
          safeInt(row[5]),
          safeInt(row[6]),
          sf,
          placeFips,
        ]);
      }

      updateMany(rows);
      acsCount += rows.length;
      markStepDone(db, stepKey, `${rows.length} places`);
      console.log(` ${rows.length} enriched`);
    } catch (err: unknown) {
      console.log(` ERROR: ${(err as Error).message}`);
    }

    await sleep(300);
  }

  console.log(`  ACS loaded for ${acsCount} places\n`);
}

// ─── Step 3: Centroids + County Resolution ──────────────────────────────────

async function resolveCounties(db: Database.Database): Promise<void> {
  console.log("[3/5] Centroids + county resolution...");

  const updateCentroid = db.prepare(`
    UPDATE localities SET centroid_lat = ?, centroid_lon = ?, updated_at = datetime('now')
    WHERE state_fips = ? AND place_fips = ? AND centroid_lat IS NULL
  `);

  const updateCounty = db.prepare(`
    UPDATE localities
    SET county_fips = ?, county_name = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  console.log("  [3a] Downloading gazetteer centroids...");

  const stateFips = Object.keys(STATES).sort();

  for (let i = 0; i < stateFips.length; i++) {
    const sf = stateFips[i];
    const abbr = STATES[sf];
    const stepKey = `gazetteer_${sf}`;

    if (isStepDone(db, stepKey)) continue;

    try {
      const url = `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_gaz_place_${sf}.txt`;
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        if (res.status === 404) continue;
        throw new Error(`${res.status}`);
      }

      const text = await res.text();
      const lines = text.trim().split("\n");
      const updates: [number, number, string, string][] = [];

      for (let j = 1; j < lines.length; j++) {
        const cols = lines[j].split("\t").map((c) => c.trim());
        const geoid = cols[1];
        const lat = parseFloat(cols[10]);
        const lon = parseFloat(cols[11]);

        if (geoid && geoid.length === 7 && !isNaN(lat) && !isNaN(lon)) {
          const placeFips = geoid.slice(2);
          updates.push([lat, lon, sf, placeFips]);
        }
      }

      db.transaction(() => {
        for (const args of updates) updateCentroid.run(...args);
      })();

      markStepDone(db, stepKey);
    } catch (err: unknown) {
      process.stdout.write(`  ${abbr}: ERROR ${(err as Error).message}\n`);
    }
  }

  const totalWithCentroid = (db.prepare("SELECT COUNT(*) as n FROM localities WHERE centroid_lat IS NOT NULL").get() as { n: number }).n;
  console.log(`  Centroids: ${totalWithCentroid.toLocaleString()} localities\n`);

  // 3b: Resolve counties via FCC API
  console.log("  [3b] Resolving counties via FCC API...");

  const needsCounty = db.prepare(
    `SELECT id, centroid_lat, centroid_lon
     FROM localities
     WHERE county_fips IS NULL AND centroid_lat IS NOT NULL
       AND tier IN ('metro','midsize','sweet')
     ORDER BY population_2020 DESC`
  ).all() as { id: string; centroid_lat: number; centroid_lon: number }[];

  if (needsCounty.length === 0) {
    console.log("  All target localities already have counties.\n");
    return;
  }

  console.log(`  ${needsCounty.length} localities need county resolution`);

  let resolved = 0;
  let errors = 0;

  for (let i = 0; i < needsCounty.length; i++) {
    const loc = needsCounty[i];

    if (i > 0 && i % 100 === 0) {
      console.log(`  Progress: ${i}/${needsCounty.length} (${resolved} resolved, ${errors} errors)`);
    }

    try {
      const fccData = await fetchWithRetry(
        `${FCC_API}?lat=${loc.centroid_lat}&lon=${loc.centroid_lon}&format=json`
      ) as { results?: { county_fips?: string; county_name?: string }[] };
      const result = fccData?.results?.[0];
      if (result?.county_fips && result?.county_name) {
        updateCounty.run(result.county_fips, result.county_name, loc.id);
        resolved++;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }

    await sleep(150);
  }

  console.log(`  Resolved: ${resolved}, Errors: ${errors}\n`);
}

// ─── Step 4: Seed Known County Portals ──────────────────────────────────────

function seedCountyPortals(db: Database.Database): void {
  console.log("[4/5] Seeding known county data portals...");

  const upsert = db.prepare(`
    INSERT INTO counties (fips, name, state_fips, state_abbr, has_socrata, socrata_url, has_arcgis, arcgis_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fips) DO UPDATE SET
      has_socrata = CASE WHEN excluded.has_socrata = 1 THEN 1 ELSE counties.has_socrata END,
      socrata_url = COALESCE(excluded.socrata_url, counties.socrata_url),
      has_arcgis = CASE WHEN excluded.has_arcgis = 1 THEN 1 ELSE counties.has_arcgis END,
      arcgis_url = COALESCE(excluded.arcgis_url, counties.arcgis_url),
      updated_at = datetime('now')
  `);

  const upsertFromCensus = db.prepare(`
    INSERT OR IGNORE INTO counties (fips, name, state_fips, state_abbr)
    VALUES (?, ?, ?, ?)
  `);

  for (const c of KNOWN_COUNTY_PORTALS) {
    upsert.run(
      c.fips, c.name, c.state, c.abbr,
      c.socrata ? 1 : 0, c.socrata,
      c.arcgis ? 1 : 0, c.arcgis
    );
  }

  const resolvedCounties = db.prepare(
    `SELECT DISTINCT county_fips, county_name, state_fips, state_abbr
     FROM localities
     WHERE county_fips IS NOT NULL AND county_name IS NOT NULL`
  ).all() as { county_fips: string; county_name: string; state_fips: string; state_abbr: string }[];

  db.transaction(() => {
    for (const c of resolvedCounties) {
      upsertFromCensus.run(c.county_fips, c.county_name, c.state_fips, c.state_abbr);
    }
  })();

  db.exec(`
    UPDATE counties SET locality_count = (
      SELECT COUNT(*) FROM localities WHERE localities.county_fips = counties.fips
    )
  `);

  const count = db.prepare("SELECT COUNT(*) as n FROM counties").get() as { n: number };
  console.log(`  ${count.n} counties in registry\n`);
}

// ─── Step 5: Summary ────────────────────────────────────────────────────────

function printSummary(db: Database.Database, dbPath: string): void {
  console.log("[5/5] Registry summary\n");

  const q = (sql: string) => (db.prepare(sql).get() as Record<string, number>);

  const total = q("SELECT COUNT(*) as n FROM localities").n;
  const tiers = db.prepare(
    "SELECT tier, COUNT(*) as n, CAST(AVG(population_2020) AS INTEGER) as avg_pop FROM localities GROUP BY tier ORDER BY avg_pop DESC"
  ).all() as { tier: string; n: number; avg_pop: number }[];
  const withACS = q("SELECT COUNT(*) as n FROM localities WHERE acs_population IS NOT NULL").n;
  const withCounty = q("SELECT COUNT(*) as n FROM localities WHERE county_fips IS NOT NULL").n;
  const withCentroid = q("SELECT COUNT(*) as n FROM localities WHERE centroid_lat IS NOT NULL").n;
  const states = q("SELECT COUNT(DISTINCT state_abbr) as n FROM localities").n;
  const counties = q("SELECT COUNT(*) as n FROM counties").n;

  console.log("  LOCALITY REGISTRY");
  console.log("  " + "=".repeat(45));
  console.log(`  Total places:       ${total.toLocaleString()}`);
  console.log(`  States/territories: ${states}`);
  console.log(`  With ACS data:      ${withACS.toLocaleString()}`);
  console.log(`  With county:        ${withCounty.toLocaleString()}`);
  console.log(`  With centroid:      ${withCentroid.toLocaleString()}`);
  console.log();
  console.log("  BY TIER:");
  for (const t of tiers) {
    console.log(`    ${t.tier.padEnd(12)} ${t.n.toLocaleString().padStart(7)}  (avg pop: ${t.avg_pop.toLocaleString()})`);
  }
  console.log();
  console.log(`  Counties: ${counties}`);

  const dbSize = existsSync(dbPath)
    ? (statSync(dbPath).size / 1024 / 1024).toFixed(1)
    : "?";
  console.log(`\n  Registry: ${dbPath} (${dbSize} MB)\n`);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the full locality registry. This is the main entry point.
 * Call this from a build script — it takes several minutes to run
 * due to Census API rate limits.
 */
export async function buildRegistry(dbPath: string, opts: BuildRegistryOptions = {}): Promise<void> {
  const resume = opts.resume ?? false;

  console.log("=== BUILDING US LOCALITY REGISTRY ===");
  if (resume) console.log("  (resume mode — skipping completed steps)");
  console.log();

  if (!resume && existsSync(dbPath)) {
    unlinkSync(dbPath);
    console.log("  Cleared existing registry.\n");
  }

  const db = new Database(dbPath);
  initRegistryDB(db);

  try {
    if (!resume || !isStepDone(db, "step_1_complete")) {
      await pullCensusPlaces(db, opts);
      markStepDone(db, "step_1_complete");
    } else {
      console.log("[1/5] Census Places — skipped (done)\n");
    }

    if (!opts.skipACS) {
      if (!resume || !isStepDone(db, "step_2_complete")) {
        await pullACSDemographics(db);
        markStepDone(db, "step_2_complete");
      } else {
        console.log("[2/5] ACS Demographics — skipped (done)\n");
      }
    }

    if (!opts.skipCountyResolution) {
      if (!resume || !isStepDone(db, "step_3_complete")) {
        await resolveCounties(db);
        markStepDone(db, "step_3_complete");
      } else {
        console.log("[3/5] County Resolution — skipped (done)\n");
      }
    }

    seedCountyPortals(db);
    printSummary(db, dbPath);
  } finally {
    db.close();
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

if (process.argv[1] && (process.argv[1].endsWith("build.ts") || process.argv[1].endsWith("build.js"))) {
  const dbPath = process.argv[2] || "registry.db";
  const resume = process.argv.includes("--resume");
  buildRegistry(dbPath, { resume }).catch(console.error);
}
