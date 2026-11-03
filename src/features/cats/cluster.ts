import type { MapMarker } from '@/lib/api/types';
import type { LngLatBounds } from '@/lib/maplibre';

export type Cluster = { key: string; lat: number; lng: number; markers: MapMarker[] };

/**
 * Groups the markers that would overlap on screen at this zoom. Greedy and in the given order, so with the
 * newest cat first each cluster sits on, and shows, its newest cat. `radius` is in screen points.
 * Latitude is treated as linear across the region: close enough at the zooms where pins can overlap.
 */
export function clusterMarkers(
  markers: MapMarker[],
  [west, south, east, north]: LngLatBounds,
  size: { width: number; height: number },
  radius: number,
): Cluster[] {
  const xPerLng = size.width / (east - west);
  const yPerLat = size.height / (north - south);
  const clusters: Cluster[] = [];
  for (const m of markers) {
    const near = clusters.find(
      (c) => Math.abs(c.lng - m.lng) * xPerLng < radius && Math.abs(c.lat - m.lat) * yPerLat < radius,
    );
    if (near) near.markers.push(m);
    else clusters.push({ key: String(m.cat_id), lat: m.lat, lng: m.lng, markers: [m] });
  }
  return clusters;
}

/** The box around a group of markers. */
export function boundsOf(markers: MapMarker[]): LngLatBounds {
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** How far apart a group of markers is, in degrees: the larger of its latitude and longitude spans. */
export function spread(markers: MapMarker[]): number {
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  return Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
}
