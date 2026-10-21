# Implementation Plan: Trip State Machine — trips.ts Rewrite

## Exploration Findings

### 1. How `io` (Socket.IO) is Currently Accessed

Socket.IO is **NOT present in the api-gateway service at all**. The `package.json` has no `socket.io` dependency. Socket.IO lives exclusively in `services/tracking-service/src/index.ts`, which is a completely separate service.

**Decision:** Do not add Socket.IO to the api-gateway. Instead, after each state transition, emit an event via a lightweight internal HTTP POST to the tracking-service (or simply skip real-time push for now, since the tracking service already owns all WebSocket infrastructure). The plan uses an optional fire-and-forget `axios.post` to the tracking-service event endpoint, gated by a `TRACKING_SERVICE_URL` env variable. If the variable is absent the trip still transitions — the HTTP notification is best-effort.

**Pattern to use inside trips.ts for optional notification:**
```ts
async function notifyTrackingService(event: string, payload: object): Promise<void> {
  const url = process.env.TRACKING_SERVICE_URL;
  if (!url) return;
  try {
    await axios.post(`${url}/internal/trip-event`, { event, ...payload });
  } catch (_) { /* best-effort — never block the trip transition */ }
}
```

---

### 2. Auth Middleware — `req.user` Fields

`src/middleware/auth.ts` exports `AuthRequest` which extends `Request`:

```ts
export interface AuthRequest extends Request {
  user?: {
    id: string;
    type: 'passenger' | 'driver' | 'operator' | 'admin' | 'support_agent';
    phone: string;
    phone_number?: string;
  };
}
```

The JWT is decoded and stored as `req.user`. The **key field is `req.user.id`** (not `userId` as the old code used with `(req as any).user?.userId`). The old trips.ts was using the wrong field name — it was reading `req.user?.userId` which would always be `undefined`. The rewrite must use `req.user.id`.

The role/type field is `req.user.type` (not `role`).

**How to access in route handlers:**
```ts
import { AuthRequest } from '../middleware/auth';

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;           // correct
  const userType = req.user?.type;       // 'passenger' | 'driver' | ...
  ...
});
```

No extra middleware is needed — `authMiddleware` already runs for all `/api` routes in `index.ts` (`app.use('/api', authMiddleware, routes)`).

---

### 3. DB Schema from Migration 012

#### `trips` table (existing columns + 012 additions)

From the existing code and migration 012:

| Column              | Type                | Notes                                              |
|---------------------|---------------------|----------------------------------------------------|
| id                  | UUID PK             | gen_random_uuid()                                  |
| passenger_id        | UUID                | FK → users(id)                                     |
| driver_id           | UUID NULL           | FK → users(id)                                     |
| pickup_latitude     | NUMERIC/FLOAT       |                                                    |
| pickup_longitude    | NUMERIC/FLOAT       |                                                    |
| pickup_address      | TEXT NULL           |                                                    |
| dropoff_latitude    | NUMERIC/FLOAT       |                                                    |
| dropoff_longitude   | NUMERIC/FLOAT       |                                                    |
| dropoff_address     | TEXT NULL           |                                                    |
| vehicle_type        | VARCHAR             |                                                    |
| estimated_fare      | NUMERIC NULL        |                                                    |
| estimated_distance  | NUMERIC NULL        |                                                    |
| estimated_duration  | INT NULL            |                                                    |
| payment_method      | VARCHAR             | default 'cash'                                     |
| status              | VARCHAR(30)         | state machine values (see below)                   |
| created_at          | TIMESTAMP           |                                                    |
| updated_at          | TIMESTAMP NULL      |                                                    |
| accepted_at         | TIMESTAMP NULL      | set when REQUESTED→ACCEPTED                        |
| driver_arriving_at  | TIMESTAMP NULL      | **Added by 012** — set when ACCEPTED→DRIVER_ARRIVING |
| arrived_at          | TIMESTAMP NULL      | **Added by 012** — set when DRIVER_ARRIVING→ARRIVED  |
| started_at          | TIMESTAMP NULL      | **Added by 012** — set when ARRIVED→IN_PROGRESS      |
| completed_at        | TIMESTAMP NULL      | set when IN_PROGRESS→COMPLETED                     |
| cancelled_at        | TIMESTAMP NULL      |                                                    |
| cancelled_by        | UUID NULL           |                                                    |
| cancellation_reason | TEXT NULL           |                                                    |
| final_fare          | NUMERIC NULL        |                                                    |
| transaction_id      | TEXT NULL           |                                                    |
| passenger_rating    | NUMERIC NULL        |                                                    |
| passenger_review    | TEXT NULL           |                                                    |
| driver_rating       | NUMERIC NULL        |                                                    |
| driver_review       | TEXT NULL           |                                                    |

