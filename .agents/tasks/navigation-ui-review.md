# Navigation UI — Passenger Route Map and Driver GPS Screen

This change adds two major pieces: a GPS turn-by-turn navigation screen for the driver app (`NavigationScreen.tsx`), and a significantly upgraded trip-active screen for the passenger app that shows the route polyline, typed pickup/destination markers, and a polyline-snapped driver marker. Supporting changes wire up Nominatim autocomplete and an error card in `RideRequestScreen`, extend the navigator param types, and replace the `handleStartTrip` Alert stub in `ActiveTripScreen` with a real `navigation.navigate('Navigation', …)` call. The previous review flagged two blocking issues (`theme.colors.card` and missing `process` global); both were fixed in commit `dea6e54`. One new blocking issue remains: `RideRequestScreen.confirmRide` does not pass `pickupCoords` to `TripActive`, so the pickup origin used when fetching the route on the passenger map always silently falls back to the Dar es Salaam city-center default.

**Watch for:** pickup coords silently dropped in the passenger `confirmRide` navigate call (confirmed) — route fetch in `TripActiveScreen` uses the wrong origin in production.

**Verdict**: NEEDS_CHANGES

---

## High-level view

`NavigationScreen` is registered in `HomeNavigator` and typed against `HomeStackParamList`. The screen fetches a turn-by-turn route from the backend, starts a GPS watcher that posts driver location to the tracking API, advances through steps when within 50 m of each waypoint, and gates the "Nimefika" button until within 100 m of the destination. No new packages are imported: `react-native-maps` and `expo-speech` are absent from the driver-app bundle; voice navigation is left as a TODO comment.

`TripActiveScreen` fetches the route on mount and renders a green `Polyline`, typed pickup and destination `Marker` components, and a driver marker snapped to the nearest polyline point. However, the pickup origin used in the `calculate-route` POST comes from `route.params?.pickupCoords?.lat`, while `RideRequestScreen.confirmRide` never passes a `pickupCoords` key — it passes `destinationCoords` (the object) but omits the pickup side. The result is `pickupLat === null` every time, and the route fetch falls back to `region.latitude` / `region.longitude` (Dar es Salaam center coordinates), silently drawing a route from the wrong starting point.

The `estimateFare` fallback in `RideRequestScreen` checks `if (!estimatedFare)` inside the `.finally()` callback of an async `calculateRoute` call. Because `estimatedFare` is captured from React state at the time the `.finally` closure was created, this check reads a stale value and will always see `null` even when `calculateRoute` set a fare — the haversine fallback fires unconditionally. The visible effect is that the fare displayed after a successful route fetch gets overwritten by the (typically lower) straight-line estimate.

---

<details>
<summary>Issues (3)</summary>

1. **Missing pickupCoords in confirmRide** — `RideRequestScreen.confirmRide` does not pass `pickupCoords` in the navigation params. `TripActiveScreen` reads `route.params?.pickupCoords?.lat` (always `undefined`), so every route fetch in the passenger map starts from Dar es Salaam city center instead of the rider's actual location. Add `pickupCoords` to the `confirmRide` navigate call alongside `destinationCoords`.

2. **Stale closure in estimateFare fallback** — The `if (!estimatedFare)` check inside `.finally()` always reads `null` because it captures state from the render that initiated the call. This causes the haversine estimate to unconditionally overwrite the route-based fare. Replace the stale check by tracking whether `calculateRoute` succeeded with a local boolean returned from the function, or by restructuring the fallback to only run when the route call threw.

3. **NavigationScreen "Nimefika" always enabled after timeout** — `canArrive` is set only from the GPS watcher callback; if location permission is granted but the device never receives a GPS fix (tunnel, poor signal), `distToDestM` is never computed and the button stays permanently disabled. A driver who has physically arrived but has no GPS fix cannot complete the trip. Consider adding a manual override after a timeout (e.g. 60 s with no location update).

</details>

<details>
<summary>Details</summary>

### Pickup coord gap in passenger-side route fetch

`RideRequestScreen.confirmRide` sends this param bundle to `TripActive`:

```ts
navigation.navigate('TripActive', {
  pickup,
  destination,
  vehicle: selectedVehicle,
  fare: estimatedFare,
  paymentMethod,
  to_lat: destinationCoords?.lat ?? null,
  to_lng: destinationCoords?.lng ?? null,
  tripId: null,
  polylineCoords,
  destinationCoords,        // ← destination object present
  // pickupCoords: missing  // ← pickup object never passed
});
```

`TripActiveScreen` extracts it as:

```ts
const pickupLat: number | null = route.params?.pickupCoords?.lat ?? null;
const pickupLng: number | null = route.params?.pickupCoords?.lng ?? null;
```

Both resolve to `null`. The mount-time route fetch then does:

```ts
const fromLat = pickupLat ?? region.latitude;   // → -6.7924 (city center)
const fromLng = pickupLng ?? region.longitude;  // → 39.2083 (city center)
```

The route drawn on the map starts from the center of Dar es Salaam regardless of where the passenger actually is. The fix is one line: add `pickupCoords` to the navigate call.

### Stale closure in fare fallback

Inside `estimateFare`:

```ts
calculateRoute().finally(() => {
  if (!estimatedFare) {  // stale closure — always null
    const dist = haversineKm(…);
    …
    setEstimatedFare(total);  // overwrites the route-based fare
  }
  setLoading(false);
});
```

`estimatedFare` is state captured at the closure creation time, before `calculateRoute` has called `setEstimatedFare`. The check always passes. The route-based fare gets overwritten by the haversine estimate on every successful route fetch. The cleanest fix is to have `calculateRoute` return a boolean indicating success and use that instead of the stale state check.

### NavigationScreen GPS-gate on Nimefika

The arrive button is disabled until `canArrive` is true, which requires the location watcher to fire with a position within 100 m of the destination. If the watcher never fires — because GPS signals are weak or the watcher startup throws silently — the button is permanently disabled even if the driver has physically arrived. The silent catch on the watcher startup (`catch { /* permission already checked, ignore */ }`) means there is no fallback path. Adding a timeout-based override or a "force arrive" escape hatch after N seconds without a GPS update would prevent a driver from being stuck.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `apps/driver-app/src/screens/trip/NavigationScreen.tsx` | New screen — turn-by-turn GPS navigation for driver |
| `apps/driver-app/src/navigation/MainNavigator.tsx` | Added `Navigation` route + extended `ActiveTrip` params; registered `NavigationScreen` in `HomeNavigator` |
| `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx` | Replaced Alert stub with `navigation.navigate('Navigation', …)`; fixed `theme.colors.card` → `theme.colors.surface` |
| `apps/driver-app/src/screens/main/HomeScreen.tsx` | `handleAcceptTrip` now passes full pickup/destination coords and passenger metadata |
| `apps/driver-app/src/global.d.ts` | New — declares `process.env` for tsc so `EXPO_PUBLIC_API_URL` compiles cleanly |
| `apps/passenger-app/screens/RideRequestScreen.tsx` | Added Nominatim autocomplete, error card + retry, `routeError` state, `to_lat`/`to_lng`/`tripId` in navigate call |
| `apps/passenger-app/screens/TripActiveScreen.tsx` | Route fetch on mount, green Polyline, typed pickup/destination Markers, polyline-snapped driver marker, haversine ETA |

Full diff: `git diff HEAD~2 HEAD -- apps/driver-app/src apps/passenger-app/screens`

</details>
