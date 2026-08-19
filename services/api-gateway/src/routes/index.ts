/**
 * API Gateway — Route Registration
 * Mounts all feature routers onto a single Express Router
 * so src/index.ts can do:  app.use('/api', authMiddleware, routes)
 */

import { Router } from 'express';
import authRouter             from './auth';
import tripsRouter            from './trips';
import driversRouter          from './drivers';
import promoCodeRouter        from './promoCode';
import referralRouter         from './referral';
import driverIncentivesRouter from './driverIncentives';
import subscriptionRouter     from './subscription';
import supportRouter          from './support';
import corporateAccountsRouter from './corporateAccounts';
import foodDeliveryRouter     from './foodDelivery';

const router = Router();

// ── Core Features (no auth middleware on auth routes) ─────
router.use('/v1/auth',    authRouter);          // Authentication & user management
router.use('/v1/trips',   tripsRouter);         // Trip booking & management
router.use('/v1/drivers', driversRouter);       // Driver registration & management

// ── Additional Features ───────────────────────────────────
router.use('/v1/promo',             promoCodeRouter);
router.use('/v1/referral',          referralRouter);
router.use('/v1/driver-incentives', driverIncentivesRouter);
router.use('/v1/subscription',      subscriptionRouter);
router.use('/v1/support',           supportRouter);
router.use('/v1/corporate',         corporateAccountsRouter);
router.use('/v1/food',              foodDeliveryRouter);

// ── Feature health-check (no auth required upstream) ──────
router.get('/v1/features', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: {
      auth:              true,
      trips:             true,
      drivers:           true,
      promo_codes:       true,
      referral_program:  true,
      driver_incentives: true,
      subscriptions:     true,
      support_system:    true,
      corporate_accounts:true,
      food_delivery:     true,
    },
  });
});

export default router;
