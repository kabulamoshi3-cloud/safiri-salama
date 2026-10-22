/**
 * Route Intelligence Service
 * Provides multiple route options, traffic analysis, and dynamic rerouting
 */

import { Router } from 'express';
import axios from 'axios';
import { getDistance } from 'geolib';

const router = Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteOption {
  type: 'fastest' | 'shortest' | 'cheapest' | 'alternative';
  distance: number; // meters
  duration: number; // seconds
  durationInTraffic?: number; // seconds with current traffic
  cost: number; // TZS
  polyline: string;
  steps: RouteStep[];
  trafficCondition: 'light' | 'moderate' | 'heavy';
  warnings?: string[];
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: Location;
  endLocation: Location;
}

interface VehicleType {
  type: 'car' | 'bajaji' | 'boda-boda';
  baseRate: number; // per km
  minimumFare: number;
  speedFactor: number; // adjustment for vehicle speed
}

// Vehicle pricing configuration
const VEHICLE_TYPES: Record<string, VehicleType> = {
  car: {
    type: 'car',
    baseRate: 1500, // TZS per km
    minimumFare: 3000,
    speedFactor: 1.0
  },
  bajaji: {
    type: 'bajaji',
    baseRate: 1000, // TZS per km
    minimumFare: 2000,
    speedFactor: 0.8 // Slightly slower in traffic
  },
  'boda-boda': {
    type: 'boda-boda',
    baseRate: 800, // TZS per km
    minimumFare: 1500,
    speedFactor: 1.2 // Can navigate traffic faster
  }
};

// ═══════════════════════════════════════════════════════════
// CALCULATE ROUTE COST
// ═══════════════════════════════════════════════════════════

function calculateRouteCost(
  distanceMeters: number,
  durationSeconds: number,
  vehicleType: string,
  trafficMultiplier: number = 1.0
): number {
  const vehicle = VEHICLE_TYPES[vehicleType] || VEHICLE_TYPES.car;
  const distanceKm = distanceMeters / 1000;
  
  let cost = vehicle.baseRate * distanceKm;
  
  // Apply traffic surcharge
  cost *= trafficMultiplier;
  
  // Apply minimum fare
  cost = Math.max(cost, vehicle.minimumFare);
  
  return Math.round(cost);
}

// ═══════════════════════════════════════════════════════════
// ANALYZE TRAFFIC CONDITION
// ═══════════════════════════════════════════════════════════

function analyzeTraffic(duration: number, durationInTraffic: number): {
  condition: 'light' | 'moderate' | 'heavy';
  multiplier: number;
} {
  const ratio = durationInTraffic / duration;
  
  if (ratio < 1.2) {
    return { condition: 'light', multiplier: 1.0 };
  } else if (ratio < 1.5) {
    return { condition: 'moderate', multiplier: 1.15 };
  } else {
    return { condition: 'heavy', multiplier: 1.3 };
  }
}

// ═══════════════════════════════════════════════════════════
// GET MULTIPLE ROUTE OPTIONS
// ═══════════════════════════════════════════════════════════

