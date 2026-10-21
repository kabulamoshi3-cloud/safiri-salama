# Implementation Plan — DalaSmart Admin Panel (build4)

## Codebase Findings Summary

**Admin Panel:** React 18 + TypeScript + Vite + React Router v6 + react-i18next. No UI library (no MUI, no Tailwind, no Chakra). All styling must be plain CSS or inline styles. Only packages in `package.json` may be used. No `index.html`, no `src/main.tsx`, no `src/App.tsx` yet — only `src/services/AdminAPI.ts` exists (has a broken import pointing to a non-existent passenger-app API client).

**API Gateway:** Express 4 + TypeScript. Auth sets `req.user.type` (values: `passenger|driver|operator|admin|support_agent`) and `req.user.id`. Role check: compare `req.user.type === 'admin'`. The `requireRole` in `middleware/auth.ts` takes plain strings. No existing `/admin` route file — it must be created and registered in `src/routes/index.ts`. Migration files go up to `011_payments.sql`; next is `014_admin_settings.sql` (as specified; gap from 011→014 is fine, other migrations 012/013 may exist elsewhere).

**Database schema key columns:**
- `users`: `id`, `name`, `phone`, `status`, `user_type`, `created_at`, `last_login`
- `drivers`: `id`, `user_id`, `status` (offline/available/on-trip/break), `rating`, `total_trips`, `verification_status` (added in migration 014 if absent)
- `vehicles`: `driver_id`, `plate_number`, `make`, `model`, `vehicle_type`
- `passengers`: `id`, `user_id`, `name`, `phone`, `total_trips`, `created_at`
- `trips`: `id`, `passenger_id`, `driver_id`, `pickup_location`, `dropoff_location`, `status`, `fare`, `created_at`, `completed_at`

**JWT shape:** `{ userId, userType }` signed in `src/routes/auth.ts`; middleware sets `req.user = decoded`, so use `req.user.userType` (not `req.user.type`) in the admin route.

**Routing:** React Router v6 (`react-router-dom` 6.26.1). Use `createBrowserRouter` + `RouterProvider` pattern (v6 data router) with nested layout route.

**State / data fetching:** No React Query or SWR in package.json. Use `useState` + `useEffect` + native `fetch` with `Authorization: Bearer {token}` header. Token stored in `localStorage`.

**i18n:** `react-i18next` + `i18next` already installed. Provide `en`/`sw` translations for all UI labels. Initialize i18n once in `src/i18n.ts`.

---

## Order of Operations

- [ ] 1. Create the SQL migration for `system_settings` and add `verification_status` to `drivers`.
      Files:
      - `services/api-gateway/migrations/014_admin_settings.sql`
      Verify: `cat services/api-gateway/migrations/014_admin_settings.sql` shows the CREATE TABLE and INSERT statements from the spec, plus `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'`.

- [ ] 2. Create the backend admin route file with all 11 endpoints, each guarded by `req.user?.userType !== 'admin'` returning 403.
      The file must import `pool` from `'../database/connection'` (matching the pattern used by `drivers.ts`, `trips.ts`, `auth.ts`). Implement:
      - `GET  /admin/stats` — counts from users/drivers/passengers/trips; revenue from trips.fare where status='completed' and DATE(created_at)=CURRENT_DATE
      - `GET  /admin/drivers` — join drivers+users+vehicles, filter by `?approval_status=`, `?online=`
      - `PUT  /admin/drivers/:id/approve` — UPDATE drivers SET verification_status='approved'
      - `PUT  /admin/drivers/:id/reject` — UPDATE drivers SET verification_status='rejected'
      - `PUT  /admin/drivers/:id/ban` — UPDATE users SET status='banned' WHERE id=(SELECT user_id FROM drivers WHERE id=$1)
      - `GET  /admin/passengers` — join passengers+users, include active_trips count
      - `PUT  /admin/passengers/:id/ban` — UPDATE users SET status='banned' WHERE id=(SELECT user_id FROM passengers WHERE id=$1)
      - `GET  /admin/trips` — filter by `?status=`, `?from=`, `?to=`, `?limit=`, `?offset=`
      - `PUT  /admin/trips/:id/cancel` — UPDATE trips SET status='cancelled' WHERE id=$1
      - `GET  /admin/settings` — SELECT key, value FROM system_settings ORDER BY key
      - `POST /admin/settings` — body `{ key, value }` → INSERT ... ON CONFLICT (key) DO UPDATE SET value=$2
      Files:
      - `services/api-gateway/src/routes/admin.ts` (create new)
      Verify: `cd services/api-gateway && npm run typecheck` — 0 TypeScript errors.

- [ ] 3. Register the admin route in the route index.
      Add `safeUse('/v1/admin', () => require('./admin'));` to `src/routes/index.ts`.
      Files:
      - `services/api-gateway/src/routes/index.ts` (modify)
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors; `npm run build` succeeds.

