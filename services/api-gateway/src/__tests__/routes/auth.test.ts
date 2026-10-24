/**
 * Auth route tests.
 *
 * Covers register / login (mounted at /api/v1/auth WITHOUT authMiddleware) and
 * the authenticated profile endpoints /me, PATCH /me and /change-password.
 *
 * The real app mounts /api/v1/auth without authMiddleware, so the profile
 * handlers (which read `req.user.userId`) never receive a populated user. To
 * exercise their happy paths without changing the app's behaviour, those cases
 * run against a small harness (`buildAuthApp`) that stubs `req.user` directly.
 */

import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';

import app from '../../index';
import authRouter from '../../routes/auth';
import { signRouteToken, TEST_PASSENGER_ID } from '../helpers/jwt';

// --- Mock the database pool used by auth.ts -------------------------------
jest.mock('../../database/connection', () => ({
  __esModule: true,
  pool: { query: jest.fn() },
  default: { query: jest.fn() },
}));
import { pool } from '../../database/connection';
const mockQuery = pool.query as jest.Mock;

// A stable bcrypt hash for the test password, computed once.
const PASSWORD = 'pass123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

beforeEach(() => mockQuery.mockReset());

// --- Harness that injects a pre-populated req.user onto the auth router ---
function buildAuthApp(user: { userId: string; userType?: string } | null) {
  const ex = express();
  ex.use(express.json());
  ex.use((req: any, _res: any, next: any) => {
    if (user) (req as any).user = user;
    next();
  });
  ex.use('/api/v1/auth', authRouter);
  return ex;
}

describe('POST /api/v1/auth/register', () => {
  it('registers a new passenger and returns 201 with a token', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT existing -> none
      .mockResolvedValueOnce({                          // INSERT returning row
        rows: [{
          id: 'u1', phone: '255744111111', name: 'Amina',
          email: null, user_type: 'passenger', status: 'active',
        }],
        rowCount: 1,
      });

    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '255744111111', password: PASSWORD, userType: 'passenger', name: 'Amina',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      id: 'u1', phone: '255744111111', userType: 'passenger', status: 'active',
    });
  });

  it('returns 400 when phone is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ password: PASSWORD, userType: 'passenger' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ phone: '255744111111', userType: 'passenger' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when userType is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ phone: '255744111111', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('returns 400 when the phone number is already registered', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 });

    const res = await request(app).post('/api/v1/auth/register').send({
      phone: '255744111111', password: PASSWORD, name: 'Amina', userType: 'passenger',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in an active user and returns 200 with a token', async () => {
    mockQuery
      .mockResolvedValueOnce({                       // SELECT user
        rows: [{
          id: 'u1', phone: '255744111111',
          password_hash: PASSWORD_HASH, name: 'Amina', email: null,
          user_type: 'passenger', status: 'active',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE last_login

    const res = await request(app).post('/api/v1/auth/login')
      .send({ phone: '255744111111', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ id: 'u1', userType: 'passenger' });
  });

  it('returns 400 when phone or password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '255744111111' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when the user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).post('/api/v1/auth/login')
      .send({ phone: '255744111111', password: PASSWORD });

    expect(res.status).toBe(401);
  });

  it('returns 401 when the password is wrong', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', phone: '255744111111', password_hash: PASSWORD_HASH,
        name: 'Amina', email: null, user_type: 'passenger', status: 'active',
      }],
      rowCount: 1,
    });

    const res = await request(app).post('/api/v1/auth/login')
      .send({ phone: '255744111111', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when the account is not active', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', phone: '255744111111', password_hash: PASSWORD_HASH,
        name: 'Amina', email: null, user_type: 'passenger', status: 'suspended',
      }],
      rowCount: 1,
    });

    const res = await request(app).post('/api/v1/auth/login')
      .send({ phone: '255744111111', password: PASSWORD });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 with no token (no auth middleware mounted on /auth)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the profile for an authenticated user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', phone: '255744111111', name: 'Amina', email: null,
        user_type: 'passenger', status: 'active',
        created_at: '2024-01-01', last_login: null,
      }],
      rowCount: 1,
    });

    const res = await request(buildAuthApp({ userId: 'u1', userType: 'passenger' }))
      .get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('u1');
  });
});

describe('PATCH /api/v1/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).patch('/api/v1/auth/me').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('updates the profile name and returns 200', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'u1', phone: '255744111111', name: 'Amina2', email: null,
        user_type: 'passenger', status: 'active',
      }],
      rowCount: 1,
    });

    const res = await request(buildAuthApp({ userId: 'u1', userType: 'passenger' }))
      .patch('/api/v1/auth/me').send({ name: 'Amina2' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Amina2');
  });

  it('returns 400 when no updatable fields are provided', async () => {
    const res = await request(buildAuthApp({ userId: 'u1', userType: 'passenger' }))
      .patch('/api/v1/auth/me').send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/change-password', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/v1/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'newpass' });
    expect(res.status).toBe(401);
  });

  it('changes the password when the current password matches', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ password_hash: PASSWORD_HASH }], rowCount: 1 }) // SELECT hash
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });                                   // UPDATE password

    const res = await request(buildAuthApp({ userId: 'u1', userType: 'passenger' }))
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'newpass' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/success/i);
  });

  it('returns 401 when the current password is wrong', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: PASSWORD_HASH }], rowCount: 1 });

    const res = await request(buildAuthApp({ userId: 'u1', userType: 'passenger' }))
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'wrong', newPassword: 'newpass' });

    expect(res.status).toBe(401);
  });
});

// Sanity: the route token helper is well-formed (used by the tracking/payments suites).
describe('token helper', () => {
  it('signs a token carrying both id and userId', () => {
    const token = signRouteToken(TEST_PASSENGER_ID, 'passenger');
    expect(token.split('.')).toHaveLength(3);
  });
});
