/**
 * Registry of known Socrata portals across the US.
 */

import type { SocrataPortal, StatePortalConfig } from "./types.js";

/** Well-known Socrata portals — cities, counties, and states */
export const KNOWN_PORTALS: SocrataPortal[] = [
  // Major city portals
  { domain: "data.cityofnewyork.us", label: "NYC Open Data", level: "city", fips: "36061" },
  { domain: "data.cityofchicago.org", label: "Chicago Open Data", level: "city", fips: "17031" },
  { domain: "data.lacity.org", label: "Los Angeles Open Data", level: "city", fips: "06037" },
  { domain: "data.austintexas.gov", label: "Austin Open Data", level: "city", fips: "48453" },
  { domain: "data.seattle.gov", label: "Seattle Open Data", level: "city", fips: "53033" },
  { domain: "data.sfgov.org", label: "San Francisco Open Data", level: "city", fips: "06075" },
  { domain: "data.boston.gov", label: "Boston Open Data", level: "city", fips: "25025" },
  { domain: "data.detroitmi.gov", label: "Detroit Open Data", level: "city", fips: "26163" },
  { domain: "data.nashville.gov", label: "Nashville Open Data", level: "city", fips: "47037" },
  { domain: "data.cityofgainesville.org", label: "Gainesville Open Data", level: "city", fips: "12001" },
  { domain: "data.kcmo.org", label: "Kansas City Open Data", level: "city", fips: "29095" },
  { domain: "data.nola.gov", label: "New Orleans Open Data", level: "city", fips: "22071" },
  { domain: "data.cityofboise.org", label: "Boise Open Data", level: "city", fips: "16001" },
  { domain: "data.providenceri.gov", label: "Providence Open Data", level: "city", fips: "44007" },
  { domain: "data.chattanooga.gov", label: "Chattanooga Open Data", level: "city", fips: "47065" },
  { domain: "data.louisvilleky.gov", label: "Louisville Open Data", level: "city", fips: "21111" },
  { domain: "data.raleighnc.gov", label: "Raleigh Open Data", level: "city", fips: "37183" },
  { domain: "data.burlingtonvt.gov", label: "Burlington Open Data", level: "city", fips: "50007" },
  { domain: "data.tempe.gov", label: "Tempe Open Data", level: "city", fips: "04013" },
  { domain: "data.somervillema.gov", label: "Somerville Open Data", level: "city", fips: "25017" },
  { domain: "data.oaklandca.gov", label: "Oakland Open Data", level: "city", fips: "06001" },
  // County portals
  { domain: "opendata.broward.org", label: "Broward County Open Data", level: "county", fips: "12011" },
  { domain: "data.ocfl.net", label: "Orange County FL Open Data", level: "county", fips: "12095" },
  { domain: "data.lacounty.gov", label: "LA County Open Data", level: "county", fips: "06037" },
  { domain: "data.kingcounty.gov", label: "King County Open Data", level: "county", fips: "53033" },
  { domain: "data.montgomerycountymd.gov", label: "Montgomery County MD Open Data", level: "county", fips: "24031" },
  { domain: "datacatalog.cookcountyil.gov", label: "Cook County Open Data", level: "county", fips: "17031" },
  { domain: "data.miamidade.gov", label: "Miami-Dade Open Data", level: "county", fips: "12086" },
  { domain: "data.princegeorgescountymd.gov", label: "Prince George's County Open Data", level: "county", fips: "24033" },
  { domain: "data.wprdc.org", label: "Western PA Regional Open Data", level: "county", fips: "42003" },
  { domain: "data.sccgov.org", label: "Santa Clara County Open Data", level: "county", fips: "06085" },
  { domain: "data.acgov.org", label: "Alameda County Open Data", level: "county", fips: "06001" },
  // State portals
  { domain: "data.ny.gov", label: "New York State Open Data", level: "state", stateFips: "36" },
  { domain: "data.ca.gov", label: "California Open Data", level: "state", stateFips: "06" },
  { domain: "data.texas.gov", label: "Texas Open Data", level: "state", stateFips: "48" },
  { domain: "data.illinois.gov", label: "Illinois Open Data", level: "state", stateFips: "17" },
  { domain: "data.wa.gov", label: "Washington Open Data", level: "state", stateFips: "53" },
  { domain: "data.colorado.gov", label: "Colorado Open Data", level: "state", stateFips: "08" },
  { domain: "data.ct.gov", label: "Connecticut Open Data", level: "state", stateFips: "09" },
  { domain: "data.maryland.gov", label: "Maryland Open Data", level: "state", stateFips: "24" },
  { domain: "data.nj.gov", label: "New Jersey Open Data", level: "state", stateFips: "34" },
  { domain: "mydata.iowa.gov", label: "Iowa Open Data", level: "state", stateFips: "19" },
  { domain: "data.pa.gov", label: "Pennsylvania Open Data", level: "state", stateFips: "42" },
  { domain: "data.virginia.gov", label: "Virginia Open Data", level: "state", stateFips: "51" },
  { domain: "data.oregon.gov", label: "Oregon Open Data", level: "state", stateFips: "41" },
  { domain: "data.michigan.gov", label: "Michigan Open Data", level: "state", stateFips: "26" },
  { domain: "data.mo.gov", label: "Missouri Open Data", level: "state", stateFips: "29" },
  { domain: "opendata.hawaii.gov", label: "Hawaii Open Data", level: "state", stateFips: "15" },
  { domain: "data.ok.gov", label: "Oklahoma Open Data", level: "state", stateFips: "40" },
  { domain: "data.vermont.gov", label: "Vermont Open Data", level: "state", stateFips: "50" },
  { domain: "data.mass.gov", label: "Massachusetts Open Data", level: "state", stateFips: "25" },
  { domain: "data.georgia.gov", label: "Georgia Open Data", level: "state", stateFips: "13" },
];