#### `trip_state_logs` table (created by 012)

| Column     | Type        | Notes                                    |
|------------|-------------|------------------------------------------|
| id         | UUID PK     | gen_random_uuid()                        |
| trip_id    | UUID        | FK → trips(id) ON DELETE CASCADE         |
| from_state | VARCHAR(30) | NULL for the initial REQUESTED entry     |
| to_state   | VARCHAR(30) | NOT NULL                                 |
| actor_id   | UUID        | NOT NULL — the user who triggered it     |
| actor_type | VARCHAR(20) | NOT NULL — 'passenger'/'driver'/etc.     |
| note       | TEXT NULL   |                                          |
| created_at | TIMESTAMP   | default NOW()                            |

Indexes: `idx_trip_state_logs_trip_id`, `idx_trip_state_logs_created_at`

#### Valid State Machine Values (from migration comment)

```
REQUESTED  → ACCEPTED        (driver accepts)
REQUESTED  → CANCELLED       (passenger or driver)
ACCEPTED   → DRIVER_ARRIVING (driver en route to pickup)
ACCEPTED   → CANCELLED       (passenger or driver)
DRIVER_ARRIVING → ARRIVED    (driver at pickup location)
DRIVER_ARRIVING → CANCELLED  (driver only)
ARRIVED    → IN_PROGRESS     (driver starts trip)
IN_PROGRESS → COMPLETED      (driver completes trip)
COMPLETED  → (terminal)
CANCELLED  → (terminal)
```

Migration 012 also normalises old `'pending'` rows to `'REQUESTED'`. The old code used lowercase `'pending'`, `'driver_assigned'`, `'in_progress'`, `'completed'`, `'cancelled'`. The new code uses UPPERCASE.

---

### 4. Existing Endpoints to Preserve

All of the following endpoints must be preserved (with state machine correctness applied):

| Method | Path                       | Old behaviour                    | New behaviour                          |
|--------|----------------------------|----------------------------------|----------------------------------------|
| POST   | /                          | Create trip, status='pending'    | Create trip, status='REQUESTED', log   |
| GET    | /                          | List trips for current user      | Preserve — add status filter update    |
| GET    | /available/nearby          | Pending trips for drivers        | Change filter to status='REQUESTED'    |
| GET    | /:tripId                   | Get single trip with joins       | Preserve — add state log JOIN          |
| PATCH  | /:tripId/assign-driver     | Set driver, status='driver_assigned' | Replace with ACCEPTED transition  |
| PATCH  | /:tripId/status            | Freeform status set              | Remove — replaced by dedicated endpoints |
| PATCH  | /:tripId/complete          | Complete with payment            | Rewrite as IN_PROGRESS→COMPLETED       |
| PATCH  | /:tripId/cancel            | Cancel                           | Rewrite with state machine guards      |
| POST   | /:tripId/rate              | Rate trip                        | Preserve as-is                         |

New endpoints to add:

| Method | Path                        | Description                                  |
|--------|-----------------------------|----------------------------------------------|
| PATCH  | /:tripId/driver-arriving    | ACCEPTED → DRIVER_ARRIVING (driver only)     |
| PATCH  | /:tripId/arrived            | DRIVER_ARRIVING → ARRIVED (driver only)      |
| PATCH  | /:tripId/start              | ARRIVED → IN_PROGRESS (driver only)          |
| GET    | /:tripId/state-log          | Return trip_state_logs for a trip            |

---

### 5. Pitfalls

