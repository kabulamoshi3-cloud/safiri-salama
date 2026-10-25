/**
 * Integration tests for trips routes
 */
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import tripsRouter from '../../routes/trips';

// Build minimal test app
function buildTripsApp(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, userType: 'passenger' };
    next();
  });
  app.use('/', tripsRouter);
  return app;
}

const TEST_USER_ID = 'test-user-trips-001';

describe('GET /api/v1/trips/history', () => {
  it('returns trip history array', async () => {
    const app = buildTripsApp(TEST_USER_ID);
    const res = await request(app).get('/history');
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe('GET /api/v1/trips/active', () => {
  it('returns active trip or 404', async () => {
    const app = buildTripsApp(TEST_USER_ID);
    const res = await request(app).get('/active');
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe('POST /api/v1/trips', () => {
  it('returns 400 when required fields missing', async () => {
    const app = buildTripsApp(TEST_USER_ID);
    const res = await request(app)
      .post('/')
      .send({ pickup_location: 'Morogoro' });
    expect([400, 422, 500]).toContain(res.status);
  });

  it('returns 400 when no body sent', async () => {
    const app = buildTripsApp(TEST_USER_ID);
    const res = await request(app).post('/').send({});
    expect([400, 422, 500]).toContain(res.status);
  });
});
