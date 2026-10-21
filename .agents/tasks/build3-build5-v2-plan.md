# Build 3A + 3B + 5A + 5B — v2 Implementation Plan

## Current-state audit (as of plan authoring)

### What is already done (do NOT redo):
- **BUILD 3A fully complete:**
  - `apps/driver-app/src/services/BackgroundLocation.ts` — exists, correct implementation
  - `apps/driver-app/App.tsx` — already has `import './src/services/BackgroundLocation';`
  - `apps/driver-app/src/screens/trip/NavigationScreen.tsx` — already imports and calls `startBackgroundTracking()` / `stopBackgroundTracking()`
  - `apps/driver-app/app.json` — already has `FOREGROUND_SERVICE_LOCATION` permission and both `expo-location` + `expo-notifications` plugins

- **BUILD 3B partially complete:**
  - `apps/driver-app/src/services/NotificationService.ts` — already replaced with Expo Push implementation (guards `expo-notifications`, correct `initialize()`/`cleanup()` API)
  - `apps/passenger-app/services/NotificationService.ts` — already exists with `registerForPushNotifications()` and `setupNotificationHandlers()`
  - `apps/passenger-app/App.tsx` — already imports and calls both functions; `navigationRef` + `onReady` handler already wired
  - `services/api-gateway/migrations/014_push_tokens.sql` — exists (correct, adds `push_token`/`device_platform` to users + `user_push_tokens` table)
  - `services/api-gateway/src/routes/notifications.ts` — already has `POST /push-token` endpoint AND `sendPushNotification` exported
  - `services/api-gateway/src/routes/trips.ts` — already imports `sendPushNotification` from `./notifications`; already fires push on `POST /` (new trip), `PATCH /:tripId/accept`, `PATCH /:tripId/driver-arriving`, `PATCH /:tripId/complete`

- **BUILD 3B missing (1 item):**
  - `apps/passenger-app/app.json` — needs `expo-notifications` plugin appended to plugins array

- **BUILD 5A missing (all):**
  - Migration `015_ratings_earnings.sql` — does not exist
  - `services/api-gateway/src/routes/ratings.ts` — does not exist
  - `services/api-gateway/src/routes/earnings.ts` — does not exist
  - `services/api-gateway/src/routes/index.ts` — does not register `/v1/ratings` or `/v1/earnings`

- **BUILD 5B partially complete:**
  - `apps/passenger-app/screens/RatingScreen.tsx` — exists but is a stub (no API call, no real submit)
  - `apps/passenger-app/screens/EarningsScreen.tsx` — exists but is a stub (all hardcoded zeros, no API call)
  - `apps/driver-app/src/screens/trip/` — no `RatePassengerScreen.tsx`; `HomeStackParamList` does not include `RatePassenger`
  - Both App.tsx navigators — no `RatePassenger` screen registered

### Discrepancies between existing code and plan:
1. **Driver HomeScreen step (Step 1.5 in v1 plan):** `HomeScreen.tsx` uses `react-native-vector-icons` which is imported as `Icon` — it is NOT in `package.json`. The GPS badge is a nice-to-have; skip it to avoid introducing a broken import. The background tracking itself is complete.
2. **`trips.ts` `PATCH /:tripId/status`:** Already returns 410 Gone (removed endpoint). The v1 plan's Step 2.6 items for `assign-driver` and `status` patches are irrelevant — the real endpoints are `/accept`, `/driver-arriving`, `/complete`, all of which already fire push notifications.
3. **`EarningsScreen.tsx` (driver-app):** Already a full screen using `DriverAPI.getEarnings()`. It works but hits `GET /driver/earnings` on the `drivers.ts` route (which reads from `trips` directly, not from a `driver_earnings` table). After migration 015, a dedicated `/v1/earnings/summary` endpoint will be available; the driver screen only needs the URL updated in `DriverAPI.ts`.
4. **`EarningsScreen.tsx` (passenger-app):** This is a stub — the passenger doesn't need earnings data. Leave it as-is (it is used only by the "DriverMain" flow inside `passenger-app`, not a core passenger feature).
5. **`RatingScreen.tsx` (passenger-app):** Exists as a stub. Needs to be enhanced to POST to `/v1/ratings` on submit.
6. **Migration numbering:** 014 is already used. Next is **015**.
7. **`trips.ts` `POST /:tripId/rate`:** Already exists in `trips.ts` and writes to `trips.passenger_rating`/`trips.driver_rating` columns (added in 011). After migration 015, ratings should also be inserted into the new `ratings` table — but the `/trips/:id/rate` endpoint can remain as-is for backwards compat; the new `/v1/ratings` route provides the `ratings` table path. The `RatingScreen` should POST to `/v1/ratings` (not `/v1/trips/:id/rate`), since it needs `rater_id`/`ratee_id` semantics.

