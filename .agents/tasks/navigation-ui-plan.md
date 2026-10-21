# Implementation Plan — FEAT-002 & FEAT-003: Navigation UI

Repo root: `/run/media/masalago/5a19708f-dc92-4a1e-9cea-08f3109bf2db/projects/daladala`

## Key findings from codebase exploration

- **passenger-app** has `react-native-maps@1.14.0`, `expo-location~17.0.0`, `axios`, `expo-linear-gradient`, `expo-haptics`, `@expo/vector-icons` — no `expo-speech`.
- **driver-app** has `expo-location~17.0.0`, `axios` — but **no `react-native-maps`** and **no `expo-speech`** in its `package.json`. Both must be treated as absent; use coordinate display + TODO for speech.
- `RideRequestScreen.tsx` already has the full geocoding/routing/polyline implementation in place. The task calls for enhancements: make routing failure recoverable (show 'Njia haipatikani' + retry + allow booking with estimated fare) and correct the 'Tafuta Dereva' button to pass `to_lat`/`to_lng`/`tripId: null` explicitly.
- `TripActiveScreen.tsx` already fetches route on mount when coords are present but no polyline was passed. The enhancement: ensure the driver 🚕 marker moves along the polyline every 5 seconds (currently it moves to the server-reported location), and show 'Dereva anakuja' vs 'Safari inaendelea' status text (already done via `getStatusTitle()`).
- **driver-app** navigation: `RootNavigator` renders `MainNavigator` (bottom tabs). The `HomeNavigator` stack already has `ActiveTrip` and `TripDetails`. The new `NavigationScreen` should live in the same `HomeStack` so the driver can navigate from `ActiveTripScreen`.
- `ActiveTripScreen.tsx` (driver) has `handleStartTrip` and `handleArrived` as stub Alerts — the "Navigate" button goes here.
- `HomeStackParamList` in `MainNavigator.tsx` currently only has `HomeMain`, `ActiveTrip`, `TripDetails` — it must be extended to include `Navigation`.
- Driver app uses `APIClient` (fetch-based, not axios) with base URL `https://simon-daladala-api.vercel.app/api`. The tracking route endpoint is `/tracking/calculate-route` under `EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'` — use the same env-var pattern in NavigationScreen.
- `LocationContext.tsx` shows the exact `watchPositionAsync` pattern used in driver-app; use `Location.Accuracy.BestForNavigation` in NavigationScreen.
- TypeScript: driver-app has `"typescript": "~5.3.3"` and no `@types/react-native`; use `React.FC` + `StyleSheet` patterns matching existing screens.

---

## Read order before editing (mandatory for implementer)

Before making any edit, read these files to understand current state:

