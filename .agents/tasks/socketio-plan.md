# Implementation Plan — Wire Socket.io Tracking Service for Real-Time Updates

## Background

The tracking-service (`services/tracking-service/src/index.ts`) is fully built with Socket.io, Redis, JWT auth, trip rooms (`trip:{tripId}`), `driver:moved` broadcasts, ETA changes, and SOS. All three client apps currently poll REST endpoints. This plan wires the socket layer end-to-end without touching tracking-service core logic.

The api-gateway already has a `notifyTrackingService()` function that fires `POST ${TRACKING_SERVICE_URL}/internal/trip-event`. The tracking-service is missing the `/api/internal` router that receives those calls. That is the only backend gap.

FEAT artifacts are under `.agents/tasks/socketio-wireup/`. The workflow tail has been decomposed into three sequential FEAT coders + a convergence loop.

---

## PART 1 — api-gateway → tracking-service event forwarding

- [ ] 1. **Create `services/tracking-service/src/routes/internal.ts`**  
      Export a factory `createInternalRouter(io: Server): Router`. The router handles `POST /trip-event`: reads `{ event, tripId, ...rest }` from `req.body`, calls `io.to(\`trip:${tripId}\`).emit(event, { tripId, ...rest })`, responds 204. No auth (internal network only).  
      Files: `services/tracking-service/src/routes/internal.ts`  
      Verify: `cd services/tracking-service && npx tsc --noEmit` — zero errors.

- [ ] 2. **Mount internal router in `services/tracking-service/src/index.ts`**  
      Import `createInternalRouter` from `./routes/internal`. After the existing `app.use('/api/safety', safetyRouter)` line, add `app.use('/api/internal', createInternalRouter(io))`. The `io` instance is already in scope at module level — pass it directly. Do NOT modify any Socket.io event handlers or existing routes.  
      Files: `services/tracking-service/src/index.ts`  
      Verify: `cd services/tracking-service && npx tsc --noEmit` — zero errors.

- [ ] 3. **Update `services/api-gateway/.env.example`**  
      Change the empty `TRACKING_SERVICE_URL=` line to `TRACKING_SERVICE_URL=http://localhost:3001`.  
      The api-gateway already calls `${TRACKING_SERVICE_URL}/internal/trip-event` in `notifyTrackingService()` — this just gives developers a working default.  
      Files: `services/api-gateway/.env.example`  
      Verify: `grep TRACKING_SERVICE_URL services/api-gateway/.env.example` — shows `http://localhost:3001`.

---

## PART 2 — passenger-app Socket client

- [ ] 4. **Add `socket.io-client` to passenger-app**  
      Add `"socket.io-client": "4.7.5"` to `dependencies` in `apps/passenger-app/package.json`.  
      Version 4.7.5 is compatible with Expo 51 / React Native 0.74 and matches the socket.io server version in tracking-service.  
      Files: `apps/passenger-app/package.json`  
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors (import resolution will be checked by tsc after file creation in next step).

- [ ] 5. **Create `apps/passenger-app/services/TrackingSocket.ts`**  
      Singleton module (not a class). Internal state: `let socket: Socket | null = null`. Exports:
      - `connect(token: string): void` — `io(process.env.EXPO_PUBLIC_TRACKING_URL ?? 'http://localhost:3001', { auth: { token }, transports: ['websocket'] })`; logs connect/error events; swallows connection errors.
      - `joinTrip(tripId: string): void` — guards null socket, emits `trip:join` `{ tripId }`.
      - `leaveTrip(): void` — emits `trip:leave`.
      - `onDriverMoved(cb): () => void` — `socket.on('driver:moved', cb); return () => socket.off('driver:moved', cb)`.
      - `onTripStatus(cb): () => void` — same for `trip:status`.
      - `onETAChanged(cb): () => void` — same for `eta:changed`.
      - `disconnect(): void` — `socket.disconnect(); socket = null`.
      
      Files: `apps/passenger-app/services/TrackingSocket.ts`  
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

- [ ] 6. **Update `apps/passenger-app/screens/TripActiveScreen.tsx`**  
      In the existing `useEffect` that runs when `hasTripId` is true and `liveStatuses.includes(status)`:
      - At the top of the effect, after the `if (!hasTripId) return;` guard: import `TrackingSocket` from `'../services/TrackingSocket'` (top-level import) and `AsyncStorage` from `'@react-native-async-storage/async-storage'`.
      - Add async socket setup: `AsyncStorage.getItem('@dalasmart:token').then(token => { if (token) { TrackingSocket.connect(token); TrackingSocket.joinTrip(tripId); } })`.
      - Register listeners: `const unsubMove = TrackingSocket.onDriverMoved(loc => setDriverLocation({ lat: loc.latitude, lng: loc.longitude, bearing: loc.heading ?? 0, speed_kmh: loc.speed ?? 0, eta_minutes: loc.eta ?? 0, progress_percent: 0 })); const unsubStatus = TrackingSocket.onTripStatus(t => { if (t.status) setStatus(t.status as TripStatus); }); const unsubETA = TrackingSocket.onETAChanged(({ newETA }) => setEtaMinutes(newETA));`
      - In the cleanup return: `unsubMove(); unsubStatus(); unsubETA(); TrackingSocket.leaveTrip();`
      - **Keep** the existing `setInterval(fetchLocation, 5000)` polling unchanged — it remains the fallback.
      
      Files: `apps/passenger-app/screens/TripActiveScreen.tsx`  
      Verify: `cd apps/passenger-app && npx tsc --noEmit` — zero errors.

---

## PART 3 — driver-app Socket client