---

## Build commands (discovered from package.json files)

- **api-gateway typecheck:** `cd services/api-gateway && npm run typecheck`
- **api-gateway tests:** `cd services/api-gateway && npm test`
- **driver-app typecheck:** `cd apps/driver-app && npx tsc --noEmit`
- **passenger-app typecheck:** `cd apps/passenger-app && npx tsc --noEmit`

---

## Implementation Plan

- [ ] 1. **[BUILD 3B] Add `expo-notifications` plugin to passenger `app.json`**

      The passenger app's `app.json` has an `expo-location` plugin but is missing `expo-notifications`. Append it so EAS build can configure push notification color/icon.

      File: `apps/passenger-app/app.json`

      Change: In the `"plugins"` array, append:
      ```json
      ["expo-notifications", { "color": "#1a73e8" }]
      ```

      Verify: `node -e "require('./apps/passenger-app/app.json'); console.log('ok')"` from workspace root — prints "ok" without error.

---

- [ ] 2. **[BUILD 5A] Create migration `015_ratings_earnings.sql`**

      Add a `ratings` table (trip-level review record with `rater_id`/`ratee_id`) and a `driver_earnings` table (one row per completed trip for driver pay). The existing `trips.passenger_rating` / `trips.driver_rating` columns (from 011) are kept for backwards compat; the new `ratings` table is the canonical source.

      File to create: `services/api-gateway/migrations/015_ratings_earnings.sql`

      ```sql
      -- Migration 015: Ratings + Driver Earnings
      CREATE TABLE IF NOT EXISTS ratings (
        id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id    UUID     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        rater_id   UUID     NOT NULL REFERENCES users(id),
        ratee_id   UUID     NOT NULL REFERENCES users(id),
        rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review     TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (trip_id, rater_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_trip_id  ON ratings(trip_id);
      CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON ratings(ratee_id);

      CREATE TABLE IF NOT EXISTS driver_earnings (
        id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id         UUID    NOT NULL REFERENCES users(id),
        trip_id           UUID    NOT NULL UNIQUE REFERENCES trips(id),
        gross_amount      BIGINT  NOT NULL,
        commission_amount BIGINT  NOT NULL DEFAULT 0,
        net_amount        BIGINT  NOT NULL,
        payment_method    VARCHAR(20) NOT NULL DEFAULT 'cash',
        period_date       DATE    NOT NULL DEFAULT CURRENT_DATE,
        created_at        TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id
        ON driver_earnings(driver_id);
      CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_period
        ON driver_earnings(driver_id, period_date);
      ```

      Verify: Review SQL by inspection. If a dev DB is available: `psql --set ON_ERROR_STOP=1 -f services/api-gateway/migrations/015_ratings_earnings.sql`.

---

