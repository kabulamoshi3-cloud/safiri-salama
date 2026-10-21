/**
 * In-App Advertising API Routes
 * Allows businesses to create ad campaigns shown to passengers/users.
 * Supports banner ads, sponsored listings, and push promotions.
 */

import express, { Request, Response } from 'express';
import { database } from '../database';

export const advertisingRouter = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type AdPlacement = 'home_banner' | 'trip_complete' | 'map_overlay' | 'feed_card' | 'push_promo';
type AdStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected';
type AdTargetAudience = 'all' | 'passengers' | 'drivers' | 'students' | 'corporate';

interface AdCampaign {
  id: string;
  advertiser_id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;           // Call-to-action button text
  cta_url: string;            // Deep link or external URL
  placement: AdPlacement;
  target_audience: AdTargetAudience;
  budget_tzs: number;         // Total budget in TZS
  cost_per_click: number;     // CPC in TZS
  cost_per_impression: number;
  total_impressions: number;
  total_clicks: number;
  total_spent: number;
  start_date: string;
  end_date: string;
  status: AdStatus;
}

// ─── GET /ads/active — fetch ads to display in-app ───────────────────────────
advertisingRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const { placement, limit = 3 } = req.query;

    const db = await database.getClient();

    let query = `
      SELECT id, title, description, image_url, cta_text, cta_url, placement
      FROM ad_campaigns
      WHERE status = 'active'
        AND start_date <= NOW()
        AND end_date >= NOW()
        AND total_spent < budget_tzs
    `;
    const params: any[] = [];

    if (placement) {
      params.push(placement);
      query += ` AND placement = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY RANDOM() LIMIT $${params.length}`;

    const result = await db.query(query, params);
    db.release();

    res.json({ ads: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch ads', details: err.message });
  }
});

// ─── POST /ads/impression — record an ad impression ──────────────────────────
advertisingRouter.post('/impression', async (req: Request, res: Response) => {
  try {
    const { ad_id } = req.body;
    if (!ad_id) return res.status(400).json({ error: 'ad_id is required' });

    const db = await database.getClient();

    // Increment impressions and deduct cost
    await db.query(
      `UPDATE ad_campaigns
       SET total_impressions = total_impressions + 1,
           total_spent = total_spent + cost_per_impression
       WHERE id = $1 AND status = 'active'`,
      [ad_id]
    );

    // Log the impression
    await db.query(
      `INSERT INTO ad_events (ad_id, event_type, user_id) VALUES ($1, 'impression', $2)`,
      [ad_id, (req as any).user?.id || null]
    );

    db.release();
    res.json({ recorded: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record impression', details: err.message });
  }
});

// ─── POST /ads/click — record an ad click ────────────────────────────────────
advertisingRouter.post('/click', async (req: Request, res: Response) => {
  try {
    const { ad_id } = req.body;
    if (!ad_id) return res.status(400).json({ error: 'ad_id is required' });

    const db = await database.getClient();

    const result = await db.query(
      `UPDATE ad_campaigns
       SET total_clicks = total_clicks + 1,
           total_spent = total_spent + cost_per_click
       WHERE id = $1 AND status = 'active'
       RETURNING cta_url`,
      [ad_id]
    );

    await db.query(
      `INSERT INTO ad_events (ad_id, event_type, user_id) VALUES ($1, 'click', $2)`,
      [ad_id, (req as any).user?.id || null]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ad not found or not active' });
    }

    res.json({ recorded: true, redirect_url: result.rows[0].cta_url });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record click', details: err.message });
  }
});

// ─── POST /ads/campaigns — create a new ad campaign ──────────────────────────
advertisingRouter.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title, description, image_url, cta_text, cta_url,
      placement = 'home_banner',
      target_audience = 'all',
      budget_tzs,
      cost_per_click = 200,
      cost_per_impression = 10,
      start_date,
      end_date,
    } = req.body;

    if (!title || !image_url || !cta_url || !budget_tzs || !start_date || !end_date) {
      return res.status(400).json({
        error: 'title, image_url, cta_url, budget_tzs, start_date, end_date are required',
      });
    }

    if (budget_tzs < 10000) {
      return res.status(400).json({ error: 'Minimum budget is Sh10,000' });
    }

    const db = await database.getClient();

    const result = await db.query(
      `INSERT INTO ad_campaigns
         (advertiser_id, title, description, image_url, cta_text, cta_url,
          placement, target_audience, budget_tzs, cost_per_click,
          cost_per_impression, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review')
       RETURNING *`,
      [
        user.id, title, description, image_url, cta_text, cta_url,
        placement, target_audience, budget_tzs, cost_per_click,
        cost_per_impression, start_date, end_date,
      ]
    );

    db.release();

    res.status(201).json({
      message: 'Campaign submitted for review. It will go live within 24 hours.',
      campaign: result.rows[0],
      estimated_reach: Math.floor(budget_tzs / cost_per_impression),
      estimated_clicks: Math.floor(budget_tzs / cost_per_click),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
});

// ─── GET /ads/campaigns — advertiser's own campaigns ─────────────────────────
advertisingRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT *,
              CASE WHEN budget_tzs > 0 THEN ROUND((total_clicks::float / NULLIF(total_impressions,0)) * 100, 2) ELSE 0 END AS ctr_percent,
              budget_tzs - total_spent AS remaining_budget
       FROM ad_campaigns
       WHERE advertiser_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    );
    db.release();

    res.json({ campaigns: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch campaigns', details: err.message });
  }
});

