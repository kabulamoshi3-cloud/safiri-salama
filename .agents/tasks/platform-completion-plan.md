# SkyRex Platform Completion Plan

**Generated:** 2024-10-24  
**Based on:** navigation-audit-report.md + direct codebase exploration  
**Architecture mandate:** HTTP polling only (NO Socket.io) — use `setInterval + fetch`  
**Deployment:** Vercel (web apps) + Render (backend) — free tier

---

## Authentication Token Retrieval Patterns

### Passenger App (React Native / Expo)
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('@skyrex:token');
const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiri-salama.vercel.app/api/v1';
// axios: { headers: { Authorization: `Bearer ${token}` } }
```

### Driver App (React Native / Expo)
```ts
// Uses APIClient from apps/driver-app/src/services/api/client.ts
// Token key: '@skyrex:token' (same as passenger app)
// APIClient.get('/endpoint') — handles token automatically
// For raw axios: same AsyncStorage.getItem('@skyrex:token') pattern
```

### Admin Panel (React/Vite)
```ts
// Uses apps/admin-panel/src/services/api.ts
const token = localStorage.getItem('admin_token');
// Fetch wrapper: request<T>('GET', '/admin/...')
```

### Operator Dashboard (React/Vite)
```ts
// Uses apps/operator-dashboard/src/services/api.ts (axios instance)
const token = localStorage.getItem('operator_token');
// api.get('/...'), api.post('/...') — token injected by interceptor
```

---

## Navigation Structure

### Passenger App
```
RootNavigator
└── MainTabNavigator (apps/passenger-app/navigation/MainTabNavigator.tsx)
    ├── HomeTab → HomeStackNavigator (apps/passenger-app/navigation/HomeStackNavigator.tsx)
    │   ├── Home (HomeScreen)
    │   ├── RideRequest (RideRequestScreen)
    │   ├── TripActive (TripActiveScreen)
    │   ├── Rating (RatingScreen)
    │   └── Traffic (TrafficScreen)
    │   ── [ADD] TripDetail, SavedPlaces, EmergencyContacts (push onto HomeStack)
    ├── ActivityTab → ActivityScreen (directly)
    ├── PaymentsTab → PaymentsScreen (directly)
    ├── NotificationsTab → NotificationsScreen (directly)
    └── AccountTab → AccountScreen (directly)
    
NOTE: ActivityTab, PaymentsTab etc. are raw screens, not stacks.
Sub-screens from Account/Activity need to be navigated to via the HomeStack
or by wrapping those tabs in their own stacks.
DECISION: Wrap AccountTab and ActivityTab in stack navigators
to allow deep sub-screen navigation without breaking existing structure.
```

### Driver App
```
RootNavigator → MainNavigator (apps/driver-app/src/navigation/MainNavigator.tsx)
├── Home tab → HomeNavigator (stack)
│   ├── HomeMain, ActiveTrip, TripDetails, Navigation, RatePassenger
│   └── [ADD] DocumentUpload, VerificationStatus (new screens to HomeStack/ProfileStack)
└── Account tab → ProfileNavigator (stack)
    ├── ProfileMain, VehicleInfo, Settings
    └── [ADD] DocumentUpload, VerificationStatus here
