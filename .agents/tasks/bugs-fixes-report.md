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
