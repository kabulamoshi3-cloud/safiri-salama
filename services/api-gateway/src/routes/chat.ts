/**
 * In-App Chat Routes
 * Message exchange between passenger and driver during active trip
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

/**
 * POST /api/v1/chat/send
 * Send a message in an active trip
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId, message } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!tripId || !message) return res.status(400).json({ error: 'tripId and message required' });

    // Verify user is part of this trip
    const tripCheck = await pool.query(
      'SELECT passenger_id, driver_id FROM trips WHERE id = $1',
      [tripId]
    );
    if (tripCheck.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

    const trip = tripCheck.rows[0];
    if (trip.passenger_id !== userId && trip.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized for this trip chat' });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (trip_id, sender_id, message, sent_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id, sender_id, message, sent_at`,
      [tripId, userId, message]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Send chat error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/v1/chat/:tripId
 * Get all messages for a trip
 */
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tripId } = req.params;
    const { after } = req.query; // timestamp for polling new messages

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = `SELECT cm.id, cm.sender_id, cm.message, cm.sent_at,
                        u.name as sender_name
                 FROM chat_messages cm
                 JOIN users u ON cm.sender_id = u.id
                 WHERE cm.trip_id = $1`;
    const params: any[] = [tripId];

    if (after) {
      query += ` AND cm.sent_at > $2`;
      params.push(new Date(parseInt(after as string)));
    }

    query += ` ORDER BY cm.sent_at ASC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json({ messages: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router;