```

### Admin Panel
```
App.tsx → react-router-dom
/drivers → Drivers.tsx (has Modal component already)
[ADD] DriverVerificationModal as component in src/components/
```

### Operator Dashboard
```
App.tsx → react-router-dom
/support-queue → SupportQueue.tsx (uses mockTickets — needs real API)
/incidents → Incidents.tsx (uses mockIncidents — needs real API)
/live-map → LiveMap.tsx (uses mockDrivers — needs real API)
/demand-supply → DemandSupply.tsx (uses hardcoded zones — needs real API)
```

---

## Confirmed Dependencies

| App | Key Available Deps | Missing (needs install) |
|-----|--------------------|------------------------|
| passenger-app | expo, @react-navigation/native-stack, @react-navigation/bottom-tabs, axios, @react-native-async-storage/async-storage, expo-location, @expo/vector-icons | `expo-image-picker` (for document upload) |
| driver-app | same as passenger + react-native-vector-icons, react-i18next | `expo-image-picker` |
| admin-panel | react-router-dom, react-i18next | **recharts, axios, lucide-react, leaflet, react-leaflet** (in code but NOT in package.json!) |
| operator-dashboard | axios, recharts, lucide-react, leaflet, react-leaflet, tailwindcss, zustand | None missing |

**CRITICAL:** Admin panel's `package.json` has only `react`, `react-dom`, `react-i18next`, `i18next`, and `react-router-dom` as dependencies. Yet `Finance.tsx`, `Drivers.tsx` etc. use none of the missing packages. The missing packages need to be added to `apps/admin-panel/package.json` before implementing charts/maps.

---

## Backend Endpoint Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/trips/:id` | ✅ Exists | Returns full trip with driver/vehicle details + state log |
| `GET /api/v1/trips` | ✅ Exists | Passenger/driver trip list with filters |
| `POST /api/v1/upload/document` | ✅ Exists | Saves to `driver_documents` table |
| `GET /api/v1/upload/documents` | ✅ Exists | Returns all docs for current user |
| `PATCH /api/v1/upload/documents/:docId/review` | ✅ Exists | Admin approve/reject doc |
| `GET /api/v1/upload/config` | ✅ Exists | Cloudinary config for client-side upload |
| `GET /api/v1/payments/info` | ✅ Exists | User's payment info (auto-detect from phone) |
| `POST /api/v1/payments/pay` | ✅ Exists | Initiate STK push / cash payment |
| `GET /api/v1/payments/history` | ✅ Exists | Transaction history with pagination |
| `GET /api/v1/payments/receipt/:reference` | ✅ Exists | Receipt data |
| `GET /api/v1/admin/drivers` | ✅ Exists | Driver list with verification status |
| `PUT /api/v1/admin/drivers/:id/approve` | ✅ Exists | Approve driver |
| `PUT /api/v1/admin/drivers/:id/reject` | ✅ Exists | Reject driver |
| `GET /api/v1/admin/stats` | ✅ Exists | Dashboard KPIs |
| `GET /api/v1/support` | ✅ Exists (support.ts 12.6KB) | Support tickets |
| `GET /api/v1/notifications` | ✅ Exists | Notifications list |
| **MISSING: `GET /api/v1/payments/methods`** | ❌ | List user's saved payment methods |
| **MISSING: `POST /api/v1/payments/methods`** | ❌ | Add/set active payment method |
| **MISSING: `DELETE /api/v1/payments/methods/:id`** | ❌ | Remove payment method |
| **MISSING: `GET /api/v1/admin/audit-logs`** | ❌ | `audit_log` table exists but no route |
| **MISSING: `GET /api/v1/admin/drivers/:id/documents`** | ❌ | Admin view driver docs |
| **MISSING: `GET /api/v1/admin/finance/transactions`** | ❌ | Finance page data |
| **MISSING: `GET /api/v1/admin/analytics`** | ❌ | Analytics aggregated data |

**DB Note:** `driver_documents` table is referenced in `upload.ts` but does NOT exist in `001_initial_schema.sql`. A migration is required.

**DB Note:** `audit_log` table EXISTS in the schema (lines 441-468) with immutable triggers. Only the API route is missing.

---

## PHASE 1 — MVP Blockers

### Item 1: Driver Document Upload Screens

**What's missing:** Two screens in the driver app — `DocumentUploadScreen` and `VerificationStatusScreen`. The upload backend exists (`/api/v1/upload/document`, `/api/v1/upload/config`). The `driver_documents` DB table is referenced in `upload.ts` but not in the migration — needs to be created.

**Files to create:**
- `apps/driver-app/src/screens/onboarding/DocumentUploadScreen.tsx`
- `apps/driver-app/src/screens/onboarding/VerificationStatusScreen.tsx`

