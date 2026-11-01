/**
 * API Gateway — Route Registration
 * Static imports ensure all routes are bundled by Vercel.
 */

import { Router } from 'express';

// Core
import auth from './auth';
import trips from './trips';
import drivers from './drivers';
import admin from './admin';

// Business
import promoCode from './promoCode';
import referral from './referral';
import driverIncentives from './driverIncentives';
import subscription from './subscription';
import support from './support';
import corporateAccounts from './corporateAccounts';
import foodDelivery from './foodDelivery';

// New features
import tracking from './tracking';
import notifications from './notifications';
import ratings from './ratings';
import earnings from './earnings';
import payments from './payments';
import shopDelivery from './shopDelivery';
import advertising from './advertising';
import moneyTransfer from './moneyTransfer';
import insurance from './insurance';
import universityMarket from './universityMarket';
import upload from './upload';
import maps from './maps';
import chat from './chat';
import pricing from './pricing';
import features from './features';
import otp from './otp';

const router = Router();

function safeUse(path: string, mod: any) {
  try {
    router.use(path, mod.default || mod);
  } catch (e: any) {
    console.error(`Failed to mount route ${path}: ${e.message}`);
  }
}

// ── Core ───────────────────────────────────────────────────
safeUse('/v1/auth',              auth);
safeUse('/v1/trips',             trips);
safeUse('/v1/drivers',           drivers);
safeUse('/v1/admin',             admin);

// ── Business ──────────────────────────────────────────────
safeUse('/v1/promo',             promoCode);
safeUse('/v1/referral',          referral);
safeUse('/v1/driver-incentives', driverIncentives);
safeUse('/v1/subscription',      subscription);
safeUse('/v1/support',           support);
safeUse('/v1/corporate',         corporateAccounts);
safeUse('/v1/food',              foodDelivery);

// ── New features ───────────────────────────────────────────
safeUse('/v1/tracking',          tracking);
safeUse('/v1/notifications',     notifications);
safeUse('/v1/ratings',           ratings);
safeUse('/v1/earnings',          earnings);
safeUse('/v1/payments',          payments);
safeUse('/v1/shop',              shopDelivery);
safeUse('/v1/advertising',       advertising);
safeUse('/v1/money',             moneyTransfer);
safeUse('/v1/insurance',         insurance);
safeUse('/v1/university',        universityMarket);
safeUse('/v1/upload',            upload);
safeUse('/v1/maps',              maps);
safeUse('/v1/chat',              chat);
safeUse('/v1/pricing',           pricing);
safeUse('/v1/features',          features);
safeUse('/v1/otp',               otp);

// ── Status ────────────────────────────────────────────────
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
