# Background tracking, push notifications, ratings, and earnings (Build 3 + Build 5)

This change wires up the full driver-side operational stack: GPS background tracking via `expo-location`, push notifications via Expo Push for both apps, a `ratings` table and route that lets passengers rate drivers and drivers rate passengers, a `driver_earnings` table populated on trip completion, a driver earnings screen with a 7-day bar chart, and push notification tap-handling that routes to the correct screen for each event type. Both the driver and passenger apps register push tokens on startup. Trip status transitions in `trips.ts` fire push notifications to passengers at `ACCEPTED`, `DRIVER_ARRIVING`, and `COMPLETED` — all fire-and-forget so they never block a trip state machine transition.

The v2 blocking issue (RatingScreen requiring `rateeId` from params before posting) is resolved: the server now derives the ratee from the trip, and the client posts only `{ trip_id, rating, review }`. The notification-tap path now fetches the trip to resolve the driver for display purposes, which is independent of whether the POST succeeds.

Watch for: **confirmed** — both notification services hardcode `platform: 'android'` when registering tokens, so iOS tokens will be accepted and stored but Expo Push may silently fail to deliver on iOS devices. **confirmed** — `sendPushNotification` in `notifications.ts` reads `push_token` from `users` (a single-token column) rather than `user_push_tokens` (the multi-token table created in migration 014), meaning a driver who logs in on a second device overwrites the first token and the first device goes dark with no error. **confirmed** — the tip UI in `RatingScreen` collects a tip amount (0 / 500 / 1000 / 2000 TSh) but the value is never included in the POST body and there is no tip column in the `ratings` table; the tip field silently does nothing.

**Verdict**: NEEDS_CHANGES

---

## High-level view

`BackgroundLocation.ts` correctly guards `expo-task-manager` with a dynamic require try/catch, uses the `expo-location` API properly, and sends location updates to the tracking endpoint with auth token and `trip_id` from AsyncStorage. The guard pattern means the module loads safely when the native module is absent.

Both notification services guard `expo-notifications` with the same dynamic require pattern. The driver service is class-based with an explicit `cleanup()` that removes the response subscription. The passenger service is functional. Both request permission before fetching the token, and register the token with the backend inside a nested try/catch so a registration failure doesn't abort the initialization sequence.

The `ratings.ts` route correctly derives `ratee_id` server-side from the trip record rather than accepting it from the request body, preventing spoofing. The 409 duplicate check fires before the transaction opens, which is a minor TOCTOU window — two concurrent first ratings for the same trip could both pass the check and then the second INSERT would hit the `UNIQUE(trip_id, rater_id)` constraint and 500 instead of 409. In practice this race is negligible for user-initiated ratings, but it's worth noting.

`earnings.ts` uses rolling 7-day and 30-day windows (`CURRENT_DATE - INTERVAL '7 days'`), not calendar week/month. The `history` endpoint caps `limit` at 200 via `Math.min`, which is correct. The earnings insert in `trips.ts` on `COMPLETED` uses `ON CONFLICT (trip_id) DO NOTHING` and runs fire-and-forget, so a failed insert logs to stderr but never blocks the response.

The push notification wiring from `trips.ts` uses the correct type strings (`driver_assigned`, `driver_arriving`, `trip_completed`) and the passenger notification handler routes anything not `trip_completed` to `TripActive`, so `driver_assigned` navigates correctly even though the comment says `trip_accepted`. The `trip_completed` tap navigates to `Rating` with `{ tripId, driverId }`, and the current `RatingScreen` fetches the trip to resolve the driver for display if `resolvedDriver` is not already set — the POST no longer requires `driverId` in params.

<details>
<summary>Issues (4)</summary>

1. **iOS push delivery silent failure** — both notification services register tokens with `platform: 'android'` hardcoded. iOS devices will store tokens but Expo Push will not deliver correctly. Add platform detection: `Platform.OS` from `react-native`, or `Device.osName` from `expo-device`. Fix in both `apps/driver-app/src/services/NotificationService.ts` and `apps/passenger-app/services/NotificationService.ts`.

2. **Single-token column used for dispatch** — `sendPushNotification` queries `users.push_token`, not `user_push_tokens`. A multi-device driver loses notifications on their first device when they log in on a second. Either update `sendPushNotification` to query `user_push_tokens` and fan out, or accept the single-device constraint and document it. The migration and upsert endpoint both support multi-token storage; the send path doesn't use it.

3. **Tip UI silently discarded** — `RatingScreen` lets the passenger select a tip (0–2000 TSh) but the `submitRating` POST sends only `{ trip_id, rating, review }`. The tip is never sent. Either remove the tip UI (it sets a false expectation for users) or add `tip_amount` to the POST body and handle it server-side.

