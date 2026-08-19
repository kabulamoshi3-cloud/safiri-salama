/**
 * DalaSmart Fake Driver Simulator
 * 
 * Simulates N vehicles driving along real OSRM routes and sends GPS position
 * updates to the Fleet Tracker WebSocket gateway, mimicking real driver behavior.
 *
 * Features:
 * - Realistic speed profiles per transport mode
 * - Variable crowding levels
 * - Configurable ping intervals
 * - Multiple route support
 * - Speed variance to simulate traffic
 *
 * Usage:
 *   node scripts/fake-driver-simulator.js
 *   
 * Environment Variables:
 *   FLEET_TRACKER_URL - WebSocket URL (default: ws://localhost:8001)
 *   OSRM_URL          - OSRM HTTP API URL (default: http://localhost:5000)
 *   NUM_VEHICLES      - Number of vehicles to simulate (default: 5)
 *   PING_INTERVAL_MS  - GPS update interval (default: 15000 = 15s)
 *   TRANSPORT_MODE    - daladala|boda-boda|brt (default: daladala)
 *   ROUTE_ORIGIN      - Origin lat,lng (default: -6.8206,39.2731 Kariakoo)
 *   ROUTE_DEST        - Destination lat,lng (default: -6.7311,39.2117 Mbezi Beach)
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const FLEET_TRACKER_URL = process.env.FLEET_TRACKER_URL || 'ws://localhost:8001';
const OSRM_URL = process.env.OSRM_URL || 'http://localhost:5000';
const NUM_VEHICLES = Number(process.env.NUM_VEHICLES) || 5;
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS) || 15000;
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'daladala';

// Default route: Kariakoo -> Mbezi Beach, Dar es Salaam
const DEFAULT_ORIGIN = { lat: -6.8206, lng: 39.2731 };
const DEFAULT_DEST = { lat: -6.7311, lng: 39.2117 };

// Parse custom route if provided
function parseLatLng(str) {
  const [lat, lng] = str.split(',').map(s => parseFloat(s.trim()));
  return { lat, lng };
}

const ORIGIN = process.env.ROUTE_ORIGIN 
  ? parseLatLng(process.env.ROUTE_ORIGIN) 
  : DEFAULT_ORIGIN;

const DEST = process.env.ROUTE_DEST 
  ? parseLatLng(process.env.ROUTE_DEST) 
  : DEFAULT_DEST;

// Transport mode speed profiles (km/h)
const SPEED_PROFILES = {
  'daladala': { min: 20, max: 35, typical: 25 },
  'brt': { min: 25, max: 40, typical: 32 },
  'boda-boda': { min: 30, max: 50, typical: 40 }
};

const speedProfile = SPEED_PROFILES[TRANSPORT_MODE] || SPEED_PROFILES.daladala;

/**
 * Calculate heading (bearing) between two coordinates in degrees
 */
function headingBetween(from, to) {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) 
          - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
function distanceMeters(from, to) {
  const R = 6371e3; // Earth radius in meters
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generate realistic crowding level based on time and random variance
 */
function generateCrowdingLevel() {
  const hour = new Date().getHours();
  const rand = Math.random();
  
  // Peak hours (7-9 AM, 5-7 PM) more likely to be crowded
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    if (rand < 0.1) return 'green';
    if (rand < 0.4) return 'orange';
    if (rand < 0.8) return 'red';
    return 'gray';
  }
  
  // Off-peak hours less crowded
  if (rand < 0.5) return 'green';
  if (rand < 0.8) return 'orange';
  if (rand < 0.95) return 'red';
  return 'gray';
}

/**
 * Fetch route coordinates from OSRM
 */
