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

// ── GET /admin/drivers/:id/documents ────────────────────
router.get('/drivers/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Resolve driver user_id: accept either drivers.id or users.id
    const driverResult = await pool.query(
      `SELECT user_id FROM drivers WHERE id = $1`,
      [id]
    );

    let userId: string;
    if (driverResult.rows.length > 0) {
      userId = driverResult.rows[0].user_id;
    } else {
      // id might already be the users.id
      userId = id;
    }

    const result = await pool.query(
      `SELECT
         dd.id,
         dd.user_id,
         dd.document_type,
         dd.image_url,
         dd.document_number,
         dd.expiry_date,
         dd.status,
         dd.rejection_reason,
         dd.reviewed_by,
         dd.reviewed_at,
         dd.uploaded_at,
         u.name AS reviewer_name
       FROM driver_documents dd
       LEFT JOIN users u ON u.id = dd.reviewed_by
       WHERE dd.user_id = $1
       ORDER BY dd.uploaded_at DESC`,
      [userId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Admin get driver documents error:', error);
    res.status(500).json({ error: 'Failed to fetch driver documents' });
  }
});

// ── GET /admin/audit-logs ────────────────────────────────
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { admin_id, from, to, limit = '50', offset = '0' } = req.query;

    let query = `
      SELECT
        al.id,
        al.admin_id,
        al.action,
        al.affected_account_id,
        al.reason,
        al.timestamp,
        au.name AS admin_name,
        au.phone AS admin_phone,
        aff.name AS affected_name,
        aff.phone AS affected_phone
      FROM audit_log al
      JOIN users au  ON au.id  = al.admin_id
      JOIN users aff ON aff.id = al.affected_account_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (admin_id) {
      query += ` AND al.admin_id = $${paramCount++}`;
      params.push(admin_id);
    }
    if (from) {
      query += ` AND al.timestamp >= $${paramCount++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND al.timestamp <= $${paramCount++}`;
      params.push(to);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit as string, 10));
    params.push(parseInt(offset as string, 10));

    const result = await pool.query(query, params);

    const countQuery = `SELECT COUNT(*) AS total FROM audit_log WHERE 1=1` +
      (admin_id ? ` AND admin_id = '${(admin_id as string).replace(/'/g, "''")}'` : '') +
      (from     ? ` AND timestamp >= '${(from as string).replace(/'/g, "''")}'`   : '') +
      (to       ? ` AND timestamp <= '${(to   as string).replace(/'/g, "''")}'`   : '');

    const countResult = await pool.query(countQuery);

    res.json({
      audit_logs: result.rows,
      total: Number(countResult.rows[0].total),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Admin get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ── GET /admin/finance ───────────────────────────────────
router.get('/finance', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', from, to, status } = req.query;

    let query = `
      SELECT
        t.id,
        t.reference,
        t.user_id,
        t.context,
        t.context_id,
        t.amount,
        t.type,
        t.method,
        t.provider,
        t.status,
        t.description,
        t.created_at,
        t.completed_at,
        u.name AS passenger_name,
        u.phone AS passenger_phone
      FROM transactions t
      JOIN users u ON u.id = t.user_id
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

    // Summary totals
    const summaryResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'debit'  AND status = 'completed'), 0) AS total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE type = 'credit' AND status = 'completed'), 0) AS total_payouts,
        COUNT(*)            FILTER (WHERE status = 'pending')                             AS pending_count,
        COUNT(*)            FILTER (WHERE status = 'completed')                           AS completed_count,
        COUNT(*)            FILTER (WHERE status = 'failed')                              AS failed_count
      FROM transactions
    `);

    res.json({
      transactions: result.rows,
      summary: summaryResult.rows[0],
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Admin get finance error:', error);
    res.status(500).json({ error: 'Failed to fetch finance data' });
  }
});

// ── GET /admin/analytics ─────────────────────────────────
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    // Map period param to number of days
    const periodDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = periodDays[period as string] ?? 30;

    const [revenueResult, tripsResult, vehicleBreakdownResult, topDriversResult] =
      await Promise.all([
        // Revenue by day
        pool.query(
          `SELECT
             DATE(created_at)                 AS date,
             COALESCE(SUM(amount), 0)         AS amount
           FROM transactions
           WHERE type = 'debit'
             AND status = 'completed'
             AND created_at >= NOW() - ($1 || ' days')::INTERVAL
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [days]
        ),

        // Trips by day
        pool.query(
          `SELECT
             DATE(created_at)    AS date,
             COUNT(*)            AS count
           FROM trips
           WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [days]
        ),

        // Vehicle type breakdown
        pool.query(
          `SELECT
             vehicle_type   AS type,
             COUNT(*)       AS count
           FROM trips
           WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
             AND vehicle_type IS NOT NULL
           GROUP BY vehicle_type
           ORDER BY count DESC`,
          [days]
        ),

        // Top drivers by trips + earnings
        pool.query(
          `SELECT
             u.name,
             COUNT(tr.id)                                                          AS trips,
             COALESCE(SUM(ps.amount) FILTER (WHERE ps.payee_type = 'driver'), 0)  AS earnings
           FROM trips tr
           JOIN users u ON u.id = tr.driver_id
           LEFT JOIN payment_splits ps ON ps.payee_id = tr.driver_id
           WHERE tr.created_at >= NOW() - ($1 || ' days')::INTERVAL
             AND tr.status = 'completed'
           GROUP BY u.id, u.name
           ORDER BY trips DESC
           LIMIT 10`,
          [days]
        ),
      ]);

    res.json({
      period,
      days,
      revenue_by_day:        revenueResult.rows,
      trips_by_day:          tripsResult.rows,
      vehicle_type_breakdown: vehicleBreakdownResult.rows,
      top_drivers:           topDriversResult.rows,
    });
  } catch (error) {
    console.error('Admin get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
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
