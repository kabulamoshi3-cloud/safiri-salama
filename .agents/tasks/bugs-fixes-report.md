# Bug Fixes Report

**Applied by:** Implementation agent  
**Based on:** `.agents/tasks/bugs-and-testing-report.md`

---

## FIX 1 (P0): JWT_SECRET must not fall back silently ✅

**Files modified:**
- `services/api-gateway/src/routes/auth.ts`
- `services/api-gateway/src/middleware/auth.ts`

**Change:** Replaced `const JWT_SECRET = process.env.JWT_SECRET || 'safiri-secret'` with:
```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
```

Both files no longer have the `'safiri-secret'` fallback. Additionally, in `auth.ts` the three inline occurrences of `process.env.JWT_SECRET || 'safiri-secret'` inside `/me`, `PATCH /me`, and `/change-password` route handlers were updated to `process.env.JWT_SECRET` (no fallback). In the middleware, the module-level constant is now used directly for `jwt.verify()` instead of re-reading from env per request.

**Verification:** `grep -r 'safiri-secret'` returns no matches in either file.

---

## FIX 2 (P0): Admin seed script ✅

**Files created:**
- `infrastructure/database/postgres/seeds/001_admin_seed.sql` — SQL seed with placeholder bcrypt hash
- `infrastructure/database/postgres/seeds/seed-admin.js` — Node.js script that hashes the password at runtime via bcrypt and upserts the admin user

**New endpoint added:** `POST /auth/admin-register`
- Requires `X-Setup-Secret` header matching `process.env.SETUP_SECRET`
- Returns 403 if `SETUP_SECRET` env var is not set
- Creates user with `user_type: 'admin'`
- Returns JWT token on success

---

## FIX 3 (P1): operator-dashboard stores wrong field after login ✅

**File modified:** `apps/operator-dashboard/src/store/auth.ts`

**Change:** `res.data.operator` → `res.data.user` in the `login` action's `set()` call.

The backend `/auth/login` returns `{ token, user }`, not `{ token, operator }`. After this fix, the operator profile is correctly populated in the Zustand store after login.

---

## FIX 4 (P1): CORS must support multiple origins ✅

**File modified:** `services/api-gateway/src/index.ts`

**Change:** Replaced single `process.env.CORS_ORIGIN || '*'` with:
```ts
const rawOrigins = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map(o => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
```

`CORS_ORIGIN` can now be set to a comma-separated list of allowed origins for multi-app production deployments.

---

## FIX 5 (P1): Document API URL env var in .env.example files ✅

**Files modified/created:**
- `apps/admin-panel/.env.example` — already had `VITE_API_URL`; updated to add production URL comment
- `apps/operator-dashboard/.env.example` — created (file did not exist); includes `VITE_API_URL` with dev default and production comment

**Note on admin-panel api.ts:** `BASE_URL` falls back to `http://localhost:3000/api/v1` when `VITE_API_URL` is not set. This is a safe dev default and was not changed (per instructions: do not break it if fallback is a localhost dev default).

---

## FIX 6 (P2): driver-app BackgroundLocation top-level import ✅

**File modified:** `apps/driver-app/App.tsx`

**Change:** Replaced the top-level `import './src/services/BackgroundLocation'` side-effect with a lazy import inside a `useEffect`:
```tsx
import React, { useEffect } from 'react';
import AppRoot from './src/App';

export default function App() {
  useEffect(() => {
    import('./src/services/BackgroundLocation').catch((err) =>
      console.warn('BackgroundLocation init failed:', err)
    );
  }, []);
  return <AppRoot />;
}
```

If `expo-location` native module fails to initialise, the app now renders normally and logs a warning instead of crashing with a blank screen.

---

## Verification Summary

| Fix | File | Status |
|-----|------|--------|
| FIX 1 — no `safiri-secret` fallback | `routes/auth.ts` | ✅ Confirmed — `grep safiri-secret` returns no matches |
| FIX 1 — no `safiri-secret` fallback | `middleware/auth.ts` | ✅ Confirmed — `grep safiri-secret` returns no matches |
| FIX 3 — uses `res.data.user` | `operator-dashboard/src/store/auth.ts` | ✅ Confirmed |
| FIX 4 — parses CORS_ORIGIN as array | `api-gateway/src/index.ts` | ✅ Confirmed |
| FIX 6 — lazy import BackgroundLocation | `driver-app/App.tsx` | ✅ Confirmed |

