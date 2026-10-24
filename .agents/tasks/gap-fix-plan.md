# Implementation Plan — DalaSmart Gap Fixes

Seven concrete gaps, ordered by independence (they do not depend on each other — each can fail
or succeed without blocking the others). Web/portal gaps come first because they have simpler
build verification loops; React Native app gaps come last because they cannot be hot-verified
without a device.

---

## Current state summary (findings before planning)

| Gap | File | Current state |
|-----|------|---------------|
| 1 | `driver-app/…/TripDetailsScreen.tsx` | Single `<Text>` placeholder, no params read |
| 2 | `driver-app/…/VehicleInfoScreen.tsx` | Single `<Text>` placeholder, no API call |
| 3 | `passenger-app/screens/TripsScreen.tsx` | Full duplicate of `ActivityScreen.tsx` — both hit `GET /api/v1/trips`, different UI, `TripsScreen` is **not wired into any navigator** |
| 4 | `staff-portal/…/AuthContext.tsx` | `UserRole = 'admin' \| 'operator'`, no `super_admin`; login maps any non-operator to `'admin'` |
| 5 | `public-website/…/HelpPage.tsx` | Contact section only shows phone/email/WhatsApp; no form at all |
| 6 | `admin-panel/…/App.tsx` | `Passengers.tsx` exists but is never imported; no `/passengers` route; `Layout.tsx` sidebar `NAV_ITEMS` has no Passengers entry |
| 7 | `public-website/…/HomePage.tsx`, `ServicesPage.tsx`, `Footer.tsx` | All three have static "Coming Soon" dead `<div>` blocks; no links to stores |

---

## GAP 3 — Passenger App: TripsScreen is an unwired duplicate

**Decision:** `TripsScreen` and `ActivityScreen` both fetch `GET /api/v1/trips` and display a
trip list, but their UIs differ (TripsScreen is more detailed with filter chips and payment
badges; ActivityScreen is simpler and taps into `navigation.navigate('TripDetail', …)`). 
`ActivityScreen` is already wired into `ActivityStackNavigator` (root screen `ActivityList`) 
which is mounted in `MainTabNavigator` as `ActivityTab`. `TripsScreen` is wired into nothing.

Because `TripsScreen` is a near-duplicate and the activity tab already covers the same need,
the safe fix is to **delete `TripsScreen.tsx`**. If future needs differ, the feature should be
added as a distinct screen with a clear name. Keeping both creates confusion with zero user
benefit.

---

- [ ] 1. **GAP 6 — Admin Panel: Wire Passengers page**

  Import `Passengers` in `App.tsx`, add the route `/passengers`, and add a sidebar entry in
  `Layout.tsx`. The sidebar `NAV_ITEMS` constant needs a new entry
  `{ to: '/passengers', labelKey: 'nav_passengers', icon: '🧑‍💼' }` inserted after the
  `drivers` entry. The route must be a child of the authenticated layout route.
  
  Files:
  - `apps/admin-panel/src/App.tsx`
  - `apps/admin-panel/src/components/Layout.tsx`
  
  Changes:
  1. In `App.tsx`: add `import Passengers from './pages/Passengers';` and add
     `{ path: 'passengers', element: <Passengers /> }` inside the `children` array of the
     layout route, after the `drivers` entry.
  2. In `Layout.tsx`: add
     `{ to: '/passengers', labelKey: 'nav_passengers', icon: '🧑‍💼' }` to `NAV_ITEMS` after
     `{ to: '/drivers', … }`.
  3. No new i18n key is strictly required for build — use a hardcoded label `'Passengers'` as
     fallback (matching the pattern `t('nav_passengers') || 'Passengers'`) since no i18n file
     is in scope here; the existing `t()` call pattern is fine if the key is missing — it
     returns the key itself.
  
  Verify: `cd apps/admin-panel && npm run build` — TypeScript compiles with no errors.
  Navigate to `/passengers` in the built app and confirm the table renders (or fails gracefully
  on API error, not a blank crash).

---