async function fetchRouteCoordinates(origin, dest) {
  const url = `${OSRM_URL}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  
  try {
    const { data } = await axios.get(url, {
      params: { 
        overview: 'full', 
        geometries: 'geojson',
        continue_straight: 'false'
      },
      timeout: 10000
    });
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    // Convert GeoJSON coordinates [lng, lat] to {lat, lng}
    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ 
      lat, 
      lng 
    }));
    
    console.log(`✓ Route fetched: ${coords.length} points, ${(data.routes[0].distance / 1000).toFixed(1)} km`);
    return coords;
  } catch (error) {
    console.error('✗ Failed to fetch route from OSRM:', error.message);
    throw error;
  }
}

/**
 * Simulate a single vehicle driving along a route
 */
class VehicleSimulator {
  constructor(vehicleId, routePoints, startOffset) {
    this.vehicleId = vehicleId;
    this.routePoints = routePoints;
    this.currentIndex = startOffset;
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Randomize speed within profile
    this.baseSpeed = speedProfile.typical + (Math.random() - 0.5) * 10;
    
    // Random crowding level that changes occasionally
    this.crowdingLevel = generateCrowdingLevel();
    this.crowdingChangeCounter = 0;
  }
  
  connect() {
    console.log(`[${this.vehicleId}] Connecting to ${FLEET_TRACKER_URL}...`);
    
    this.ws = new WebSocket(FLEET_TRACKER_URL);
    
    this.ws.on('open', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log(`[${this.vehicleId}] ✓ Connected`);
    });
    
    this.ws.on('error', (error) => {
      console.error(`[${this.vehicleId}] ✗ WebSocket error:`, error.message);
    });
    
    this.ws.on('close', () => {
      this.connected = false;
      console.log(`[${this.vehicleId}] ✗ Disconnected`);
      this.reconnect();
    });
  }
  
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[${this.vehicleId}] Max reconnection attempts reached. Giving up.`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[${this.vehicleId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => this.connect(), delay);
  }
  
  sendPosition() {
    if (!this.connected || this.routePoints.length < 2) {
      return;
    }
    
    const current = this.routePoints[this.currentIndex % this.routePoints.length];
    const next = this.routePoints[(this.currentIndex + 1) % this.routePoints.length];
    
    // Calculate heading to next point
    const heading = headingBetween(current, next);
    
    // Add speed variance (±20%) to simulate traffic
    const speedVariance = (Math.random() - 0.5) * 0.4 * this.baseSpeed;
    const currentSpeed = Math.max(
      speedProfile.min, 
      Math.min(speedProfile.max, this.baseSpeed + speedVariance)
    );
    
    // Occasionally change crowding level (5% chance each update)
    this.crowdingChangeCounter++;
    if (this.crowdingChangeCounter >= 20) {
      this.crowdingLevel = generateCrowdingLevel();
      this.crowdingChangeCounter = 0;
    }
    
    const position = {
      vehicleId: this.vehicleId,
      lat: current.lat,
      lng: current.lng,
      speed: currentSpeed,
      heading: heading,
      crowdingLevel: this.crowdingLevel,
      timestamp: Date.now()
    };
    
    try {
      this.ws.send(JSON.stringify({
        type: 'gps_position',
        data: position
      }));
      
      // Log occasionally (every 10th update)
      if (this.currentIndex % 10 === 0) {
        console.log(`[${this.vehicleId}] Position: ${current.lat.toFixed(5)},${current.lng.toFixed(5)} | Speed: ${currentSpeed.toFixed(1)} km/h | Crowding: ${this.crowdingLevel}`);
      }
    } catch (error) {
      console.error(`[${this.vehicleId}] Failed to send position:`, error.message);
    }
    
    // Move to next point
    this.currentIndex++;
  }
  
  start() {
    this.connect();
    
    // Send position updates at configured interval
    setInterval(() => {
      this.sendPosition();
    }, PING_INTERVAL_MS);
  }
}

/**
 * Main simulator
 */
async function main() {
  console.log('\n='.repeat(70));
  console.log('DalaSmart Fake Driver Simulator');
  console.log('='.repeat(70));
  console.log(`Configuration:`);
  console.log(`  Fleet Tracker: ${FLEET_TRACKER_URL}`);
  console.log(`  OSRM:          ${OSRM_URL}`);
  console.log(`  Vehicles:      ${NUM_VEHICLES}`);
  console.log(`  Mode:          ${TRANSPORT_MODE}`);
  console.log(`  Speed Range:   ${speedProfile.min}-${speedProfile.max} km/h`);
  console.log(`  Ping Interval: ${PING_INTERVAL_MS}ms`);
  console.log(`  Route:         ${ORIGIN.lat},${ORIGIN.lng} → ${DEST.lat},${DEST.lng}`);
  console.log('='.repeat(70) + '\n');
  
  console.log('Fetching route from OSRM...');
  const routePoints = await fetchRouteCoordinates(ORIGIN, DEST);
  
  console.log(`\nStarting ${NUM_VEHICLES} simulated vehicles...\n`);
  
  const simulators = [];
  for (let i = 0; i < NUM_VEHICLES; i++) {
    const vehicleId = `sim-${TRANSPORT_MODE}-${Date.now()}-${i + 1}`;
    const startOffset = Math.floor((routePoints.length / NUM_VEHICLES) * i);
    
    const simulator = new VehicleSimulator(vehicleId, routePoints, startOffset);
    simulator.start();
    simulators.push(simulator);
    
    // Stagger starts by 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✓ All ${NUM_VEHICLES} vehicles started successfully`);
  console.log('Press Ctrl+C to stop\n');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\nShutting down simulators...');
    simulators.forEach(sim => {
      if (sim.ws) {
        sim.ws.close();
      }
    });
    process.exit(0);
  });
}

// Run simulator
main().catch((error) => {
  console.error('\n✗ Simulator failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Ensure OSRM is running: docker compose ps osrm');
  console.error('  2. Test OSRM manually: curl http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311');
  console.error('  3. Ensure Fleet Tracker WebSocket is running on port 8001');
  console.error('  4. Check OSRM_URL and FLEET_TRACKER_URL environment variables\n');
  process.exit(1);
});
