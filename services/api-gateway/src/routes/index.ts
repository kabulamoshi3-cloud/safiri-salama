/**
 * API Gateway — Route Registration
 * Mounts all feature routers with safe imports
 */

import { Router } from 'express';

const router = Router();

// Safe route loader — if a module fails to import, skip it instead of crashing everything
function safeUse(path: string, importFn: () => any) {
  try {
    const mod = importFn();
    router.use(path, mod.default || mod);
  } catch (e: any) {
    console.error(`Failed to load route ${path}: ${e.message}`);
  }
}

// ── Core Features ─────────────────────────────────────────
safeUse('/v1/auth',              () => require('./auth'));
safeUse('/v1/trips',             () => require('./trips'));
safeUse('/v1/drivers',           () => require('./drivers'));
safeUse('/v1/admin',             () => require('./admin'));

// ── Business Features ─────────────────────────────────────
safeUse('/v1/promo',             () => require('./promoCode'));
safeUse('/v1/referral',          () => require('./referral'));
safeUse('/v1/driver-incentives', () => require('./driverIncentives'));
safeUse('/v1/subscription',      () => require('./subscription'));
safeUse('/v1/support',           () => require('./support'));
safeUse('/v1/corporate',         () => require('./corporateAccounts'));
safeUse('/v1/food',              () => require('./foodDelivery'));

// ── New Features ──────────────────────────────────────────
safeUse('/v1/tracking',          () => require('./tracking'));
safeUse('/v1/notifications',     () => require('./notifications'));
safeUse('/v1/ratings',           () => require('./ratings'));
safeUse('/v1/earnings',          () => require('./earnings'));
safeUse('/v1/payments',          () => require('./payments'));
safeUse('/v1/shop',              () => require('./shopDelivery'));
safeUse('/v1/advertising',       () => require('./advertising'));
safeUse('/v1/money',             () => require('./moneyTransfer'));
safeUse('/v1/insurance',         () => require('./insurance'));
safeUse('/v1/university',        () => require('./universityMarket'));
safeUse('/v1/upload',            () => require('./upload'));
safeUse('/v1/maps',              () => require('./maps'));
safeUse('/v1/chat',              () => require('./chat'));
safeUse('/v1/pricing',           () => require('./pricing'));
safeUse('/v1/features',          () => require('./features'));
safeUse('/v1/otp',               () => require('./otp'));

// ── Features list endpoint ────────────────────────────────
router.get('/v1/status', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'auth', 'trips', 'drivers', 'admin', 'promo', 'referral',
      'tracking', 'notifications', 'ratings', 'earnings', 'payments',
      'upload', 'maps', 'chat', 'pricing', 'features', 'otp',
      'shop', 'advertising', 'money', 'insurance', 'university',
    ],
  });
});

export default router;