- [ ] 2. **GAP 7 — Public Website: Real app download links**

  Replace the "Coming Soon" dead divs in three files with real-looking download buttons that
  link to the store URLs. Use `react-icons` (already in `package.json` at `^4.12.0`) for
  store icons — import `FaGooglePlay` and `FaApple` from `react-icons/fa`.

  **URLs (authoritative, do not change):**
  - Passenger Google Play: `https://play.google.com/store/apps/details?id=com.dalasmart.passenger`
  - Passenger App Store: `https://apps.apple.com/app/dalasmart-passenger/id000000001`
  - Driver Google Play: `https://play.google.com/store/apps/details?id=com.dalasmart.driver`
  - Driver App Store: `https://apps.apple.com/app/dalasmart-driver/id000000002`

  **HomePage.tsx** — "Download the DalaSmart App" section:
  Replace the two static gray divs with two groups ("Passenger App" and "Driver App"), each
  containing an `<a>` Google Play button and an `<a>` App Store button. Use
  `target="_blank" rel="noopener noreferrer"`. Add a small italic note below:
  `'*Links will be updated when apps are published on the stores.'`
  Style buttons like the existing gray divs: dark background, white text, rounded, flex with
  icon left and text right.

  **ServicesPage.tsx** — "Ready to Get Started?" section:
  Replace the two `bg-white/20` dead divs with two groups ("Passenger App", "Driver App"),
  each with Google Play and App Store `<a>` links styled with white/transparent background to
  match the dark gradient section. Add the same disclaimer note.

  **Footer.tsx** — "Download App" column:
  Replace the two static divs with `<a>` links:
  - "Google Play" → Passenger Google Play URL
  - "App Store" → Passenger App Store URL
  Both with icon + text, `target="_blank" rel="noopener noreferrer"`.
  Add a small sub-note: "Passenger App". Add two more links for the Driver App beneath them
  (same pattern), sub-note "Driver App".

  Files:
  - `apps/public-website/src/pages/HomePage.tsx`
  - `apps/public-website/src/pages/ServicesPage.tsx`
  - `apps/public-website/src/components/Footer.tsx`

  Verify: `cd apps/public-website && npm run build` — `tsc && vite build` exits 0. Inspect
  the built HTML to confirm the store anchor tags appear and the `href` values match.

---

- [ ] 3. **GAP 5 — Public Website: Contact form in HelpPage**

  Add a "Contact Us" form section above the "Emergency Numbers" section (which is the last
  `<section>` in the file). The form uses the existing `Input` and `Button` components.

  **Form fields:**
  | Field | Component | Type |
  |-------|-----------|------|
  | Full Name | `<Input>` | `type="text"` required |
  | Email or Phone | `<Input>` | `type="text"` required |
  | Category | native `<select>` styled like Input | required |
  | Message | native `<textarea>` styled like the Input border/padding pattern | required |
  | Submit | `<Button type="submit" variant="primary" fullWidth>Send Message</Button>` | — |

  Category options: `General Inquiry`, `Trip Issue`, `Payment Problem`, `Driver Issue`,
  `Safety Concern`, `Other`.

  **State:**
  - `formData: { name, contact, category, message }` (controlled)
  - `submitting: boolean`
  - `submitStatus: 'idle' | 'success' | 'error'`

  **Submit handler:** POST to `` `${import.meta.env.VITE_API_URL}/support/create-ticket` ``
  with body `{ name, contact, category, message }` using `fetch`. On success set status
  `'success'` and clear form. On error set status `'error'`.

  **Success state:** Replace form with a green success message: "Your message has been sent.
  We'll get back to you within 24 hours."

  **Error state:** Show a red inline error above the submit button: "Failed to send. Please
  try again or call us directly."

  The `<select>` and `<textarea>` must match the Input component's Tailwind classes:
  `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`.
  Wrap each in a `<div className="mb-4">` with a `<label>` as Input does.

  Files:
  - `apps/public-website/src/pages/HelpPage.tsx`

  Verify: `cd apps/public-website && npm run build` — exits 0. Visually inspect the built
  page to confirm the form section appears above Emergency Numbers.

---

