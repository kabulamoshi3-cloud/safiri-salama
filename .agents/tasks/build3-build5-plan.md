# Build 3A + 3B + 5A + 5B — Implementation Plan

## Discovery Summary

### Migration state
Last committed migration: `013_admin_settings.sql`.
- **Migration 014** = push tokens (Build 3B)
- **Migration 015** = ratings + driver_earnings tables (Build 5A)
> ⚠️ Both prior plan files (`build3-plan.md` and `build5-plan.md`) incorrectly used number 012. This plan corrects that.

### Driver-app architecture
- Entry point: `App.tsx` → `src/App.tsx` (providers) → `RootNavigator` → `MainNavigator` (tabs + stacks)
- Screens live under `src/screens/{main,trip,auth,profile}/`
- Services: `LocationService.ts` (uses `react-native-background-geolocation` — **not in package.json**), `NotificationService.ts` (uses Firebase + Notifee — **not in package.json**), `DriverAPI.ts`, `api/client.ts`
- Contexts: `AuthContext`, `LocationContext` (foreground only, expo-location), `DriverStatusContext` (calls LocationService), `ThemeContext`
- Navigation: `HomeStackParamList` in `MainNavigator.tsx` governs all trip-flow screens (HomeMain → ActiveTrip → Navigation → RatePassenger)
- `expo-location ~17.0.0` is installed. `expo-task-manager` and `expo-notifications` are **absent** — guard with try/catch.

### Passenger-app architecture
- Single-file navigator in root `App.tsx` using `createNativeStackNavigator`
- Screens flat under `screens/` (no subdirectories)
- `EarningsScreen.tsx` and `RatingScreen.tsx` exist as stubs (no API calls)
- `services/` directory does **not** exist yet — must be created
- `axios` is installed; `expo-notifications` is **absent** — guard with try/catch
- `app.json` already has `expo-location` plugin and projectId `5f7ad6c8-510e-4f1b-a526-2933af25b604`

### Backend
- `notifications.ts` already exists with `/register`, `/send`, `/trip-update`, and `sendPushNotification` helper (exported). Push token already reads/writes `users.push_token` (column not yet in schema — migration 014 adds it).
- `trips.ts` has `POST /`, `GET /`, `PATCH /:id/status`, `PATCH /:id/assign-driver`, `PATCH /:id/complete`, `PATCH /:id/cancel`, `GET /available/nearby`, `POST /:id/rate`. The `rate` endpoint uses `trips.passenger_rating` / `driver_rating` — those columns were added in 011.
- `drivers.ts` exposes `GET /earnings` but it hits the trips table directly (not a `driver_earnings` table).
- Driver `status` column is `VARCHAR(20) DEFAULT 'offline'` with value `'available'` when online — use `status = 'available'` in queries (NOT `is_online = true`).

### Constraints
- No new npm/expo installs. Use only already-installed packages.
- TypeScript: 0 errors in all created/edited files.
- Always read target files in full before editing.
- API base URL: `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'`
- Driver-app API client token key: `'@skyrex:token'`. Same key in passenger-app.
- Auth user ID: `(req as any).user?.userId` in existing routes (trips.ts uses `userId`); use the same in new routes for consistency.

---

## Build 3A — Background GPS Service (Driver App)

### Step 1.1 — Create `BackgroundLocation.ts` service

**What:** New file implementing background GPS using `expo-location` (installed). Guard `expo-task-manager` import at module level with try/catch so the file loads safely on Expo Go. Register the `TaskManager.defineTask` call at module top so it fires before any navigator mounts.

**File to create:** `apps/driver-app/src/services/BackgroundLocation.ts`

```typescript
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

let TaskManager: any = null;
try { TaskManager = require('expo-task-manager'); } catch {}

export const BACKGROUND_LOCATION_TASK = 'skyrex-background-location';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) { console.error('[BGLocation]', error.message); return; }
    const locations: Location.LocationObject[] = data?.locations ?? [];
    if (!locations.length) return;
    const loc = locations[locations.length - 1];
    const { latitude: lat, longitude: lng, heading, speed } = loc.coords;
    try {
      const token   = await AsyncStorage.getItem('@skyrex:token');
      const trip_id = await AsyncStorage.getItem('@skyrex:active_trip_id');
      await axios.post(
        `${API_BASE}/tracking/driver/location`,
        { lat, lng, bearing: heading ?? 0, speed: speed ?? 0, trip_id: trip_id ?? undefined },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
    } catch { /* silent — background tasks must not throw */ }
  });
}

export async function startBackgroundTracking(): Promise<void> {
  if (!TaskManager) return;
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') return;
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (!running) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 10000,
      distanceInterval: 15,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'SkyRex GPS Inaendelea',
        notificationBody: 'Tunafuatilia mahali pako ili kuwasaidia abiria.',
        notificationColor: '#2e7d32',
      },
      pausesUpdatesAutomatically: false,
    });
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  if (!TaskManager) return;
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (!TaskManager) return false;
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
}
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 1.2 — Side-effect import in `apps/driver-app/App.tsx`

**What:** The root barrel `App.tsx` contains a single line. Prepend the BackgroundLocation import so `TaskManager.defineTask` is called before the navigator tree mounts.

**File to edit:** `apps/driver-app/App.tsx`

**Change:** Add before `import App from './src/App';`:
```typescript
import './src/services/BackgroundLocation';
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 1.3 — Call start/stop in `NavigationScreen.tsx`

**What:** `NavigationScreen.tsx` already has a `useEffect` that calls `fetchRoute()` and `startLocationWatch()` with a cleanup. Add background tracking start/stop calls alongside it.

