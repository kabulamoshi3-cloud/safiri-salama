/**
 * Map Service — Free, no API key required
 * Uses: Nominatim (geocoding) + OSRM (routing)
 * Morogoro center: -6.8160, 37.6677
 */

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lng, lat] pairs for Leaflet polyline
}

export interface SearchResult {
  lat: number;
  lng: number;
  address: string;
  displayName: string;
}

export const MOROGORO_CENTER: [number, number] = [-6.8160, 37.6677];

/**
 * Geocode an address in Morogoro using Nominatim (free)
 */
export async function geocode(query: string): Promise<SearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query + ' Morogoro Tanzania'
  )}&format=json&limit=5&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'SkyRex/1.0' },
    });
    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name.split(',').slice(0, 3).join(', '),
      displayName: item.display_name,
    }));
  } catch (err) {
    console.error('[mapService] geocode error:', err);
    return [];
  }
}

/**
 * Reverse geocode coordinates to address using Nominatim (free)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'SkyRex/1.0' },
    });
    const data = await res.json();
    const parts = data.display_name?.split(',') ?? [];
    return parts.slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Get route between two points using OSRM (free)
 * Returns distance, duration, and GeoJSON geometry for drawing polyline
 */
export async function getRoute(
  from: [number, number], // [lat, lng]
  to: [number, number]    // [lat, lng]
): Promise<RouteResult | null> {
  // OSRM expects [lng, lat]
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry: route.geometry.coordinates, // [lng, lat] pairs
    };
  } catch (err) {
    console.error('[mapService] getRoute error:', err);
    return null;
  }
}

/**
 * Calculate fare estimate based on distance
 * Economy: TZS 1,500 base + 800/km
 * Comfort: TZS 2,000 base + 1,200/km
 * Express: TZS 2,500 base + 1,500/km
 */
export function calculateFare(distanceKm: number): {
  economy: number;
  comfort: number;
  express: number;
} {
  return {
    economy: Math.round(1500 + distanceKm * 800),
    comfort: Math.round(2000 + distanceKm * 1200),
    express: Math.round(2500 + distanceKm * 1500),
  };
}
