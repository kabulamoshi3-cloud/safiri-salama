/**
 * Trip Routes
 * Trip booking, management, and history
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Create new trip booking
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      pickup_latitude,
      pickup_longitude,
      pickup_address,
      dropoff_latitude,
      dropoff_longitude,
      dropoff_address,
      vehicle_type,
      estimated_fare,
      estimated_distance,
      estimated_duration,
      payment_method
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!pickup_latitude || !pickup_longitude || !dropoff_latitude || !dropoff_longitude || !vehicle_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create trip
    const result = await pool.query(
      `INSERT INTO trips (
        passenger_id, pickup_latitude, pickup_longitude, pickup_address,
        dropoff_latitude, dropoff_longitude, dropoff_address,
        vehicle_type, estimated_fare, estimated_distance, estimated_duration,
        payment_method, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        userId,
        pickup_latitude,
        pickup_longitude,
        pickup_address,
        dropoff_latitude,
        dropoff_longitude,
        dropoff_address,
        vehicle_type,
        estimated_fare,
        estimated_distance,
        estimated_duration,
        payment_method || 'cash',
        'pending'
      ]
    );

    res.status(201).json({
      message: 'Trip created successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Get trip by ID
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT
        t.*,
        json_build_object(
          'id', d.id,
          'name', d.name,
          'phone', d.phone,
          'rating', d.rating,
          'vehicle', json_build_object(
            'make', v.make,
            'model', v.model,
            'color', v.color,
            'plate', v.plate_number,
            'type', v.vehicle_type
          )
        ) as driver,
        json_build_object(
          'latitude', t.pickup_latitude,
          'longitude', t.pickup_longitude,
          'address', t.pickup_address
        ) as pickup_location,
        json_build_object(
          'latitude', t.dropoff_latitude,
          'longitude', t.dropoff_longitude,
          'address', t.dropoff_address
        ) as dropoff_location
      FROM trips t
      LEFT JOIN users d ON t.driver_id = d.id
      LEFT JOIN vehicles v ON d.id = v.driver_id
      WHERE t.id = $1 AND (t.passenger_id = $2 OR t.driver_id = $2)`,
      [tripId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to get trip' });
  }
});

// Get trip history for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT
        t.*,
        json_build_object(
          'id', d.id,
          'name', d.name,
          'phone', d.phone,
          'rating', d.rating
        ) as driver,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'phone', p.phone
        ) as passenger
      FROM trips t
      LEFT JOIN users d ON t.driver_id = d.id
      LEFT JOIN users p ON t.passenger_id = p.id
      WHERE (t.passenger_id = $1 OR t.driver_id = $1)
    `;

    const params: any[] = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      trips: result.rows,
      count: result.rows.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Get trip history error:', error);
    res.status(500).json({ error: 'Failed to get trip history' });
  }
});

// Update trip status
router.patch('/:tripId/status', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status
    const validStatuses = ['pending', 'driver_assigned', 'driver_arriving', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check trip ownership
    const checkResult = await pool.query(
      'SELECT passenger_id, driver_id FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.passenger_id !== userId && trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this trip' });
    }

    // Update trip status
    const result = await pool.query(
      `UPDATE trips
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, tripId]
    );

    res.json({
      message: 'Trip status updated',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ error: 'Failed to update trip status' });
  }
});

// Assign driver to trip
router.patch('/:tripId/assign-driver', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if trip exists and is pending
    const checkResult = await pool.query(
      'SELECT status, driver_id FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.status !== 'pending') {
      return res.status(400).json({ error: 'Trip is not available for assignment' });
    }

    if (trip.driver_id) {
      return res.status(400).json({ error: 'Trip already has a driver' });
    }

    // Assign driver
    const result = await pool.query(
      `UPDATE trips
       SET driver_id = $1, status = 'driver_assigned', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [userId, tripId]
    );

    res.json({
      message: 'Driver assigned successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Complete trip with payment
router.patch('/:tripId/complete', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { payment_method, transaction_id, final_fare } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is the driver
    const checkResult = await pool.query(
      'SELECT driver_id, estimated_fare FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Only the driver can complete this trip' });
    }

    // Complete trip
    const result = await pool.query(
      `UPDATE trips
       SET
         status = 'completed',
         completed_at = NOW(),
         payment_method = $1,
         transaction_id = $2,
         final_fare = $3,
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payment_method || 'cash', transaction_id, final_fare || trip.estimated_fare, tripId]
    );

    res.json({
      message: 'Trip completed successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Failed to complete trip' });
  }
});

// Cancel trip
router.patch('/:tripId/cancel', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { cancellation_reason } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check trip ownership
    const checkResult = await pool.query(
      'SELECT passenger_id, driver_id, status FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.passenger_id !== userId && trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this trip' });
    }

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this trip' });
    }

    // Cancel trip
    const result = await pool.query(
      `UPDATE trips
       SET
         status = 'cancelled',
         cancelled_at = NOW(),
         cancelled_by = $1,
         cancellation_reason = $2,
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [userId, cancellation_reason, tripId]
    );

    res.json({
      message: 'Trip cancelled successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({ error: 'Failed to cancel trip' });
  }
});

// Get available trips for drivers (nearby pending trips)
router.get('/available/nearby', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { latitude, longitude, radius = 5 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Get pending trips within radius (simplified - in production use PostGIS)
    const result = await pool.query(
      `SELECT
        t.*,
        json_build_object(
          'latitude', t.pickup_latitude,
          'longitude', t.pickup_longitude,
          'address', t.pickup_address
        ) as pickup_location,
        json_build_object(
          'latitude', t.dropoff_latitude,
          'longitude', t.dropoff_longitude,
          'address', t.dropoff_address
        ) as dropoff_location
      FROM trips t
      WHERE t.status = 'pending'
        AND t.driver_id IS NULL
      ORDER BY t.created_at DESC
      LIMIT 20`
    );

    res.json({
      trips: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get available trips error:', error);
    res.status(500).json({ error: 'Failed to get available trips' });
  }
});

// Rate trip (passenger rates driver or driver rates passenger)
router.post('/:tripId/rate', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { rating, review } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check trip
    const checkResult = await pool.query(
      'SELECT passenger_id, driver_id, status FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed trips' });
    }

    if (trip.passenger_id !== userId && trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to rate this trip' });
    }

    const isPassenger = trip.passenger_id === userId;

    // Update trip with rating
    if (isPassenger) {
      await pool.query(
        `UPDATE trips
         SET passenger_rating = $1, passenger_review = $2, updated_at = NOW()
         WHERE id = $3`,
        [rating, review, tripId]
      );

      // Update driver's average rating
      await pool.query(
        `UPDATE users
         SET rating = (
           SELECT AVG(passenger_rating)
           FROM trips
           WHERE driver_id = $1 AND passenger_rating IS NOT NULL
         )
         WHERE id = $1`,
        [trip.driver_id]
      );
    } else {
      await pool.query(
        `UPDATE trips
         SET driver_rating = $1, driver_review = $2, updated_at = NOW()
         WHERE id = $3`,
        [rating, review, tripId]
      );

      // Update passenger's average rating
      await pool.query(
        `UPDATE users
         SET rating = (
           SELECT AVG(driver_rating)
           FROM trips
           WHERE passenger_id = $1 AND driver_rating IS NOT NULL
         )
         WHERE id = $1`,
        [trip.passenger_id]
      );
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate trip error:', error);
    res.status(500).json({ error: 'Failed to rate trip' });
  }
});

export default router;
