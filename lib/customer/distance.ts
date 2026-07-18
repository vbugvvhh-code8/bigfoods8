/**
 * Haversine distance in km. Same formula used by useNearestRider /
 * useZoneRiderCount — duplicated locally rather than importing from those
 * hooks, since they belong to the restaurant-portal/admin sessions.
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Assumed average moped speed in Nigerian urban traffic, for a rough ETA only
// — same assumption used elsewhere in this codebase (useNearestRider).
const ASSUMED_SPEED_KMH = 25;

export function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / ASSUMED_SPEED_KMH) * 60));
}
