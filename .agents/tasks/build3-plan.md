# Build 3 — Implementation Plan
## Feature 1: Background GPS (Driver App) + Feature 2: Push Notifications (Both Apps + API)

> **Constraints (read before touching any file)**
> - NO new npm/expo installs. Work only with packages already in package.json.
> - TypeScript: 0 errors in all created/edited files.
> - Read every target file in full before editing it.
> - `expo-task-manager` is **absent** from driver-app/package.json — guard all TaskManager imports.
> - `expo-notifications` is **absent** from both package.json files — guard all Notifications imports.
> - `expo-location` **is present** in both apps (driver `~17.0.0`, passenger `~17.0.0`).
> - The existing driver-app `NotificationService.ts` uses Firebase (`@react-native-firebase/messaging`) + `@notifee/react-native` — **do not delete it**; replace its body with the Expo-push version because those native packages are also absent from package.json and would crash on Expo Go / EAS bare builds without native setup.
> - API gateway already has `/v1/notifications` router (notifications.ts) with `sendPushNotification` exported. Do **not** add a separate PushNotificationService.ts file — extend what exists.
> - Last migration is `011_payments.sql`. Next number is `012`.

---

## FEATURE 1 — Background GPS (Driver App)

### Step 1.1 — Create `BackgroundLocation.ts` service

**What:** Create a new file that implements background GPS tracking using `expo-location` (already installed). Because `expo-task-manager` is absent, wrap the `TaskManager` import in a try/catch at module level so the module loads safely in Expo Go and EAS builds that haven't added it yet. The file must export four items: the task name constant, and three functions.

**File to create:**
`apps/driver-app/src/services/BackgroundLocation.ts`