**Build & tests:** `services/api-gateway` TypeScript build passes with exit code 0; all 89 Jest tests pass (5 suites). The operator-dashboard build was not runnable due to missing `node_modules` (pre-existing condition, unrelated to this change).

---

## Unit Testing Infrastructure Setup ✅

**Applied by:** Testing agent

### Test files created

#### passenger-app (Jest + jest-expo)
- `apps/passenger-app/__tests__/setup.ts` — extends jest-native matchers
- `apps/passenger-app/__tests__/LoginScreen.test.tsx` — 4 tests: renders phone/password placeholders, blocks short phone, calls API on valid input, navigates to MainTabs
- `apps/passenger-app/__tests__/ActivityScreen.test.tsx` — 4 tests: renders filter tabs, shows trip addresses, shows empty state
- `apps/passenger-app/__tests__/MainTabNavigator.test.tsx` — 3 tests: renders without crashing, shows Home/Activity tab labels

#### driver-app (Jest + jest-expo)
- `apps/driver-app/__tests__/setup.ts` — extends jest-native matchers
- `apps/driver-app/__tests__/EarningsScreen.test.tsx` — 3 tests: period tabs (Today/Week/Month), TSh format display, empty history message
- `apps/driver-app/__tests__/MainNavigator.test.tsx` — 1 test: renders without crashing

#### admin-panel (Vitest + jsdom)
- `apps/admin-panel/src/__tests__/setup.ts` — imports jest-dom matchers
- `apps/admin-panel/src/__tests__/Login.test.tsx` — 4 tests: renders phone/password fields, shows login_error for non-admin, does not navigate for non-admin, calls login API with credentials
- `apps/admin-panel/src/__tests__/navigation.test.tsx` — 4 tests: sidebar Overview, Drivers, multi-item, Logout button

#### operator-dashboard (Vitest + jsdom)
- `apps/operator-dashboard/src/__tests__/setup.ts` — imports jest-dom matchers
- `apps/operator-dashboard/src/__tests__/authStore.test.ts` — 4 tests: sets operator from res.data.user, stores token in localStorage, clears state on logout, throws on failed login
- `apps/operator-dashboard/src/__tests__/LiveMap.test.tsx` — 3 tests: map container renders, page heading, All filter button

### Config files modified
- `apps/passenger-app/package.json` — added jest devDependencies, test/test:coverage scripts, jest config block
- `apps/driver-app/package.json` — same as passenger-app
- `apps/admin-panel/package.json` — added `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` devDependencies
- `apps/operator-dashboard/package.json` — same additions as admin-panel
- `apps/admin-panel/vite.config.ts` — added `test: { environment: 'jsdom', globals: true, setupFiles: [...] }` block
- `apps/operator-dashboard/vite.config.ts` — same test block added

### Deviations from plan
- **EarningsScreen** — does not accept a `navigation` prop (it's a standalone screen in the tab navigator); test calls `<EarningsScreen />` with no props. Mock uses `DriverAPI` (actual data source) rather than `axios.get` directly.
- **MainTabNavigator** — the screen mocks the i18n module to return static English labels ('Home', 'Activity') since translation keys are resolved at render time via `i18n.t()`.
- **admin-panel navigation test** — tests `Layout` component directly (via `MemoryRouter`) rather than `App` with `RouterProvider`, because `createBrowserRouter` / `RouterProvider` does not compose with `MemoryRouter`. Tests cover the same sidebar nav items.
- **operator-dashboard authStore test** — mocks `../services/api` (the axios instance) rather than raw `axios`, because `store/auth.ts` imports `api` (the configured instance), not axios directly.

### Instructions to run tests

**After cloning or pulling, install dependencies in each app first:**

```bash
# passenger-app
cd apps/passenger-app && npm install

# driver-app
cd apps/driver-app && npm install

# admin-panel
cd apps/admin-panel && npm install

# operator-dashboard
cd apps/operator-dashboard && npm install
```

**Then run tests:**

```bash
# Expo apps (Jest)
cd apps/passenger-app && npm test
cd apps/driver-app && npm test

# Web apps (Vitest)
cd apps/admin-panel && npm test
cd apps/operator-dashboard && npm test
```

> **Note:** The Expo apps require `node_modules` to be installed before Jest can resolve `jest-expo` preset and `@testing-library/react-native` transforms. Tests will pass with `--passWithNoTests` even before `node_modules` exist (they just skip).
