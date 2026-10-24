/**
 * Safiri Haraka — Complete Payment Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports:
 *  • Auto-fill phone from registration  (default)
 *  • Allow user to change to a different SIM
 *  • M-Pesa STK push
 *  • Airtel Money STK push
 *  • Tigo Pesa STK push
 *  • Halotel push
 *  • Safiri Haraka Wallet (instant)
 *  • QR Code (bus fare, wallet-backed)
 *  • Cash (driver confirms)
 *  • Webhooks for all providers
 *  • Payment status polling
 *  • Receipts
 *  • Transaction history
 *  • Refunds
 *  • P2P Wallet Transfers
 *  • Bill Payments (LUKU, DAWASCO, DSTV, NHIF)
 *  • Admin settlement report
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import database from '../database';

export const paymentsRouter = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATES: Record<string, number> = {
  ride:        0.20,   // Safiri Haraka keeps 20% of ride fare
  food:        0.10,   // 10% on food orders
  shop:        0.15,   // 15% on shop orders
  market:      0.05,   // 5% on university marketplace
  topup:       0.00,   // no fee on top-ups
  transfer:    0.00,   // no Safiri Haraka fee on P2P transfers
  bill:        0.00,   // no Safiri Haraka fee on bill payments
};

const FARE_CONFIG: Record<string, { base: number; per_km: number }> = {
  daladala:  { base: 600,  per_km: 0    },
  bajaji:    { base: 1000, per_km: 300  },
  boda_boda: { base: 800,  per_km: 250  },
  car:       { base: 2000, per_km: 500  },
};

const STK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short unique reference with prefix */
const makeRef = (prefix: string) =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * Normalise any TZ phone number to 255XXXXXXXXX
 * Accepts: 0744123456 / 255744123456 / +255744123456 / 744123456
 */
function normalisePhone(raw: string): string {
  let p = raw.replace(/\D/g, '');
  if (p.startsWith('255')) return p;
  if (p.startsWith('0'))   return '255' + p.slice(1);
  if (p.length === 9)      return '255' + p;
  return p;
}

/** Format phone for display: 0744 *** *** */
function maskPhone(phone: string): string {
  const p = normalisePhone(phone);
  const local = '0' + p.slice(3);          // 0744123456
  return local.slice(0, 4) + ' *** ' + local.slice(-3);
}

/** Auto-detect provider from TZ number */
function detectProvider(phone: string): string | null {
  const p = normalisePhone(phone);
  if (/^255(74|75|76|77|78)/.test(p)) return 'mpesa';
  if (/^255(68|69|78)/.test(p))       return 'airtel_money';
  if (/^255(71|65|67)/.test(p))       return 'tigo_pesa';
  if (/^255(62|61)/.test(p))          return 'halotel';
  return null;
}

/** Provider display names */
const PROVIDER_NAMES: Record<string, string> = {
  mpesa:        'M-Pesa',
  airtel_money: 'Airtel Money',
  tigo_pesa:    'Tigo Pesa',
  halotel:      'Halotel',
  wallet:       'Safiri Haraka Wallet',
  qr_code:      'QR Code',
  cash:         'Cash',
};

/** Calculate fare from vehicle type + distance */
function calcFare(vehicleType: string, distanceMeters: number): number {
  const cfg = FARE_CONFIG[vehicleType] ?? FARE_CONFIG.car;
  return cfg.base + Math.round((distanceMeters / 1000) * cfg.per_km);
}

