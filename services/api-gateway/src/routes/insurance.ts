/**
 * Insurance Integration API Routes
 * Trip insurance, passenger personal accident cover,
 * driver vehicle insurance, and health insurance (NHIF) linking.
 */

import express, { Request, Response } from 'express';
import { database } from '../database';

export const insuranceRouter = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type InsurancePlanType =
  | 'trip_cover'          // per-trip personal accident
  | 'monthly_passenger'   // monthly passenger cover
  | 'driver_vehicle'      // driver vehicle & liability
  | 'health_basic'        // basic health cover
  | 'health_premium';     // premium health (NHIF top-up)

type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

// ─── GET /plans — list available insurance plans ──────────────────────────────
insuranceRouter.get('/plans', (_req: Request, res: Response) => {
  res.json({
    plans: [
      {
        type: 'trip_cover',
        name: 'Trip Cover',
        description: 'Personal accident insurance for a single trip. Auto-applied at checkout.',
        premium_tzs: 100,
        coverage_tzs: 2_000_000,
        duration: 'per trip',
        benefits: [
          'Accidental death: Sh2,000,000',
          'Permanent disability: Sh1,500,000',
          'Medical expenses: Sh500,000',
          'Hospital cash: Sh20,000/day (max 10 days)',
        ],
        provider: 'Jubilee Insurance Tanzania',
      },
      {
        type: 'monthly_passenger',
        name: 'SkyRex Passenger Shield',
        description: 'Monthly accident cover for unlimited trips.',
        premium_tzs: 5_000,
        coverage_tzs: 5_000_000,
        duration: 'monthly',
        benefits: [
          'Accidental death: Sh5,000,000',
          'Permanent disability: Sh3,000,000',
          'Medical expenses: Sh1,000,000',
          'Hospital cash: Sh50,000/day (max 30 days)',
          'Ambulance cover',
        ],
        provider: 'Jubilee Insurance Tanzania',
      },
      {
        type: 'driver_vehicle',
        name: 'Driver & Vehicle Cover',
        description: 'Third-party liability and vehicle damage cover for registered drivers.',
        premium_tzs: 30_000,
        coverage_tzs: 10_000_000,
        duration: 'monthly',
        benefits: [
          'Third-party liability: Sh10,000,000',
          'Vehicle repair: Sh5,000,000',
          'Driver personal accident: Sh3,000,000',
          'Passenger liability: Sh2,000,000 per passenger',
        ],
        provider: 'Alliance Insurance Tanzania',
      },
      {
        type: 'health_basic',
        name: 'SkyRex Health Basic',
        description: 'Basic outpatient and inpatient health cover.',
        premium_tzs: 15_000,
        coverage_tzs: 3_000_000,
        duration: 'monthly',
        benefits: [
          'Outpatient consultations',
          'Prescribed medicines',
          'Lab tests & diagnostics',
          'Inpatient: up to Sh3,000,000/year',
        ],
        provider: 'AAR Insurance Tanzania',
      },
      {
        type: 'health_premium',
        name: 'SkyRex Health Premium',
        description: 'Comprehensive health cover — top-up for NHIF members.',
        premium_tzs: 35_000,
        coverage_tzs: 10_000_000,
        duration: 'monthly',
        benefits: [
          'Everything in Health Basic',
          'Dental & optical cover',
          'Specialist consultations',
          'Inpatient: up to Sh10,000,000/year',
          'Emergency evacuation (within Tanzania)',
          'Maternity cover (after 10 months)',
        ],
        provider: 'AAR Insurance Tanzania',
      },
    ],
  });
});