- [ ] 4. **GAP 4 — Staff Portal: Add super_admin role**

  Four sub-changes in the staff portal. Apply them all in one pass; they form one logical unit.

  **4a. `AuthContext.tsx` — extend type and login mapping:**
  1. Change `export type UserRole = 'admin' | 'operator';` →
     `export type UserRole = 'admin' | 'operator' | 'super_admin';`
  2. In the `login()` callback, the current mapping is:
     ```ts
     const detectedRole: UserRole = userType === 'operator' ? 'operator' : 'admin';
     ```
     Replace with:
     ```ts
     let detectedRole: UserRole;
     if (userType === 'operator') {
       detectedRole = 'operator';
     } else if (userType === 'super_admin' || userType === 'superadmin') {
       detectedRole = 'super_admin';
     } else {
       detectedRole = 'admin';
     }
     ```
  3. In `fetchProfile()`, the existing `role === 'operator'` branch uses `/operators/me`; the
     `else` branch uses `/admin/profile`. `super_admin` should also use `/admin/profile`. The
     current `else` already covers that — no change needed there.

  **4b. `RoleBasedRoute.tsx` — super_admin bypasses role checks:**
  Currently checks `!allowedRoles.includes(role)`. Add a guard: if `role === 'super_admin'`
  render children immediately without checking `allowedRoles`.
  Also fix the "Go to Dashboard" button in the denial UI: the `correctDashboard` variable
  currently only handles `admin`/`operator` — add
  `role === 'super_admin' ? '/admin/dashboard' : …` (or just `/admin`) to avoid broken nav.

  **4c. `App.tsx` — super_admin redirects to /admin:**
  In `RootRedirect`, add:
  ```tsx
  if (role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  ```
  Insert it before the `role === 'admin'` branch.
  Also update the `/admin` route's `allowedRoles`:
  Change `allowedRoles={['admin']}` → `allowedRoles={['admin', 'super_admin']}`.
  And the `/ops` route's `allowedRoles`:
  Change `allowedRoles={['operator']}` → `allowedRoles={['operator', 'super_admin']}`.

  **4d. `AdminSidebar.tsx` and `OperatorSidebar.tsx` — no changes needed:**
  Both sidebars receive `userProfile` as a prop and render all their nav items unconditionally.
  There is no role-based item filtering inside them. When `super_admin` lands on `/admin` they
  see `AdminSidebar` with all admin items; if they navigate to `/ops` they see
  `OperatorSidebar` with all ops items. `Layout` currently chooses the sidebar via
  `role === 'admin' ? AdminSidebar : OperatorSidebar` — `super_admin` would fall to
  `OperatorSidebar` with this logic. Fix `Layout.tsx`:
  ```tsx
  const Sidebar = (role === 'admin' || role === 'super_admin') ? AdminSidebar : OperatorSidebar;
  ```

  Files:
  - `apps/staff-portal/src/context/AuthContext.tsx`
  - `apps/staff-portal/src/components/RoleBasedRoute.tsx`
  - `apps/staff-portal/src/App.tsx`
  - `apps/staff-portal/src/components/Layout.tsx`

  Verify: `cd apps/staff-portal && npm run build` — `tsc && vite build` exits 0. Then run
  `npm run typecheck` — exits 0 with no errors about `UserRole` type mismatches.

---

- [ ] 5. **GAP 3 — Passenger App: Delete unwired TripsScreen.tsx**

  `apps/passenger-app/screens/TripsScreen.tsx` is a full-featured component that is never
  imported in any navigator or screen. `ActivityScreen.tsx` (wired via
  `ActivityStackNavigator` → `MainTabNavigator`) serves the same purpose. Deleting
  `TripsScreen.tsx` removes dead code without affecting any functionality.

  Action: Delete the file `apps/passenger-app/screens/TripsScreen.tsx`.

  Verify: `grep -r "TripsScreen" apps/passenger-app/` returns no results in any navigator or
  App file (only zero results expected after deletion). Then run
  `cd apps/passenger-app && npx expo export --platform web --output-dir /tmp/pax-check` or
  simply confirm `npx tsc --noEmit` in the passenger-app root passes (or the equivalent build
  check available — if no tsconfig exists at root level, confirm the file is absent and no
  navigator references it). If no build tooling is available without a device, the grep
  confirmation is sufficient.

---

