/**
 * @pauljump/socrata-kit
 *
 * Socrata open data client — query builder, portal registry, catalog browser.
 */

// Types
export type {
  SocrataPortal,
  SocrataCatalogEntry,
  SocrataCatalogResponse,
  SocrataQueryOptions,
  SocrataDatasetConfig,
  StatePortalConfig,
} from "./types.js";

// Query functions
export {
  buildSoQLUrl,
  querySocrata,
  queryConfiguredDataset,
  probeSocrataPortal,
  fetchCatalog,
  discoverFields,
  domainCandidates,
} from "./query.js";

// Portal registry
export {
  KNOWN_PORTALS,
  STATE_PORTALS,
  findPortalsByCounty,
  findPortalsByState,
  getStatePortal,
} from "./portals.js";