- **`req.user.userId` is wrong.** The JWT payload shape in `auth.ts` uses `id`, not `userId`. Every handler in the old file used `(req as any).user?.userId` which was always `undefined` in practice.
- **`socket.io` is not in api-gateway.** Do not add it. Use the optional HTTP notification pattern described above.
- **`PATCH /:tripId/status` is a catch-all that bypasses the state machine** — it must be removed. If any client calls it, a `410 Gone` response can be returned pointing to the specific transition endpoints.
- **`/available/nearby` route must be registered BEFORE `/:tripId`** — Express matches routes in order. A request to `/available/nearby` would be caught by `/:tripId` with `tripId='available'` unless the static path is listed first.
- **State transitions must be atomic** — use a DB transaction that UPDATEs `trips` and INSERTs into `trip_state_logs` in the same transaction. If the log insert fails the status update must be rolled back.
- **Actor type** in `trip_state_logs` should come from `req.user.type`, which matches the migration's `VARCHAR(20)` column.

---

## Implementation Plan

- [ ] 1. Create the output directory and verify migration 012 has run (or document how to run it).

      Before the code changes, ensure the `trip_state_logs` table and the new `trips` columns (`arrived_at`, `driver_arriving_at`, `started_at`) exist in the DB. Migration is applied with:
      ```
      cd services/api-gateway && npm run migrate
      ```
      The code does not depend on this for TypeScript compilation, only for runtime correctness.
      
      Files: `services/api-gateway/migrations/012_trip_state_machine.sql` (already exists — no change)
      Verify: `npm run typecheck` passes (no runtime check here — schema must be applied separately before deploy)

- [ ] 2. Add TypeScript types for request bodies, DB rows, and the state machine.

      Create `src/routes/trips.types.ts` with the following types (so they can be imported from the route file without bloating it):

      ```ts
      // Trip state machine
      export type TripStatus =
        | 'REQUESTED'
        | 'ACCEPTED'
        | 'DRIVER_ARRIVING'
        | 'ARRIVED'
        | 'IN_PROGRESS'
        | 'COMPLETED'
        | 'CANCELLED';

      // DB row shape for trips (relevant columns)
      export interface TripRow {
        id: string;
        passenger_id: string;
        driver_id: string | null;
        status: TripStatus;
        pickup_latitude: number;
        pickup_longitude: number;
        pickup_address: string | null;
        dropoff_latitude: number;
        dropoff_longitude: number;
        dropoff_address: string | null;
        vehicle_type: string;
        estimated_fare: number | null;
        estimated_distance: number | null;
        estimated_duration: number | null;
        payment_method: string;
        final_fare: number | null;
        transaction_id: string | null;
        created_at: Date;
        updated_at: Date | null;
        accepted_at: Date | null;
        driver_arriving_at: Date | null;
        arrived_at: Date | null;
        started_at: Date | null;
        completed_at: Date | null;
        cancelled_at: Date | null;
        cancelled_by: string | null;
        cancellation_reason: string | null;
        passenger_rating: number | null;
        passenger_review: string | null;
        driver_rating: number | null;
        driver_review: string | null;
      }

      // DB row shape for trip_state_logs
      export interface TripStateLogRow {
        id: string;
        trip_id: string;
        from_state: TripStatus | null;
        to_state: TripStatus;
        actor_id: string;
        actor_type: string;
        note: string | null;
        created_at: Date;
      }

      // Request body types
      export interface CreateTripBody {
        pickup_latitude: number;
        pickup_longitude: number;
        pickup_address?: string;
        dropoff_latitude: number;
        dropoff_longitude: number;
        dropoff_address?: string;
        vehicle_type: string;
        estimated_fare?: number;
        estimated_distance?: number;
        estimated_duration?: number;
        payment_method?: string;
      }

      export interface CompleteTripBody {
        payment_method?: string;
        transaction_id?: string;
        final_fare?: number;
      }

      export interface CancelTripBody {
        cancellation_reason?: string;
      }

      export interface RateTripBody {
        rating: number;   // 1–5
        review?: string;
      }
      ```

      Files: `src/routes/trips.types.ts` (create new)
      Verify: `npm run typecheck` — no errors