**Files to modify:**
- `apps/driver-app/src/navigation/MainNavigator.tsx` — add `DocumentUpload` and `VerificationStatus` to `ProfileStackParamList` and `ProfileNavigator`
- `apps/driver-app/src/screens/main/ProfileScreen.tsx` — wire "Required Documents" menu item to `navigation.navigate('DocumentUpload')`, "Verification Status" to `navigation.navigate('VerificationStatus')`
- `infrastructure/database/postgres/migrations/002_driver_documents.sql` — CREATE TABLE driver_documents

**DB migration (002_driver_documents.sql):**
```sql
CREATE TABLE IF NOT EXISTS driver_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type   VARCHAR(50) NOT NULL CHECK (document_type IN ('drivers_license','vehicle_insurance','vehicle_registration','national_id','selfie')),
  image_url       TEXT NOT NULL,
  document_number VARCHAR(100),
  expiry_date     DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_driver_documents_user ON driver_documents(user_id);
CREATE INDEX idx_driver_documents_status ON driver_documents(status);
```

**DocumentUploadScreen implementation notes:**
- Install `expo-image-picker` in `apps/driver-app/` (`expo install expo-image-picker`)
- Upload flow: (1) `GET /api/v1/upload/config` → get Cloudinary config, (2) use `ImagePicker.launchImageLibraryAsync()`, (3) POST directly to Cloudinary upload URL, (4) send returned `secure_url` to `POST /api/v1/upload/document` with `{ documentType, imageUrl, documentNumber, expiryDate }`
- Required doc types: `drivers_license`, `vehicle_registration`, `vehicle_insurance`, `national_id`, `selfie`
- Show per-doc status: pending/approved/rejected with color indicator
- Pre-populate from `GET /api/v1/upload/documents` on mount

**VerificationStatusScreen implementation notes:**
- Fetch `GET /api/v1/upload/documents` for doc list
- Show overall verification_status from `GET /api/v1/drivers/me` (or from AuthContext user)
- Show timeline: Uploaded → Under Review → Approved/Rejected per document
- If rejected: show rejection_reason + "Re-upload" button back to DocumentUploadScreen

**Navigation wiring in MainNavigator.tsx:**
```ts
// Add to ProfileStackParamList
DocumentUpload: undefined;
VerificationStatus: undefined;
// Add to ProfileNavigator
<ProfileStack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ title: 'Upload Documents' }} />
<ProfileStack.Screen name="VerificationStatus" component={VerificationStatusScreen} options={{ title: 'Verification Status' }} />
```

**Verify:** `cd apps/driver-app && npx expo export --platform web 2>&1 | tail -5` (type check only since E2E is unavailable)

---

### Item 2: Admin Driver Verification Modal (Document Viewer)

**What's missing:** The existing `Drivers.tsx` modal shows text details only. Admins need to view uploaded document images before approving/rejecting.

**Backend endpoint needed:** `GET /api/v1/admin/drivers/:driverId/documents` — add to `services/api-gateway/src/routes/admin.ts`

**Files to create:**
- `apps/admin-panel/src/components/DriverVerificationModal.tsx`

**Files to modify:**
- `services/api-gateway/src/routes/admin.ts` — add `GET /admin/drivers/:id/documents` endpoint
- `apps/admin-panel/src/services/api.ts` — add `getDriverDocuments(driverId)` function
- `apps/admin-panel/src/pages/Drivers.tsx` — replace `DriverDetail` inline component with `DriverVerificationModal`

