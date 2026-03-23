/**
 * Geo utilities — geocoding stub + distance calculation.
 *
 * DEPENDENCIES: None (pure TypeScript).
 */

/**
 * Geocode an address to lat/lng coordinates.
 *
 * This is a stub — pick a provider and implement:
 *
 * OPTIONS:
 * 1. **Nominatim (free, no API key)**
 *    - OpenStreetMap's geocoder. Free for low-volume use.
 *    - Rate limit: 1 req/sec. Must include a User-Agent header.
 *    - URL: `https://nominatim.openstreetmap.org/search?q=${address}&format=json&limit=1`
 *    - Good for: prototypes, internal tools, low-traffic apps.
 *
 * 2. **Google Places / Geocoding API (paid, most accurate)**
 *    - Best results for US addresses. $5 per 1,000 requests.
 *    - Requires API key with billing enabled.
 *    - URL: `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${key}`
 *    - Good for: production apps, high accuracy requirements.
 *
 * 3. **Mapbox Geocoding (freemium)**
 *    - 100,000 free requests/month. Solid accuracy.
 *    - Requires access token.
 *    - URL: `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${token}`
 *    - Good for: apps already using Mapbox maps.
 *
 * @param address - The address string to geocode.
 * @returns Coordinates or null if not found.
 */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  // TODO: Implement with your chosen provider.
  // Example using Nominatim (free):
  //
  // const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  // const res = await fetch(url, {
  //   headers: { "User-Agent": "YourAppName/1.0" },
  // })
  // const data = await res.json()
  // if (!data.length) return null
  // return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }

  throw new Error(
    `geocode() not implemented — pick a provider (see comments in lib/geo.ts). Input: "${address}"`
  )
}

/**
 * Calculate the distance between two points using the Haversine formula.
 *
 * @param a - First point { lat, lng } in decimal degrees.
 * @param b - Second point { lat, lng } in decimal degrees.
 * @param unit - "km" (default) or "mi".
 * @returns Distance in the specified unit.
 *
 * Usage:
 * ```ts
 * const d = haversineDistance(
 *   { lat: 40.7128, lng: -74.006 },   // NYC
 *   { lat: 34.0522, lng: -118.2437 }, // LA
 * )
 * // ~3,940 km
 * ```
 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  unit: "km" | "mi" = "km"
): number {
  const R = unit === "km" ? 6371 : 3958.8 // Earth's radius

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng

  return 2 * R * Math.asin(Math.sqrt(h))
}
