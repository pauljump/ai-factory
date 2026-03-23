/**
 * Core types for the US locality registry.
 */

export interface PlaceIdentifiers {
  name: string;
  stateAbbr: string;
  fipsState: string;
  fipsPlace: string;
  countyFips: string | null;
  countyName: string | null;
  lat: number;
  lon: number;
  population: number;
  tier: string;
}

export interface Locality {
  id: string;
  name: string;
  fullName: string;
  stateFips: string;
  stateAbbr: string;
  placeFips: string;
  countyFips: string | null;
  countyName: string | null;
  localityType: string;
  population2020: number;
  acsPopulation: number | null;
  medianIncome: number | null;
  medianAge: number | null;
  raceWhite: number | null;
  raceBlack: number | null;
  hispanicLatino: number | null;
  centroidLat: number | null;
  centroidLon: number | null;
  tier: string;
}

export interface County {
  fips: string;
  name: string;
  stateFips: string;
  stateAbbr: string;
  population2020: number | null;
  hasSocrata: boolean;
  socrataUrl: string | null;
  hasArcgis: boolean;
  arcgisUrl: string | null;
  localityCount: number;
}

export type Tier = "metro" | "midsize" | "sweet" | "viable" | "small" | "micro";

export interface BuildRegistryOptions {
  /** Resume from previously completed steps */
  resume?: boolean;
  /** Only pull these states (FIPS codes) */
  states?: string[];
  /** Skip ACS demographics (faster build for testing) */
  skipACS?: boolean;
  /** Skip county resolution via FCC API (faster build for testing) */
  skipCountyResolution?: boolean;
}

export interface KnownCountyPortal {
  fips: string;
  name: string;
  state: string;
  abbr: string;
  socrata: string | null;
  arcgis: string | null;
}