- [ ] 3. **[BUILD 5A] Create `ratings.ts` route**

      Three endpoints: `POST /` to submit a rating, `GET /my` for ratings received by the authenticated user, and `GET /drivers/:driverId/rating` for a public driver rating summary. Uses `(req as any).user?.userId` consistent with `notifications.ts` and other routes. On submit, recalculates ratee's average and updates `users.rating`.

      File to create: `services/api-gateway/src/routes/ratings.ts`

      ```typescript
      /**
       * Ratings Routes
       * POST /          — submit a rating for a completed trip
       * GET  /my        — ratings received by the authenticated user
       * GET  /drivers/:driverId/rating — public driver rating summary
       */
      import { Router, Request, Response } from 'express';
      import { pool } from '../database/connection';

      const router = Router();

      router.post('/', async (req: Request, res: Response) => {
        try {
          const userId = (req as any).user?.userId;
          const { trip_id, ratee_id, rating, review } = req.body;

          if (!userId) return res.status(401).json({ error: 'Unauthorized' });
          if (!trip_id || !ratee_id || !rating)
            return res.status(400).json({ error: 'trip_id, ratee_id, and rating are required' });
          if (rating < 1 || rating > 5)
            return res.status(400).json({ error: 'rating must be between 1 and 5' });

          const tripResult = await pool.query(
            'SELECT passenger_id, driver_id, status FROM trips WHERE id = $1',
            [trip_id]
          );
          if (tripResult.rows.length === 0)
            return res.status(404).json({ error: 'Trip not found' });

          const trip = tripResult.rows[0];
          if (trip.status !== 'COMPLETED')
            return res.status(400).json({ error: 'Can only rate completed trips' });
          if (trip.passenger_id !== userId && trip.driver_id !== userId)
            return res.status(403).json({ error: 'Not a party to this trip' });

          await pool.query(
            `INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, review)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (trip_id, rater_id) DO UPDATE
               SET rating = EXCLUDED.rating, review = EXCLUDED.review`,
            [trip_id, userId, ratee_id, rating, review ?? null]
          );

          // Recalculate ratee average and update users.rating
          await pool.query(
            `UPDATE users
             SET rating = (
               SELECT AVG(rating)::NUMERIC(3,2)
               FROM ratings
               WHERE ratee_id = $1
             )
             WHERE id = $1`,
            [ratee_id]
          );

          res.status(201).json({ message: 'Rating submitted' });
        } catch (error) {
          console.error('Submit rating error:', error);
          res.status(500).json({ error: 'Failed to submit rating' });
        }
      });

      router.get('/my', async (req: Request, res: Response) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) return res.status(401).json({ error: 'Unauthorized' });

          const result = await pool.query(
            `SELECT r.*, u.name AS rater_name
             FROM ratings r
             JOIN users u ON u.id = r.rater_id
             WHERE r.ratee_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
          );

          const avg = result.rows.length
            ? result.rows.reduce((s: number, r: any) => s + r.rating, 0) / result.rows.length
            : 0;

          res.json({
            average: parseFloat(avg.toFixed(2)),
            count: result.rows.length,
            ratings: result.rows,
          });
        } catch (error) {
          console.error('Get my ratings error:', error);
          res.status(500).json({ error: 'Failed to get ratings' });
        }
      });

      router.get('/drivers/:driverId/rating', async (req: Request, res: Response) => {
        try {
          const { driverId } = req.params;

          const result = await pool.query(
            `SELECT r.rating, r.review, r.created_at, u.name AS rater_name
             FROM ratings r
             JOIN users u ON u.id = r.rater_id
             WHERE r.ratee_id = $1
             ORDER BY r.created_at DESC
             LIMIT 10`,
            [driverId]
          );

          const avg = result.rows.length
            ? result.rows.reduce((s: number, r: any) => s + r.rating, 0) / result.rows.length
            : 0;

          res.json({
            average: parseFloat(avg.toFixed(2)),
            count: result.rows.length,
            reviews: result.rows.slice(0, 5),
          });
        } catch (error) {
          console.error('Get driver rating error:', error);
          res.status(500).json({ error: 'Failed to get driver rating' });
        }
      });

      export default router;
      ```

      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors.

---

- [ ] 4. **[BUILD 5A] Create `earnings.ts` route**

      Two endpoints: `GET /summary` returns aggregated earnings grouped by today/week/month/total, and `GET /history` returns a per-trip earnings list. Reads from `driver_earnings` table created in step 2.

      File to create: `services/api-gateway/src/routes/earnings.ts`

      ```typescript
      /**
       * Earnings Routes
       * GET /summary  — aggregated earnings for today/week/month/total
       * GET /history  — per-trip earnings list
       */
      import { Router, Request, Response } from 'express';
      import { pool } from '../database/connection';

      const router = Router();

      router.get('/summary', async (req: Request, res: Response) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) return res.status(401).json({ error: 'Unauthorized' });

          const result = await pool.query(
            `SELECT
              COALESCE(SUM(net_amount) FILTER (WHERE period_date = CURRENT_DATE),                    0) AS today,
              COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS week,
              COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'),0) AS month,
              COALESCE(SUM(net_amount),                                                               0) AS total,
              COALESCE(SUM(gross_amount) FILTER (WHERE payment_method = 'cash'),                      0) AS cash_collected,
              COALESCE(SUM(gross_amount) FILTER (WHERE payment_method != 'cash'),                     0) AS digital_payments,
              COALESCE(SUM(commission_amount),                                                        0) AS total_commission
            FROM driver_earnings
            WHERE driver_id = $1`,
            [userId]
          );

          const row = result.rows[0];
          res.json({
            today:           Number(row.today),
            week:            Number(row.week),
            month:           Number(row.month),
            total:           Number(row.total),
            cashCollected:   Number(row.cash_collected),
            digitalPayments: Number(row.digital_payments),
            pendingPayment:  0,   // placeholder — no pending concept yet
          });
        } catch (error) {
          console.error('Earnings summary error:', error);
          res.status(500).json({ error: 'Failed to get earnings summary' });
        }
      });

      router.get('/history', async (req: Request, res: Response) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) return res.status(401).json({ error: 'Unauthorized' });

          const { limit = 50, offset = 0 } = req.query;

          const result = await pool.query(
            `SELECT
              de.*,
              t.pickup_address,
              t.dropoff_address,
              t.completed_at
             FROM driver_earnings de
             JOIN trips t ON t.id = de.trip_id
             WHERE de.driver_id = $1
             ORDER BY de.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, Number(limit), Number(offset)]
          );

          res.json({
            history: result.rows,
            count:   result.rows.length,
            limit:   Number(limit),
            offset:  Number(offset),
          });
        } catch (error) {
          console.error('Earnings history error:', error);
          res.status(500).json({ error: 'Failed to get earnings history' });
        }
      });

      export default router;
      ```

      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors.

---

- [ ] 5. **[BUILD 5A] Insert earnings row in `trips.ts` on trip completion and register both routes in `index.ts`**

      Two changes in this step:

      **5a — `trips.ts` earnings insert:**
      In `PATCH /:tripId/complete` (around line 550), after `sendPushNotification(...)` fire-and-forget, add an earnings insert (fire-and-forget so completion is never blocked):

      ```typescript
      // Insert driver earnings row (fire-and-forget)
      pool.query(
        `INSERT INTO driver_earnings
           (driver_id, trip_id, gross_amount, commission_amount, net_amount, payment_method, period_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
         ON CONFLICT (trip_id) DO NOTHING`,
        [
          userId,
          tripId,
          trip.final_fare ?? trip.estimated_fare ?? 0,
          Math.round((trip.final_fare ?? trip.estimated_fare ?? 0) * 0.15),
          Math.round((trip.final_fare ?? trip.estimated_fare ?? 0) * 0.85),
          trip.payment_method ?? 'cash',
        ]
      ).catch((err: any) => console.error('[trips] earnings insert error:', err));
      ```

      Note: `trip` here is the `TripRow` returned by `transitionTrip()`. `final_fare` and `estimated_fare` are fields on `TripRow` (check `trips.types.ts` — both are `number | null`). Commission rate is 15%.

      **5b — `index.ts` route registration:**
      In `services/api-gateway/src/routes/index.ts`, add after the `safeUse('/v1/notifications', ...)` line:

      ```typescript
      safeUse('/v1/ratings',           () => require('./ratings'));
      safeUse('/v1/earnings',          () => require('./earnings'));
      ```

      Also update the `/v1/status` features array to include `'ratings'` and `'earnings'`.

      Files: `services/api-gateway/src/routes/trips.ts`, `services/api-gateway/src/routes/index.ts`

      Verify: `cd services/api-gateway && npm run typecheck && npm test` — 0 TypeScript errors, existing tests pass.

---

- [ ] 6. **[BUILD 5A] Update `DriverAPI.ts` to call new `/v1/earnings/summary` endpoint**

      The existing `EarningsScreen.tsx` in driver-app calls `DriverAPI.getEarnings()`, which hits `/driver/earnings` on `drivers.ts`. After step 5, the canonical earnings data is at `/v1/earnings/summary`. Update `getEarnings()` to point to the new endpoint.

      File: `apps/driver-app/src/services/api/DriverAPI.ts`

      Change: In `getEarnings()`:
      ```typescript
      // Before:
      static async getEarnings(): Promise<EarningsSummary> {
        return APIClient.get<EarningsSummary>('/driver/earnings');
      }
      // After:
      static async getEarnings(): Promise<EarningsSummary> {
        return APIClient.get<EarningsSummary>('/earnings/summary');
      }
      ```

      The `EarningsSummary` interface shape already matches what `GET /earnings/summary` returns (`today`, `week`, `month`, `total`, `cashCollected`, `digitalPayments`, `pendingPayment`).

      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

- [ ] 7. **[BUILD 5B] Enhance `RatingScreen.tsx` (passenger app) to POST to `/v1/ratings`**

      The existing screen has a working star UI but `submitRating()` only shows a local `Alert`. Replace the submit handler with a real API call to `POST /api/v1/ratings`. The screen already receives `driver`, `fare`, `pickup`, `destination` from `route.params` — it needs `tripId` and `driverId` added to those params. Check where `Rating` is navigated to (in `TripActiveScreen.tsx` or similar) to confirm what params are passed.

      Read `apps/passenger-app/screens/TripActiveScreen.tsx` before editing to confirm the navigation call and what params are available.

      Files: `apps/passenger-app/screens/RatingScreen.tsx`

      Changes:
      1. Add `tripId` and `driverId` to the destructured params (alongside existing `driver`, `fare`, `pickup`, `destination`).
      2. Replace `submitRating` body:
         ```typescript
         const submitRating = async () => {
           try {
             const token = await AsyncStorage.getItem('@dalasmart:token');
             await axios.post(
               `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/ratings`,
               { trip_id: tripId, ratee_id: driverId ?? driver?.id, rating, review: comment || null },
               { headers: { Authorization: `Bearer ${token}` } }
             );
             Alert.alert('Asante!', `Umempa ${driver?.name ?? 'dereva'} nyota ${rating}`, [
               { text: 'Sawa', onPress: () => navigation.popToTop() },
             ]);
           } catch {
             Alert.alert('Hitilafu', 'Imeshindwa kutuma tathmini. Jaribu tena.');
           }
         };
         ```
      3. Change `submitBtn` `onPress` to `() => submitRating()` (was `submitRating` — keep async).
      4. Add imports at top: `import AsyncStorage from '@react-native-async-storage/async-storage';` and `import axios from 'axios';` (both are already in `package.json`).

      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors.

---

- [ ] 8. **[BUILD 5B] Create `RatePassengerScreen.tsx` in driver-app and register it**

      The driver needs a screen to rate the passenger after a trip completes. It does not exist yet. Create it and register it in `HomeStackParamList` + `HomeNavigator`.

      File to create: `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx`

      The screen receives `{ tripId, passengerId, passengerName, fare }` from `route.params`. It has the same star UI pattern as the passenger `RatingScreen`. On submit it POSTs to `/v1/ratings` then navigates to `HomeMain`.

      ```tsx
      import React, { useState } from 'react';
      import {
        View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
      } from 'react-native';
      import { StackNavigationProp } from '@react-navigation/stack';
      import { RouteProp } from '@react-navigation/native';
      import AsyncStorage from '@react-native-async-storage/async-storage';
      import axios from 'axios';
      import { HomeStackParamList } from '../../navigation/MainNavigator';
      import { useTheme } from '../../contexts/ThemeContext';

      type RatePassengerNavProp = StackNavigationProp<HomeStackParamList, 'RatePassenger'>;
      type RatePassengerRouteProp = RouteProp<HomeStackParamList, 'RatePassenger'>;

      interface Props {
        navigation: RatePassengerNavProp;
        route: RatePassengerRouteProp;
      }

      const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

      const RatePassengerScreen: React.FC<Props> = ({ navigation, route }) => {
        const { theme } = useTheme();
        const { tripId, passengerId, passengerName, fare } = route.params;
        const [rating, setRating] = useState(5);
        const [comment, setComment] = useState('');

        const submitRating = async () => {
          try {
            const token = await AsyncStorage.getItem('@dalasmart:token');
            await axios.post(
              `${API_BASE}/ratings`,
              { trip_id: tripId, ratee_id: passengerId, rating, review: comment || null },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
          } catch {
            Alert.alert('Hitilafu', 'Imeshindwa kutuma tathmini. Jaribu tena.');
          }
        };

        return (
          <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.title}>Safari Imekamilika</Text>
              <Text style={styles.fare}>TSh {fare?.toLocaleString()}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Tathmini Abiria</Text>

              <View style={styles.avatarRow}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {(passengerName ?? 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.passengerName, { color: theme.colors.text }]}>
                  {passengerName ?? 'Abiria'}
                </Text>
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingLabel, { color: theme.colors.textSecondary }]}>
                {rating === 5 ? 'Bora sana!' : rating === 4 ? 'Nzuri' : rating === 3 ? 'Sawa' : rating === 2 ? 'Mbaya' : 'Mbaya sana'}
              </Text>

              <TextInput
                style={[styles.commentInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Maoni (si lazima)"
                placeholderTextColor={theme.colors.textSecondary}
                value={comment}
                onChangeText={setComment}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={submitRating}
              >
                <Text style={styles.submitText}>Tuma Tathmini</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] })}>
                <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                  Ruka kwa sasa
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      };

      const styles = StyleSheet.create({
        container:    { flex: 1 },
        header:       { padding: 30, alignItems: 'center' },
        checkmark:    { fontSize: 40, marginBottom: 8 },
        title:        { fontSize: 22, fontWeight: 'bold', color: '#fff' },
        fare:         { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
        card:         { margin: 16, borderRadius: 14, padding: 20 },
        cardTitle:    { fontSize: 17, fontWeight: '600', marginBottom: 16 },
        avatarRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
        avatar:       { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        avatarText:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
        passengerName:{ fontSize: 16 },
        starsRow:     { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
        star:         { fontSize: 40, color: '#ddd', marginHorizontal: 4 },
        starActive:   { color: '#ffc107' },
        ratingLabel:  { textAlign: 'center', fontSize: 14, marginBottom: 16 },
        commentInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16 },
        submitBtn:    { padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
        submitText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
        skipText:     { textAlign: 'center', fontSize: 14, paddingVertical: 8 },
      });

      export default RatePassengerScreen;
      ```

      File to edit: `apps/driver-app/src/navigation/MainNavigator.tsx`
      - Add `RatePassenger` to `HomeStackParamList`:
        ```typescript
        RatePassenger: {
          tripId: string;
          passengerId: string;
          passengerName: string;
          fare: number;
        };
        ```
      - Import `RatePassengerScreen` from `'../screens/trip/RatePassengerScreen'`
      - Add inside `HomeNavigator`:
        ```tsx
        <HomeStack.Screen
          name="RatePassenger"
          component={RatePassengerScreen}
          options={{ headerShown: false }}
        />
        ```

      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

- [ ] 9. **[BUILD 5B] Wire `RatePassenger` navigation from `ActiveTripScreen.tsx` (driver-app)**

      After a trip completes in `ActiveTripScreen.tsx`, the driver should be sent to `RatePassenger` instead of (or after) navigating to `HomeMain`. Read `ActiveTripScreen.tsx` in full before editing to find the completion handler.

      File: `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`

      Find the trip completion handler (the place that calls `navigation.navigate('HomeMain')` or `navigation.reset(...)` after a successful complete call) and replace it with:
      ```typescript
      navigation.replace('RatePassenger', {
        tripId: trip.id,           // or whatever the trip ID field is named in that component
        passengerId: trip.passenger_id ?? trip.passengerId,
        passengerName: trip.passenger_name ?? trip.passengerName ?? 'Abiria',
        fare: trip.final_fare ?? trip.fare ?? 0,
      });
      ```

      If the component uses local stub data (it does — the `trip` state is hardcoded), wire the `tripId` from `route.params.tripId` instead. The field names in `TripRow` are snake_case; the component's local `Trip` interface uses camelCase — use whichever is available. Add fallbacks for all fields to avoid crashes.

      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

## Verification Summary (run after all steps complete)

```bash
# Backend
cd services/api-gateway && npm run typecheck
cd services/api-gateway && npm test

# Driver app
cd apps/driver-app && npx tsc --noEmit

# Passenger app
cd apps/passenger-app && npx tsc --noEmit

# JSON validity
node -e "require('./apps/passenger-app/app.json'); console.log('passenger app.json ok')"
node -e "require('./apps/driver-app/app.json');    console.log('driver app.json ok')"
```

Expected: 0 TypeScript errors in all projects, all existing tests pass.

---

## Items explicitly out of scope (do not implement):

- HomeScreen GPS badge (Step 1.5 of v1 plan) — skipped because `react-native-vector-icons` is not in `package.json` and the background tracking itself is already complete.
- Passenger `EarningsScreen.tsx` update — this screen serves a driver mode inside the passenger app and is a stub; it does not need live data for the current build scope.
- `drivers.ts` `GET /earnings` endpoint — it still works from `trips` directly; it is legacy and not removed in this plan to avoid breaking existing callers.
