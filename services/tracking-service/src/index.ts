/**
 * SafiriSalama Real-Time Tracking Service
 * Socket.io GPS tracking — in-memory storage (no Redis needed for Phase 1)
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDistance } from 'geolib';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
  transports: ['websocket', 'polling'],
});

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// ── In-memory stores ──────────────────────────────────────────────────────────
interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  status: 'online' | 'on_trip' | 'offline';
  currentTripId?: string;
  updatedAt: number;
}

interface TripState {
  tripId: string;
  driverId: string;
  passengerId: string;
  status: 'awaiting_pickup' | 'in_progress' | 'completed';
  pickupLocation: { latitude: number; longitude: number };
  dropoffLocation: { latitude: number; longitude: number };
  currentLocation: { latitude: number; longitude: number };
  startedAt: number;
}

const driverLocations = new Map<string, DriverLocation>();
const tripStates      = new Map<string, TripState>();
const activeDrivers   = new Map<string, Socket>();
const activePassengers = new Map<string, Socket>();

// ── Auth middleware ───────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'safiri-secret') as any;
    socket.data.user = {
      id:       decoded.userId || decoded.id,
      userType: decoded.userType || decoded.type || 'passenger',
    };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcETA(
  from: { latitude: number; longitude: number },
  to:   { latitude: number; longitude: number },
  speedKmh = 35
): number {
  const distM = getDistance(from, to);
  const distKm = distM / 1000;
  return Math.max(1, Math.ceil((distKm / speedKmh) * 60));
}

// ── Socket.io events ──────────────────────────────────────────────────────────
io.on('connection', (socket: Socket) => {
  const user = socket.data.user;
  console.log(`✓ Connected: ${user.userType} ${user.id}`);

  if (user.userType === 'driver') {
    activeDrivers.set(user.id, socket);
    socket.join(`driver:${user.id}`);
  } else {
    activePassengers.set(user.id, socket);
    socket.join(`passenger:${user.id}`);
  }

  // ── Driver location update ─────────────────────────────────────────────────
  socket.on('driver:location:update', (data: any) => {
    const { latitude, longitude, heading, speed, currentTripId } = data;
    const driverId = user.id;

    const loc: DriverLocation = {
      driverId, latitude, longitude, heading, speed,
      status:         currentTripId ? 'on_trip' : 'online',
      currentTripId,
      updatedAt:      Date.now(),
    };
    driverLocations.set(driverId, loc);

    // Broadcast to passengers watching this driver
    socket.broadcast.emit('driver:location:update', {
      driverId, latitude, longitude, heading, speed,
      timestamp: Date.now(),
    });

    // If on a trip, broadcast ETA to trip room
    if (currentTripId) {
      const trip = tripStates.get(currentTripId);
      if (trip) {
        const target = trip.status === 'awaiting_pickup'
          ? trip.pickupLocation : trip.dropoffLocation;
        const eta      = calcETA({ latitude, longitude }, target, speed || 35);
        const distance = getDistance({ latitude, longitude }, target);

        trip.currentLocation = { latitude, longitude };
        tripStates.set(currentTripId, trip);

        io.to(`trip:${currentTripId}`).emit('driver:moved', {
          latitude, longitude, heading, speed, eta,
          distance: Math.round(distance),
          timestamp: Date.now(),
        });
      }
    }
  });

  // ── Join trip room ─────────────────────────────────────────────────────────
  socket.on('trip:join', ({ tripId }) => {
    socket.join(`trip:${tripId}`);
    const trip = tripStates.get(tripId);
    if (trip) socket.emit('trip:status', trip);
  });

  // ── Trip start ─────────────────────────────────────────────────────────────
  socket.on('trip:start', ({ tripId, driverId, passengerId, pickupLocation, dropoffLocation }) => {
    const trip: TripState = {
      tripId, driverId, passengerId,
      status:          'in_progress',
      pickupLocation,  dropoffLocation,
      currentLocation: pickupLocation,
      startedAt:       Date.now(),
    };
    tripStates.set(tripId, trip);
    io.to(`trip:${tripId}`).emit('trip:started', trip);
  });

  // ── Trip complete ──────────────────────────────────────────────────────────
  socket.on('trip:complete', ({ tripId }) => {
    const trip = tripStates.get(tripId);
    if (trip) {
      trip.status = 'completed';
      io.to(`trip:${tripId}`).emit('trip:completed', trip);
      setTimeout(() => tripStates.delete(tripId), 60_000);
    }
  });

  // ── Get driver location ────────────────────────────────────────────────────
  socket.on('driver:location:get', ({ driverId }, cb) => {
    const loc = driverLocations.get(driverId) || null;
    if (typeof cb === 'function') cb(loc);
  });

  // ── SOS ───────────────────────────────────────────────────────────────────
  socket.on('emergency:sos', ({ tripId, location }) => {
    console.error(`🚨 SOS: Trip ${tripId}, User ${user.id}`);
    io.emit('emergency:alert', { tripId, userId: user.id, location, timestamp: Date.now() });
    io.to(`trip:${tripId}`).emit('emergency:triggered', { location });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`✗ Disconnected: ${user.userType} ${user.id}`);
    if (user.userType === 'driver') {
      activeDrivers.delete(user.id);
      const loc = driverLocations.get(user.id);
      if (loc) { loc.status = 'offline'; driverLocations.set(user.id, loc); }
    } else {
      activePassengers.delete(user.id);
    }
  });
});

// ── REST endpoints ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status:           'healthy',
    activeDrivers:    activeDrivers.size,
    activePassengers: activePassengers.size,
    activeTrips:      tripStates.size,
    timestamp:        new Date().toISOString(),
  });
});

app.get('/api/drivers/nearby', (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }
  const nearby: any[] = [];
  for (const [, loc] of driverLocations) {
    if (loc.status === 'online') {
      const dist = getDistance(
        { latitude: Number(latitude), longitude: Number(longitude) },
        { latitude: loc.latitude,     longitude: loc.longitude }
      );
      if (dist <= Number(radius)) {
        nearby.push({ driverId: loc.driverId, latitude: loc.latitude, longitude: loc.longitude, distance: dist, heading: loc.heading });
      }
    }
  }
  res.json({ drivers: nearby, count: nearby.length });
});

app.get('/api/trips/:tripId/status', (req, res) => {
  const trip = tripStates.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.TRACKING_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✓ SafiriSalama Tracking Service on port ${PORT}`);
  console.log(`✓ Socket.io ready for real-time GPS tracking`);
});

export default app;
