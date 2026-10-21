# Background tracking, push notifications, ratings, and earnings (Build 3 + Build 5) — v3 pass

This is a third-pass review. The two blocking issues from v2 — push notification payload field mismatch (`tripId` vs `trip_id`) and uncapped `earnings/history` limit — are both fixed in this build. The notification handler now uses `data.tripId ?? data.trip_id`, and `earnings.ts` applies `Math.min(Number(limit), 200)`. One new blocking issue surfaces: tapping a `trip_completed` push notification navigates to `RatingScreen` with only `{ tripId }` in the params, but `RatingScreen.submitRating` requires `driverId` (or `driver.id`) to post the rating. Both resolve to `undefined` from a notification-sourced navigation, making the rating silently skipped on every notification-tap path.

Watch for: **confirmed** — `RatingScreen` guards `if (tripId && rateeId)` before posting; `rateeId = driverId ?? driver?.id ?? null` where both `driverId` and `driver` are `undefined` when arriving from notification tap, so `rateeId` is `null` and the axios call is never made. The screen renders, the user selects stars, taps "Wasilisha" — nothing posts. **possible** — the platform field in both notification services is hardcoded `'android'`, meaning iOS tokens will be stored but push delivery will silently fail on iOS devices.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Both previously blocking notification issues are fixed. The `trip_completed` routing now correctly targets `Rating`, and the `tripId`/`trip_id` mismatch is resolved with a fallback. However, the full notification-tap-to-rating flow still breaks one level deeper: the Rating screen needs the driver's identity to post the rating, and the notification payload only carries `tripId`. The screen renders gracefully but submits nothing.

The rating route accepts a caller-supplied `ratee_id` without verifying it is actually the counterparty in the trip. A passenger could submit a rating against any user ID as long as they were a party to the trip. This is an integrity gap, not a security hole — the party check (`trip.passenger_id !== userId && trip.driver_id !== userId`) ensures the rater was in the trip, but not that the target was.

Both notification services hardcode `platform: 'android'`. iOS tokens will upsert correctly but Expo's push service requires the `sound` field format to differ slightly between platforms. In practice this is likely harmless — Expo handles the platform routing from the token prefix — but the `device_platform` stored in the DB will be wrong for iOS users.

The earnings insert uses `ON CONFLICT (trip_id) DO NOTHING` so retries don't double-credit, and the fire-and-forget `.catch()` means an earnings DB failure is logged but does not roll back the completed trip.

---

<details>
<summary>Issues (2)</summary>

1. **Rating skipped silently on notification tap** — `RatingScreen` computes `rateeId = driverId ?? driver?.id ?? null`. When navigated from a notification tap, the params only contain `{ tripId }`, so both are `undefined` and `rateeId` is `null`. The guard `if (tripId && rateeId)` skips the axios call entirely; the user sees the success alert but no rating is submitted. Fix: fetch trip details from the API on mount (using `tripId`) to retrieve `driver_id`, or include `driverId` in the `trip_completed` notification payload from the server.

2. **`ratee_id` not validated as the trip counterparty** — The rating POST verifies the rater is a party to the trip but does not verify that `ratee_id` is the other party. A passenger who was on trip T could submit a 1-star rating targeting an arbitrary user ID (any user in the system, not just their driver). Fix: add a check that `ratee_id === trip.driver_id` when `userId === trip.passenger_id`, and vice versa.

</details>

<details>
<summary>Details</summary>

### Rating screen receives insufficient params from notification tap

The `trip_completed` notification handler in `passenger-app/services/NotificationService.ts` stores:

```typescript
pendingNav = { screen: 'Rating', params: { tripId: resolvedTripId } };
```

`RatingScreen` destructures:

```typescript
const { driver, fare, pickup, destination, tripId, driverId } = route.params;
```

Both `driver` and `driverId` are `undefined`. The submit path:

```typescript
const rateeId = driverId ?? driver?.id ?? null;
if (tripId && rateeId) {
  await axios.post(`${API_BASE}/ratings`, { trip_id: tripId, ratee_id: rateeId, ... });
}
// rateeId is null → the block above is skipped
Alert.alert('Asante! 🌟', ...);  // fires regardless
```

The success alert fires unconditionally after the guarded block, so the user believes the rating was submitted. This path is only reachable via notification tap — navigating to Rating from `TripActiveScreen` (which passes the full params) works correctly.

The minimal fix is to include `driverId` in the server-side push payload:

```typescript
// trips.ts, /complete handler
sendPushNotification(
  trip.passenger_id, 'Safari Imekamilika 🎉', '...',
  { type: 'trip_completed', tripId, driverId: userId }
).catch(() => {});
```

Or fetch on mount:

```typescript
// RatingScreen
useEffect(() => {
  if (!driverId && !driver?.id && tripId) {
    fetchTripDetails(tripId).then(t => setResolvedDriverId(t.driver_id));
  }
}, []);
```

### `ratee_id` counterparty validation gap

The POST `/ratings` handler confirms the rater is a party:

```typescript
if (trip.passenger_id !== userId && trip.driver_id !== userId)
  return res.status(403).json({ error: 'Not a party to this trip' });
```

But it does not verify `ratee_id` is the actual counterparty. A passenger authenticated on trip T could send:

```json
{ "trip_id": "T", "ratee_id": "<any-user-uuid>", "rating": 1 }
```

The `UNIQUE (trip_id, rater_id)` constraint prevents a second rating, but the first rating silently targets an arbitrary account. The fix is one additional server-side check:

```typescript
const expectedRateeId =
  userId === trip.passenger_id ? trip.driver_id : trip.passenger_id;
if (ratee_id !== expectedRateeId)
  return res.status(400).json({ error: 'ratee_id does not match trip counterparty' });
```

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `apps/driver-app/src/services/BackgroundLocation.ts` | expo-task-manager guard, background GPS with foreground service notification |
| `apps/driver-app/src/services/NotificationService.ts` | Replaces Firebase/Notifee — guarded expo-notifications, Expo push token registration |
| `apps/passenger-app/services/NotificationService.ts` | Guarded expo-notifications, push token registration, tap-to-navigate handler (`trip_completed` → Rating, others → TripActive; camelCase/snake_case fallback) |
| `services/api-gateway/migrations/014_push_tokens.sql` | `user_push_tokens` (UNIQUE on token), push_token/device_platform on users |
| `services/api-gateway/migrations/015_ratings_earnings.sql` | `ratings` (UNIQUE trip_id+rater_id, CHECK 1–5), `driver_earnings` (UNIQUE trip_id) |
| `services/api-gateway/src/routes/ratings.ts` | Submit rating, get my ratings, driver rating summary; transactional average recalculation |
| `services/api-gateway/src/routes/earnings.ts` | Summary with FILTER aggregates, paginated history (limit capped at 200) |
| `services/api-gateway/src/routes/notifications.ts` | Push token upsert (UNIQUE conflict on token), `sendPushNotification` exported |
| `services/api-gateway/src/routes/trips.ts` | Push wiring at accept/driver-arriving/complete, fire-and-forget earnings insert on complete (20/80 split) |
| `apps/driver-app/src/screens/main/EarningsScreen.tsx` | Period toggle, 7-day bar chart (pure RN Views), pull-to-refresh, history list |
| `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` | 5-star UI, posts to /ratings |
| `apps/passenger-app/screens/RatingScreen.tsx` | 5-star UI with tip selection, posts to /ratings |
| `apps/passenger-app/screens/EarningsScreen.tsx` | Replaced static stub — calls GET /earnings/summary |
| `apps/driver-app/src/App.tsx` | Registers NotificationService.initialize() in useEffect |
| `apps/passenger-app/App.tsx` | Calls registerForPushNotifications and setupNotificationHandlers in initialization |

Full diff: `git diff main -- apps/driver-app apps/passenger-app services/api-gateway`

</details>
