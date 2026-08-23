/**
 * Push Notifications Routes
 * Register device tokens + send notifications via Expo Push
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * POST /api/v1/notifications/register
 * Register device push token
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { pushToken, platform } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!pushToken) return res.status(400).json({ error: 'pushToken required' });

    // Store token in users table
    await pool.query(
      `UPDATE users SET push_token = $1, device_platform = $2 WHERE id = $3`,
      [pushToken, platform || 'android', userId]
    );

    res.json({ status: 'registered', pushToken });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

/**
 * Send push notification to a specific user
 */
async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    const result = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0 || !result.rows[0].push_token) return false;

    const token = result.rows[0].push_token;

    // Validate Expo push token format
    if (!token.startsWith('ExponentPushToken[')) return false;

    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const result2 = await response.json();
    console.log('Push sent:', result2);
    return true;
  } catch (error) {
    console.error('Send push error:', error);
    return false;
  }
}

/**
 * POST /api/v1/notifications/send
 * Admin/system sends a notification to a user
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { targetUserId, title, body, data } = req.body;

    if (!targetUserId || !title || !body) {
      return res.status(400).json({ error: 'targetUserId, title, and body required' });
    }

    const sent = await sendPushNotification(targetUserId, title, body, data);
    res.json({ sent, targetUserId });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * POST /api/v1/notifications/trip-update
 * Send trip-related notification (driver accepted, arriving, etc.)
 */
router.post('/trip-update', async (req: Request, res: Response) => {
  try {
    const { tripId, type } = req.body;

    if (!tripId || !type) {
      return res.status(400).json({ error: 'tripId and type required' });
    }

    // Get trip info
    const tripResult = await pool.query(
      'SELECT passenger_id, driver_id, pickup_address, dropoff_address FROM trips WHERE id = $1',
      [tripId]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    // Get driver name for passenger notifications
    let driverName = 'Your driver';
    if (trip.driver_id) {
      const dResult = await pool.query('SELECT name FROM users WHERE id = $1', [trip.driver_id]);
      if (dResult.rows.length > 0) driverName = dResult.rows[0].name;
    }

    // Notification messages by type
    const messages: Record<string, { title: string; body: string; target: string }> = {
      'driver_assigned': {
        title: 'Driver Found! 🚗',
        body: `${driverName} is on the way to pick you up`,
        target: trip.passenger_id,
      },
      'driver_arriving': {
        title: 'Driver Arriving! 📍',
        body: `${driverName} will arrive in 2 minutes`,
        target: trip.passenger_id,
      },
      'driver_arrived': {
        title: 'Driver Has Arrived! ✅',
        body: `${driverName} is waiting at your pickup location`,
        target: trip.passenger_id,
      },
      'trip_started': {
        title: 'Trip Started 🛣️',
        body: `Heading to ${trip.dropoff_address || 'your destination'}`,
        target: trip.passenger_id,
      },
      'trip_completed': {
        title: 'Trip Completed! 🎉',
        body: 'Rate your ride and leave a tip',
        target: trip.passenger_id,
      },
      'trip_cancelled': {
        title: 'Trip Cancelled ❌',
        body: 'Your trip has been cancelled',
        target: trip.passenger_id,
      },
      'new_trip_request': {
        title: 'New Trip Request! 🔔',
        body: `${trip.pickup_address || 'Nearby'} → ${trip.dropoff_address || 'Destination'}`,
        target: trip.driver_id,
      },
    };

    const msg = messages[type];
    if (!msg) return res.status(400).json({ error: `Unknown notification type: ${type}` });

    const sent = await sendPushNotification(msg.target, msg.title, msg.body, { tripId, type });
    res.json({ sent, type, target: msg.target });
  } catch (error) {
    console.error('Trip notification error:', error);
    res.status(500).json({ error: 'Failed to send trip notification' });
  }
});

export { sendPushNotification };
export default router;
