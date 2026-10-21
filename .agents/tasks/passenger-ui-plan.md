# Implementation Plan — DalaSmart Passenger App Live Tracking

## Context from codebase exploration

- **passenger-app** uses Expo ~51, React Native 0.74.5, `react-native-maps` 1.14.0 (already a dependency — no install needed), `axios` ^1.7.7, `expo-location` ~17.0.0.
- `MapView` and `PROVIDER_GOOGLE` are already imported and used in `MainScreen.tsx` — the same pattern applies to new screens.
- `App.tsx` uses `createNativeStackNavigator`. `TripActive` is already registered at line 42 — must NOT be duplicated. The new `Traffic` screen needs one `Stack.Screen` entry.
- `tracking.ts` is already mounted at `/v1/tracking` in `routes/index.ts` via `safeUse`. The three new endpoints are additions to the existing file.
- The existing `GET /tracking/nearby` endpoint returns `{ drivers, count }` but does NOT return `name`, `vehicle_plate`, `eta_minutes`, or `vehicle_type`. The new `GET /tracking/nearby-drivers` is a separate endpoint with enriched mock-first data (avoids breaking the existing endpoint).
- `MainScreen.tsx` already has `useState` for `nearbyDrivers` as a static array — the ref must be changed to `useState` (live) and a `useRef` interval added alongside the existing `useRef` values for the drawer animation.
- `TripActiveScreen.tsx` has a `mapArea` View (height 200) used as an emoji placeholder — this is replaced by `MapView`.
- **API base URL assumption**: use `process.env.EXPO_PUBLIC_API_URL` for the app; fall back to `http://localhost:3001/api` for the gateway calls. The coder should use `axios` (already imported pattern in the project).
- **No test framework** found in the passenger-app — `expo start` / TypeScript compile (`npx tsc --noEmit`) is the verification gate. For the API gateway, `cd services/api-gateway && npx tsc --noEmit` verifies TypeScript.

---

