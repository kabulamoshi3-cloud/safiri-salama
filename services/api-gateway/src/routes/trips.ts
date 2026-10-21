/**
 * Trip Routes — State Machine Rewrite
 *
 * Implements a full state machine for trip lifecycle:
 *   REQUESTED → ACCEPTED → DRIVER_ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED
 *                        ↘ CANCELLED (from most states)
 *
 * All state transitions are atomic (DB transaction + audit log).
 * WebSocket events are forwarded to the tracking-service via best-effort HTTP.
 */

import { Router, Response } from 'express';
import axios from 'axios';
import { pool } from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import {
  TripStatus,
  TripRow,
  TripStateLogRow,
  TRANSITIONS,
} from './trips.types';

const router = Router();

// ── Tracking-service notification (fire-and-forget) ───────────────────────────

async function notifyTrackingService(event: string, payload: object): Promise<void> {
  const url = process.env.TRACKING_SERVICE_URL;
  if (!url) return;
  try {
    await axios.post(`${url}/internal/trip-event`, { event, ...payload });
  } catch (_) {
    // best-effort — never block the trip transition
  }
}

// ── State machine helper ──────────────────────────────────────────────────────

interface TransitionOpts {
  note?: string;
  /** Extra columns to SET in the trips row, e.g. { final_fare, cancelled_by } */
  extraCols?: Record<string, unknown>;
}

interface TransitionResult {
  trip: TripRow;
  log: TripStateLogRow;
}

/**
 * Atomically transitions a trip to `toState`:
 *  1. Fetches the trip inside a transaction (FOR UPDATE)
 *  2. Validates actor permissions and transition legality
 *  3. UPDATEs trips and INSERTs trip_state_logs in the same transaction
 */
