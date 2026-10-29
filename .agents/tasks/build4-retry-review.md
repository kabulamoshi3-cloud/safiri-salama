# SkyRex Admin Panel

This adds a full admin panel SPA (React + TypeScript + Vite) alongside a new Express router (`/api/v1/admin`) that backs it. The frontend covers five pages — Dashboard, Drivers, Passengers, Trips, Settings — each behind a `RequireAuth` guard. The backend exposes 11 endpoints covering stats, driver approval/rejection/banning, passenger banning, trip management, and platform settings stored in a new `system_settings` table. Auth is enforced by a role-check middleware at router level rather than per-handler. A `dist/` folder is present in the repo, providing some evidence that a build was run.

**Watch for:** Hardcoded English labels in every modal detail pane (confirmed, all three detail components); a missing `unban` endpoint on the backend while the i18n file has a translation key for it; no validation on `limit`/`offset` query params, which would send `NaN` as a SQL parameter; and no build evidence beyond the presence of a `dist/` folder — no CI log or commit note confirms the TypeScript compiler passed cleanly.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Auth is correctly layered: the backend applies `authMiddleware` and then a role-check middleware to the entire `/v1/admin` router, so no individual handler can be reached without a valid `admin` JWT. The frontend mirrors this with `RequireAuth` wrapping the root route tree and `AuthContext` persisting the token under the key `admin_token`, which the API client reads consistently.

All 11 backend endpoints are present and structurally correct. All 5 frontend pages exist and are wired into the router. The primary correctness concern is that `parseInt()` on the `limit` and `offset` query params has no `NaN` guard, meaning a malformed request sends literal `NaN` to PostgreSQL, which produces a 500 rather than silently misbehaving.

The i18n coverage has a systematic gap: every modal detail pane (`DriverDetail`, `PassengerDetail`, `TripDetail`) renders field labels as plain English string literals rather than `t()` calls, affecting around 40 visible strings. Status option labels in the Trips filter dropdown are also hardcoded in English. This is the largest single-area defect in the PR.

No backend `unban` endpoint exists for drivers or passengers despite an `unban` translation key being defined. The UI hides the ban button for already-banned users and never surfaces an unban action — consistent with the backend gap, but the translation key signals the feature was intended and left incomplete.

No test files were added. The build command (`tsc && vite build`) passed based on the presence of `dist/`, but there is no CI log or commit message confirming a clean TypeScript compilation.

---

<details>
<summary>Issues (5)</summary>

1. **Hardcoded modal detail labels** — `DriverDetail`, `PassengerDetail`, and `TripDetail` all use plain English string literals as row labels (`'Name'`, `'License #'`, `'Account Status'`, `'Vehicle Type'`, `'Trip ID'`, `'Passenger Phone'`, etc.) instead of `t()` calls. Roughly 40 visible strings bypass i18n entirely. Replace each literal with a `t('th_...')` or a dedicated key.

2. **Hardcoded status options in Trips filter** — The `<select>` in `Trips.tsx` (lines 122–126) uses bare English option text (`'Pending'`, `'Accepted'`, `'In Progress'`, `'Completed'`, `'Cancelled'`). The cancel button tooltip at line 277 (`'Trip is already in a terminal state'`) is also hardcoded. Replace with `t('status_...')` keys that already exist in `i18n.ts`.

3. **Unguarded `parseInt` on limit/offset** — In the trips endpoint (`admin.ts` lines ~241–242), `parseInt(limit as string, 10)` and `parseInt(offset as string, 10)` produce `NaN` if the caller passes a non-numeric value. PostgreSQL rejects `NaN` parameters with a type error and the catch block returns 500. Add `isNaN` guards and fall back to defaults:
   ```ts
   const parsedLimit  = parseInt(limit  as string, 10);
   const parsedOffset = parseInt(offset as string, 10);
   params.push(isNaN(parsedLimit)  ? 50 : parsedLimit);
   params.push(isNaN(parsedOffset) ? 0  : parsedOffset);
   ```

4. **Unban not implemented** — `i18n.ts` defines `unban: 'Unban'` / `unban: 'Ondoa Zuio'` in both locales. No `PUT /admin/drivers/:id/unban` or `PUT /admin/passengers/:id/unban` endpoint exists in `admin.ts`, and no frontend call exists. Either add the endpoints or remove the translation keys to avoid dead surface.

5. **Build evidence missing** — A `dist/` folder is present but the commit message contains no TypeScript compiler output and there is no CI log. The build command is `tsc && vite build`, so a type error would block the dist from being produced — but this is unverifiable without a compiler log. Flag as unverified if deploying to staging requires a confirmed clean compile.

</details>

<details>
<summary>Details</summary>

## Auth gate — router-level middleware and stale-token behavior

The dual-field check `(req as any).user?.userType ?? (req as any).user?.type === 'admin'` in the router middleware handles the JWT shape discrepancy in the existing codebase. All 11 handlers are downstream with no bypass path.

`RequireAuth` checks token presence only — a JWT that has expired but hasn't been cleared passes the client-side guard. The backend returns 401, the `request()` function throws, and pages show error states rather than data. Stale tabs don't auto-redirect to login. This is a possible UX gap for long-lived admin sessions.

The `login` function checks `data.user.userType !== 'admin'` client-side before storing the token. This is UX-only — a modified client can bypass it and store an arbitrary token.