**Admin endpoint to add (admin.ts):**
```ts
router.get('/drivers/:id/documents', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT d.*, u.name as driver_name FROM driver_documents d
     JOIN users u ON d.user_id = u.id
     WHERE d.user_id = (SELECT user_id FROM drivers WHERE id = $1)
     ORDER BY d.uploaded_at DESC`,
    [id]
  );
  res.json({ documents: result.rows });
});
```

**DriverVerificationModal notes:**
- Tabs: "Details" (existing text table) | "Documents" (image grid)
- Documents tab: grid of doc cards, each showing doc_type label + `<img src={imageUrl} />` + status badge
- Below each image: approve/reject buttons per document (calls `PATCH /api/v1/upload/documents/:docId/review`)
- Overall approve/reject buttons remain at bottom for bulk driver status update
- The modal already uses the existing `Modal` component from `apps/admin-panel/src/components/Modal.tsx`

**Admin panel dependency note:** `apps/admin-panel/package.json` is MISSING `axios` and other deps used in code. Add to package.json dependencies: `"axios": "^1.7.7"`. The current api.ts uses native `fetch` so axios is not strictly needed yet, but recharts is needed for Phase 2.

**Verify:** `cd apps/admin-panel && npm run build 2>&1 | tail -10`

---

### Item 3: Connect PaymentsScreen to Real Backend

**What's missing:** PaymentsScreen uses hardcoded mock data for both payment methods and transactions.

**Backend available:** `GET /api/v1/payments/info`, `GET /api/v1/payments/history`  
**Backend missing:** Payment methods CRUD (see Item 5)

**Decision:** For this item, connect `GET /api/v1/payments/info` (returns user's registered phone = their payment method) and `GET /api/v1/payments/history` (transaction list). The "add payment method" flow requires Item 5 first. Wire it using the existing pattern: `setInterval` polling for fresh transaction data.

**Files to modify:**
- `apps/passenger-app/screens/PaymentsScreen.tsx`

**Implementation notes:**
- On mount: `GET /api/v1/payments/info` → derive available payment method from user's phone (the backend uses `detectProvider()` to identify mpesa/tigo/airtel from the 255XXXXXXXXX number)
- `GET /api/v1/payments/history?limit=20` → populate `recentTransactions`
- Add `useEffect` polling every 30 seconds for transaction updates (setInterval pattern)
- Add loading state + empty state
- Make transaction cards tappable → show a detail modal (inline, no new screen needed yet)
- Transaction detail modal: show reference, amount, method, status, trip route, timestamp

**Verify:** `cd apps/passenger-app && npx expo export --platform web 2>&1 | tail -5`

---

### Item 4: TripDetailScreen for Passenger + ActivityScreen Tap Handler

**What's missing:** `TripDetailScreen.tsx` doesn't exist; tapping a trip card in `ActivityScreen` does nothing (`<TouchableOpacity key={trip.id} style={styles.tripCard}>` has no `onPress`).

**Backend available:** `GET /api/v1/trips/:id` (returns full trip with driver details, pickup/dropoff locations, state_log)

**Files to create:**
- `apps/passenger-app/screens/TripDetailScreen.tsx`

**Files to modify:**
- `apps/passenger-app/navigation/HomeStackNavigator.tsx` — add `TripDetail` route
- `apps/passenger-app/navigation/MainTabNavigator.tsx` — wrap `ActivityTab` in an `ActivityStackNavigator` (new) so it can push `TripDetail`
- `apps/passenger-app/screens/ActivityScreen.tsx` — add `onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}` to each trip card

**Navigation change — ActivityStackNavigator:**
```ts
// New file: apps/passenger-app/navigation/ActivityStackNavigator.tsx
const Stack = createNativeStackNavigator();
export default function ActivityStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActivityList" component={ActivityScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ headerShown: true, title: 'Trip Details' }} />
    </Stack.Navigator>
  );
}
// In MainTabNavigator.tsx: replace ActivityScreen with ActivityStackNavigator
```

**TripDetailScreen implementation notes:**
- Props: `{ route: { params: { tripId: string } } }`
- Fetch `GET /api/v1/trips/:id` on mount
- Display: pickup → destination route summary, driver details (name, vehicle, plate, rating), fare breakdown, date/time, status badge, payment method used
- Show state log timeline (Requested → Accepted → In Progress → Completed)
- "Report a problem" button → opens `SupportScreen` or a simple modal that calls `POST /api/v1/support` (if time permits)
- No map needed (static info display is sufficient for MVP)

**Verify:** `cd apps/passenger-app && npx expo export --platform web 2>&1 | tail -5`

---

### Item 5: Missing Backend Endpoints

**What to add to `services/api-gateway/src/routes/`:**

#### 5a. Payment Methods CRUD — add to `payments.ts`

The payments service already has `GET /payments/info` which reads user phone and infers provider. Payment "methods" in this platform = registered phone numbers for mobile money. Add:

```ts
// GET /api/v1/payments/methods — list user's saved payment methods
// Returns: [{ id, provider, phone_display, is_default }]
// Source: read from transactions table (distinct providers used by user) 
// + user's registration phone as default