**File to edit:** `apps/driver-app/src/screens/trip/NavigationScreen.tsx`

**Changes:**
1. Add after the last existing import:
   ```typescript
   import { startBackgroundTracking, stopBackgroundTracking } from '../../services/BackgroundLocation';
   ```
2. In the `useEffect` that calls `fetchRoute()` and `startLocationWatch()`:
   - At the **start** of the effect body: `startBackgroundTracking();`
   - In the **cleanup return**: `stopBackgroundTracking();` (before the existing `subscriptionRef.current?.remove()` line)

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 1.4 — Update `apps/driver-app/app.json`

**What:** Add `FOREGROUND_SERVICE_LOCATION` to android permissions (currently missing) and add the `expo-location` + `expo-notifications` plugins array. The `expo-notifications` plugin entry is included here as the logical home for both background location and notification build-time config.

**File to edit:** `apps/driver-app/app.json`

**Changes:**
1. Add `"FOREGROUND_SERVICE_LOCATION"` to `expo.android.permissions` array (alongside the existing 4 entries).
2. Add a `"plugins"` array to the `"expo"` object:
   ```json
   "plugins": [
     [
       "expo-location",
       {
         "locationAlwaysAndWhenInUsePermission": "SkyRex inahitaji eneo lako kuendesha safari hata wakati app inaendesha nyuma.",
         "isAndroidBackgroundLocationEnabled": true
       }
     ],
     [
       "expo-notifications",
       { "color": "#2e7d32" }
     ]
   ]
   ```

**Verify:** `node -e "require('./apps/driver-app/app.json')"` — JSON parses without error.

---

### Step 1.5 — GPS badge in `HomeScreen.tsx`

**What:** `HomeScreen.tsx` already reads `isTracking` from `useDriverStatus`. Add a 5-second polling check of `isBackgroundTrackingActive()` and show a green "GPS Inaendelea" badge in the status card when active.

**File to edit:** `apps/driver-app/src/screens/main/HomeScreen.tsx`

**Changes:**
1. Add import (after existing imports):
   ```typescript
   import { isBackgroundTrackingActive } from '../../services/BackgroundLocation';
   ```
2. Inside `HomeScreen` component, add state and effect:
   ```typescript
   const [gpsActive, setGpsActive] = useState(false);
   useEffect(() => {
     let mounted = true;
     const check = async () => {
       const active = await isBackgroundTrackingActive();
       if (mounted) setGpsActive(active);
     };
     check();
     const interval = setInterval(check, 5000);
     return () => { mounted = false; clearInterval(interval); };
   }, []);
   ```
3. In the `statusCard` View's content area, after the `statusContent` View:
   ```tsx
   {gpsActive && (
     <View style={styles.gpsBadge}>
       <View style={styles.gpsDot} />
       <Text style={[styles.gpsText, { color: theme.colors.success }]}>GPS Inaendelea</Text>
     </View>
   )}
   ```
4. Add to `StyleSheet.create`:
   ```typescript
   gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
   gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e7d32' },
   gpsText: { fontSize: 11, fontWeight: '600' },
   ```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

## Build 3B — Push Notifications

### Step 2.1 — Replace driver-app `NotificationService.ts`

**What:** The existing file imports `@react-native-firebase/messaging` and `@notifee/react-native` — both absent from package.json and will crash. Replace the entire file with an Expo-push implementation that guards `expo-notifications`. The exported class name and methods (`initialize()`, `cleanup()`) must stay identical so `src/App.tsx` (which calls them) compiles unchanged.

**File to overwrite:** `apps/driver-app/src/services/NotificationService.ts`

