# Build 5 — Driver Earnings + Rating System: Implementation Plan

> This plan is structured as three sequentially-dependent features.
> FEAT-001 (backend) must land first; FEAT-002 and FEAT-003 both depend on it but are
> independent of each other and could be done in either order (FEAT-002 first here).
>
> Key discoveries from codebase exploration:
> - **Migration gap**: migrations jump from 011 to nothing. Next file is **012_ratings_earnings.sql** (not 015).
> - **Auth shape**: `auth.ts` middleware sets `req.user.id`, but older `trips.ts` uses `req.user.userId`. New routes must use `(req as any).user?.id`.
> - **Existing stubs**: `passenger-app/screens/EarningsScreen.tsx` and `passenger-app/screens/RatingScreen.tsx` both exist but are UI-only stubs (no API calls). Both need API wiring, not creation from scratch.
> - **Driver-app EarningsScreen** (`src/screens/main/EarningsScreen.tsx`) exists and is functional UI, but calls `DriverAPI.getEarnings()` which hits `/driver/earnings` — a non-existent gateway endpoint. Needs to be switched to the new `/earnings/summary` endpoint.
> - **RatePassengerScreen** does NOT exist in driver-app — must be created from scratch at `src/screens/trip/RatePassengerScreen.tsx`.
> - **Driver rating** is already displayed in `TripActiveScreen.tsx` as `driver.rating` from trip data, but it comes from a mock/tracking endpoint. Needs to be augmented with a live fetch from `/ratings/drivers/:driverId/rating`.
> - `passenger-app/App.tsx` already imports and registers `EarningsScreen` and `RatingScreen` — no new screen registrations needed there.
> - `driver-app` uses `MainNavigator.tsx` for all screen registrations (both tab and stack screens). `RatePassengerScreen` must be added to `HomeStack` there.

---

## FEAT-001 — Backend: Migration + ratings.ts + earnings.ts + trips.ts hook

- [ ] 1. **Create DB migration 012.**
  Create `/run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/services/api-gateway/migrations/012_ratings_earnings.sql`.
  Contents:
  - `ratings` table: `id UUID PK`, `trip_id UUID REFERENCES trips(id)`, `rater_id UUID REFERENCES users(id)`, `ratee_id UUID REFERENCES users(id)`, `rating SMALLINT CHECK(1-5)`, `review TEXT`, `created_at TIMESTAMP DEFAULT NOW()`, `UNIQUE(trip_id, rater_id)`.
  - `driver_earnings` table: `id UUID PK`, `driver_id UUID REFERENCES users(id)`, `trip_id UUID UNIQUE REFERENCES trips(id)`, `gross_amount BIGINT`, `commission_amount BIGINT DEFAULT 0`, `net_amount BIGINT`, `payment_method VARCHAR(20)`, `period_date DATE DEFAULT CURRENT_DATE`, `created_at TIMESTAMP DEFAULT NOW()`.
  - Indexes: on `ratings(trip_id)`, `ratings(ratee_id)`, `driver_earnings(driver_id)`, `driver_earnings(driver_id, period_date)`.

  Files: `services/api-gateway/migrations/012_ratings_earnings.sql`
  Verify: `cd services/api-gateway && npm run typecheck` (SQL file does not affect TypeScript; verify SQL is syntactically sane by inspection).

- [ ] 2. **Create `ratings.ts` route.**
  Create `services/api-gateway/src/routes/ratings.ts`. Export default `Router`. Three endpoints:
  - `POST /` — auth required; body `{ trip_id, ratee_id, rating, review }`; verify trip is completed and caller is passenger or driver; `INSERT INTO ratings`; recalculate ratee average and `UPDATE users SET rating = avg`; return 201.
  - `GET /my` — auth required; return all ratings received by `req.user.id` with average and count.
  - `GET /drivers/:driverId/rating` — public; return average, count, last 5 reviews.
  Use `(req as any).user?.id` for userId.

  Files: `services/api-gateway/src/routes/ratings.ts`
  Verify: `npm run typecheck` in api-gateway exits 0.

