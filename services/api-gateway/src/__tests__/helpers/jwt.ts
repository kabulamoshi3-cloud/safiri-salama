/**
 * Test JWT helpers.
 *
 * The api-gateway mounts `authMiddleware` on every `/api` route. That middleware
 * does `req.user = decoded` — it passes the ENTIRE decoded JWT payload through
 * (the TypeScript cast to `{ id, type, phone }` is just an assertion, not a
 * filter). Route handlers then read different fields:
 *
 *   - auth.ts routes read  (req as any).user?.userId   (but /api/v1/auth is
 *     mounted WITHOUT authMiddleware, so those handlers are exercised here via
 *     a stub app that sets req.user directly)
 *   - tracking.ts reads   (req as any).user?.userId
 *   - payments.ts reads   (req as any).user?.id        and  (req as any).user
 *
 * `signRouteToken` therefore includes BOTH `id` and `userId` (plus `type`/
 * `userType`/`phone`) so a single token satisfies authMiddleware's verify and
 * every route handler's field read.
 */

import jwt from 'jsonwebtoken';

export const TEST_SECRET = 'test-secret';
export const TEST_PASSENGER_ID = '11111111-1111-1111-1111-111111111111';
export const TEST_DRIVER_ID = '22222222-2222-2222-2222-222222222222';
export const TEST_PHONE = '255744000001';

/** Token carrying both `id` and `userId` — use for routes behind authMiddleware. */
export function signRouteToken(
  userId: string = TEST_PASSENGER_ID,
  userType: string = 'passenger'
): string {
  return jwt.sign(
    { userId, userType, id: userId, type: userType, phone: TEST_PHONE },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

/** Token matching the minimal shape authMiddleware expects: { id, type, phone }. */
export function signAuthToken(
  id: string = TEST_PASSENGER_ID,
  type: 'passenger' | 'driver' | 'operator' | 'admin' = 'passenger'
): string {
  return jwt.sign({ id, type, phone: TEST_PHONE }, TEST_SECRET, { expiresIn: '1h' });
}