```typescript
/**
 * NotificationService — Expo Push
 * expo-notifications is absent from package.json; guarded with try/catch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch {}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const PUSH_TOKEN_KEY = '@skyrex:push_token';

export class NotificationService {
  static async initialize(): Promise<void> {
    if (!Notifications) return;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } =
        existing === 'granted' ? { status: existing } : await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '7956fd4b-f540-47d0-90ad-6904eceaaef7',
      });
      const token: string = tokenData.data;
      const saved = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (saved !== token) {
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        const authToken = await AsyncStorage.getItem('@skyrex:token');
        await axios.post(
          `${API_BASE}/notifications/register`,
          { pushToken: token, platform: Platform.OS },
          { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        );
      }

      Notifications.addNotificationReceivedListener((n: any) => {
        console.log('[NotificationService] Received:', n);
      });
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data ?? {};
        if (data.type === 'new_trip_request' && data.trip_id) {
          AsyncStorage.setItem(
            '@skyrex:pending_nav',
            JSON.stringify({ screen: 'TripRequest', params: { tripId: data.trip_id } })
          ).catch(() => {});
        }
      });
    } catch (e) {
      console.error('[NotificationService] init error:', e);
    }
  }

  static async cleanup(): Promise<void> {
    if (!Notifications) return;
    Notifications.removeAllNotificationSubscriptions?.();
  }
}
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 2.2 — Create passenger-app `services/NotificationService.ts`

**What:** The passenger app has no `services/` directory. Create it with a notification service that guards `expo-notifications`.

**File to create:** `apps/passenger-app/services/NotificationService.ts`

```typescript
/**
 * Passenger NotificationService — Expo Push (expo-notifications guarded)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch {}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const PUSH_TOKEN_KEY = '@skyrex:push_token';

export async function registerForPushNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === 'granted' ? { status: existing } : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '5f7ad6c8-510e-4f1b-a526-2933af25b604',
    });
    const token: string = tokenData.data;
    const saved = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (saved !== token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      const authToken = await AsyncStorage.getItem('@skyrex:token');
      await axios.post(
        `${API_BASE}/notifications/register`,
        { pushToken: token, platform: Platform.OS },
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      );
    }
  } catch (e) {
    console.error('[Passenger NotificationService] init error:', e);
  }
}

export function setupNotificationHandlers(): void {
  if (!Notifications) return;
  Notifications.addNotificationReceivedListener((n: any) => {
    console.log('[NotificationService] Received:', n);
  });
  Notifications.addNotificationResponseReceivedListener((response: any) => {
    const data = response.notification.request.content.data ?? {};
    if (data.trip_id) {
      AsyncStorage.setItem(
        '@skyrex:pending_nav',
        JSON.stringify({ screen: 'TripActive', params: { tripId: data.trip_id } })
      ).catch(() => {});
    }
  });
}
```

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — 0 errors.

---

### Step 2.3 — Update passenger `App.tsx`

**What:** Wire `registerForPushNotifications` + `setupNotificationHandlers` into the existing `useEffect`. Add a `NavigationContainer ref` + `onReady` handler to process any pending tapped-notification navigation stored in AsyncStorage.

**File to edit:** `apps/passenger-app/App.tsx`

**Changes:**
1. Add import (after existing imports):
   ```typescript
   import { registerForPushNotifications, setupNotificationHandlers } from './services/NotificationService';
   ```
2. Add `navigationRef` at the top of the `App` component:
   ```typescript
   const navigationRef = React.useRef<any>(null);
   ```
3. In the existing `useEffect` async IIFE, after `await i18n.loadSavedLanguage();`, add:
   ```typescript
   registerForPushNotifications();
   setupNotificationHandlers();
   ```
4. On `<NavigationContainer>` add:
   ```tsx
   ref={navigationRef}
   onReady={() => {
     AsyncStorage.getItem('@skyrex:pending_nav').then((raw) => {
       if (!raw) return;
       const { screen, params } = JSON.parse(raw);
       AsyncStorage.removeItem('@skyrex:pending_nav');
       navigationRef.current?.navigate(screen, params);
     });
   }}
   ```

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — 0 errors.

---

### Step 2.4 — Create migration `014_push_tokens.sql`

**What:** Add `push_token` and `device_platform` columns to `users` (needed by existing `notifications.ts` route), plus a `user_push_tokens` table for multi-device support.

> **Note:** Prior plan used number 012 — corrected to **014** since 012 and 013 are already taken.

**File to create:** `services/api-gateway/migrations/014_push_tokens.sql`

```sql
-- Migration 014: Push Tokens
-- Adds push_token / device_platform to users (used by notifications.ts).
-- Adds user_push_tokens table for multi-device support.

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_platform TEXT;

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE,
  platform   TEXT    NOT NULL DEFAULT 'android',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token   ON user_push_tokens(token);
```

**Verify:** SQL file is syntactically valid — review manually or run `psql --set ON_ERROR_STOP=1 -f services/api-gateway/migrations/014_push_tokens.sql` against a dev DB.

---

### Step 2.5 — Add `POST /push-token` endpoint to `notifications.ts`

**What:** Add a `/push-token` alias that upserts into `user_push_tokens` AND syncs `users.push_token` (so the existing `sendPushNotification` function keeps working without changes).

**File to edit:** `services/api-gateway/src/routes/notifications.ts`

**Change:** Insert after the existing `/register` route handler:

```typescript
/**
 * POST /api/v1/notifications/push-token
 * Upsert push token — stores in user_push_tokens and syncs users.push_token.
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { token, platform } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token)  return res.status(400).json({ error: 'token required' });

    const plat: string = platform ?? 'android';

    await pool.query(
      `INSERT INTO user_push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
      [userId, token, plat]
    );
    await pool.query(
      `UPDATE users SET push_token = $1, device_platform = $2 WHERE id = $3`,
      [token, plat, userId]
    );

    res.json({ status: 'ok', token, platform: plat });
  } catch (error) {
    console.error('Upsert push token error:', error);
    res.status(500).json({ error: 'Failed to upsert push token' });
  }
});
```

**Verify:** `cd services/api-gateway && npm run typecheck` — 0 errors.

---

### Step 2.6 — Wire push notifications into `trips.ts`

**What:** Four trip lifecycle events need to trigger push notifications. Import `sendPushNotification` from `./notifications` and fire it (fire-and-forget with `.catch(() => {})`) at the following points.

**File to edit:** `services/api-gateway/src/routes/trips.ts`

**Changes:**

1. Add import at top of file:
   ```typescript
   import { sendPushNotification } from './notifications';
   ```

2. In `PATCH /:tripId/assign-driver`, after `res.json(...)`:
   ```typescript
   pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId])
     .then(r => {
       if (r.rows[0]?.passenger_id)
         sendPushNotification(r.rows[0].passenger_id, 'Dereva amekubali! 🚗', 'Dereva anakuja. Tafadhali subiri.', { tripId, type: 'driver_assigned' });
     }).catch(() => {});
   ```

3. In `PATCH /:tripId/status`, after `res.json(...)` for a successful update:
   ```typescript
   if (status === 'driver_arriving') {
     pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId])
       .then(r => {
         if (r.rows[0]?.passenger_id)
           sendPushNotification(r.rows[0].passenger_id, 'Dereva Amefika Karibu! 📍', 'Dereva amefika karibu nawe! Toka sasa.', { tripId, type: 'driver_arriving' });
       }).catch(() => {});
   }
   ```

4. In `PATCH /:tripId/complete`, after `res.json(...)`:
   ```typescript
   pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId])
     .then(r => {
       if (r.rows[0]?.passenger_id)
         sendPushNotification(r.rows[0].passenger_id, 'Safari Imekamilika! 🎉', 'Asante kwa kutumia SkyRex. Tafadhali tathmini safari yako.', { tripId, type: 'trip_completed' });
     }).catch(() => {});
   ```

5. In `POST /` (create trip), after `res.status(201).json(...)`, add alert-nearby-drivers block:
   ```typescript
   (async () => {
     try {
       const newTripId: string = result.rows[0].id;
       // drivers.status column is 'available' when online (see 001_base_schema.sql)
       const drivers = await pool.query(
         `SELECT u.id FROM drivers d
          JOIN users u ON u.id = d.user_id
          WHERE d.status = 'available' AND u.push_token IS NOT NULL
          LIMIT 5`
       );
       for (const row of drivers.rows) {
         sendPushNotification(row.id, 'Ombi Jipya la Safari! 🔔', 'Kuna safari mpya karibu nawe.', { tripId: newTripId, type: 'new_trip_request' }).catch(() => {});
       }
     } catch {}
   })();
   ```

**Verify:** `cd services/api-gateway && npm run typecheck && npm test` — 0 errors, existing tests pass.

---

### Step 2.7 — Add `expo-notifications` plugin to passenger `app.json`

**What:** Driver-app `app.json` is handled in Step 1.4. Passenger `app.json` already has an `expo-location` plugin entry — append `expo-notifications` to that plugins array.

**File to edit:** `apps/passenger-app/app.json`

**Change:** In the `"plugins"` array, append:
```json
[
  "expo-notifications",
  { "color": "#1a73e8" }
]
```

**Verify:** `node -e "require('./apps/passenger-app/app.json')"` — JSON parses without error.

---

## Build 5A — Ratings and Earnings Backend

### Step 3.1 — Create migration `015_ratings_earnings.sql`

**What:** Add `ratings` table (for trip-level ratings) and `driver_earnings` table (one row per completed trip). Existing `trips.passenger_rating` / `trips.driver_rating` columns (added in 011) remain — the new `ratings` table stores the full review record.

> **Note:** Prior plan used number 012 — corrected to **015**.

**File to create:** `services/api-gateway/migrations/015_ratings_earnings.sql`

```sql
-- Migration 015: Ratings + Driver Earnings
-- ratings: per-trip review record for both directions (passenger→driver, driver→passenger)
-- driver_earnings: one row per completed trip for driver pay calculation

CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rater_id   UUID NOT NULL REFERENCES users(id),
  ratee_id   UUID NOT NULL REFERENCES users(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_trip_id  ON ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON ratings(ratee_id);

CREATE TABLE IF NOT EXISTS driver_earnings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID NOT NULL REFERENCES users(id),
  trip_id          UUID NOT NULL UNIQUE REFERENCES trips(id),
  gross_amount     BIGINT NOT NULL,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  net_amount       BIGINT NOT NULL,
  payment_method   VARCHAR(20) NOT NULL DEFAULT 'cash',
  period_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id        ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_period    ON driver_earnings(driver_id, period_date);
```

**Verify:** Review SQL by inspection; run `psql --set ON_ERROR_STOP=1 -f services/api-gateway/migrations/015_ratings_earnings.sql` against dev DB if available.

---

### Step 3.2 — Create `ratings.ts` route

**What:** Three endpoints. Use `(req as any).user?.userId` for auth consistency with other routes.

**File to create:** `services/api-gateway/src/routes/ratings.ts`

```typescript
/**
 * Ratings Routes
 * POST /       — submit rating for a completed trip
 * GET  /my     — ratings received by the current user
 * GET  /drivers/:driverId/rating  — public driver rating summary
 */
