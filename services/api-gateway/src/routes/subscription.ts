/**
 * Subscription Service API Routes
 * Handles premium subscription plans (SkyRex Plus)
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';

export const subscriptionRouter = express.Router();

/**
 * Data Models
 */
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  discount_percentage: number;
  features: string[];
  created_at: Date;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  started_at: Date;
  renews_at: Date;
  cancelled_at: Date;
  payment_method_id: string;
}

/**
 * GET /api/v1/subscription/plans
 * Get available subscription plans
 */
subscriptionRouter.get('/plans', async (req: Request, res: Response) => {
  try {
    const result = await database.query(
      `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_monthly ASC`
    );

    return res.status(200).json({
      plans: result.rows.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_annual: plan.price_annual,
        annual_savings: (plan.price_monthly * 12) - plan.price_annual,
        discount_percentage: plan.discount_percentage,
        features: plan.features
      }))
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/subscription/subscribe
 * Subscribe user to a plan
 */
subscriptionRouter.post('/subscribe', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plan_id, billing_period, payment_method_id } = req.body;

    if (!plan_id || !billing_period) {
      return res.status(400).json({
        error: 'plan_id and billing_period required'
      });
    }

    // Get plan details
    const planResult = await database.query(
      `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];

    // Determine billing amount and period
    let billingAmount, renewalDate;
    const now = new Date();

    if (billing_period === 'monthly') {
      billingAmount = plan.price_monthly;
      renewalDate = new Date(now.setMonth(now.getMonth() + 1));
    } else if (billing_period === 'annual') {
      billingAmount = plan.price_annual;
      renewalDate = new Date(now.setFullYear(now.getFullYear() + 1));
    } else {
      return res.status(400).json({
        error: 'Invalid billing_period. Must be monthly or annual'
      });
    }

    // Check if user already has active subscription
    const existingResult = await database.query(
      `SELECT * FROM user_subscriptions 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        error: 'User already has an active subscription. Cancel existing subscription first.'
      });
    }

    // Process payment (integrate with payment gateway)
    // This is a placeholder - integrate with Stripe/M-Pesa/etc
    const paymentResult = await processPayment(userId, billingAmount, payment_method_id);

    if (!paymentResult.success) {
      return res.status(400).json({
        error: 'Payment failed: ' + paymentResult.message
      });
    }

    // Create subscription
    const subResult = await database.query(
      `INSERT INTO user_subscriptions 
       (user_id, plan_id, status, started_at, renews_at, payment_method_id)
       VALUES ($1, $2, 'active', NOW(), $3, $4)
       RETURNING id`,
      [userId, plan_id, renewalDate, payment_method_id]
    );

    // Log transaction
    await database.query(
      `INSERT INTO subscription_transactions 
       (user_id, subscription_id, amount, transaction_type, payment_id)
       VALUES ($1, $2, $3, 'subscription_start', $4)`,
      [userId, subResult.rows[0].id, billingAmount, paymentResult.payment_id]
    );

    return res.status(201).json({
      success: true,
      subscription_id: subResult.rows[0].id,
      plan_name: plan.name,
      billing_amount: billingAmount,
      billing_period: billing_period,
      renews_at: renewalDate,
      message: `Successfully subscribed to ${plan.name}. Enjoy ${plan.discount_percentage}% off all rides!`
    });

  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/subscription/status
 * Get user's current subscription status
 */
subscriptionRouter.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await database.query(
      `SELECT 
        us.id,
        us.status,
        us.started_at,
        us.renews_at,
        sp.name,
        sp.description,
        sp.discount_percentage,
        sp.features
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        has_subscription: false,
        message: 'No active subscription'
      });
    }

    const sub = result.rows[0];
    const daysUntilRenewal = Math.ceil((new Date(sub.renews_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      has_subscription: true,
      subscription_id: sub.id,
      plan_name: sub.name,
      description: sub.description,
      discount_percentage: sub.discount_percentage,
      status: sub.status,
      started_at: sub.started_at,
      renews_at: sub.renews_at,
      days_until_renewal: daysUntilRenewal,
      features: sub.features
    });

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/subscription/cancel
 * Cancel user's subscription
 */
subscriptionRouter.post('/cancel', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subscription_id } = req.body;

    // Verify subscription belongs to user
    const subResult = await database.query(
      `SELECT * FROM user_subscriptions 
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [subscription_id, userId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subResult.rows[0];

    // Update subscription status
    await database.query(
      `UPDATE user_subscriptions 
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1`,
      [subscription_id]
    );

    // Log cancellation
    await database.query(
      `INSERT INTO subscription_transactions 
       (user_id, subscription_id, amount, transaction_type)
       VALUES ($1, $2, 0, 'subscription_cancelled')`,
      [userId, subscription_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled. You will lose premium benefits at end of billing period.',
      active_until: subscription.renews_at
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/subscription/upgrade
 * Upgrade subscription plan
 */
subscriptionRouter.post('/upgrade', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { new_plan_id, payment_method_id } = req.body;

    // Get current subscription
    const currentSubResult = await database.query(
      `SELECT * FROM user_subscriptions 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (currentSubResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const currentSub = currentSubResult.rows[0];

    // Get new plan details
    const newPlanResult = await database.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [new_plan_id]
    );

    if (newPlanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const newPlan = newPlanResult.rows[0];
    const oldPlan = (await database.query(`SELECT * FROM subscription_plans WHERE id = $1`, [currentSub.plan_id])).rows[0];

    // Calculate pro-rata adjustment
    const remainingDays = Math.ceil((new Date(currentSub.renews_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const priceDifference = Math.floor(((newPlan.price_monthly - oldPlan.price_monthly) / 30) * remainingDays);

    if (priceDifference <= 0) {
      return res.status(400).json({ error: 'Can only upgrade to more expensive plans' });
    }

    // Process payment
    const paymentResult = await processPayment(userId, priceDifference, payment_method_id);

    if (!paymentResult.success) {
      return res.status(400).json({ error: 'Payment failed' });
    }

    // Update subscription
    await database.query(
      `UPDATE user_subscriptions 
       SET plan_id = $1
       WHERE id = $2`,
      [new_plan_id, currentSub.id]
    );

    // Log upgrade
    await database.query(
      `INSERT INTO subscription_transactions 
       (user_id, subscription_id, amount, transaction_type, payment_id)
       VALUES ($1, $2, $3, 'subscription_upgrade', $4)`,
      [userId, currentSub.id, priceDifference, paymentResult.payment_id]
    );

    return res.status(200).json({
      success: true,
      message: `Upgraded to ${newPlan.name}. Charged Sh${priceDifference} for pro-rata difference`,
      new_plan: newPlan.name,
      amount_charged: priceDifference
    });

  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/subscription/benefits
 * Get current subscription benefits
 */
subscriptionRouter.get('/benefits', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await database.query(
      `SELECT 
        sp.name,
        sp.discount_percentage,
        sp.features
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        has_benefits: false,
        features: []
      });
    }

    const plan = result.rows[0];

    return res.status(200).json({
      has_benefits: true,
      plan_name: plan.name,
      discount_percentage: plan.discount_percentage,
      features: plan.features
    });

  } catch (error) {
    console.error('Error fetching benefits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function - Process payment
 * In production, integrate with actual payment provider
 */
async function processPayment(userId: string, amount: number, paymentMethodId: string): Promise<any> {
  try {
    // TODO: Integrate with Stripe, M-Pesa, or other payment processor
    // For now, simulate successful payment
    return {
      success: true,
      payment_id: `PAY_${Date.now()}`,
      amount: amount
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

export default subscriptionRouter;
