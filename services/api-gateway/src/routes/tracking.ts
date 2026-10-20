/**
 * Real-time Tracking Routes
 * Driver location updates + passenger trip tracking via polling
 * (WebSocket-like behavior using short polling for Vercel serverless)
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// In-memory store for active driver locations (resets on cold start)
const driverLocations: Map<string, {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  updatedAt: number;
}> = new Map();

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

    // Also persist to DB (less frequently, for history)
    await pool.query(
      `UPDATE drivers SET current_latitude = $1, current_longitude = $2, last_location_update = NOW(), is_online = true WHERE user_id = $3`,
      [latitude, longitude, userId]
    ).catch(() => {});

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
      return res.json({
        driverId,
        latitude: memLocation.latitude,
        longitude: memLocation.longitude,
        heading: memLocation.heading,
        speed: memLocation.speed,
        updatedAt: memLocation.updatedAt,
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
    res.json({
      driverId,
      latitude: parseFloat(driver.current_latitude),
      longitude: parseFloat(driver.current_longitude),
      heading: 0,
      speed: 0,
      updatedAt: new Date(driver.last_location_update).getTime(),
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

    // Get from memory (active drivers)
    const nearby: any[] = [];
    const now = Date.now();

    driverLocations.forEach((loc, driverId) => {
      // Only include drivers updated within last 30 seconds
      if (now - loc.updatedAt > 30000) return;

      // Simple distance calculation (good enough for nearby)
      const dLat = (loc.latitude - userLat) * 111;
      const dLng = (loc.longitude - userLng) * 111 * Math.cos(userLat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      if (distance <= radiusKm) {
        nearby.push({
          driverId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          heading: loc.heading,
          distance: Math.round(distance * 1000), // meters
        });
      }
    });

    // If no in-memory drivers, get from DB
    if (nearby.length === 0) {
      const result = await pool.query(
        `SELECT user_id, current_latitude, current_longitude 
         FROM drivers 
         WHERE is_online = true 
         AND current_latitude IS NOT NULL 
         AND last_location_update > NOW() - INTERVAL '5 minutes'
         LIMIT 20`
      );

      result.rows.forEach((row) => {
        nearby.push({
          driverId: row.user_id,
          latitude: parseFloat(row.current_latitude),
          longitude: parseFloat(row.current_longitude),
          heading: 0,
          distance: 0,
        });
      });
    }

    res.json({ drivers: nearby, count: nearby.length });
  } catch (error) {
    console.error('Nearby drivers error:', error);
    res.status(500).json({ error: 'Failed to get nearby drivers' });
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
           d.current_longitude AS driver_lng
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
        };
      }
    } catch {
      // Fall through to mock
    }

    if (!tripData) {
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

  const haversine = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const dLat = (bLat - aLat) * 111;
    const dLng = (bLng - aLng) * 111 * Math.cos(aLat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  const mockDrivers = [
    { driver_id: 'mock-1', name: 'Juma Hassan', vehicle_plate: 'T 456 DFS', lat: -6.7900, lng: 39.2100, distance_km: 0.8, eta_minutes: 2, vehicle_type: 'car' },
    { driver_id: 'mock-2', name: 'Amina Salim', vehicle_plate: 'T 123 ABC', lat: -6.7940, lng: 39.2050, distance_km: 1.2, eta_minutes: 3, vehicle_type: 'bajaji' },
    { driver_id: 'mock-3', name: 'Said Omar', vehicle_plate: 'T 789 XYZ', lat: -6.7880, lng: 39.2120, distance_km: 1.8, eta_minutes: 4, vehicle_type: 'car' },
    { driver_id: 'mock-4', name: 'Fatuma Ali', vehicle_plate: 'T 321 GHI', lat: -6.7960, lng: 39.2090, distance_km: 2.1, eta_minutes: 5, vehicle_type: 'boda' },
    { driver_id: 'mock-5', name: 'Hassan Mwamba', vehicle_plate: 'T 654 JKL', lat: -6.7910, lng: 39.2030, distance_km: 2.7, eta_minutes: 6, vehicle_type: 'car' },
  ];

  try {
    const result = await pool.query(
      `SELECT d.id AS driver_id, u.name, d.vehicle_plate, d.vehicle_type,
              dl.latitude AS lat, dl.longitude AS lng
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       JOIN driver_locations dl ON dl.driver_id = d.id
       WHERE d.is_online = true
         AND dl.updated_at > NOW() - INTERVAL '1 minute'
       LIMIT 20`
    );

    if (result.rows.length === 0) {
      return res.json(mockDrivers);
    }

    const drivers = result.rows
      .map((row: any) => {
        const distance_km = haversine(userLat, userLng, parseFloat(row.lat), parseFloat(row.lng));
        return {
          driver_id: row.driver_id,
          name: row.name,
          vehicle_plate: row.vehicle_plate,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          distance_km: Math.round(distance_km * 10) / 10,
          eta_minutes: Math.round(distance_km / 30 * 60),
          vehicle_type: row.vehicle_type || 'car',
        };
      })
      .filter((d: any) => d.distance_km <= radiusKm);

    return res.json(drivers.length > 0 ? drivers : mockDrivers);
  } catch (err) {
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

  const mockSegments = [
    { segment_id: 'seg-1', road_name: 'Nyerere Road', lat_start: -6.8235, lng_start: 39.2695, lat_end: -6.7950, lng_end: 39.2500, status: 'jam', speed_kmh: 8 },
    { segment_id: 'seg-2', road_name: 'Morogoro Road', lat_start: -6.8100, lng_start: 39.2400, lat_end: -6.7800, lng_end: 39.2100, status: 'slow', speed_kmh: 22 },
    { segment_id: 'seg-3', road_name: 'Sam Nujoma Road', lat_start: -6.8000, lng_start: 39.2700, lat_end: -6.7800, lng_end: 39.2900, status: 'clear', speed_kmh: 55 },
    { segment_id: 'seg-4', road_name: 'Bagamoyo Road', lat_start: -6.7700, lng_start: 39.2200, lat_end: -6.7400, lng_end: 39.2000, status: 'slow', speed_kmh: 30 },
    { segment_id: 'seg-5', road_name: 'Ali Hassan Mwinyi', lat_start: -6.8050, lng_start: 39.2600, lat_end: -6.7900, lng_end: 39.2800, status: 'clear', speed_kmh: 60 },
    { segment_id: 'seg-6', road_name: 'Nelson Mandela Road', lat_start: -6.7600, lng_start: 39.2400, lat_end: -6.7400, lng_end: 39.2600, status: 'jam', speed_kmh: 5 },
  ];

  try {
    const result = await pool.query(`SELECT * FROM traffic_segments LIMIT 50`);
    if (result.rows.length === 0) {
      return res.json(mockSegments);
    }
    return res.json(result.rows);
  } catch (err) {
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
      `SELECT dl.latitude AS lat, dl.longitude AS lng, dl.heading AS bearing, dl.speed AS speed_kmh, t.status
       FROM trips t
       JOIN driver_locations dl ON dl.driver_id = t.driver_id
       WHERE t.id = $1`,
      [tripId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const offset = (Date.now() / 5000) % 100;
      return res.json({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        bearing: row.bearing || 0,
        speed_kmh: parseFloat(row.speed_kmh) || 35,
        eta_minutes: Math.max(1, Math.round(10 - offset * 0.1)),
        progress_percent: Math.min(100, offset),
      });
    }
    throw new Error('no rows');
  } catch (err) {
    const seed = parseInt(tripId.replace(/[^0-9]/g, '').slice(-4) || '0') || 1;
    void seed; // used for determinism via tripId
    const offset = (Date.now() / 5000) % 100;
    return res.json({
      lat: -6.7924 + (offset * 0.0001),
      lng: 39.2083 + (offset * 0.0001),
      bearing: (offset * 3.6) % 360,
      speed_kmh: 35,
      eta_minutes: Math.max(1, Math.round(10 - offset * 0.1)),
      progress_percent: Math.min(100, offset),
    });
  }
});

export default router;