4. **Ratings duplicate 409 has a narrow TOCTOU gap** — `ratings.ts` checks for a duplicate with a plain SELECT before opening the transaction, so two simultaneous first-time rating POSTs for the same trip could both pass the check and then the second INSERT will 500 (constraint violation) rather than 409. Move the duplicate check inside the transaction or rely solely on the UNIQUE constraint and catch error code `23505` to return 409 instead of 500.

</details>

<details>
<summary>Details</summary>

### expo-task-manager guard and location API

`BackgroundLocation.ts` wraps `require('expo-task-manager')` in try/catch at module load time. The `defineTask` call is at module scope inside the guard — the correct placement because Expo requires the task to be defined before the app finishes mounting. A fetch error inside the task handler is caught and logged without re-throwing, so a network outage in the background doesn't kill the task worker.

### Driver notification service — subscription cleanup

The `setNotificationHandler` call is inside `initialize()` after the token is registered. If `initialize()` runs more than once (e.g. on foreground restore), the handler re-registers — Expo de-duplicates this internally, so no issue.

### Passenger notification handler — routing on notification tap

`setupNotificationHandlers` branches on `data.type`. `trip_completed` goes to `Rating` with `{ tripId, driverId }`. Everything else — including `driver_assigned`, `driver_arriving`, `new_trip_request`, or any unknown type — goes to `TripActive`. This is intentional and correct: the else branch is a safe fallback. The `driverId` in the `trip_completed` payload comes from the server (`userId` at completion time), so `RatingScreen` receives it in params and can skip the trip-fetch for the display case, though the screen is now resilient either way.

The notification handler comment says `trip_accepted, driver_arriving → TripActive` but the server sends `driver_assigned` (not `trip_accepted`) at accept time. This is a comment inconsistency, not a behavioral bug — `driver_assigned` routes to `TripActive` via the else branch.

### Migration 014 — push token schema

The migration creates `user_push_tokens` with `UNIQUE(token)` and an `ON CONFLICT (token) DO UPDATE` upsert in `/push-token` that reassigns `user_id` when a token moves between accounts (device transfer). This is the correct behavior. However, `sendPushNotification` (Issue 2) reads `users.push_token` and never touches `user_push_tokens`, making the multi-token table a write-only store.

### Ratings route — average recalculation

The average recalculation runs inside the same transaction as the INSERT:
```sql
UPDATE users SET rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM ratings WHERE ratee_id = $1) WHERE id = $1
```
Full recalculation from history is accurate but O(n) per rating. At current scale this is fine, but it will degrade on active drivers with thousands of ratings.

### Earnings route — pagination gap

The `history` endpoint returns `count` (rows returned in this page) but not total available rows, so a client has no way to know whether there are more results. A `has_more` boolean or `total_count` field would be needed for proper infinite scroll.

### trips.ts push wiring — sequencing

The state transition commits first, `res.json()` sends the response, and then all side effects (push notifications, earnings insert) run fire-and-forget. The driver-dispatch query at trip creation filters `d.status = 'available'` and `u.push_token IS NOT NULL` — drivers without tokens are silently skipped, which is correct.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `apps/driver-app/src/services/BackgroundLocation.ts` | New — expo-task-manager guard, location tracking start/stop/status |
| `apps/driver-app/src/services/NotificationService.ts` | New — expo-notifications guard, token registration, tap handler |
| `apps/passenger-app/services/NotificationService.ts` | New — expo-notifications guard, token registration, tap routing |
| `services/api-gateway/migrations/014_push_tokens.sql` | New — push_token column on users, user_push_tokens table |
| `services/api-gateway/migrations/015_ratings_earnings.sql` | New — ratings table with star CHECK, driver_earnings table |
| `apps/driver-app/src/App.tsx` | Modified — NotificationService.initialize() + cleanup() wired |
| `apps/passenger-app/App.tsx` | Modified — registerForPushNotifications + setupNotificationHandlers on mount |
| `services/api-gateway/src/routes/ratings.ts` | New — server-side ratee derivation, 409 on duplicate, transactional average update |
| `services/api-gateway/src/routes/earnings.ts` | New — summary (today/week/month/total) + paginated history |
| `apps/driver-app/src/screens/main/EarningsScreen.tsx` | New — pull-to-refresh, period selector, pure-RN bar chart, history list |
| `apps/passenger-app/screens/RatingScreen.tsx` | Modified — server-derived ratee, trip fetch for notification-tap path |
| `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` | New — 5-star UI, server-derived ratee, skip option |
| `services/api-gateway/src/routes/trips.ts` | Modified — fire-and-forget push at 4 transitions, fire-and-forget earnings insert at COMPLETED |

</details>