- [ ] 4. Scaffold the admin panel Vite app: `index.html`, `src/main.tsx`, `src/App.tsx`, and global CSS.
      - `index.html`: minimal Vite entry pointing to `/src/main.tsx`.
      - `src/main.tsx`: renders `<App />` inside `StrictMode`, initialises i18n.
      - `src/App.tsx`: sets up `createBrowserRouter` with a root layout route (`/` → `<Layout />`), child routes: `''` (Dashboard), `drivers`, `passengers`, `trips`, `settings`, and a catch-all redirecting to `/`.
      - `src/index.css`: CSS reset + CSS custom properties for the dark sidebar theme (bg `#1a1f2e`, accent `#f97316` orange) and content area (bg `#f8fafc`).
      Files:
      - `apps/admin-panel/index.html` (create)
      - `apps/admin-panel/src/main.tsx` (create)
      - `apps/admin-panel/src/App.tsx` (create)
      - `apps/admin-panel/src/index.css` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 TypeScript errors.

- [ ] 5. Create the i18n module with English and Swahili translations covering all UI strings.
      Export a pre-configured `i18next` instance. Translations must cover: nav labels (Dashboard/Dashibodi, Drivers/Madereva, Passengers/Abiria, Trips/Safari, Settings/Mipangilio), table headers, action button labels (Approve/Idhinisha, Reject/Kataa, Ban/Zuia, View/Tazama, Unban/Ondoa Zuio, Cancel/Futa), status labels, and form labels for settings.
      Files:
      - `apps/admin-panel/src/i18n.ts` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 6. Create the API client and auth context.
      - `src/services/api.ts`: Replace the broken `AdminAPI.ts` import. Implement a `request(method, path, body?)` function that reads the token from `localStorage.getItem('admin_token')` and attaches `Authorization: Bearer` header. Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'`. Export typed functions: `getStats()`, `getDrivers(filters)`, `approveDriver(id)`, `rejectDriver(id)`, `banDriver(id)`, `getPassengers()`, `banPassenger(id)`, `unbanPassenger(id)`, `getTrips(filters)`, `cancelTrip(id)`, `getSettings()`, `saveSettings(key, value)`.
      - `src/context/AuthContext.tsx`: React context holding `token: string | null` and `logout()`. On mount, reads from localStorage. Provides `isAuthenticated` boolean.
      - `src/pages/Login.tsx`: Simple login form (phone + password) that POSTs to `/api/v1/auth/login`, checks `user.userType === 'admin'`, stores token, redirects to `/`.
      Files:
      - `apps/admin-panel/src/services/api.ts` (create)
      - `apps/admin-panel/src/services/AdminAPI.ts` (replace — remove broken import, re-export from api.ts)
      - `apps/admin-panel/src/context/AuthContext.tsx` (create)
      - `apps/admin-panel/src/pages/Login.tsx` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 7. Create the shared Layout component (dark sidebar + top bar).
      - `src/components/Layout.tsx`: renders the dark sidebar with DalaSmart logo text, nav links (using `NavLink` from react-router-dom for active state highlighting), and an `<Outlet />` for the page content. Top bar shows current page title and a Logout button. The sidebar collapses the active link with the orange accent.
      - `src/components/StatusBadge.tsx`: renders a pill badge — green for `active`/`approved`/`online`/`available`, orange for `pending`, red for `banned`/`cancelled`/`rejected`, gray for `offline`/`inactive`.
      - `src/components/Table.tsx`: generic typed `<Table<T>>` component accepting `columns: { key, label, render? }[]` and `rows: T[]`, renders a styled `<table>`.
      - `src/components/Modal.tsx`: simple overlay modal with close button, accepts `title` + `children`.
      Files:
      - `apps/admin-panel/src/components/Layout.tsx` (create)
      - `apps/admin-panel/src/components/StatusBadge.tsx` (create)
      - `apps/admin-panel/src/components/Table.tsx` (create)
      - `apps/admin-panel/src/components/Modal.tsx` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 8. Build the Dashboard page (`/`).
      Fetches `GET /admin/stats` on mount. Renders four stat cards (Total Trips Today, Active Trips Now, Online Drivers, Revenue Today TZS) and a table of the 10 most recent trips fetched from `GET /admin/trips?limit=10&sort=created_at:desc`. Each card uses a CSS grid layout. A "View Pending Approvals" quick-action link navigates to `/drivers?approval_status=pending`.
      Files:
      - `apps/admin-panel/src/pages/Dashboard.tsx` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 9. Build the Drivers Management page (`/drivers`).
      - Table: Name, Phone, Vehicle Plate, Status badge, Approval Status badge, Total Trips, Rating.
      - URL query param filters: `?approval_status=` and `?online=` (read via `useSearchParams`, kept in sync).
      - Action buttons per row: Approve (if pending), Reject (if pending), Ban (if not already banned), View.
      - "View" opens a `<Modal>` showing full driver profile: license info, vehicle details, trip history count, rating.
      - All mutations call the api functions, then refetch the driver list.
      Files:
      - `apps/admin-panel/src/pages/Drivers.tsx` (create)
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 10. Build the Passengers Management page (`/passengers`).
       Table: Name, Phone, Join Date, Total Trips, Active Trips, Status badge.
       Actions: View (opens modal with profile), Ban (if active), Unban (if banned).
       Files:
       - `apps/admin-panel/src/pages/Passengers.tsx` (create)
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 11. Build the Trips Management page (`/trips`).
       Table: Trip ID (first 8 chars), Passenger, Driver, Pickup, Destination, Status badge, Fare (TZS), Date.
       Filters: status dropdown + date-from/to date inputs (native `<input type="date">`).
       Click a row → modal showing status timeline (created_at, accepted_at, completed_at, cancelled_at if present), payment method, fare, coords.
       Admin "Force Cancel" button calls `PUT /admin/trips/:id/cancel`; disabled on completed/cancelled trips.
       Files:
       - `apps/admin-panel/src/pages/Trips.tsx` (create)
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 12. Build the Settings page (`/settings`).
       Fetches `GET /admin/settings` on mount, renders an editable form with 6 fields (base_fare_tzs, per_km_rate_tzs, per_minute_rate_tzs, min_fare_tzs, driver_search_radius_km, trip_request_timeout_minutes). Each field uses `<input type="number">`. Save button iterates changed fields and calls `POST /admin/settings` once per changed key. Shows success/error toast via a simple in-component state message (no external toast library).
       Files:
       - `apps/admin-panel/src/pages/Settings.tsx` (create)
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 13. Wire protected routes — unauthenticated users redirect to `/login`.
       Wrap all child routes in `<RequireAuth>` component that checks `AuthContext.isAuthenticated`; if false, renders `<Navigate to="/login" replace />`. The Login page route must be outside the protected wrapper.
       Files:
       - `apps/admin-panel/src/components/RequireAuth.tsx` (create)
       - `apps/admin-panel/src/App.tsx` (update router to add `/login` route outside protected wrapper and wrap other routes in `<RequireAuth>`)
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors; `npm run build` completes with 0 errors.

