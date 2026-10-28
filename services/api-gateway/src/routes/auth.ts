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

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

const JWT_EXPIRES = '30d';

function issueJwt(userId: string, userType: string): string {
  return jwt.sign({ userId, userType }, getJwtSecret(), { expiresIn: JWT_EXPIRES });
}

function normalizePhoneNumber(value: string): string {
  const compact = String(value).trim().replace(/[\s()-]/g, '');
  if (compact.startsWith('+')) return `+${compact.slice(1).replace(/\D/g, '')}`;
  const digits = compact.replace(/\D/g, '');
  if (digits.startsWith('255')) return `+${digits}`;
  if (digits.startsWith('0')) return `+255${digits.slice(1)}`;
  return `+255${digits}`;
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      phone,
      password,
      name,
      email,
      user_type: requestedUserType,
      userType: requestedUserTypeCamel,
      vehicle_type,
      vehicleType,
      license_number,
      licenseNumber,
      plate_number,
      plateNumber,
    } = req.body;
    const accountType = requestedUserType || requestedUserTypeCamel || 'passenger';
    const license = license_number || licenseNumber;
    const plate = plate_number || plateNumber;
    const rawVehicleType = String(vehicle_type || vehicleType || '').toLowerCase().replace(/[ _]+/g, '-');
    const normalizedVehicleType = rawVehicleType === 'boda-boda' ? 'boda-boda' : rawVehicleType;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['passenger', 'driver', 'operator'].includes(accountType)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }
    if (accountType === 'driver' && (!license || !plate || !['car', 'bajaji', 'boda-boda'].includes(normalizedVehicleType))) {
      return res.status(400).json({ error: 'Driver registration requires a license number, plate number and valid vehicle type' });
    }

    // Format phone
    const fullPhone = normalizePhoneNumber(phone);

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create the account and (for drivers) its initial profile in one transaction.
    const client = await pool.connect();
    let user: any;
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM users WHERE phone = $1', [fullPhone]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Account already exists with this phone number' });
      }

      const result = await client.query(
        `INSERT INTO users (phone, password_hash, name, email, user_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
         RETURNING id, phone, name, email, user_type, status`,
        [fullPhone, hash, name.trim(), email?.trim() || null, accountType]
      );
      user = result.rows[0];

      if (accountType === 'driver') {
        const driverResult = await client.query(
          `INSERT INTO drivers (user_id, name, phone, email, license_number, status)
           VALUES ($1, $2, $3, $4, $5, 'offline')
           RETURNING id`,
          [user.id, user.name, user.phone, user.email, license.trim()]
        );
        await client.query(
          `INSERT INTO vehicles (driver_id, plate_number, vehicle_type)
           VALUES ($1, $2, $3)`,
          [driverResult.rows[0].id, plate.trim(), normalizedVehicleType]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    const token = issueJwt(user.id, user.user_type);

    // Transform DB column names to camelCase
    const { user_type: userType, ...rest } = user;

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { ...rest, userType, phone_number: user.phone },
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

    const fullPhone = normalizePhoneNumber(phone);

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

    // Transform DB column names to camelCase
    const { user_type: userType, password_hash, ...rest } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: { ...rest, userType, phone_number: user.phone },
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

    // Transform DB column names to camelCase
    const { user_type: userType, ...rest } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: { ...rest, userType, phone_number: user.phone },
    });
  } catch (err) {
    console.error('firebase-verify error:', err);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    let userId: string | undefined;

    // Check if req.user is populated (test harness or if behind authMiddleware in future)
    if ((req as any).user?.userId) {
      userId = (req as any).user.userId;
    } else {
      // Verify JWT directly since this route is outside authMiddleware in production
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = jwt.verify(token, getJwtSecret());
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = decoded.userId;
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, phone, name, email, user_type, status, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = result.rows[0];
    // Transform DB column names to camelCase
    const { user_type: userType, ...rest } = u;
    return res.json({ user: { ...rest, userType, phone_number: u.phone } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ─── PATCH /auth/me ───────────────────────────────────────────────────────────
router.patch('/me', async (req: Request, res: Response) => {
  try {
    let userId: string | undefined;

    // Check if req.user is populated (test harness or if behind authMiddleware in future)
    if ((req as any).user?.userId) {
      userId = (req as any).user.userId;
    } else {
      // Verify JWT directly
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = jwt.verify(token, getJwtSecret());
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = decoded.userId;
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'At least one updatable field (name, email) is required' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, phone, name, email, user_type, status`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    const { user_type: userType, ...rest } = u;
    return res.json({ user: { ...rest, userType, phone_number: u.phone } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── POST /auth/change-password ───────────────────────────────────────────────
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    let userId: string | undefined;

    // Check if req.user is populated (test harness or if behind authMiddleware in future)
    if ((req as any).user?.userId) {
      userId = (req as any).user.userId;
    } else {
      // Verify JWT directly
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = jwt.verify(token, getJwtSecret());
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = decoded.userId;
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current password hash
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash } = result.rows[0];

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── POST /auth/admin-register ────────────────────────────────────────────────
router.post('/admin-register', async (req: Request, res: Response) => {
  try {
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      return res.status(403).json({ error: 'Admin registration is not available' });
    }

    const headerSecret = req.headers['x-setup-secret'];
    if (headerSecret !== setupSecret) {
      return res.status(403).json({ error: 'Invalid setup secret' });
    }

    const { phone, password, name, email } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const fullPhone = normalizePhoneNumber(phone);
    const hash = await bcrypt.hash(password, 10);

    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [fullPhone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Account already exists with this phone number' });
    }

    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, name, email, user_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin', 'active', NOW(), NOW())
       RETURNING id, phone, name, email, user_type, status`,
      [fullPhone, hash, name.trim(), email?.trim() || null]
    );
    const user = result.rows[0];
    const token = issueJwt(user.id, user.user_type);
    const { user_type: userType, ...rest } = user;

    return res.status(201).json({
      message: 'Admin account created successfully',
      token,
      user: { ...rest, userType, phone_number: user.phone },
    });
  } catch (err) {
    console.error('admin-register error:', err);
    return res.status(500).json({ error: 'Admin registration failed. Please try again.' });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
