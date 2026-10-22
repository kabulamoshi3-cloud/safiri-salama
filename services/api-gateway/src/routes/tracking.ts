/**
 * Real-time Tracking Routes
 * Driver location updates + passenger trip tracking via polling
 * (WebSocket-like behavior using short polling for Vercel serverless)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../database/connection';
import { validateGpsObservation, GpsObservation } from '../services/GpsValidator';
import { ingestObservationToSegment, predictTraffic, findBestDepartureTime } from '../services/TrafficPredictor';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// In-memory store for active driver locations (resets on cold start)
const driverLocations: Map<string, {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  updatedAt: number;
}> = new Map();

// ---------------------------------------------------------------------------
// RouteResult type + in-memory store
// ---------------------------------------------------------------------------
interface RouteResult {
  distance_km: number;
  duration_minutes: number;
  fare_tzs: number;
  polyline_coords: [number, number][];
  steps: { instruction: string; distance_m: number }[];
  is_estimate: boolean;
}

const routeStore = new Map<string, RouteResult>();

// ---------------------------------------------------------------------------
// Haversine helper (approximate, flat-earth variant used across this file)
// ---------------------------------------------------------------------------
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * 111;
  const dLng = (bLng - aLng) * 111 * Math.cos(aLat * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// ---------------------------------------------------------------------------
// Status / color helpers (same thresholds as TrafficPredictor)
// ---------------------------------------------------------------------------
type TrafficStatus = 'jam' | 'slow' | 'clear';
const STATUS_COLOR: Record<TrafficStatus, string> = {
  jam: '#ff3b30',
  slow: '#ff9500',
  clear: '#00d46a',
};

function speedToStatus(kmh: number): TrafficStatus {
  if (kmh < 15) return 'jam';
  if (kmh <= 35) return 'slow';
  return 'clear';
}

// ---------------------------------------------------------------------------
// Baseline speed (same rules as TrafficPredictor; duplicated to avoid pool-
// dependency at module level)
// ---------------------------------------------------------------------------
const MAJOR_JAM_ROADS = new Set([
  'nyerere-s-001',
  'morogoro-001',
  'kilwa-001',
  'pugu-001',
]);

function darLocalHour(dt: Date): { day_of_week: number; hour_of_day: number } {
  const darMs = dt.getTime() + 3 * 60 * 60 * 1000;
  const d = new Date(darMs);
  return { day_of_week: d.getUTCDay(), hour_of_day: d.getUTCHours() };
}

function baselineSpeed(segmentId: string, day_of_week: number, hour_of_day: number): number {
  const isWeekday = day_of_week >= 1 && day_of_week <= 5;
  const isMorningPeak = hour_of_day >= 6 && hour_of_day <= 8;
  const isEveningPeak = hour_of_day >= 16 && hour_of_day <= 18;
  const isPeak = isWeekday && (isMorningPeak || isEveningPeak);
  if (isPeak) return MAJOR_JAM_ROADS.has(segmentId) ? 8 : 25;
  return 50;
}

// ---------------------------------------------------------------------------
// handleGpsUpdate — validate, persist, and ingest a GPS observation
// ---------------------------------------------------------------------------
async function handleGpsUpdate(
  userId: string,
  obs: GpsObservation,
  trip_id?: string | null
): Promise<void> {
  // Retrieve previous observation for this driver from in-memory store
  const memLoc = driverLocations.get(userId);
  const previous: GpsObservation | undefined = memLoc
    ? {
        lat: memLoc.latitude,
        lng: memLoc.longitude,
        speed_kmh: memLoc.speed,
        heading: memLoc.heading,
        timestamp: memLoc.updatedAt,
      }
    : undefined;

  const validation = validateGpsObservation({ ...obs, _driverId: userId }, previous);

  // Upsert driver position in DB; capture the driver_id PK
  let driverDbId: string | null = null;
  try {
    const dbRes = await pool.query(
      `UPDATE drivers
          SET current_latitude = $1, current_longitude = $2,
              last_location_update = NOW(), is_online = true
        WHERE user_id = $3
        RETURNING id`,
      [obs.lat, obs.lng, userId]
    );
    if (dbRes.rows.length > 0) {
      driverDbId = String(dbRes.rows[0].id);
    }
  } catch {
    // Non-fatal: continue storing observation even if driver update fails
  }

  if (driverDbId) {
    try {
      await pool.query(
        `INSERT INTO gps_observations
           (driver_id, trip_id, lat, lng, speed_kmh, heading, accuracy_m,
            obs_timestamp, is_valid, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0), $9, $10)`,
        [
          driverDbId,
          trip_id ?? null,
          obs.lat,
          obs.lng,
          obs.speed_kmh,
          obs.heading,
          obs.accuracy_m ?? null,
          obs.timestamp,
          validation.valid,
          validation.rejection_reason ?? null,
        ]
      );
    } catch {
      // Non-fatal
    }

    if (validation.valid && obs.speed_kmh != null) {
      try {
        await ingestObservationToSegment(
          {
            driver_id: driverDbId,
            trip_id: trip_id ?? null,
            lat: obs.lat,
            lng: obs.lng,
            speed_kmh: obs.speed_kmh,
            observed_at: new Date(obs.timestamp),
          },
          pool
        );
      } catch {
        // ML ingestion is optional; don't fail the request
      }
    }
  }
}

/**
 * POST /api/v1/tracking/driver/update
 * Driver sends their current location (called every 5 seconds)
 */