- [ ] 3. Write the state machine transition table and helper functions.

      In the same file (`trips.types.ts`) or at the top of the rewritten `trips.ts` (choose `trips.ts` to keep it all together), add:

      ```ts
      // Allowed transitions: Map<fromState, Set<toState>>
      // key = actor type constraint: 'driver', 'passenger', 'any'
      export interface AllowedTransition {
        to: TripStatus;
        actor: 'driver' | 'passenger' | 'any';
        timestampCol?: keyof TripRow; // column to set to NOW() on this transition
      }

      export const TRANSITIONS: Record<TripStatus, AllowedTransition[]> = {
        REQUESTED:       [
          { to: 'ACCEPTED',        actor: 'driver',    timestampCol: 'accepted_at' },
          { to: 'CANCELLED',       actor: 'any' },
        ],
        ACCEPTED:        [
          { to: 'DRIVER_ARRIVING', actor: 'driver',    timestampCol: 'driver_arriving_at' },
          { to: 'CANCELLED',       actor: 'any' },
        ],
        DRIVER_ARRIVING: [
          { to: 'ARRIVED',         actor: 'driver',    timestampCol: 'arrived_at' },
          { to: 'CANCELLED',       actor: 'driver' },
        ],
        ARRIVED:         [
          { to: 'IN_PROGRESS',     actor: 'driver',    timestampCol: 'started_at' },
        ],
        IN_PROGRESS:     [
          { to: 'COMPLETED',       actor: 'driver',    timestampCol: 'completed_at' },
        ],
        COMPLETED:       [],
        CANCELLED:       [],
      };
      ```

      Helper function `transitionTrip` — this is the core of the state machine:

      ```ts
      /**
       * Atomically transitions a trip to `toState`:
       *  1. Fetches the trip inside a transaction (FOR UPDATE)
       *  2. Validates actor permissions and state legality
       *  3. UPDATEs trips and INSERTs trip_state_logs in the same transaction
       *
       * Returns { trip, log } on success or throws an ApiError subclass.
       */
      async function transitionTrip(
        tripId: string,
        toState: TripStatus,
        actor: { id: string; type: string },
        opts?: {
          note?: string;
          extraCols?: Record<string, any>; // e.g. { final_fare, transaction_id }
        }
      ): Promise<{ trip: TripRow; log: TripStateLogRow }>;
      ```

      Implementation notes for `transitionTrip`:
      - Use `pool.connect()` to get a client, then `BEGIN` / `COMMIT` / `ROLLBACK`.
      - `SELECT ... FOR UPDATE` to avoid race conditions (two drivers accepting same trip).
      - Look up allowed transitions from `TRANSITIONS[currentStatus]`.
      - Check that the target `toState` appears in the allowed list.
      - Check `actor` constraint: if the transition requires `'driver'`, confirm `actor.type === 'driver'`; if `'passenger'`, confirm `actor.type === 'passenger'`; `'any'` skips the check.
      - Also verify the caller is actually a party to the trip (`trip.passenger_id === actor.id || trip.driver_id === actor.id || actor.type === 'admin'`).
      - Build the `SET` clause dynamically: always set `updated_at = NOW()` and `status = $n`; if the transition has a `timestampCol`, also set `timestampCol = NOW()`; merge any `extraCols`.
      - Insert into `trip_state_logs` with `from_state`, `to_state`, `actor_id`, `actor_type`, `note`.
      - Release the client in `finally`.

      Files: `src/routes/trips.ts` (helper added at the top, below imports)
      Verify: `npm run typecheck` — no errors

- [ ] 4. Rewrite `src/routes/trips.ts` top-level: fix imports and add the `notifyTrackingService` helper.

      **Remove:**
      - Nothing is currently imported other than `Router`, `Request`, `Response` from `'express'` and `pool` from `'../database/connection'`.

      **Add:**
      - `import axios from 'axios';` (already in `package.json` dependencies)
      - `import { AuthRequest } from '../middleware/auth';`
      - Import the types from `./trips.types` (or inline them if kept in `trips.ts`)
      - Import `pool` from `'../database/connection'` (keep as-is)

      Add the `notifyTrackingService` helper (see section 1 above).

      Files: `src/routes/trips.ts` (modify)
      Verify: `npm run typecheck` — no errors