router.post('/calculate', async (req, res) => {
  try {
    const {
      origin,
      destination,
      vehicleType = 'car',
      alternatives = true
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'origin and destination required',
        required: {
          origin: { latitude: 'number', longitude: 'number' },
          destination: { latitude: 'number', longitude: 'number' }
        }
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        error: 'Google Maps API key not configured'
      });
    }

    // Call Google Directions API
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          alternatives: alternatives,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({
        error: 'Unable to calculate route',
        details: response.data.status
      });
    }

    const routes: RouteOption[] = [];
    const allRoutes = response.data.routes;

    // Process each route
    for (let i = 0; i < allRoutes.length; i++) {
      const route = allRoutes[i];
      const leg = route.legs[0];

      const distance = leg.distance.value;
      const duration = leg.duration.value;
      const durationInTraffic = leg.duration_in_traffic?.value || duration;

      const traffic = analyzeTraffic(duration, durationInTraffic);
      const cost = calculateRouteCost(distance, durationInTraffic, vehicleType, traffic.multiplier);

      const steps: RouteStep[] = leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
        distance: step.distance.value,
        duration: step.duration.value,
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng
        }
      }));

      let routeType: 'fastest' | 'shortest' | 'cheapest' | 'alternative' = 'alternative';
      
      if (i === 0) {
        // First route is typically the recommended one
        routeType = durationInTraffic === Math.min(...allRoutes.map((r: any) => 
          r.legs[0].duration_in_traffic?.value || r.legs[0].duration.value
        )) ? 'fastest' : 'shortest';
      }

      routes.push({
        type: routeType,
        distance,
        duration,
        durationInTraffic,
        cost,
        polyline: route.overview_polyline.points,
        steps,
        trafficCondition: traffic.condition,
        warnings: route.warnings
      });
    }

    // Sort routes: fastest, shortest, then alternatives
    routes.sort((a, b) => {
      if (a.type === 'fastest') return -1;
      if (b.type === 'fastest') return 1;
      if (a.type === 'shortest') return -1;
      if (b.type === 'shortest') return 1;
      return a.cost - b.cost;
    });

    // Mark the cheapest route
    if (routes.length > 1) {
      const cheapestIndex = routes.reduce((minIdx, route, idx, arr) => 
        route.cost < arr[minIdx].cost ? idx : minIdx, 0
      );
      if (routes[cheapestIndex].type === 'alternative') {
        routes[cheapestIndex].type = 'cheapest';
      }
    }

    res.json({
      routes,
      vehicleType,
      summary: {
        totalRoutes: routes.length,
        fastestDuration: Math.min(...routes.map(r => r.durationInTraffic || r.duration)),
        shortestDistance: Math.min(...routes.map(r => r.distance)),
        cheapestCost: Math.min(...routes.map(r => r.cost)),
        averageTraffic: routes[0].trafficCondition
      }
    });

  } catch (error: any) {
    console.error('Route calculation error:', error.message);
    res.status(500).json({
      error: 'Failed to calculate routes',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// CHECK TRAFFIC CONDITIONS
// ═══════════════════════════════════════════════════════════

router.post('/traffic', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination || !GOOGLE_MAPS_API_KEY) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK') {
      const leg = response.data.routes[0].legs[0];
      const duration = leg.duration.value;
      const durationInTraffic = leg.duration_in_traffic?.value || duration;
      const traffic = analyzeTraffic(duration, durationInTraffic);

      res.json({
        trafficCondition: traffic.condition,
        normalDuration: duration,
        currentDuration: durationInTraffic,
        delay: durationInTraffic - duration,
        delayPercentage: Math.round(((durationInTraffic - duration) / duration) * 100)
      });
    } else {
      res.status(400).json({ error: 'Unable to fetch traffic data' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// COMPARE VEHICLE TYPES
// ═══════════════════════════════════════════════════════════

router.post('/compare-vehicles', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination required' });
    }

    const directDistance = getDistance(origin, destination);

    // Estimate duration based on average speed
    const estimates = Object.entries(VEHICLE_TYPES).map(([type, vehicle]) => {
      const avgSpeed = 30 * vehicle.speedFactor; // km/h
      const distanceKm = directDistance / 1000;
      const durationMinutes = (distanceKm / avgSpeed) * 60;

      return {
        vehicleType: type,
        estimatedCost: calculateRouteCost(directDistance, durationMinutes * 60, type),
        estimatedDuration: Math.round(durationMinutes),
        estimatedDistance: directDistance,
        baseRate: vehicle.baseRate,
        minimumFare: vehicle.minimumFare
      };
    });

    // Sort by cost
    estimates.sort((a, b) => a.estimatedCost - b.estimatedCost);

    res.json({
      comparison: estimates,
      recommendation: estimates[0].vehicleType,
      directDistance
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SUGGEST ALTERNATIVE ROUTE (during trip)
// ═══════════════════════════════════════════════════════════

router.post('/reroute', async (req, res) => {
  try {
    const { currentLocation, destination, originalRoute } = req.body;

    if (!currentLocation || !destination) {
      return res.status(400).json({ error: 'currentLocation and destination required' });
    }

    // Get new route from current position
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: `${currentLocation.latitude},${currentLocation.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          alternatives: true,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK') {
      const newRoute = response.data.routes[0].legs[0];
      const newDuration = newRoute.duration_in_traffic?.value || newRoute.duration.value;

      res.json({
        shouldReroute: true,
        newRoute: {
          distance: newRoute.distance.value,
          duration: newDuration,
          polyline: response.data.routes[0].overview_polyline.points,
          steps: newRoute.steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.value,
            duration: step.duration.value
          }))
        },
        reason: 'Traffic conditions updated'
      });
    } else {
      res.json({ shouldReroute: false });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