- [ ] 3. **Create `earnings.ts` route.**
  Create `services/api-gateway/src/routes/earnings.ts`. Export default `Router`. Two endpoints:
  - `GET /summary` — auth required; aggregate `driver_earnings` by period (today/week/month/total); also return trip counts; return `{ today, week, month, total, cash_collected, digital_payments, pending_payment, trips_today, trips_week, trips_month }`.
  - `GET /history` — auth required; query param `period`; JOIN driver_earnings + trips + users; return array of earning rows with passenger name and addresses; default limit 50.
  Use `(req as any).user?.id`.

  Files: `services/api-gateway/src/routes/earnings.ts`
  Verify: `npm run typecheck` exits 0.

- [ ] 4. **Register new routes in `index.ts`.**
  In `services/api-gateway/src/routes/index.ts`, add after the `driver-incentives` line:
  ```typescript
  safeUse('/v1/ratings',  () => require('./ratings'));
  safeUse('/v1/earnings', () => require('./earnings'));
  ```
  Add `'ratings'` and `'driver_earnings'` to the features array in the `/v1/status` handler.

  Files: `services/api-gateway/src/routes/index.ts`
  Verify: `npm run typecheck` exits 0; `npm test` existing tests pass.

- [ ] 5. **Add driver_earnings insert to `trips.ts` complete handler.**
  In `services/api-gateway/src/routes/trips.ts`, inside `PATCH /:tripId/complete`, after the successful UPDATE trips query, add:
  ```sql
  INSERT INTO driver_earnings (id, driver_id, trip_id, gross_amount, commission_amount, net_amount, payment_method, period_date)
  VALUES (gen_random_uuid(), $1, $2, $3, ROUND($3 * 0.15), $3 - ROUND($3 * 0.15), $4, CURRENT_DATE)
  ON CONFLICT (trip_id) DO NOTHING
  ```
  Log errors but do not throw (log-and-continue pattern). `gross_amount` = `Math.round(final_fare || trip.estimated_fare)` cast to number.

  Files: `services/api-gateway/src/routes/trips.ts`
  Verify: `npm run typecheck` exits 0; `npm test` passes.

- [ ] 6. **Add new methods to `DriverAPI.ts`.**
  In `apps/driver-app/src/services/api/DriverAPI.ts`, add four static methods without removing existing ones:
  - `getEarningsSummary(): Promise<EarningsSummary>` → `GET /earnings/summary`
  - `getEarningsHistory(period?: string): Promise<any[]>` → `GET /earnings/history?period=...`
  - `submitRating(payload: { trip_id: string; ratee_id: string; rating: number; review?: string }): Promise<void>` → `POST /ratings`
  - `getDriverRating(driverId: string): Promise<{ average: number; count: number; reviews: any[] }>` → `GET /ratings/drivers/:driverId/rating`

  Files: `apps/driver-app/src/services/api/DriverAPI.ts`
  Verify: `cd apps/driver-app && npx tsc --noEmit 2>&1 | head -40` — no new errors.

---

## FEAT-002 — Passenger-app: API wiring for RatingScreen, EarningsScreen, TripActiveScreen rating badge

*Depends on FEAT-001. Independent of FEAT-003.*

- [ ] 7. **Wire `RatingScreen.tsx` to the real API.**
  Modify `apps/passenger-app/screens/RatingScreen.tsx`. Add `axios` import and `API_BASE` constant. Replace the Alert-only `submitRating` body with:
  1. Get token from `AsyncStorage.getItem('@safiriharaka:token')`.
  2. `axios.post(\`\${API_BASE}/ratings\`, { trip_id: tripId, ratee_id: driver.id, rating, review: comment }, { headers: { Authorization: \`Bearer \${token}\` } })`.
  3. On success → `navigation.popToTop()`. On error → `Alert.alert('Error', 'Failed to submit rating')`.
  4. Show `ActivityIndicator` while submitting (disable button).
  Destructure `tripId` and `driver.id` from `route.params` (add to existing destructure).
  Keep all existing visual layout unchanged.

  Files: `apps/passenger-app/screens/RatingScreen.tsx`
  Verify: `cd apps/passenger-app && npx tsc --noEmit 2>&1 | head -40`