- [ ] 5. Rewrite `POST /` — Create trip (REQUESTED state).

      Replace the existing handler. Key changes:
      - Use `req: AuthRequest` instead of `req: Request`.
      - Read `userId` from `req.user!.id` (not `req.user?.userId`).
      - Insert `status = 'REQUESTED'` (not `'pending'`).
      - After INSERT into `trips`, also INSERT into `trip_state_logs` with `from_state = NULL`, `to_state = 'REQUESTED'`, `actor_id = userId`, `actor_type = req.user!.type`, inside the same DB transaction.
      - Return the created trip.

      Files: `src/routes/trips.ts`
      Verify: `npm run typecheck` — no errors; manual test: `POST /api/v1/trips` with a passenger JWT → 201, trip has `status: 'REQUESTED'`

- [ ] 6. Rewrite `GET /` — Trip history (preserve, fix userId field only).

      - Change `userId = (req as any).user?.userId` → `userId = req.user?.id`.
      - Update status filter documentation comment to note UPPERCASE states.
      - No logic change otherwise.

      Files: `src/routes/trips.ts`
      Verify: `npm run typecheck`

- [ ] 7. Rewrite `GET /available/nearby` — Available trips for drivers (fix status filter).

      - Change `userId = (req as any).user?.userId` → `userId = req.user?.id`.
      - Change `WHERE t.status = 'pending'` → `WHERE t.status = 'REQUESTED'`.
      - **Move this route registration BEFORE `GET /:tripId`** in the file (critical — see Pitfalls §5).

      Files: `src/routes/trips.ts`
      Verify: `npm run typecheck`; driver JWT GET `/api/v1/trips/available/nearby?latitude=...&longitude=...` hits the right handler (not the `:tripId` handler)

- [ ] 8. Rewrite `GET /:tripId` — Get single trip (add state log).

      - Change `userId = (req as any).user?.userId` → `userId = req.user?.id`.
      - Add a second query to fetch the last 20 `trip_state_logs` entries ordered by `created_at DESC`, and include them as `state_log` in the response.
      - Keep the existing LEFT JOINs for driver and vehicle info.

      Files: `src/routes/trips.ts`
      Verify: `npm run typecheck`; GET `/api/v1/trips/:id` returns `state_log` array

- [ ] 9. Replace `PATCH /:tripId/assign-driver` with `PATCH /:tripId/accept` — REQUESTED → ACCEPTED.

      Remove the old `/assign-driver` handler and add `/accept`:
      - Caller must be a driver (`req.user!.type === 'driver'`).
      - Call `transitionTrip(tripId, 'ACCEPTED', { id: req.user!.id, type: req.user!.type })`.
      - This sets `driver_id = actor.id` (add this to `extraCols` in `transitionTrip`, or handle in the `transitionTrip` function for the REQUESTED→ACCEPTED case specifically: when `toState === 'ACCEPTED'`, also set `driver_id = actor.id`).
      - Call `notifyTrackingService('trip:accepted', { tripId, driverId: userId })`.

      Files: `src/routes/trips.ts`
      Verify: `npm run typecheck`; driver PATCH `/accept` moves trip from REQUESTED to ACCEPTED

