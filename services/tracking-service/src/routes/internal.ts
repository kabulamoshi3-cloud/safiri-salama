import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { createClient } from 'redis';

// ── Optional shared-secret guard ──────────────────────────────────────────────
// If INTERNAL_API_SECRET is set, every call must supply the same value in the
// X-Internal-Secret header.  In dev the variable is left unset and the check
// is skipped so the service works out-of-the-box without extra config.
function checkSecret(req: Request, res: Response): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return true; // not configured — skip check
  if (req.headers['x-internal-secret'] === secret) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

// ── Gateway event → normalised trip status ────────────────────────────────────
// Maps the event names that api-gateway sends to the TripStatus string that
// client-side listeners (onTripStatus) expect in the { status } field.
const EVENT_TO_STATUS: Record<string, string> = {
  'trip:requested':       'searching',
  'trip:accepted':        'accepted',
  'trip:driver_arriving': 'arriving',
  'trip:arrived':         'arriving',
  'trip:started':         'in_progress',
  'trip:completed':       'completed',
  'trip:cancelled':       'cancelled',
};

export function createInternalRouter(io: Server): Router {
  const router = Router();

  // Lazy Redis client — only constructed when the router is first called so
  // that imports do not block startup if Redis is unavailable.
  let redisClient: ReturnType<typeof createClient> | null = null;
  function getRedis(): ReturnType<typeof createClient> | null {
    if (redisClient) return redisClient;
    try {
      redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      redisClient.connect().catch(() => { redisClient = null; });
      return redisClient;
    } catch {
      return null;
    }
  }

  // POST /trip-event — receives trip lifecycle events from api-gateway.
  // Normalises them to 'trip:status' with a { status } field so all clients
  // receive a consistent contract regardless of which gateway event fired.
  router.post('/trip-event', async (req: Request, res: Response) => {
    if (!checkSecret(req, res)) return;

    const { event, tripId, ...data } = req.body;

    if (!tripId || !event) {
      res.status(400).json({ error: 'tripId and event are required' });
      return;
    }

    const status = EVENT_TO_STATUS[event as string];

    if (status) {
      const payload = { tripId, status, ...data };

      // Persist the latest status in Redis so that trip:join can replay it
      // to clients who connect after the event was fired (best-effort).
      const rc = getRedis();
      if (rc) {
        try {
          const existing = await rc.get(`trip:${tripId}`);
          const snapshot = existing ? JSON.parse(existing) : {};
          await rc.setEx(`trip:${tripId}`, 3600, JSON.stringify({ ...snapshot, ...payload }));
        } catch {
          // Redis unavailable — continue without snapshot
        }
      }

      // Broadcast normalised status event to all room members
      io.to(`trip:${tripId}`).emit('trip:status', payload);
    } else {
      // Unknown / non-status event — forward as-is (driver:moved, eta:changed, …)
      io.to(`trip:${tripId}`).emit(event, { tripId, ...data });
    }

    res.sendStatus(204);
  });

  return router;
}
