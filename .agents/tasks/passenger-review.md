# Live Driver Map, Traffic Screen, and Trip Tracking

This change adds real-time driver visibility to the DalaSmart passenger app through three coordinated pieces: a live-driver overlay on the main map (MainScreen), a dedicated traffic-overlay screen (TrafficScreen), and a live-location polling loop inside the active-trip screen (TripActiveScreen). On the backend, three new `tracking.*` endpoints serve the frontend — `nearby-drivers`, `traffic`, and `trip/:tripId/driver-location` — all of which fall back to deterministic mock data when the DB is unavailable. The polling architecture throughout is short-interval setInterval rather than WebSocket, which suits the Vercel serverless constraint.

**Watch for:** (confirmed) duplicate style keys in MainScreen's `StyleSheet.create` silently overwrite the first definition; (confirmed) the elapsed-timer `setInterval` in TripActiveScreen is never assigned to a ref, so it leaks if the component unmounts mid-trip; (confirmed) `driver.rating` is hardcoded to `0` in the initial `useState` default but is never populated from any API response in the live-tracking path; (confirmed) TrafficScreen hardcodes its API base URL to the production Vercel endpoint rather than using `EXPO_PUBLIC_API_URL`.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Interval management in MainScreen and TrafficScreen is done correctly — both use `useRef` and clear in `useEffect` cleanup. TripActiveScreen handles the tracking interval properly in the live path but has a second interval (the elapsed timer) created as a bare `setInterval` with no ref, which will leak if the component unmounts while a trip is in progress.

The driver card in TripActiveScreen shows name, plate, and rating, and the call button opens a `tel:` URI via `Linking.openURL`. The `rating` field is always `0` in the live-tracking path because `setDriver` is only called in the simulation branch (`if (hasTripId) return`); live trips populate `driverLocation` but never `driver`.

All three new backend endpoints fall back to mock data on DB failure, satisfying the resilience requirement. The `nearby-drivers` and `traffic` endpoints handle the catch at the outer level; `trip/:tripId/driver-location` falls through to mock in the inner catch. The `GET /tracking/nearby` endpoint still returns a 500 on DB error instead of mock data, but that endpoint is not called by the frontend in this change.

TrafficScreen hardcodes `https://simon-daladala-api.vercel.app/api/v1` as its API base. Every other screen in the app reads from `EXPO_PUBLIC_API_URL`. This means the traffic screen will always hit production — local dev and staging environments are bypassed silently.

The `any` type is used in several places that have known shapes: `navigation` props across all three screens, `row: any` in the `nearby-drivers` query result mapping, and `err` in several catch clauses. The `nearby` array in `GET /tracking/nearby` is typed as `any[]` despite having a known shape.

MainScreen's `StyleSheet.create` object contains duplicate keys — `driverMarker`, `driverCardName`, `driverCardPlate`, `bookBtn`, `bookBtnText`, `trafficBtn` are each defined twice. React Native's StyleSheet silently uses the last definition, so the first (correct, design-compliant) definitions for `trafficBtn` (`backgroundColor: '#1a1a2e'`) and the driver card dark theme are discarded in favour of the second (white/light) versions.

---

<details>
<summary>Issues (6)</summary>

1. **Duplicate StyleSheet keys overwrite dark-theme styles** — `trafficBtn`, `driverMarker`, `driverCardName`, `driverCardPlate`, `bookBtn`, `bookBtnText` are each defined twice in MainScreen's `StyleSheet.create`. The second (light-theme) definition silently wins. Fix by removing the duplicate block (the second set starting from `// Driver marker` comment near line 260 onward) and keeping the first `#1a1a2e`-backed definitions. (confirmed)

2. **Elapsed timer interval leaks on unmount** — In TripActiveScreen, the `in_progress` elapsed-timer `setInterval` is not stored in a ref; the cleanup closure captures a stale `interval` variable but only if it was created in that render. If the component unmounts between status transitions the interval fires on an unmounted component. Store in a second `useRef<ReturnType<typeof setInterval> | null>` and clear it in the cleanup. (confirmed)

3. **Driver rating always 0 in live-trip path** — `setDriver` is only called inside the `!hasTripId` simulation branch. When a real `tripId` is provided, `driver` stays at its initial `{ name: '', plate: '', rating: 0 }` default. The `/trip/:tripId` endpoint already returns `name` and `plate`; populate `driver` from the first `GET /tracking/trip/:tripId` response in the live path. (confirmed)