router.post('/driver/update', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { latitude, longitude, heading, speed } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!latitude || !longitude) return res.status(400).json({ error: 'latitude and longitude required' });

    // Store in memory for fast access
    driverLocations.set(userId, {
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      updatedAt: Date.now(),
    });

    const obs: GpsObservation = {
      lat: latitude,
      lng: longitude,
      speed_kmh: speed ?? 0,
      heading: heading ?? 0,
      timestamp: req.body.timestamp ?? Date.now(),
      accuracy_m: req.body.accuracy,
    };
    await handleGpsUpdate(userId, obs, req.body.trip_id ?? null);

    res.json({ status: 'ok', timestamp: Date.now() });
  } catch (error) {
    console.error('Tracking update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

/**
 * GET /api/v1/tracking/driver/:driverId
 * Passenger polls driver location during active trip
 */
router.get('/driver/:driverId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { driverId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Check in-memory first (fastest)
    const memLocation = driverLocations.get(driverId);
    if (memLocation && Date.now() - memLocation.updatedAt < 30000) {
      const last_seen_seconds = Math.round((Date.now() - memLocation.updatedAt) / 1000);
      return res.json({
        driverId,
        latitude: memLocation.latitude,
        longitude: memLocation.longitude,
        heading: memLocation.heading,
        speed: memLocation.speed,
        updatedAt: memLocation.updatedAt,
        is_stale: last_seen_seconds > 30,
        last_seen_seconds,
        source: 'realtime',
      });
    }

    // Fallback to database
    const result = await pool.query(
      `SELECT current_latitude, current_longitude, last_location_update FROM drivers WHERE user_id = $1`,
      [driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = result.rows[0];
    const updatedAt = new Date(driver.last_location_update).getTime();
    const last_seen_seconds = Math.round((Date.now() - updatedAt) / 1000);
    res.json({
      driverId,
      latitude: parseFloat(driver.current_latitude),
      longitude: parseFloat(driver.current_longitude),
      heading: 0,
      speed: 0,
      updatedAt,
      is_stale: last_seen_seconds > 30,
      last_seen_seconds,
      source: 'database',
    });
  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({ error: 'Failed to get driver location' });
  }
});

/**
 * GET /api/v1/tracking/nearby?lat=X&lng=Y&radius=5
 * Get all online drivers near a location
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);

    interface NearbyEntry {
      driverId: string;
      latitude: number;
      longitude: number;
      heading: number;
      distance: number;
      is_stale: boolean;
      last_seen_seconds: number;
    }
    // Get from memory (active drivers)
    const nearby: NearbyEntry[] = [];
    const now = Date.now();

    driverLocations.forEach((loc, driverId) => {
      // Only include drivers updated within last 30 seconds
      if (now - loc.updatedAt > 30000) return;

      // Simple distance calculation (good enough for nearby)
      const dLat = (loc.latitude - userLat) * 111;
      const dLng = (loc.longitude - userLng) * 111 * Math.cos(userLat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      if (distance <= radiusKm) {
        const last_seen_seconds = Math.round((now - loc.updatedAt) / 1000);
        nearby.push({
          driverId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          heading: loc.heading,
          distance: Math.round(distance * 1000), // meters
          is_stale: last_seen_seconds > 30,
          last_seen_seconds,
        });
      }
    });

    // If no in-memory drivers, get from DB
    if (nearby.length === 0) {
      const result = await pool.query(
        `SELECT user_id, current_latitude, current_longitude, last_location_update
         FROM drivers
         WHERE is_online = true
         AND current_latitude IS NOT NULL
         AND last_location_update > NOW() - INTERVAL '5 minutes'
         LIMIT 20`
      );

      result.rows.forEach((row) => {
        const updatedAt = new Date(row.last_location_update).getTime();
        const last_seen_seconds = Math.round((now - updatedAt) / 1000);
        nearby.push({
          driverId: row.user_id,
          latitude: parseFloat(row.current_latitude),
          longitude: parseFloat(row.current_longitude),
          heading: 0,
          distance: 0,
          is_stale: last_seen_seconds > 30,
          last_seen_seconds,
        });
      });
    }

    if (nearby.length > 0) {
      return res.json({ drivers: nearby, count: nearby.length });
    }

    // Production: return empty set with Swahili message (no mock GPS)
    if (isProd) {
      return res.json({ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' });
    }

    // Non-production mock fallback
    const mockNearby = [
      { driverId: 'mock-1', latitude: -6.7900, longitude: 39.2100, heading: 90, distance: 800, is_stale: false, last_seen_seconds: 2, _mock: true },
      { driverId: 'mock-2', latitude: -6.7940, longitude: 39.2050, heading: 45, distance: 1200, is_stale: false, last_seen_seconds: 5, _mock: true },
      { driverId: 'mock-3', latitude: -6.7880, longitude: 39.2120, heading: 180, distance: 1800, is_stale: false, last_seen_seconds: 8, _mock: true },
    ];
    return res.json({ drivers: mockNearby, count: mockNearby.length });
  } catch (error) {
    console.error('Nearby drivers error:', error);

    if (isProd) {
      return res.json({ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' });
    }

    // Non-production mock fallback on error
    const mockNearby = [
      { driverId: 'mock-1', latitude: -6.7900, longitude: 39.2100, heading: 90, distance: 800, is_stale: false, last_seen_seconds: 2, _mock: true },
      { driverId: 'mock-2', latitude: -6.7940, longitude: 39.2050, heading: 45, distance: 1200, is_stale: false, last_seen_seconds: 5, _mock: true },
      { driverId: 'mock-3', latitude: -6.7880, longitude: 39.2120, heading: 180, distance: 1800, is_stale: false, last_seen_seconds: 8, _mock: true },
    ];
    return res.json({ drivers: mockNearby, count: mockNearby.length });
  }
});

/**
 * POST /api/v1/tracking/driver/offline
 * Driver goes offline
 */
router.post('/driver/offline', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    driverLocations.delete(userId);

    await pool.query(
      `UPDATE drivers SET is_online = false WHERE user_id = $1`,
      [userId]
    ).catch(() => {});

    res.json({ status: 'offline' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to go offline' });
  }
});

/**
 * POST /api/v1/tracking/calculate-route
 * Calculate route between two points using ORS (falls back to straight-line).
 * Body: { from_lat, from_lng, to_lat, to_lng, trip_id? }
 * No auth required — passengers call this before a trip is created.
 */
router.post('/calculate-route', async (req: Request, res: Response) => {
  const { from_lat, from_lng, to_lat, to_lng, trip_id } = req.body as {
    from_lat: number;
    from_lng: number;
    to_lat: number;
    to_lng: number;
    trip_id?: string;
  };

  if (from_lat == null || from_lng == null || to_lat == null || to_lng == null) {
    return res.status(400).json({ error: 'from_lat, from_lng, to_lat, to_lng required' });
  }

  let result: RouteResult | null = null;

  const orsKey = process.env.ORS_API_KEY ?? '';
  if (orsKey) {
    try {
      const orsRes = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        { coordinates: [[from_lng, from_lat], [to_lng, to_lat]] },
        {
          headers: { Authorization: `Bearer ${orsKey}`, 'Content-Type': 'application/json' },
          timeout: 8000,
        }
      );

      const feature = orsRes.data?.features?.[0];
      const summary = feature?.properties?.summary;
      const segments: any[] = feature?.properties?.segments ?? [];
      const coords: [number, number][] = feature?.geometry?.coordinates ?? [];

      if (summary && coords.length > 0) {
        const distance_km = summary.distance / 1000;
        const duration_minutes = summary.duration / 60;
        const polyline_coords: [number, number][] = coords.map(
          (c: [number, number]) => [c[1], c[0]] // ORS gives [lng,lat] → flip to [lat,lng]
        );
        const steps = (segments[0]?.steps ?? []).map((s: any) => ({
          instruction: s.instruction as string,
          distance_m: s.distance as number,
        }));
        const fare_tzs = Math.max(3000, Math.round(2000 + distance_km * 500 + duration_minutes * 50));

        result = { distance_km, duration_minutes, fare_tzs, polyline_coords, steps, is_estimate: false };
      }
    } catch (orsErr) {
      // Fall through to straight-line estimate
    }
  }

  if (!result) {
    const distance_km = haversineKm(from_lat, from_lng, to_lat, to_lng);
    const duration_minutes = (distance_km / 30) * 60;
    const fare_tzs = Math.max(3000, Math.round(2000 + distance_km * 500 + duration_minutes * 50));
    result = {
      distance_km,
      duration_minutes,
      fare_tzs,
      polyline_coords: [[from_lat, from_lng], [to_lat, to_lng]],
      steps: [{ instruction: 'Endelea moja kwa moja hadi ufikie lengo', distance_m: distance_km * 1000 }],
      is_estimate: true,
    };
  }

  if (trip_id) {
    routeStore.set(trip_id, result);
  }

  return res.json(result);
});

/**
 * GET /api/v1/tracking/route?trip_id=X
 * Retrieve a previously calculated route by trip_id.
 */
router.get('/route', (req: Request, res: Response) => {
  const { trip_id } = req.query as { trip_id?: string };
  if (!trip_id) return res.status(400).json({ error: 'trip_id query param required' });

  const stored = routeStore.get(trip_id);
  if (!stored) return res.status(404).json({ error: 'Route not found' });

  return res.json(stored);
});

/**
 * POST /api/v1/tracking/driver/location
 * Alias for /driver/update — accepts { lat, lng, bearing, speed, trip_id }.
 * Requires auth (Bearer token).
 */
router.post('/driver/location', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { lat, lng, bearing, speed, trip_id } = req.body as {
      lat: number;
      lng: number;
      bearing?: number;
      speed?: number;
      trip_id?: string;
    };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    const latitude = lat;
    const longitude = lng;
    const heading = bearing ?? 0;
    const spd = speed ?? 0;

    driverLocations.set(userId, {
      latitude,
      longitude,
      heading,
      speed: spd,
      updatedAt: Date.now(),
    });

    const obs: GpsObservation = {
      lat: latitude,
      lng: longitude,
      speed_kmh: spd,
      heading,
      timestamp: req.body.timestamp ?? Date.now(),
      accuracy_m: req.body.accuracy,
    };
    await handleGpsUpdate(userId, obs, trip_id ?? null);

    return res.json({ status: 'ok', timestamp: Date.now(), trip_id: trip_id ?? null });
  } catch (error) {
    console.error('Driver location alias error:', error);
    return res.status(500).json({ error: 'Failed to update location' });
  }
});