import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Submit a rating
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
    if (trip.status !== 'completed')
      return res.status(400).json({ error: 'Can only rate completed trips' });
    if (trip.passenger_id !== userId && trip.driver_id !== userId)
      return res.status(403).json({ error: 'Not part of this trip' });

    await pool.query(
      `INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, review)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (trip_id, rater_id) DO UPDATE
         SET rating = EXCLUDED.rating, review = EXCLUDED.review`,
      [trip_id, userId, ratee_id, rating, review ?? null]
    );

    // Recalculate ratee average and update users.rating
    await pool.query(
      `UPDATE users SET rating = (
         SELECT AVG(rating)::NUMERIC(3,2) FROM ratings WHERE ratee_id = $1
       ) WHERE id = $1`,
      [ratee_id]
    );

    res.status(201).json({ message: 'Rating submitted' });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// My received ratings
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
      ? result.rows.reduce((s, r) => s + r.rating, 0) / result.rows.length
      : 0;

    res.json({ average: parseFloat(avg.toFixed(2)), count: result.rows.length, ratings: result.rows });
  } catch (error) {
    console.error('Get my ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Public driver rating summary
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
      ? result.rows.reduce((s, r) => s + r.rating, 0) / result.rows.length
      : 0;

    res.json({ average: parseFloat(avg.toFixed(2)), count: result.rows.length, reviews: result.rows.slice(0, 5) });
  } catch (error) {
    console.error('Get driver rating error:', error);
    res.status(500).json({ error: 'Failed to get driver rating' });
  }
});

