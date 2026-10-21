/**
 * Tracking route tests.
 *
 * All /api/v1/tracking/* routes sit behind `authMiddleware` (mounted on /api),
 * so every authenticated case sends a Bearer token signed with both `id` and
 * `userId` (see helpers/jwt.ts). The database pool and axios are mocked so no
 * real DB or OpenRouteService call is made.
 */

import request from 'supertest';

import app from '../../index';
import { signRouteToken, TEST_DRIVER_ID } from '../helpers/jwt';

// --- Mocks ----------------------------------------------------------------
jest.mock('../../database/connection', () => ({
  __esModule: true,
  pool: { query: jest.fn() },
  default: { query: jest.fn() },
}));
import { pool } from '../../database/connection';
const mockQuery = pool.query as jest.Mock;

jest.mock('axios');
import axios from 'axios';
const mockAxiosPost = axios.post as jest.Mock;

const token = signRouteToken(TEST_DRIVER_ID, 'driver');

beforeEach(() => {
  mockQuery.mockReset();
  mockAxiosPost.mockReset();
  // Safe default so any unmocked axios call resolves instead of throwing.
  mockAxiosPost.mockResolvedValue({ data: {} });
  delete process.env.ORS_API_KEY;
});

// A unique driver id per realtime test so the in-memory store does not collide.
const REALTIME_DRIVER = '33333333-3333-3333-3333-333333333333';
const realtimeToken = signRouteToken(REALTIME_DRIVER, 'driver');

describe('POST /api/v1/tracking/driver/update', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/v1/tracking/driver/update')
      .send({ latitude: -6.8, longitude: 39.2 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when latitude is missing', async () => {
    const res = await request(app).post('/api/v1/tracking/driver/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ longitude: 39.2 });
    expect(res.status).toBe(400);
  });

  it('returns 200 when the location is valid', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 }); // fire-and-forget persist
    const res = await request(app).post('/api/v1/tracking/driver/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: -6.8, longitude: 39.2, heading: 90, speed: 30 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });
});

describe('POST /api/v1/tracking/driver/location', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/v1/tracking/driver/location')
      .send({ lat: -6.8, lng: 39.2 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when lat is missing', async () => {
    const res = await request(app).post('/api/v1/tracking/driver/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ lng: 39.2 });
    expect(res.status).toBe(400);
  });

  it('returns 200 with the trip_id echoed back', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app).post('/api/v1/tracking/driver/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: -6.8, lng: 39.2, trip_id: 'trip-1' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.trip_id).toBe('trip-1');
  });
});

describe('GET /api/v1/tracking/driver/:driverId', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get(`/api/v1/tracking/driver/${TEST_DRIVER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns the realtime location after a driver update', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await request(app).post('/api/v1/tracking/driver/update')
      .set('Authorization', `Bearer ${realtimeToken}`)
      .send({ latitude: -6.79, longitude: 39.21, heading: 45, speed: 20 });

    const res = await request(app).get(`/api/v1/tracking/driver/${REALTIME_DRIVER}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('realtime');
    expect(res.body.driverId).toBe(REALTIME_DRIVER);
  });

  it('returns 404 when the driver is not in memory or DB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/v1/tracking/driver/unknown-driver')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/tracking/nearby', () => {
  it('returns 400 when lat is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/nearby?lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lng is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/nearby?lat=-6.8')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 200 with a drivers array', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // DB fallback empty
    const res = await request(app).get('/api/v1/tracking/nearby?lat=-6.8&lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.drivers)).toBe(true);
    expect(res.body).toHaveProperty('count');
  });
});

describe('POST /api/v1/tracking/driver/offline', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/v1/tracking/driver/offline');
    expect(res.status).toBe(401);
  });

  it('returns 200 with status offline', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app).post('/api/v1/tracking/driver/offline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('offline');
  });
});

describe('POST /api/v1/tracking/calculate-route', () => {
  const validBody = { from_lat: -6.8, from_lng: 39.2, to_lat: -6.79, to_lng: 39.21 };

  it('returns 400 when from_lat is missing', async () => {
    const res = await request(app).post('/api/v1/tracking/calculate-route')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_lng: 39.2, to_lat: -6.79, to_lng: 39.21 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when to_lng is missing', async () => {
    const res = await request(app).post('/api/v1/tracking/calculate-route')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_lat: -6.8, from_lng: 39.2, to_lat: -6.79 });
    expect(res.status).toBe(400);
  });

  it('returns a straight-line estimate when ORS_API_KEY is absent', async () => {
    delete process.env.ORS_API_KEY;
    const res = await request(app).post('/api/v1/tracking/calculate-route')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.is_estimate).toBe(true);
    expect(res.body).toHaveProperty('distance_km');
    expect(res.body).toHaveProperty('duration_minutes');
    expect(res.body).toHaveProperty('fare_tzs');
    expect(Array.isArray(res.body.polyline_coords)).toBe(true);
    expect(Array.isArray(res.body.steps)).toBe(true);
  });

  it('returns an ORS route (is_estimate=false) when ORS responds', async () => {
    process.env.ORS_API_KEY = 'test-key';
    mockAxiosPost.mockResolvedValueOnce({
      data: {
        features: [{
          properties: {
            summary: { distance: 5000, duration: 600 },
            segments: [{ steps: [{ instruction: 'Turn left', distance: 100 }] }],
          },
          geometry: { coordinates: [[39.2, -6.8], [39.21, -6.79]] },
        }],
      },
    });

    const res = await request(app).post('/api/v1/tracking/calculate-route')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.is_estimate).toBe(false);
    expect(res.body.distance_km).toBeCloseTo(5, 1);
    expect(res.body.duration_minutes).toBeCloseTo(10, 1);
    expect(res.body.steps[0].instruction).toBe('Turn left');
  });
});

describe('GET /api/v1/tracking/route', () => {
  it('returns 400 when trip_id is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/route')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown trip_id', async () => {
    const res = await request(app).get('/api/v1/tracking/route?trip_id=unknown')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns a stored route after calculate-route', async () => {
    await request(app).post('/api/v1/tracking/calculate-route')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from_lat: -6.8, from_lng: 39.2, to_lat: -6.79, to_lng: 39.21,
        trip_id: 'stored-trip',
      });

    const res = await request(app).get('/api/v1/tracking/route?trip_id=stored-trip')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('distance_km');
  });
});

describe('GET /api/v1/tracking/trip/:tripId', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/tracking/trip/trip-1');
    expect(res.status).toBe(401);
  });

  it('returns mock tracking data when the DB is unavailable', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/v1/tracking/trip/trip-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('driver_lat');
    expect(res.body).toHaveProperty('driver_lng');
    expect(res.body).toHaveProperty('eta_minutes');
  });
});

describe('GET /api/v1/tracking/nearby-drivers', () => {
  it('returns 400 when lat is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/nearby-drivers?lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lng is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/nearby-drivers?lat=-6.8')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns a driver list when the DB is unavailable', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/v1/tracking/nearby-drivers?lat=-6.8&lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/tracking/traffic', () => {
  it('returns 400 when lat is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/traffic?lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lng is missing', async () => {
    const res = await request(app).get('/api/v1/tracking/traffic?lat=-6.8')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns traffic segments when the DB is unavailable', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app).get('/api/v1/tracking/traffic?lat=-6.8&lng=39.2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
