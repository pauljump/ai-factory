/**
 * @pauljump/geo-registry
 *
 * US locality registry — Census Places, demographics, FIPS codes, centroids.
 * Build once, query from any project.
 */

// Types
export type {
  PlaceIdentifiers,
  Locality,
  County,
  Tier,
  BuildRegistryOptions,
  KnownCountyPortal,
} from "./types.js";

// Schema
export { initRegistryDB } from "./schema.js";

// Lookup functions
export {
  lookupPlace,
  lookupPlaceByFips,
  searchPlaces,
  getCounty,
  listPlacesByState,
} from "./lookup.js";

// Constants
export {
  STATES,
  STATE_ABBR_TO_FIPS,
  KNOWN_COUNTY_PORTALS,
} from "./constants.js";

// Helpers
export {
  slugify,
  classifyTier,
  parseLocalityType,
} from "./helpers.js";

// Build
export { buildRegistry } from "./build.js";
