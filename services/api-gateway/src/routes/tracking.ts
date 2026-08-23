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
 * Get live tracking data for an active trip
 */
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get trip with driver info
    const result = await pool.query(
      `SELECT t.*, t.driver_id, t.status,
              t.pickup_latitude, t.pickup_longitude, t.pickup_address,
              t.dropoff_latitude, t.dropoff_longitude, t.dropoff_address
       FROM trips t WHERE t.id = $1`,
      [tripId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = result.rows[0];

    // Get driver's current location
    let driverLocation = null;
    if (trip.driver_id) {
      const memLoc = driverLocations.get(trip.driver_id);
      if (memLoc) {
        driverLocation = { latitude: memLoc.latitude, longitude: memLoc.longitude, heading: memLoc.heading };
      }
    }

    res.json({
      tripId,
      status: trip.status,
      driverLocation,
      pickup: { latitude: trip.pickup_latitude, longitude: trip.pickup_longitude, address: trip.pickup_address },
      dropoff: { latitude: trip.dropoff_latitude, longitude: trip.dropoff_longitude, address: trip.dropoff_address },
    });
  } catch (error) {
    console.error('Trip tracking error:', error);
    res.status(500).json({ error: 'Failed to get trip tracking' });
  }
});

export default router;