// ─── POST /subscribe — subscribe to an insurance plan ───────────────────────
insuranceRouter.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { plan_type, beneficiary_name, beneficiary_phone, beneficiary_relationship } = req.body;

    const validPlans: InsurancePlanType[] = [
      'trip_cover', 'monthly_passenger', 'driver_vehicle', 'health_basic', 'health_premium',
    ];

    if (!plan_type || !validPlans.includes(plan_type)) {
      return res.status(400).json({ error: `Invalid plan. Choose: ${validPlans.join(', ')}` });
    }

    const premiums: Record<InsurancePlanType, number> = {
      trip_cover: 100,
      monthly_passenger: 5000,
      driver_vehicle: 30000,
      health_basic: 15000,
      health_premium: 35000,
    };

    const premium = premiums[plan_type as InsurancePlanType];

    const db = await database.getClient();

    // Check if already subscribed
    const existing = await db.query(
      `SELECT id FROM insurance_policies WHERE user_id = $1 AND plan_type = $2 AND status = 'active'`,
      [user.id, plan_type]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      db.release();
      return res.status(400).json({ error: 'You already have an active policy of this type' });
    }

    // Deduct from wallet
    const walletResult = await db.query(
      `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [user.id]
    );

    if (plan_type !== 'trip_cover') {
      // trip_cover is charged per-trip at booking, not here
      if (!walletResult.rowCount || walletResult.rows[0].balance < premium) {
        db.release();
        return res.status(400).json({
          error: `Insufficient balance. Premium is Sh${premium.toLocaleString()}`,
        });
      }
      await db.query(
        `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
        [premium, user.id]
      );
    }

    const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const expiryDate = plan_type === 'trip_cover'
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const result = await db.query(
      `INSERT INTO insurance_policies
         (policy_number, user_id, plan_type, premium_paid, beneficiary_name,
          beneficiary_phone, beneficiary_relationship, expires_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
       RETURNING *`,
      [
        policyNumber, user.id, plan_type, plan_type === 'trip_cover' ? 0 : premium,
        beneficiary_name, beneficiary_phone, beneficiary_relationship, expiryDate,
      ]
    );

    db.release();

    res.status(201).json({
      message: `Insurance policy activated successfully`,
      policy: result.rows[0],
      policy_number: policyNumber,
      expires_at: expiryDate || 'Per trip',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to subscribe', details: err.message });
  }
});

// ─── GET /my-policies — list user's insurance policies ───────────────────────
insuranceRouter.get('/my-policies', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT * FROM insurance_policies WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
    db.release();

    res.json({ policies: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch policies', details: err.message });
  }
});

// ─── POST /claims — submit an insurance claim ────────────────────────────────
insuranceRouter.post('/claims', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      policy_id, incident_type, incident_description,
      incident_date, claim_amount, supporting_documents,
      trip_id,
    } = req.body;

    if (!policy_id || !incident_type || !incident_description || !claim_amount) {
      return res.status(400).json({
        error: 'policy_id, incident_type, incident_description, and claim_amount are required',
      });
    }

    const db = await database.getClient();

    // Verify policy belongs to user and is active
    const policyResult = await db.query(
      `SELECT * FROM insurance_policies WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [policy_id, user.id]
    );

    if (policyResult.rowCount === 0) {
      db.release();
      return res.status(400).json({ error: 'Policy not found or not active' });
    }

    const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const result = await db.query(
      `INSERT INTO insurance_claims
         (claim_number, policy_id, user_id, trip_id, incident_type, incident_description,
          incident_date, claim_amount, supporting_documents, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted')
       RETURNING *`,
      [
        claimNumber, policy_id, user.id, trip_id, incident_type,
        incident_description, incident_date, claim_amount,
        JSON.stringify(supporting_documents || []),
      ]
    );

    db.release();

    res.status(201).json({
      message: 'Claim submitted successfully. Our team will review within 3–5 business days.',
      claim: result.rows[0],
      claim_number: claimNumber,
      expected_response: '3–5 business days',
      contact: 'insurance@skyrex.co.tz or call 0800-DALA-INS',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit claim', details: err.message });
  }
});

// ─── GET /claims — user's claims history ────────────────────────────────────
insuranceRouter.get('/claims', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT ic.*, ip.plan_type, ip.policy_number
       FROM insurance_claims ic
       JOIN insurance_policies ip ON ip.id = ic.policy_id
       WHERE ic.user_id = $1
       ORDER BY ic.created_at DESC`,
      [user.id]
    );
    db.release();

    res.json({ claims: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch claims', details: err.message });
  }
});

// ─── GET /claims/:claimId — track claim status ───────────────────────────────
insuranceRouter.get('/claims/:claimId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { claimId } = req.params;
    const db = await database.getClient();

    const result = await db.query(
      `SELECT ic.*, ip.plan_type, ip.policy_number
       FROM insurance_claims ic
       JOIN insurance_policies ip ON ip.id = ic.policy_id
       WHERE ic.id = $1 AND ic.user_id = $2`,
      [claimId, user.id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = result.rows[0];

    const timeline = [
      { step: 'submitted',     label: 'Claim submitted',          done: true },
      { step: 'under_review',  label: 'Under review',             done: ['under_review','approved','paid'].includes(claim.status) },
      { step: 'approved',      label: 'Claim approved',           done: ['approved','paid'].includes(claim.status) },
      { step: 'paid',          label: 'Payment processed',        done: claim.status === 'paid' },
    ];

    res.json({ claim, timeline });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch claim', details: err.message });
  }
});

export default insuranceRouter;