// POST /api/v1/payments/methods — set active/default payment method  
// Body: { provider: 'mpesa'|'tigo_pesa'|'airtel_money'|'cash', phone?: string }
// Stores in user profile (new column or existing wallets table)

// DELETE /api/v1/payments/methods/:provider — remove a saved method
```

**Files to modify:**
- `services/api-gateway/src/routes/payments.ts` — add 3 routes above to `paymentsRouter`
- `services/api-gateway/src/routes/index.ts` — already registered at `/v1/payments`

#### 5b. Admin Audit Logs Route — add to `admin.ts`

The `audit_log` table already exists (schema line 441). Add:
```ts
// GET /api/v1/admin/audit-logs?limit=50&offset=0&admin_id=...&from=...&to=...
router.get('/audit-logs', async (req, res) => {
  const { limit=50, offset=0, admin_id, from, to } = req.query;
  // SELECT * FROM audit_log WHERE ... ORDER BY timestamp DESC LIMIT $1 OFFSET $2
});
```

**Files to modify:**
- `services/api-gateway/src/routes/admin.ts`

#### 5c. Admin Finance Transactions — add to `admin.ts`
```ts
// GET /api/v1/admin/finance?limit=50&offset=0&status=...&from=...&to=...
// SELECT t.*, u.name as passenger_name FROM transactions t
// JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC
```

#### 5d. Admin Analytics Aggregates — add to `admin.ts`
```ts
// GET /api/v1/admin/analytics?period=7d|30d|90d
// Returns: { revenue_by_day: [{date, amount}], trips_by_day: [...], 
//            top_drivers: [...], cancellation_rate, vehicle_type_breakdown }
```

**Verify:** `cd services/api-gateway && npm run build 2>&1 | tail -10` (or `npx tsc --noEmit`)

---

## PHASE 2 — Polish

### Item 6: SavedPlacesScreen for Passenger App

**What's missing:** The "Saved places" menu item in `AccountScreen` navigates to `Settings` (wrong). `passenger_profiles.saved_places` exists as JSONB in the DB schema.

**Backend available:** Part of passenger profile. Check `GET /api/v1/drivers` — need a passenger equivalent. Use `PATCH /api/v1/auth/profile` or create a dedicated endpoint.

**Decision:** Add `GET /api/v1/passengers/places` and `POST/DELETE /api/v1/passengers/places` to `drivers.ts` (which already has passenger-adjacent routes) or create a minimal endpoint in `auth.ts`.

**Files to create:**
- `apps/passenger-app/screens/SavedPlacesScreen.tsx`
- `apps/passenger-app/navigation/AccountStackNavigator.tsx` (wrap AccountTab in stack)

**Files to modify:**
- `apps/passenger-app/navigation/MainTabNavigator.tsx` — replace AccountScreen with AccountStackNavigator
- `apps/passenger-app/screens/AccountScreen.tsx` — update "Saved places" menu item: `screen: 'SavedPlaces'`
- `services/api-gateway/src/routes/drivers.ts` — add `GET/POST/DELETE /passengers/places` routes

**SavedPlacesScreen notes:**
- List existing saved places (label, address, coordinates) from backend
- Add new place: text fields for label + address (no map picker needed for MVP)
- Swipe-to-delete or delete button per item
- Types: home, work, favorite (with appropriate icons)

**Verify:** `cd apps/passenger-app && npx expo export --platform web 2>&1 | tail -5`

---

### Item 7: EmergencyContactsScreen for Passenger App

**What's missing:** "Safety" menu item in AccountScreen navigates to Settings. `passenger_profiles.emergency_contacts` is a JSONB array field in the DB.

**Files to create:**
- `apps/passenger-app/screens/EmergencyContactsScreen.tsx`

**Files to modify:**
- `apps/passenger-app/screens/AccountScreen.tsx` — update "Safety" menu item to navigate to `EmergencyContacts`
- `apps/passenger-app/navigation/AccountStackNavigator.tsx` — add `EmergencyContacts` route
- `services/api-gateway/src/routes/drivers.ts` or `auth.ts` — add `GET/PATCH /passengers/emergency-contacts`

**EmergencyContactsScreen notes:**
- List up to 3 contacts: name + phone number
- Add/edit/remove contacts
- "SOS" button triggers `POST /api/v1/support` with type='safety' or calls stored contact
- Backed by `PATCH passenger_profiles SET emergency_contacts = $1`

**Verify:** `cd apps/passenger-app && npx expo export --platform web 2>&1 | tail -5`

---

### Item 8: Notification Deep Linking

**What's missing:** Both apps have NotificationsScreen but tapping a notification does nothing.

**Files to modify:**
- `apps/passenger-app/screens/NotificationsScreen.tsx` — add `onPress` that reads `notification.type` + `notification.related_id` and navigates:
  - `trip_update` → `navigation.navigate('ActivityTab')` then push `TripDetail`
  - `payment` → `navigation.navigate('PaymentsTab')`
  - others → no-op (already marks as read)
- `apps/driver-app/src/screens/main/NotificationsScreen.tsx` — same pattern:
  - `trip_request` / `trip_update` → `navigation.navigate('Home')`
  - `earnings` → `navigation.navigate('Earnings')`

**No new screens needed.** Navigation props are accessible via `useNavigation()`.

**Verify:** TypeScript compilation: `npx expo export --platform web` in each app

---

### Item 9: Analytics Charts in Admin Panel

**What's already done:** `Analytics.tsx` has placeholder divs for 4 charts.  
**What's missing:** Recharts is NOT in admin panel's `package.json` (only in operator-dashboard's).

**Files to modify:**
- `apps/admin-panel/package.json` — add `"recharts": "^2.12.7"`, `"axios": "^1.7.7"`, `"lucide-react": "^0.447.0"` to `dependencies`
- `apps/admin-panel/src/pages/Analytics.tsx` — replace placeholder divs with real charts
- `apps/admin-panel/src/services/api.ts` — add `getAnalytics(period)` function

**Analytics.tsx charts (using Recharts):**
1. Revenue Trends — `<LineChart>` using `GET /api/v1/admin/analytics?period=30d` → `revenue_by_day`
2. Trips Over Time — `<BarChart>` using `trips_by_day`
3. Driver Performance — `<BarChart>` top 10 drivers by trips
4. Vehicle Type Breakdown — `<PieChart>` using `vehicle_type_breakdown`

Pattern to follow: operator-dashboard's `Dashboard.tsx` already uses Recharts identically — copy the LineChart/BarChart pattern from there.

**Verify:** `cd apps/admin-panel && npm install && npm run build 2>&1 | tail -10`

---

### Item 10: Audit Logs Admin UI Page

**What exists:** `audit_log` table in DB, admin GET endpoint added in Item 5b, `Settings.tsx` is a placeholder.

**Files to create:**
- `apps/admin-panel/src/pages/AuditLogs.tsx`

**Files to modify:**
- `apps/admin-panel/src/App.tsx` — add route `/audit-logs` → `<AuditLogs />`
- `apps/admin-panel/src/components/Layout.tsx` — add nav item "Audit Logs" under Settings group
- `apps/admin-panel/src/services/api.ts` — add `getAuditLogs(params)` function

**AuditLogs.tsx notes:**
- Table: timestamp, admin_id (show name), action, affected_account_id (show name), reason
- Filter by date range (from/to inputs)
- Filter by admin_id (dropdown)
- Pagination (50 per page)
- No edit/delete (immutable by DB trigger)

**Verify:** `cd apps/admin-panel && npm run build 2>&1 | tail -10`

---

### Item 11: Support Ticket Functionality

**Admin panel — Support.tsx needs real data:**
- Currently shows empty table header, no API call
- Add: `GET /api/v1/support` → populate table with real tickets
- Add ticket detail modal: view full message, update status, assign to staff

**Files to modify:**
- `apps/admin-panel/src/pages/Support.tsx` — replace static table with real data using `request<>('GET', '/support')`
- `apps/admin-panel/src/services/api.ts` — add `getSupportTickets()`, `updateTicketStatus(id, status)`

**Operator Dashboard — SupportQueue.tsx needs real data:**
- Currently shows `mockTickets` hardcoded array
- Replace with `api.get('/support?assignedToOperator=true')`
- Add "Open" button tap handler → inline modal with ticket details + status update

**Files to modify:**
- `apps/operator-dashboard/src/pages/SupportQueue.tsx` — replace mockTickets with API call using `useEffect` + polling every 30s

**No new backend endpoints needed** — `support.ts` already has GET/PATCH routes.

**Verify:** 
- `cd apps/admin-panel && npm run build 2>&1 | tail -10`
- `cd apps/operator-dashboard && npm run build 2>&1 | tail -10`

---

### Item 12: Driver Payout Management Tab in Finance.tsx

**What's missing:** `Finance.tsx` shows hardcoded summary cards and empty transaction placeholder.

**Backend available:** `GET /api/v1/payments/history` (with admin scope), `GET /api/v1/admin/finance` (added in Item 5c), `GET /api/v1/earnings` (driver earnings)

**Files to modify:**
- `apps/admin-panel/src/pages/Finance.tsx` — full rewrite:
  1. Summary cards: fetch from `GET /api/v1/admin/stats` (revenue_today) + additional calculated fields
  2. Transactions tab: paginated table from `GET /api/v1/admin/finance`
  3. Driver Payouts tab: list from `GET /api/v1/earnings` scoped to all drivers
- `apps/admin-panel/src/services/api.ts` — add `getFinanceTransactions()`, `getDriverEarnings()`

**Verify:** `cd apps/admin-panel && npm run build 2>&1 | tail -10`

---

## PHASE 3 — Nice to Have

### Item 13: usePolling Hook + Wire into Operator Dashboard

**What exists:** Operator dashboard pages (`LiveMap`, `Dashboard`, `SupportQueue`, `Incidents`, `DemandSupply`) all use mock/hardcoded data. `Dashboard.tsx` already uses Recharts + real API calls (partially). The polling pattern is ad-hoc (some use `setInterval` inline).

**Decision:** Create a shared `usePolling` hook. This is the correct HTTP-polling replacement for Socket.io's real-time updates.

**Files to create:**
- `apps/operator-dashboard/src/hooks/usePolling.ts`

```ts
// usePolling<T>(fetchFn: () => Promise<T>, intervalMs: number, deps: any[]): { data: T | null, error: Error | null, loading: boolean }
// Uses useEffect + setInterval + cleanup
// Fetches immediately on mount, then every intervalMs
```

**Files to modify:**
- `apps/operator-dashboard/src/pages/LiveMap.tsx` — replace mockDrivers with `usePolling(() => api.get('/tracking/nearby-drivers?lat=-6.7924&lng=39.2083&radius=20'), 10000)`
- `apps/operator-dashboard/src/pages/Dashboard.tsx` — already polls; refactor to use hook
- `apps/operator-dashboard/src/pages/SupportQueue.tsx` — replace mockTickets with usePolling 30s
- `apps/operator-dashboard/src/pages/Incidents.tsx` — replace mockIncidents with usePolling 30s
- `apps/operator-dashboard/src/pages/DemandSupply.tsx` — replace hardcoded zones with usePolling 60s from `GET /api/v1/admin/stats` (or dedicated endpoint)

**Also apply the same pattern to admin panel Dashboard.tsx** for consistency.

**Verify:** `cd apps/operator-dashboard && npm run build 2>&1 | tail -10`

---

### Item 14: Incident Case Management (Operator Dashboard)

**What exists:** `Incidents.tsx` renders a list from `mockIncidents`. The `incident_reports` table exists in DB. No admin route for incidents exists yet.

**Files to create:**
- Inline `IncidentDetailModal` inside `Incidents.tsx` (no separate file needed)

**Files to modify:**
- `services/api-gateway/src/routes/admin.ts` — add `GET /admin/incidents`, `PATCH /admin/incidents/:id` (status update + assignee + notes)
- `apps/operator-dashboard/src/pages/Incidents.tsx` — replace mock data with API call + add "Open" button → modal with: incident details, status change dropdown, notes textarea, linked trip info

**Verify:** `cd apps/operator-dashboard && npm run build 2>&1 | tail -10`

---

### Item 15: Demand & Supply Chart (Operator Dashboard)

**What exists:** `DemandSupply.tsx` shows a hardcoded zone bar-chart (visual progress bars, not Recharts). Recharts is available in operator-dashboard.

**Files to modify:**
- `apps/operator-dashboard/src/pages/DemandSupply.tsx` — add a proper `<BarChart>` from Recharts showing demand vs supply by zone + a `<LineChart>` for demand by hour of day (use mock time-series data if backend doesn't have it yet, but hook up to API when available)

**Backend needed:** `GET /api/v1/admin/analytics` (added in Item 5d) should include `demand_by_zone` and `demand_by_hour`.

**Verify:** `cd apps/operator-dashboard && npm run build 2>&1 | tail -10`

---

## Implementation Order Summary

```
PHASE 1 (implement first — sequential dependencies):
1. DB migration 002_driver_documents.sql (required by items 1 and 2)
2. Item 5 backend endpoints (required by items 3, 4, 9, 10, 12)
3. Item 1: Driver document upload screens
4. Item 2: Admin driver verification modal
5. Item 3: PaymentsScreen → real backend
6. Item 4: TripDetailScreen + ActivityScreen navigation

