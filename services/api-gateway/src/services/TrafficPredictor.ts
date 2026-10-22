/**
 * TrafficPredictor
 * Traffic prediction, best-departure-time calculation, and GPS-to-segment ingestion.
 * No top-level DB import — callers pass `pool: Pool` so the module compiles standalone.
 */

import { Pool } from 'pg';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PredictionResult {
  segment_id: string;
  road_name: string;
  predicted_speed_kmh: number;
  status: 'jam' | 'slow' | 'clear';
  color: string;
  confidence: number;
  model_type: 'ml' | 'baseline' | 'insufficient_data';
  observations_used: number;
}

interface RoadSegment {
  id: string;
  road_name: string;
  lat_start: number;
  lng_start: number;
  lat_end: number;
  lng_end: number;
  length_m: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  jam: '#ff3b30',
  slow: '#ff9500',
  clear: '#00d46a',
} as const;

/** Major roads that hit jam speeds during peak hours. */
const MAJOR_JAM_ROADS = new Set([
  'nyerere-s-001',
  'morogoro-001',
  'kilwa-001',
  'pugu-001',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function speedToStatus(kmh: number): 'jam' | 'slow' | 'clear' {
  if (kmh < 15) return 'jam';
  if (kmh <= 35) return 'slow';
  return 'clear';
}

/**
 * Convert a Date to Dar es Salaam local day-of-week (Sun=0..Sat=6) and
 * hour-of-day (0..23) using UTC+3, with proper day rollover.
 */
function darLocalTime(dt: Date): { day_of_week: number; hour_of_day: number } {
  const utcMs = dt.getTime();
  const darMs = utcMs + 3 * 60 * 60 * 1000; // UTC+3
  const darDate = new Date(darMs);
  return {
    day_of_week: darDate.getUTCDay(),
    hour_of_day: darDate.getUTCHours(),
  };
}

/**
 * Baseline (no-observation) speed estimate for a segment at a given time.
 */
function baselineSpeed(
  segmentId: string,
  day_of_week: number,
  hour_of_day: number
): number {
  const isWeekday = day_of_week >= 1 && day_of_week <= 5;
  const isMorningPeak = hour_of_day >= 6 && hour_of_day <= 8;
  const isEveningPeak = hour_of_day >= 16 && hour_of_day <= 18;
  const isPeak = isWeekday && (isMorningPeak || isEveningPeak);

  if (isPeak) {
    return MAJOR_JAM_ROADS.has(segmentId) ? 8 : 25;
  }
  return 50;
}

/**
 * Clamp `value` to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Segment cache (per-call, not module-level) ───────────────────────────────

async function fetchAllSegments(pool: Pool): Promise<RoadSegment[]> {
  const res = await pool.query<RoadSegment>(
    'SELECT id, road_name, lat_start, lng_start, lat_end, lng_end, length_m FROM road_segments'
  );
  return res.rows;
}

// ─── predictTrafficWithSegments (internal) ────────────────────────────────────

/**
 * Core prediction logic. Accepts pre-fetched segments to avoid redundant DB
 * round-trips when called in a loop (e.g. findBestDepartureTime).
 */
async function predictTrafficWithSegments(
  segmentIds: string[],
  departureTime: string | number | Date,
  pool: Pool,
  allSegments: RoadSegment[]
): Promise<PredictionResult[]> {
  const dt =
    departureTime instanceof Date
      ? departureTime
      : new Date(departureTime);

  const { day_of_week, hour_of_day } = darLocalTime(dt);

  const segmentMap = new Map<string, RoadSegment>(
    allSegments.map((s) => [s.id, s])
  );

  // Fetch observation aggregates for all requested segment IDs in one query
  interface ObsRow {
    segment_id: string;
    avg_speed: string;
    stddev_speed: string | null;
    count: string;
  }
  const obsRes = await pool.query<ObsRow>(
    `SELECT segment_id,
            AVG(observed_speed_kmh)    AS avg_speed,
            STDDEV(observed_speed_kmh) AS stddev_speed,
            COUNT(*)                   AS count
     FROM segment_speed_observations
     WHERE segment_id = ANY($1)
       AND day_of_week = $2
       AND hour_of_day = $3
     GROUP BY segment_id`,
    [segmentIds, day_of_week, hour_of_day]
  );

  const obsMap = new Map<string, ObsRow>(obsRes.rows.map((r) => [r.segment_id, r]));

  return segmentIds.map((segment_id): PredictionResult => {
    const seg = segmentMap.get(segment_id);
    const obs = obsMap.get(segment_id);
    const road_name = seg ? seg.road_name : segment_id;

    if (!obs) {
      const speed = baselineSpeed(segment_id, day_of_week, hour_of_day);
      const status = speedToStatus(speed);
      return {
        segment_id,
        road_name,
        predicted_speed_kmh: speed,
        status,
        color: STATUS_COLOR[status],
        confidence: seg ? 0.35 : 0.10,
        model_type: seg ? 'baseline' : 'insufficient_data',
        observations_used: 0,
      };
    }

    const count = parseInt(obs.count, 10);
    const avgSpeed = parseFloat(obs.avg_speed);

    if (count < 10) {
      const speed = baselineSpeed(segment_id, day_of_week, hour_of_day);
      const status = speedToStatus(speed);
      return {
        segment_id,
        road_name,
        predicted_speed_kmh: speed,
        status,
        color: STATUS_COLOR[status],
        confidence: 0.30,
        model_type: 'insufficient_data',
        observations_used: count,
      };
    }

    const stddev = obs.stddev_speed != null ? parseFloat(obs.stddev_speed) : 0;
    const cv = avgSpeed > 0 ? stddev / avgSpeed : 1;
    const rawConf = 0.7 + (Math.min(count, 200) / 200) * 0.2 - cv * 0.1;
    const confidence = clamp(rawConf, 0.70, 0.95);
    const status = speedToStatus(avgSpeed);

    return {
      segment_id,
      road_name,
      predicted_speed_kmh: avgSpeed,
      status,
      color: STATUS_COLOR[status],
      confidence,
      model_type: 'ml',
      observations_used: count,
    };
  });
}

// ─── predictTraffic ───────────────────────────────────────────────────────────

export async function predictTraffic(
  segmentIds: string[],
  departureTime: string | number | Date,
  pool: Pool
): Promise<PredictionResult[]> {
  const allSegments = await fetchAllSegments(pool);
  return predictTrafficWithSegments(segmentIds, departureTime, pool, allSegments);
}

// ─── findBestDepartureTime ────────────────────────────────────────────────────

export async function findBestDepartureTime(
  segmentIds: string[],
  fromTime: string | number | Date,
  pool: Pool
): Promise<{
  from_time: Date;
  best_time: Date;
  savings_minutes: number;
  total_minutes_at_from: number;
  total_minutes_at_best: number;
}> {
  const from =
    fromTime instanceof Date ? fromTime : new Date(fromTime);

  // Fetch road_segments ONCE; reuse across all 12 prediction slots
  const allSegments = await fetchAllSegments(pool);
  const segmentMap = new Map<string, RoadSegment>(
    allSegments.map((s) => [s.id, s])
  );

  /** Compute total travel minutes for a given departure time across all segments. */
  async function totalMinutes(departure: Date): Promise<number> {
    const predictions = await predictTrafficWithSegments(segmentIds, departure, pool, allSegments);
    return predictions.reduce((sum, p) => {
      const seg = segmentMap.get(p.segment_id);
      const lengthM = seg ? (seg.length_m ?? 1000) : 1000;
      const speedMs = (p.predicted_speed_kmh * 1000) / 60; // m/min
      return sum + lengthM / speedMs;
    }, 0);
  }

  // Test 12 slots: fromTime, +15 min ... +180 min
  const slots: Date[] = [];
  for (let i = 0; i < 12; i++) {
    slots.push(new Date(from.getTime() + i * 15 * 60 * 1000));
  }

  const totals = await Promise.all(slots.map((s) => totalMinutes(s)));

  const total_minutes_at_from = totals[0];
  let bestIdx = 0;
  for (let i = 1; i < totals.length; i++) {
    if (totals[i] < totals[bestIdx]) {
      bestIdx = i;
    }
  }

  return {
    from_time: from,
    best_time: slots[bestIdx],
    savings_minutes: total_minutes_at_from - totals[bestIdx],
    total_minutes_at_from,
    total_minutes_at_best: totals[bestIdx],
  };
}

// ─── ingestObservationToSegment ───────────────────────────────────────────────

/**
 * Perpendicular distance (equirectangular projection) from point P to
 * segment AB, in metres.  Returns null when the nearest point on the
 * infinite line falls outside the segment endpoints (i.e. beyond AB).
 */
function perpendicularDistanceM(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number | null {
  // Convert to approximate metres using equirectangular projection
  const latRef = (aLat + bLat) / 2;
  const cosLat = Math.cos((latRef * Math.PI) / 180);
  const mPerDeg = 111320;

  const ax = aLng * mPerDeg * cosLat;
  const ay = aLat * mPerDeg;
  const bx = bLng * mPerDeg * cosLat;
  const by = bLat * mPerDeg;
  const px = pLng * mPerDeg * cosLat;
  const py = pLat * mPerDeg;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Degenerate segment — return point distance
    return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
  }

  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < 0 || t > 1) {
    // Foot of perpendicular is outside the segment
    return null;
  }

  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.sqrt(
    (px - closestX) * (px - closestX) + (py - closestY) * (py - closestY)
  );
}

/** Find the nearest road segment within `toleranceM` metres. */
export function nearestSegment(
  lat: number,
  lng: number,
  segments: RoadSegment[]
): { id: string; distance_m: number } | null {
  const toleranceM = 75;
  let best: { id: string; distance_m: number } | null = null;

  for (const seg of segments) {
    const dist = perpendicularDistanceM(
      lat,
      lng,
      seg.lat_start,
      seg.lng_start,
      seg.lat_end,
      seg.lng_end
    );
    if (dist === null) continue;
    if (dist > toleranceM) continue;
    if (best === null || dist < best.distance_m) {
      best = { id: seg.id, distance_m: dist };
    }
  }

  return best;
}

export async function ingestObservationToSegment(
  obs: {
    driver_id: string;
    trip_id?: string | null;
    lat: number;
    lng: number;
    speed_kmh: number;
    observed_at: Date;
  },
  pool: Pool
): Promise<void> {
  // Skip silently if speed is null/undefined
  if (obs.speed_kmh == null) return;

  const segments = await fetchAllSegments(pool);
  const nearest = nearestSegment(obs.lat, obs.lng, segments);
  if (!nearest) return; // no segment within tolerance

  const { day_of_week, hour_of_day } = darLocalTime(obs.observed_at);

  await pool.query(
    `INSERT INTO segment_speed_observations
       (segment_id, day_of_week, hour_of_day, observed_speed_kmh, trip_id, observed_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      nearest.id,
      day_of_week,
      hour_of_day,
      obs.speed_kmh,
      obs.trip_id ?? null,
      obs.observed_at,
    ]
  );
}