## Hardcoded labels in detail panes (confirmed)

All three modal detail components build their content as a static array of `[label, value]` pairs where every label is a plain English string literal. In `DriverDetail` (Drivers.tsx ~lines 199–213): `'Name'`, `'Phone'`, `'Email'`, `'License #'`, `'License Expiry'`, `'Verification'`, `'Account Status'`, `'Driver Status'`, `'Vehicle Plate'`, `'Vehicle'`, `'Vehicle Type'`, `'Total Trips'`, `'Rating'`, `'Joined'`. In `PassengerDetail` (Passengers.tsx ~lines 150–158): `'Name'`, `'Phone'`, `'Email'`, `'Status'`, `'Total Trips'`, `'Active Trips'`, `'Rating'`, `'Joined'`. In `TripDetail` (Trips.tsx ~lines 220–235): `'Trip ID'`, `'Status'`, `'Passenger'`, `'Passenger Phone'`, `'Driver'`, `'Driver Phone'`, `'Pickup'`, `'Destination'`, `'Vehicle Type'`, `'Fare'`, `'Distance'`, `'Payment'`, `'Created'`, `'Completed'`, `'Cancelled'`.

The `t` function is available in all three components via prop (confirmed by the function signature), so these should all be `t('th_...')` or new dedicated keys. Most of the needed keys already exist in `i18n.ts` — the fix is largely mechanical.

The Trips filter select also has five hardcoded English option labels (lines 122–126) and a hardcoded English tooltip on the cancel button (line 277), while `status_pending`, `status_accepted`, `status_in_progress`, `status_completed`, and `status_cancelled` keys all exist unused in `i18n.ts`.

## `NaN` in SQL parameters (confirmed)

`GET /admin/trips` constructs its query by pushing `parseInt(limit as string, 10)` and `parseInt(offset as string, 10)` directly onto the params array. If the caller omits these params, the destructuring default (`limit = '50'`) applies correctly. If the caller passes `limit=abc`, `parseInt` returns `NaN`, which is pushed to the params array and forwarded to `pool.query`. PostgreSQL throws a type error, the catch block returns 500.

## Unban gap

`i18n.ts` defines `unban: 'Unban'` / `unban: 'Ondoa Zuio'` in both locales. No `PUT /admin/drivers/:id/unban` or `PUT /admin/passengers/:id/unban` endpoint exists in `admin.ts`. The frontend Drivers and Passengers pages never call an unban function — they only hide the ban button for already-banned users. This is internally consistent (no broken calls), but the translation key is dead weight and signals the feature was planned and not completed.

## Migration numbering mismatch

The review brief references `migrations/014_admin_settings.sql`, but the actual migration landed as `013_admin_settings.sql`. The numbering discrepancy could cause confusion in deployment sequencing if a migration runner expects sequential numbering.

## No tests

No test files exist for any admin panel component or backend endpoint. The `vitest` script is configured with `--passWithNoTests`, so CI passes without any coverage. Auth middleware integration tests (verify 403 for non-admin JWT, verify 401 for missing token) and input validation tests for the trips endpoint would mechanically catch the `NaN` issue.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `apps/admin-panel/src/App.tsx` | Root router with all 5 page routes behind RequireAuth |
| `apps/admin-panel/src/context/AuthContext.tsx` | Auth state provider; token stored as `admin_token` |
| `apps/admin-panel/src/components/RequireAuth.tsx` | Route guard redirecting to `/login` if no token |
| `apps/admin-panel/src/components/Layout.tsx` | Shell with nav sidebar and outlet |
| `apps/admin-panel/src/components/Modal.tsx` | Accessible modal wrapper |
| `apps/admin-panel/src/components/Table.tsx` | Generic typed table component |
| `apps/admin-panel/src/components/StatusBadge.tsx` | Colored status chip |
| `apps/admin-panel/src/pages/Login.tsx` | Admin login with client-side userType check |
| `apps/admin-panel/src/pages/Dashboard.tsx` | Stats cards + recent trips table |
| `apps/admin-panel/src/pages/Drivers.tsx` | Driver list, filter tabs, approval/reject/ban actions |
| `apps/admin-panel/src/pages/Passengers.tsx` | Passenger list with ban action |
| `apps/admin-panel/src/pages/Trips.tsx` | Trip list with date/status filters and force-cancel |
| `apps/admin-panel/src/pages/Settings.tsx` | Platform fare settings editor |
| `apps/admin-panel/src/services/api.ts` | Full API client with typed request function |
| `apps/admin-panel/src/services/AdminAPI.ts` | Thin re-export shim replacing broken import |
| `apps/admin-panel/src/i18n.ts` | Full EN+SW translation resource |
| `apps/admin-panel/src/main.tsx` | Entry point importing i18n before app |
| `services/api-gateway/src/routes/admin.ts` | 11 admin endpoints with router-level auth middleware |
| `services/api-gateway/src/routes/index.ts` | Mounts admin router at `/v1/admin` |
| `services/api-gateway/migrations/013_admin_settings.sql` | Adds `verification_status` to drivers, creates `system_settings` |

Full diff: `git show a3ffddd -- apps/admin-panel/src/ services/api-gateway/src/routes/admin.ts services/api-gateway/migrations/`

</details>
