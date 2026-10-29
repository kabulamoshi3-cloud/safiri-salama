/**
 * Money Transfer API Routes
 * Peer-to-peer transfers, mobile money top-up/withdrawal,
 * and bill payments via SkyRex wallet.
 */

import express, { Request, Response } from 'express';
import { database } from '../database';

export const moneyTransferRouter = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type TransferType = 'wallet_to_wallet' | 'wallet_to_mobile' | 'mobile_to_wallet' | 'bill_payment';
type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
type MobileProvider = 'mpesa' | 'airtel_money' | 'tigo_pesa' | 'halotel';

interface TransferRequest {
  recipient_phone?: string;
  recipient_user_id?: string;
  amount: number;
  transfer_type: TransferType;
  mobile_provider?: MobileProvider;
  note?: string;
  pin: string;
}

// ─── GET /wallet — get wallet balance ─────────────────────────────────────────
moneyTransferRouter.get('/wallet', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT w.balance, w.currency, w.is_locked,
              (SELECT SUM(amount) FROM money_transfers WHERE sender_id = $1 AND status = 'completed') AS total_sent,
              (SELECT SUM(amount) FROM money_transfers WHERE recipient_id = $1 AND status = 'completed') AS total_received
       FROM wallets w WHERE w.user_id = $1`,
      [user.id]
    );
    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ wallet: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch wallet', details: err.message });
  }
});

// ─── POST /send — send money to another user ─────────────────────────────────
moneyTransferRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { recipient_phone, recipient_user_id, amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (amount < 500) {
      return res.status(400).json({ error: 'Minimum transfer amount is Sh500' });
    }
    if (!recipient_phone && !recipient_user_id) {
      return res.status(400).json({ error: 'Provide recipient_phone or recipient_user_id' });
    }

    const db = await database.getClient();

    // Find recipient
    const recipientQuery = recipient_user_id
      ? `SELECT id, name, phone FROM users WHERE id = $1`
      : `SELECT id, name, phone FROM users WHERE phone = $1`;
    const recipientResult = await db.query(recipientQuery, [recipient_user_id || recipient_phone]);

    if (recipientResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Recipient not found on SkyRex' });
    }

    const recipient = recipientResult.rows[0];

    if (recipient.id === user.id) {
      db.release();
      return res.status(400).json({ error: 'Cannot send money to yourself' });
    }

    // Check sender balance
    const walletResult = await db.query(
      `SELECT balance, is_locked FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [user.id]
    );

    if (walletResult.rowCount === 0 || walletResult.rows[0].is_locked) {
      db.release();
      return res.status(400).json({ error: 'Wallet not available or locked' });
    }

    const senderBalance: number = walletResult.rows[0].balance;
    const fee = Math.max(100, Math.floor(amount * 0.005)); // 0.5% fee, min Sh100
    const totalDeduction = amount + fee;

    if (senderBalance < totalDeduction) {
      db.release();
      return res.status(400).json({
        error: `Insufficient balance. Need Sh${totalDeduction.toLocaleString()} (Sh${amount.toLocaleString()} + Sh${fee.toLocaleString()} fee). Your balance: Sh${senderBalance.toLocaleString()}`,
      });
    }

    const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    // Debit sender
    await db.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
      [totalDeduction, user.id]
    );

    // Credit recipient
    await db.query(
      `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
      [amount, recipient.id]
    );

    // Record transfer
    const transferResult = await db.query(
      `INSERT INTO money_transfers
         (reference, sender_id, recipient_id, amount, fee, transfer_type, note, status)
       VALUES ($1,$2,$3,$4,$5,'wallet_to_wallet',$6,'completed')
       RETURNING *`,
      [reference, user.id, recipient.id, amount, fee, note]
    );

    db.release();

    res.status(201).json({
      message: `Sh${amount.toLocaleString()} sent to ${recipient.name}`,
      transfer: transferResult.rows[0],
      breakdown: {
        amount_sent: `Sh${amount.toLocaleString()}`,
        fee: `Sh${fee.toLocaleString()}`,
        total_deducted: `Sh${totalDeduction.toLocaleString()}`,
        reference,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Transfer failed', details: err.message });
  }
});

// ─── POST /withdraw — withdraw to mobile money ───────────────────────────────
moneyTransferRouter.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, mobile_provider, phone_number } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: 'Minimum withdrawal is Sh1,000' });
    }
    if (!mobile_provider || !phone_number) {
      return res.status(400).json({ error: 'mobile_provider and phone_number are required' });
    }

    const providerNames: Record<string, string> = {
      mpesa: 'M-Pesa', airtel_money: 'Airtel Money',
      tigo_pesa: 'Tigo Pesa', halotel: 'Halotel',
    };

    if (!providerNames[mobile_provider]) {
      return res.status(400).json({ error: `Invalid provider. Use: ${Object.keys(providerNames).join(', ')}` });
    }

    const db = await database.getClient();

    const walletResult = await db.query(
      `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [user.id]
    );

    if (walletResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const fee = Math.max(200, Math.floor(amount * 0.01)); // 1% fee, min Sh200
    const totalDeduction = amount + fee;
    const balance: number = walletResult.rows[0].balance;

    if (balance < totalDeduction) {
      db.release();
      return res.status(400).json({
        error: `Insufficient balance. Need Sh${totalDeduction.toLocaleString()} (amount + Sh${fee.toLocaleString()} fee)`,
      });
    }

    await db.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
      [totalDeduction, user.id]
    );

    const reference = `WDR-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    await db.query(
      `INSERT INTO money_transfers
         (reference, sender_id, amount, fee, transfer_type, mobile_provider, mobile_number, status)
       VALUES ($1,$2,$3,$4,'wallet_to_mobile',$5,$6,'processing')`,
      [reference, user.id, amount, fee, mobile_provider, phone_number]
    );

    db.release();

    res.json({
      message: `Withdrawal of Sh${amount.toLocaleString()} to ${providerNames[mobile_provider]} initiated`,
      reference,
      estimated_time: '2–5 minutes',
      breakdown: {
        amount: `Sh${amount.toLocaleString()}`,
        fee: `Sh${fee.toLocaleString()}`,
        total: `Sh${totalDeduction.toLocaleString()}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Withdrawal failed', details: err.message });
  }
});

