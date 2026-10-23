/**
 * Auth Routes
 * - Phone + Password (register/login)
 * - Firebase Google Sign-In token exchange
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { verifyFirebaseToken } from '../services/firebaseAdmin';

const router = Router();
const JWT_SECRET  = process.env.JWT_SECRET || 'safiri-secret';
const JWT_EXPIRES = '30d';

function issueJwt(userId: string, userType: string): string {
  return jwt.sign({ userId, userType }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, user_type } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Format phone
    const cleanPhone = phone.replace(/\s/g, '');
    const fullPhone  = cleanPhone.startsWith('+') ? cleanPhone : `+255${cleanPhone}`;

    // Check existing
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [fullPhone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Account already exists with this phone number' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, name, user_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id, phone, name, email, user_type, status`,
      [fullPhone, hash, name.trim(), user_type || 'passenger']
    );

    const user  = result.rows[0];
    const token = issueJwt(user.id, user.user_type);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { ...user, phone_number: user.phone },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const cleanPhone = phone.replace(/\s/g, '');
    const fullPhone  = cleanPhone.startsWith('+') ? cleanPhone : `+255${cleanPhone}`;

    const result = await pool.query(
      'SELECT id, phone, password_hash, name, email, user_type, status FROM users WHERE phone = $1',
      [fullPhone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use Google to login.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    const token = issueJwt(user.id, user.user_type);

    return res.json({
      message: 'Login successful',
      token,
      user: { ...user, phone_number: user.phone, password_hash: undefined },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /auth/firebase-verify (Google Sign-In) ──────────────────────────────
router.post('/firebase-verify', async (req: Request, res: Response) => {
  try {
    const { id_token, name, email, user_type } = req.body;

    if (!id_token) {
      return res.status(400).json({ error: 'id_token is required' });
    }

    // Verify Firebase ID token using Admin SDK
    let decoded: any;
    try {
      decoded = await verifyFirebaseToken(id_token);
    } catch (verifyErr: any) {
      console.error('Firebase token verify failed:', verifyErr?.message);
      return res.status(401).json({ error: 'Invalid or expired Google token. Please try again.' });
    }

    const googleEmail = decoded.email || email || null;
    const googleName  = decoded.name  || name || googleEmail || 'SafiriSalama User';
    const phone       = decoded.phone_number || null;

    // Find by email or phone
    let existing = null;
    if (googleEmail) {
      const r = await pool.query(
        'SELECT id, phone, name, email, user_type, status FROM users WHERE email = $1',
        [googleEmail]
      );
      existing = r.rows[0] || null;
    }
    if (!existing && phone) {
      const r = await pool.query(
        'SELECT id, phone, name, email, user_type, status FROM users WHERE phone = $1',
        [phone]
      );
      existing = r.rows[0] || null;
    }

    let user;
    if (existing) {
      if (existing.status !== 'active') {
        return res.status(403).json({ error: 'Account suspended. Contact support.' });
      }
      await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [existing.id]);
      user = existing;
    } else {
      // Auto-register Google user
      const result = await pool.query(
        `INSERT INTO users (phone, email, name, user_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
         RETURNING id, phone, name, email, user_type, status`,
        [phone || `google_${Date.now()}`, googleEmail, googleName, user_type || 'passenger']
      );
      user = result.rows[0];
    }

    const token = issueJwt(user.id, user.user_type);
    return res.json({
      message: 'Login successful',
      token,
      user: { ...user, phone_number: user.phone },
    });
  } catch (err) {
    console.error('firebase-verify error:', err);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Verify JWT directly since this route is outside authMiddleware
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'safiri-secret';
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, phone, name, email, user_type, status, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = result.rows[0];
    return res.json({ user: { ...u, phone_number: u.phone } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