- [ ] 6. **GAP 1 — Driver App: TripDetailsScreen (real implementation)**

  **Data shape to use:**
  From `DriverAPI.ts`, `getTripHistory()` returns `ActiveTrip[]`:
  ```ts
  interface ActiveTrip {
    id: string;
    passengerId: string;
    passengerName: string;
    passengerPhone: string;
    pickup: GeoPoint;         // { lat, lng }
    destination: GeoPoint;
    fare: number;
    status: 'accepted' | 'arrived' | 'in-progress' | 'completed';
    startTime?: Date;
    endTime?: Date;
  }
  ```
  The screen receives `{ tripId: string }` via route params
  (`HomeStackParamList.TripDetails`). The API endpoint is `GET /api/v1/trips/:id` — which
  maps to `APIClient.get<TripDetail>('/trips/' + tripId)`. Add a
  `getTripById(tripId: string): Promise<TripDetail>` static method to `DriverAPI`.

  Because the backend shape for a single trip may include more fields than `ActiveTrip`
  (distance, duration, paymentMethod, rating, pickupAddress, destinationAddress), define a
  local `TripDetail` interface that extends `ActiveTrip` with these optional extras:
  ```ts
  interface TripDetail extends ActiveTrip {
    distance?: number;
    duration?: number;
    paymentMethod?: string;
    pickupAddress?: string;
    destinationAddress?: string;
    rating?: number;
  }
  ```

  **Screen layout** (follow `ActiveTripScreen` patterns — `ScrollView` root, card-based,
  theme colors, `useTheme`, `useTranslation`):

  1. `useRoute<RouteProp<HomeStackParamList, 'TripDetails'>>()` to get `tripId`
  2. `useNavigation<StackNavigationProp<HomeStackParamList>>()` for back nav
  3. On mount: call `DriverAPI.getTripById(tripId)`, set `loading` and `error` states
  4. Loading state: `ActivityIndicator` centered (match `TripsScreen` pattern)
  5. Error state: error message + Retry button
  6. Success state — a single `ScrollView` with:
     - **Header card:** Trip reference (`#${trip.id.slice(-6).toUpperCase()}`), date/time
       formatted as `'MMM D, YYYY · HH:mm'`, status badge (same `getStatusColor` approach as
       `TripsScreen`)
     - **Route card:** pickup address (`trip.pickupAddress || 'Pickup'`) with green circle
       icon, separator line, destination (`trip.destinationAddress || 'Destination'`) with
       red marker — exactly the layout pattern in `TripsScreen.renderTripItem`
     - **Stats card:** distance (`${trip.distance ?? '—'} km`), duration
       (`${trip.duration ?? '—'} min`), fare (`TSh ${trip.fare.toLocaleString()}`)
     - **Passenger card:** passenger name, payment method badge
     - **Rating row:** If `trip.rating`, render 1–5 stars using filled/outline star icons
       (use `⭐` emoji for simplicity since `react-native-vector-icons` is available);
       otherwise show "Not rated"
     - **Footer:** `TouchableOpacity` button "Report an Issue" styled as an outline button
       (`borderColor: theme.colors.primary`) — `onPress` opens a deep-link or `Linking.openURL`
       to `mailto:support@dalasmart.co.tz?subject=Trip Issue ${trip.id}`

  **Style:** match the card pattern in `ActiveTripScreen` (border-radius 12, elevation 3,
  `theme.colors.surface` background). Use `StyleSheet.create`.

  Files:
  - `apps/driver-app/src/screens/trip/TripDetailsScreen.tsx` (full replacement)
  - `apps/driver-app/src/services/api/DriverAPI.ts` (add `getTripById` method and
    `TripDetail` interface)

  Verify: `cd apps/driver-app && npx tsc --noEmit` (or `npx expo export --platform web
  --output-dir /tmp/driver-check`) exits 0. No TypeScript errors.

---