PHASE 2 (after Phase 1):
7. Item 9: Admin panel package.json + Analytics charts (install deps first)
8. Item 10: Audit logs UI
9. Item 12: Finance.tsx rewrite
10. Item 11: Support ticket wiring
11. Items 6 & 7: SavedPlaces + EmergencyContacts
12. Item 8: Notification deep linking

PHASE 3 (last):
13. Item 13: usePolling hook + operator dashboard live data
14. Item 14: Incident case management
15. Item 15: Demand & Supply chart
```

---

## Items Already Complete (Skip)

- ✅ Driver app: Home, Earnings, Activity/Trips screens — fully implemented
- ✅ Driver app: ActiveTrip, Navigation, RatePassenger screens — complete
- ✅ Passenger app: HomeScreen, RideRequestScreen, TripActiveScreen — complete
- ✅ Passenger app: ActivityScreen data fetching — complete (only missing tap handler)
- ✅ Passenger app: NotificationsScreen — complete (only missing deep link)
- ✅ Admin panel: Drivers.tsx (approve/reject working), Dashboard.tsx, Passengers.tsx, Trips.tsx — complete
- ✅ Operator dashboard: Dashboard.tsx with Recharts charts — complete
- ✅ Operator dashboard: LiveMap.tsx Leaflet integration — complete (only needs real data)
- ✅ Backend: trips, auth, upload, payments, support, admin routes — comprehensive
- ✅ DB schema: audit_log, incident_reports, transactions, driver_profiles — complete