- [ ] 10. Add `PATCH /:tripId/driver-arriving` — ACCEPTED → DRIVER_ARRIVING.

       - Caller must be a driver.
       - Call `transitionTrip(tripId, 'DRIVER_ARRIVING', actor)`.
       - Sets `driver_arriving_at = NOW()` (via `timestampCol` in the TRANSITIONS table).
       - Call `notifyTrackingService('trip:driver_arriving', { tripId })`.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 11. Add `PATCH /:tripId/arrived` — DRIVER_ARRIVING → ARRIVED.

       - Caller must be a driver.
       - Call `transitionTrip(tripId, 'ARRIVED', actor)`.
       - Sets `arrived_at = NOW()`.
       - Call `notifyTrackingService('trip:arrived', { tripId })`.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 12. Add `PATCH /:tripId/start` — ARRIVED → IN_PROGRESS.

       - Caller must be a driver.
       - Call `transitionTrip(tripId, 'IN_PROGRESS', actor)`.
       - Sets `started_at = NOW()`.
       - Call `notifyTrackingService('trip:started', { tripId })`.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 13. Rewrite `PATCH /:tripId/complete` — IN_PROGRESS → COMPLETED.

       - Caller must be a driver (`req.user!.type === 'driver'`).
       - Read `{ payment_method, transaction_id, final_fare }` from body.
       - Call `transitionTrip(tripId, 'COMPLETED', actor, { extraCols: { final_fare, transaction_id, payment_method } })`.
       - Sets `completed_at = NOW()`.
       - Call `notifyTrackingService('trip:completed', { tripId, final_fare })`.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 14. Rewrite `PATCH /:tripId/cancel` — any non-terminal state → CANCELLED.

       - Caller is passenger or driver (both allowed for most states; DRIVER_ARRIVING → CANCELLED is driver only — enforced by `transitionTrip`).
       - Read `{ cancellation_reason }` from body (optional).
       - Call `transitionTrip(tripId, 'CANCELLED', actor, { note: cancellation_reason, extraCols: { cancelled_by: userId, cancellation_reason } })`.
       - Sets `cancelled_at = NOW()`.
       - Call `notifyTrackingService('trip:cancelled', { tripId, cancelledBy: userId })`.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 15. Replace `PATCH /:tripId/status` with a `410 Gone` response.

       Keep the route registered so existing API clients get a useful error instead of a 404:

       ```ts
       router.patch('/:tripId/status', (_req, res) => {
         res.status(410).json({
           error: 'ENDPOINT_REMOVED',
           message: 'Use the specific transition endpoints: /accept, /driver-arriving, /arrived, /start, /complete, /cancel'
         });
       });
       ```

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 16. Preserve `POST /:tripId/rate` — no logic change needed.

       Only change: `userId = (req as any).user?.userId` → `userId = req.user?.id`. The rest of the handler is correct.

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 17. Add `GET /:tripId/state-log` — Return state transition history.

       ```ts
       router.get('/:tripId/state-log', async (req: AuthRequest, res: Response) => {
         const { tripId } = req.params;
         const userId = req.user!.id;
         // Verify caller is a party to the trip
         const tripCheck = await pool.query(
           'SELECT passenger_id, driver_id FROM trips WHERE id = $1',
           [tripId]
         );
         if (!tripCheck.rows.length) return res.status(404).json({ error: 'Trip not found' });
         const t = tripCheck.rows[0];
         if (t.passenger_id !== userId && t.driver_id !== userId && req.user!.type !== 'admin') {
           return res.status(403).json({ error: 'Forbidden' });
         }
         const logs = await pool.query(
           'SELECT * FROM trip_state_logs WHERE trip_id = $1 ORDER BY created_at ASC',
           [tripId]
         );
         res.json({ state_log: logs.rows });
       });
       ```

       Files: `src/routes/trips.ts`
       Verify: `npm run typecheck`

- [ ] 18. Run full typecheck and existing tests to confirm nothing is broken.

       ```
       cd services/api-gateway && npm run typecheck
       cd services/api-gateway && npm test
       ```

       Expected: zero TypeScript errors. Jest tests for middleware (auth, rbac, validation) should still pass. There are no existing trip route unit tests to break.

       Files: none (verification only)
       Verify: `npm run typecheck` exits 0; `npm test` shows passing middleware tests

---

## Route Registration Order in the Final File

The order routes are declared in `trips.ts` matters. Final order must be:

```
GET  /available/nearby     ← MUST be before /:tripId
GET  /
POST /
GET  /:tripId/state-log    ← MUST be before /:tripId
GET  /:tripId
PATCH /:tripId/accept
PATCH /:tripId/driver-arriving
PATCH /:tripId/arrived
PATCH /:tripId/start
PATCH /:tripId/complete
PATCH /:tripId/cancel
PATCH /:tripId/status      ← 410 stub
POST  /:tripId/rate
```

---

## Summary of Files to Create or Modify

| Action | File                                              |
|--------|---------------------------------------------------|
| Create | `src/routes/trips.types.ts`                       |
| Rewrite | `src/routes/trips.ts`                            |
| No change | `src/index.ts`                                 |
| No change | `src/routes/index.ts`                          |
| No change | `src/middleware/auth.ts`                       |
| No change | `migrations/012_trip_state_machine.sql`        |

`index.ts` does NOT need to be modified — there is no Socket.IO to export and `authMiddleware` is already applied globally. `routes/index.ts` already mounts `/v1/trips` via `require('./trips')` so no change is needed there either.