async function transitionTrip(
  tripId: string,
  toState: TripStatus,
  actor: { id: string; type: string },
  opts: TransitionOpts = {}
): Promise<TransitionResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row to prevent concurrent transitions
    const tripRes = await client.query<TripRow>(
      'SELECT * FROM trips WHERE id = $1 FOR UPDATE',
      [tripId]
    );

    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Trip not found') as any;
      err.statusCode = 404;
      throw err;
    }

    const trip = tripRes.rows[0];
    const currentStatus = trip.status as TripStatus;

    // Verify caller is a party to the trip (or an admin)
    if (
      trip.passenger_id !== actor.id &&
      trip.driver_id !== actor.id &&
      actor.type !== 'admin'
    ) {
      // Special case: a driver accepting a REQUESTED trip has no driver_id yet
      if (!(toState === 'ACCEPTED' && actor.type === 'driver')) {
        await client.query('ROLLBACK');
        const err = new Error('Not a party to this trip') as any;
        err.statusCode = 403;
        throw err;
      }
    }

    // Look up allowed transitions from current status
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed || allowed.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error(`Trip is in terminal state: ${currentStatus}`) as any;
      err.statusCode = 409;
      throw err;
    }

    const transition = allowed.find((t) => t.to === toState);
    if (!transition) {
      await client.query('ROLLBACK');
      const err = new Error(
        `Invalid transition: ${currentStatus} → ${toState}`
      ) as any;
      err.statusCode = 409;
      throw err;
    }

    // Check actor permission for this transition
    if (
      transition.actor === 'driver' && actor.type !== 'driver' ||
      transition.actor === 'passenger' && actor.type !== 'passenger'
    ) {
      await client.query('ROLLBACK');
      const err = new Error(
        `Only a ${transition.actor} can perform this transition`
      ) as any;
      err.statusCode = 403;
      throw err;
    }

    // Build SET clause
    const setCols: string[] = ['status = $1', 'updated_at = NOW()'];
    const setVals: unknown[] = [toState];
    let paramIdx = 2;

    if (transition.timestampCol) {
      setCols.push(`${String(transition.timestampCol)} = NOW()`);
    }

    // When a driver accepts, record driver_id
    if (toState === 'ACCEPTED' && actor.type === 'driver') {
      setCols.push(`driver_id = $${paramIdx}`);
      setVals.push(actor.id);
      paramIdx++;
    }

    // Apply extra columns (final_fare, cancelled_by, etc.)
    for (const [col, val] of Object.entries(opts.extraCols ?? {})) {
      setCols.push(`${col} = $${paramIdx}`);
      setVals.push(val);
      paramIdx++;
    }

    setVals.push(tripId); // last param = WHERE id = $N
    const whereParam = paramIdx;

    const updateRes = await client.query<TripRow>(
      `UPDATE trips SET ${setCols.join(', ')} WHERE id = $${whereParam} RETURNING *`,
      setVals
    );

    const updatedTrip = updateRes.rows[0];

    // Insert audit log (same transaction — if this fails the update is rolled back)
    const logRes = await client.query<TripStateLogRow>(
      `INSERT INTO trip_state_logs (trip_id, from_state, to_state, actor_id, actor_type, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tripId, currentStatus, toState, actor.id, actor.type, opts.note ?? null]
    );

    await client.query('COMMIT');
    return { trip: updatedTrip, log: logRes.rows[0] };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

// ── Error response helper ─────────────────────────────────────────────────────

function sendTransitionError(res: Response, err: unknown): void {
  const e = err as any;
  const status: number = typeof e.statusCode === 'number' ? e.statusCode : 500;
  const message: string = typeof e.message === 'string' ? e.message : 'Internal error';
  res.status(status).json({ error: message });
}

// =============================================================================
// ROUTES — order matters: static paths before :tripId
// =============================================================================

// ── GET /available/nearby — MUST be registered before /:tripId ────────────────
router.get('/available/nearby', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude, radius = 5 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can view available trips' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const rad = parseFloat(radius as string) || 5;

    // Haversine-filtered REQUESTED trips created within the last 2 minutes
    const result = await pool.query(
      `SELECT
        t.*,
        json_build_object(
          'latitude', t.pickup_latitude,
          'longitude', t.pickup_longitude,
          'address',  t.pickup_address
        ) AS pickup_location,
        json_build_object(
          'latitude', t.dropoff_latitude,
          'longitude', t.dropoff_longitude,
          'address',  t.dropoff_address
        ) AS dropoff_location,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(t.pickup_latitude)) *
            cos(radians(t.pickup_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.pickup_latitude))
          )
        ) AS distance_km
      FROM trips t
      WHERE t.status = 'REQUESTED'
        AND t.driver_id IS NULL
        AND t.created_at > NOW() - INTERVAL '2 minutes'
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(t.pickup_latitude)) *
            cos(radians(t.pickup_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.pickup_latitude))
          )
        ) <= $3
      ORDER BY distance_km ASC
      LIMIT 20`,
      [lat, lng, rad]
    );

    res.json({ trips: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get available trips error:', error);
    res.status(500).json({ error: 'Failed to get available trips' });
  }
});

// ── GET / — Trip list / history ───────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT
        t.*,
        json_build_object(
          'id',     d.id,
          'name',   d.name,
          'phone',  d.phone,
          'rating', d.rating
        ) AS driver,
        json_build_object(
          'id',     p.id,
          'name',   p.name,
          'phone',  p.phone
        ) AS passenger
      FROM trips t
      LEFT JOIN users d ON t.driver_id    = d.id
      LEFT JOIN users p ON t.passenger_id = p.id
      WHERE (t.passenger_id = $1 OR t.driver_id = $1)
    `;

    const params: unknown[] = [userId];
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
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get trip history error:', error);
    res.status(500).json({ error: 'Failed to get trip history' });
  }
});