/**
 * GET /api/v1/tracking/trip/:tripId
 * Get live tracking data for an active trip — returns full shape for frontend
 */
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let tripData: any = null;
    try {
      const result = await pool.query(
        `SELECT
           t.id, t.status, t.driver_id,
           t.dropoff_latitude AS destination_lat,
           t.dropoff_longitude AS destination_lng,
           t.pickup_latitude, t.pickup_longitude,
           u.name AS driver_name,
           v.plate_number AS plate,
           d.current_latitude AS driver_lat,
           d.current_longitude AS driver_lng,
           d.last_location_update
         FROM trips t
         LEFT JOIN drivers d ON d.user_id = t.driver_id
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN vehicles v ON v.driver_id = d.user_id AND v.is_active = true
         WHERE t.id = $1`,
        [tripId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const driverLat = row.driver_lat ? parseFloat(row.driver_lat) : -6.7924;
        const driverLng = row.driver_lng ? parseFloat(row.driver_lng) : 39.2083;
        const destLat = parseFloat(row.destination_lat) || -6.8000;
        const destLng = parseFloat(row.destination_lng) || 39.2200;
        const dLat = (destLat - driverLat) * 111;
        const dLng = (destLng - driverLng) * 111 * Math.cos((driverLat * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        const updatedAt = row.last_location_update
          ? new Date(row.last_location_update).getTime()
          : Date.now();
        const last_seen_seconds = Math.round((Date.now() - updatedAt) / 1000);
        tripData = {
          driver_id: String(row.driver_id),
          name: row.driver_name || 'Dereva',
          plate: row.plate || 'T 000 XXX',
          driver_lat: driverLat,
          driver_lng: driverLng,
          status: row.status || 'in_progress',
          eta_minutes: Math.max(1, Math.round(distKm * 3)),
          destination_lat: destLat,
          destination_lng: destLng,
          pickup_lat: parseFloat(row.pickup_latitude) || -6.7900,
          pickup_lng: parseFloat(row.pickup_longitude) || 39.2100,
          is_stale: last_seen_seconds > 30,
          last_seen_seconds,
        };
      }
    } catch {
      // Fall through to mock / 404
    }

    if (!tripData) {
      if (isProd) {
        return res.status(404).json({ error: 'Trip/driver location not available' });
      }
      tripData = {
        driver_id: 'mock-driver',
        name: 'Juma Hassan',
        plate: 'T 456 DFS',
        driver_lat: -6.8 + Math.random() * 0.01,
        driver_lng: 39.28 + Math.random() * 0.01,
        status: 'in_progress',
        eta_minutes: 5,
        destination_lat: -6.80,
        destination_lng: 39.29,
        pickup_lat: -6.79,
        pickup_lng: 39.27,
        is_stale: false,
        last_seen_seconds: 0,
        _mock: true,
      };
    }

    res.json(tripData);
  } catch (error) {
    console.error('Trip tracking error:', error);
    res.status(500).json({ error: 'Failed to get trip tracking' });
  }
});

