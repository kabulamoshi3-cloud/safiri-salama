/**
 * Promo Code API Routes
 * Handles promo code generation, validation, and redemption
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';

export const promoCodeRouter = express.Router();

/**
 * Data Models
 */
interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_percentage: number;
  discount_fixed: number;
  max_uses: number;
  current_uses: number;
  valid_from: Date;
  valid_until: Date;
  created_by: string;
  created_at: Date;
  is_active: boolean;
}

interface Redemption {
  id: string;
  user_id: string;
  promo_code_id: string;
  trip_id: string;
  discount_amount: number;
  redeemed_at: Date;
}

/**
 * POST /api/v1/promo/validate
 * Validate a promo code and get discount
 */
promoCodeRouter.post('/validate', auth, async (req: Request, res: Response) => {
  try {
    const { code, trip_amount } = req.body;
    const userId = req.user?.id;

    if (!code || !trip_amount) {
      return res.status(400).json({
        error: 'code and trip_amount required'
      });
    }

    // Check if code exists and is valid
    const promoResult = await database.query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 
       AND is_active = true 
       AND valid_from <= NOW() 
       AND valid_until >= NOW()`,
      [code.toUpperCase()]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired promo code'
      });
    }

    const promo = promoResult.rows[0];

    // Check usage limit
    if (promo.current_uses >= promo.max_uses) {
      return res.status(400).json({
        error: 'Promo code usage limit exceeded'
      });
    }

    // Check if user already used this code
    const usedResult = await database.query(
      `SELECT COUNT(*) as count FROM redemptions 
       WHERE user_id = $1 AND promo_code_id = $2`,
      [userId, promo.id]
    );

    if (usedResult.rows[0].count > 0 && promo.one_per_user) {
      return res.status(400).json({
        error: 'You have already used this promo code'
      });
    }

    // Calculate discount
    let discount_amount = 0;
    if (promo.discount_percentage > 0) {
      discount_amount = Math.floor((trip_amount * promo.discount_percentage) / 100);
    } else if (promo.discount_fixed > 0) {
      discount_amount = promo.discount_fixed;
    }

    // Cap discount at trip amount
    discount_amount = Math.min(discount_amount, trip_amount);

    return res.status(200).json({
      valid: true,
      code: promo.code,
      description: promo.description,
      discount_percentage: promo.discount_percentage,
      discount_fixed: promo.discount_fixed,
      discount_amount: discount_amount,
      original_amount: trip_amount,
      final_amount: trip_amount - discount_amount
    });

  } catch (error) {
    console.error('Promo validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/promo/redeem
 * Redeem a promo code for a trip
 */
promoCodeRouter.post('/redeem', auth, async (req: Request, res: Response) => {
  try {
    const { code, trip_id, trip_amount } = req.body;
    const userId = req.user?.id;

    // Validate code first
    const promoResult = await database.query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 
       AND is_active = true 
       AND valid_from <= NOW() 
       AND valid_until >= NOW()`,
      [code.toUpperCase()]
    );

    if (promoResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired promo code'
      });
    }

    const promo = promoResult.rows[0];

    // Calculate discount
    let discount_amount = 0;
    if (promo.discount_percentage > 0) {
      discount_amount = Math.floor((trip_amount * promo.discount_percentage) / 100);
    } else if (promo.discount_fixed > 0) {
      discount_amount = promo.discount_fixed;
    }
    discount_amount = Math.min(discount_amount, trip_amount);

    // Create redemption record
    const redemptionResult = await database.query(
      `INSERT INTO redemptions (user_id, promo_code_id, trip_id, discount_amount, redeemed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, promo.id, trip_id, discount_amount]
    );

    // Update promo usage count
    await database.query(
      `UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1`,
      [promo.id]
    );

    // Update trip with discount
    await database.query(
      `UPDATE trips SET 
       promo_code_id = $1, 
       discount_amount = $2, 
       final_price = original_price - $2
       WHERE id = $3`,
      [promo.id, discount_amount, trip_id]
    );

    return res.status(200).json({
      success: true,
      redemption_id: redemptionResult.rows[0].id,
      discount_amount: discount_amount,
      message: `Successfully applied ${code} - saved Sh${discount_amount}`
    });

  } catch (error) {
    console.error('Promo redemption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/promo/available
 * Get list of available promo codes for user
 */
promoCodeRouter.get('/available', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await database.query(
      `SELECT 
        id, code, description, discount_percentage, discount_fixed,
        valid_until, current_uses, max_uses
       FROM promo_codes 
       WHERE is_active = true 
       AND valid_from <= NOW() 
       AND valid_until >= NOW()
       AND current_uses < max_uses
       ORDER BY valid_until ASC
       LIMIT 10`
    );

    return res.status(200).json({
      count: result.rows.length,
      promos: result.rows.map(p => ({
        code: p.code,
        description: p.description,
        discount: p.discount_percentage > 0 ? `${p.discount_percentage}%` : `Sh${p.discount_fixed}`,
        expires_in: Math.ceil((new Date(p.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days'
      }))
    });

  } catch (error) {
    console.error('Error fetching promos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/promo/create (Admin only)
 * Create a new promo code
 */
promoCodeRouter.post('/create', auth, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      code,
      description,
      discount_percentage,
      discount_fixed,
      max_uses,
      valid_from,
      valid_until,
      one_per_user
    } = req.body;

    // Validate input
    if (!code || (!discount_percentage && !discount_fixed)) {
      return res.status(400).json({
        error: 'code and at least one discount type required'
      });
    }

    const result = await database.query(
      `INSERT INTO promo_codes 
       (code, description, discount_percentage, discount_fixed, max_uses, 
        valid_from, valid_until, created_by, one_per_user, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, code`,
      [
        code.toUpperCase(),
        description,
        discount_percentage || 0,
        discount_fixed || 0,
        max_uses || 999999,
        valid_from || new Date(),
        valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        req.user?.id,
        one_per_user || false
      ]
    );

    return res.status(201).json({
      success: true,
      promo_id: result.rows[0].id,
      code: result.rows[0].code
    });

  } catch (error) {
    console.error('Error creating promo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/promo/stats (Admin)
 * Get promo code statistics
 */
promoCodeRouter.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await database.query(
      `SELECT 
        COUNT(*) as total_codes,
        SUM(current_uses) as total_redemptions,
        SUM(discount_amount) as total_discount_given
       FROM (
         SELECT 
           id, current_uses,
           CASE 
             WHEN discount_percentage > 0 THEN (base_trip_amount * discount_percentage / 100)
             ELSE discount_fixed
           END as discount_amount
         FROM promo_codes
       ) stats`
    );

    return res.status(200).json({
      total_codes: result.rows[0].total_codes || 0,
      total_redemptions: result.rows[0].total_redemptions || 0,
      total_discount_given: result.rows[0].total_discount_given || 0
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default promoCodeRouter;
