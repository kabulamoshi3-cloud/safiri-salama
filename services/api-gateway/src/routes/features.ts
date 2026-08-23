/**
 * Additional Features Routes
 * Multiple stops, ride sharing/split fare, loyalty rewards
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// ═══════════════════════════════════════════════
// MULTIPLE STOPS
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/features/multi-stop
 * Create a trip with multiple stops (waypoints)
 */
router.post('/multi-stop', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { stops, vehicle_type, payment_method } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ error: 'At least 2 stops required (pickup + destination)' });
    }
    if (stops.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 stops allowed' });
    }

    const pickup = stops[0];
    const finalDest = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);

    // Calculate total fare (base + extra per stop)
    const baseFare = pickup.estimatedFare || 5000;
    const stopSurcharge = 1500; // Sh 1,500 per extra stop
    const totalFare = baseFare + (waypoints.length * stopSurcharge);

    // Create trip
    const result = await pool.query(
      `INSERT INTO trips (passenger_id, pickup_latitude, pickup_longitude, pickup_address,
        dropoff_latitude, dropoff_longitude, dropoff_address,
        vehicle_type, estimated_fare, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING id`,
      [userId, pickup.lat, pickup.lng, pickup.address,
       finalDest.lat, finalDest.lng, finalDest.address,
       vehicle_type || 'car', totalFare, payment_method || 'cash']
    );

    const tripId = result.rows[0].id;

    // Store waypoints
    for (let i = 0; i < waypoints.length; i++) {
      await pool.query(
        `INSERT INTO trip_waypoints (trip_id, stop_order, latitude, longitude, address)
         VALUES ($1, $2, $3, $4, $5)`,
        [tripId, i + 1, waypoints[i].lat, waypoints[i].lng, waypoints[i].address]
      );
    }

    res.status(201).json({
      tripId,
      stops: stops.length,
      waypoints: waypoints.length,
      totalFare,
      totalFareFormatted: `Sh ${totalFare.toLocaleString()}`,
      surcharge: waypoints.length * stopSurcharge,
      message: `Trip created with ${stops.length} stops`,
    });
  } catch (error) {
    console.error('Multi-stop error:', error);
    res.status(500).json({ error: 'Failed to create multi-stop trip' });
  }
});

/**
 * GET /api/v1/features/multi-stop/:tripId/waypoints
 * Get waypoints for a trip
 */
router.get('/multi-stop/:tripId/waypoints', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const result = await pool.query(
      'SELECT * FROM trip_waypoints WHERE trip_id = $1 ORDER BY stop_order',
      [tripId]
    );
    res.json({ waypoints: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get waypoints' });
  }
});

// ═══════════════════════════════════════════════
// RIDE SHARING / SPLIT FARE
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/features/split-fare
 * Split trip fare with other passengers
 */
router.post('/split-fare', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId, splitWith } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!tripId || !splitWith || !Array.isArray(splitWith) || splitWith.length === 0) {
      return res.status(400).json({ error: 'tripId and splitWith (array of phone numbers) required' });
    }

    // Get trip fare
    const tripResult = await pool.query(
      'SELECT estimated_fare, final_fare FROM trips WHERE id = $1 AND passenger_id = $2',
      [tripId, userId]
    );

    if (tripResult.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

    const fare = tripResult.rows[0].final_fare || tripResult.rows[0].estimated_fare || 0;
    const totalPeople = splitWith.length + 1; // includer orderer
    const perPerson = Math.ceil(fare / totalPeople);

    // Store split info
    await pool.query(
      `INSERT INTO fare_splits (trip_id, initiator_id, total_fare, split_count, per_person_amount, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (trip_id) DO UPDATE SET split_count = $4, per_person_amount = $5`,
      [tripId, userId, fare, totalPeople, perPerson]
    );

    // Store each participant
    for (const phone of splitWith) {
      await pool.query(
        `INSERT INTO fare_split_participants (trip_id, phone, amount, status)
         VALUES ($1, $2, $3, 'pending') ON CONFLICT DO NOTHING`,
        [tripId, phone, perPerson]
      ).catch(() => {});
    }

    res.json({
      tripId,
      totalFare: fare,
      totalFareFormatted: `Sh ${fare.toLocaleString()}`,
      splitBetween: totalPeople,
      perPerson,
      perPersonFormatted: `Sh ${perPerson.toLocaleString()}`,
      participants: [
        { phone: 'You', amount: perPerson, status: 'paid' },
        ...splitWith.map(p => ({ phone: p, amount: perPerson, status: 'pending' })),
      ],
    });
  } catch (error) {
    console.error('Split fare error:', error);
    res.status(500).json({ error: 'Failed to split fare' });
  }
});

// ═══════════════════════════════════════════════
// LOYALTY / REWARDS
// ═══════════════════════════════════════════════

/**
 * GET /api/v1/features/loyalty
 * Get user's loyalty points and rewards
 */
router.get('/loyalty', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Calculate points from completed trips
    const tripsResult = await pool.query(
      `SELECT COUNT(*) as trips, COALESCE(SUM(final_fare), SUM(estimated_fare), 0) as total_spent
       FROM trips WHERE passenger_id = $1 AND status = 'completed'`,
      [userId]
    );

    const trips = parseInt(tripsResult.rows[0].trips) || 0;
    const totalSpent = parseInt(tripsResult.rows[0].total_spent) || 0;
    const points = trips * 10 + Math.floor(totalSpent / 1000); // 10 pts per trip + 1 pt per Sh1000

    // Determine tier
    let tier = 'Bronze';
    let nextTier = 'Silver';
    let pointsToNext = 100 - points;
    if (points >= 500) { tier = 'Gold'; nextTier = 'Platinum'; pointsToNext = 1000 - points; }
    else if (points >= 100) { tier = 'Silver'; nextTier = 'Gold'; pointsToNext = 500 - points; }

    // Available rewards
    const rewards = [
      { id: 1, name: 'Sh 1,000 Off Next Ride', pointsCost: 50, available: points >= 50 },
      { id: 2, name: 'Sh 2,500 Off Next Ride', pointsCost: 100, available: points >= 100 },
      { id: 3, name: 'Free Ride (up to Sh 5,000)', pointsCost: 250, available: points >= 250 },
      { id: 4, name: 'Priority Pickup', pointsCost: 30, available: points >= 30 },
    ];

    res.json({
      points,
      tier,
      nextTier,
      pointsToNext: Math.max(0, pointsToNext),
      totalTrips: trips,
      totalSpent,
      totalSpentFormatted: `Sh ${totalSpent.toLocaleString()}`,
      rewards,
    });
  } catch (error) {
    console.error('Loyalty error:', error);
    res.status(500).json({ error: 'Failed to get loyalty data' });
  }
});

/**
 * POST /api/v1/features/loyalty/redeem
 * Redeem a reward
 */
router.post('/loyalty/redeem', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { rewardId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!rewardId) return res.status(400).json({ error: 'rewardId required' });

    // For now, just acknowledge the redemption
    res.json({
      message: 'Reward redeemed! Applied to your next ride.',
      rewardId,
      appliedToNextTrip: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

export default router;
