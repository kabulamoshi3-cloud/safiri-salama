/**
 * Earnings Routes
 * GET /summary  — aggregated earnings for today/week/month/total
 * GET /history  — per-trip earnings list (paginated)
 */
import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT
        COALESCE(SUM(net_amount) FILTER (WHERE period_date = CURRENT_DATE),                     0) AS today,
        COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS week,
        COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'),0) AS month,
        COALESCE(SUM(net_amount),                                                                0) AS total,
        COALESCE(SUM(gross_amount) FILTER (WHERE payment_method = 'cash'),                       0) AS cash_collected,
        COALESCE(SUM(gross_amount) FILTER (WHERE payment_method != 'cash'),                      0) AS digital_payments,
        COALESCE(SUM(commission_amount),                                                         0) AS total_commission
      FROM driver_earnings
      WHERE driver_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    res.json({
      today:           Number(row.today),
      week:            Number(row.week),
      month:           Number(row.month),
      total:           Number(row.total),
      cashCollected:   Number(row.cash_collected),
      digitalPayments: Number(row.digital_payments),
      pendingPayment:  0,   // placeholder — no pending concept yet
    });
  } catch (error) {
    console.error('Earnings summary error:', error);
    res.status(500).json({ error: 'Failed to get earnings summary' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT
        de.*,
        t.pickup_address,
        t.dropoff_address,
        t.completed_at
       FROM driver_earnings de
       JOIN trips t ON t.id = de.trip_id
       WHERE de.driver_id = $1
       ORDER BY de.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Number(limit), Number(offset)]
    );

    res.json({
      history: result.rows,
      count:   result.rows.length,
      limit:   Number(limit),
      offset:  Number(offset),
    });
  } catch (error) {
    console.error('Earnings history error:', error);
    res.status(500).json({ error: 'Failed to get earnings history' });
  }
});

export default router;
