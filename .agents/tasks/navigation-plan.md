# Implementation Plan — SkyRex Navigation + Routing + Live Tracking

## Codebase facts discovered

- **Passenger app** (`apps/passenger-app`): React Native / Expo 51, `react-native-maps@1.14.0`, `expo-location@~17.0`, `axios`, `expo-linear-gradient`, `@expo/vector-icons`. **No** `expo-speech`, **no** `react-native-vector-icons`. Stack navigator in `App.tsx` (no separate `src/`).
- **Driver app** (`apps/driver-app`): React Native / Expo 51 via `src/App.tsx`. **No** `react-native-maps` in its `package.json`. Has `expo-location@~17.0`, `axios`, `react-i18next`. Contexts: `LocationContext`, `AuthContext`, `DriverStatusContext`. API client at `src/services/api/client.ts` (hardcoded `https://simon-daladala-api.vercel.app/api`). Navigation: `RootNavigator → MainNavigator` (bottom tabs). `ActiveTripScreen` lives at `src/screens/trip/ActiveTripScreen.tsx`.
- **Backend** (`services/api-gateway`): Express + TypeScript + pg. `tracking.ts` already has: `POST /driver/update`, `GET /driver/:driverId`, `GET /nearby`, `GET /trip/:tripId`, `GET /trip/:tripId/driver-location`. **Missing**: `POST /calculate-route`, `POST /driver/location` (field-name alias), `GET /route?trip_id=X`.
- **expo-speech** is absent from both `package.json` files — voice directions will be a `// TODO: add expo-speech` stub (constraint: no new packages).
- Driver app has no map library; the NavigationScreen will use a text-only turn-by-turn UI with live GPS (no map rendering). This avoids installing `react-native-maps` into the driver app.

---

## Plan

- [ ] 1. **Backend: add `POST /tracking/calculate-route` and `GET /tracking/route` to `tracking.ts`**
      - Add `POST /calculate-route` handler: reads `{ from_lat, from_lng, to_lat, to_lng }`, calls ORS `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson` with `process.env.ORS_API_KEY`; on failure falls back to straight-line estimate. Returns `{ distance_km, duration_minutes, fare_tzs, polyline_coords: [[lat,lng],...], steps: [{instruction, distance_m},...], is_estimate }`. Fare formula: `Math.max(3000, 2000 + distance_km * 500 + duration_minutes * 50)`.
      - Add in-memory `routeStore: Map<string, RouteResult>` at module scope for trip-level caching.
      - Add `GET /route` handler: reads `?trip_id=X`, returns stored route from `routeStore` or 404.
      - Files: `services/api-gateway/src/routes/tracking.ts`
      - Verify: `cd services/api-gateway && npm run typecheck` — zero TypeScript errors.

- [ ] 2. **Passenger app: enhance `RideRequestScreen.tsx`**
      - Replace the fake fare simulation with a real call to `POST /tracking/calculate-route`.
      - Add geocoding autocomplete for both inputs: debounce 400 ms, call ORS geocode API first (`process.env.EXPO_PUBLIC_ORS_API_KEY ?? ''`), fall back to Nominatim if ORS key empty or request fails. Show up to 5 suggestions in a `FlatList` dropdown under the input.
      - When both pickup + destination coords are selected: draw `<Polyline>` on the `<MapView>` (color `#00d46a`, `strokeWidth: 4`), show 📍 pickup and 🏁 destination `<Marker>` components, replace the fake map placeholder with a real `<MapView provider={PROVIDER_GOOGLE}>` (use `react-native-maps` which is already installed).
      - Show fare card: `Nauli ya Kawaida: Sh X,XXX`.
      - On "Tafuta Dereva" press: navigate to `TripActive` passing `{ tripId, pickup, pickupCoords, destination, destinationCoords, fare, polylineCoords }`.
      - Swahili labels: pickup placeholder → `'Mahali pa kuanzia'`, destination → `'Unaenda wapi?'`.
      - Colors: dark bg `#1a1a2e`, green `#00d46a`, cards `borderRadius: 12`.
      - Files: `apps/passenger-app/screens/RideRequestScreen.tsx`
      - Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

- [ ] 3. **Passenger app: create `MapRouteScreen.tsx`**
      - New screen: full-screen `<MapView>` with route `<Polyline>` (green), 📍 pickup marker, 🏁 destination marker, 🚕 driver marker (animated, updated from `polylineCoords` prop).
      - ETA pill top-right: `'Unafika dakika X'` (absolute positioned `<View>`).
      - Recenter `<TouchableOpacity>` bottom-right calls `mapRef.current.animateToRegion(...)`.
      - Screen receives props: `{ pickupCoords, destinationCoords, polylineCoords, driverCoords, etaMinutes }`.
      - Register in `App.tsx` as `<Stack.Screen name="MapRoute" component={MapRouteScreen} options={{ headerShown: false }} />`.
      - Files: `apps/passenger-app/screens/MapRouteScreen.tsx`, `apps/passenger-app/App.tsx`
      - Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

