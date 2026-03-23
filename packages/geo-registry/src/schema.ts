/**
 * SQLite schema for the locality registry.
 */

import type Database from "better-sqlite3";

export function initRegistryDB(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS localities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      state_fips TEXT NOT NULL,
      state_abbr TEXT NOT NULL,
      place_fips TEXT NOT NULL,
      county_fips TEXT,
      county_name TEXT,
      locality_type TEXT NOT NULL,
      population_2020 INTEGER NOT NULL,
      acs_population INTEGER,
      median_income INTEGER,
      median_age REAL,
      race_white INTEGER,
      race_black INTEGER,
      hispanic_latino INTEGER,
      centroid_lat REAL,
      centroid_lon REAL,
      tier TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS counties (
      fips TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state_fips TEXT NOT NULL,
      state_abbr TEXT NOT NULL,
      population_2020 INTEGER,
      has_socrata INTEGER DEFAULT 0,
      socrata_url TEXT,
      has_arcgis INTEGER DEFAULT 0,
      arcgis_url TEXT,
      has_open_data INTEGER DEFAULT 0,
      open_data_url TEXT,
      locality_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS build_progress (
      step TEXT PRIMARY KEY,
      completed_at TEXT,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_localities_state ON localities(state_abbr);
    CREATE INDEX IF NOT EXISTS idx_localities_county ON localities(county_fips);
    CREATE INDEX IF NOT EXISTS idx_localities_tier ON localities(tier);
    CREATE INDEX IF NOT EXISTS idx_localities_population ON localities(population_2020 DESC);
    CREATE INDEX IF NOT EXISTS idx_counties_state ON counties(state_fips);
  `);
}
