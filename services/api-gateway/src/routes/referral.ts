/**
 * Referral Program API Routes
 * Handles referral link generation, tracking, and bonus distribution
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';
import crypto from 'crypto';

export const referralRouter = express.Router();

/**
 * Data Models
 */
interface ReferralLink {
  id: string;
  referrer_id: string;
  referral_code: string;
  created_at: Date;
  total_referrals: number;
  total_bonus_earned: number;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  referrer_bonus: number;
  referee_bonus: number;
  referrer_bonus_paid: boolean;
  referee_bonus_used: boolean;
  created_at: Date;
  first_ride_date: Date;
}

/**
 * POST /api/v1/referral/generate-link
 * Generate a referral link for user
 */
referralRouter.post('/generate-link', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check if user already has a referral link
    const existingResult = await database.query(
      `SELECT * FROM referral_links WHERE referrer_id = $1`,
      [userId]
    );

    if (existingResult.rows.length > 0) {
      const link = existingResult.rows[0];
      return res.status(200).json({
        referral_code: link.referral_code,
        referral_link: `https://app.safiriharaka.com/join?ref=${link.referral_code}`,
        total_referrals: link.total_referrals,
        total_bonus_earned: link.total_bonus_earned
      });
    }

    // Generate unique referral code
    const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Create referral link
    const result = await database.query(
      `INSERT INTO referral_links (referrer_id, referral_code, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, referral_code`,
      [userId, referralCode]
    );

    const link = result.rows[0];

    return res.status(201).json({
      success: true,
      referral_code: link.referral_code,
      referral_link: `https://app.safiriharaka.com/join?ref=${link.referral_code}`,
      sharing_message: `Join Safiri Haraka with my referral code ${link.referral_code} and get Sh5,000 on your first ride! Use code: ${link.referral_code}`
    });

  } catch (error) {
    console.error('Error generating referral link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/referral/register-with-code
 * Register a new user with referral code
 */
referralRouter.post('/register-with-code', async (req: Request, res: Response) => {
  try {
    const { phone_number, referral_code } = req.body;

    if (!referral_code) {
      return res.status(400).json({
        error: 'Referral code required'
      });
    }

    // Find referral link
    const referralResult = await database.query(
      `SELECT * FROM referral_links WHERE referral_code = $1`,
      [referral_code.toUpperCase()]
    );

    if (referralResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid referral code'
      });
    }

    const referralLink = referralResult.rows[0];

    // Create new user (this would be part of normal registration flow)
    const userResult = await database.query(
      `INSERT INTO users (phone_number, user_type, created_at, referred_by)
       VALUES ($1, 'passenger', NOW(), $2)
       RETURNING id, phone_number`,
      [phone_number, referralLink.referrer_id]
    );

    const newUser = userResult.rows[0];

    // Create referral record
    const referralRecord = await database.query(
      `INSERT INTO referrals 
       (referrer_id, referred_user_id, referral_code, referrer_bonus, referee_bonus, created_at)
       VALUES ($1, $2, $3, 2500, 5000, NOW())
       RETURNING id`,
      [referralLink.referrer_id, newUser.id, referral_code]
    );

    // Add bonus to referee's wallet (usable as credit)
    await database.query(
      `INSERT INTO wallet_credits (user_id, amount, reason, valid_until)
       VALUES ($1, 5000, 'Referral bonus', NOW() + INTERVAL '30 days')`,
      [newUser.id]
    );

    return res.status(201).json({
      success: true,
      user_id: newUser.id,
      bonus_amount: 5000,
      message: 'Successfully registered with referral code. You have Sh5,000 credit for your first ride!'
    });

  } catch (error) {
    console.error('Error registering with referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/referral/claim-bonus
 * Claim referrer bonus after referee takes first ride
 */
referralRouter.post('/claim-bonus', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { referral_id } = req.body;

    // Get referral record
    const referralResult = await database.query(
      `SELECT * FROM referrals WHERE id = $1 AND referrer_id = $2`,
      [referral_id, userId]
    );

    if (referralResult.rows.length === 0) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const referral = referralResult.rows[0];

    // Check if referee has taken a ride
    const rideResult = await database.query(
      `SELECT COUNT(*) as count FROM trips 
       WHERE passenger_id = $1 AND status = 'completed'`,
      [referral.referred_user_id]
    );

    if (rideResult.rows[0].count === 0) {
      return res.status(400).json({
        error: 'Referee must complete their first ride before bonus can be claimed'
      });
    }

    // Check if bonus already paid
    if (referral.referrer_bonus_paid) {
      return res.status(400).json({
        error: 'Bonus already claimed'
      });
    }

    // Add bonus to referrer's wallet
    await database.query(
      `INSERT INTO wallet_credits (user_id, amount, reason)
       VALUES ($1, $2, 'Referral bonus - successful referral')`,
      [userId, referral.referrer_bonus]
    );

    // Mark bonus as paid
    await database.query(
      `UPDATE referrals SET referrer_bonus_paid = true, bonus_paid_date = NOW()
       WHERE id = $1`,
      [referral_id]
    );

    return res.status(200).json({
      success: true,
      bonus_amount: referral.referrer_bonus,
      message: `Congratulations! You earned Sh${referral.referrer_bonus} from your referral`
    });

  } catch (error) {
    console.error('Error claiming bonus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/referral/stats
 * Get user's referral statistics
 */
referralRouter.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const statsResult = await database.query(
      `SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN referrer_bonus_paid THEN 1 ELSE 0 END) as completed_referrals,
        SUM(CASE WHEN referrer_bonus_paid THEN referrer_bonus ELSE 0 END) as total_earned
       FROM referrals WHERE referrer_id = $1`,
      [userId]
    );

    const pendingResult = await database.query(
      `SELECT COUNT(*) as count FROM referrals 
       WHERE referrer_id = $1 AND referrer_bonus_paid = false`,
      [userId]
    );

    const stats = statsResult.rows[0];

    return res.status(200).json({
      total_referrals: parseInt(stats.total_referrals) || 0,
      completed_referrals: parseInt(stats.completed_referrals) || 0,
      pending_referrals: parseInt(pendingResult.rows[0].count) || 0,
      total_earned: parseInt(stats.total_earned) || 0,
      potential_earnings: parseInt(pendingResult.rows[0].count) * 2500 || 0
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/referral/list
 * Get list of user's referrals
 */
referralRouter.get('/list', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await database.query(
      `SELECT 
        r.id,
        r.referred_user_id,
        r.created_at,
        r.referrer_bonus_paid,
        r.first_ride_date,
        COUNT(t.id) as rides_completed
       FROM referrals r
       LEFT JOIN trips t ON t.passenger_id = r.referred_user_id AND t.status = 'completed'
       WHERE r.referrer_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      referrals: result.rows.map(r => ({
        id: r.id,
        status: r.referrer_bonus_paid ? 'completed' : 'pending',
        user_id: r.referred_user_id,
        referred_date: r.created_at,
        bonus_amount: 2500,
        rides_completed: r.rides_completed
      }))
    });

  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default referralRouter;
