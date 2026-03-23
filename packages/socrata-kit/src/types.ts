/**
 * Types for Socrata open data operations.
 */

/** A known Socrata portal with its domain and metadata */
export interface SocrataPortal {
  domain: string;
  label: string;
  level: "city" | "county" | "state";
  /** County FIPS (for city/county portals) */
  fips?: string;
  /** State FIPS (for state portals) */
  stateFips?: string;
}

/** A dataset from a Socrata catalog */
export interface SocrataCatalogEntry {
  resource: {
    id: string;
    name: string;
    description?: string;
    type: string;
    updatedAt?: string;
    columns_field_name?: string[];
  };
  metadata?: {
    domain?: string;
  };
  classification?: {
    categories?: string[];
    tags?: string[];
  };
}

/** Catalog API response shape */
export interface SocrataCatalogResponse {
  results: SocrataCatalogEntry[];
  resultSetSize: number;
}

/** Options for querying a Socrata dataset */
export interface SocrataQueryOptions {
  /** SoQL WHERE clause (without $where=) */
  where?: string;
  /** SoQL SELECT clause */
  select?: string;
  /** SoQL GROUP BY clause */
  groupBy?: string;
  /** SoQL ORDER BY clause */
  orderBy?: string;
  /** Maximum rows to return (default 1000) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** A configured dataset definition for pulling known data */
export interface SocrataDatasetConfig {
  id: string;
  name: string;
  sectionId: string;
  category: string;
  /** Column to filter on. null = needs auto-discovery */
  filterField: string | null;
  /** How to resolve the filter value */
  filterValue: "UPPER_PLACE" | "UPPER_COUNTY" | "PLACE" | "COUNTY";
  /** SoQL SELECT with aggregation */
  selectAgg?: string;
  /** SoQL GROUP BY */
  groupBy?: string;
  /** SoQL ORDER BY */
  orderBy: string | null;
  limit: number;
  /** Date range filter */
  dateFilter?: { field: string; since: string };
}

/** State portal configuration with known queryable datasets */
export interface StatePortalConfig {
  url: string;
  datasets: SocrataDatasetConfig[];
}
