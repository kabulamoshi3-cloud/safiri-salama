/**
 * Pricing Routes
 * Cancel fees, surge pricing, trip receipts
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Surge pricing multipliers (based on demand)
const SURGE_CONFIG = {
  low: 1.0,      // Normal
  medium: 1.25,  // 25% more
  high: 1.5,     // 50% more
  extreme: 2.0,  // Double
};

// Cancel fee rules
const CANCEL_RULES = {
  free_cancel_window_seconds: 30,   // Free cancel within 30s of booking
  after_accept_fee: 1000,           // Sh 1,000 after driver accepts
  after_arrive_fee: 2000,           // Sh 2,000 after driver arrives
  no_show_fee: 3000,                // Sh 3,000 if passenger no-show
};

/**
 * GET /api/v1/pricing/surge
 * Get current surge multiplier for an area
 */
router.get('/surge', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    // Calculate surge based on pending trips vs available drivers
    const pendingTrips = await pool.query(
      `SELECT COUNT(*) as count FROM trips WHERE status = 'pending' AND created_at > NOW() - INTERVAL '10 minutes'`
    );
    const onlineDrivers = await pool.query(
      `SELECT COUNT(*) as count FROM drivers WHERE is_online = true AND last_location_update > NOW() - INTERVAL '5 minutes'`
    );

    const demand = parseInt(pendingTrips.rows[0].count) || 0;
    const supply = parseInt(onlineDrivers.rows[0].count) || 1;
    const ratio = demand / supply;

    let surgeLevel: keyof typeof SURGE_CONFIG = 'low';
    if (ratio > 3) surgeLevel = 'extreme';
    else if (ratio > 2) surgeLevel = 'high';
    else if (ratio > 1.5) surgeLevel = 'medium';

    const multiplier = SURGE_CONFIG[surgeLevel];

    res.json({
      surgeActive: multiplier > 1.0,
      surgeLevel,
      multiplier,
      demand,
      supply,
      message: multiplier > 1.0
        ? `High demand! Prices are ${Math.round((multiplier - 1) * 100)}% higher`
        : 'Normal pricing',
    });
  } catch (error) {
    console.error('Surge pricing error:', error);
    res.json({ surgeActive: false, multiplier: 1.0, surgeLevel: 'low' });
  }
});

/**
 * POST /api/v1/pricing/cancel-fee
 * Calculate cancel fee for a trip
 */
router.post('/cancel-fee', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!tripId) return res.status(400).json({ error: 'tripId required' });

    const result = await pool.query(
      'SELECT status, created_at, accepted_at FROM trips WHERE id = $1',
      [tripId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

    const trip = result.rows[0];
    const now = new Date();
    const createdAt = new Date(trip.created_at);
    const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

    let fee = 0;
    let reason = '';

    if (secondsSinceCreation <= CANCEL_RULES.free_cancel_window_seconds) {
      fee = 0;
      reason = 'Free cancellation (within 30 seconds)';
    } else if (trip.status === 'pending') {
      fee = 0;
      reason = 'Free cancellation (no driver assigned yet)';
    } else if (trip.status === 'driver_assigned') {
      fee = CANCEL_RULES.after_accept_fee;
      reason = 'Driver already accepted your trip';
    } else if (trip.status === 'driver_arriving') {
      fee = CANCEL_RULES.after_arrive_fee;
      reason = 'Driver is already on the way';
    } else {
      fee = CANCEL_RULES.after_arrive_fee;
      reason = 'Trip already in progress';
    }

    res.json({
      tripId,
      cancelFee: fee,
      feeFormatted: fee > 0 ? `Sh ${fee.toLocaleString()}` : 'Free',
      reason,
      freeCancelWindow: CANCEL_RULES.free_cancel_window_seconds,
    });
  } catch (error) {
    console.error('Cancel fee error:', error);
    res.status(500).json({ error: 'Failed to calculate cancel fee' });
  }
});

/**
 * GET /api/v1/pricing/receipt/:tripId
 * Generate trip receipt
 */
router.get('/receipt/:tripId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT t.*,
              p.name as passenger_name, p.phone as passenger_phone,
              d.name as driver_name, d.phone as driver_phone
       FROM trips t
       LEFT JOIN users p ON t.passenger_id = p.id
       LEFT JOIN users d ON t.driver_id = d.id
       WHERE t.id = $1 AND (t.passenger_id = $2 OR t.driver_id = $2)`,
      [tripId, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

    const trip = result.rows[0];
    const fare = trip.final_fare || trip.estimated_fare || 0;

    res.json({
      receipt: {
        tripId: trip.id,
        date: trip.created_at,
        completedAt: trip.completed_at,
        pickup: trip.pickup_address || 'Pickup',
        dropoff: trip.dropoff_address || 'Destination',
        vehicleType: trip.vehicle_type,
        paymentMethod: trip.payment_method || 'cash',
        transactionId: trip.transaction_id,

        passenger: { name: trip.passenger_name, phone: trip.passenger_phone },
        driver: { name: trip.driver_name, phone: trip.driver_phone },

        fareBreakdown: {
          baseFare: Math.round(fare * 0.3),
          distanceCharge: Math.round(fare * 0.5),
          timeCharge: Math.round(fare * 0.15),
          surgeFee: 0,
          discount: trip.discount_amount || 0,
          total: fare,
        },

        totalFormatted: `Sh ${fare.toLocaleString()}`,
        rating: trip.passenger_rating,
        status: trip.status,
      },
    });
  } catch (error) {
    console.error('Receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

export default router;