- [ ] 14. Add a `vite.config.ts` if not present, and a `.env.example`.
       `vite.config.ts`: `@vitejs/plugin-react`, set `resolve.alias` for `@` → `src`.
       `.env.example`: `VITE_API_URL=http://localhost:3000/api/v1`.
       Files:
       - `apps/admin-panel/vite.config.ts` (create if absent)
       - `apps/admin-panel/.env.example` (create)
       Verify: `cd apps/admin-panel && npm run build` — dist directory created successfully.

---

## Special Considerations

1. **No UI library.** The project has no MUI, Tailwind, Chakra, or Ant Design. All components must use plain CSS (in `index.css` with custom properties, plus component-level `<style>` strings or module CSS). The plan avoids any new `npm install`.

2. **Broken AdminAPI.ts import.** `src/services/AdminAPI.ts` imports from `'../../passenger-app/src/services/api/client'` which does not exist. Step 6 replaces this file entirely.

3. **JWT shape mismatch.** `src/routes/auth.ts` signs `{ userId, userType }` but `src/middleware/auth.ts` decodes into `{ id, type, phone }`. In the admin route (step 2), check `(req as any).user?.userType` (the shape auth.ts actually sets on `req`) OR guard using the existing `requireRole('admin')` from `middleware/auth.ts` which checks `req.user.type`. The safest approach: use `requireRole('admin')` from `middleware/auth.ts` (which checks `.type`), AND note that the auth middleware sets `req.user = decoded` where decoded comes from the JWT payload. Since `auth.ts` signs `{ userId, userType }`, `req.user.type` will be undefined and `requireRole` from `middleware/auth.ts` will always deny. **Decision:** in `admin.ts`, manually check `(req as any).user?.userType === 'admin'` directly, mirroring how other route files use `(req as any).user?.userId`. This avoids depending on the conflicting middleware.

4. **Drivers table columns.** The base schema does not include `verification_status`. Migration 014 must add it with `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'`.

5. **Migration numbering gap.** There is no 012 or 013 in the migrations directory. The spec says `014_admin_settings.sql`. Use that name; the migration runner uses filename order and the gaps cause no issues since each migration uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... IF NOT EXISTS`.

6. **Trips fare column.** The base schema uses `fare INTEGER` (not `final_fare`). The drivers.ts route uses `final_fare` for a different trips query context. Admin stats and trip listing should use `fare` from the base schema, with a fallback `COALESCE(fare, 0)`.

7. **react-i18next initialisation.** Must call `i18n.init(...)` before `ReactDOM.createRoot(...).render(...)`, or wrap in a suspense boundary since i18next may be async. The simplest approach: use `initReactI18next` with `resources` inline (no HTTP backend), which is synchronous. The `react-i18next` and `i18next` packages are already installed.

8. **`@dalasmart/shared-types` path alias.** The `tsconfig.json` already maps `@dalasmart/shared-types` to `../../packages/shared-types/src/index.ts`. The admin panel can import shared types directly (e.g., `UserType`, `UserStatus`) without installing anything.
