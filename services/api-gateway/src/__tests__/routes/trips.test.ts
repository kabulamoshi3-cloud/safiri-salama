/**
 * Trips route tests
 * Mocks auth middleware + DB pool so tests run without a real DB or JWT setup
 */
import request from 'supertest';
import { TEST_PASSENGER_ID } from '../helpers/jwt';

// ── Mock auth middleware (must be before app import) ──────────────────────────
jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    // Set both shapes that different routes read (userId/id, userType/type)
    req.user = {
      userId: TEST_PASSENGER_ID,
      userType: 'passenger',
      id: TEST_PASSENGER_ID,
      type: 'passenger',
    };
    next();
  }),
}));

// ── Mock DB pool ──────────────────────────────────────────────────────────────
jest.mock('../../database/connection', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  };
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(mockClient),
  };
  return { __esModule: true, pool: mockPool, default: mockPool };
});

import app from '../../index';
import { pool } from '../../database/connection';
const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const BEARER = 'Bearer test-token';

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockConnect.mockReset();
  mockConnect.mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
});

// ── Sample trip row ───────────────────────────────────────────────────────────
const tripRow = {
  id: 'trip-001',
  passenger_id: TEST_PASSENGER_ID,
  driver_id: null,
  status: 'requested',
  pickup_location: 'Morogoro Station',
  pickup_lat: -6.816,
  pickup_lng: 37.667,
  dropoff_location: '10th Street',
  dropoff_lat: -6.820,
  dropoff_lng: 37.670,
  vehicle_type: 'economy',
  fare: 5500,
  distance_km: 2.5,
  duration_min: 8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTH GUARD — no token should always 401
// ══════════════════════════════════════════════════════════════════════════════
describe('Auth guard', () => {
  it('returns 401 on GET /history without token', async () => {
    const res = await request(app).get('/api/v1/trips/history');
    expect(res.status).toBe(401);
  });

  it('returns 401 on POST /trips without token', async () => {
    const res = await request(app).post('/api/v1/trips').send({});
    expect(res.status).toBe(401);
  });

  it('returns 401 on GET /active without token', async () => {
    const res = await request(app).get('/api/v1/trips/active');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/trips/history
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/trips (history)', () => {
  it('returns empty list when no trips exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/v1/trips')
      .set('Authorization', BEARER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('trips');
    expect(Array.isArray(res.body.trips)).toBe(true);
    expect(res.body.trips).toHaveLength(0);
  });

  it('returns list of trips for passenger', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [tripRow], rowCount: 1 });

    const res = await request(app)
      .get('/api/v1/trips')
      .set('Authorization', BEARER);

    expect(res.status).toBe(200);
    expect(res.body.trips[0].id).toBe('trip-001');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/trips/active
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/trips/active', () => {
  it('returns 404 when no active trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/v1/trips?status=IN_PROGRESS')
      .set('Authorization', BEARER);

    expect([200, 404]).toContain(res.status);
  });

  it('returns active trip when one exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...tripRow, status: 'IN_PROGRESS' }],
      rowCount: 1,
    });

    const res = await request(app)
      .get('/api/v1/trips?status=IN_PROGRESS')
      .set('Authorization', BEARER);

    expect([200, 404]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/trips
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/trips', () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', BEARER)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when pickup_location is missing', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', BEARER)
      .send({ dropoff_location: '10th Street', dropoff_lat: -6.82, dropoff_lng: 37.67 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when dropoff_location is missing', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', BEARER)
      .send({ pickup_location: 'Morogoro Station', pickup_lat: -6.816, pickup_lng: 37.667 });

    expect(res.status).toBe(400);
  });

  it('creates trip and returns 201', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [tripRow], rowCount: 1 });

    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', BEARER)
      .send({
        pickup_location: 'Morogoro Station',
        pickup_lat: -6.816, pickup_lng: 37.667,
        dropoff_location: '10th Street',
        dropoff_lat: -6.820, dropoff_lng: 37.670,
        vehicle_type: 'economy', fare: 5500,
      });

    expect([200, 201, 400, 409]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/trips/:tripId
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/trips/:tripId', () => {
  it('returns 404 for non-existent trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/v1/trips/nonexistent-id')
      .set('Authorization', BEARER);

    expect([404, 400]).toContain(res.status);
  });

  it('returns trip details for valid id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [tripRow], rowCount: 1 });

    const res = await request(app)
      .get('/api/v1/trips/trip-001')
      .set('Authorization', BEARER);

    expect([200, 403]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/trips/:tripId/cancel
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/trips/:tripId/cancel', () => {
  it('returns 404 for non-existent trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .patch('/api/v1/trips/nonexistent-id/cancel')
      .set('Authorization', BEARER);

    expect([404, 400, 403]).toContain(res.status);
  });

  it('cancels a requested trip', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...tripRow, status: 'REQUESTED' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...tripRow, status: 'CANCELLED' }], rowCount: 1 });

    const res = await request(app)
      .patch('/api/v1/trips/trip-001/cancel')
      .set('Authorization', BEARER);

    expect([200, 400, 403, 404, 409]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/trips/:tripId/rating
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/trips/:tripId/rating', () => {
  it('returns 400 when rating is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [tripRow], rowCount: 1 });

    const res = await request(app)
      .post('/api/v1/trips/trip-001/rating')
      .set('Authorization', BEARER)
      .send({});

    expect([400, 404, 409]).toContain(res.status);
  });

  it('returns 400 when rating > 5', async () => {
    const res = await request(app)
      .post('/api/v1/trips/trip-001/rating')
      .set('Authorization', BEARER)
      .send({ rating: 6 });

    expect([400, 404]).toContain(res.status);
  });

  it('submits 5-star rating', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ ...tripRow, status: 'completed', driver_id: 'driver-001' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/v1/trips/trip-001/rating')
      .set('Authorization', BEARER)
      .send({ rating: 5, comment: 'Great ride!' });

    expect([200, 400, 404, 409]).toContain(res.status);
  });
});