// ── POST / — Create trip (REQUESTED) ─────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'passenger') {
      return res.status(403).json({ error: 'Only passengers can request trips' });
    }

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
      payment_method,
    } = req.body;

    if (
      pickup_latitude == null ||
      pickup_longitude == null ||
      dropoff_latitude == null ||
      dropoff_longitude == null ||
      !vehicle_type
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent passenger from having multiple active trips
    const activeCheck = await pool.query(
      `SELECT id FROM trips
       WHERE passenger_id = $1
         AND status IN ('REQUESTED','ACCEPTED','DRIVER_ARRIVING','ARRIVED','IN_PROGRESS')
       LIMIT 1`,
      [userId]
    );

    if (activeCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have an active trip',
        active_trip_id: activeCheck.rows[0].id,
      });
    }

    // Create trip + initial state log in one transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tripRes = await client.query<TripRow>(
        `INSERT INTO trips (
          passenger_id, pickup_latitude, pickup_longitude, pickup_address,
          dropoff_latitude, dropoff_longitude, dropoff_address,
          vehicle_type, estimated_fare, estimated_distance, estimated_duration,
          payment_method, status, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'REQUESTED',NOW())
        RETURNING *`,
        [
          userId,
          pickup_latitude,
          pickup_longitude,
          pickup_address ?? null,
          dropoff_latitude,
          dropoff_longitude,
          dropoff_address ?? null,
          vehicle_type,
          estimated_fare ?? null,
          estimated_distance ?? null,
          estimated_duration ?? null,
          payment_method ?? 'cash',
        ]
      );

      const newTrip = tripRes.rows[0];

      await client.query(
        `INSERT INTO trip_state_logs (trip_id, from_state, to_state, actor_id, actor_type)
         VALUES ($1, NULL, 'REQUESTED', $2, $3)`,
        [newTrip.id, userId, req.user!.type]
      );

      await client.query('COMMIT');

      // Notify tracking service (best-effort, outside transaction)
      await notifyTrackingService('trip:requested', {
        tripId: newTrip.id,
        passengerId: userId,
        pickup_latitude,
        pickup_longitude,
      });

      return res.status(201).json({
        message: 'Trip created successfully',
        trip: newTrip,
      });
    } catch (innerErr) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// ── GET /:tripId/state-log — MUST be before /:tripId ─────────────────────────
router.get('/:tripId/state-log', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tripCheck = await pool.query(
      'SELECT passenger_id, driver_id FROM trips WHERE id = $1',
      [tripId]
    );

    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const t = tripCheck.rows[0];
    if (
      t.passenger_id !== userId &&
      t.driver_id !== userId &&
      req.user?.type !== 'admin'
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const logs = await pool.query<TripStateLogRow>(
      'SELECT * FROM trip_state_logs WHERE trip_id = $1 ORDER BY created_at ASC',
      [tripId]
    );

    res.json({ state_log: logs.rows });
  } catch (error) {
    console.error('Get state log error:', error);
    res.status(500).json({ error: 'Failed to get state log' });
  }
});

// ── GET /:tripId — Get trip details ──────────────────────────────────────────
router.get('/:tripId', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT
        t.*,
        json_build_object(
          'id',     d.id,
          'name',   d.name,
          'phone',  d.phone,
          'rating', d.rating,
          'vehicle', json_build_object(
            'make',  v.make,
            'model', v.model,
            'color', v.color,
            'plate', v.plate_number,
            'type',  v.vehicle_type
          )
        ) AS driver,
        json_build_object(
          'latitude',  t.pickup_latitude,
          'longitude', t.pickup_longitude,
          'address',   t.pickup_address
        ) AS pickup_location,
        json_build_object(
          'latitude',  t.dropoff_latitude,
          'longitude', t.dropoff_longitude,
          'address',   t.dropoff_address
        ) AS dropoff_location
      FROM trips t
      LEFT JOIN users    d ON t.driver_id    = d.id
      LEFT JOIN vehicles v ON d.id           = v.driver_id
      WHERE t.id = $1
        AND (t.passenger_id = $2 OR t.driver_id = $2)`,
      [tripId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Attach recent state log
    const logRes = await pool.query<TripStateLogRow>(
      `SELECT * FROM trip_state_logs
       WHERE trip_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [tripId]
    );

    res.json({ ...result.rows[0], state_log: logRes.rows });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to get trip' });
  }
});

