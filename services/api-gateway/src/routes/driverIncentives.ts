/**
 * Driver Incentive Program API Routes
 * Handles driver bonuses, achievement tracking, and performance rewards
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';

export const driverIncentivesRouter = express.Router();

/**
 * Data Models
 */
interface DriverIncentive {
  id: string;
  driver_id: string;
  incentive_type: 'trip_bonus' | 'rating_bonus' | 'streak_bonus' | 'surge_bonus';
  amount: number;
  reason: string;
  earned_date: Date;
  status: 'pending' | 'paid';
}

interface DriverTarget {
  id: string;
  driver_id: string;
  target_type: 'daily_trips' | 'weekly_trips' | 'rating' | 'completion_rate';
  target_value: number;
  current_value: number;
  bonus_amount: number;
  period_start: Date;
  period_end: Date;
  completed: boolean;
}

/**
 * POST /api/v1/driver-incentives/track-trip
 * Track completed trip and calculate incentives
 */
driverIncentivesRouter.post('/track-trip', auth, async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.id;
    const { trip_id, trip_amount, trip_distance, completion_time } = req.body;

    // Get driver current stats
    const driverStats = await database.query(
      `SELECT 
        COUNT(*) as trips_today,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_trips
       FROM trips 
       WHERE driver_id = $1 
       AND DATE(created_at) = CURRENT_DATE`,
      [driverId]
    );

    const stats = driverStats.rows[0];
    let totalIncentive = 0;
    const incentiveBreakdown = [];

    // 1. Daily Trip Bonus: Sh500 per trip for first 10 trips
    if (stats.trips_today < 10) {
      const tripBonus = 500;
      totalIncentive += tripBonus;
      incentiveBreakdown.push({ type: 'trip_bonus', amount: tripBonus, reason: 'Completed trip' });
    }

    // 2. Rating Bonus: Sh1,000 for 4.8+ rating, Sh500 for 4.5+
    if (stats.avg_rating >= 4.8) {
      const ratingBonus = 1000;
      totalIncentive += ratingBonus;
      incentiveBreakdown.push({ type: 'rating_bonus', amount: ratingBonus, reason: 'Excellent rating (4.8+)' });
    } else if (stats.avg_rating >= 4.5) {
      const ratingBonus = 500;
      totalIncentive += ratingBonus;
      incentiveBreakdown.push({ type: 'rating_bonus', amount: ratingBonus, reason: 'Good rating (4.5+)' });
    }

    // 3. Streak Bonus: Sh100 per consecutive trip (max 20 per day)
    if (stats.trips_today > 0) {
      const streakBonus = Math.min(stats.trips_today * 100, 2000);
      totalIncentive += streakBonus;
      incentiveBreakdown.push({ type: 'streak_bonus', amount: streakBonus, reason: `Completed ${stats.trips_today} trips` });
    }

    // 4. Distance Bonus: Sh10 per km for trips > 5km
    if (trip_distance > 5) {
      const distanceBonus = Math.floor(trip_distance * 10);
      totalIncentive += distanceBonus;
      incentiveBreakdown.push({ type: 'distance_bonus', amount: distanceBonus, reason: `${trip_distance}km trip` });
    }

    // 5. Speed Bonus: Sh300 if trip completed in optimal time
    const optimalTime = Math.ceil((trip_distance / 40) * 60); // 40 km/h average
    if (completion_time <= optimalTime * 1.1) {
      const speedBonus = 300;
      totalIncentive += speedBonus;
      incentiveBreakdown.push({ type: 'speed_bonus', amount: speedBonus, reason: 'Optimal completion time' });
    }

    // Record incentives
    for (const incentive of incentiveBreakdown) {
      await database.query(
        `INSERT INTO driver_incentives (driver_id, trip_id, incentive_type, amount, reason, earned_date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [driverId, trip_id, incentive.type, incentive.amount, incentive.reason]
      );
    }

    // Add to driver wallet
    if (totalIncentive > 0) {
      await database.query(
        `INSERT INTO wallet_credits (user_id, amount, reason)
         VALUES ($1, $2, 'Trip incentive bonus')`,
        [driverId, totalIncentive]
      );
    }

    return res.status(200).json({
      success: true,
      total_incentive: totalIncentive,
      breakdown: incentiveBreakdown,
      message: `Earned Sh${totalIncentive} in incentives for this trip`
    });

  } catch (error) {
    console.error('Error tracking trip incentive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/driver-incentives/set-target
 * Admin: Set performance target for driver
 */
driverIncentivesRouter.post('/set-target', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      driver_id,
      target_type,
      target_value,
      bonus_amount,
      period_days
    } = req.body;

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (period_days || 7));

    const result = await database.query(
      `INSERT INTO driver_targets 
       (driver_id, target_type, target_value, current_value, bonus_amount, period_start, period_end)
       VALUES ($1, $2, $3, 0, $4, NOW(), $5)
       RETURNING id`,
      [driver_id, target_type, target_value, bonus_amount, periodEnd]
    );

    return res.status(201).json({
      success: true,
      target_id: result.rows[0].id,
      message: `Target set: ${target_value} ${target_type} for Sh${bonus_amount} bonus`
    });

  } catch (error) {
    console.error('Error setting target:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/driver-incentives/stats
 * Get driver incentive statistics
 */
driverIncentivesRouter.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.id;

    // Today's stats
    const todayStats = await database.query(
      `SELECT 
        COUNT(*) as trips_today,
        SUM(amount) as earnings_today,
        AVG(rating) as avg_rating
       FROM trips 
       WHERE driver_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [driverId]
    );

    // This week stats
    const weekStats = await database.query(
      `SELECT 
        COUNT(*) as trips_week,
        SUM(amount) as earnings_week
       FROM trips 
       WHERE driver_id = $1 
       AND created_at >= NOW() - INTERVAL '7 days'`,
      [driverId]
    );

    // Pending incentives
    const pendingIncentives = await database.query(
      `SELECT SUM(amount) as total FROM driver_incentives 
       WHERE driver_id = $1 AND status = 'pending'`,
      [driverId]
    );

    // Active targets
    const targets = await database.query(
      `SELECT * FROM driver_targets 
       WHERE driver_id = $1 AND period_end > NOW() AND completed = false`,
      [driverId]
    );

    const today = todayStats.rows[0];
    const week = weekStats.rows[0];

    return res.status(200).json({
      today: {
        trips: today.trips_today || 0,
        earnings: today.earnings_today || 0,
        avg_rating: today.avg_rating ? parseFloat(today.avg_rating).toFixed(1) : 'N/A'
      },
      this_week: {
        trips: week.trips_week || 0,
        earnings: week.earnings_week || 0
      },
      pending_incentives: pendingIncentives.rows[0].total || 0,
      active_targets: targets.rows.map(t => ({
        id: t.id,
        type: t.target_type,
        target: t.target_value,
        current: t.current_value,
        progress: Math.round((t.current_value / t.target_value) * 100),
        bonus: t.bonus_amount,
        ends_in: Math.ceil((new Date(t.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days'
      }))
    });

  } catch (error) {
    console.error('Error fetching incentive stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/driver-incentives/history
 * Get driver incentive earning history
 */
driverIncentivesRouter.get('/history', auth, async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.id;
    const { days = 30 } = req.query;

    const result = await database.query(
      `SELECT 
        earned_date,
        incentive_type,
        SUM(amount) as total_amount,
        COUNT(*) as count
       FROM driver_incentives 
       WHERE driver_id = $1 
       AND earned_date >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(earned_date), incentive_type
       ORDER BY earned_date DESC`,
      [driverId, days]
    );

    return res.status(200).json({
      history: result.rows.map(row => ({
        date: new Date(row.earned_date).toLocaleDateString(),
        type: row.incentive_type,
        amount: row.total_amount,
        count: row.count
      }))
    });

  } catch (error) {
    console.error('Error fetching incentive history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/driver-incentives/leaderboard
 * Get top earning drivers
 */
driverIncentivesRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query;

    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = 'AND earned_date >= NOW() - INTERVAL \'1 day\'';
        break;
      case 'month':
        dateFilter = 'AND earned_date >= NOW() - INTERVAL \'30 days\'';
        break;
      default:
        dateFilter = 'AND earned_date >= NOW() - INTERVAL \'7 days\'';
    }

    const result = await database.query(
      `SELECT 
        d.id,
        d.name,
        d.avatar_url,
        COUNT(di.id) as incentives_earned,
        SUM(di.amount) as total_earned,
        AVG(t.rating) as avg_rating
       FROM drivers d
       LEFT JOIN driver_incentives di ON d.id = di.driver_id ${dateFilter}
       LEFT JOIN trips t ON d.id = t.driver_id AND t.status = 'completed'
       GROUP BY d.id, d.name, d.avatar_url
       ORDER BY total_earned DESC
       LIMIT 10`
    );

    return res.status(200).json({
      leaderboard: result.rows.map((row, index) => ({
        rank: index + 1,
        driver_id: row.id,
        name: row.name,
        avatar: row.avatar_url,
        total_earned: row.total_earned || 0,
        incentives_count: row.incentives_earned || 0,
        avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : 'N/A'
      }))
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default driverIncentivesRouter;
