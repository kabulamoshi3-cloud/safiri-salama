/**
 * GpsValidator
 * Pure-logic GPS observation validation — no database dependency.
 */

export interface GpsObservation {
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  accuracy_m?: number;
  /** Unix epoch milliseconds. Defaults to server-received time when omitted by client. */
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  rejection_reason?:
    | 'impossible_speed'
    | 'low_accuracy'
    | 'stale'
    | 'duplicate'
    | 'impossible_jump'
    | 'out_of_bounds';
}

/**
 * Haversine distance in metres between two WGS-84 coordinates.
 * R = 6 371 000 m (mean Earth radius).
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Last known observation per driver_id (used when no explicit `previous` is passed). */
const _lastObservation = new Map<string, GpsObservation>();

/**
 * Validate a GPS observation against business rules.
 * Rules are applied in order; the first failure is returned.
 *
 * @param obs       The observation to validate.
 * @param previous  Optional explicit previous observation for this driver.
 *                  When omitted the module-level cache is used (keyed by a
 *                  synthetic `_driverId` field if present, otherwise skipped).
 */
export function validateGpsObservation(
  obs: GpsObservation & { _driverId?: string },
  previous?: GpsObservation
): ValidationResult {
  // 1. Impossible speed
  if (obs.speed_kmh > 150) {
    return { valid: false, rejection_reason: 'impossible_speed' };
  }

  // 2. Low accuracy (only checked when the field is present and not null)
  if (obs.accuracy_m != null && obs.accuracy_m > 50) {
    return { valid: false, rejection_reason: 'low_accuracy' };
  }

  // 3. Out of bounds — Tanzania bounding box
  if (
    obs.lat < -11.7 ||
    obs.lat > -0.99 ||
    obs.lng < 29.3 ||
    obs.lng > 40.5
  ) {
    return { valid: false, rejection_reason: 'out_of_bounds' };
  }

  // 4. Stale — observation older than 30 s relative to server time
  if (Date.now() - obs.timestamp > 30000) {
    return { valid: false, rejection_reason: 'stale' };
  }

  // 5 & 6. Cross-observation checks (impossible_jump / duplicate)
  const prev: GpsObservation | undefined =
    previous ?? (obs._driverId ? _lastObservation.get(obs._driverId) : undefined);

  if (prev !== undefined) {
    const distM = haversineMeters(prev.lat, prev.lng, obs.lat, obs.lng);
    const dtMs = obs.timestamp - prev.timestamp;

    // Impossible jump: >500 m in less than 5 s
    if (distM > 500 && dtMs < 5000) {
      return { valid: false, rejection_reason: 'impossible_jump' };
    }

    // Duplicate: <1 m movement within 2 s
    if (distM < 1 && dtMs < 2000) {
      return { valid: false, rejection_reason: 'duplicate' };
    }
  }

  // Observation passed — update module-level cache if we have a driver key
  if (obs._driverId) {
    _lastObservation.set(obs._driverId, obs);
  }

  return { valid: true };
}