- [ ] 1. **Add three new endpoints to `tracking.ts`**

  Add `GET /nearby-drivers`, `GET /traffic`, and `GET /trip/:tripId/driver-location` to the existing router in `tracking.ts`. Order matters: place them before the `export default router` line. Each endpoint tries a real DB query first and falls back to rich mock data if the query fails or returns nothing.

  **`GET /nearby-drivers`** — query params `lat`, `lng`, `radius` (default `3`). Try:
  ```sql
  SELECT d.id AS driver_id, u.name, d.vehicle_plate, d.vehicle_type,
         dl.latitude AS lat, dl.longitude AS lng
  FROM drivers d
  JOIN users u ON u.id = d.user_id
  JOIN driver_locations dl ON dl.driver_id = d.id
  WHERE d.is_online = true
  LIMIT 10
  ```
  Wrap in try/catch — on any error or empty result return the mock array (4–5 Dar es Salaam coordinates). Compute `distance_km` using the Haversine helper already used in the `/nearby` endpoint. Compute `eta_minutes` as `Math.round(distance_km / 0.5)` (30 km/h average). Response shape: `[{ driver_id, name, vehicle_plate, lat, lng, distance_km, eta_minutes, vehicle_type }]`.

  **`GET /traffic`** — query params `lat`, `lng`, `radius` (default `5`). Try querying a `traffic_segments` table; on any error or empty result return mock segments for: Nyerere Road, Morogoro Road, Sam Nujoma, Bagamoyo Road, Ali Hassan Mwinyi, Nelson Mandela Road — each with hardcoded `lat_start/lng_start/lat_end/lng_end` near Dar es Salaam, a `status` (`clear`|`slow`|`jam`), and `speed_kmh`. Response shape: `[{ segment_id, road_name, lat_start, lng_start, lat_end, lng_end, status, speed_kmh }]`.

  **`GET /trip/:tripId/driver-location`** — try:
  ```sql
  SELECT dl.latitude, dl.longitude, dl.heading AS bearing, dl.speed AS speed_kmh
  FROM trips t
  JOIN driver_locations dl ON dl.driver_id = t.driver_id
  WHERE t.id = $1
  ```
  On error or no result: return mock moving coordinates that drift slightly each call (use `Date.now()` to deterministically offset lat/lng by a tiny sine wave so it looks like movement). Add `eta_minutes` (random 2–8) and `progress_percent` (use `(Date.now() / 1000 % 100)` capped 0–99). Response shape: `{ lat, lng, bearing, speed_kmh, eta_minutes, progress_percent }`.

  **Files:** `services/api-gateway/src/routes/tracking.ts`

  **Verify:** `cd services/api-gateway && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 2. **Upgrade `MainScreen.tsx` — live nearby drivers + bottom card + traffic button**

  This item depends on item 1 having defined the `/nearby-drivers` response shape.

  **2a. Convert `nearbyDrivers` to live-polling state.**
  - Replace `const [nearbyDrivers] = useState([...static...])` with `const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([])`.
  - Add a `NearbyDriver` TypeScript interface at the top of the file:
    ```ts
    interface NearbyDriver {
      driver_id: string;
      name: string;
      vehicle_plate: string;
      lat: number;
      lng: number;
      distance_km: number;
      eta_minutes: number;
      vehicle_type: string;
    }
    ```
  - Add `const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)` alongside the existing `drawerAnim` and `overlayAnim` refs.
  - Inside `useEffect(() => { loadUser(); getLocation(); }, [])`, after `getLocation()`, call a new `startDriverPolling()` function, and return a cleanup that calls `clearInterval(pollRef.current)`.
  - `startDriverPolling`: immediately fetches, then sets interval to 5000 ms. Uses `region.latitude` and `region.longitude` from state. On error, keeps last known `nearbyDrivers` (no `setNearbyDrivers` call on error path). Endpoint: `GET ${API_BASE}/tracking/nearby-drivers?lat=${lat}&lng=${lng}&radius=3`.

  **2b. Green pulsing live indicator.**
  Add an `Animated.Value` ref (`pulseAnim`) that runs a looping `Animated.sequence` of timing animations (0 → 1 → 0, 800 ms each). Render a small green circle (`width:10, height:10, borderRadius:5, backgroundColor:'#34c759'`) wrapped in an `Animated.View` with `opacity: pulseAnim` in the top-right corner of the MapView, inside `mapArea`, above the existing `topBar`.

  **2c. Driver markers with 🚕 emoji and distance label.**
  In the `MapView`, replace the existing `nearbyDrivers.map(...)` with the new `NearbyDriver` data. Each `Marker`:
  - `coordinate={{ latitude: d.lat, longitude: d.lng }}`
  - Custom view child: emoji `🚕` (fontSize 22) above a small Text `${d.distance_km.toFixed(1)} km` (fontSize 9, white text on dark semi-transparent bg, borderRadius 4, padding 2 4).
  - `onPress={() => setSelectedDriver(d)}`

  **2d. Bottom driver card (Modal/animated panel).**
  Add `const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null)`.
  When `selectedDriver` is not null, render an absolutely-positioned `View` at the bottom of `mapArea` (above `bottomPanel`) with:
  - Background `#fff`, `borderTopLeftRadius: 20`, `borderTopRightRadius: 20`, `padding: 20`, `elevation: 12`.
  - Driver name (fontSize 18, fontWeight 700), plate (fontSize 13, color #666), distance (fontSize 13), ETA `Unafika dakika ${eta}` (fontSize 13, color #1a73e8).
  - `TouchableOpacity` "Piga Buku" button: `backgroundColor: '#34c759'`, borderRadius 12, padding 14, full width — `onPress={() => navigation.navigate('RideRequest')}`.
  - Close button (×) top-right corner — `onPress={() => setSelectedDriver(null)}`.

  **2e. Floating 🚦 Msongamano button.**
  Add a `TouchableOpacity` positioned absolutely at bottom-right of `mapArea` (`position:'absolute', bottom: 80, right: 16`). Style: `backgroundColor: '#1a1a2e'`, `borderRadius: 12`, `padding: 12`. Content: `🚦` emoji + Text `Msongamano` (color white, fontSize 11). `onPress={() => navigation.navigate('Traffic')}`.

  **Files:** `apps/passenger-app/screens/MainScreen.tsx`

  **Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 3. **Create `TrafficScreen.tsx`**

  This item is independent of item 2 but depends on item 1's `/traffic` endpoint shape.

  Create `apps/passenger-app/screens/TrafficScreen.tsx` from scratch.

  **Structure:**
  ```
  SafeAreaView (flex:1, backgroundColor:'#1a1a2e')
  ├── Top card 'Hali ya Barabara' — overall status derived from segments
  ├── MapView (PROVIDER_GOOGLE, flex:1) with Polylines
  ├── Bottom legend
  └── Bottom 'Anza Safari' button
  ```

  **Details:**

  - `TypeScript` interfaces:
    ```ts
    interface TrafficSegment {
      segment_id: string;
      road_name: string;
      lat_start: number;
      lng_start: number;
      lat_end: number;
      lng_end: number;
      status: 'clear' | 'slow' | 'jam';
      speed_kmh: number;
    }
    ```
  - State: `segments: TrafficSegment[]`, `loading: boolean`, `error: boolean`, `region` (user location or Dar es Salaam default `-6.7924, 39.2083`).
  - On mount: request location via `expo-location` (same pattern as `MainScreen.getLocation`). Start polling `GET ${API_BASE}/tracking/traffic?lat=${lat}&lng=${lng}&radius=5` every 30 s using `useRef` interval + `useEffect` cleanup. On fetch error, set `error = true` but keep previous `segments`.
  - **Color map**: `clear` → `#00d46a`, `slow` → `#ff9500`, `jam` → `#ff3b30`.
  - Render one `Polyline` per segment: `coordinates={[{latitude: s.lat_start, longitude: s.lng_start}, {latitude: s.lat_end, longitude: s.lng_end}]}`, `strokeColor={colorMap[s.status]}`, `strokeWidth={5}`.
  - **Top card** (position absolute, top 16, left 16, right 16): `backgroundColor:'rgba(26,26,46,0.92)'`, `borderRadius:12`, `padding:16`. Shows `🚦 Hali ya Barabara` title (white, fontSize 16, fontWeight 700). Overall status derived from segments: if any `jam` → `Mbaya 🔴`, else if any `slow` → `Wastani 🟠`, else `Nzuri 🟢` (or `Inangojea…` when empty). White text, fontSize 14.
  - **Fallback text**: if `error && segments.length === 0`, replace map with a centered Text `'Habari za msongamano hazipatikani sasa'` (white, fontSize 15) on a `#1a1a2e` background.
  - **Bottom legend** (above button): horizontal row, `backgroundColor: 'rgba(26,26,46,0.92)'`, borderRadius 12, padding 12 16, `margin: 8 16`. Three items: `🟢 Wazi`, `🟠 Polepole`, `🔴 Msongamano` — each a Text (white, fontSize 13).
  - **'Anza Safari' button**: `backgroundColor: '#34c759'`, borderRadius 12, `margin: 8 16 16`, padding 16, center-aligned, Text white fontSize 16 fontWeight 700. `onPress={() => navigation.goBack()}`.

  **Files:** `apps/passenger-app/screens/TrafficScreen.tsx` *(create new)*

  **Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors.

---

- [ ] 4. **Register `TrafficScreen` in `App.tsx`**

  This item depends on item 3 (the file must exist to import it).

  - Add import: `import TrafficScreen from './screens/TrafficScreen';`
  - Add one `Stack.Screen` entry in the Passenger section (after the existing `TripActive` line, before `Rating`):
    ```tsx
    <Stack.Screen name="Traffic" component={TrafficScreen} />
    ```
  - Do NOT add another `TripActive` entry — it is already registered at line 42.

  **Files:** `apps/passenger-app/App.tsx`

  **Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors; no duplicate screen name warnings.

---

- [ ] 5. **Enhance `TripActiveScreen.tsx` — real MapView + live driver tracking**

  This item depends on item 1's `/trip/:tripId/driver-location` endpoint shape. It must receive `tripId` from `route.params`.

  **5a. Accept `tripId` from route params.**
  Add `tripId` to the destructured `route.params`. When the screen is navigated to from `RideRequestScreen`, the caller must pass a `tripId`. For backward compatibility, default to `'mock-trip-1'` if not provided (`const tripId = route.params?.tripId ?? 'mock-trip-1'`).

  **5b. Replace emoji `mapArea` View with real MapView.**
  - Remove the `mapArea` View with emoji content entirely.
  - Add `MapView` with `PROVIDER_GOOGLE`, `style={styles.map}` (height 220 or flex portion), `region` state. Import `MapView, Marker, Polyline, PROVIDER_GOOGLE` from `react-native-maps`. Import `Linking` from `react-native` (for phone button).
  - Region defaults to Dar es Salaam; updates when driver location is received.
  - Render two static `Marker`s: pickup (🟢 emoji, from `route.params`) and destination (🔴 emoji). Requires `route.params` to include `pickupLat/pickupLng` and `destLat/destLng`. If these are absent, skip static markers (no crash).
  - Render an animated driver `Marker` (🚕 emoji, fontSize 24) at `driverLocation` coordinates when available.

  **5c. Live driver location polling.**
  - State: `driverLocation: { lat: number; lng: number; bearing: number; speed_kmh: number; eta_minutes: number; progress_percent: number } | null`.
  - `const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null)`.
  - Start polling when `status` enters `accepted`, `arriving`, or `in_progress`. Stop (clear interval) when `status` becomes `completed` or `cancelled`. Use `useEffect([status])` to manage start/stop.
  - Poll interval: 5000 ms. Endpoint: `GET ${API_BASE}/tracking/trip/${tripId}/driver-location`.
  - Animate marker: use `Animated.ValueXY` or simply update `driverLocation` state — react-native-maps will smoothly animate coordinate changes when `coordinate` prop changes on a `Marker`. No separate animation lib needed.
  - On error, keep last known `driverLocation` (do not clear it).

  **5d. ETA countdown label.**
  Above the existing `statusCard`, inside the map view overlay (absolute positioned, top 8, right 8): a small pill `backgroundColor: 'rgba(0,0,0,0.7)'`, `borderRadius: 16`, `padding: 6 12`. Text: `Unafika dakika ${driverLocation?.eta_minutes ?? '?'}` (white, fontSize 12). Only shown when `driverLocation` is not null.

  **5e. Trip progress bar.**
  Between `statusCard` and `driverCard`: a `View` (`backgroundColor: '#eee'`, height 6, borderRadius 3, `margin: 0 16`). Inner `View` (`backgroundColor: '#34c759'`, height 6, borderRadius 3, `width: \`${driverLocation?.progress_percent ?? 0}%\``).

  **5f. Phone button with `Linking`.**
  The existing `callBtn` `TouchableOpacity` in `driverCard` renders `📞`. Wire it to `Linking.openURL(\`tel:${driver.phone || '+255700000000'}\`)`. Add `phone` field to the `driver` state type: `{ name: string; plate: string; rating: number; vehicle: string; phone: string }`.

  **Files:** `apps/passenger-app/screens/TripActiveScreen.tsx`

  **Verify:** `cd apps/passenger-app && npx tsc --noEmit` — zero TypeScript errors.

---

## Dependency order

```
Item 1 (tracking.ts endpoints)
  └─► Item 2 (MainScreen — uses /nearby-drivers shape)
  └─► Item 3 (TrafficScreen — uses /traffic shape)
         └─► Item 4 (App.tsx — imports TrafficScreen)
  └─► Item 5 (TripActiveScreen — uses /trip/:id/driver-location shape)
```

Items 2, 3, and 5 are independent of each other (all depend only on item 1). Item 4 depends on item 3. Recommended implementation order: **1 → 3 → 4 → 2 → 5**.

---

## Notes / assumptions

- `API_BASE`: define `const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';` at the top of each screen file that makes API calls.
- `react-native-maps` is already in `package.json` at version `1.14.0` — no installation step needed.
- The `/tracking/nearby-drivers` endpoint is a new path (not `/tracking/nearby`) to avoid breaking the existing endpoint which returns a different shape.
- `Haversine` distance calculation can be inlined in the tracking.ts additions — copy the same pattern already used in the existing `/nearby` handler (`dLat * 111`, `dLng * 111 * cos(lat)`).
- The `driver_locations` table is assumed to be the table backing the in-memory fallback. If `driver_locations` table does not exist, the try/catch mock fallback handles it transparently.
- `MapView` in `TripActiveScreen` wraps in a `View` with a fixed height (`height: 220`) to avoid flex conflicts with the existing scrollable card layout below it.
