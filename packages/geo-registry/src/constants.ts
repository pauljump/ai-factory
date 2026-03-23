/**
 * State FIPS codes and known county data portals.
 */

import type { KnownCountyPortal } from "./types.js";

/** State FIPS → abbreviation (50 states + DC + PR) */
export const STATES: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "72": "PR",
};

/** Abbreviation → FIPS */
export const STATE_ABBR_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(STATES).map(([fips, abbr]) => [abbr, fips])
);

/** Known county data portals (seeded during registry build) */
export const KNOWN_COUNTY_PORTALS: KnownCountyPortal[] = [
  { fips: "12099", name: "Palm Beach County", state: "12", abbr: "FL", socrata: null, arcgis: "https://opendata2-pbcgov.opendata.arcgis.com" },
  { fips: "12011", name: "Broward County", state: "12", abbr: "FL", socrata: "https://opendata.broward.org", arcgis: null },
  { fips: "12086", name: "Miami-Dade County", state: "12", abbr: "FL", socrata: null, arcgis: "https://gis-mdc.opendata.arcgis.com" },
  { fips: "12095", name: "Orange County", state: "12", abbr: "FL", socrata: "https://data.ocfl.net", arcgis: null },
  { fips: "36061", name: "New York County", state: "36", abbr: "NY", socrata: "https://data.cityofnewyork.us", arcgis: null },
  { fips: "17031", name: "Cook County", state: "17", abbr: "IL", socrata: "https://data.cityofchicago.org", arcgis: null },
  { fips: "06037", name: "Los Angeles County", state: "06", abbr: "CA", socrata: "https://data.lacity.org", arcgis: null },
  { fips: "48453", name: "Travis County", state: "48", abbr: "TX", socrata: "https://data.austintexas.gov", arcgis: null },
  { fips: "53033", name: "King County", state: "53", abbr: "WA", socrata: "https://data.seattle.gov", arcgis: null },
  { fips: "06075", name: "San Francisco County", state: "06", abbr: "CA", socrata: "https://data.sfgov.org", arcgis: null },
];