- [ ] 4. **Passenger app: enhance `TripActiveScreen.tsx`**
      - On mount: if `polylineCoords` not in route params, call `POST /tracking/calculate-route` with pickup/destination coords and draw route polyline (green, strokeWidth 4).
      - Add 📍 pickup + 🏁 destination markers from coords. Live 🚕 driver marker already exists — wire it to the polled `driver_lat`/`driver_lng` from `GET /tracking/trip/:tripId/driver-location`.
      - Poll every 5 s (already coded as `setInterval(fetchLocation, 5000)`) — refactor `fetchLocation` to call `GET /tracking/trip/:tripId/driver-location` (already exists in tracking.ts) instead of the old endpoint.
      - Compute driver-to-destination distance each poll; show `'Dereva yako anakuja'` / `'Safari inaendelea'` status text and update ETA pill `'Unafika dakika X'`.
      - Show `'Unafika!'` banner when driver within 200 m of destination coords (haversine < 0.2 km).
      - Navigate to `Rating` screen on `status === 'completed'` (already partially coded, confirm it fires).
      - Keep all existing Swahili + dark-theme styling.
      - Files: `apps/passenger-app/screens/TripActiveScreen.tsx`
      - Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

- [ ] 5. **Driver app: create `NavigationScreen.tsx`**
      - Location: `apps/driver-app/src/screens/trip/NavigationScreen.tsx`.
      - No map (driver app has no `react-native-maps`). UI: dark bg `#1a1a2e`, full screen `SafeAreaView`.
      - Props (route params): `{ tripId, pickupCoords: {lat,lng}, destinationCoords: {lat,lng}, passengerName, fare }`.
      - On mount: call `GET ${API_BASE}/tracking/route?trip_id=${tripId}` to fetch `steps[]` and `polyline_coords`; fall back to two-point straight line with single instruction `'Endelea moja kwa moja hadi ufikie lengo'` if unavailable.
      - GPS reporting every 5 s: `expo-location` `watchPositionAsync` with `accuracy: Location.Accuracy.BestForNavigation`, emits `{ lat, lng, bearing, speed, trip_id }` via `POST /tracking/driver/location` (alias for existing `/driver/update` — add that alias in step 1).
      - Turn instruction banner (top card): current step instruction translated to Swahili. Translation map: `turn left` → `Pinda kushoto`, `turn right` → `Pinda kulia`, `straight` → `Endelea moja kwa moja`, `arrive` / `destination` → `Umefika`. Distance: `baada ya mita X` or `baada ya kilometa X`.
      - Auto-advance step: compute haversine from GPS to next step waypoint; when < 50 m advance `currentStepIndex`.
      - Distance remaining + ETA row below banner (updates every GPS tick).
      - `'Nimefika'` button appears when within 100 m of destination: calls `POST /trips/${tripId}/complete` (existing trips route) then navigates back to HomeMain.
      - Voice: `// TODO: expo-speech — call Speech.speak(translatedInstruction) when step advances` comment block.
      - `expo-location` subscription cleaned up on unmount.
      - Files: `apps/driver-app/src/screens/trip/NavigationScreen.tsx`
      - Verify: `cd apps/driver-app && npx tsc --noEmit` — zero errors.

- [ ] 6. **Driver app: register `NavigationScreen` in navigation and wire from `ActiveTripScreen`**
      - Add `Navigation: { tripId: string; pickupCoords: { lat: number; lng: number }; destinationCoords: { lat: number; lng: number }; passengerName: string; fare: number }` to `HomeStackParamList` in `MainNavigator.tsx`.
      - Add `<HomeStack.Screen name="Navigation" component={NavigationScreen} options={{ headerShown: false }} />`.
      - In `ActiveTripScreen.tsx` replace the `handleStartTrip` Alert with `navigation.navigate('Navigation', { tripId, pickupCoords, destinationCoords, passengerName, fare })`. Extract pickup/destination coords from the trip data already fetched.
      - Files: `apps/driver-app/src/navigation/MainNavigator.tsx`, `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
      - Verify: `cd apps/driver-app && npx tsc --noEmit` — zero errors.

---

## Key decisions

1. **Routing API**: ORS free tier with Nominatim geocoding fallback (no Google billing). Key read from `process.env.ORS_API_KEY` on backend; `process.env.EXPO_PUBLIC_ORS_API_KEY` on passenger app for geocoding autocomplete. Straight-line haversine fallback keeps the app functional offline.
2. **Driver app map**: driver app has no `react-native-maps` and adding it would require a new install (constraint violation). `NavigationScreen` is text-only turn-by-turn — which is also safer for a driver in motion.
3. **Voice directions**: `expo-speech` is absent from both apps. Code is stubbed with a clear `// TODO` comment so it can be added in one line when the package is installed later.
4. **Backend route alias**: `POST /tracking/driver/location` (the spec's field names `lat, lng, bearing, speed, trip_id`) added as a thin alias to the existing `/driver/update` handler so both old and new callers work.
5. **Trip-level route caching**: `routeStore` Map in `tracking.ts` (same in-memory pattern as `driverLocations`) stores the computed route keyed by `trip_id` so `GET /tracking/route` can return it without re-calling ORS.