// ─── GET /ads/campaigns/:id/stats — campaign performance stats ───────────────
advertisingRouter.get('/campaigns/:id/stats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const db = await database.getClient();

    const result = await db.query(
      `SELECT c.*,
              COALESCE(e.daily_impressions, '[]') AS daily_impressions,
              COALESCE(e.daily_clicks, '[]') AS daily_clicks
       FROM ad_campaigns c
       LEFT JOIN LATERAL (
         SELECT
           json_agg(json_build_object('date', day, 'count', imp_count)) AS daily_impressions,
           json_agg(json_build_object('date', day, 'count', clk_count)) AS daily_clicks
         FROM (
           SELECT DATE(created_at) AS day,
                  COUNT(*) FILTER (WHERE event_type='impression') AS imp_count,
                  COUNT(*) FILTER (WHERE event_type='click') AS clk_count
           FROM ad_events WHERE ad_id = c.id
           GROUP BY day ORDER BY day
         ) daily
       ) e ON true
       WHERE c.id = $1 AND c.advertiser_id = $2`,
      [id, user.id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const c = result.rows[0];
    res.json({
      campaign: c,
      summary: {
        total_impressions: c.total_impressions,
        total_clicks: c.total_clicks,
        ctr: c.total_impressions > 0
          ? `${((c.total_clicks / c.total_impressions) * 100).toFixed(2)}%`
          : '0%',
        total_spent: `Sh${Number(c.total_spent).toLocaleString()}`,
        remaining_budget: `Sh${(c.budget_tzs - c.total_spent).toLocaleString()}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// ─── PATCH /ads/campaigns/:id/pause|resume — control campaign ────────────────
advertisingRouter.patch('/campaigns/:id/:action', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id, action } = req.params;
    if (!['pause', 'resume'].includes(action)) {
      return res.status(400).json({ error: 'Action must be pause or resume' });
    }

    const newStatus = action === 'pause' ? 'paused' : 'active';
    const db = await database.getClient();

    const result = await db.query(
      `UPDATE ad_campaigns SET status = $1
       WHERE id = $2 AND advertiser_id = $3
       RETURNING id, status`,
      [newStatus, id, user.id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: `Campaign ${action}d`, campaign: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update campaign', details: err.message });
  }
});

export default advertisingRouter;
