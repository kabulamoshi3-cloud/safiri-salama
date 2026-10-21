/**
 * Admin Routes
 * Platform administration: drivers, passengers, trips, settings
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';
import { authMiddleware as auth } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all admin routes
router.use(auth);

// Verify admin role (JWT uses `userType`, middleware casts to `type`)
router.use((req: Request, res: Response, next: NextFunction) => {
  const ut = (req as any).user?.userType ?? (req as any).user?.type;
  if (ut !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// ── GET /admin/stats ─────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)                      AS trips_today,
        COUNT(*) FILTER (WHERE status IN ('pending','accepted','in_progress'))         AS active_trips,
        (SELECT COUNT(*) FROM drivers WHERE status = 'available')                     AS online_drivers,
        COALESCE(SUM(COALESCE(fare, 0)) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0) AS revenue_today
      FROM trips
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /admin/drivers ───────────────────────────────────
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const { approval_status } = req.query;

    let query = `
      SELECT
        d.id,
        d.user_id,
        d.license_number,
        d.license_expiry,
        d.verification_status,
        d.status,
        d.created_at,
        u.name,
        u.phone,
        u.email,
        u.rating,
        u.status AS user_status,
        v.plate_number,
        v.make,
        v.model,
        v.vehicle_type,
        (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.user_id) AS total_trips
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON v.driver_id = d.user_id AND v.status = 'active'
    `;

    const params: any[] = [];
    if (approval_status) {
      query += ` WHERE d.verification_status = $1`;
      params.push(approval_status);
    }

    query += ` ORDER BY d.created_at DESC LIMIT 200`;

    const result = await pool.query(query, params);
    res.json({ drivers: result.rows });
  } catch (error) {
    console.error('Admin get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// ── PUT /admin/drivers/:id/approve ───────────────────────
router.put('/drivers/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE drivers SET verification_status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver approved', driver: result.rows[0] });
  } catch (error) {
    console.error('Admin approve driver error:', error);
    res.status(500).json({ error: 'Failed to approve driver' });
  }
});

// ── PUT /admin/drivers/:id/reject ────────────────────────
router.put('/drivers/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE drivers SET verification_status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver rejected', driver: result.rows[0] });
  } catch (error) {
    console.error('Admin reject driver error:', error);
    res.status(500).json({ error: 'Failed to reject driver' });
  }
});

// ── PUT /admin/drivers/:id/ban ───────────────────────────
router.put('/drivers/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET status = 'banned', updated_at = NOW()
       WHERE id = (SELECT user_id FROM drivers WHERE id = $1)
       RETURNING id, status`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver banned', user: result.rows[0] });
  } catch (error) {
    console.error('Admin ban driver error:', error);
    res.status(500).json({ error: 'Failed to ban driver' });
  }
});

// ── GET /admin/passengers ────────────────────────────────
router.get('/passengers', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.created_at,
        u.name,
        u.phone,
        u.email,
        u.status AS user_status,
        u.rating,
        (SELECT COUNT(*) FROM trips t WHERE t.passenger_id = p.user_id) AS total_trips,
        (SELECT COUNT(*) FROM trips t WHERE t.passenger_id = p.user_id AND t.status IN ('pending','accepted','in_progress')) AS active_trips
      FROM passengers p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 200
    `);
    res.json({ passengers: result.rows });
  } catch (error) {
    console.error('Admin get passengers error:', error);
    res.status(500).json({ error: 'Failed to fetch passengers' });
  }
});

// ── PUT /admin/passengers/:id/ban ────────────────────────
router.put('/passengers/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET status = 'banned', updated_at = NOW()
       WHERE id = (SELECT user_id FROM passengers WHERE id = $1)
       RETURNING id, status`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Passenger not found' });
    }
    res.json({ message: 'Passenger banned', user: result.rows[0] });
  } catch (error) {
    console.error('Admin ban passenger error:', error);
    res.status(500).json({ error: 'Failed to ban passenger' });
  }
});

// ── GET /admin/trips ─────────────────────────────────────
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const { status, from, to, limit = '50', offset = '0' } = req.query;

    let query = `
      SELECT
        t.id,
        t.status,
        t.pickup_address,
        t.dropoff_address,
        t.pickup_latitude,
        t.pickup_longitude,
        t.dropoff_latitude,
        t.dropoff_longitude,
        t.vehicle_type,
        COALESCE(t.fare, 0) AS fare,
        t.estimated_fare,
        t.estimated_distance,
        t.estimated_duration,
        t.payment_method,
        t.created_at,
        t.completed_at,
        t.cancelled_at,
        pu.name AS passenger_name,
        pu.phone AS passenger_phone,
        du.name AS driver_name,
        du.phone AS driver_phone
      FROM trips t
      LEFT JOIN users pu ON t.passenger_id = pu.id
      LEFT JOIN users du ON t.driver_id = du.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    }
    if (from) {
      query += ` AND t.created_at >= $${paramCount++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.created_at <= $${paramCount++}`;
      params.push(to);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pool.query(query, params);
    res.json({ trips: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Admin get trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// ── PUT /admin/trips/:id/cancel ──────────────────────────
router.put('/trips/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE trips SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json({ message: 'Trip cancelled', trip: result.rows[0] });
  } catch (error) {
    console.error('Admin cancel trip error:', error);
    res.status(500).json({ error: 'Failed to cancel trip' });
  }
});

// ── GET /admin/settings ──────────────────────────────────
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value, updated_at FROM system_settings ORDER BY key`
    );
    res.json({ settings: result.rows });
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── POST /admin/settings ─────────────────────────────────
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required' });
    }

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING *`,
      [key, String(value)]
    );
    res.json({ message: 'Setting saved', setting: result.rows[0] });
  } catch (error) {
    console.error('Admin save setting error:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

export default router;