- [ ] 8. **Augment `TripActiveScreen.tsx` with live driver rating.**
  In `apps/passenger-app/screens/TripActiveScreen.tsx`, inside the `fetchDriverInfo` function (already fired on hasTripId), after setting driver name/plate, fire a second request `axios.get(\`\${API_BASE}/ratings/drivers/\${driverIdFromTrip}/rating\`)` and update `driver.rating` via `setDriver(prev => ({ ...prev, rating: res.data.average }))`. The `driverIdFromTrip` must come from the tracking trip endpoint — store driver_id from the trip GET response. Add `driverIdFromTrip` as a local ref. Keep all existing logic intact; this is an additive change.

  Files: `apps/passenger-app/screens/TripActiveScreen.tsx`
  Verify: `cd apps/passenger-app && npx tsc --noEmit 2>&1 | head -40`

- [ ] 9. **Replace `EarningsScreen.tsx` stub in passenger-app with real data.**
  Rewrite `apps/passenger-app/screens/EarningsScreen.tsx`. On mount: fetch token from AsyncStorage; call `GET /earnings/summary` and `GET /earnings/history?period=week` with Bearer auth. Display: summary card (today net, week net, trips_today), period selector (Today/Week/Month — refetch history on change), and history list (ScrollView of rows). Add a disabled 'Withdraw' button showing Alert 'Coming soon'. Use plain StyleSheet + emoji icons — no new npm packages (no ThemeContext, no react-native-vector-icons).

  Files: `apps/passenger-app/screens/EarningsScreen.tsx`
  Verify: `cd apps/passenger-app && npx tsc --noEmit 2>&1 | head -40`

---

## FEAT-003 — Driver-app: EarningsScreen real data, RatePassengerScreen, ProfileScreen rating badge, HomeScreen wiring

*Depends on FEAT-001. Independent of FEAT-002.*

- [ ] 10. **Switch `EarningsScreen.tsx` (driver-app) to the real API endpoint.**
  In `apps/driver-app/src/screens/main/EarningsScreen.tsx`, replace `DriverAPI.getEarnings()` with `DriverAPI.getEarningsSummary()`. Add a history section: after the existing 'All Time' card, call `DriverAPI.getEarningsHistory(selectedPeriod)` in a new `loadHistory` function triggered by `selectedPeriod` change. Render a `FlatList` of history rows (date, passenger name, net amount, payment method). Add a 'Withdraw Earnings' `TouchableOpacity` at the bottom (Alert 'Withdrawal coming soon'). Keep all existing ThemeContext/useTranslation usage intact.

  Files: `apps/driver-app/src/screens/main/EarningsScreen.tsx`
  Verify: `cd apps/driver-app && npx tsc --noEmit 2>&1 | head -40`

- [ ] 11. **Create `RatePassengerScreen.tsx`.**
  Create `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` from scratch. Params: `{ tripId: string; passengerId: string; passengerName: string; fare: number }`. UI: header title, passenger avatar initial, 5-star interactive row, optional comment TextInput, Submit button. On submit: call `DriverAPI.submitRating({ trip_id, ratee_id: passengerId, rating, review: comment })`. On success: `navigation.navigate('HomeMain')`. On error: Alert. Use `useTheme()` for colors, matching style of `ActiveTripScreen.tsx`. No new packages.

  Files: `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` (new)
  Verify: `npx tsc --noEmit` in driver-app exits 0.

- [ ] 12. **Register `RatePassengerScreen` in `MainNavigator.tsx` and update `HomeStackParamList`.**
  In `apps/driver-app/src/navigation/MainNavigator.tsx`:
  - Add `RatePassenger: { tripId: string; passengerId: string; passengerName: string; fare: number }` to `HomeStackParamList`.
  - Import `RatePassengerScreen` from `'../screens/trip/RatePassengerScreen'`.
  - Add `<HomeStack.Screen name="RatePassenger" component={RatePassengerScreen} options={{ title: 'Rate Passenger' }} />` inside `HomeNavigator`.

  Files: `apps/driver-app/src/navigation/MainNavigator.tsx`
  Verify: `npx tsc --noEmit` exits 0.

