/**
 * Payments route tests.
 *
 * /api/v1/payments/* sits behind `authMiddleware`, which sets `req.user` to the
 * full decoded token. The payments handlers read `user.id` (and `(req as any).user`
 * for the auth guard), so the Bearer token is signed with `id` (see helpers/jwt.ts).
 *
 * `database.getClient()` returns a mock PoolClient whose `query` cycles through a
 * list of prepared responses (defaulting to an empty result). The module-level
 * `database.query` (used only to auto-expire pending transactions) is also mocked.
 */

import request from 'supertest';

import app from '../../index';
import { signRouteToken, TEST_PASSENGER_ID } from '../helpers/jwt';

// --- Mock the database module used by payments.ts -------------------------
jest.mock('../../database', () => {
  const db = {
    getClient: jest.fn(),
    query: jest.fn(),
    close: jest.fn(),
    pool: {},
  };
  return { __esModule: true, default: db, ...db };
});
import database from '../../database';
const mockGetClient = database.getClient as jest.Mock;
const mockQuery = database.query as jest.Mock;

const token = signRouteToken(TEST_PASSENGER_ID, 'passenger');

/** A mock pg client whose `query` returns prepared responses in order. */
function makeMockClient(responses: any[] = []) {
  let i = 0;
  return {
    query: jest.fn().mockImplementation(() =>
      Promise.resolve(responses[i++] ?? { rows: [], rowCount: 0 })
    ),
    release: jest.fn(),
  };
}

beforeEach(() => {
  mockGetClient.mockReset();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 }); // module-level query default
  // Default client so any unexpected getClient call does not throw.
  mockGetClient.mockResolvedValue(makeMockClient());
});

describe('GET /api/v1/payments/info', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/payments/info');
    expect(res.status).toBe(401);
  });

  it('returns the registered phone, payment methods and wallet balance', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '255744123456', name: 'Amina', wallet_balance: 5000 }],
      rowCount: 1,
    }]));

    const res = await request(app).get('/api/v1/payments/info')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.registered_phone).toBe('255744123456');
    expect(Array.isArray(res.body.payment_methods)).toBe(true);
    expect(res.body.wallet_balance).toBe(5000);
  });
});

describe('POST /api/v1/payments/pay', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/v1/payments/pay')
      .send({ amount: 1000, method: 'mpesa' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when the amount is below the minimum', async () => {
    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50, method: 'mpesa' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid payment method', async () => {
    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'bitcoin' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when context_id is not a UUID', async () => {
    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'mpesa', context_id: 'abc-123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when the phone provider does not match the method', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '0681234567', name: 'A', wallet_balance: 0 }],
      rowCount: 1,
    }]));

    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'mpesa', context: 'ride' });

    expect(res.status).toBe(400);
    expect(res.body.detected_provider).toBe('airtel_money');
  });

  it('records a cash payment as pending_confirmation', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '0744123456', name: 'A', wallet_balance: 0 }],
      rowCount: 1,
    }]));

    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'cash', context: 'ride' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending_confirmation');
    expect(res.body.reference).toBeTruthy();
  });

  it('completes instantly when the wallet has sufficient balance', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '0744123456', name: 'A', wallet_balance: 5000 }],
      rowCount: 1,
    }]));

    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'wallet', context: 'ride' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.reference).toBeTruthy();
  });

  it('returns 400 with a shortfall when the wallet balance is too low', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '0744123456', name: 'A', wallet_balance: 1000 }],
      rowCount: 1,
    }]));

    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10000, method: 'wallet', context: 'ride' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('shortfall');
  });

  it('initiates an M-Pesa STK push and returns pending with a poll_url', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{ phone: '0744123456', name: 'A', wallet_balance: 0 }],
      rowCount: 1,
    }]));

    const res = await request(app).post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'mpesa', context: 'ride' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.poll_url).toBeTruthy();
  });
});

describe('GET /api/v1/payments/status/:reference', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/payments/status/ref-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when the transaction is not found', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{ rows: [], rowCount: 0 }]));

    const res = await request(app).get('/api/v1/payments/status/ref-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns the transaction status when found', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{
        status: 'pending', method: 'mobile_money', provider: 'mpesa',
        amount: 1000, phone_number: '255744123456', description: 'Ride',
        created_at: '2024-01-01T00:00:00Z', completed_at: null,
        failure_reason: null, expires_at: '2099-01-01T00:00:00Z',
      }],
      rowCount: 1,
    }]));

    const res = await request(app).get('/api/v1/payments/status/ref-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.reference).toBe('ref-1');
  });
});

describe('GET /api/v1/payments/receipt/:reference', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/payments/receipt/ref-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when the receipt is not found', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{ rows: [], rowCount: 0 }]));

    const res = await request(app).get('/api/v1/payments/receipt/ref-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns the receipt for a completed transaction', async () => {
    mockGetClient.mockResolvedValueOnce(makeMockClient([{
      rows: [{
        reference: 'ref-1', completed_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z', description: 'Ride', amount: 1000,
        provider: 'mpesa', phone_number: '255744123456', status: 'completed',
        provider_txn_id: 'p1', payer_name: 'Amina', payer_phone: '0744123456',
        context: 'ride',
      }],
      rowCount: 1,
    }]));

    const res = await request(app).get('/api/v1/payments/receipt/ref-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.receipt.reference).toBe('ref-1');
    expect(res.body.receipt.amount).toBeTruthy();
    expect(res.body.receipt.method).toBe('M-Pesa');
  });
});
