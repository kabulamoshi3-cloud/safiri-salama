/**
 * Authentication Routes
 * User registration, login, and token management
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, userType, email } = req.body;

    // Validate required fields
    if (!phone || !password || !userType) {
      return res.status(400).json({ error: 'Phone, password, and userType are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this phone number' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, name, email, user_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, phone, name, email, user_type, status`,
      [phone, hashedPassword, name || null, email || null, userType, 'active']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        userType: user.user_type,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, phone, password_hash, name, email, user_type, status
       FROM users
       WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        userType: user.user_type,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT id, phone, name, email, user_type, status, created_at, last_login
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { name, email } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, phone, name, email, user_type, status`,
      values
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal, but log the event)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (userId) {
      // Log logout event (optional)
      await pool.query(
        'UPDATE users SET last_logout = NOW() WHERE id = $1',
        [userId]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
