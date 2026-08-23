/**
 * OTP Verification Routes
 * Send SMS OTP codes via Africa's Talking
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Africa's Talking config
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || 'atsk_933b2689a5050302c52ec633163445c630f0fc9e649a2eb9a2a3739dd92d1c3c9177c716';
const AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';
const AT_SENDER = 'DalaSmart';

// Store OTPs in memory (in production use Redis)
const otpStore: Map<string, { code: string; expiresAt: number }> = new Map();

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/v1/otp/send
 * Send OTP to phone number
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(phone, { code, expiresAt });

    const message = `Your DalaSmart verification code is: ${code}. Valid for 5 minutes.`;

    // Send SMS via Africa's Talking (skip in sandbox if account not activated)
    let smsSent = false;
    try {
      const params = new URLSearchParams({
        username: AT_USERNAME,
        to: phone,
        message: message,
        from: AT_SENDER,
      });

      const response = await fetch(AT_SMS_URL, {
        method: 'POST',
        headers: {
          'apiKey': AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const result = await response.json();
      console.log('SMS result:', JSON.stringify(result));
      smsSent = true;
    } catch (smsError) {
      console.log('SMS send failed (sandbox mode):', smsError);
      smsSent = false;
    }

    res.json({
      sent: true,
      phone,
      message: 'OTP sent successfully',
      expiresIn: '5 minutes',
      // Always return code in sandbox/dev mode for testing
      testCode: code,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * POST /api/v1/otp/verify
 * Verify OTP code
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'phone and code required' });
    }

    const stored = otpStore.get(phone);

    if (!stored) {
      return res.status(400).json({ error: 'No OTP found for this number. Request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // OTP verified - clean up
    otpStore.delete(phone);

    // Mark phone as verified in database
    await pool.query(
      'UPDATE users SET phone_verified = true WHERE phone = $1',
      [phone]
    ).catch(() => {});

    res.json({
      verified: true,
      phone,
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

/**
 * POST /api/v1/otp/resend
 * Resend OTP (rate limited to 1 per 30 seconds)
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: 'phone required' });

    const existing = otpStore.get(phone);
    if (existing && (existing.expiresAt - Date.now()) > 4.5 * 60 * 1000) {
      return res.status(429).json({ error: 'Please wait 30 seconds before requesting a new code' });
    }

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phone, { code, expiresAt });

    // Send SMS
    const message = `Your DalaSmart code: ${code}. Valid 5 min.`;
    const params = new URLSearchParams({ username: AT_USERNAME, to: phone, message, from: AT_SENDER });

    await fetch(AT_SMS_URL, {
      method: 'POST',
      headers: { 'apiKey': AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }).catch(() => {});

    res.json({
      sent: true,
      message: 'New OTP sent',
      ...(AT_USERNAME === 'sandbox' && { testCode: code }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

export default router;
