/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Defines which platform roles are permitted to access each route group and
 * exports the `requireRole` helper for composing per-route authorization.
 *
 * Must be used AFTER the `authenticate` middleware so that `req.user` is
 * already populated.
 *
 * Requirements: 19, 21
 */

import { Request, Response, NextFunction } from 'express';
import { UserType } from '@dalasmart/shared-types';

// ---------------------------------------------------------------------------
// Route permission map
// ---------------------------------------------------------------------------

/**
 * Defines which roles are allowed to access each route prefix.
 *
 * The map is keyed by route prefix (matched with `startsWith`). The value is
 * the set of roles that may access any path under that prefix.
 *
 * More specific prefixes should be listed before less specific ones when
 * iterating, but since we use `requireRole` per-route this map is primarily
 * documentation and a convenience reference for the route definitions.
 */
export const ROUTE_PERMISSIONS: Record<string, ReadonlyArray<UserType>> = {
  // Fleet tracking — passengers and drivers read; operators and admins full access
  '/api/v1/fleet': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/ws/fleet': [UserType.Driver, UserType.Operator, UserType.Admin],

  // Payments — passengers initiate; drivers receive; operators and admins manage
  '/api/v1/wallets': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/payments': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/transactions': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],

  // Safety — passengers and drivers submit; operators and admins manage
  '/api/v1/safety': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/incidents': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/emergency': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],

  // Notifications — all roles receive; only operators and admins send
  '/api/v1/notifications': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],

  // Trip planning — passengers and drivers read; admins manage
  '/api/v1/trips': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/routes': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/stops': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],

  // AI Engine — passengers and drivers consume predictions; admins manage models
  '/api/v1/ai': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/predictions': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],
  '/api/v1/search': [UserType.Passenger, UserType.Driver, UserType.Operator, UserType.Admin],

  // Admin-only management endpoints
  '/api/v1/admin': [UserType.Admin],
  '/api/v1/users': [UserType.Operator, UserType.Admin],
  '/api/v1/system': [UserType.Admin],
};

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns an Express middleware that allows only the specified roles to
 * proceed. All other authenticated users receive HTTP 403.
 *
 * Usage:
 * ```ts
 * router.get('/api/v1/admin/users', authenticate, requireRole(UserType.Admin), handler);
 * router.post('/api/v1/payments', authenticate, requireRole(UserType.Passenger, UserType.Driver), handler);
 * ```
 *
 * @param roles - One or more `UserType` values that are permitted.
 */
export function requireRole(
  ...roles: ReadonlyArray<UserType>
): (req: Request, res: Response, next: NextFunction) => void {
  if (roles.length === 0) {
    throw new Error('requireRole must be called with at least one role.');
  }

  const allowedSet = new Set<UserType>(roles);

  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    // `authenticate` must run before this middleware.
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      });
      return;
    }

    if (!allowedSet.has(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Required role(s): ${[...allowedSet].join(', ')}. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Convenience role sets
// ---------------------------------------------------------------------------

/** All four platform roles. */
export const ALL_ROLES: ReadonlyArray<UserType> = [
  UserType.Passenger,
  UserType.Driver,
  UserType.Operator,
  UserType.Admin,
];

/** Roles with operational management access. */
export const MANAGEMENT_ROLES: ReadonlyArray<UserType> = [
  UserType.Operator,
  UserType.Admin,
];

/** Admin-only access. */
export const ADMIN_ONLY: ReadonlyArray<UserType> = [UserType.Admin];

/** Passenger and driver access (end-user roles). */
export const END_USER_ROLES: ReadonlyArray<UserType> = [
  UserType.Passenger,
  UserType.Driver,
];