**Full specification:**
```typescript
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// requires: expo-task-manager (guarded import — absent from package.json)
let TaskManager: any = null;
try { TaskManager = require('expo-task-manager'); } catch {}

export const BACKGROUND_LOCATION_TASK = 'skyrex-background-location';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Register the background task at module level (no-op if TaskManager unavailable)
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
    } catch (e) {
      // silent — background task must not throw
    }
  });
}

export async function startBackgroundTracking(): Promise<void> {
  if (!TaskManager) return; // graceful no-op when task manager unavailable
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
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (!TaskManager) return false;
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
}
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 1.2 — Import `BackgroundLocation.ts` in driver `App.tsx` (root barrel)

**What:** The file `apps/driver-app/App.tsx` is a one-line barrel (`import App from './src/App'; export default App;`). Add an import of `BackgroundLocation.ts` **before** the barrel re-export so the `TaskManager.defineTask` call happens at app startup before the navigator mounts.

**File to edit:**
`apps/driver-app/App.tsx`

**Change:** Prepend this import (before the existing `import App from './src/App'` line):
```typescript
import './src/services/BackgroundLocation';
```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 1.3 — Call start/stop in `NavigationScreen.tsx`

**What:** Read `apps/driver-app/src/screens/trip/NavigationScreen.tsx` in full (already read — it exists and has a `useEffect` with `fetchRoute()` + `startLocationWatch()` + cleanup). In that `useEffect`, add calls to `startBackgroundTracking()` on mount and `stopBackgroundTracking()` in the cleanup return.

**File to edit:**
`apps/driver-app/src/screens/trip/NavigationScreen.tsx`

**Change:**
1. Add imports at top of file (after existing imports):
   ```typescript
   import { startBackgroundTracking, stopBackgroundTracking } from '../../services/BackgroundLocation';
   ```
2. In the existing `useEffect` (the one that calls `fetchRoute()` and `startLocationWatch()`), add:
   - At the start of the effect body: `startBackgroundTracking();`
   - In the cleanup function (before `subscriptionRef.current?.remove()`): `stopBackgroundTracking();`

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 1.4 — Edit `driver-app/app.json` to add missing permissions and expo-location plugin

**What:** The current `app.json` already has `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` under `android.permissions`. It is **missing** `FOREGROUND_SERVICE_LOCATION` and the `plugins` array. Add both.

**File to edit:**
`apps/driver-app/app.json`

**Changes:**
1. Add `"FOREGROUND_SERVICE_LOCATION"` to the existing `android.permissions` array.
2. Add a `"plugins"` key at the top level of the `"expo"` object:
   ```json
   "plugins": [
     [
       "expo-location",
       {
         "locationAlwaysAndWhenInUsePermission": "SkyRex inahitaji eneo lako kuendesha safari hata wakati app inaendesha nyuma.",
         "isAndroidBackgroundLocationEnabled": true
       }
     ]
   ]
   ```
   Note: do **not** add `expo-notifications` plugin here — that comes in Step 2.7.

**Verify:** `cd apps/driver-app && node -e "require('./app.json')"` — JSON parses without error.

---

### Step 1.5 — Add 'GPS Inaendelea' badge to `HomeScreen.tsx`

**What:** Read `apps/driver-app/src/screens/main/HomeScreen.tsx` (already read in full). The screen already imports `useDriverStatus` which provides `isTracking: boolean`. When `isTracking` is true, show a green GPS badge in the status card area alongside the existing status indicator dot.

**File to edit:**
`apps/driver-app/src/screens/main/HomeScreen.tsx`

**Changes:**
1. Add imports at top:
   ```typescript
   import { useEffect, useState } from 'react'; // already imported — just ensure useState is included
   import { isBackgroundTrackingActive } from '../../services/BackgroundLocation';
   ```
2. Inside the `HomeScreen` component, add a state and effect to check GPS status:
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
3. Inside the JSX, in the `statusCard` View (after the existing `<View style={styles.statusContent}>`), add a GPS badge **only when `gpsActive` is true**:
   ```tsx
   {gpsActive && (
     <View style={styles.gpsBadge}>
       <View style={styles.gpsDot} />
       <Text style={[styles.gpsText, { color: theme.colors.success }]}>GPS Inaendelea</Text>
     </View>
   )}
   ```
4. Add the two new style entries in `StyleSheet.create`:
   ```typescript
   gpsBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#e8f5e9',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 12,
     gap: 4,
   },
   gpsDot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: '#2e7d32',
   },
   gpsText: {
     fontSize: 11,
     fontWeight: '600',
   },
   ```

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — zero TypeScript errors.

---

## FEATURE 2 — Push Notifications

### Step 2.1 — Replace driver-app `NotificationService.ts` with Expo push version

**What:** The existing `apps/driver-app/src/services/NotificationService.ts` imports `@react-native-firebase/messaging` and `@notifee/react-native` — **neither** is in package.json. This would crash. Replace the entire file body with an Expo-push-based implementation that guards `expo-notifications` since it is also absent from package.json. The class interface (`initialize()`, `cleanup()`) must remain identical so `src/App.tsx` (which calls `NotificationService.initialize()` and `NotificationService.cleanup()`) compiles without change.

**File to overwrite:**
`apps/driver-app/src/services/NotificationService.ts`

**Full replacement:**
```typescript
/**
 * Driver NotificationService — Expo Push (expo-notifications guarded import)
 * requires: expo-notifications (absent from package.json — graceful no-op if missing)
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
      const { status } = existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[NotificationService] Permission not granted');
        return;
      }
      // Expo push token requires a projectId set in app.json extra.eas.projectId
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '7956fd4b-f540-47d0-90ad-6904eceaaef7', // from driver-app app.json
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
      // Handle notifications received while app is foregrounded
      Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('[NotificationService] Received:', notification);
      });
      // Handle taps on notifications
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data ?? {};
        if (data.type === 'new_trip_request' && data.trip_id) {
          // Navigation handled by navigationRef in App.tsx — store pending nav in AsyncStorage
          AsyncStorage.setItem('@skyrex:pending_nav', JSON.stringify({
            screen: 'TripRequest', // DriverTripRequestScreen
            params: { tripId: data.trip_id },
          })).catch(() => {});
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

**Verify:** `cd apps/driver-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 2.2 — Create passenger-app `NotificationService.ts`

**What:** The passenger app has no services directory yet. Create it and the service file. Guard `expo-notifications` with try/catch. Call `registerForPushNotifications` in passenger `App.tsx` on mount (handled in step 2.3). On notification tap, if `notification.data.trip_id` exists, store pending navigation to `TripActive` screen.

**File to create:**
`apps/passenger-app/services/NotificationService.ts`

**Full content:**
```typescript
/**
 * Passenger NotificationService — Expo Push (expo-notifications guarded import)
 * requires: expo-notifications (absent from package.json — graceful no-op if missing)
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
    const { status } = existing === 'granted'
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '5f7ad6c8-510e-4f1b-a526-2933af25b604', // from passenger app.json
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
    console.error('[Passenger NotificationService] registerForPushNotifications:', e);
  }
}

export function setupNotificationHandlers(): void {
  if (!Notifications) return;
  Notifications.addNotificationReceivedListener((notification: any) => {
    console.log('[NotificationService] Received:', notification);
  });
  Notifications.addNotificationResponseReceivedListener((response: any) => {
    const data = response.notification.request.content.data ?? {};
    if (data.trip_id) {
      // Store pending nav; App.tsx should check this on focus/mount and navigate
      AsyncStorage.setItem('@skyrex:pending_nav', JSON.stringify({
        screen: 'TripActive',
        params: { tripId: data.trip_id },
      })).catch(() => {});
    }
  });
}
```

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 2.3 — Call `registerForPushNotifications` in passenger `App.tsx`

**What:** Read `apps/passenger-app/App.tsx` in full (already read — it exports `App` function with a `useEffect` that loads language and token). Import the two notification functions and call them inside the existing `useEffect`, after `i18n.loadSavedLanguage()`. Also add a NavigationContainer `onReady` handler that checks `@skyrex:pending_nav` and navigates.

**File to edit:**
`apps/passenger-app/App.tsx`

**Changes:**
1. Add import at top (after existing imports):
   ```typescript
   import { registerForPushNotifications, setupNotificationHandlers } from './services/NotificationService';
   ```
2. In the existing `useEffect` async IIFE, after `await i18n.loadSavedLanguage();`, add:
   ```typescript
   registerForPushNotifications(); // fire-and-forget
   setupNotificationHandlers();
   ```
3. On the `<NavigationContainer>` element add a `ref` and `onReady` to handle tapped notifications:
   ```tsx
   // Add at top of component:
   const navigationRef = React.useRef<any>(null);

   // Add to NavigationContainer:
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

**Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors.

---

### Step 2.4 — Add SQL migration `012_push_tokens.sql`

**What:** The existing `notifications.ts` route stores `push_token` directly on the `users` table (column `push_token`, `device_platform`). This works for single-device users. The plan asks for a separate `user_push_tokens` table to support multi-device. Create the migration that adds both the table AND the columns on `users` if they don't exist (the notifications.ts route currently uses `users.push_token`, so the column must remain for backward compat).

**File to create:**
`services/api-gateway/migrations/012_push_tokens.sql`

**Full content:**
```sql
-- Migration 012: Push Tokens Table
-- Adds a dedicated user_push_tokens table for multi-device support.
-- Also ensures users.push_token / device_platform columns exist (used by notifications.ts).
-- Run: psql skyrex_db < migrations/012_push_tokens.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_platform TEXT;

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL DEFAULT 'android',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token   ON user_push_tokens(token);
```

**Verify:** `psql $DATABASE_URL < services/api-gateway/migrations/012_push_tokens.sql` — runs without error (or dry-run `psql --set ON_ERROR_STOP=1 -f migrations/012_push_tokens.sql` in a test DB).

---

### Step 2.5 — Add `POST /users/push-token` endpoint to `notifications.ts`

**What:** The instructions say "add POST /users/push-token to the appropriate route file". The route already registered as `/v1/notifications` is `notifications.ts`, and there's no separate `users.ts` route file. The cleanest approach — consistent with the existing `/register` endpoint in the same file — is to add a `/push-token` POST alias in `notifications.ts` that upserts into `user_push_tokens` (new table from step 2.4) AND syncs the `users` table column. This satisfies both the new table and the existing `sendPushNotification` function which reads from `users.push_token`.

**File to edit:**
`services/api-gateway/src/routes/notifications.ts`

**Change:** After the existing `/register` route handler (the one that does `UPDATE users SET push_token = ...`), add:

```typescript
/**
 * POST /api/v1/notifications/push-token
 * Upsert push token — stores in user_push_tokens and syncs users.push_token.
 * Used by both driver and passenger apps.
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { token, platform } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token)  return res.status(400).json({ error: 'token required' });

    const plat: string = platform ?? 'android';

    // Upsert into dedicated table (multi-device support)
    await pool.query(
      `INSERT INTO user_push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             updated_at = NOW()`,
      [userId, token, plat]
    );

    // Keep users table in sync for backward-compat with sendPushNotification()
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

**Verify:** `cd services/api-gateway && npm run typecheck` — zero TypeScript errors.

---

### Step 2.6 — Wire push notifications into `trips.ts` after status changes

**What:** After each trip status change in `trips.ts`, call `sendPushNotification` (already exported from `notifications.ts`) for the four required events. Read `trips.ts` fully before editing (already read). The four trigger points are:
- `PATCH /:tripId/assign-driver` → passenger: "Dereva amekubali! Anakuja."
- `PATCH /:tripId/status` when status=`driver_arriving` → passenger: "Dereva amefika karibu nawe!"
- `PATCH /:tripId/complete` → passenger: "Safari imekamilika. Asante!"
- `POST /` (new trip created) → notify nearby drivers: "Ombi jipya la safari karibu nawe"

For the "new trip" case, query `users` for drivers with a push_token within rough geo range (use the same simple haversine approach as tracking.ts) — or simpler: query all online drivers from the `drivers` table and send to those with a push_token; cap at 5 drivers to limit noise.

**File to edit:**
`services/api-gateway/src/routes/trips.ts`

**Changes:**

1. Add import at top:
   ```typescript
   import { sendPushNotification } from './notifications';
   ```

2. In `PATCH /:tripId/assign-driver`, after the final `res.json(...)` (success branch), add a fire-and-forget push:
   ```typescript
   // Notify passenger: driver accepted
   pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId])
     .then(r => {
       if (r.rows[0]?.passenger_id) {
         sendPushNotification(r.rows[0].passenger_id, 'Dereva amekubali! 🚗', 'Dereva anakuja. Tafadhali subiri mahali ulipoomba.', { tripId, type: 'driver_assigned' });
       }
     }).catch(() => {});
   ```

3. In `PATCH /:tripId/status`, after the `res.json(...)` for a successful update, add:
   ```typescript
   // Push notifications for key status transitions
   if (status === 'driver_arriving') {
     const passRow = await pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId]).catch(() => null);
     if (passRow?.rows[0]?.passenger_id) {
       sendPushNotification(passRow.rows[0].passenger_id, 'Dereva Amefika Karibu! 📍', 'Dereva amefika karibu nawe! Toka sasa.', { tripId, type: 'driver_arriving' }).catch(() => {});
     }
   }
   ```

4. In `PATCH /:tripId/complete`, after the `res.json(...)`, add:
   ```typescript
   // Notify passenger: trip completed
   pool.query('SELECT passenger_id FROM trips WHERE id = $1', [tripId])
     .then(r => {
       if (r.rows[0]?.passenger_id) {
         sendPushNotification(r.rows[0].passenger_id, 'Safari Imekamilika! 🎉', 'Asante kwa kutumia SkyRex. Tafadhali tathmini safari yako.', { tripId, type: 'trip_completed' });
       }
     }).catch(() => {});
   ```

5. In `POST /` (create trip), after `res.status(201).json(...)`, add a fire-and-forget block to alert nearby drivers:
   ```typescript
   // Alert nearby drivers about the new trip
   (async () => {
     try {
       const newTripId: string = result.rows[0].id;
       const pickupLat: number = pickup_latitude;
       const pickupLng: number = pickup_longitude;
       // Get up to 5 online drivers who have a push token
       const drivers = await pool.query(
         `SELECT u.id FROM drivers d
          JOIN users u ON u.id = d.user_id
          WHERE d.is_online = true AND u.push_token IS NOT NULL
          LIMIT 5`
       );
       for (const row of drivers.rows) {
         sendPushNotification(
           row.id,
           'Ombi Jipya la Safari! 🔔',
           'Kuna safari mpya karibu nawe. Angalia maombi.',
           { tripId: newTripId, type: 'new_trip_request' }
         ).catch(() => {});
       }
     } catch {}
   })();
   ```

**Verify:** `cd services/api-gateway && npm run typecheck` — zero TypeScript errors.

---

### Step 2.7 — Add `expo-notifications` plugin to both `app.json` files

**What:** Add the plugin entry to both apps. Neither `assets/` folder (driver or passenger) contains a `notification-icon.png`, so omit the `icon` sub-key from the plugin config.

**Files to edit:**
1. `apps/driver-app/app.json` (already being edited in step 1.4 — add `expo-notifications` to the `plugins` array created there)
2. `apps/passenger-app/app.json` (already has a `plugins` array with `expo-location` — append to it)

**Driver-app** — the `plugins` array from step 1.4 should become:
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
    {
      "color": "#2e7d32"
    }
  ]
]
```

**Passenger-app** — append to existing `plugins` array (which currently only has `expo-location`):
```json
[
  "expo-notifications",
  {
    "color": "#1a73e8"
  }
]
```

**Verify:** Both files: `node -e "require('./app.json')"` — JSON parses without error.

---

## FINAL VERIFICATION

After all steps are complete, run:

```bash
# Driver app — full typecheck
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/apps/driver-app
npx tsc --noEmit

# Passenger app — full typecheck
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/apps/passenger-app
npx tsc --noEmit

# API gateway — full typecheck
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/services/api-gateway
npm run typecheck

# API gateway — run tests
cd /run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala/services/api-gateway
npm test
```

All four commands must complete with zero errors.

---

## Ordered Checklist

- [ ] **1.1** Create `apps/driver-app/src/services/BackgroundLocation.ts`
      Files: `apps/driver-app/src/services/BackgroundLocation.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.2** Import BackgroundLocation side-effect in `apps/driver-app/App.tsx` (root barrel)
      Files: `apps/driver-app/App.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.3** Call `startBackgroundTracking()` / `stopBackgroundTracking()` in `NavigationScreen.tsx`
      Files: `apps/driver-app/src/screens/trip/NavigationScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **1.4** Edit `apps/driver-app/app.json` — add `FOREGROUND_SERVICE_LOCATION` permission + expo-location plugin (expo-notifications plugin added in step 2.7)
      Files: `apps/driver-app/app.json`
      Verify: `node -e "require('./apps/driver-app/app.json')"` — JSON parses OK

- [ ] **1.5** Add GPS badge to `apps/driver-app/src/screens/main/HomeScreen.tsx`
      Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **2.1** Replace driver-app `NotificationService.ts` with Expo push implementation (removes broken Firebase imports)
      Files: `apps/driver-app/src/services/NotificationService.ts`
      Verify: `cd apps/driver-app && npx tsc --noEmit` — 0 errors

- [ ] **2.2** Create `apps/passenger-app/services/NotificationService.ts`
      Files: `apps/passenger-app/services/NotificationService.ts`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **2.3** Update passenger `App.tsx` to call `registerForPushNotifications()` + `setupNotificationHandlers()` on mount
      Files: `apps/passenger-app/App.tsx`
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — 0 errors

- [ ] **2.4** Create migration `services/api-gateway/migrations/012_push_tokens.sql`
      Files: `services/api-gateway/migrations/012_push_tokens.sql`
      Verify: SQL file is valid (review manually or run against dev DB)

- [ ] **2.5** Add `POST /push-token` endpoint to `services/api-gateway/src/routes/notifications.ts`
      Files: `services/api-gateway/src/routes/notifications.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors

- [ ] **2.6** Wire push calls into `services/api-gateway/src/routes/trips.ts` for the four status events
      Files: `services/api-gateway/src/routes/trips.ts`
      Verify: `cd services/api-gateway && npm run typecheck && npm test` — 0 errors, tests pass

- [ ] **2.7** Add `expo-notifications` plugin to both `app.json` files
      Files: `apps/driver-app/app.json`, `apps/passenger-app/app.json`
      Verify: Both JSON files parse without error
