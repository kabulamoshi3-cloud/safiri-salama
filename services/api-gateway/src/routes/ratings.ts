/**
 * Ratings Routes
 * POST /          — submit a rating for a completed trip
 * GET  /my        — ratings received by the authenticated user
 * GET  /drivers/:driverId/rating — public driver rating summary
 */
import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userType: string = (req as any).user?.type ?? '';
    // ratee_id is intentionally NOT accepted from the request body —
    // it is derived server-side from the trip to prevent spoofing.
    const { trip_id, rating, review } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!trip_id || !rating)
      return res.status(400).json({ error: 'trip_id and rating are required' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ error: 'rating must be between 1 and 5' });

    const tripResult = await pool.query(
      'SELECT passenger_id, driver_id, status FROM trips WHERE id = $1',
      [trip_id]
    );
    if (tripResult.rows.length === 0)
      return res.status(404).json({ error: 'Trip not found' });

    const trip = tripResult.rows[0];
    if (trip.status !== 'COMPLETED')
      return res.status(400).json({ error: 'Can only rate completed trips' });
    if (trip.passenger_id !== userId && trip.driver_id !== userId)
      return res.status(403).json({ error: 'Not a party to this trip' });

    // Derive ratee from the trip: passenger rates driver, driver rates passenger.
    // Use JWT role as the authoritative signal; fall back to trip party membership.
    let rateeId: string | null;
    if (userType === 'passenger' || userId === trip.passenger_id) {
      rateeId = trip.driver_id;
    } else {
      rateeId = trip.passenger_id;
    }

    if (!rateeId)
      return res.status(400).json({ error: 'Trip has no driver assigned yet — cannot rate' });

    // Check for duplicate rating — return 409 with Swahili message
    const dupCheck = await pool.query(
      'SELECT id FROM ratings WHERE trip_id = $1 AND rater_id = $2',
      [trip_id, userId]
    );
    if (dupCheck.rows.length > 0)
      return res.status(409).json({ error: 'Umeshakadirisha safari hii' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, review)
         VALUES ($1, $2, $3, $4, $5)`,
        [trip_id, userId, rateeId, rating, review ?? null]
      );

      // Recalculate ratee average and update users.rating
      await client.query(
        `UPDATE users
         SET rating = (
           SELECT AVG(rating)::NUMERIC(3,2)
           FROM ratings
           WHERE ratee_id = $1
         )
         WHERE id = $1`,
        [rateeId]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({ message: 'Rating submitted' });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT r.*, u.name AS rater_name
       FROM ratings r
       JOIN users u ON u.id = r.rater_id
       WHERE r.ratee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const avg = result.rows.length
      ? result.rows.reduce((s: number, r: any) => s + Number(r.rating), 0) / result.rows.length
      : 0;

    res.json({
      average: parseFloat(avg.toFixed(2)),
      count: result.rows.length,
      ratings: result.rows,
    });
  } catch (error) {
    console.error('Get my ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

router.get('/drivers/:driverId/rating', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const result = await pool.query(
      `SELECT r.rating, r.review, r.created_at, u.name AS rater_name
       FROM ratings r
       JOIN users u ON u.id = r.rater_id
       WHERE r.ratee_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [driverId]
    );

    const avg = result.rows.length
      ? result.rows.reduce((s: number, r: any) => s + Number(r.rating), 0) / result.rows.length
      : 0;

    res.json({
      average: parseFloat(avg.toFixed(2)),
      count: result.rows.length,
      reviews: result.rows.slice(0, 5),
    });
  } catch (error) {
    console.error('Get driver rating error:', error);
    res.status(500).json({ error: 'Failed to get driver rating' });
  }
});

export default router;