- [ ] 7. **Add `socket.io-client` to driver-app**  
      Add `"socket.io-client": "4.7.5"` to `dependencies` in `apps/driver-app/package.json`.  
      Files: `apps/driver-app/package.json`  
      Verify: after creating the service file in step 8, `cd apps/driver-app && npx tsc --noEmit` passes.

- [ ] 8. **Create `apps/driver-app/src/services/TrackingSocket.ts`**  
      Singleton module. Internal state: `socket: Socket | null`, `emitInterval: ReturnType<typeof setInterval> | null`. Exports:
      - `connect(token: string): void` — connects to `process.env.EXPO_PUBLIC_TRACKING_URL ?? 'http://localhost:3001'` with `{ auth: { token } }`. Decodes `driverId` from JWT: `JSON.parse(atob(token.split('.')[1])).id`.
      - `startLocationEmit(tripId: string, getLocation: () => Promise<{ latitude: number; longitude: number; heading?: number; speed?: number }>): void` — sets a 5000ms interval; each tick calls `getLocation()`, then emits `driver:location:update` with `{ driverId, latitude, longitude, heading, speed, currentTripId: tripId, timestamp: Date.now() }`. Catches `getLocation` errors silently.
      - `stopLocationEmit(): void` — clears `emitInterval`.
      - `disconnect(): void` — calls `stopLocationEmit()`, disconnects socket.
      
      Files: `apps/driver-app/src/services/TrackingSocket.ts`  
      Verify: `cd apps/driver-app && npx tsc --noEmit` — zero errors.

- [ ] 9. **Update `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`**  
      Add top-level imports: `import TrackingSocket from '../../services/TrackingSocket'` and `import AsyncStorage from '@react-native-async-storage/async-storage'` and `import * as Location from 'expo-location'`.  
      - In `handleStartTrip()`, before calling `navigation.navigate('Navigation', ...)`, add: `AsyncStorage.getItem('@dalasmart:token').then(token => { if (!token) return; TrackingSocket.connect(token); TrackingSocket.startLocationEmit(route.params.tripId, async () => { const loc = await Location.getCurrentPositionAsync({}); return { latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? undefined, speed: loc.coords.speed ?? undefined }; }); });`
      - In `confirmPayment()` inside the Alert `onPress` callback, after `setShowPaymentModal(false)` and before `navigation.replace(...)` add: `TrackingSocket.stopLocationEmit(); TrackingSocket.disconnect();`
      - Add a cleanup `useEffect`: `useEffect(() => () => { TrackingSocket.stopLocationEmit(); TrackingSocket.disconnect(); }, []);`
      
      Files: `apps/driver-app/src/screens/trip/ActiveTripScreen.tsx`  
      Verify: `cd apps/driver-app && npx tsc --noEmit` — zero errors.

---

## PART 4 — web-platform Socket client

- [ ] 10. **Add `socket.io-client` to web-platform**  
       Add `"socket.io-client": "4.7.5"` to `dependencies` in `apps/web-platform/package.json`. Note: `LiveTracking.tsx` already imports from `socket.io-client` — this declares it properly.  
       Files: `apps/web-platform/package.json`  
       Verify: `cd apps/web-platform && npm run build` — zero errors.

- [ ] 11. **Create `apps/web-platform/src/services/trackingSocket.ts`**  
       Singleton module following the same pattern as passenger-app. Use `import.meta.env.VITE_TRACKING_URL ?? 'http://localhost:3001'` for the URL (Vite convention). Exports: `connect(token)`, `joinTrip(tripId)`, `leaveTrip()`, `onDriverMoved(cb): () => void`, `onTripStatus(cb): () => void`, `onETAChanged(cb): () => void`, `isConnected(): boolean`, `disconnect()`.  
       Files: `apps/web-platform/src/services/trackingSocket.ts`  
       Verify: `cd apps/web-platform && npm run build` — zero errors.

- [ ] 12. **Update `apps/web-platform/src/pages/ActiveTripPage.tsx`**  
       Add import: `import trackingSocket from '../services/trackingSocket'`. Add state: `const [socketConnected, setSocketConnected] = useState(false)`.  
       In the existing `useEffect` that runs on mount (fetches trip details): after `setTrip(response.data)` and if the trip status is active (not `'completed'` and not `'cancelled'`): call `trackingSocket.connect(token); trackingSocket.joinTrip(tripId!); setSocketConnected(true); const unsubStatus = trackingSocket.onTripStatus(updated => setTrip(prev => prev ? { ...prev, status: updated.status } : prev));`. In the cleanup: `trackingSocket.leaveTrip(); trackingSocket.disconnect(); setSocketConnected(false); unsubStatus?.();`.  
       Add a separate polling `useEffect` that only activates when `!socketConnected` and trip status is active — calls `fetchTripDetails()` every 10 000ms. Existing `LiveTracking` component in JSX is unchanged.  
       Files: `apps/web-platform/src/pages/ActiveTripPage.tsx`  
       Verify: `cd apps/web-platform && npm run build` — zero errors and no bundler warnings about missing deps.

---

## Final commit

- [ ] 13. **Commit all changes**  
       Stage all modified/created files and commit with message: `feat: wire Socket.io tracking-service for real-time updates`.  
       Files changed: all files listed in steps 1–12.  
       Verify: `git diff --stat HEAD` — confirms all expected files are included.

---

## Constraints (enforced throughout)

- Do NOT modify: `services/tracking-service/src/index.ts` Socket.io event handlers, `intelligence.ts`, `safety.ts`.
- Keep REST polling fallback in all apps (never remove the existing polling loops).
- JWT token source: `AsyncStorage.getItem('@dalasmart:token')` in both mobile apps; `localStorage.getItem('token')` in web (already in place).
- Socket handshake: `{ auth: { token } }` — matches the `io.use()` middleware in tracking-service.
- Use `socket.io-client@4.7.5` (pinned) in all three apps.