export default router;
```

**Verify:** `cd services/api-gateway && npm run typecheck` — 0 errors.

---

### Step 3.3 — Create `earnings.ts` route

**File to create:** `services/api-gateway/src/routes/earnings.ts`

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
        COALESCE(SUM(net_amount) FILTER (WHERE period_date = CURRENT_DATE),               0) AS today,
        COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '7 days'),  0) AS week,
        COALESCE(SUM(net_amount) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS month,
        COALESCE(SUM(net_amount), 0) AS total,
        COALESCE(SUM(gross_amount) FILTER (WHERE payment_method = 'cash'), 0) AS cash_collected,
        COALESCE(SUM(gross_amount) FILTER (WHERE payment_method != 'cash'), 0) AS digital_payments,
        COUNT(*) FILTER (WHERE period_date = CURRENT_DATE)  AS trips_today,
        COUNT(*) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '7 days')  AS trips_week,
        COUNT(*) FILTER (WHERE period_date >= CURRENT_DATE - INTERVAL '30 days') AS trips_month
       FROM driver_earnings
       WHERE driver_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    res.json({
      today:           parseInt(row.today),
      week:            parseInt(row.week),
      month:           parseInt(row.month),
      total:           parseInt(row.total),
      cashCollected:   parseInt(row.cash_collected),
      digitalPayments: parseInt(row.digital_payments),
      pendingPayment:  0,
      tripsToday:      parseInt(row.trips_today),
      tripsWeek:       parseInt(row.trips_week),
      tripsMonth:      parseInt(row.trips_month),
    });
  } catch (error) {
    console.error('Earnings summary error:', error);
    res.status(500).json({ error: 'Failed to get earnings summary' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { period, limit = 50, offset = 0 } = req.query;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let dateFilter = '1=1';
    if (period === 'today') dateFilter = "de.period_date = CURRENT_DATE";
    else if (period === 'week') dateFilter = "de.period_date >= CURRENT_DATE - INTERVAL '7 days'";
    else if (period === 'month') dateFilter = "de.period_date >= CURRENT_DATE - INTERVAL '30 days'";

    const result = await pool.query(
      `SELECT
        de.id, de.trip_id, de.gross_amount, de.net_amount,
        de.commission_amount, de.payment_method, de.period_date, de.created_at,
        u.name AS passenger_name,
        t.pickup_address, t.dropoff_address
       FROM driver_earnings de
       JOIN trips t ON t.id = de.trip_id
       LEFT JOIN users u ON u.id = t.passenger_id
       WHERE de.driver_id = $1 AND ${dateFilter}
       ORDER BY de.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ earnings: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Earnings history error:', error);
    res.status(500).json({ error: 'Failed to get earnings history' });
  }
});

export default router;
```

**Verify:** `cd services/api-gateway && npm run typecheck` — 0 errors.

---

### Step 3.4 — Register new routes in `index.ts`

**File to edit:** `services/api-gateway/src/routes/index.ts`

**Changes:**
1. After the `safeUse('/v1/driver-incentives', ...)` line, add:
   ```typescript
   safeUse('/v1/ratings',  () => require('./ratings'));
   safeUse('/v1/earnings', () => require('./earnings'));
   ```
2. Add `'ratings'` and `'earnings'` to the `features` array in the `/v1/status` handler.

**Verify:** `cd services/api-gateway && npm run typecheck && npm test` — 0 errors, existing tests pass.

---

### Step 3.5 — Insert `driver_earnings` row in `trips.ts` complete handler

**What:** After the `UPDATE trips SET status = 'completed' ...` query succeeds in `PATCH /:tripId/complete`, insert into `driver_earnings`. Use 15% commission. Log errors but do not throw.

**File to edit:** `services/api-gateway/src/routes/trips.ts`

**Change:** In `PATCH /:tripId/complete`, after `res.json(...)`, add:

```typescript
// Insert driver_earnings row (fire-and-forget; do not throw on failure)
(async () => {
  try {
    const amount = Math.round(Number(final_fare || trip.estimated_fare));
    const commission = Math.round(amount * 0.15);
    await pool.query(
      `INSERT INTO driver_earnings
         (driver_id, trip_id, gross_amount, commission_amount, net_amount, payment_method, period_date)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
       ON CONFLICT (trip_id) DO NOTHING`,
      [userId, tripId, amount, commission, amount - commission, payment_method || 'cash']
    );
  } catch (e) {
    console.error('driver_earnings insert error:', e);
  }
})();
```

**Verify:** `cd services/api-gateway && npm run typecheck && npm test` — 0 errors, existing tests pass.

---

### Step 3.6 — Add new methods to `DriverAPI.ts`

**What:** Four new static methods added to the existing class. Do not remove any existing method.

**File to edit:** `apps/driver-app/src/services/api/DriverAPI.ts`

**Add at the end of the class (before the closing `}`):**

```typescript
static async getEarningsSummary(): Promise<EarningsSummary> {
  return APIClient.get<EarningsSummary>('/earnings/summary');
}

static async getEarningsHistory(period?: string): Promise<any[]> {
  const q = period ? `?period=${period}` : '';
  const res = await APIClient.get<{ earnings: any[] }>(`/earnings/history${q}`);
  return res.earnings;
}

static async submitRating(payload: {
  trip_id: string;
  ratee_id: string;
  rating: number;
  review?: string;
}): Promise<void> {
  return APIClient.post<void>('/ratings', payload);
}

static async getDriverRating(driverId: string): Promise<{ average: number; count: number; reviews: any[] }> {
  return APIClient.get<{ average: number; count: number; reviews: any[] }>(
    `/ratings/drivers/${driverId}/rating`
  );
}
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