/** STK push instructions shown while waiting */
function stkInstructions(provider: string, maskedPhone: string, amount: number): string {
  const msgs: Record<string, string> = {
    mpesa:        `A payment request of Sh${amount.toLocaleString()} has been sent to ${maskedPhone}. Open your M-Pesa prompt and enter your PIN to pay.`,
    airtel_money: `A payment request of Sh${amount.toLocaleString()} has been sent to ${maskedPhone}. Open your Airtel Money prompt and enter your PIN to pay.`,
    tigo_pesa:    `A payment request of Sh${amount.toLocaleString()} has been sent to ${maskedPhone}. Open your Tigo Pesa prompt and enter your PIN to pay.`,
    halotel:      `A payment request of Sh${amount.toLocaleString()} has been sent to ${maskedPhone}. Open your Halotel prompt and enter your PIN to pay.`,
  };
  return msgs[provider] ?? `Check your phone and confirm the payment of Sh${amount.toLocaleString()}.`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 0 — GET PAYMENT INFO (auto-fill + available methods)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /payments/info
 * Returns the user's registered phone (auto-fill) + available payment methods.
 * The frontend uses this to pre-populate the payment screen.
 */
paymentsRouter.get('/info', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = await database.getClient();

    // Get user's registered phone + wallet balance
    const userResult = await db.query(
      `SELECT u.phone, u.name,
              COALESCE(w.balance, 0) AS wallet_balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [user.userId]
    );

    db.release();

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { phone, name, wallet_balance } = userResult.rows[0];
    const normalised = normalisePhone(phone);
    const detectedProvider = detectProvider(normalised);

    res.json({
      // Auto-fill data
      registered_phone: normalised,
      masked_phone:     maskPhone(normalised),
      detected_provider: detectedProvider,
      wallet_balance,
      wallet_balance_formatted: `Sh${Number(wallet_balance).toLocaleString()}`,

      // Available payment methods
      payment_methods: [
        {
          method:    'mpesa',
          label:     'M-Pesa',
          icon:      'mpesa',
          available: true,
          recommended: detectedProvider === 'mpesa',
        },
        {
          method:    'airtel_money',
          label:     'Airtel Money',
          icon:      'airtel',
          available: true,
          recommended: detectedProvider === 'airtel_money',
        },
        {
          method:    'tigo_pesa',
          label:     'Tigo Pesa',
          icon:      'tigo',
          available: true,
          recommended: detectedProvider === 'tigo_pesa',
        },
        {
          method:    'halotel',
          label:     'Halotel',
          icon:      'halotel',
          available: true,
          recommended: detectedProvider === 'halotel',
        },
        {
          method:    'wallet',
          label:     `Safiri Haraka Wallet (Sh${Number(wallet_balance).toLocaleString()})`,
          icon:      'wallet',
          available: true,
          balance:   wallet_balance,
        },
        {
          method:    'qr_code',
          label:     'QR Code',
          icon:      'qr',
          available: true,
        },
        {
          method:    'cash',
          label:     'Cash',
          icon:      'cash',
          available: true,
        },
      ],

      // Note to frontend
      note: 'phone is pre-filled from registration. User can tap "Change" to use a different number.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load payment info', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 1 — INITIATE PAYMENT  (single unified endpoint)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /payments/pay
 *
 * Body:
 *  {
 *    amount:      number           — amount in TZS
 *    method:      string           — mpesa | airtel_money | tigo_pesa | halotel | wallet | cash
 *    phone?:      string           — if omitted: use registered phone; if provided: use this number
 *    use_registered_phone?: bool   — explicit flag (default true if phone omitted)
 *    context:     string           — ride | food | shop | market | topup | transfer | bill
 *    context_id?: string           — trip_id / order_id / etc.
 *    description?: string
 *    // transfer context:
 *    to_user_id?: string           — recipient user id
 *    to_phone?:   string           — recipient phone (alternative to to_user_id)
 *    // bill context:
 *    biller_code?:    string       — LUKU | DAWASCO | DSTV | NHIF
 *    account_number?: string       — biller account number
 *  }
 */
paymentsRouter.post('/pay', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const {
    amount,
    method,
    phone: providedPhone,          // optional — if user changed number
    use_registered_phone = !providedPhone,
    context      = 'ride',
    context_id,
    description,
  } = req.body;

  // ── Validate amount
  if (!amount || Number(amount) < 100) {
    return res.status(400).json({ error: 'Amount must be at least Sh100' });
  }

  // ── Validate method
  const validMethods = ['mpesa', 'airtel_money', 'tigo_pesa', 'halotel', 'wallet', 'qr_code', 'cash'];
  if (!method || !validMethods.includes(method)) {
    return res.status(400).json({
      error: `Invalid method. Choose: ${validMethods.join(', ')}`,
    });
  }

  // ── Validate context_id is a valid UUID if provided (context_id column is UUID type)
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (context_id && !UUID_REGEX.test(String(context_id))) {
    return res.status(400).json({ error: 'context_id must be a valid UUID' });
  }

  try {
    const db = await database.getClient();

    // ── Load user's registered phone + name
    const userResult = await db.query(
      `SELECT u.phone, u.name, COALESCE(w.balance, 0) AS wallet_balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [user.userId]
    );

    if (userResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const registeredPhone = userResult.rows[0].phone;
    const walletBalance   = Number(userResult.rows[0].wallet_balance);

    // ── Resolve the phone to use
    let phoneToUse: string;
    let phoneSource: 'registered' | 'user_provided';

    if (use_registered_phone || !providedPhone) {
      // AUTO-FILL: use the number from registration
      phoneToUse  = normalisePhone(registeredPhone);
      phoneSource = 'registered';
    } else {
      // USER CHANGED: use the number they typed
      phoneToUse  = normalisePhone(providedPhone);
      phoneSource = 'user_provided';
    }

    // ── Auto-detect provider if mobile money method
    const mobileMoneyMethods = ['mpesa', 'airtel_money', 'tigo_pesa', 'halotel'];
    if (mobileMoneyMethods.includes(method)) {
      const detected = detectProvider(phoneToUse);
      if (!detected) {
        db.release();
        return res.status(400).json({
          error: 'Could not detect mobile money provider from this phone number. Please check the number.',
          phone: maskPhone(phoneToUse),
        });
      }
      // Warn if the method doesn't match the phone's provider
      if (detected !== method) {
        db.release();
        return res.status(400).json({
          error: `Phone number ${maskPhone(phoneToUse)} belongs to ${PROVIDER_NAMES[detected]}, not ${PROVIDER_NAMES[method]}. Please use the correct method or change your phone number.`,
          detected_provider: detected,
          detected_provider_name: PROVIDER_NAMES[detected],
        });
      }
    }

    const reference  = makeRef(method.toUpperCase().slice(0, 3));
    const txDesc     = description ?? `Safiri Haraka ${context} payment`;

    // ══════════════════════════════════════════════════════════════════════
    //  TRANSFER — P2P wallet to wallet
    // ══════════════════════════════════════════════════════════════════════
    if (context === 'transfer') {
      const { to_user_id, to_phone } = req.body;

      if (!to_user_id && !to_phone) {
        db.release();
        return res.status(400).json({ error: 'to_user_id or to_phone is required for transfer' });
      }

      // Resolve recipient
      let recipientResult: any;
      if (to_user_id) {
        recipientResult = await db.query(
          `SELECT id, name FROM users WHERE id = $1`,
          [to_user_id]
        );
      } else {
        recipientResult = await db.query(
          `SELECT id, name FROM users WHERE phone = $1`,
          [normalisePhone(to_phone)]
        );
      }

      if (recipientResult.rowCount === 0) {
        db.release();
        return res.status(404).json({ error: 'Recipient not found' });
      }

      const recipient = recipientResult.rows[0];

      if (String(recipient.id) === String(user.userId)) {
        db.release();
        return res.status(400).json({ error: 'Cannot transfer to yourself' });
      }

      if (walletBalance < Number(amount)) {
        db.release();
        return res.status(400).json({
          error:    'Insufficient wallet balance',
          required: `Sh${Number(amount).toLocaleString()}`,
          balance:  `Sh${walletBalance.toLocaleString()}`,
        });
      }

      const feeRate   = PLATFORM_FEE_RATES.transfer;   // 0.01
      const fee       = Math.round(Number(amount) * feeRate);
      const netAmount = Number(amount) - fee;

      await db.query(`BEGIN`);
      try {
        // Debit sender (full amount including fee)
        await db.query(
          `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
          [amount, user.userId]
        );

        // Credit recipient (net of fee)
        await db.query(
          `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'TZS')
           ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
          [recipient.id, netAmount]
        );

        // Debit transaction (sender side)
        await db.query(
          `INSERT INTO transactions
             (reference, user_id, context, context_id, amount, type, method, provider, status, description)
           VALUES ($1,$2,'transfer',$3,$4,'debit','wallet','wallet','completed',$5)`,
          [reference, user.userId, String(recipient.id), amount,
           description ?? `Transfer to ${recipient.name}`]
        );

        // Credit transaction (recipient side)
        const creditRef = makeRef('TRC');
        await db.query(
          `INSERT INTO transactions
             (reference, user_id, context, context_id, amount, type, method, provider, status, description)
           VALUES ($1,$2,'transfer',$3,$4,'credit','wallet','wallet','completed',$5)`,
          [creditRef, recipient.id, String(user.userId), netAmount,
           `Received from ${userResult.rows[0].name ?? 'a user'}`]
        );

        // Splits: payee gets netAmount, platform gets fee
        await db.query(
          `INSERT INTO payment_splits (transaction_ref, payee_id, payee_type, amount, status)
           VALUES ($1, $2, 'recipient', $3, 'paid'),
                  ($1, NULL, 'platform', $4, 'pending')`,
          [reference, recipient.id, netAmount, fee]
        );

        await db.query(`COMMIT`);
        db.release();

        return res.json({
          reference,
          status:       'completed',
          method:       'wallet',
          to:           { id: recipient.id, name: recipient.name },
          amount_sent:  `Sh${Number(amount).toLocaleString()}`,
          fee:          `Sh${fee.toLocaleString()}`,
          net_received: `Sh${netAmount.toLocaleString()}`,
          message:      `\u2705 Sh${Number(amount).toLocaleString()} sent to ${recipient.name}`,
          receipt_url:  `/api/v1/payments/receipt/${reference}`,
          poll_url:     null,
        });
      } catch (e) {
        await db.query(`ROLLBACK`);
        db.release();
        throw e;
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  BILL PAYMENT — LUKU, DAWASCO, DSTV, NHIF via STK push
    // ══════════════════════════════════════════════════════════════════════
    if (context === 'bill') {
      const { biller_code, account_number } = req.body;

      const validBillers: Record<string, string> = {
        LUKU:    'Tanzania Electric Supply Co. (LUKU)',
        DAWASCO: 'Dar es Salaam Water & Sewerage',
        DSTV:    'DSTV Subscription',
        NHIF:    'National Health Insurance Fund',
      };

      if (!biller_code || !validBillers[String(biller_code).toUpperCase()]) {
        db.release();
        return res.status(400).json({
          error:         'Invalid biller_code',
          valid_billers: Object.keys(validBillers),
        });
      }
      if (!account_number) {
        db.release();
        return res.status(400).json({ error: 'account_number is required for bill payment' });
      }

      // Bill payments must use mobile money
      if (!mobileMoneyMethods.includes(method)) {
        db.release();
        return res.status(400).json({
          error: 'Bill payments must use a mobile money method (mpesa, airtel_money, tigo_pesa, or halotel)',
        });
      }

      const billerName = validBillers[String(biller_code).toUpperCase()];
      const billDesc   = description ?? `${billerName} — Account: ${account_number}`;

      await db.query(
        `INSERT INTO transactions
           (reference, user_id, context, context_id, amount, type, method, provider,
            phone_number, phone_source, status, description, expires_at)
         VALUES ($1,$2,'bill',$3,$4,'debit','mobile_money',$5,$6,$7,'pending',$8,
                 NOW() + INTERVAL '2 minutes')`,
        [
          reference, user.userId, String(account_number),
          amount, method, phoneToUse, phoneSource, billDesc,
        ]
      );

      db.release();

      await fireStkPush({ method, phone: phoneToUse, amount, reference, description: billDesc });

      return res.json({
        reference,
        status:        'pending',
        method,
        context:       'bill',
        biller_code:   String(biller_code).toUpperCase(),
        biller_name:   billerName,
        account_number,
        provider_name: PROVIDER_NAMES[method],
        phone_used:    maskPhone(phoneToUse),
        phone_source:  phoneSource,
        message:       stkInstructions(method, maskPhone(phoneToUse), amount),
        expires_in_seconds: 120,
        poll_url:      `/api/v1/payments/status/${reference}`,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  WALLET — instant
    // ══════════════════════════════════════════════════════════════════════
    if (method === 'wallet') {
      if (walletBalance < amount) {
        db.release();
        return res.status(400).json({
          error:    `Insufficient wallet balance.`,
          required: `Sh${Number(amount).toLocaleString()}`,
          balance:  `Sh${walletBalance.toLocaleString()}`,
          shortfall:`Sh${(amount - walletBalance).toLocaleString()}`,
          hint:     'Top up your wallet first using mobile money.',
        });
      }

      // Deduct from wallet atomically
      await db.query(`BEGIN`);
      try {
        await db.query(
          `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
          [amount, user.userId]
        );

        // Credit payee (driver / shop owner etc.)
        await creditPayee(db, context, context_id, amount, reference);

        await db.query(
          `INSERT INTO transactions
             (reference, user_id, context, context_id, amount, type, method, provider, status, description)
           VALUES ($1,$2,$3,$4,$5,'debit','wallet','wallet','completed',$6)`,
          [reference, user.userId, context, context_id ?? null, amount, txDesc]
        );

        await db.query(`COMMIT`);
        db.release();

        return res.json({
          reference,
          status:      'completed',
          method:      'wallet',
          phone_used:   null,
          message:     `\u2705 Payment of Sh${Number(amount).toLocaleString()} successful`,
          receipt_url: `/api/v1/payments/receipt/${reference}`,
          poll_url:     null,
        });
      } catch (e) {
        await db.query(`ROLLBACK`);
        db.release();
        throw e;
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CASH — just record it, driver confirms later
    // ══════════════════════════════════════════════════════════════════════
    if (method === 'cash') {
      await db.query(
        `INSERT INTO transactions
           (reference, user_id, context, context_id, amount, type, method, provider, status, description)
         VALUES ($1,$2,$3,$4,$5,'debit','cash','cash','pending_confirmation',$6)`,
        [reference, user.userId, context, context_id ?? null, amount, txDesc]
      );

      db.release();

      return res.json({
        reference,
        status:   'pending_confirmation',
        method:   'cash',
        phone_used: null,
        message:  `Cash payment of Sh${Number(amount).toLocaleString()} recorded. Driver will confirm receipt.`,
        poll_url: `/api/v1/payments/status/${reference}`,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  MOBILE MONEY — STK push
    // ══════════════════════════════════════════════════════════════════════
    if (mobileMoneyMethods.includes(method)) {

      // Record as pending
      await db.query(
        `INSERT INTO transactions
           (reference, user_id, context, context_id, amount, type, method, provider,
            phone_number, phone_source, status, description, expires_at)
         VALUES ($1,$2,$3,$4,$5,'debit','mobile_money',$6,$7,$8,'pending',$9,
                 NOW() + INTERVAL '2 minutes')`,
        [
          reference, user.userId, context, context_id ?? null,
          amount, method, phoneToUse, phoneSource, txDesc,
        ]
      );

      db.release();

      // ── Fire STK push (production: call real API; here: structured ready)
      await fireStkPush({ method, phone: phoneToUse, amount, reference, description: txDesc });

      return res.json({
        reference,
        status:     'pending',
        method,
        provider:   method,
        provider_name: PROVIDER_NAMES[method],
        phone_used: maskPhone(phoneToUse),
        phone_source: phoneSource,
        // If user used registered phone, tell them so. If they changed, confirm the new one.
        phone_note: phoneSource === 'registered'
          ? `Using your registered number ${maskPhone(phoneToUse)}`
          : `Using the number you provided: ${maskPhone(phoneToUse)}`,
        message:    stkInstructions(method, maskPhone(phoneToUse), amount),
        expires_in_seconds: 120,
        poll_url:   `/api/v1/payments/status/${reference}`,
        // Frontend should poll this URL every 3 seconds
      });
    }

    db.release();
    return res.status(400).json({ error: `Method ${method} not handled` });

  } catch (err: any) {
    res.status(500).json({ error: 'Payment initiation failed', details: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  STK Push dispatcher (plug real APIs here per provider)
// ──────────────────────────────────────────────────────────────────────────────
async function fireStkPush(opts: {
  method: string; phone: string; amount: number; reference: string; description: string;
}) {
  const { method, phone, amount, reference, description } = opts;

  /*
   * Each block below is where you plug in the real provider SDK / REST call.
   * The structure is already correct — just replace the comments with real API calls.
   *
   * M-PESA (Vodacom TZ):
   *   POST https://openapi.m-pesa.com/openapi/ipg/v2/vodacomTZN/c2bPayment/singleStage/
   *   Headers: { Authorization: `Bearer ${token}` }
   *   Body:  { input_Amount, input_Country: 'TZN', input_Currency: 'TZS',
   *             input_CustomerMSISDN: phone, input_ServiceProviderCode,
   *             input_ThirdPartyConversationID: reference,
   *             input_TransactionReference: reference,
   *             input_PurchasedItemsDesc: description }
   *
   * AIRTEL MONEY (TZ):
   *   POST https://openapi.airtel.africa/merchant/v1/payments/
   *   Headers: { Authorization: `Bearer ${token}`, X-Country: TZ, X-Currency: TZS }
   *   Body:  { reference, subscriber: { msisdn: phone, country: 'TZ', currency: 'TZS' },
   *             transaction: { amount, country: 'TZ', currency: 'TZS', id: reference } }
   *
   * TIGO PESA:
   *   POST https://secure.tigo.co.tz:8443/v1/tigo/tigo_pesa/b2c/tz/payments/v2
   *   Body:  { MasterMerchant: { Account, Pin }, Subscriber: { Account: phone, Country: TZ, ... },
   *             redirectUri, callbackUri, ... }
   *
   * HALOTEL:
   *   POST https://epg.halotel.co.tz/api/payment
   *   Body:  { merchantCode, msisdn: phone, amount, orderRef: reference, ... }
   */

  console.log(`[STK Push] ${method.toUpperCase()} | Phone: ${phone} | Sh${amount} | Ref: ${reference}`);
  // In production: await the provider API call here and handle errors
}

// ──────────────────────────────────────────────────────────────────────────────
//  Credit payee based on context + record payment_splits
// ──────────────────────────────────────────────────────────────────────────────
async function creditPayee(
  db: any,
  context: string,
  contextId: string | undefined,
  amount: number,
  reference: string
) {
  if (!contextId) return;

  const feeRate    = PLATFORM_FEE_RATES[context] ?? 0.10;
  const payeeAmount = Math.round(amount * (1 - feeRate));
  const platformAmount = amount - payeeAmount;

  // Determine payee type for the split record
  const payeeTypeMap: Record<string, string> = {
    ride:   'driver',
    food:   'vendor',
    shop:   'vendor',
    market: 'seller',
  };
  const payeeType = payeeTypeMap[context] ?? 'vendor';

  let payeeIdQuery: string | null = null;

  if (context === 'ride')   payeeIdQuery = `SELECT driver_id AS payee FROM trips WHERE id = $1`;
  if (context === 'food')   payeeIdQuery = `SELECT owner_id  AS payee FROM restaurants WHERE id = (SELECT restaurant_id FROM food_orders WHERE id = $1)`;
  if (context === 'shop')   payeeIdQuery = `SELECT owner_id  AS payee FROM shops WHERE id = (SELECT shop_id FROM shop_orders WHERE id = $1)`;
  if (context === 'market') payeeIdQuery = `SELECT seller_id AS payee FROM university_orders WHERE id = $1`;

  if (!payeeIdQuery) return;

  const payeeResult = await db.query(payeeIdQuery, [contextId]);
  if (payeeResult.rowCount === 0) return;

  const payeeId = payeeResult.rows[0].payee;
  if (!payeeId) return;

  // Credit payee wallet
  await db.query(
    `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'TZS')
     ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
    [payeeId, payeeAmount]
  );

  // Record payment splits: payee portion + platform portion
  await db.query(
    `INSERT INTO payment_splits (transaction_ref, payee_id, payee_type, amount, status)
     VALUES ($1, $2, $3, $4, 'paid')`,
    [reference, payeeId, payeeType, payeeAmount]
  );
  await db.query(
    `INSERT INTO payment_splits (transaction_ref, payee_id, payee_type, amount, status)
     VALUES ($1, NULL, 'platform', $2, 'pending')`,
    [reference, platformAmount]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 2 — STATUS POLLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /payments/status/:reference
 * Frontend polls this every 3 seconds while showing the "waiting" screen.
 */
paymentsRouter.get('/status/:reference', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { reference } = req.params;

  try {
    const db = await database.getClient();
    const result = await db.query(
      `SELECT status, method, provider, amount, phone_number,
              description, created_at, completed_at, failure_reason, expires_at
       FROM transactions WHERE reference = $1 AND user_id = $2`,
      [reference, user.userId]
    );
    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = result.rows[0];

    // Auto-expire pending transactions past timeout
    const isExpired = tx.status === 'pending' && tx.expires_at && new Date(tx.expires_at) < new Date();

    if (isExpired) {
      // Guard: only expire if still pending — never overwrite a completed/failed status
      await database.query(
        `UPDATE transactions SET status = 'expired' WHERE reference = $1 AND status = 'pending'`,
        [reference]
      );
      tx.status = 'expired';
    }

    const messages: Record<string, string> = {
      pending:              `\u23f3 Waiting for payment on ${maskPhone(tx.phone_number ?? '')}... Enter your PIN to confirm.`,
      completed:            `\u2705 Payment of Sh${Number(tx.amount).toLocaleString()} confirmed!`,
      failed:               `\u274c Payment failed. ${tx.failure_reason ?? 'Please try again.'}`,
      expired:              `\u23f0 Payment timed out. Please try again.`,
      pending_confirmation: `\u23f3 Cash payment recorded. Waiting for driver confirmation.`,
    };

    res.json({
      reference,
      status:      isExpired ? 'expired' : tx.status,
      method:      tx.method,
      provider:    tx.provider,
      amount:      tx.amount,
      phone_used:  tx.phone_number ? maskPhone(tx.phone_number) : null,
      message:     messages[isExpired ? 'expired' : tx.status] ?? '',
      created_at:  tx.created_at,
      completed_at:tx.completed_at,
      receipt_url: tx.status === 'completed' ? `/api/v1/payments/receipt/${reference}` : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check status', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  WEBHOOKS — provider callbacks (no auth, verify via signature)
// ══════════════════════════════════════════════════════════════════════════════

/** Handle completed payment: credit wallet + update trip/order */
async function handlePaymentSuccess(reference: string, providerTxnId: string) {
  const db = await database.getClient();
  try {
    await db.query(`BEGIN`);

    const txResult = await db.query(
      `SELECT * FROM transactions WHERE reference = $1 FOR UPDATE`,
      [reference]
    );

    if (txResult.rowCount === 0) { await db.query(`ROLLBACK`); return; }
    const tx = txResult.rows[0];

    if (tx.status === 'completed') { await db.query(`ROLLBACK`); return; } // already processed

    await db.query(
      `UPDATE transactions SET status = 'completed', provider_txn_id = $1, completed_at = NOW() WHERE reference = $2`,
      [providerTxnId, reference]
    );

    // Credit payee
    await creditPayee(db, tx.context, tx.context_id, tx.amount, reference);

    // If it was a top-up (credit type), add to user wallet
    if (tx.type === 'credit') {
      await db.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,'TZS')
         ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
        [tx.user_id, tx.amount]
      );
    }

    // Mark context as paid
    if (tx.context === 'ride' && tx.context_id) {
      await db.query(
        `UPDATE trips SET payment_status = 'paid', transaction_id = $1 WHERE id = $2`,
        [reference, tx.context_id]
      );
    }
    if (tx.context === 'food' && tx.context_id) {
      await db.query(
        `UPDATE food_orders SET payment_status = 'paid', transaction_id = $1 WHERE id = $2`,
        [reference, tx.context_id]
      );
    }
    if (tx.context === 'shop' && tx.context_id) {
      await db.query(
        `UPDATE shop_orders SET payment_status = 'paid', transaction_id = $1 WHERE id = $2`,
        [reference, tx.context_id]
      );
    }
    if (tx.context === 'market' && tx.context_id) {
      await db.query(
        `UPDATE university_orders SET payment_status = 'paid', transaction_id = $1 WHERE id = $2`,
        [reference, tx.context_id]
      );
    }

    await db.query(`COMMIT`);
  } catch (e) {
    await db.query(`ROLLBACK`);
    throw e;
  } finally {
    db.release();
  }
}

async function handlePaymentFailure(reference: string, reason: string) {
  // Use a client + FOR UPDATE so a concurrent handlePaymentSuccess cannot be
  // overwritten by a duplicate failure callback arriving on a separate connection.
  const db = await database.getClient();
  try {
    await db.query(`BEGIN`);
    const txResult = await db.query(
      `SELECT status FROM transactions WHERE reference = $1 FOR UPDATE`,
      [reference]
    );
    if (txResult.rowCount === 0) { await db.query(`ROLLBACK`); return; }
    if (txResult.rows[0].status === 'completed') {
      // Already completed — never overwrite a success with a failure
      await db.query(`ROLLBACK`);
      return;
    }
    await db.query(
      `UPDATE transactions SET status = 'failed', failure_reason = $1 WHERE reference = $2`,
      [reason, reference]
    );
    await db.query(`COMMIT`);
  } catch (e) {
    await db.query(`ROLLBACK`);
    throw e;
  } finally {
    db.release();
  }
}

// ── Webhook signature guard ───────────────────────────────────────────────────
/**
 * Verifies the webhook request is authentic.
 *
 * CURRENT BEHAVIOUR:
 *  - In production (NODE_ENV=production): WEBHOOK_SECRET MUST be set; missing = fail-closed (401).
 *  - In dev/staging: if WEBHOOK_SECRET is not set, allow with a console warning.
 *  - If WEBHOOK_SECRET is set in any env, it is compared as a plain string for now.
 *
 * TODO — per-provider HMAC-SHA256 verification:
 *
 *  M-Pesa (Vodacom TZ):
 *    Provider signs the callback body with HMAC-SHA256 using the API key as the secret.
 *    Header: X-Signature (or X-Mpesa-Signature, confirm in your Vodacom TZ developer portal).
 *    Compute: crypto.createHmac('sha256', process.env.MPESA_API_KEY!).update(rawBody).digest('hex')
 *    Compare constant-time: crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(header))
 *    Requires: MPESA_API_KEY env var + express raw body buffer (use express.raw() before this router).
 *
 *  Airtel Money:
 *    Signs with HMAC-SHA256 using the client secret.
 *    Header: X-Signature
 *    Compute: crypto.createHmac('sha256', process.env.AIRTEL_CLIENT_SECRET!).update(rawBody).digest('hex')
 *    Requires: AIRTEL_CLIENT_SECRET env var.
 *
 *  Tigo Pesa:
 *    Uses a shared secret passed as a header field. Upgrade to HMAC once Tigo provides documentation.
 *    Header: X-Tigo-Token (confirm in Tigo Pesa developer portal).
 *    Compute: HMAC-SHA256 with process.env.TIGO_SECRET
 *    Requires: TIGO_SECRET env var.
 *
 *  Halotel:
 *    Uses a merchantCode + HMAC. Confirm exact scheme in the Halotel EPG documentation.
 *    Header: X-Halotel-Signature
 *    Compute: HMAC-SHA256 with process.env.HALOTEL_SECRET
 *    Requires: HALOTEL_SECRET env var.
 *
 * Until HMAC is implemented, WEBHOOK_SECRET acts as a shared bearer token —
 * still better than nothing, but rotate it frequently.
 */
function verifyWebhookSecret(req: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      // Fail-closed in production: never process an unauthenticated webhook callback.
      console.error('[Webhook] WEBHOOK_SECRET is not set in production — rejecting request. Set WEBHOOK_SECRET in your environment.');
      return false;
    }
    // Dev/staging: allow with warning so local testing works without env var.
    console.warn('[Webhook] WEBHOOK_SECRET not set — skipping signature check (set it in production)');
    return true;
  }

  const provided = req.headers['x-webhook-secret'];
  // TODO: replace with per-provider HMAC verification (see comments above).
  return provided === secret;
}

// ── M-Pesa webhook ────────────────────────────────────────────────────────────
paymentsRouter.post('/webhooks/mpesa', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    // Vodacom TZ callback structure
    const reference   = req.body?.output_ThirdPartyConversationID ?? req.body?.reference;
    const resultCode  = req.body?.output_ResponseCode ?? req.body?.resultCode;
    const txnId       = req.body?.output_TransactionID ?? req.body?.transactionId;
    const reason      = req.body?.output_ResponseDesc ?? 'Payment declined';

    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    if (resultCode === 'INS-0' || resultCode === '0') {
      await handlePaymentSuccess(reference, txnId);
    } else {
      await handlePaymentFailure(reference, reason);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('[Webhook M-Pesa]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// ── Airtel Money webhook ──────────────────────────────────────────────────────
paymentsRouter.post('/webhooks/airtel', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    const reference = req.body?.transaction?.id ?? req.body?.reference;
    const status    = req.body?.transaction?.status;
    const txnId     = req.body?.transaction?.airtel_money_id ?? req.body?.transactionId;

    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    if (status === 'TS') {
      await handlePaymentSuccess(reference, txnId);
    } else {
      await handlePaymentFailure(reference, 'Airtel Money payment declined');
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Webhook Airtel]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// ── Tigo Pesa webhook ─────────────────────────────────────────────────────────
paymentsRouter.post('/webhooks/tigo', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    const reference = req.body?.MasterMerchant?.ReceivedTxnId ?? req.body?.reference;
    const status    = req.body?.Status ?? req.body?.status;
    const txnId     = req.body?.TxnId ?? req.body?.transactionId;

    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    if (status === 'success' || status === 'APPROVED') {
      await handlePaymentSuccess(reference, txnId);
    } else {
      await handlePaymentFailure(reference, 'Tigo Pesa payment declined');
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Webhook Tigo]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// ── Halotel webhook ───────────────────────────────────────────────────────────
paymentsRouter.post('/webhooks/halotel', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    const reference = req.body?.reference ?? req.body?.transactionRef;
    const success   = req.body?.status === 'SUCCESS';
    const txnId     = req.body?.transactionId;

    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    if (success) {
      await handlePaymentSuccess(reference, txnId);
    } else {
      await handlePaymentFailure(reference, 'Halotel payment declined');
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Webhook Halotel]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// ── Cash confirmation (driver confirms cash received) ─────────────────────────
paymentsRouter.post('/cash/confirm/:reference', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { reference } = req.params;

  try {
    const db = await database.getClient();
    const result = await db.query(
      `SELECT t.*, tr.driver_id FROM transactions t
       LEFT JOIN trips tr ON tr.id = t.context_id
       WHERE t.reference = $1 AND t.method = 'cash' AND t.status = 'pending_confirmation'`,
      [reference]
    );

    if (result.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Cash transaction not found' });
    }

    const tx = result.rows[0];

    // Only the assigned driver can confirm cash
    if (tx.driver_id && tx.driver_id !== user.userId) {
      db.release();
      return res.status(403).json({ error: 'Only the assigned driver can confirm cash payment' });
    }

    await db.query(
      `UPDATE transactions SET status = 'completed', completed_at = NOW() WHERE reference = $1`,
      [reference]
    );

    if (tx.context_id) {
      await db.query(
        `UPDATE trips SET payment_status = 'paid', transaction_id = $1 WHERE id = $2`,
        [reference, tx.context_id]
      );
    }

    db.release();

    res.json({
      message: `Cash payment of Sh${Number(tx.amount).toLocaleString()} confirmed`,
      reference,
      status: 'completed',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to confirm cash', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  QR CODE PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

/** POST /payments/qr/generate — driver generates bus fare QR */
paymentsRouter.post('/qr/generate', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { vehicle_type = 'daladala', route_id, amount } = req.body;
  const fareAmount = amount ?? calcFare(vehicle_type, 0);

  const token     = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  const reference = makeRef('QR');

  try {
    const db = await database.getClient();
    await db.query(
      `INSERT INTO qr_payment_tokens
         (token, driver_id, route_id, amount, vehicle_type, expires_at, reference, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [token, user.userId, route_id ?? null, fareAmount, vehicle_type, expiresAt, reference]
    );
    db.release();

    // This JSON is what gets encoded into the QR image on the frontend
    const qrData = JSON.stringify({
      type:      'safiriharaka_payment',
      version:   1,
      token,
      amount:    fareAmount,
      currency:  'TZS',
      driver_id: user.userId,
      expires:   expiresAt.toISOString(),
    });

    res.json({
      token,
      reference,
      qr_data:    qrData,
      amount:     fareAmount,
      formatted:  `Sh${fareAmount.toLocaleString()}`,
      expires_at: expiresAt,
      message:    `Show this QR to passenger. Valid 5 minutes. Sh${fareAmount.toLocaleString()}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'QR generation failed', details: err.message });
  }
});

/** POST /payments/qr/pay — passenger scans QR, wallet pays instantly */
paymentsRouter.post('/qr/pay', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  try {
    const db = await database.getClient();

    const tokenResult = await db.query(
      `SELECT * FROM qr_payment_tokens WHERE token = $1 AND status = 'active' AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rowCount === 0) {
      db.release();
      return res.status(400).json({ error: 'QR code is invalid or expired. Ask driver to regenerate.' });
    }

    const qr = tokenResult.rows[0];

    const reference = makeRef('QRP');

    // Lock wallet row INSIDE the transaction to prevent TOCTOU race on concurrent scans
    await db.query(`BEGIN`);
    try {
      // Check wallet balance with row lock inside transaction
      const walletResult = await db.query(
        `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [user.userId]
      );

      const balance = Number(walletResult.rows[0]?.balance ?? 0);
      if (balance < qr.amount) {
        await db.query(`ROLLBACK`);
        db.release();
        return res.status(400).json({
          error:    `Insufficient wallet balance.`,
          required: `Sh${Number(qr.amount).toLocaleString()}`,
          balance:  `Sh${balance.toLocaleString()}`,
          shortfall:`Sh${(qr.amount - balance).toLocaleString()}`,
          hint:     'Top up your wallet first using mobile money.',
        });
      }
      // Debit passenger
      await db.query(`UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`, [qr.amount, user.userId]);

      // Credit driver using the same fee rate as regular ride payments
      const driverShare = Math.round(qr.amount * (1 - PLATFORM_FEE_RATES.ride));
      const platformShare = qr.amount - driverShare;

      await db.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,'TZS')
         ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
        [qr.driver_id, driverShare]
      );

      await db.query(
        `INSERT INTO transactions
           (reference, user_id, context, amount, type, method, provider, status, description)
         VALUES ($1,$2,'ride',$3,'debit','qr_code','wallet','completed','Bus fare — QR payment')`,
        [reference, user.userId, qr.amount]
      );

      // Record payment_splits (same pattern as creditPayee)
      await db.query(
        `INSERT INTO payment_splits (transaction_ref, payee_id, payee_type, amount, status)
         VALUES ($1, $2, 'driver', $3, 'paid')`,
        [reference, qr.driver_id, driverShare]
      );
      await db.query(
        `INSERT INTO payment_splits (transaction_ref, payee_id, payee_type, amount, status)
         VALUES ($1, NULL, 'platform', $2, 'pending')`,
        [reference, platformShare]
      );

      await db.query(
        `UPDATE qr_payment_tokens SET status = 'used', used_at = NOW(), used_by = $1 WHERE token = $2`,
        [user.userId, token]
      );

      await db.query(`COMMIT`);
      db.release();

      return res.json({
        reference,
        status:  'completed',
        amount:  qr.amount,
        message: `\u2705 Bus fare Sh${Number(qr.amount).toLocaleString()} paid`,
        receipt_url: `/api/v1/payments/receipt/${reference}`,
      });
    } catch (e) {
      await db.query(`ROLLBACK`);
      db.release();
      throw e;
    }
  } catch (err: any) {
    res.status(500).json({ error: 'QR payment failed', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  WALLET TOP-UP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /payments/wallet/topup
 * Initiates a mobile money STK push to credit the wallet.
 * Uses same auto-fill / change logic.
 */
paymentsRouter.post('/wallet/topup', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, phone: providedPhone, use_registered_phone = !providedPhone } = req.body;

  if (!amount || Number(amount) < 500) {
    return res.status(400).json({ error: 'Minimum top-up is Sh500' });
  }

  // Resolve phone
  try {
    const db = await database.getClient();

    const userResult = await db.query(`SELECT phone FROM users WHERE id = $1`, [user.userId]);
    if (userResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const registeredPhone = userResult.rows[0].phone;
    const phoneToUse = (use_registered_phone || !providedPhone)
      ? normalisePhone(registeredPhone)
      : normalisePhone(providedPhone);

    const provider = detectProvider(phoneToUse);
    if (!provider) {
      db.release();
      return res.status(400).json({ error: 'Could not detect provider. Check phone number.' });
    }

    const reference = makeRef('TOP');
    // INSERT and STK push share the same client — ensures the row exists
    // before the push fires and the provider webhook can call back.
    await db.query(
      `INSERT INTO transactions
         (reference, user_id, context, amount, type, method, provider,
          phone_number, phone_source, status, description, expires_at)
       VALUES ($1,$2,'topup',$3,'credit','mobile_money',$4,$5,$6,'pending',
               'Wallet top-up', NOW() + INTERVAL '2 minutes')`,
      [
        reference, user.userId, amount, provider, phoneToUse,
        (use_registered_phone || !providedPhone) ? 'registered' : 'user_provided',
      ]
    );
    db.release();

    await fireStkPush({ method: provider, phone: phoneToUse, amount, reference, description: 'Safiri Haraka Wallet Top-up' });

    return res.json({
      reference,
      status:      'pending',
      provider,
      provider_name: PROVIDER_NAMES[provider],
      phone_used:  maskPhone(phoneToUse),
      message:     stkInstructions(provider, maskPhone(phoneToUse), amount),
      expires_in_seconds: 120,
      poll_url:    `/api/v1/payments/status/${reference}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Top-up failed', details: err.message });
  }
});

/** GET /payments/wallet — wallet balance */
paymentsRouter.get('/wallet', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = await database.getClient();

    await db.query(
      `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,0,'TZS') ON CONFLICT (user_id) DO NOTHING`,
      [user.userId]
    );

    const result = await db.query(
      `SELECT w.balance, w.currency,
              (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=$1 AND type='credit' AND status='completed') AS total_in,
              (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=$1 AND type='debit'  AND status='completed') AS total_out
       FROM wallets w WHERE w.user_id = $1`,
      [user.userId]
    );

    db.release();
    const w = result.rows[0];

    res.json({
      balance:           w.balance,
      balance_formatted: `Sh${Number(w.balance).toLocaleString()}`,
      currency:          w.currency,
      total_in:          w.total_in,
      total_out:         w.total_out,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load wallet', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  RECEIPT
// ══════════════════════════════════════════════════════════════════════════════

paymentsRouter.get('/receipt/:reference', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { reference } = req.params;

  try {
    const db = await database.getClient();
    const result = await db.query(
      `SELECT t.*,
              u.name AS payer_name, u.phone AS payer_phone
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.reference = $1 AND t.user_id = $2`,
      [reference, user.userId]
    );
    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const tx = result.rows[0];

    res.json({
      receipt: {
        reference:        tx.reference,
        date:             tx.completed_at ?? tx.created_at,
        description:      tx.description,
        amount:           `Sh${Number(tx.amount).toLocaleString()}`,
        method:           PROVIDER_NAMES[tx.provider] ?? tx.provider,
        phone_used:       tx.phone_number ? maskPhone(tx.phone_number) : 'Wallet',
        status:           tx.status,
        provider_txn_id:  tx.provider_txn_id,
        payer:            { name: tx.payer_name, phone: maskPhone(tx.payer_phone) },
        context:          tx.context,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get receipt', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION HISTORY
// ══════════════════════════════════════════════════════════════════════════════

paymentsRouter.get('/history', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { page = 1, limit = 20, type, method, status, from, to } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const db = await database.getClient();
    let q = `SELECT * FROM transactions WHERE user_id = $1`;
    const p: any[] = [user.userId];

    if (type)   { p.push(type);   q += ` AND type   = $${p.length}`; }
    if (method) { p.push(method); q += ` AND method  = $${p.length}`; }
    if (status) { p.push(status); q += ` AND status  = $${p.length}`; }
    if (from)   { p.push(from);   q += ` AND created_at >= $${p.length}`; }
    if (to)     { p.push(to);     q += ` AND created_at <= $${p.length}`; }

    p.push(Number(limit), offset);
    q += ` ORDER BY created_at DESC LIMIT $${p.length - 1} OFFSET $${p.length}`;

    const result = await db.query(q, p);
    const totalResult = await db.query(
      `SELECT COUNT(*) AS total FROM transactions WHERE user_id = $1`, [user.userId]
    );
    db.release();

    res.json({
      transactions: result.rows.map(tx => ({
        ...tx,
        amount_formatted: `Sh${Number(tx.amount).toLocaleString()}`,
        provider_name:    PROVIDER_NAMES[tx.provider] ?? tx.provider,
        phone_masked:     tx.phone_number ? maskPhone(tx.phone_number) : null,
      })),
      page:  Number(page),
      limit: Number(limit),
      total: Number(totalResult.rows[0].total),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  REFUND (user self-service)
// ══════════════════════════════════════════════════════════════════════════════

paymentsRouter.post('/refund', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { reference, reason } = req.body;
  if (!reference || !reason) {
    return res.status(400).json({ error: 'reference and reason are required' });
  }

  try {
    const db = await database.getClient();
    const txResult = await db.query(
      `SELECT * FROM transactions WHERE reference = $1 AND user_id = $2`,
      [reference, user.userId]
    );

    if (txResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.status !== 'completed') {
      db.release();
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }
    if (tx.refunded) {
      db.release();
      return res.status(400).json({ error: 'Already refunded' });
    }

    // 7-day self-service refund window
    const completedAt = tx.completed_at ? new Date(tx.completed_at) : null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (!completedAt || completedAt < sevenDaysAgo) {
      db.release();
      return res.status(400).json({
        error: 'Refund window expired (7 days after payment)',
        completed_at: tx.completed_at,
      });
    }

    const refundRef = makeRef('RFD');

    await db.query(`BEGIN`);
    // Credit payer wallet
    await db.query(
      `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
      [tx.amount, user.userId]
    );
    // Reverse payee credit: debit the payee's share back from their wallet
    // Only applies to contexts where creditPayee() ran (ride/food/shop/market)
    const creditableContexts = ['ride', 'food', 'shop', 'market'];
    if (creditableContexts.includes(tx.context)) {
      const feeRate = PLATFORM_FEE_RATES[tx.context] ?? 0.10;
      const payeeShare = Math.round(tx.amount * (1 - feeRate));
      await db.query(
        `UPDATE payment_splits
         SET status = 'reversed'
         WHERE transaction_ref = $1 AND payee_type != 'platform'`,
        [tx.reference]
      );
      // Debit payee wallet for their share (best-effort: ignore if wallet gone)
      await db.query(
        `UPDATE wallets w
         SET balance = GREATEST(0, balance - $1)
         FROM payment_splits ps
         WHERE ps.transaction_ref = $2 AND ps.payee_type != 'platform'
           AND ps.payee_id = w.user_id`,
        [payeeShare, tx.reference]
      );
    }
    await db.query(
      `UPDATE transactions SET refunded = true, refund_reference = $1, refund_reason = $2 WHERE reference = $3`,
      [refundRef, reason, reference]
    );
    await db.query(
      `INSERT INTO transactions
         (reference, user_id, context, amount, type, method, provider, status, description)
       VALUES ($1,$2,$3,$4,'credit','refund','wallet','completed',$5)`,
      [refundRef, user.userId, tx.context, tx.amount, `Refund: ${reason}`]
    );
    await db.query(`COMMIT`);
    db.release();

    res.json({
      message:          `\u2705 Refund of Sh${Number(tx.amount).toLocaleString()} sent to your wallet`,
      refund_reference: refundRef,
      amount:           `Sh${Number(tx.amount).toLocaleString()}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Refund failed', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN REFUND  (admin can refund any user's completed transaction)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /payments/admin/refund
 * Admin only. Refunds any completed transaction, crediting the original payer's wallet.
 *
 * Body: { reference: string, reason: string }
 */
paymentsRouter.post('/admin/refund', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if ((req as any).user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { reference, reason } = req.body;
  if (!reference || !reason) {
    return res.status(400).json({ error: 'reference and reason are required' });
  }

  try {
    const db = await database.getClient();

    // No user_id filter — admin can refund any transaction
    const txResult = await db.query(
      `SELECT * FROM transactions WHERE reference = $1`,
      [reference]
    );

    if (txResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.status !== 'completed') {
      db.release();
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }
    if (tx.refunded) {
      db.release();
      return res.status(400).json({ error: 'Already refunded' });
    }

    const refundRef = makeRef('ARFD');

    await db.query(`BEGIN`);
    // Credit original payer's wallet
    await db.query(
      `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'TZS')
       ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
      [tx.user_id, tx.amount]
    );
    await db.query(
      `UPDATE transactions
       SET refunded = true, refund_reference = $1, refund_reason = $2
       WHERE reference = $3`,
      [refundRef, reason, reference]
    );
    await db.query(
      `INSERT INTO transactions
         (reference, user_id, context, amount, type, method, provider, status, description)
       VALUES ($1,$2,$3,$4,'credit','refund','wallet','completed',$5)`,
      [refundRef, tx.user_id, tx.context, tx.amount, `Admin refund: ${reason}`]
    );
    await db.query(`COMMIT`);
    db.release();

    res.json({
      message:             `\u2705 Admin refund of Sh${Number(tx.amount).toLocaleString()} issued`,
      refund_reference:    refundRef,
      original_reference:  reference,
      refunded_user_id:    tx.user_id,
      amount:              `Sh${Number(tx.amount).toLocaleString()}`,
      reason,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Admin refund failed', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN SETTLEMENT REPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /payments/admin/report
 * Admin only. Query params: from, to (ISO dates, optional).
 *
 * Returns:
 *  - total_volume: sum of completed debit transactions in range
 *  - by_context: { ride: {count, volume}, food: {count, volume}, ... }
 *  - by_method: { mpesa: {count, volume}, wallet: {count, volume}, ... }
 *  - pending_splits: count of payment_splits where status='pending'
 *  - total_platform_fees: sum of payment_splits where payee_type='platform'
 *  - recent_transactions: last 20 transactions with user name
 */
paymentsRouter.get('/admin/report', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if ((req as any).user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { from, to } = req.query;

  try {
    const db = await database.getClient();

    // Build date filter params
    const dateParams: any[] = [];
    let dateFilter = '';
    if (from && to) {
      dateParams.push(from, to);
      dateFilter = `AND t.created_at BETWEEN $1 AND $2`;
    } else if (from) {
      dateParams.push(from);
      dateFilter = `AND t.created_at >= $1`;
    } else if (to) {
      dateParams.push(to);
      dateFilter = `AND t.created_at <= $1`;
    }

    // Total volume (completed debits)
    const totalResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_volume,
              COUNT(*) AS total_count
       FROM transactions t
       WHERE type = 'debit' AND status = 'completed' ${dateFilter}`,
      dateParams
    );

    // Volume by context
    const byContextResult = await db.query(
      `SELECT context,
              COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS volume
       FROM transactions t
       WHERE type = 'debit' AND status = 'completed' ${dateFilter}
       GROUP BY context
       ORDER BY volume DESC`,
      dateParams
    );

    // Volume by method
    const byMethodResult = await db.query(
      `SELECT provider AS method,
              COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS volume
       FROM transactions t
       WHERE type = 'debit' AND status = 'completed' ${dateFilter}
       GROUP BY provider
       ORDER BY volume DESC`,
      dateParams
    );

    // Pending splits
    const pendingSplitsResult = await db.query(
      `SELECT COUNT(*) AS pending_count,
              COALESCE(SUM(amount), 0) AS pending_amount
       FROM payment_splits
       WHERE status = 'pending'`
    );

    // Platform fees
    const platformFeesResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_platform_fees
       FROM payment_splits
       WHERE payee_type = 'platform'`
    );

    // Recent transactions with user name (phone fetched only for masking, not exposed raw)
    const recentResult = await db.query(
      `SELECT t.reference, t.context, t.amount, t.type, t.method, t.provider,
              t.status, t.created_at, t.completed_at,
              u.name AS user_name, u.phone AS user_phone
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT 20`
    );

    db.release();

    res.json({
      report_period: {
        from: from ?? 'all time',
        to:   to   ?? 'now',
      },
      total_volume:       Number(totalResult.rows[0].total_volume),
      total_volume_formatted: `Sh${Number(totalResult.rows[0].total_volume).toLocaleString()}`,
      total_count:        Number(totalResult.rows[0].total_count),
      by_context:         byContextResult.rows.map(r => ({
        context: r.context,
        count:   Number(r.count),
        volume:  Number(r.volume),
        volume_formatted: `Sh${Number(r.volume).toLocaleString()}`,
      })),
      by_method:          byMethodResult.rows.map(r => ({
        method:  r.method,
        count:   Number(r.count),
        volume:  Number(r.volume),
        volume_formatted: `Sh${Number(r.volume).toLocaleString()}`,
      })),
      pending_splits: {
        count:  Number(pendingSplitsResult.rows[0].pending_count),
        amount: Number(pendingSplitsResult.rows[0].pending_amount),
        amount_formatted: `Sh${Number(pendingSplitsResult.rows[0].pending_amount).toLocaleString()}`,
      },
      total_platform_fees:           Number(platformFeesResult.rows[0].total_platform_fees),
      total_platform_fees_formatted: `Sh${Number(platformFeesResult.rows[0].total_platform_fees).toLocaleString()}`,
      recent_transactions: recentResult.rows.map(tx => ({
        reference:        tx.reference,
        context:          tx.context,
        amount:           tx.amount,
        amount_formatted: `Sh${Number(tx.amount).toLocaleString()}`,
        type:             tx.type,
        method:           tx.method,
        provider:         tx.provider,
        status:           tx.status,
        created_at:       tx.created_at,
        completed_at:     tx.completed_at,
        user_name:        tx.user_name,
        user_phone_masked: maskPhone(tx.user_phone ?? ''),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT METHODS — user preference CRUD
//  The platform derives the provider from the user's phone number. These
//  endpoints let a user read, set, and clear their preferred_payment column.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /payments/methods
 * Returns the user's phone-derived payment methods plus their stored preference.
 */
paymentsRouter.get('/methods', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = await database.getClient();
    const result = await db.query(
      `SELECT phone, preferred_payment FROM users WHERE id = $1`,
      [user.userId]
    );
    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { phone, preferred_payment } = result.rows[0];
    const normalised = normalisePhone(phone);
    const detectedProvider = detectProvider(normalised);

    // Build a method entry for the phone-detected provider
    const methods: Array<{ provider: string; label: string; phone: string; is_preferred: boolean }> = [];

    if (detectedProvider) {
      methods.push({
        provider:     detectedProvider,
        label:        PROVIDER_NAMES[detectedProvider] ?? detectedProvider,
        phone:        maskPhone(normalised),
        is_preferred: preferred_payment === detectedProvider,
      });
    }

    // Always include wallet as an available method
    methods.push({
      provider:     'wallet',
      label:        PROVIDER_NAMES['wallet'],
      phone:        '',
      is_preferred: preferred_payment === 'wallet',
    });

    res.json({
      methods,
      preferred_payment: preferred_payment ?? detectedProvider ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load payment methods', details: err.message });
  }
});

/**
 * POST /payments/methods
 * Body: { provider: string }
 * Stores the user's preferred payment method in users.preferred_payment.
 * Adds the column with ALTER TABLE IF NOT EXISTS (idempotent).
 */
paymentsRouter.post('/methods', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { provider } = req.body;
  const validProviders = ['mpesa', 'airtel_money', 'tigo_pesa', 'halotel', 'wallet', 'cash'];
  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({
      error: `Invalid provider. Choose: ${validProviders.join(', ')}`,
    });
  }

  try {
    const db = await database.getClient();

    // Ensure the column exists (idempotent — safe to run multiple times)
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_payment VARCHAR(50)`
    );

    await db.query(
      `UPDATE users SET preferred_payment = $1 WHERE id = $2`,
      [provider, user.userId]
    );
    db.release();

    res.json({
      message: 'Preferred payment method saved',
      preferred_payment: provider,
      label: PROVIDER_NAMES[provider] ?? provider,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save payment method', details: err.message });
  }
});

/**
 * DELETE /payments/methods/:provider
 * Clears preferred_payment if it currently matches the given provider.
 */
paymentsRouter.delete('/methods/:provider', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { provider } = req.params;

  try {
    const db = await database.getClient();

    // Ensure the column exists before we try to read/write it
    await db.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_payment VARCHAR(50)`
    );

    const result = await db.query(
      `SELECT preferred_payment FROM users WHERE id = $1`,
      [user.userId]
    );

    if (result.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const current = result.rows[0].preferred_payment;

    if (current === provider) {
      await db.query(
        `UPDATE users SET preferred_payment = NULL WHERE id = $1`,
        [user.userId]
      );
      db.release();
      return res.json({ message: 'Preferred payment method cleared' });
    }

    db.release();
    res.json({ message: 'No change — provider was not the active preference', current });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete payment method', details: err.message });
  }
});

export default paymentsRouter;