- [ ] 7. **GAP 2 — Driver App: VehicleInfoScreen (real implementation)**

  **Data shape:** `DriverAPI.getVehicleInfo()` calls `GET /api/v1/driver/vehicle` and returns
  `Vehicle`:
  ```ts
  interface Vehicle {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    color: string;
    type: TransportMode;   // 'car' | 'bajaji' | 'boda-boda'
  }
  ```
  The `Vehicle` type (from `src/types/shared.ts`) lacks `year`, `passengerCapacity`,
  `insuranceExpiry`, `inspectionStatus`, `registrationExpiry`, and
  `verificationStatus`. The screen must handle these gracefully — treat them as optional
  fields returned by the API but not yet in the local type. Extend `Vehicle` locally in
  the screen with a `VehicleDetails` interface:
  ```ts
  interface VehicleDetails extends Vehicle {
    year?: number;
    passengerCapacity?: number;
    insuranceExpiry?: string;   // ISO date string
    inspectionStatus?: string;
    registrationExpiry?: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }
  ```
  Use `APIClient.get<VehicleDetails>('/drivers/profile')` (note: the task spec says
  `GET /api/v1/drivers/profile`) rather than the existing `DriverAPI.getVehicleInfo()` which
  calls `/driver/vehicle`. Add a new method to `DriverAPI`:
  ```ts
  static async getDriverProfile(): Promise<VehicleDetails> {
    return APIClient.get<VehicleDetails>('/drivers/profile');
  }
  ```
  For the update call, the spec says `POST or PATCH /api/v1/drivers/vehicle/:vehicleId`. Add:
  ```ts
  static async updateVehicle(vehicleId: string, data: Partial<VehicleDetails>): Promise<void> {
    return APIClient.put<void>(`/drivers/vehicle/${vehicleId}`, data);
  }
  ```
  Use `PUT` (APIClient already has `.put`) to stay consistent.

  **Screen sections** (follow `ProfileScreen`/`ActiveTripScreen` patterns):

  1. On mount: `DriverAPI.getDriverProfile()`, loading/error states
  2. **Vehicle Info card:** plate, type, make, model, year, color, capacity — each as a row
     with label (textSecondary) + value (text bold), `theme.colors.surface` card
  3. **Documents card:** Insurance Expiry (if `insuranceExpiry`, compute days until; if < 30,
     render value in `theme.colors.warning` with `⚠️` prefix), Inspection Status
     (green/red/gray based on value), Registration Expiry (same warning logic as insurance)
  4. **Verification badge:** A centered badge showing `verificationStatus` using the
     `getStatusColor` pattern: approved → green, pending → orange, rejected → red
  5. **Edit section:** A form with `TextInput` fields for plate, type, make, model, year,
     color (pre-filled from fetched data). `useState` for each field. "Save Changes" button
     (`theme.colors.primary` background) calls `DriverAPI.updateVehicle(vehicle.id, {...})`.
     Show success alert on resolve, error alert on reject.

  **Style:** Same card/row style as `ProfileScreen` menu items. Use `ScrollView` root.
  Import `Alert` for save feedback.

  Files:
  - `apps/driver-app/src/screens/profile/VehicleInfoScreen.tsx` (full replacement)
  - `apps/driver-app/src/services/api/DriverAPI.ts` (add `getDriverProfile` and
    `updateVehicle` methods, `VehicleDetails` interface — combine with changes from Gap 1)

  Verify: `cd apps/driver-app && npx tsc --noEmit` exits 0 (combine this check with
  Gap 1's verification — run once after both screens are done).

---

## Build commands reference

| App | Build command | TypeCheck only |
|-----|---------------|----------------|
| admin-panel | `cd apps/admin-panel && npm run build` | `npm run typecheck` |
| staff-portal | `cd apps/staff-portal && npm run build` | `npm run typecheck` |
| public-website | `cd apps/public-website && npm run build` | `tsc --noEmit` |
| driver-app | `npx tsc --noEmit` (in `apps/driver-app`) | same |
| passenger-app | no build tooling at root; deletion verified by grep | — |

## Risk notes

- **GAP 1 & 2 (driver-app):** `DriverAPI.ts` is touched by both. The implementer must apply
  both sets of additions in a single edit pass to avoid merge conflicts.
- **GAP 4 (`super_admin`):** The `UserRole` type is exported and referenced in `Layout.tsx`,
  `RoleBasedRoute.tsx`, `App.tsx`, `AdminSidebar.tsx` (as interface prop type import), and
  `OperatorSidebar.tsx`. The TypeScript build will catch any missed callsite — fix any that
  appear after running `typecheck`.
- **GAP 5 (contact form):** `import.meta.env.VITE_API_URL` will be `undefined` in dev if
  `.env.local` is not set. The form submit will fail gracefully to the error state — this is
  acceptable for the implementation.
- **GAP 7 (download links):** The store URLs are placeholder IDs (`id000000001`,
  `id000000002`). They will 404 on the App Store until real apps are published, which matches
  the added disclaimer note.