1. `apps/passenger-app/screens/RideRequestScreen.tsx`
2. `apps/passenger-app/screens/TripActiveScreen.tsx`
3. `apps/passenger-app/App.tsx`
4. `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
5. `apps/driver-app/src/navigation/MainNavigator.tsx`
6. `apps/driver-app/src/services/api/client.ts`
7. `apps/driver-app/src/contexts/LocationContext.tsx`
8. `apps/driver-app/src/types/shared.ts`

---

## Implementation steps

- [ ] 1. **Harden RideRequestScreen routing failure UX**

  `calculateRoute` currently shows an alert on failure and clears the form state. Replace the failure branch with an inline 'Njia haipatikani' error state that:
  - Sets a new `routeError: boolean` state to `true` on catch.
  - Renders an error card below the input card when `routeError` is true: red border, 'Njia haipatikani 🚫' label, 'Jaribu Tena' button that calls `calculateRoute()` again (which resets `routeError` to false on entry).
  - When `routeError` is true and both coords are set, still shows a fare estimate card using a simple distance-based fallback: compute haversine distance from pickup/destination coords, multiply by 500 TZS/km (round to nearest 100), show it as `estimatedFare` with `is_estimate: true` label 'Bei ya Kadirio'.
  - The existing 'Tafuta Dereva' button (in the fare card) must already be reachable; confirm the `confirmRide` call passes `to_lat: destinationCoords.lat`, `to_lng: destinationCoords.lng`, and `tripId: null` to `TripActive` (check current params — add `to_lat`/`to_lng` if missing, they are used by TripActiveScreen on mount).

  Files: `apps/passenger-app/screens/RideRequestScreen.tsx`

  Verify: Open the app, type a destination that yields no route from backend — the red error card appears with 'Jaribu Tena'. Tapping it retries. A 'Tafuta Dereva' button still appears with the estimated fare. TypeScript: `npx tsc --noEmit` from `apps/passenger-app/` passes with 0 errors.

- [ ] 2. **Pass `to_lat`/`to_lng` explicitly in RideRequestScreen's `confirmRide`**

  In `confirmRide()`, the `navigation.navigate('TripActive', {...})` call currently passes `destinationCoords` as an object but not the flat `to_lat`/`to_lng` fields. `TripActiveScreen` reads `route.params?.polylineCoords` and `route.params?.destinationCoords` — verify `destinationCoords` object is already passed (it is, from reading the file). Also confirm `tripId: null` is explicitly in the params (add it if absent — TripActiveScreen checks `route.params?.tripId !== undefined` to decide real vs simulated mode; passing `null` means simulated, which is correct pre-booking).

  Files: `apps/passenger-app/screens/RideRequestScreen.tsx`

  Verify: `npx tsc --noEmit` from `apps/passenger-app/` — 0 errors. Selecting a destination, getting a route, and tapping 'Tafuta Dereva' must navigate to TripActiveScreen with the polyline visible on the map.

- [ ] 3. **Enhance TripActiveScreen driver marker animation along polyline**

  The driver 🚕 marker currently teleports to the server-reported lat/lng every 5 seconds. Enhance it so the marker position interpolates along the stored `polylineCoords` array instead of using the raw server location (which may not be on the route). Implementation:
  - Add a `driverPolylineIndex` state (number, starts at 0).
  - In the `fetchLocation` callback inside the live tracking `useEffect`, after receiving `loc`, find the closest point in `polylineCoords` to `{lat: loc.lat, lng: loc.lng}` using haversine, set `driverPolylineIndex` to that index.
  - Derive `driverMarkerCoord` from `polylineCoords[driverPolylineIndex]` when `polylineCoords.length > 0`; fall back to raw `loc.lat/lng` when polyline is empty.
  - Keep the existing ETA and arrival detection logic unchanged (uses raw `loc` coords, which is correct).
  - Keep the 'Dereva anakuja' / 'Safari inaendelea' labels unchanged — they already come from `getStatusTitle()`.

  Files: `apps/passenger-app/screens/TripActiveScreen.tsx`

  Verify: `npx tsc --noEmit` from `apps/passenger-app/` — 0 errors. With a live trip the driver marker follows the polyline path.

- [ ] 4. **Create `apps/driver-app/src/screens/trip/NavigationScreen.tsx`**

  Create this file from scratch following these exact specs. No `react-native-maps` (not in package.json) — use a coordinate display card instead of a MapView. No `expo-speech` (not in package.json) — add a `// TODO: install expo-speech for voice navigation` comment where the `Speech.speak(...)` call would go.

  ### Component contract

  ```ts
  type NavigationStackParams = {
    tripId: string;
    pickup_lat: number;
    pickup_lng: number;
    destination_lat: number;
    destination_lng: number;
    passenger_name: string;
    fare: number;
  };
  ```

  ### State
  - `steps: RouteStep[]` — each step: `{ instruction: string; distance_m: number; swahili: string }`
  - `currentStepIndex: number`
  - `distanceRemaining: number` (meters)
  - `etaMinutes: number`
  - `progressPercent: number`
  - `driverLocation: { lat: number; lng: number; bearing: number; speed: number } | null`
  - `canArrive: boolean` — true when driver is within 100m of destination
  - `isLoading: boolean`
  - `routeError: string | null`

  ### On mount

  1. Request foreground location permission (`Location.requestForegroundPermissionsAsync`).
  2. POST `${API_BASE}/tracking/calculate-route` with `{ from_lat: pickup_lat, from_lng: pickup_lng, to_lat: destination_lat, to_lng: destination_lng }` using `axios` (which IS in driver-app's package.json). Response shape: `{ distance_km, duration_minutes, polyline_coords: [number,number][], steps: { instruction: string; distance_m: number }[], fare_tzs }`.
  3. Map each step's `instruction` through `translateToSwahili(instruction)` (see below).
  4. Set `steps`, `distanceRemaining`, `etaMinutes`. On error: set `routeError = 'Imeshindwa kupata njia. Angalia muunganiko wa mtandao.'`.
  5. Start `Location.watchPositionAsync` with `{ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 10 }`. Store the subscription ref.

  ### On each location update

  1. Set `driverLocation` with `{ lat, lng, bearing: coords.heading ?? 0, speed: coords.speed ?? 0 }`.
  2. POST `${API_BASE}/tracking/driver/location` with `{ lat, lng, bearing, speed, trip_id: tripId }` — fire-and-forget, catch silently.
  3. Compute haversine distance to next step's coordinate (`polylineCoords[stepPolylineIndex]`). If < 50m, advance `currentStepIndex` (and announce TODO).
  4. Compute haversine distance to destination (`destination_lat`, `destination_lng`). Update `distanceRemaining`. Set `canArrive = dist < 0.1` (100m).
  5. Recompute `progressPercent` = `(totalDistance - distanceRemaining) / totalDistance * 100`, clamped 0–100.
  6. Update `etaMinutes` = `Math.max(1, Math.round((distanceRemaining / 1000 / 30) * 60))` (assuming 30 km/h avg).

  ### `translateToSwahili(instruction: string): string`

  Simple keyword-replace map (no external library):

  ```ts
  const ORS_TO_SW: [RegExp, string][] = [
    [/\bturn left\b/i,            'Pinda kushoto'],
    [/\bturn right\b/i,           'Pinda kulia'],
    [/\bcontinue straight\b/i,    'Endelea moja kwa moja'],
    [/\bkeep left\b/i,            'Shikilia kushoto'],
    [/\bkeep right\b/i,           'Shikilia kulia'],
    [/\bhead\b/i,                 'Enda'],
    [/\barrive at destination\b/i,'Umefika unapoenda'],
    [/\bturn\b/i,                 'Geuka'],
    [/\bstraight\b/i,             'Moja kwa moja'],
    [/\bright\b/i,                'Kulia'],
    [/\bleft\b/i,                 'Kushoto'],
  ];
  // Apply in order, return original if no match
  ```

  ### On unmount

  Call `subscription.remove()` to stop GPS.

  ### 'Nimefika' button action

  1. POST `${API_BASE}/trips/${tripId}/complete` with `{}` (using axios).
  2. On success: navigate back to `HomeMain` (reset to root of HomeStack).
  3. On error: Alert 'Hitilafu ya kukamilisha safari'.

  ### UI layout (dark theme: bg `#1a1a2e`, cards `#16213e`, accent `#00d46a`, error `#ff3b30`)

  ```
  ┌──────────────────────────────────────┐
  │  ← back  |  "Mwelekeo wa Safari"     │  header, bg #1a1a2e
  ├──────────────────────────────────────┤
  │  [Instruction card — big text]        │  currentStep.swahili, fontSize 22 bold white
  │  e.g. "Pinda kushoto"                │
  │  Next: [next step text]              │  fontSize 13 grey
  ├──────────────────────────────────────┤
  │  📍 [distanceRemaining]m  |  ⏱ [eta]│  stats row
  │  ━━━━━━━━━━━━━━━━━━  [progress]%     │  green progress bar
  ├──────────────────────────────────────┤
  │  [Coordinate display card]           │  only when driverLocation is set
  │  Lat: XX.XXXX  Lng: XX.XXXX          │  white text on #16213e
  │  Kasi: X km/h                        │
  ├──────────────────────────────────────┤
  │  [Upcoming steps list — 3 items]     │  FlatList, scrollable
  │  ● Step N: [swahili]  [distance_m]m  │
  ├──────────────────────────────────────┤
  │  [NIMEFIKA button]                   │  green when canArrive, grey when disabled
  └──────────────────────────────────────┘
  ```

  Loading state: `ActivityIndicator` centered, white.
  Error state: red card with `routeError` message + 'Jaribu Tena' button that retries the route fetch.

  Files: `apps/driver-app/src/screens/trip/NavigationScreen.tsx` (create new)

  Verify: `npx tsc --noEmit` from `apps/driver-app/` — 0 errors. The file imports compile cleanly.

- [ ] 5. **Extend `HomeStackParamList` and register `NavigationScreen` in `MainNavigator.tsx`**

  In `MainNavigator.tsx`:
  - Add to `HomeStackParamList`:
    ```ts
    Navigation: {
      tripId: string;
      pickup_lat: number;
      pickup_lng: number;
      destination_lat: number;
      destination_lng: number;
      passenger_name: string;
      fare: number;
    };
    ```
  - Import `NavigationScreen` from `'../screens/trip/NavigationScreen'`.
  - Add inside `HomeNavigator`:
    ```tsx
    <HomeStack.Screen
      name="Navigation"
      component={NavigationScreen}
      options={{ headerShown: false }}
    />
    ```

  Files: `apps/driver-app/src/navigation/MainNavigator.tsx`

  Verify: `npx tsc --noEmit` from `apps/driver-app/` — 0 errors.

- [ ] 6. **Add 'Navigate' button to `ActiveTripScreen.tsx` (driver app)**

  In `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`:
  - The screen currently receives `route.params` typed as `{ tripId: string }` (from `HomeStackParamList`).
  - Import `StackNavigationProp` from `@react-navigation/stack` (already used in `HomeScreen.tsx`).
  - Update the component to accept typed `navigation` and `route` props using `HomeStackParamList` and `ActiveTrip` screen key.
  - The `ActiveTrip` route params currently only include `tripId: string`. The trip data needed for NavigationScreen (`pickup_lat`, `pickup_lng`, `destination_lat`, `destination_lng`, `passenger_name`, `fare`) must come from the existing `trip` state (which is hardcoded mock data for now — use `trip.pickup`, `trip.destination` string fields as fallbacks, but add optional coord fields to the `Trip` interface so they can be populated when real data flows in).
  - Update `HomeStackParamList` in `MainNavigator.tsx` to add optional coord fields to `ActiveTrip` params:
    ```ts
    ActiveTrip: {
      tripId: string;
      pickup_lat?: number;
      pickup_lng?: number;
      destination_lat?: number;
      destination_lng?: number;
      passenger_name?: string;
      fare?: number;
    };
    ```
  - Replace the `handleStartTrip` Alert with a `navigation.navigate('Navigation', { ... })` call:
    ```ts
    const handleStartTrip = () => {
      navigation.navigate('Navigation', {
        tripId: route.params.tripId,
        pickup_lat: route.params.pickup_lat ?? 0,
        pickup_lng: route.params.pickup_lng ?? 0,
        destination_lat: route.params.destination_lat ?? 0,
        destination_lng: route.params.destination_lng ?? 0,
        passenger_name: route.params.passenger_name ?? trip.passengerName,
        fare: route.params.fare ?? trip.fare,
      });
    };
    ```
  - Change the "Start Trip" button label to '🧭 Anza Safari / Nenda' to signal navigation intent in Swahili.

  Files:
  - `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`
  - `apps/driver-app/src/navigation/MainNavigator.tsx` (update `ActiveTrip` params, already touched in step 5)

  Verify: `npx tsc --noEmit` from `apps/driver-app/` — 0 errors. Tapping 'Anza Safari / Nenda' in ActiveTripScreen pushes NavigationScreen onto the stack.

- [ ] 7. **Wire `HomeScreen.tsx` to pass coords when accepting a trip**

  `handleAcceptTrip` calls `DriverAPI.acceptTrip(tripId)` and navigates to `'ActiveTrip', { tripId: activeTrip.id }`. The `ActiveTrip` interface in `DriverAPI.ts` already has `pickup: GeoPoint` and `destination: GeoPoint`. Pass them through:
  ```ts
  navigation.navigate('ActiveTrip', {
    tripId: activeTrip.id,
    pickup_lat: activeTrip.pickup.lat,
    pickup_lng: activeTrip.pickup.lng,
    destination_lat: activeTrip.destination.lat,
    destination_lng: activeTrip.destination.lng,
    passenger_name: activeTrip.passengerName,
    fare: activeTrip.fare,
  });
  ```

  Files: `apps/driver-app/src/screens/main/HomeScreen.tsx`

  Verify: `npx tsc --noEmit` from `apps/driver-app/` — 0 errors. Accept a trip (or mock one) and the navigate call compiles cleanly with all required NavigationScreen params propagated.

---

## Dependency order summary

Steps 1 → 2 are passenger-app only, independent of driver-app steps.
Step 3 is passenger-app only, independent of driver-app steps.
Steps 4 → 5 → 6 → 7 must run in that order: NavigationScreen must exist before MainNavigator registers it; MainNavigator params must be updated before ActiveTripScreen uses them; HomeScreen navigate call must match the final param types.

## TypeScript verification command

```bash
# passenger-app
cd apps/passenger-app && npx tsc --noEmit

# driver-app
cd apps/driver-app && npx tsc --noEmit
```

Both must exit with 0 errors after each step.

## Constraints reminder (checked against package.json)

| Package needed | passenger-app | driver-app |
|---|---|---|
| react-native-maps | ✅ 1.14.0 | ❌ absent → coordinate display |
| expo-location | ✅ ~17.0.0 | ✅ ~17.0.0 |
| axios | ✅ ^1.7.7 | ✅ ^1.7.7 |
| expo-speech | ❌ absent → TODO comment | ❌ absent → TODO comment |
| @expo/vector-icons | ✅ ^14.0.0 | ❌ absent → use Text emoji |

No new packages may be installed. All UI must use only packages listed above.