/**
 * GET /api/v1/tracking/nearby-drivers?lat=X&lng=Y&radius=3
 * Get enriched nearby drivers with name, plate, eta, vehicle_type
 */
router.get('/nearby-drivers', async (req: Request, res: Response) => {
  const { lat, lng, radius = '3' } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string);

  try {
    const result = await pool.query(
      `SELECT d.id AS driver_id, u.name, d.vehicle_plate, d.vehicle_type,
              dl.latitude AS lat, dl.longitude AS lng, dl.updated_at
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       JOIN driver_locations dl ON dl.driver_id = d.id
       WHERE d.is_online = true
         AND dl.updated_at > NOW() - INTERVAL '1 minute'
       LIMIT 20`
    );

    interface DriverRow { driver_id: string; name: string; vehicle_plate: string; vehicle_type: string; lat: string; lng: string; updated_at: string; }
    interface DriverResult { driver_id: string; name: string; vehicle_plate: string; lat: number; lng: number; distance_km: number; eta_minutes: number; vehicle_type: string; is_stale: boolean; last_seen_seconds: number; }

    if (result.rows.length > 0) {
      const now = Date.now();
      const drivers = result.rows
        .map((row: DriverRow): DriverResult => {
          const distance_km = haversineKm(userLat, userLng, parseFloat(row.lat), parseFloat(row.lng));
          const updatedAt = new Date(row.updated_at).getTime();
          const last_seen_seconds = Math.round((now - updatedAt) / 1000);
          return {
            driver_id: row.driver_id,
            name: row.name,
            vehicle_plate: row.vehicle_plate,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
            distance_km: Math.round(distance_km * 10) / 10,
            eta_minutes: Math.round(distance_km / 30 * 60),
            vehicle_type: row.vehicle_type || 'car',
            is_stale: last_seen_seconds > 30,
            last_seen_seconds,
          };
        })
        .filter((d: DriverResult) => d.distance_km <= radiusKm);

      if (drivers.length > 0) {
        return res.json(drivers);
      }
    }

    // No real drivers found
    if (isProd) {
      return res.json({ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' });
    }

    // Non-production mock fallback
    const mockDrivers = [
      { driver_id: 'mock-1', name: 'Juma Hassan', vehicle_plate: 'T 456 DFS', lat: -6.7900, lng: 39.2100, distance_km: 0.8, eta_minutes: 2, vehicle_type: 'car', is_stale: false, last_seen_seconds: 2, _mock: true },
      { driver_id: 'mock-2', name: 'Amina Salim', vehicle_plate: 'T 123 ABC', lat: -6.7940, lng: 39.2050, distance_km: 1.2, eta_minutes: 3, vehicle_type: 'bajaji', is_stale: false, last_seen_seconds: 5, _mock: true },
      { driver_id: 'mock-3', name: 'Said Omar', vehicle_plate: 'T 789 XYZ', lat: -6.7880, lng: 39.2120, distance_km: 1.8, eta_minutes: 4, vehicle_type: 'car', is_stale: false, last_seen_seconds: 8, _mock: true },
      { driver_id: 'mock-4', name: 'Fatuma Ali', vehicle_plate: 'T 321 GHI', lat: -6.7960, lng: 39.2090, distance_km: 2.1, eta_minutes: 5, vehicle_type: 'boda', is_stale: false, last_seen_seconds: 3, _mock: true },
      { driver_id: 'mock-5', name: 'Hassan Mwamba', vehicle_plate: 'T 654 JKL', lat: -6.7910, lng: 39.2030, distance_km: 2.7, eta_minutes: 6, vehicle_type: 'car', is_stale: false, last_seen_seconds: 7, _mock: true },
    ];
    return res.json(mockDrivers);
  } catch (err) {
    if (isProd) {
      return res.json({ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' });
    }

    const mockDrivers = [
      { driver_id: 'mock-1', name: 'Juma Hassan', vehicle_plate: 'T 456 DFS', lat: -6.7900, lng: 39.2100, distance_km: 0.8, eta_minutes: 2, vehicle_type: 'car', is_stale: false, last_seen_seconds: 2, _mock: true },
      { driver_id: 'mock-2', name: 'Amina Salim', vehicle_plate: 'T 123 ABC', lat: -6.7940, lng: 39.2050, distance_km: 1.2, eta_minutes: 3, vehicle_type: 'bajaji', is_stale: false, last_seen_seconds: 5, _mock: true },
      { driver_id: 'mock-3', name: 'Said Omar', vehicle_plate: 'T 789 XYZ', lat: -6.7880, lng: 39.2120, distance_km: 1.8, eta_minutes: 4, vehicle_type: 'car', is_stale: false, last_seen_seconds: 8, _mock: true },
      { driver_id: 'mock-4', name: 'Fatuma Ali', vehicle_plate: 'T 321 GHI', lat: -6.7960, lng: 39.2090, distance_km: 2.1, eta_minutes: 5, vehicle_type: 'boda', is_stale: false, last_seen_seconds: 3, _mock: true },
      { driver_id: 'mock-5', name: 'Hassan Mwamba', vehicle_plate: 'T 654 JKL', lat: -6.7910, lng: 39.2030, distance_km: 2.7, eta_minutes: 6, vehicle_type: 'car', is_stale: false, last_seen_seconds: 7, _mock: true },
    ];
    return res.json(mockDrivers);
  }
});

/**
 * GET /api/v1/tracking/traffic?lat=X&lng=Y&radius=5
 * Get traffic segment data with polyline coordinates and status
 */
router.get('/traffic', async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  try {
    const result = await pool.query(
      `SELECT id AS segment_id, road_name, lat_start, lng_start, lat_end, lng_end,
              typical_speed_kmh AS speed_kmh, distance_km, is_active
       FROM road_segments
       WHERE is_active = true OR is_active IS NULL
       LIMIT 50`
    );
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }

    if (isProd) {
      return res.json([]);
    }

    // Non-production mock fallback
    const mockSegments = [
      { segment_id: 'seg-1', road_name: 'Nyerere Road', lat_start: -6.8235, lng_start: 39.2695, lat_end: -6.7950, lng_end: 39.2500, status: 'jam', speed_kmh: 8, _mock: true },
      { segment_id: 'seg-2', road_name: 'Morogoro Road', lat_start: -6.8100, lng_start: 39.2400, lat_end: -6.7800, lng_end: 39.2100, status: 'slow', speed_kmh: 22, _mock: true },
      { segment_id: 'seg-3', road_name: 'Sam Nujoma Road', lat_start: -6.8000, lng_start: 39.2700, lat_end: -6.7800, lng_end: 39.2900, status: 'clear', speed_kmh: 55, _mock: true },
      { segment_id: 'seg-4', road_name: 'Bagamoyo Road', lat_start: -6.7700, lng_start: 39.2200, lat_end: -6.7400, lng_end: 39.2000, status: 'slow', speed_kmh: 30, _mock: true },
      { segment_id: 'seg-5', road_name: 'Ali Hassan Mwinyi', lat_start: -6.8050, lng_start: 39.2600, lat_end: -6.7900, lng_end: 39.2800, status: 'clear', speed_kmh: 60, _mock: true },
      { segment_id: 'seg-6', road_name: 'Nelson Mandela Road', lat_start: -6.7600, lng_start: 39.2400, lat_end: -6.7400, lng_end: 39.2600, status: 'jam', speed_kmh: 5, _mock: true },
    ];
    return res.json(mockSegments);
  } catch (err) {
    if (isProd) {
      return res.json([]);
    }

    const mockSegments = [
      { segment_id: 'seg-1', road_name: 'Nyerere Road', lat_start: -6.8235, lng_start: 39.2695, lat_end: -6.7950, lng_end: 39.2500, status: 'jam', speed_kmh: 8, _mock: true },
      { segment_id: 'seg-2', road_name: 'Morogoro Road', lat_start: -6.8100, lng_start: 39.2400, lat_end: -6.7800, lng_end: 39.2100, status: 'slow', speed_kmh: 22, _mock: true },
      { segment_id: 'seg-3', road_name: 'Sam Nujoma Road', lat_start: -6.8000, lng_start: 39.2700, lat_end: -6.7800, lng_end: 39.2900, status: 'clear', speed_kmh: 55, _mock: true },
      { segment_id: 'seg-4', road_name: 'Bagamoyo Road', lat_start: -6.7700, lng_start: 39.2200, lat_end: -6.7400, lng_end: 39.2000, status: 'slow', speed_kmh: 30, _mock: true },
      { segment_id: 'seg-5', road_name: 'Ali Hassan Mwinyi', lat_start: -6.8050, lng_start: 39.2600, lat_end: -6.7900, lng_end: 39.2800, status: 'clear', speed_kmh: 60, _mock: true },
      { segment_id: 'seg-6', road_name: 'Nelson Mandela Road', lat_start: -6.7600, lng_start: 39.2400, lat_end: -6.7400, lng_end: 39.2600, status: 'jam', speed_kmh: 5, _mock: true },
    ];
    return res.json(mockSegments);
  }
});

/**
 * GET /api/v1/tracking/trip/:tripId/driver-location
 * Get live driver location for an active trip (mock-first fallback)
 */
router.get('/trip/:tripId/driver-location', async (req: Request, res: Response) => {
  const { tripId } = req.params;

  try {
    const result = await pool.query(
      `SELECT dl.latitude AS lat, dl.longitude AS lng, dl.heading AS bearing, dl.speed AS speed_kmh,
              t.status, dl.updated_at
       FROM trips t
       JOIN driver_locations dl ON dl.driver_id = t.driver_id
       WHERE t.id = $1`,
      [tripId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const offset = (Date.now() / 5000) % 100;
      const updatedAt = new Date(row.updated_at).getTime();
      const last_seen_seconds = Math.round((Date.now() - updatedAt) / 1000);
      return res.json({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        bearing: row.bearing || 0,
        speed_kmh: parseFloat(row.speed_kmh) || 35,
        eta_minutes: Math.max(1, Math.round(10 - offset * 0.1)),
        progress_percent: Math.min(100, offset),
        is_stale: last_seen_seconds > 30,
        last_seen_seconds,
      });
    }
    throw new Error('no rows');
  } catch (err) {
    if (isProd) {
      return res.status(404).json({ error: 'Trip/driver location not available' });
    }

    // Non-production mock fallback
    const offset = (Date.now() / 5000) % 100;
    return res.json({
      lat: -6.7924 + (offset * 0.0001),
      lng: 39.2083 + (offset * 0.0001),
      bearing: (offset * 3.6) % 360,
      speed_kmh: 35,
      eta_minutes: Math.max(1, Math.round(10 - offset * 0.1)),
      progress_percent: Math.min(100, offset),
      is_stale: false,
      last_seen_seconds: 2,
      _mock: true,
    });
  }
});

/**
 * POST /api/v1/tracking/traffic/predict
 * Predict traffic for a list of segment IDs at a given departure time.
 * Body: { segment_ids: string[], departure_time: string }
 * 15-minute cache via traffic_predictions_cache table.
 */
router.post('/traffic/predict', async (req: Request, res: Response) => {
  try {
    const { segment_ids, departure_time } = req.body as {
      segment_ids?: string[];
      departure_time?: string;
    };

    if (!segment_ids || !Array.isArray(segment_ids) || segment_ids.length === 0) {
      return res.status(400).json({ error: 'segment_ids must be a non-empty array' });
    }

    const depTime = departure_time ?? new Date().toISOString();

    // Check cache
    try {
      const cacheRes = await pool.query(
        `SELECT segment_id, predicted_speed_kmh, confidence, model_type
         FROM traffic_predictions_cache
         WHERE segment_id = ANY($1)
           AND predicted_for = $2
           AND expires_at > NOW()`,
        [segment_ids, depTime]
      );

      if (cacheRes.rows.length === segment_ids.length) {
        // All segments cached
        const predictions = cacheRes.rows.map((row: any) => ({
          segment_id: row.segment_id,
          road_name: row.segment_id,
          predicted_speed_kmh: parseFloat(row.predicted_speed_kmh),
          status: speedToStatus(parseFloat(row.predicted_speed_kmh)),
          color: STATUS_COLOR[speedToStatus(parseFloat(row.predicted_speed_kmh))],
          confidence: parseFloat(row.confidence),
          model_type: row.model_type,
          observations_used: 0,
        }));
        const model_summary = {
          ml: predictions.filter((p: any) => p.model_type === 'ml').length,
          baseline: predictions.filter((p: any) => p.model_type === 'baseline').length,
          insufficient_data: predictions.filter((p: any) => p.model_type === 'insufficient_data').length,
        };
        return res.json({ departure_time: depTime, predictions, cached: true, model_summary });
      }
    } catch {
      // Cache read failed; proceed to predict
    }

    // Call ML predictor
    const predictions = await predictTraffic(segment_ids, depTime, pool);

    // Upsert results into cache
    try {
      for (const p of predictions) {
        await pool.query(
          `INSERT INTO traffic_predictions_cache
             (segment_id, predicted_for, predicted_speed_kmh, confidence, model_type, expires_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '15 minutes')
           ON CONFLICT (segment_id, predicted_for)
           DO UPDATE SET
             predicted_speed_kmh = EXCLUDED.predicted_speed_kmh,
             confidence = EXCLUDED.confidence,
             model_type = EXCLUDED.model_type,
             expires_at = EXCLUDED.expires_at`,
          [p.segment_id, depTime, p.predicted_speed_kmh, p.confidence, p.model_type]
        );
      }
    } catch {
      // Non-fatal: cache write failure does not affect the response
    }

    const model_summary = {
      ml: predictions.filter((p) => p.model_type === 'ml').length,
      baseline: predictions.filter((p) => p.model_type === 'baseline').length,
      insufficient_data: predictions.filter((p) => p.model_type === 'insufficient_data').length,
    };

    return res.json({ departure_time: depTime, predictions, cached: false, model_summary });
  } catch (error) {
    console.error('Traffic predict error:', error);
    return res.status(500).json({ error: 'Failed to predict traffic' });
  }
});

/**
 * GET /api/v1/tracking/traffic/best-time?segment_ids=seg1,seg2&from_time=ISO
 * Find the best departure time to minimise travel time.
 */
router.get('/traffic/best-time', async (req: Request, res: Response) => {
  try {
    const { segment_ids, from_time } = req.query as { segment_ids?: string; from_time?: string };

    const segmentIds = (segment_ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (segmentIds.length === 0) {
      return res.status(400).json({ error: 'segment_ids query param required (comma-separated)' });
    }

    const fromTime = from_time ?? new Date().toISOString();

    const result = await findBestDepartureTime(segmentIds, fromTime, pool);
    return res.json(result);
  } catch (error) {
    console.error('Traffic best-time error:', error);
    return res.status(500).json({ error: 'Failed to find best departure time' });
  }
});

/**
 * GET /api/v1/tracking/traffic/segments
 * Return all road segments with realtime speed (last 10 min) or baseline fallback.
 */
router.get('/traffic/segments', async (req: Request, res: Response) => {
  try {
    const segRes = await pool.query(
      `SELECT id, road_name, lat_start, lng_start, lat_end, lng_end, length_m
       FROM road_segments
       ORDER BY id`
    );

    const now = new Date();
    const { day_of_week, hour_of_day } = darLocalHour(now);

    const segments = await Promise.all(
      segRes.rows.map(async (seg: any) => {
        let current_speed_kmh: number;
        let source: 'realtime' | 'baseline';

        try {
          const obsRes = await pool.query(
            `SELECT AVG(observed_speed_kmh)::float AS speed, COUNT(*) AS n
             FROM segment_speed_observations
             WHERE segment_id = $1
               AND observed_at > NOW() - INTERVAL '10 minutes'`,
            [seg.id]
          );
          const obs = obsRes.rows[0];
          const n = parseInt(obs.n, 10);
          if (n > 0 && obs.speed != null) {
            current_speed_kmh = parseFloat(obs.speed);
            source = 'realtime';
          } else {
            current_speed_kmh = baselineSpeed(seg.id, day_of_week, hour_of_day);
            source = 'baseline';
          }
        } catch {
          current_speed_kmh = baselineSpeed(seg.id, day_of_week, hour_of_day);
          source = 'baseline';
        }

        const status = speedToStatus(current_speed_kmh);
        return {
          segment_id: seg.id,
          road_name: seg.road_name,
          lat_start: parseFloat(seg.lat_start),
          lng_start: parseFloat(seg.lng_start),
          lat_end: parseFloat(seg.lat_end),
          lng_end: parseFloat(seg.lng_end),
          length_m: parseFloat(seg.length_m),
          current_speed_kmh,
          status,
          color: STATUS_COLOR[status],
          source,
        };
      })
    );

    return res.json({ segments });
  } catch (error) {
    console.error('Traffic segments error:', error);
    return res.status(500).json({ error: 'Failed to fetch traffic segments' });
  }
});

export default router;
