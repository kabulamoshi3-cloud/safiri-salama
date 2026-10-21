# Navigation UI — Implementation Verification Note

## Summary

All 7 FEAT-002 passenger-app changes and all 4 FEAT-003 driver-app changes implemented and committed.

---

## Files Created

| File | Change |
|------|--------|
| `apps/driver-app/src/screens/trip/NavigationScreen.tsx` | New file — GPS turn-by-turn navigation screen for driver |

## Files Modified

| File | Changes Made |
|------|-------------|
| `apps/passenger-app/screens/RideRequestScreen.tsx` | Added `routeError` state, inline error card with retry, fallback fare estimate (haversine × 1.3 × 500 TZS/km), Nominatim autocomplete, `to_lat`/`to_lng`/`tripId` in `confirmRide` navigate call |
| `apps/passenger-app/screens/TripActiveScreen.tsx` | Route fetch on mount, green Polyline, typed pickup/destination Markers, polyline-snapped driver marker (`driverPolylineIndex`), ETA computed from haversine to destination |
| `apps/driver-app/src/navigation/MainNavigator.tsx` | Added `Navigation` to `HomeStackParamList`, extended `ActiveTrip` with optional coord fields, registered `NavigationScreen` in `HomeNavigator` |
| `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx` | Added typed `Props` with `navigation`/`route`, replaced `handleStartTrip` Alert with `navigation.navigate('Navigation', {...})`, button label changed to '🧭 Anza Safari / Nenda' |
| `apps/driver-app/src/screens/main/HomeScreen.tsx` | `handleAcceptTrip` now passes full `pickup_lat/lng`, `destination_lat/lng`, `passenger_name`, `fare` from `ActiveTrip` response |

---

## TypeScript Check Results

### passenger-app
```
npx tsc --noEmit
```
TypeScript binary not installed in `apps/passenger-app/node_modules` (the directory exists but is empty — `node_modules/typescript/` is an empty directory). This is a pre-existing infrastructure issue; the project builds via Metro/Babel, not tsc directly.

Using the `services/api-gateway` tsc binary: errors are all `Cannot find module 'react'` and similar — pre-existing across every file in both apps, not caused by this change.

### driver-app
```
npx tsc --noEmit
```
Same situation: 129 lines of errors in the tsc output, all of the form `Cannot find module 'react'` / `Cannot find module '@react-navigation/stack'` etc. — pre-existing across every file, not introduced by this change. My new `NavigationScreen.tsx` has only module-not-found and cascading implicit-any errors from unresolved imports, matching the same pattern as all pre-existing files.

### NavigationScreen registered
Confirmed: `NavigationScreen` is imported and registered in `HomeNavigator` inside `apps/driver-app/src/navigation/MainNavigator.tsx`.

---

## Design decisions / constraints observed

- **No `react-native-maps` in driver-app**: NavigationScreen uses a coordinate display card (not MapView). ✅
- **No `expo-speech`**: `Speech.speak()` call is replaced with `// TODO: install expo-speech for voice navigation` comment. ✅
- **No new packages**: Only used packages already in each app's `package.json`. ✅
- **API base**: `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'` used throughout. ✅
- **Haversine fallback**: When routing fails in RideRequestScreen, fare estimated from haversine × 1.3 × 500 TZS/km rounded to nearest 100. ✅
- **ETA**: `Math.max(1, Math.round((distKm / 30) * 60))` minutes label shown as 'Dakika N zimesalia'. ✅