## Build 5B — Rating Screen Enhancements + EarningsScreen + RatePassengerScreen

### Step 4.1 — Wire `RatingScreen.tsx` (passenger-app) to the real API

**What:** The existing `RatingScreen.tsx` stubs `submitRating` with only an Alert. Add real API call, loading state, and destructure `tripId` + `driver.id` from route params.

**File to edit:** `apps/passenger-app/screens/RatingScreen.tsx`

**Changes:**
1. Add imports at top:
   ```typescript
   import axios from 'axios';
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { ActivityIndicator } from 'react-native';
   ```
2. Add `const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';`
3. In the destructure from `route.params`, add `tripId` and `driver.id` (the object shape `driver` already exists; just ensure `driver.id` is used):
   ```typescript
   const { driver, fare, pickup, destination, tripId } = route.params;
   ```
4. Add loading state: `const [submitting, setSubmitting] = useState(false);`
5. Replace `submitRating`:
   ```typescript
   const submitRating = async () => {
     setSubmitting(true);
     try {
       const token = await AsyncStorage.getItem('@skyrex:token');
       await axios.post(
         `${API_BASE}/ratings`,
         { trip_id: tripId, ratee_id: driver.id, rating, review: comment },
         { headers: { Authorization: `Bearer ${token}` } }
       );
       navigation.popToTop();
     } catch {
       Alert.alert('Error', 'Failed to submit rating. Please try again.');
     } finally {
       setSubmitting(false);
     }
   };
   ```
6. On the Submit button, show `ActivityIndicator` when `submitting` is true and disable the button.

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.2 — Rewrite `EarningsScreen.tsx` (passenger-app)

**What:** Replace the static stub with real data fetched from `/earnings/summary` and `/earnings/history`. Keep the same file, same dark-green aesthetic. No new packages — use plain `axios` + `AsyncStorage`.

**File to rewrite:** `apps/passenger-app/screens/EarningsScreen.tsx`

The new screen must:
- On mount: fetch token, call `GET /earnings/summary` and `GET /earnings/history?period=week`.
- Show a summary card (today net, week net, trips_today count).
- Period selector (Today / Week / Month) — triggers `GET /earnings/history?period=<value>`.
- History `ScrollView` with rows: date, passenger name, net amount, payment method.
- Loading spinner during fetch. Error state with retry button.
- "Withdraw Earnings" button → `Alert.alert('Coming Soon', 'Withdrawals will be available soon.')`.
- Use only `View`, `Text`, `TouchableOpacity`, `ScrollView`, `ActivityIndicator`, `StyleSheet` from react-native + `axios` + `AsyncStorage`.

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.3 — Switch `EarningsScreen.tsx` (driver-app) to real API

**What:** Replace `DriverAPI.getEarnings()` with `DriverAPI.getEarningsSummary()`. Add a history section below the existing 'All Time' card. Add a 'Withdraw Earnings' button.

**File to edit:** `apps/driver-app/src/screens/main/EarningsScreen.tsx`

**Changes:**
1. In `loadEarnings`, replace `DriverAPI.getEarnings()` → `DriverAPI.getEarningsSummary()`.
2. Add state: `const [history, setHistory] = useState<any[]>([]);`
3. Add `loadHistory` function:
   ```typescript
   const loadHistory = async (period: 'today' | 'week' | 'month') => {
     try {
       const data = await DriverAPI.getEarningsHistory(period);
       setHistory(data);
     } catch {}
   };
   ```
4. In the `selectedPeriod` change `useEffect` (add if not present), call `loadHistory(selectedPeriod)`.
5. After the existing 'All Time' summarySection `View`, add a history `FlatList`:
   ```tsx
   <View style={styles.historySection}>
     <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Trips</Text>
     {history.map((row, idx) => (
       <View key={row.id ?? idx} style={[styles.historyRow, { backgroundColor: theme.colors.surface }]}>
         <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
           {new Date(row.period_date).toLocaleDateString()}
         </Text>
         <Text style={{ color: theme.colors.text, fontSize: 14 }}>{row.passenger_name ?? '—'}</Text>
         <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
           TSh {row.net_amount?.toLocaleString()}
         </Text>
       </View>
     ))}
   </View>
   ```
6. Add a 'Withdraw Earnings' button at the bottom of the ScrollView:
   ```tsx
   <TouchableOpacity
     style={[styles.withdrawButton, { backgroundColor: theme.colors.primary }]}
     onPress={() => Alert.alert('Unaondoa Pesa', 'Kipengele hiki kitapatikana hivi karibuni.')}
   >
     <Text style={{ color: theme.colors.white, fontWeight: 'bold', fontSize: 16 }}>
       Ondoa Pesa (Withdraw)
     </Text>
   </TouchableOpacity>
   ```
7. Add new styles: `historySection`, `historyRow`, `withdrawButton`.

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.4 — Create `RatePassengerScreen.tsx` (driver-app)

**What:** New screen for driver to rate passenger after completing a trip. Uses `useTheme()` for colors matching `ActiveTripScreen.tsx` style. Params: `{ tripId, passengerId, passengerName, fare }`.

**File to create:** `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx`

The screen must:
- Show passenger avatar initial, name, and fare.
- Interactive 5-star row with `TouchableOpacity` per star.
- Optional comment `TextInput`.
- Submit button calling `DriverAPI.submitRating({ trip_id: tripId, ratee_id: passengerId, rating, review: comment })`.
- On success → `navigation.navigate('HomeMain')`. On error → `Alert.alert('Error', 'Failed to submit')`.
- Loading state on the button during submit.
- No new packages; style matches `ActiveTripScreen.tsx` (cards with shadows, theme colors).

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.5 — Register `RatePassengerScreen` in `MainNavigator.tsx`