- [ ] 13. **Update `ActiveTripScreen.tsx` to navigate to `RatePassengerScreen` on completion.**
  In `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`, in `confirmPayment()` after `setTrip({ ...trip, status: 'completed' })`, replace the `setShowPaymentModal(false)` + comment with:
  ```typescript
  setShowPaymentModal(false);
  navigation.navigate('RatePassenger', {
    tripId: route.params.tripId,
    passengerId: route.params.passengerId ?? '',
    passengerName: trip.passengerName,
    fare: trip.fare,
  });
  ```
  Add `passengerId?: string` to `HomeStackParamList['ActiveTrip']`.

  Files: `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
  Verify: `npx tsc --noEmit` exits 0.

- [ ] 14. **Show driver rating in `ProfileScreen.tsx`.**
  In `apps/driver-app/src/screens/main/ProfileScreen.tsx`, add:
  - `const { user } = useAuth()` (already imported from context).
  - `const [driverRating, setDriverRating] = useState<{ average: number; count: number } | null>(null)`.
  - `useEffect` on mount: `DriverAPI.getDriverRating(user?.id ?? '').then(r => setDriverRating(r)).catch(() => {})`.
  - In the `profileHeader` section, below the phone `Text`, render: `{driverRating && driverRating.count > 0 && (<Text>⭐ {driverRating.average.toFixed(1)} ({driverRating.count} ratings)</Text>)}`.
  Import `DriverAPI` from `'../../services/api/DriverAPI'`.

  Files: `apps/driver-app/src/screens/main/ProfileScreen.tsx`
  Verify: `npx tsc --noEmit` exits 0.

- [ ] 15. **Show driver rating in `HomeScreen.tsx`.**
  In `apps/driver-app/src/screens/main/HomeScreen.tsx`:
  - Change `DriverAPI.getEarnings()` call inside `loadData` to `DriverAPI.getEarningsSummary()`.
  - Add `const { user } = useAuth()` (import useAuth).
  - Add state `const [myRating, setMyRating] = useState<number>(0)`.
  - After `loadData()` call in `useEffect`, also call `DriverAPI.getDriverRating(user?.id ?? '').then(r => setMyRating(r.average)).catch(() => {})`.
  - In the home screen earnings/status area, add a small `⭐ {myRating.toFixed(1)}` text badge next to the driver status indicator.

  Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`
  Verify: `cd apps/driver-app && npx tsc --noEmit 2>&1 | head -40` — no errors.

---

## Summary of files to create vs. modify

| File | Action |
|---|---|
| `services/api-gateway/migrations/012_ratings_earnings.sql` | **CREATE** |
| `services/api-gateway/src/routes/ratings.ts` | **CREATE** |
| `services/api-gateway/src/routes/earnings.ts` | **CREATE** |
| `services/api-gateway/src/routes/index.ts` | **MODIFY** (add 2 safeUse lines) |
| `services/api-gateway/src/routes/trips.ts` | **MODIFY** (add driver_earnings insert in /complete) |
| `apps/driver-app/src/services/api/DriverAPI.ts` | **MODIFY** (add 4 methods) |
| `apps/passenger-app/screens/RatingScreen.tsx` | **MODIFY** (add API call, keep UI) |
| `apps/passenger-app/screens/TripActiveScreen.tsx` | **MODIFY** (add rating fetch) |
| `apps/passenger-app/screens/EarningsScreen.tsx` | **REWRITE** (stub → real data, same file) |
| `apps/passenger-app/App.tsx` | **NO CHANGE** (already registers both screens) |
| `apps/driver-app/src/screens/main/EarningsScreen.tsx` | **MODIFY** (new API method + history + withdraw) |
| `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` | **CREATE** |
| `apps/driver-app/src/navigation/MainNavigator.tsx` | **MODIFY** (add RatePassenger to stack) |
| `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx` | **MODIFY** (navigate to RatePassenger on complete) |
| `apps/driver-app/src/screens/main/ProfileScreen.tsx` | **MODIFY** (add rating display) |
| `apps/driver-app/src/screens/main/HomeScreen.tsx` | **MODIFY** (switch to getEarningsSummary, add rating badge) |
| `apps/driver-app/src/App.tsx` | **NO CHANGE** (navigation is in MainNavigator) |
