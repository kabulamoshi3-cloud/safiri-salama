# Build4 Retry Plan — SkyRex Admin Panel

## What Was Investigated

| Location | What Was Found |
|---|---|
| `apps/admin-panel/src/` | Only `services/AdminAPI.ts` exists (the broken import file). Zero other `.ts/.tsx` files. No `index.html`, `main.tsx`, `App.tsx`, `i18n.ts`, components, pages, or context. |
| `services/api-gateway/src/routes/` | No `admin.ts`. 25 other route files exist. `index.ts` does **not** have an admin route registered. |
| `services/api-gateway/migrations/` | Files: `001`, `008`, `009`, `010`, `011`, `012_trip_state_machine.sql`. **No `013` or `014`** — migration 014 must still be created. |
| `apps/admin-panel/` root | Only `package.json` and `tsconfig.json`. No `vite.config.ts`, no `.env.example`. |

---

## Step Status from build4-plan.md

### Already Done (0 of 14)

**None of the 14 steps are done.** Every file listed in build4-plan.md is absent.

### Remaining Steps (All 14)

All steps must be implemented in the original order. A summary with path corrections is below.

---

## Corrections and Clarifications vs. build4-plan.md

### 1. JWT / `req.user` field name — CRITICAL FIX

`build4-plan.md` is internally inconsistent on this point. Here is the authoritative finding:

- `src/routes/auth.ts` signs JWTs as `{ userId, userType }`.
- `src/middleware/auth.ts` decodes the token and assigns `req.user = decoded` — but it casts the decoded payload as `{ id: string; type: ...; phone: string }`.
- Result: `req.user.id` is undefined (JWT uses `userId`), `req.user.type` is undefined (JWT uses `userType`). **Neither `.type` nor `.userType` on `req.user` will reliably hold the user type when passing through `authMiddleware`.**
- `rbac.ts`'s `requireRole` checks `req.user.role` (not `.type`). It imports from `@skyrex/shared-types` `UserType`.

**Decision for `admin.ts`:** Do **not** use `requireRole` from either `auth.ts` or `rbac.ts`. Instead, import `authMiddleware` from `../middleware/auth` to validate the token (it handles missing/invalid token with 401), then manually guard with:

```ts
const userType = (req as any).user?.userType ?? (req as any).user?.type;
if (userType !== 'admin') return res.status(403).json({ error: 'Forbidden' });
```