**File to edit:** `apps/driver-app/src/navigation/MainNavigator.tsx`

**Changes:**
1. Add to `HomeStackParamList`:
   ```typescript
   RatePassenger: { tripId: string; passengerId: string; passengerName: string; fare: number };
   ```
2. Add import:
   ```typescript
   import RatePassengerScreen from '../screens/trip/RatePassengerScreen';
   ```
3. Add screen inside `HomeNavigator` (in `HomeStack.Navigator`):
   ```tsx
   <HomeStack.Screen
     name="RatePassenger"
     component={RatePassengerScreen}
     options={{ title: 'Rate Passenger' }}
   />
   ```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.6 — Update `ActiveTripScreen.tsx` to navigate to `RatePassengerScreen`

**What:** After `confirmPayment()` marks the trip completed and closes the payment modal, navigate to `RatePassengerScreen`. Also add `passengerId?: string` to the `ActiveTrip` param type.

**File to edit:** `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`

**Changes:**
1. In `HomeStackParamList['ActiveTrip']` (defined in `MainNavigator.tsx` — but `ActiveTripScreen` does not redeclare it; just pass the prop through). Actually: `ActiveTripScreen` receives `route: ActiveTripScreenRouteProp` which is typed from `HomeStackParamList`. Add `passengerId?: string` to `HomeStackParamList['ActiveTrip']` in `MainNavigator.tsx` instead (same file as 4.5 — do both in one edit).
2. In `confirmPayment()`, replace the `TODO` comment block with:
   ```typescript
   setShowPaymentModal(false);
   navigation.navigate('RatePassenger', {
     tripId: route.params.tripId,
     passengerId: route.params.passengerId ?? '',
     passengerName: trip.passengerName,
     fare: trip.fare,
   });
   ```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.7 — Add driver rating badge to `ProfileScreen.tsx`

**What:** Read `ProfileScreen.tsx` in full before editing. Add a `driverRating` state populated by `DriverAPI.getDriverRating(user?.id)`. Display below the driver's phone number.

**File to edit:** `apps/driver-app/src/screens/main/ProfileScreen.tsx`

**Changes:**
1. Add import: `import { DriverAPI } from '../../services/api/DriverAPI';`
2. Add state: `const [driverRating, setDriverRating] = useState<{ average: number; count: number } | null>(null);`
3. In `useEffect` on mount: `DriverAPI.getDriverRating(user?.id ?? '').then(r => setDriverRating(r)).catch(() => {});`
4. In the header/profile area, below the phone text, add:
   ```tsx
   {driverRating && driverRating.count > 0 && (
     <Text style={{ fontSize: 14, color: '#FFB300', marginTop: 4 }}>
       ⭐ {driverRating.average.toFixed(1)} ({driverRating.count} ratings)
     </Text>
   )}
   ```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

### Step 4.8 — Update `HomeScreen.tsx` to use `getEarningsSummary` and show rating

**What:** Switch the earnings API call and add a live driver rating display.

**File to edit:** `apps/driver-app/src/screens/main/HomeScreen.tsx`

**Changes:**
1. In `loadData`, replace `DriverAPI.getEarnings()` → `DriverAPI.getEarningsSummary()`.
2. Add import: `import { useAuth } from '../../contexts/AuthContext';`
3. Add `const { user } = useAuth();` inside the component.
4. Add state: `const [myRating, setMyRating] = useState<number>(4.8);`
5. In the `useEffect` that calls `loadData()`, also call:
   ```typescript
   if (user?.id) {
     DriverAPI.getDriverRating(user.id).then(r => setMyRating(r.average)).catch(() => {});
   }
   ```
6. In the `statsGrid` section, in the rating `statCard`, replace the hardcoded `4.8` with `{myRating.toFixed(1)}`.

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — 0 errors.

---

## Final Verification Sequence

Run these commands in order after all steps are complete:

```bash
# 1. API Gateway — typecheck + tests
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/services/api-gateway
npm run typecheck
npm test

# 2. Driver app — typecheck
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/apps/driver-app
npx tsc --noEmit

# 3. Passenger app — typecheck
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/apps/passenger-app
npx tsc --noEmit
```

All three must complete with zero errors.

---

## Summary: All Files

### Files to CREATE (new)
| File | Build |
|------|-------|
| `apps/driver-app/src/services/BackgroundLocation.ts` | 3A |
| `apps/passenger-app/services/NotificationService.ts` | 3B |
| `services/api-gateway/migrations/014_push_tokens.sql` | 3B |
| `services/api-gateway/migrations/015_ratings_earnings.sql` | 5A |
| `services/api-gateway/src/routes/ratings.ts` | 5A |
| `services/api-gateway/src/routes/earnings.ts` | 5A |
| `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx` | 5B |