// ── PATCH /:tripId/accept — REQUESTED → ACCEPTED (driver only) ────────────────
router.patch('/:tripId/accept', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can accept trips' });
    }

    const { trip, log } = await transitionTrip(
      tripId,
      'ACCEPTED',
      { id: userId, type: req.user.type }
    );

    await notifyTrackingService('trip:accepted', { tripId, driverId: userId });

    res.json({ message: 'Trip accepted', trip, log });
  } catch (err) {
    // 409 for concurrent accept race — return Swahili error as spec requires
    const e = err as any;
    if (e.statusCode === 409) {
      return res.status(409).json({ error: 'Safari imechukuliwa tayari' });
    }
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/driver-arriving — ACCEPTED → DRIVER_ARRIVING ───────────────
router.patch('/:tripId/driver-arriving', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can set driver-arriving' });
    }

    const { trip, log } = await transitionTrip(
      tripId,
      'DRIVER_ARRIVING',
      { id: userId, type: req.user.type }
    );

    await notifyTrackingService('trip:driver_arriving', { tripId });

    res.json({ message: 'Driver arriving', trip, log });
  } catch (err) {
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/arrived — DRIVER_ARRIVING → ARRIVED ────────────────────────
router.patch('/:tripId/arrived', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can set arrived' });
    }

    const { trip, log } = await transitionTrip(
      tripId,
      'ARRIVED',
      { id: userId, type: req.user.type }
    );

    await notifyTrackingService('trip:arrived', { tripId });

    res.json({ message: 'Driver arrived', trip, log });
  } catch (err) {
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/start — ARRIVED → IN_PROGRESS ─────────────────────────────
router.patch('/:tripId/start', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can start a trip' });
    }

    const { trip, log } = await transitionTrip(
      tripId,
      'IN_PROGRESS',
      { id: userId, type: req.user.type }
    );

    await notifyTrackingService('trip:started', { tripId });

    res.json({ message: 'Trip started', trip, log });
  } catch (err) {
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/complete — IN_PROGRESS → COMPLETED ────────────────────────
router.patch('/:tripId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.type !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can complete a trip' });
    }

    const { payment_method, transaction_id, final_fare } = req.body;

    const { trip, log } = await transitionTrip(
      tripId,
      'COMPLETED',
      { id: userId, type: req.user.type },
      {
        extraCols: {
          ...(payment_method != null  && { payment_method }),
          ...(transaction_id != null  && { transaction_id }),
          ...(final_fare != null      && { final_fare }),
        },
      }
    );

    await notifyTrackingService('trip:completed', { tripId, final_fare });

    res.json({ message: 'Trip completed successfully', trip, log });
  } catch (err) {
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/cancel — cancel from any non-terminal state ────────────────
router.patch('/:tripId/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { cancellation_reason } = req.body;

    const { trip, log } = await transitionTrip(
      tripId,
      'CANCELLED',
      { id: userId, type: req.user!.type },
      {
        note: cancellation_reason ?? undefined,
        extraCols: {
          cancelled_by: userId,
          ...(cancellation_reason != null && { cancellation_reason }),
          cancelled_at: new Date(), // belt-and-suspenders; timestampCol also sets it
        },
      }
    );

    await notifyTrackingService('trip:cancelled', { tripId, cancelledBy: userId });

    res.json({ message: 'Trip cancelled successfully', trip, log });
  } catch (err) {
    sendTransitionError(res, err);
  }
});

// ── PATCH /:tripId/status — deprecated; returns 410 Gone ─────────────────────
router.patch('/:tripId/status', (_req, res: Response) => {
  res.status(410).json({
    error: 'ENDPOINT_REMOVED',
    message:
      'Use the specific transition endpoints: /accept, /driver-arriving, /arrived, /start, /complete, /cancel',
  });
});

// ── POST /:tripId/rate — Rate trip ────────────────────────────────────────────
router.post('/:tripId/rate', async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const checkResult = await pool.query(
      'SELECT passenger_id, driver_id, status FROM trips WHERE id = $1',
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = checkResult.rows[0];
    if (trip.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only rate completed trips' });
    }

    if (trip.passenger_id !== userId && trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to rate this trip' });
    }

    const isPassenger = trip.passenger_id === userId;

    if (isPassenger) {
      await pool.query(
        `UPDATE trips SET passenger_rating = $1, passenger_review = $2, updated_at = NOW()
         WHERE id = $3`,
        [rating, review ?? null, tripId]
      );
      // Recalculate driver's average rating
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
        `UPDATE trips SET driver_rating = $1, driver_review = $2, updated_at = NOW()
         WHERE id = $3`,
        [rating, review ?? null, tripId]
      );
      // Recalculate passenger's average rating
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
