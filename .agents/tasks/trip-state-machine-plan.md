# Implementation Plan: Trip State Machine

**State machine:** `REQUESTED → ACCEPTED → DRIVER_ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED`  
**CANCELLED** is reachable from any non-terminal state, subject to role rules.  
**Architecture decision:** No WebSocket server — the gateway deploys to Vercel serverless. Real-time is achieved with short HTTP polling (4–8 s intervals), matching the existing pattern in `tracking.ts`.  
**Atomic accept:** `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction prevents two drivers accepting the same trip.

---

## FEAT-001: API Gateway — Migration + trips.ts Rewrite

- [ ] 1. Create `services/api-gateway/migrations/012_trip_state_machine.sql`.
      Add `trip_state_logs` table with `id`, `trip_id` (FK → trips), `from_state`, `to_state`, `actor_id`, `actor_type`, `note`, `created_at`. Add indexes on `(trip_id)` and `(created_at)`. `ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP`, `driver_arriving_at TIMESTAMP`, `started_at TIMESTAMP`. Migration is additive — no column drops.
      Files: `services/api-gateway/migrations/012_trip_state_machine.sql`
      Verify: `node services/api-gateway/scripts/migrate.js $DATABASE_URL` — file applied without fatal errors.

- [ ] 2. Add state machine constants and helpers to `services/api-gateway/src/routes/trips.ts`.
      Add `VALID_TRANSITIONS` map: `{ REQUESTED: ['ACCEPTED','CANCELLED'], ACCEPTED: ['DRIVER_ARRIVING','CANCELLED'], DRIVER_ARRIVING: ['ARRIVED','CANCELLED'], ARRIVED: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'], COMPLETED: [], CANCELLED: [] }`. Add `CANCEL_ALLOWED_BY` map: `{ passenger: ['REQUESTED','ACCEPTED'], driver: ['ACCEPTED','DRIVER_ARRIVING'] }`. Add `validateTransition(current, next)` boolean. Add `async logStateChange(tripId, from, to, actorId, actorType, pgClient)` that inserts into `trip_state_logs`.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `cd services/api-gateway && npm run build` — zero TypeScript errors.

- [ ] 3. Rewrite `POST /` (create trip) to insert with `status='REQUESTED'` and log the initial state.
      Keep all existing request body fields. Replace `'pending'` literal with `'REQUESTED'`. After insert, call `logStateChange` with `from_state=null`, `to_state='REQUESTED'`, `actor_type='passenger'`.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes; existing `GET /` and `GET /:tripId` still compile.

- [ ] 4. Add `POST /:tripId/accept` endpoint (replaces `PATCH /:tripId/assign-driver`).
      Role guard: `req.user.type` must be `'driver'`. Transaction: `BEGIN → SELECT … FOR UPDATE SKIP LOCKED WHERE status='REQUESTED' AND driver_id IS NULL → if no row, 409 'Trip no longer available' → UPDATE status='ACCEPTED' + accepted_at → logStateChange → COMMIT`. Returns 200 with full trip row.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes.

- [ ] 5. Add `POST /:tripId/driver-arriving`, `POST /:tripId/arrived`, and `POST /:tripId/start` endpoints.
      Each validates caller is the trip's `driver_id`, validates current state matches the allowed predecessor (ACCEPTED→DRIVER_ARRIVING, DRIVER_ARRIVING→ARRIVED, ARRIVED→IN_PROGRESS), updates the relevant timestamp column, and calls `logStateChange`. Returns 200.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes.

- [ ] 6. Rewrite `POST /:tripId/complete` (was `PATCH /:tripId/complete`).
      Validates caller is driver, current state is `IN_PROGRESS`. Updates `status='COMPLETED'`, `completed_at`, `final_fare`. Logs transition. Returns 200.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes.

- [ ] 7. Rewrite `POST /:tripId/cancel` (was `PATCH /:tripId/cancel`).
      Role-based gate using `CANCEL_ALLOWED_BY`. Transaction with `SELECT … FOR UPDATE`. Validates current state is in caller's allowed list (400 otherwise). Updates `status='CANCELLED'`, `cancelled_at`, `cancelled_by`, `cancellation_reason`. Logs transition. Returns 200.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes.

- [ ] 8. Add `GET /:tripId/state` polling endpoint.
      Returns `{ trip_id, status, updated_at, state_logs: [{from_state,to_state,actor_type,created_at}] }` — last 20 log entries DESC. Auth guard: caller must be `passenger_id` or `driver_id` of the trip. This is the heartbeat both apps poll.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes; `npm test` passes.

- [ ] 9. Remove `PATCH /:tripId/status` (the old generic status updater that bypasses the machine).
      Keeping it would allow direct state injection; it must be deleted.
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `npm run build` passes; `npm test` passes.

---

## FEAT-002: Passenger App — RideRequestScreen + TripActiveScreen + Driver Screens

*Depends on FEAT-001 being complete (endpoints must exist on the server).*

- [ ] 10. Update `RideRequestScreen.tsx` — wire up trip creation.
      `confirmRide()`: read JWT from `AsyncStorage.getItem('@safiriharaka:token')`, call `POST /api/v1/trips` with all coordinate + fare fields, receive the `trip.id` from the response, then `navigation.navigate('TripActive', { …existingParams, tripId: trip.id })`. Show `ActivityIndicator` during the request; show `Alert` on error.
      Files: `apps/passenger-app/screens/RideRequestScreen.tsx`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

- [ ] 11. Update `TripActiveScreen.tsx` — replace simulated flow with real state polling.
      Add a polling `useEffect` that calls `GET /api/v1/trips/:tripId/state` every 4 s (only when `hasTripId`). Map server states to local `TripStatus`: `REQUESTED→'searching'`, `ACCEPTED|DRIVER_ARRIVING→'accepted'`/`'arriving'` respectively, `ARRIVED→'arriving'`, `IN_PROGRESS→'in_progress'`, `COMPLETED→'completed'`, `CANCELLED→'cancelled'`. When server returns `ACCEPTED` or later and `driver.name` is empty, fetch `GET /api/v1/trips/:tripId` once to populate driver details. Cancel button: only render when status is `'searching'` or `'accepted'`; on press call `POST /api/v1/trips/:tripId/cancel`, handle 400 (show Alert), on success `navigation.goBack()`. Clear polling interval on unmount. Keep simulation fallback when `!hasTripId`.
      Files: `apps/passenger-app/screens/TripActiveScreen.tsx`
      Verify: `npx tsc --noEmit` in passenger-app — zero errors.

- [ ] 12. Update `DriverTripRequestScreen.tsx` — load real trip data and wire accept/decline.
      Receive `tripId` via `route.params.tripId`. On mount, fetch `GET /api/v1/trips/:tripId` with JWT header to populate passenger name, pickup, dropoff, fare, distance, duration. `acceptTrip()`: call `POST /api/v1/trips/:tripId/accept`; on 200 `navigation.replace('DriverActiveTrip', { trip: enrichedTripObject })`. `rejectTrip()`: call `POST /api/v1/trips/:tripId/cancel` with `{ cancellation_reason: 'Declined by driver' }`; on success `navigation.goBack()`. Add `ActivityIndicator` during calls. Keep countdown timer + vibration.
      Files: `apps/passenger-app/screens/DriverTripRequestScreen.tsx`
      Verify: `npx tsc --noEmit` — zero errors.

- [ ] 13. Update `DriverActiveTripScreen.tsx` — wire advance-status buttons to API + add passenger-cancel detection.
      Receive `tripId` from `route.params`. Wire `advanceStatus()` calls: `going_pickup→arrived` calls `POST /v1/trips/:tripId/driver-arriving` then `POST /v1/trips/:tripId/arrived`; `arrived→trip_started` calls `POST /v1/trips/:tripId/start`; `trip_started→completed` calls `POST /v1/trips/:tripId/complete` with `{ final_fare: trip.fare, payment_method: 'cash' }`. Add a polling `useEffect` (every 5 s) calling `GET /v1/trips/:tripId/state`; if server returns `CANCELLED`, stop polling, show `Alert('Passenger cancelled the trip')`, then `navigation.popToTop()`. On any API error show `Alert`. Clear polling on unmount.
      Files: `apps/passenger-app/screens/DriverActiveTripScreen.tsx`
      Verify: `npx tsc --noEmit` — zero errors.

---

## FEAT-003: Driver App — DriverAPI + HomeScreen + ActiveTripScreen

*Depends on FEAT-001. Independent of FEAT-002.*

- [ ] 14. Update `apps/driver-app/src/services/api/DriverAPI.ts` — remap all trip endpoints to `/v1/trips/`.
      `acceptTrip(tripId)` → `POST /v1/trips/:tripId/accept`. `declineTrip(tripId, reason)` → `POST /v1/trips/:tripId/cancel` body `{ cancellation_reason: reason }`. `arrivedAtPickup(tripId)` → `POST /v1/trips/:tripId/driver-arriving`. Add `driverArrived(tripId)` → `POST /v1/trips/:tripId/arrived`. `startTrip(tripId)` → `POST /v1/trips/:tripId/start`. `completeTrip(tripId, fare)` → `POST /v1/trips/:tripId/complete` body `{ final_fare: fare, payment_method: 'cash' }`. `cancelTrip(tripId, reason)` → `POST /v1/trips/:tripId/cancel`. Add `getTripState(tripId)` → `GET /v1/trips/:tripId/state`. `getTripRequests()` → `GET /v1/trips/available/nearby` (no body change). Keep all return types and existing methods.
      Files: `apps/driver-app/src/services/api/DriverAPI.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — zero errors.

- [ ] 15. Update `apps/driver-app/src/screens/main/HomeScreen.tsx` — add polling + active-trip check on mount.
      On mount, call `DriverAPI.getActiveTrip()`; if non-null navigate immediately to `ActiveTrip` with `tripId`. Replace the one-time `loadData()` with a `useEffect` that sets up `setInterval(() => DriverAPI.getTripRequests().then(setTripRequests), 8000)` when `status === 'available'`. Clear interval when `status !== 'available'` or on unmount. `handleAcceptTrip`: keep existing call to `DriverAPI.acceptTrip(tripId)` (endpoint updated in step 14); keep navigate to `ActiveTrip`. `handleDeclineTrip`: keep existing call (endpoint updated). Show an `ActivityIndicator` next to the trip list while the first poll is in flight.
      Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`
      Verify: `npx tsc --noEmit` — zero errors.

- [ ] 16. Update `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx` — replace static mock with real trip data + state machine buttons.
      On mount, fetch `GET /v1/trips/:tripId` (via `APIClient.get`) to load passenger name, pickup address, destination address, fare; set into local `trip` state (replace the hardcoded `useState` initializer). Add local `tripStatus` state typed as `'accepted' | 'driver_arriving' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'`, initialized to `'accepted'`. Add polling `useEffect` every 5 s calling `DriverAPI.getTripState(tripId)` to update `tripStatus`; on `CANCELLED` show Alert and navigate to `HomeMain`. Replace `handleStartTrip()` → calls `DriverAPI.arrivedAtPickup(tripId)`, on success sets `tripStatus='driver_arriving'`. Replace `handleArrived()` → calls `DriverAPI.driverArrived(tripId)`, on success sets `tripStatus='arrived'`. Add `handleStartRide()` → calls `DriverAPI.startTrip(tripId)`, on success sets `tripStatus='in_progress'`. `handleCompleteTrip()` (existing payment flow) → after payment modal confirm, calls `DriverAPI.completeTrip(tripId, trip.fare)`, on success sets `tripStatus='completed'` and navigates to `HomeMain`. Render action buttons conditionally: `driver_arriving` → "I've Arrived at Pickup"; `arrived` → "Start Trip"; `in_progress` → "Complete Trip". Clear polling on unmount.
      Files: `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
      Verify: `npx tsc --noEmit` — zero errors.

---

## Notes & Assumptions

1. **No socket server**: Vercel serverless precludes persistent connections. All real-time updates use polling. Poll intervals: 4 s (passenger TripActiveScreen), 8 s (driver HomeScreen), 5 s (driver ActiveTripScreen). These are configurable constants at the top of each file.

2. **Status string casing**: The existing DB column uses lowercase strings (`'pending'`, `'driver_assigned'`). The new machine uses uppercase (`'REQUESTED'`, `'ACCEPTED'`, etc.) to match the spec and avoid ambiguity. Migration 012 does **not** backfill old rows — existing trips with old status values simply won't match new transition guards, which is safe since they're already terminal or legacy data.

3. **`req.user` shape**: `auth.ts` decodes the JWT into `{ id, type, phone }`. Route handlers use `req.user.id` (not `req.user.userId`) and `req.user.type` for role checks. The existing trips.ts uses `req.user?.userId` (wrong) — fix to `req.user?.id` throughout.

4. **Driver app base URL**: `apps/driver-app/src/services/api/client.ts` hard-codes `https://simon-daladala-api.vercel.app/api`. The new endpoints are at `/v1/trips/…` under that base, so no URL change is needed.

5. **`started_at` column**: Added in migration 012 alongside `arrived_at` and `driver_arriving_at`.

6. **`GET /available/nearby` route ordering**: Express matches `GET /available/nearby` before `GET /:tripId` only if it's declared first in the router. In the rewrite, declare all static paths before parameterized ones.