4. **TrafficScreen hardcodes production API URL** — `const API = 'https://simon-daladala-api.vercel.app/api/v1'` bypasses `EXPO_PUBLIC_API_URL` entirely. Change to `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'` to match the rest of the app. (confirmed)

5. **`any` types where shapes are known** — `navigation: any` on all three screens, `row: any` in the `nearby-drivers` DB result map, and `nearby: any[]` in `GET /tracking/nearby`. Define a minimal `NavigationProp` type or use `any` only for the prop-type boundary. Type the DB row at least inline to avoid indexing an untyped object. (confirmed)

6. **`GET /tracking/nearby` returns 500 on DB error** — Unlike the three new endpoints, this pre-existing endpoint's catch block returns `res.status(500).json(...)` rather than falling back to mock data. It is not called by the frontend in this diff, but it sits adjacent to the new endpoints and violates the pattern established here. (likely — endpoint is in the same file and follows a different error pattern)

</details>

<details>
<summary>Details</summary>

### Duplicate StyleSheet keys and dark-theme regression

MainScreen's `StyleSheet.create` block defines several keys twice. The duplicates appear after the `// Driver marker` comment at the bottom of the stylesheet and redefine `driverMarker`, `driverCardName`, `driverCardPlate`, `driverCardRow`, `driverCardStat`, `bookBtn`, `bookBtnText`, `trafficBtn`, `liveDot`, `modalOverlay`, `driverBottomCard`, `driverCardHandle`. The design-compliant first definitions use `backgroundColor: '#1a1a2e'` for the traffic button and dark card colors; the second definitions set `backgroundColor: '#fff'` for `trafficBtn` and omit the dark background entirely. JavaScript object literals allow duplicate keys — the last value wins — so the rendered traffic button will be white, not `#1a1a2e`. This is a confirmed regression against criterion 6.

### Elapsed timer not stored in ref (TripActiveScreen)

The `in_progress` branch creates a bare `setInterval`:

```ts
const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
return () => clearInterval(interval);
```

If the user force-navigates away while `status === 'in_progress'`, the interval fires on an unmounted component and produces a React warning in development. Store it in a `useRef<ReturnType<typeof setInterval> | null>` alongside `trackingRef` so it clears unconditionally on unmount, consistent with the rest of the polling code in this file.

### Driver info unpopulated in live-trip path

The `Driver` interface requires `name`, `plate`, `rating`, `vehicle`, and `phone`. In the simulation path, `setDriver(...)` is called at the `accepted` timeout. In the live path, only `driverLocation` is populated from `GET /tracking/trip/:tripId/driver-location`. The `/trip/:tripId` endpoint (not the `/driver-location` sub-endpoint) returns `name` and `plate` alongside coordinates. A single fetch to that endpoint on mount in the live path would populate `driver.name` and `driver.plate`; `rating` would still require either a separate call or inclusion in the trip endpoint's response. As-is, the driver card shows an empty name and `⭐ 0` rating for all live trips.

### `any` surface in tracking.ts

The `nearby` array in `GET /tracking/nearby` is declared `const nearby: any[]`. The shape pushed into it is consistent (`driverId`, `latitude`, `longitude`, `heading`, `distance`) and could be a named interface. The `row: any` annotation in the `nearby-drivers` map function is the more impactful case: it silences type errors on `row.lat`, `row.name`, etc. from the DB result. Neither is a runtime risk given the mock fallback, but criterion 3 flags the use of `any` where a proper type can be used.

</details>

---

<details>
<summary>File map</summary>

- `apps/passenger-app/screens/MainScreen.tsx` — added live driver markers on map, polling loop via `useRef`, Msongamano traffic button, driver selection bottom card
- `apps/passenger-app/screens/TrafficScreen.tsx` *(new)* — full traffic overlay screen with color-coded Polyline segments and 30-second polling
- `apps/passenger-app/screens/TripActiveScreen.tsx` — added live `driverLocation` tracking interval, driver card with call button, progress bar, ETA overlay
- `services/api-gateway/src/routes/tracking.ts` — added `nearby-drivers`, `traffic`, and `trip/:tripId/driver-location` endpoints with mock fallbacks
- `apps/passenger-app/App.tsx` — registered `TrafficScreen` in the navigator stack

Full diff: `git diff main -- apps/passenger-app/screens/MainScreen.tsx apps/passenger-app/screens/TrafficScreen.tsx apps/passenger-app/screens/TripActiveScreen.tsx services/api-gateway/src/routes/tracking.ts apps/passenger-app/App.tsx`

</details>