// ─── POST /topup — top up wallet from mobile money ───────────────────────────
moneyTransferRouter.post('/topup', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, mobile_provider, phone_number } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: 'Minimum top-up is Sh1,000' });
    }
    if (!mobile_provider || !phone_number) {
      return res.status(400).json({ error: 'mobile_provider and phone_number are required' });
    }

    const reference = `TOP-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const db = await database.getClient();

    // In production: call mobile money API (M-Pesa STK push, Airtel API, etc.)
    // For now: record as pending and simulate success
    await db.query(
      `INSERT INTO money_transfers
         (reference, recipient_id, amount, fee, transfer_type, mobile_provider, mobile_number, status)
       VALUES ($1,$2,$3,0,'mobile_to_wallet',$4,$5,'pending')`,
      [reference, user.id, amount, mobile_provider, phone_number]
    );

    db.release();

    res.json({
      message: `Top-up request of Sh${amount.toLocaleString()} initiated. Check your ${mobile_provider} prompt.`,
      reference,
      instructions: `You will receive a payment prompt on ${phone_number}. Enter your PIN to complete.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Top-up failed', details: err.message });
  }
});

// ─── GET /history — transfer history ─────────────────────────────────────────
moneyTransferRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const db = await database.getClient();
    const result = await db.query(
      `SELECT mt.*,
              sender.name AS sender_name, sender.phone AS sender_phone,
              recipient.name AS recipient_name, recipient.phone AS recipient_phone
       FROM money_transfers mt
       LEFT JOIN users sender ON sender.id = mt.sender_id
       LEFT JOIN users recipient ON recipient.id = mt.recipient_id
       WHERE mt.sender_id = $1 OR mt.recipient_id = $1
       ORDER BY mt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    );
    db.release();

    res.json({ transfers: result.rows, page: Number(page) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

// ─── POST /bill-payment — pay bills (LUKU, DAWASCO, TTCL, etc.) ──────────────
moneyTransferRouter.post('/bill-payment', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { biller, account_number, amount } = req.body;

    const billers: Record<string, string> = {
      luku:    'TANESCO (LUKU electricity)',
      dawasco: 'DAWASCO (Water)',
      ttcl:    'TTCL (Landline)',
      dstv:    'DSTV / StarTimes',
      nhif:    'NHIF (Health Insurance)',
    };

    if (!biller || !billers[biller]) {
      return res.status(400).json({
        error: `Invalid biller. Supported: ${Object.keys(billers).join(', ')}`,
      });
    }
    if (!account_number || !amount || amount < 500) {
      return res.status(400).json({ error: 'account_number and amount (min Sh500) are required' });
    }

    const db = await database.getClient();

    const walletResult = await db.query(
      `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [user.id]
    );

    if (walletResult.rowCount === 0 || walletResult.rows[0].balance < amount) {
      db.release();
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const fee = 100; // flat fee per bill payment
    const total = amount + fee;

    await db.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
      [total, user.id]
    );

    const reference = `BILL-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    await db.query(
      `INSERT INTO money_transfers
         (reference, sender_id, amount, fee, transfer_type, note, status)
       VALUES ($1,$2,$3,$4,'bill_payment',$5,'completed')`,
      [reference, user.id, amount, fee, `${billers[biller]} - ${account_number}`]
    );

    db.release();

    res.json({
      message: `${billers[biller]} payment of Sh${amount.toLocaleString()} successful`,
      reference,
      biller: billers[biller],
      account_number,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Bill payment failed', details: err.message });
  }
});

export default moneyTransferRouter;
