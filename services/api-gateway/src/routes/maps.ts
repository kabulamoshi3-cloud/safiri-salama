/**
 * Maps Routes
 * Directions (route drawing) + Places (address autocomplete)
 * Uses Google Maps API key
 */

import { Router, Request, Response } from 'express';

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyASYw4Rk2vO1qG60l6D6dZQxUUuzSSJZw8';

/**
 * GET /api/v1/maps/directions
 * Get route between two points (for drawing polyline on map)
 * Returns encoded polyline + distance + duration
 */
router.get('/directions', async (req: Request, res: Response) => {
  try {
    const { originLat, originLng, destLat, destLng, mode } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'originLat, originLng, destLat, destLng required' });
    }

    const travelMode = mode || 'driving';
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${travelMode}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found', googleStatus: data.status });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Decode polyline to coordinates array
    const points = decodePolyline(route.overview_polyline.points);

    res.json({
      polyline: route.overview_polyline.points,
      coordinates: points,
      distance: {
        text: leg.distance.text,
        meters: leg.distance.value,
      },
      duration: {
        text: leg.duration.text,
        seconds: leg.duration.value,
      },
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      steps: leg.steps.map((s: any) => ({
        instruction: s.html_instructions?.replace(/<[^>]*>/g, ''),
        distance: s.distance.text,
        duration: s.duration.text,
      })),
    });
  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({ error: 'Failed to get directions' });
  }
});

/**
 * GET /api/v1/maps/autocomplete?input=karia&lat=-6.79&lng=39.20
 * Address autocomplete (as user types)
 */
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { input, lat, lng } = req.query;

    if (!input) return res.status(400).json({ error: 'input required' });

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}&key=${GOOGLE_API_KEY}&components=country:tz`;

    // Bias results to user's location
    if (lat && lng) {
      url += `&location=${lat},${lng}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: 'Autocomplete failed', googleStatus: data.status });
    }

    const suggestions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text,
      secondaryText: p.structured_formatting?.secondary_text,
    }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/v1/maps/place-details?placeId=xxx
 * Get coordinates from a place ID (after user selects suggestion)
 */
router.get('/place-details', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.query;

    if (!placeId) return res.status(400).json({ error: 'placeId required' });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Place not found' });
    }

    const place = data.result;
    res.json({
      placeId,
      name: place.name,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    });
  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({ error: 'Failed to get place details' });
  }
});

/**
 * GET /api/v1/maps/geocode?lat=X&lng=Y
 * Reverse geocode (coordinates → address)
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results.length) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const result = data.results[0];
    res.json({
      address: result.formatted_address,
      latitude: parseFloat(lat as string),
      longitude: parseFloat(lng as string),
      components: result.address_components.map((c: any) => ({
        name: c.long_name,
        type: c.types[0],
      })),
    });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: 'Failed to geocode' });
  }
});

/**
 * GET /api/v1/maps/fare-estimate
 * Calculate fare based on route distance + vehicle type
 */
router.get('/fare-estimate', async (req: Request, res: Response) => {
  try {
    const { originLat, originLng, destLat, destLng, vehicleType } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Origin and destination coordinates required' });
    }

    // Get actual route distance from Google
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes.length) {
      return res.status(404).json({ error: 'Could not calculate route' });
    }

    const leg = data.routes[0].legs[0];
    const distanceKm = leg.distance.value / 1000;
    const durationMin = leg.duration.value / 60;

    // Pricing per vehicle type (TZS)
    const pricing: Record<string, { base: number; perKm: number; perMin: number; minFare: number }> = {
      'car': { base: 3000, perKm: 1500, perMin: 50, minFare: 5000 },
      'bajaji': { base: 2000, perKm: 1000, perMin: 30, minFare: 3000 },
      'boda-boda': { base: 1500, perKm: 800, perMin: 25, minFare: 2000 },
    };

    const type = (vehicleType as string) || 'car';
    const rate = pricing[type] || pricing['car'];

    let fare = rate.base + (rate.perKm * distanceKm) + (rate.perMin * durationMin);
    fare = Math.max(fare, rate.minFare);
    fare = Math.round(fare / 100) * 100; // Round to nearest 100

    res.json({
      vehicleType: type,
      distance: { text: leg.distance.text, km: Math.round(distanceKm * 10) / 10 },
      duration: { text: leg.duration.text, minutes: Math.round(durationMin) },
      fare: {
        amount: fare,
        currency: 'TZS',
        formatted: `Sh ${fare.toLocaleString()}`,
      },
      breakdown: {
        baseFare: rate.base,
        distanceCharge: Math.round(rate.perKm * distanceKm),
        timeCharge: Math.round(rate.perMin * durationMin),
      },
      allVehicles: Object.keys(pricing).map(v => {
        const r = pricing[v];
        let f = r.base + (r.perKm * distanceKm) + (r.perMin * durationMin);
        f = Math.max(f, r.minFare);
        f = Math.round(f / 100) * 100;
        return { type: v, fare: f, formatted: `Sh ${f.toLocaleString()}` };
      }),
    });
  } catch (error) {
    console.error('Fare estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate fare' });
  }
});

/**
 * Decode Google encoded polyline to array of coordinates
 */
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default router;