/** State portals with fully configured dataset queries */
export const STATE_PORTALS: Record<string, StatePortalConfig> = {
  IA: {
    url: "data.iowa.gov",
    datasets: [
      {
        id: "m3tr-qhgy",
        name: "Iowa Liquor Sales",
        sectionId: "liquor-sales",
        category: "commerce",
        filterField: "city",
        filterValue: "UPPER_PLACE",
        selectAgg: "date_trunc_ym(date) as month,sum(sale_dollars) as total_sales,sum(sale_bottles) as total_bottles,count(*) as txns",
        groupBy: "date_trunc_ym(date)",
        orderBy: "month DESC",
        limit: 24,
        dateFilter: { field: "date", since: "2024-01-01" },
      },
      {
        id: "m3tr-qhgy",
        name: "Iowa Liquor Sales — by Store",
        sectionId: "liquor-sales-stores",
        category: "commerce",
        filterField: "city",
        filterValue: "UPPER_PLACE",
        selectAgg: "name,sum(sale_dollars) as total_sales,sum(sale_bottles) as total_bottles,count(*) as txns",
        groupBy: "name",
        orderBy: "total_sales DESC",
        limit: 20,
        dateFilter: { field: "date", since: "2024-01-01" },
      },
      {
        id: "m3tr-qhgy",
        name: "Iowa Liquor Sales — by Category",
        sectionId: "liquor-sales-categories",
        category: "commerce",
        filterField: "city",
        filterValue: "UPPER_PLACE",
        selectAgg: "category_name,sum(sale_dollars) as total_sales,sum(sale_bottles) as total_bottles,count(*) as txns",
        groupBy: "category_name",
        orderBy: "total_sales DESC",
        limit: 20,
        dateFilter: { field: "date", since: "2024-01-01" },
      },
      {
        id: "jmyd-wk9g",
        name: "Iowa Medicaid Payments",
        sectionId: "medicaid",
        category: "safety-net",
        filterField: "county",
        filterValue: "UPPER_COUNTY",
        orderBy: "report_as_of_date DESC",
        limit: 60,
      },
      {
        id: "7if7-xxdj",
        name: "City Taxable Valuations",
        sectionId: "taxable-valuations",
        category: "property",
        filterField: "valla_name",
        filterValue: "UPPER_PLACE",
        orderBy: "val_year DESC",
        limit: 20,
      },
      {
        id: "gx5j-gym5",
        name: "City Property Tax Levies",
        sectionId: "property-tax-levies",
        category: "government",
        filterField: null,
        filterValue: "UPPER_PLACE",
        orderBy: "fiscal_year DESC",
        limit: 10,
      },
      {
        id: "ekq4-ndnj",
        name: "City Actual Revenues",
        sectionId: "city-revenues",
        category: "government",
        filterField: "city_name",
        filterValue: "UPPER_PLACE",
        orderBy: "fiscal_year DESC",
        limit: 50,
      },
      {
        id: "q976-vaf6",
        name: "IPERS Payments by County",
        sectionId: "ipers-pensions",
        category: "safety-net",
        filterField: null,
        filterValue: "UPPER_COUNTY",
        orderBy: null,
        limit: 20,
      },
    ],
  },
};

/**
 * Find portals for a given county FIPS code.
 */
export function findPortalsByCounty(countyFips: string): SocrataPortal[] {
  return KNOWN_PORTALS.filter((p) => p.fips === countyFips);
}

/**
 * Find portals for a given state FIPS code.
 */
export function findPortalsByState(stateFips: string): SocrataPortal[] {
  return KNOWN_PORTALS.filter((p) => p.stateFips === stateFips);
}

/**
 * Get the state portal config for a given state abbreviation.
 */
export function getStatePortal(stateAbbr: string): StatePortalConfig | undefined {
  return STATE_PORTALS[stateAbbr.toUpperCase()];
}
