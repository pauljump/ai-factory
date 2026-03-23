"use client"

/**
 * Map — Copyable map component using react-leaflet + OpenStreetMap (free, no API key).
 *
 * DEPENDENCIES:
 *   pnpm add react-leaflet leaflet
 *   pnpm add -D @types/leaflet
 *
 * IMPORTANT: You must import Leaflet's CSS in your layout or page:
 *   import "leaflet/dist/leaflet.css"
 *
 * CUSTOMIZE:
 * - Default center/zoom for your app's geography
 * - Tile layer URL if you want a different style (e.g., Mapbox, Stamen)
 * - Marker icon (Leaflet's default icon needs the workaround below in Next.js)
 */

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet"
import L from "leaflet"
import type { GeoJsonObject } from "geojson"

// Fix Leaflet's default marker icon in Next.js/webpack environments.
// Leaflet expects icon images at a path that webpack breaks — this repoints them.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

/** A single marker on the map. */
export interface MapMarker {
  lat: number
  lng: number
  /** Tooltip text shown on hover. */
  label?: string
  /** HTML or text shown in a popup on click. */
  popup?: string
}

export interface MapProps {
  /** Array of markers to display. */
  markers?: MapMarker[]
  /** Center of the map. Defaults to NYC [40.7128, -74.006]. */
  center?: [number, number]
  /** Zoom level (1-18). Defaults to 12. */
  zoom?: number
  /** Optional GeoJSON data to overlay on the map. */
  geojson?: GeoJsonObject
  /** Height of the map container. Defaults to "400px". */
  height?: string
  /** Additional CSS classes for the container div. */
  className?: string
}

/**
 * Interactive map component using OpenStreetMap tiles (free, no API key).
 *
 * Usage:
 * ```tsx
 * <Map
 *   markers={[
 *     { lat: 40.7128, lng: -74.006, popup: "New York City" },
 *     { lat: 40.7580, lng: -73.9855, label: "Times Square" },
 *   ]}
 *   center={[40.7128, -74.006]}
 *   zoom={13}
 * />
 * ```
 */
export function Map({
  markers = [],
  center = [40.7128, -74.006],
  zoom = 12,
  geojson,
  height = "400px",
  className,
}: MapProps) {
  return (
    <div
      className={`w-full overflow-hidden rounded-lg border border-border ${className ?? ""}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker, i) => (
          <Marker key={i} position={[marker.lat, marker.lng]} title={marker.label}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}

        {geojson && (
          <GeoJSON
            data={geojson}
            style={{
              color: "hsl(var(--primary))",
              weight: 2,
              fillOpacity: 0.15,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