This covers both field names (`userType` from the actual JWT payload AND `type` from the middleware's cast type), making it robust against the inconsistency. Apply this guard at the top of every handler (or as a router-level middleware on the admin router).

### 2. Migration numbering

`build4-plan.md` said "gap from 011→014 is fine." Now confirmed that `012_trip_state_machine.sql` exists. So the next available number is `013`. **Use `013_admin_settings.sql`**, not `014_admin_settings.sql`.

### 3. `drivers.ts` confirms `verification_status` already exists in that table

`src/routes/drivers.ts` inserts `verification_status: 'pending'` in the `drivers` table at line ~50. The column was added in an earlier migration or is in `001_base_schema.sql`. The `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status` in the migration is safe (uses `IF NOT EXISTS`) but may be a no-op. Keep it for safety.

### 4. `trips.ts` uses `(req as any).user?.userId` pattern

Confirmed — route files that use `pool` directly (not `authMiddleware`) call `(req as any).user?.userId`. The admin route should follow the same cast pattern for reading `userId` and `userType`.

### 5. `authMiddleware` import path

Several route files (corporateAccounts, driverIncentives, support, etc.) import auth as:
```ts
import { authMiddleware as auth } from '../middleware/auth';
```
Use this exact pattern in `admin.ts`.

### 6. `src/services/AdminAPI.ts` replacement

The existing file imports from `'../../passenger-app/src/services/api/client'` which does not exist. Step 6 must overwrite this file entirely (not just remove the import).

### 7. `vite.config.ts` does not exist yet

Confirmed — only `package.json` and `tsconfig.json` are present at the admin-panel root. Step 14 must create it.

---

## Full Ordered Implementation Plan

- [ ] 1. **Create SQL migration for `system_settings`.**
      File name correction: use `013_admin_settings.sql` (not 014 — `012` already exists).
      Create the table and seed the 6 default settings rows. Include the `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'` guard (safe no-op if column exists).
      Files: `services/api-gateway/migrations/013_admin_settings.sql`
      Verify: `ls services/api-gateway/migrations/` shows the new file; `cat services/api-gateway/migrations/013_admin_settings.sql` shows `CREATE TABLE IF NOT EXISTS system_settings` and `ALTER TABLE drivers`.

- [ ] 2. **Create the backend admin route (`services/api-gateway/src/routes/admin.ts`).**
      Import `authMiddleware` from `'../middleware/auth'` and `pool` from `'../database/connection'`.
      Use a router-level pre-check:
      ```ts
      router.use((req: any, res, next) => {
        const ut = req.user?.userType ?? req.user?.type;
        if (ut !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        next();
      });
      ```
      Implement all 11 endpoints exactly as specified in build4-plan.md Step 2. Use `fare` column (not `final_fare`) in stats and trips queries. Use `COALESCE(fare, 0)` in the revenue aggregation.
      Files: `services/api-gateway/src/routes/admin.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 TypeScript errors.

- [ ] 3. **Register admin route in `src/routes/index.ts`.**
      Add `safeUse('/v1/admin', () => require('./admin'));` in the Core Features section, after the existing three routes.
      Files: `services/api-gateway/src/routes/index.ts`
      Verify: `cd services/api-gateway && npm run typecheck` — 0 errors; `npm run build` succeeds.

- [ ] 4. **Scaffold admin panel Vite app: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.**
      - `index.html`: minimal Vite entry pointing to `/src/main.tsx`.
      - `src/main.tsx`: renders `<App />` inside `StrictMode`; imports `./i18n` first (before React rendering).
      - `src/App.tsx`: `createBrowserRouter` + `RouterProvider`; routes: `''`→Dashboard, `drivers`, `passengers`, `trips`, `settings`, `/login` (outside auth wrapper), catch-all to `/`.
      - `src/index.css`: CSS reset + CSS custom properties: sidebar bg `#1a1f2e`, accent `#f97316`, content bg `#f8fafc`.
      Files: `apps/admin-panel/index.html`, `apps/admin-panel/src/main.tsx`, `apps/admin-panel/src/App.tsx`, `apps/admin-panel/src/index.css`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 TypeScript errors.

- [ ] 5. **Create i18n module.**
      Use `initReactI18next` with inline `resources` (no HTTP backend — synchronous init). Cover all UI strings: nav labels, table headers, action buttons (Approve/Idhinisha, Reject/Kataa, Ban/Zuia, Unban/Ondoa Zuio, Cancel/Futa), status labels, settings form labels. Both `en` and `sw` namespaces.
      Files: `apps/admin-panel/src/i18n.ts`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 6. **Create API client, auth context, and Login page.**
      - `src/services/api.ts`: `request(method, path, body?)` using `localStorage.getItem('admin_token')` as Bearer token. Base URL from `import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'`. Export all typed functions listed in build4-plan.md Step 6.
      - `src/services/AdminAPI.ts`: **replace entirely** — remove the broken `../../passenger-app` import. Re-export everything from `./api`.
      - `src/context/AuthContext.tsx`: context with `token`, `logout()`, `isAuthenticated`. Reads from `localStorage` on mount.
      - `src/pages/Login.tsx`: phone + password form; POST to `/api/v1/auth/login`; check `user.userType === 'admin'`; store token as `admin_token` in localStorage; redirect to `/`.
      Files: `apps/admin-panel/src/services/api.ts`, `apps/admin-panel/src/services/AdminAPI.ts`, `apps/admin-panel/src/context/AuthContext.tsx`, `apps/admin-panel/src/pages/Login.tsx`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 7. **Create shared components: Layout, StatusBadge, Table, Modal.**
      - `Layout.tsx`: dark sidebar (`#1a1f2e`) with SkyRex logo text, `NavLink` items (orange active highlight), `<Outlet />`, top bar with page title and Logout button.
      - `StatusBadge.tsx`: pill badge — green (`active`/`approved`/`online`/`available`), orange (`pending`), red (`banned`/`cancelled`/`rejected`), gray (`offline`/`inactive`).
      - `Table.tsx`: generic `<Table<T>>` with `columns: { key: keyof T | string; label: string; render?: (row: T) => React.ReactNode }[]` and `rows: T[]`.
      - `Modal.tsx`: overlay modal with close button, `title` + `children` props.
      Files: `apps/admin-panel/src/components/Layout.tsx`, `apps/admin-panel/src/components/StatusBadge.tsx`, `apps/admin-panel/src/components/Table.tsx`, `apps/admin-panel/src/components/Modal.tsx`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 8. **Build Dashboard page.**
      Fetch `GET /admin/stats` on mount. Four stat cards (Total Trips Today, Active Trips Now, Online Drivers, Revenue Today TZS). Table of 10 most recent trips from `GET /admin/trips?limit=10`. "View Pending Approvals" link to `/drivers?approval_status=pending`.
      Files: `apps/admin-panel/src/pages/Dashboard.tsx`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 9. **Build Drivers Management page.**
      Table: Name, Phone, Vehicle Plate, Status badge, Approval Status badge, Total Trips, Rating. URL filter params via `useSearchParams`. Row actions: Approve/Reject/Ban (conditional on state). View opens `<Modal>` with full driver profile.
      Files: `apps/admin-panel/src/pages/Drivers.tsx`
      Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 10. **Build Passengers Management page.**
       Table: Name, Phone, Join Date, Total Trips, Active Trips, Status badge. Actions: View (modal), Ban/Unban (conditional).
       Files: `apps/admin-panel/src/pages/Passengers.tsx`
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 11. **Build Trips Management page.**
       Table: Trip ID (first 8 chars), Passenger, Driver, Pickup, Destination, Status badge, Fare (TZS), Date. Filters: status dropdown + date-from/to (`<input type="date">`). Row click → modal with status timeline and Force Cancel button (disabled on terminal states).
       Files: `apps/admin-panel/src/pages/Trips.tsx`
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 12. **Build Settings page.**
       Fetch `GET /admin/settings`. Editable form for 6 numeric keys: `base_fare_tzs`, `per_km_rate_tzs`, `per_minute_rate_tzs`, `min_fare_tzs`, `driver_search_radius_km`, `trip_request_timeout_minutes`. Save button calls `POST /admin/settings` once per changed field. In-component success/error message (no external toast library).
       Files: `apps/admin-panel/src/pages/Settings.tsx`
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors.

- [ ] 13. **Wire protected routes with `<RequireAuth>`.**
       `RequireAuth.tsx` checks `AuthContext.isAuthenticated`; if false, `<Navigate to="/login" replace />`. Update `App.tsx` router: `/login` route outside the protected wrapper; all other child routes inside `<RequireAuth>`.
       Files: `apps/admin-panel/src/components/RequireAuth.tsx`, `apps/admin-panel/src/App.tsx` (update)
       Verify: `cd apps/admin-panel && npm run typecheck` — 0 errors; `npm run build` completes successfully.

- [ ] 14. **Create `vite.config.ts` and `.env.example`.**
       `vite.config.ts`: `@vitejs/plugin-react`, `resolve.alias` `@` → `./src`.
       `.env.example`: `VITE_API_URL=http://localhost:3000/api/v1`.
       Files: `apps/admin-panel/vite.config.ts`, `apps/admin-panel/.env.example`
       Verify: `cd apps/admin-panel && npm run build` — `dist/` directory created with no errors.

---

## Key Invariants (do not change)

- No new `npm install` in either app. All dependencies already in `package.json`.
- No UI library (no MUI, Tailwind, Chakra). Plain CSS only.
- Auth check in `admin.ts`: dual-field `userType ?? type` check (see Correction #1 above).
- Token stored in `localStorage` under key `admin_token`.
- Migration file name: `013_admin_settings.sql` (not 014).
- `fare` column for trips queries (not `final_fare`), with `COALESCE(fare, 0)`.
