/**
 * Unit tests for the RBAC middleware.
 *
 * Tests cover:
 *  - requireRole returns 401 when req.user is absent
 *  - requireRole returns 403 when user's role is not in the allowed set
 *  - requireRole calls next() when user's role is in the allowed set
 *  - requireRole throws when called with no roles
 *  - Convenience role sets contain the expected roles
 */

import { Request, Response, NextFunction } from 'express';
import { UserType } from '@skyrex/shared-types';

import { requireRole, ALL_ROLES, MANAGEMENT_ROLES, ADMIN_ONLY, END_USER_ROLES } from './rbac';
import { UserContext } from './auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserContext(role: UserType): UserContext {
  return {
    userId: 'user-uuid-test',
    role,
    phone: '+255712345678',
    name: 'Test User',
    language: 'en',
    jti: 'jti-test',
  };
}

function mockRequest(user?: UserContext): Partial<Request> {
  return { user };
}

function mockResponse(): { res: Partial<Response>; getStatusCode: () => number; getBody: () => unknown } {
  let statusCode = 0;
  let body: unknown = null;

  const res: Partial<Response> = {
    status: jest.fn().mockImplementation((code: number) => {
      statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((data: unknown) => {
      body = data;
      return res;
    }),
  };

  return {
    res,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireRole middleware', () => {
  it('throws when called with no roles', () => {
    expect(() => requireRole()).toThrow('requireRole must be called with at least one role.');
  });

  it('returns 401 when req.user is not set', () => {
    const middleware = requireRole(UserType.Passenger);
    const req = mockRequest(undefined) as Request;
    const { res, getStatusCode } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in the allowed set', () => {
    const middleware = requireRole(UserType.Admin);
    const req = mockRequest(makeUserContext(UserType.Passenger)) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(403);
    const body = getBody() as { error: string };
    expect(body.error).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user role is in the allowed set', () => {
    const middleware = requireRole(UserType.Passenger, UserType.Driver);
    const req = mockRequest(makeUserContext(UserType.Driver)) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows all four roles when all are specified', () => {
    const roles = [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin];
    const middleware = requireRole(...roles);

    for (const role of roles) {
      const req = mockRequest(makeUserContext(role)) as Request;
      const { res } = mockResponse();
      const next = jest.fn() as NextFunction;

      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  it('blocks passenger from admin-only route', () => {
    const middleware = requireRole(UserType.Admin);
    const req = mockRequest(makeUserContext(UserType.Passenger)) as Request;
    const { res, getStatusCode } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks driver from operator-only route', () => {
    const middleware = requireRole(UserType.Operator, UserType.Admin);
    const req = mockRequest(makeUserContext(UserType.Driver)) as Request;
    const { res, getStatusCode } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('role set constants', () => {
  it('ALL_ROLES contains all four roles', () => {
    expect(ALL_ROLES).toContain(UserType.Passenger);
    expect(ALL_ROLES).toContain(UserType.Driver);
    expect(ALL_ROLES).toContain(UserType.Operator);
    expect(ALL_ROLES).toContain(UserType.Admin);
    expect(ALL_ROLES).toHaveLength(4);
  });

  it('MANAGEMENT_ROLES contains operator and admin only', () => {
    expect(MANAGEMENT_ROLES).toContain(UserType.Operator);
    expect(MANAGEMENT_ROLES).toContain(UserType.Admin);
    expect(MANAGEMENT_ROLES).not.toContain(UserType.Passenger);
    expect(MANAGEMENT_ROLES).not.toContain(UserType.Driver);
  });

  it('ADMIN_ONLY contains only admin', () => {
    expect(ADMIN_ONLY).toContain(UserType.Admin);
    expect(ADMIN_ONLY).toHaveLength(1);
  });

  it('END_USER_ROLES contains passenger and driver only', () => {
    expect(END_USER_ROLES).toContain(UserType.Passenger);
    expect(END_USER_ROLES).toContain(UserType.Driver);
    expect(END_USER_ROLES).not.toContain(UserType.Operator);
    expect(END_USER_ROLES).not.toContain(UserType.Admin);
  });
});
