/**
 * API Gateway — Route Registration
 * Direct imports ensure all routes are bundled by Vercel.
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

// Direct mounting — if any route fails to load, the entire module crashes
// and we see the error in Vercel build logs (better than silent 404s)
router.use('/v1/auth',              auth);
router.use('/v1/trips',             trips);
router.use('/v1/drivers',           drivers);
router.use('/v1/admin',             admin);

router.use('/v1/promo',             promoCode);
router.use('/v1/referral',          referral);
router.use('/v1/driver-incentives',  driverIncentives);
router.use('/v1/subscription',      subscription);
router.use('/v1/support',           support);
router.use('/v1/corporate',         corporateAccounts);
router.use('/v1/food',              foodDelivery);

router.use('/v1/tracking',          tracking);
router.use('/v1/notifications',     notifications);
router.use('/v1/ratings',           ratings);
router.use('/v1/earnings',          earnings);
router.use('/v1/payments',          payments);
router.use('/v1/shop',              shopDelivery);
router.use('/v1/advertising',       advertising);
router.use('/v1/money',             moneyTransfer);
router.use('/v1/insurance',         insurance);
router.use('/v1/university',        universityMarket);
router.use('/v1/upload',            upload);
router.use('/v1/maps',              maps);
router.use('/v1/chat',              chat);
router.use('/v1/pricing',           pricing);
router.use('/v1/features',          features);
router.use('/v1/otp',               otp);

// Status endpoint
router.get('/v1/status', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    routes: router.stack.map((l: any) => l.regexp?.toString() || l.route?.path || 'unknown'),
    features: [
      'auth', 'trips', 'drivers', 'admin', 'promo', 'referral',
      'tracking', 'notifications', 'ratings', 'earnings', 'payments',
      'upload', 'maps', 'chat', 'pricing', 'features', 'otp',
      'shop', 'advertising', 'money', 'insurance', 'university',
    ],
  });
});

export default router;
