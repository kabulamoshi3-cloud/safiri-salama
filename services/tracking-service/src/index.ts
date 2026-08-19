/**
 * Real-Time Tracking Service
 * Handles GPS location updates, driver tracking, journey tracking, and ETA calculations
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { getDistance, getSpeed } from 'geolib';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import intelligenceRouter from './routes/intelligence';
import safetyRouter from './routes/safety';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
});

// Redis for caching real-time locations
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/routes', intelligenceRouter);
app.use('/api/safety', safetyRouter);

const PORT = process.env.TRACKING_PORT || 3001;

// Store active connections
const activeDrivers = new Map<string, Socket>();
const activePassengers = new Map<string, Socket>();
const tripSockets = new Map<string, Set<string>>(); // tripId -> socketIds
const tripMonitoringIntervals = new Map<string, NodeJS.Timeout>(); // tripId -> interval

// ═══════════════════════════════════════════════════════════
// LOCATION TRACKING DATA STRUCTURES
// ═══════════════════════════════════════════════════════════

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface DriverLocation extends Location {
  driverId: string;
  status: 'offline' | 'online' | 'on_trip';
  currentTripId?: string;
}

interface TripTracking {
  tripId: string;
  driverId: string;
  passengerId: string;
  status: 'awaiting_pickup' | 'in_progress' | 'completed';
  pickupLocation: Location;
  dropoffLocation: Location;
  currentLocation: Location;
  distanceTraveled: number;
  estimatedTimeArrival: number;
  route: Location[];
  startedAt?: number;
  completedAt?: number;
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function calculateETA(
  currentLoc: Location,
  destinationLoc: Location,
  averageSpeed: number = 40 // km/h
): number {
  const distance = getDistance(
    { latitude: currentLoc.latitude, longitude: currentLoc.longitude },
    { latitude: destinationLoc.latitude, longitude: destinationLoc.longitude }
  );
  
  // Convert to kilometers
  const distanceKm = distance / 1000;
  
  // Calculate time in minutes
  const timeHours = distanceKm / averageSpeed;
  const timeMinutes = Math.ceil(timeHours * 60);
  
  return timeMinutes;
}

async function saveLocationToRedis(key: string, location: any): Promise<void> {
  await redisClient.setEx(key, 3600, JSON.stringify(location)); // 1 hour TTL
}

async function getLocationFromRedis(key: string): Promise<any> {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

// ═══════════════════════════════════════════════════════════
// CONTINUOUS TRAFFIC MONITORING
// ═══════════════════════════════════════════════════════════

async function monitorTripTraffic(tripId: string) {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured, skipping traffic monitoring');
    return;
  }

  const interval = setInterval(async () => {
    try {
      const trip = await getLocationFromRedis(`trip:${tripId}`);
      
      if (!trip || trip.status === 'completed') {
        clearInterval(interval);
        tripMonitoringIntervals.delete(tripId);
        return;
      }

      // Determine target location based on trip status
      const targetLocation = trip.status === 'awaiting_pickup' 
        ? trip.pickupLocation 
        : trip.dropoffLocation;

      // Check current traffic via Google Directions API
      const axios = require('axios');
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${trip.currentLocation.latitude},${trip.currentLocation.longitude}`,
            destination: `${targetLocation.latitude},${targetLocation.longitude}`,
            alternatives: true,
            departure_time: 'now',
            traffic_model: 'best_guess',
            key: GOOGLE_MAPS_API_KEY
          }
        }
      );

      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const mainRoute = response.data.routes[0].legs[0];
        const newDurationSeconds = mainRoute.duration_in_traffic?.value || mainRoute.duration.value;
        const newETA = Math.ceil(newDurationSeconds / 60); // minutes
        const oldETA = trip.estimatedTimeArrival || 0;

        // Check for significant ETA change (5+ minutes)
        if (Math.abs(newETA - oldETA) >= 5) {
          const etaChange = {
            previousETA: oldETA,
            newETA: newETA,
            delayMinutes: newETA - oldETA,
            reason: newETA > oldETA 
              ? 'Heavy traffic detected ahead' 
              : 'Traffic conditions improved',
            timestamp: Date.now()
          };

          // Broadcast ETA change to trip participants
          io.to(`trip:${tripId}`).emit('eta:changed', etaChange);

          console.log(`🚦 Trip ${tripId}: ETA changed from ${oldETA} to ${newETA} mins`);

          // Update stored trip
          trip.estimatedTimeArrival = newETA;
          await saveLocationToRedis(`trip:${tripId}`, trip);
        }

        // Check for faster alternative routes
        if (response.data.routes.length > 1) {
          for (const altRoute of response.data.routes.slice(1)) {
            const altLeg = altRoute.legs[0];
            const altDurationSeconds = altLeg.duration_in_traffic?.value || altLeg.duration.value;
            const altETA = Math.ceil(altDurationSeconds / 60);
            
            // Alert if alternative is 5+ minutes faster
            if (altETA < newETA - 5) {
              const routeSuggestion = {
                currentDuration: newETA,
                alternativeDuration: altETA,
                timeSaved: newETA - altETA,
                alternativePolyline: altRoute.overview_polyline.points,
                reason: 'Faster route available due to traffic conditions'
              };

              io.to(`trip:${tripId}`).emit('route:faster_available', routeSuggestion);

              console.log(`⚡ Trip ${tripId}: Faster route available (save ${routeSuggestion.timeSaved} min)`);
              break; // Only suggest the fastest alternative
            }
          }
        }
      }
    } catch (error) {
      console.error(`Traffic monitoring error for trip ${tripId}:`, error);
    }
  }, 120000); // Check every 2 minutes

  tripMonitoringIntervals.set(tripId, interval);
  console.log(`📊 Started traffic monitoring for trip ${tripId}`);
}

// ═══════════════════════════════════════════════════════════
// SOCKET.IO CONNECTION HANDLING
// ═══════════════════════════════════════════════════════════

io.on('connection', (socket: Socket) => {
  const user = socket.data.user;
  console.log(`✓ Connected: ${user.type} ${user.id}`);

  // Register driver/passenger
  if (user.type === 'driver') {
    activeDrivers.set(user.id, socket);
    socket.join(`driver:${user.id}`);
  } else if (user.type === 'passenger') {
    activePassengers.set(user.id, socket);
    socket.join(`passenger:${user.id}`);
  }

  // ─────────────────────────────────────────────────────────
  // DRIVER LOCATION UPDATE
  // ─────────────────────────────────────────────────────────
  socket.on('driver:location:update', async (data: DriverLocation) => {
    const { driverId, latitude, longitude, heading, speed, currentTripId } = data;

    // Save to Redis
    const location: DriverLocation = {
      driverId,
      latitude,
      longitude,
      heading,
      speed,
      timestamp: Date.now(),
      status: currentTripId ? 'on_trip' : 'online',
      currentTripId
    };

    await saveLocationToRedis(`driver:${driverId}:location`, location);

    // If driver is on a trip, broadcast to passenger
    if (currentTripId) {
      const trip = await getLocationFromRedis(`trip:${currentTripId}`);
      
      if (trip) {
        // Calculate ETA to pickup or destination
        const targetLocation = trip.status === 'awaiting_pickup' 
          ? trip.pickupLocation 
          : trip.dropoffLocation;

        const eta = calculateETA(location, targetLocation, speed || 40);
        const distance = getDistance(
          { latitude, longitude },
          { latitude: targetLocation.latitude, longitude: targetLocation.longitude }
        );

        // Broadcast to passenger
        io.to(`trip:${currentTripId}`).emit('driver:moved', {
          latitude,
          longitude,
          heading,
          speed,
          eta,
          distance: Math.round(distance),
          timestamp: Date.now()
        });

        // Update trip tracking
        trip.currentLocation = { latitude, longitude, timestamp: Date.now() };
        await saveLocationToRedis(`trip:${currentTripId}`, trip);
      }
    }

    // Broadcast to nearby passengers looking for drivers
    socket.broadcast.emit('driver:available', {
      driverId,
      latitude,
      longitude,
      status: location.status
    });
  });

  // ─────────────────────────────────────────────────────────
  // TRIP START - Join trip room
  // ─────────────────────────────────────────────────────────
  socket.on('trip:join', async ({ tripId }) => {
    socket.join(`trip:${tripId}`);
    
    if (!tripSockets.has(tripId)) {
      tripSockets.set(tripId, new Set());
    }
    tripSockets.get(tripId)!.add(socket.id);

    console.log(`User ${user.id} joined trip ${tripId}`);

    // Send current trip status
    const trip = await getLocationFromRedis(`trip:${tripId}`);
    if (trip) {
      socket.emit('trip:status', trip);
      
      // Start traffic monitoring if trip is active and not already monitored
      if (trip.status !== 'completed' && !tripMonitoringIntervals.has(tripId)) {
        monitorTripTraffic(tripId);
      }
    }
  });

  // ─────────────────────────────────────────────────────────
  // TRIP START - Begin journey tracking
  // ─────────────────────────────────────────────────────────
  socket.on('trip:start', async ({ tripId, driverId, passengerId, pickupLocation, dropoffLocation }) => {
    const trip: TripTracking = {
      tripId,
      driverId,
      passengerId,
      status: 'in_progress',
      pickupLocation,
      dropoffLocation,
      currentLocation: pickupLocation,
      distanceTraveled: 0,
      estimatedTimeArrival: calculateETA(pickupLocation, dropoffLocation),
      route: [pickupLocation],
      startedAt: Date.now()
    };

    await saveLocationToRedis(`trip:${tripId}`, trip);

    // Notify all parties
    io.to(`trip:${tripId}`).emit('trip:started', trip);

    // Start continuous traffic monitoring
    monitorTripTraffic(tripId);
  });

  // ─────────────────────────────────────────────────────────
  // TRIP COMPLETE
  // ─────────────────────────────────────────────────────────
  socket.on('trip:complete', async ({ tripId }) => {
    const trip = await getLocationFromRedis(`trip:${tripId}`);
    
    if (trip) {
      trip.status = 'completed';
      trip.completedAt = Date.now();
      await saveLocationToRedis(`trip:${tripId}`, trip);

      io.to(`trip:${tripId}`).emit('trip:completed', trip);
    }

    // Stop traffic monitoring
    const interval = tripMonitoringIntervals.get(tripId);
    if (interval) {
      clearInterval(interval);
      tripMonitoringIntervals.delete(tripId);
      console.log(`⏹️ Stopped traffic monitoring for trip ${tripId}`);
    }

    // Clean up trip room
    if (tripSockets.has(tripId)) {
      tripSockets.delete(tripId);
    }
  });

  // ─────────────────────────────────────────────────────────
  // GET DRIVER LOCATION (for passenger)
  // ─────────────────────────────────────────────────────────
  socket.on('driver:location:get', async ({ driverId }, callback) => {
    const location = await getLocationFromRedis(`driver:${driverId}:location`);
    callback(location);
  });

  // ─────────────────────────────────────────────────────────
  // SHARE LIVE TRIP (with friends/family)
  // ─────────────────────────────────────────────────────────
  socket.on('trip:share', async ({ tripId, shareToken }) => {
    socket.join(`trip:share:${shareToken}`);
    
    const trip = await getLocationFromRedis(`trip:${tripId}`);
    if (trip) {
      socket.emit('trip:shared:status', trip);
    }
  });

  // ─────────────────────────────────────────────────────────
  // SOS EMERGENCY
  // ─────────────────────────────────────────────────────────
  socket.on('emergency:sos', async ({ tripId, location, userId, userType }) => {
    console.error(`🚨 SOS EMERGENCY: Trip ${tripId}, User ${userId}`);

    const emergency = {
      tripId,
      userId,
      userType,
      location,
      timestamp: Date.now(),
      status: 'active'
    };

    await saveLocationToRedis(`emergency:${tripId}`, emergency);

    // Broadcast to admin/support
    io.emit('emergency:alert', emergency);

    // Notify the other party in the trip
    io.to(`trip:${tripId}`).emit('emergency:triggered', {
      message: 'Emergency assistance requested',
      location
    });
  });

  // ─────────────────────────────────────────────────────────
  // DRIVER REROUTE ACCEPTANCE
  // ─────────────────────────────────────────────────────────
  socket.on('driver:reroute:accept', async ({ tripId }) => {
    console.log(`🔄 Driver accepted reroute for trip ${tripId}`);
    
    // Notify all trip participants
    io.to(`trip:${tripId}`).emit('route:updated', {
      message: 'Taking faster route',
      timestamp: Date.now()
    });
  });

  // ─────────────────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`✗ Disconnected: ${user.type} ${user.id}`);

    if (user.type === 'driver') {
      activeDrivers.delete(user.id);
      
      // Update driver status to offline
      redisClient.del(`driver:${user.id}:location`).catch(console.error);
    } else if (user.type === 'passenger') {
      activePassengers.delete(user.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeDrivers: activeDrivers.size,
    activePassengers: activePassengers.size,
    activeTrips: tripSockets.size
  });
});

// Get nearby drivers
app.get('/api/drivers/nearby', async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  const nearbyDrivers: any[] = [];
  
  // Scan all active drivers
  for (const [driverId, socket] of activeDrivers.entries()) {
    const location = await getLocationFromRedis(`driver:${driverId}:location`);
    
    if (location && location.status === 'online') {
      const distance = getDistance(
        { latitude: Number(latitude), longitude: Number(longitude) },
        { latitude: location.latitude, longitude: location.longitude }
      );

      if (distance <= Number(radius)) {
        nearbyDrivers.push({
          driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          distance,
          heading: location.heading
        });
      }
    }
  }

  res.json({ drivers: nearbyDrivers });
});

// Get trip status
app.get('/api/trips/:tripId/status', async (req, res) => {
  const { tripId } = req.params;
  const trip = await getLocationFromRedis(`trip:${tripId}`);
  
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  res.json(trip);
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

httpServer.listen(PORT, () => {
  console.log(`✓ Tracking Service running on port ${PORT}`);
  console.log(`✓ WebSocket ready for real-time tracking`);
});

export default app;