### Files to MODIFY (existing)
| File | Build | What Changes |
|------|-------|-------------|
| `apps/driver-app/App.tsx` | 3A | Add BackgroundLocation side-effect import |
| `apps/driver-app/src/screens/trip/NavigationScreen.tsx` | 3A | Start/stop background tracking in useEffect |
| `apps/driver-app/app.json` | 3A/3B | Add FOREGROUND_SERVICE_LOCATION permission, expo-location + expo-notifications plugins |
| `apps/driver-app/src/screens/main/HomeScreen.tsx` | 3A/5B | GPS badge + switch to getEarningsSummary + live rating |
| `apps/driver-app/src/services/NotificationService.ts` | 3B | Replace broken Firebase/Notifee with Expo Push (guarded) |
| `apps/passenger-app/App.tsx` | 3B | registerForPushNotifications + setupNotificationHandlers + NavigationContainer ref |
| `apps/passenger-app/app.json` | 3B | Add expo-notifications to plugins array |
| `services/api-gateway/src/routes/notifications.ts` | 3B | Add POST /push-token endpoint |
| `services/api-gateway/src/routes/trips.ts` | 3B/5A | Push notifications on status changes + driver_earnings insert on complete |
| `services/api-gateway/src/routes/index.ts` | 5A | Register ratings + earnings routes |
| `apps/driver-app/src/services/api/DriverAPI.ts` | 5A | Add getEarningsSummary, getEarningsHistory, submitRating, getDriverRating |
| `apps/passenger-app/screens/RatingScreen.tsx` | 5B | Wire real API + loading state |
| `apps/passenger-app/screens/EarningsScreen.tsx` | 5B | Rewrite stub with real data fetch |
| `apps/driver-app/src/screens/main/EarningsScreen.tsx` | 5B | Switch to getEarningsSummary + history section + withdraw button |
| `apps/driver-app/src/navigation/MainNavigator.tsx` | 5B | Add RatePassenger to HomeStack, add passengerId to ActiveTrip params |
| `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx` | 5B | Navigate to RatePassenger on trip complete |
| `apps/driver-app/src/screens/main/ProfileScreen.tsx` | 5B | Add live driver rating display |

---

## Ordered Checklist

- [ ] **1.1** Create `BackgroundLocation.ts` in driver-app
      Files: `apps/driver-app/src/services/BackgroundLocation.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.2** Add BackgroundLocation side-effect import to `App.tsx` barrel
      Files: `apps/driver-app/App.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.3** Call start/stop background tracking in `NavigationScreen.tsx`
      Files: `apps/driver-app/src/screens/trip/NavigationScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.4** Edit driver-app `app.json` — permissions + plugins
      Files: `apps/driver-app/app.json`
      Verify: `node -e "require('./apps/driver-app/app.json')"` — parses OK

- [ ] **1.5** Add GPS badge to `HomeScreen.tsx` (driver-app)
      Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **2.1** Replace driver-app `NotificationService.ts` with Expo Push implementation
      Files: `apps/driver-app/src/services/NotificationService.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **2.2** Create passenger-app `services/NotificationService.ts`
      Files: `apps/passenger-app/services/NotificationService.ts`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **2.3** Update passenger `App.tsx` with notification init + pending-nav handler
      Files: `apps/passenger-app/App.tsx`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **2.4** Create migration `014_push_tokens.sql`
      Files: `services/api-gateway/migrations/014_push_tokens.sql`
      Verify: SQL review (or run against dev DB)

- [ ] **2.5** Add `POST /push-token` to `notifications.ts`
      Files: `services/api-gateway/src/routes/notifications.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors

- [ ] **2.6** Wire push notifications into `trips.ts` (4 event points)
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `cd services/api-gateway && npm run typecheck && npm test` — 0 errors

- [ ] **2.7** Add `expo-notifications` plugin to passenger `app.json`
      Files: `apps/passenger-app/app.json`
      Verify: `node -e "require('./apps/passenger-app/app.json')"` — parses OK

- [ ] **3.1** Create migration `015_ratings_earnings.sql`
      Files: `services/api-gateway/migrations/015_ratings_earnings.sql`
      Verify: SQL review (or run against dev DB)

- [ ] **3.2** Create `ratings.ts` route
      Files: `services/api-gateway/src/routes/ratings.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors

- [ ] **3.3** Create `earnings.ts` route
      Files: `services/api-gateway/src/routes/earnings.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors

- [ ] **3.4** Register ratings + earnings in `index.ts`
      Files: `services/api-gateway/src/routes/index.ts`
      Verify: `npm run typecheck && npm test` — all pass

- [ ] **3.5** Insert `driver_earnings` row in `trips.ts` complete handler
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `cd services/api-gateway && npm run typecheck && npm test` — all pass

- [ ] **3.6** Add 4 new methods to `DriverAPI.ts`
      Files: `apps/driver-app/src/services/api/DriverAPI.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.1** Wire `RatingScreen.tsx` (passenger-app) to real API
      Files: `apps/passenger-app/screens/RatingScreen.tsx`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **4.2** Rewrite `EarningsScreen.tsx` (passenger-app) with real data
      Files: `apps/passenger-app/screens/EarningsScreen.tsx`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **4.3** Update `EarningsScreen.tsx` (driver-app) to use new API + history
      Files: `apps/driver-app/src/screens/main/EarningsScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.4** Create `RatePassengerScreen.tsx` (driver-app)
      Files: `apps/driver-app/src/screens/trip/RatePassengerScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.5** Register `RatePassengerScreen` in `MainNavigator.tsx` + update param types
      Files: `apps/driver-app/src/navigation/MainNavigator.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.6** Update `ActiveTripScreen.tsx` to navigate to `RatePassengerScreen` on complete
      Files: `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.7** Add live rating badge to `ProfileScreen.tsx` (driver-app)
      Files: `apps/driver-app/src/screens/main/ProfileScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **4.8** Update `HomeScreen.tsx` (driver-app) — switch to getEarningsSummary + live rating
      Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors
