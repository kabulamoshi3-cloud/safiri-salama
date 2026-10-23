/**
 * Auth Routes — Firebase Phone OTP
 *
 * Flow:
 *  Client → Firebase (sends real SMS) → Client verifies OTP with Firebase
 *  → Client sends Firebase ID token here → We verify + issue our JWT
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { verifyFirebaseToken } from '../services/firebaseAdmin';

const router = Router();
const JWT_SECRET  = process.env.JWT_SECRET || 'safiri-secret-change-in-prod';
const JWT_EXPIRES = '30d';

// ─── Helper: issue JWT ────────────────────────────────────────────────────────
function issueJwt(userId: string, userType: string): string {
  return jwt.sign({ userId, userType }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── POST /auth/firebase-verify ───────────────────────────────────────────────
// Called after client verifies OTP with Firebase.
// Accepts Firebase ID token, finds or creates user, returns our JWT.
router.post('/firebase-verify', async (req: Request, res: Response) => {
  try {
    const { id_token, name, user_type } = req.body;

    if (!id_token) {
      return res.status(400).json({ error: 'id_token is required' });
    }

    // 1. Verify Firebase ID token
    let decoded;
    try {
      decoded = await verifyFirebaseToken(id_token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired Firebase token' });
    }

    const phone_number = decoded.phone_number;
    if (!phone_number) {
      return res.status(400).json({ error: 'Token does not contain phone number' });
    }

    // 2. Find existing user
    const existing = await pool.query(
      'SELECT id, phone_number, name, email, user_type, status FROM users WHERE phone_number = $1',
      [phone_number]
    );

    let user;

    if (existing.rows.length > 0) {
      // User exists — log them in
      user = existing.rows[0];

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account suspended. Contact support.' });
      }

      // Update last login
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    } else {
      // New user — register automatically
      const result = await pool.query(
        `INSERT INTO users (phone_number, name, user_type, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())
         RETURNING id, phone_number, name, email, user_type, status`,
        [
          phone_number,
          name || phone_number,           // use name if provided else phone
          user_type || 'passenger',        // default to passenger
        ]
      );
      user = result.rows[0];
    }

    // 3. Issue our JWT
    const token = issueJwt(user.id, user.user_type);

    return res.status(200).json({
      message: existing.rows.length > 0 ? 'Login successful' : 'Registration successful',
      token,
      user: {
        id:           user.id,
        name:         user.name,
        phone_number: user.phone_number,
        email:        user.email,
        user_type:    user.user_type,
        status:       user.status,
      },
    });

  } catch (error) {
    console.error('firebase-verify error:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, phone_number, name, email, user_type, status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('me error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (userId) {
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
    }
    return res.json({ message: 'Logged out successfully' });
  } catch {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
