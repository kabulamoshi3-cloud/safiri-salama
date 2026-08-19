/**
 * Safety Features API
 * SOS emergency, trip sharing, emergency contacts, and safety monitoring
 */

import { Router } from 'express';
import { randomBytes } from 'crypto';
import { createClient } from 'redis';

const router = Router();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: number;
}

interface TripShare {
  tripId: string;
  shareToken: string;
  passengerId: string;
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  currentLocation?: Location;
  status: string;
  sharedWith: string[]; // Phone numbers or emails
  createdAt: number;
  expiresAt: number;
}

interface SOSAlert {
  id: string;
  tripId: string;
  userId: string;
  userType: 'passenger' | 'driver';
  location: Location;
  timestamp: number;
  status: 'active' | 'resolved' | 'cancelled';
  respondedBy?: string;
  resolvedAt?: number;
  notes?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// ═══════════════════════════════════════════════════════════
// EMERGENCY CONTACTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

router.post('/emergency-contacts', async (req, res) => {
  try {
    const { userId, name, phone, relationship } = req.body;

    if (!userId || !name || !phone) {
      return res.status(400).json({
        error: 'userId, name, and phone are required'
      });
    }

    const contact: EmergencyContact = {
      id: randomBytes(16).toString('hex'),
      userId,
      name,
      phone,
      relationship: relationship || 'Emergency Contact',
      createdAt: Date.now()
    };

    // Store in Redis
    await redisClient.sAdd(`user:${userId}:emergency-contacts`, JSON.stringify(contact));

    res.status(201).json({
      message: 'Emergency contact added',
      contact
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/emergency-contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const contactsData = await redisClient.sMembers(`user:${userId}:emergency-contacts`);
    const contacts = contactsData.map(data => JSON.parse(data));

    res.json({ contacts });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/emergency-contacts/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;

    const contactsData = await redisClient.sMembers(`user:${userId}:emergency-contacts`);
    const contacts = contactsData.map(data => JSON.parse(data));
    
    const contactToRemove = contacts.find(c => c.id === contactId);
    
    if (contactToRemove) {
      await redisClient.sRem(
        `user:${userId}:emergency-contacts`,
        JSON.stringify(contactToRemove)
      );
      res.json({ message: 'Contact removed' });
    } else {
      res.status(404).json({ error: 'Contact not found' });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// TRIP SHARING (with friends/family)
// ═══════════════════════════════════════════════════════════

router.post('/trip-share', async (req, res) => {
  try {
    const {
      tripId,
      passengerId,
      driverId,
      driverName,
      vehicleInfo,
      pickupLocation,
      dropoffLocation,
      sharedWith
    } = req.body;

    if (!tripId || !passengerId || !driverId) {
      return res.status(400).json({
        error: 'tripId, passengerId, and driverId are required'
      });
    }

    // Generate secure share token
    const shareToken = randomBytes(32).toString('hex');

    const tripShare: TripShare = {
      tripId,
      shareToken,
      passengerId,
      driverId,
      driverName,
      vehicleInfo,
      pickupLocation,
      dropoffLocation,
      status: 'in_progress',
      sharedWith: sharedWith || [],
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Store in Redis with TTL
    await redisClient.setEx(
      `trip:share:${shareToken}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(tripShare)
    );

    // Generate shareable link
    const shareLink = `${process.env.WEB_APP_URL || 'http://localhost:5174'}/track/${shareToken}`;

    res.status(201).json({
      message: 'Trip sharing enabled',
      shareToken,
      shareLink,
      expiresAt: tripShare.expiresAt
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/trip-share/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;

    const tripShareData = await redisClient.get(`trip:share:${shareToken}`);

    if (!tripShareData) {
      return res.status(404).json({
        error: 'Trip share not found or expired'
      });
    }

    const tripShare: TripShare = JSON.parse(tripShareData);

    // Get current location from trip tracking
    const tripData = await redisClient.get(`trip:${tripShare.tripId}`);
    if (tripData) {
      const trip = JSON.parse(tripData);
      tripShare.currentLocation = trip.currentLocation;
      tripShare.status = trip.status;
    }

    res.json({ tripShare });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SOS EMERGENCY ALERTS
// ═══════════════════════════════════════════════════════════

router.post('/sos', async (req, res) => {
  try {
    const { tripId, userId, userType, location } = req.body;

    if (!tripId || !userId || !userType || !location) {
      return res.status(400).json({
        error: 'tripId, userId, userType, and location are required'
      });
    }

    const sosAlert: SOSAlert = {
      id: randomBytes(16).toString('hex'),
      tripId,
      userId,
      userType,
      location,
      timestamp: Date.now(),
      status: 'active'
    };

    // Store in Redis
    await redisClient.setEx(
      `sos:${sosAlert.id}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(sosAlert)
    );

    // Add to active alerts list
    await redisClient.sAdd('sos:active', sosAlert.id);

    // Log to console for immediate attention
    console.error('🚨 SOS ALERT:', {
      alertId: sosAlert.id,
      tripId,
      userId,
      userType,
      location,
      timestamp: new Date(sosAlert.timestamp).toISOString()
    });

    // Get emergency contacts
    const contactsData = await redisClient.sMembers(`user:${userId}:emergency-contacts`);
    const emergencyContacts = contactsData.map(data => JSON.parse(data));

    // In production, send SMS/push notifications to:
    // 1. Emergency contacts
    // 2. Admin/support team
    // 3. Local authorities if needed

    res.status(201).json({
      message: 'SOS alert triggered',
      alertId: sosAlert.id,
      status: 'active',
      emergencyContactsNotified: emergencyContacts.length,
      timestamp: sosAlert.timestamp
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sos/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;

    const alertData = await redisClient.get(`sos:${alertId}`);

    if (!alertData) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    const alert: SOSAlert = JSON.parse(alertData);
    res.json({ alert });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sos', async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    const activeAlertIds = await redisClient.sMembers('sos:active');
    const alerts: SOSAlert[] = [];

    for (const alertId of activeAlertIds) {
      const alertData = await redisClient.get(`sos:${alertId}`);
      if (alertData) {
        const alert: SOSAlert = JSON.parse(alertData);
        if (!status || alert.status === status) {
          alerts.push(alert);
        }
      }
    }

    // Sort by timestamp (most recent first)
    alerts.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ alerts, count: alerts.length });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/sos/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, respondedBy, notes } = req.body;

    const alertData = await redisClient.get(`sos:${alertId}`);

    if (!alertData) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    const alert: SOSAlert = JSON.parse(alertData);

    if (status) alert.status = status;
    if (respondedBy) alert.respondedBy = respondedBy;
    if (notes) alert.notes = notes;

    if (status === 'resolved' || status === 'cancelled') {
      alert.resolvedAt = Date.now();
      await redisClient.sRem('sos:active', alertId);
    }

    // Update in Redis
    await redisClient.setEx(
      `sos:${alertId}`,
      24 * 60 * 60,
      JSON.stringify(alert)
    );

    res.json({
      message: 'SOS alert updated',
      alert
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SAFETY ZONE ALERTS (Geofencing)
// ═══════════════════════════════════════════════════════════

router.post('/safety-zones', async (req, res) => {
  try {
    const { tripId, zones } = req.body;

    if (!tripId || !zones) {
      return res.status(400).json({
        error: 'tripId and zones are required'
      });
    }

    // Store safety zones for trip
    await redisClient.setEx(
      `trip:${tripId}:safety-zones`,
      24 * 60 * 60,
      JSON.stringify(zones)
    );

    res.json({
      message: 'Safety zones configured',
      tripId,
      zonesCount: zones.length
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
