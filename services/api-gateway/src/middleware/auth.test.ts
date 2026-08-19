/**
 * Unit tests for the JWT authentication middleware.
 *
 * Tests cover:
 *  - Missing Authorization header → 401
 *  - Malformed Authorization header → 401
 *  - Expired token → 401 TOKEN_EXPIRED
 *  - Invalid signature → 401 INVALID_TOKEN
 *  - Missing required claims → 401 INVALID_TOKEN
 *  - Valid token → req.user populated, next() called
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
import { UserType } from '@dalasmart/shared-types';

import { authenticate, JwtPayload } from './auth';

// ---------------------------------------------------------------------------
// Test RSA key pair (generated once for the test suite)
// ---------------------------------------------------------------------------

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidPayload(overrides: Partial<JwtPayload> = {}): Omit<JwtPayload, 'iat' | 'exp'> {
  return {
    sub: 'user-uuid-123',
    role: UserType.Passenger,
    phone: '+255712345678',
    name: 'Amina Hassan',
    language: 'sw',
    jti: 'jwt-id-abc',
    ...overrides,
  };
}

function signToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn } as jwt.SignOptions);
}

function mockRequest(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function mockResponse(): { res: Partial<Response>; statusCode: number; body: unknown } {
  const ctx = { statusCode: 0, body: null as unknown };
  const res: Partial<Response> = {
    status: jest.fn().mockImplementation((code: number) => {
      ctx.statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((data: unknown) => {
      ctx.body = data;
      return res;
    }),
  };
  return { res, statusCode: ctx.statusCode, body: ctx.body };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_PUBLIC_KEY: publicKey };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = mockRequest() as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header has wrong scheme', () => {
    const req = mockRequest('Basic dXNlcjpwYXNz') as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 TOKEN_EXPIRED for an expired token', () => {
    const token = signToken(makeValidPayload(), -1); // expired 1 second ago
    const req = mockRequest(`Bearer ${token}`) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    const body = (res.json as jest.Mock).mock.calls[0][0] as { error: string };
    expect(body.error).toBe('TOKEN_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_TOKEN for a token signed with a different key', () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = jwt.sign(makeValidPayload(), otherKey, { algorithm: 'RS256', expiresIn: '1h' });
    const req = mockRequest(`Bearer ${token}`) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    const body = (res.json as jest.Mock).mock.calls[0][0] as { error: string };
    expect(body.error).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_TOKEN when required claims are missing', () => {
    // Token without the `role` claim
    const token = jwt.sign({ sub: 'user-uuid-123' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
    const req = mockRequest(`Bearer ${token}`) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    const body = (res.json as jest.Mock).mock.calls[0][0] as { error: string };
    expect(body.error).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('populates req.user and calls next() for a valid token', () => {
    const payload = makeValidPayload();
    const token = signToken(payload);
    const req = mockRequest(`Bearer ${token}`) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(payload.sub);
    expect(req.user?.role).toBe(payload.role);
    expect(req.user?.phone).toBe(payload.phone);
    expect(req.user?.language).toBe(payload.language);
    expect(req.user?.jti).toBe(payload.jti);
  });

  it('accepts tokens for all four platform roles', () => {
    const roles = [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin];

    for (const role of roles) {
      const token = signToken(makeValidPayload({ role }));
      const req = mockRequest(`Bearer ${token}`) as Request;
      const { res } = mockResponse();
      const next = jest.fn() as NextFunction;

      authenticate(req, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user?.role).toBe(role);
    }
  });

  it('returns 500 when JWT_PUBLIC_KEY env var is not set', () => {
    delete process.env['JWT_PUBLIC_KEY'];

    const token = signToken(makeValidPayload());
    const req = mockRequest(`Bearer ${token}`) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    authenticate(req, res as Response, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });
});
