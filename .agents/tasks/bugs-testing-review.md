# Bug Fixes and Unit Testing Infrastructure for DalaSmart

This change addresses a set of confirmed P0/P1/P2 bugs in the DalaSmart platform — an insecure JWT fallback, a missing admin seeding path, a wrong field name in the operator auth store, single-origin CORS, and a native-module crash on startup — and layers in Jest/Vitest test suites across all four apps. The approach is surgical: each fix targets the specific code path identified in the prior analysis report without rewriting surrounding logic. Watch for: a `safiri-secret` fallback that was removed from `api-gateway` but **left in place in `tracking-service`** (confirmed), `setupFilesAfterEnv` misspelled as `setupFilesAfterFramework` in both Expo `package.json` files which silently disables the jest-native matchers (confirmed), and three inline `process.env.JWT_SECRET` reads in `routes/auth.ts` that bypass the module-level constant and carry no null guard (confirmed).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The `api-gateway` JWT fix is solid at the module level — the `'safiri-secret'` fallback is gone from `routes/auth.ts` and `middleware/auth.ts` — but the same vulnerable pattern survives in `services/tracking-service/src/index.ts`. That service now uses a different key from the gateway when `JWT_SECRET` is absent, silently breaking driver location updates and accepting forged tokens on the WebSocket.

Inside `routes/auth.ts` the module-level `JWT_SECRET` constant is used only in `issueJwt()`. The three routes that verify tokens inline (`GET /me`, `PATCH /me`, `POST /change-password`) each re-read `process.env.JWT_SECRET` into a local `secret` variable with type `string | undefined`, passing it directly to `jwt.verify()`. This is a TypeScript error and bypasses the startup guard entirely — a missing env var at verify time throws a confusing runtime error rather than the clear startup message the fix intended.

The admin seed artifacts are present, but the SQL file inserts the literal string `$2b$10$YourBcryptHashHere` as a bcrypt hash. This is not valid bcrypt; `bcrypt.compare()` will always return `false`, and the `ON CONFLICT DO NOTHING` clause means a subsequent run of the Node.js script won't overwrite the bad hash if there's a phone number collision. The Node.js script is the correct production path; the SQL file as written permanently locks out any admin created through it.

Both Expo `package.json` files use `setupFilesAfterFramework` instead of the valid Jest key `setupFilesAfterEnv`. Jest silently ignores unknown keys, so `@testing-library/jest-native/extend-expect` is never loaded and the `__tests__/setup.ts` files are never invoked. Current tests use only standard jest/RTL matchers so they may pass now, but the setup baseline is broken and will fail as soon as any jest-native matcher is added.

The Vitest configs for admin-panel and operator-dashboard are syntactically correct, and import paths in the test files were verified against actual file locations — placeholder strings, mock targets, and API field names all match the source.

---

<details>
<summary>Issues (4)</summary>

1. **`safiri-secret` survives in tracking-service** — `services/tracking-service/src/index.ts` line 59 still uses `process.env.JWT_SECRET || 'safiri-secret'`. A deployment missing `JWT_SECRET` will fall back to the public string and accept forged tokens on the location-tracking WebSocket. Remove the fallback and throw at startup, matching the api-gateway pattern. (confirmed)

2. **Inline JWT reads in routes/auth.ts bypass the null guard** — `GET /me`, `PATCH /me`, and `POST /change-password` each do `const secret = process.env.JWT_SECRET` (type: `string | undefined`) and pass it to `jwt.verify()`. This is a TypeScript compile error and bypasses the module-level startup guard. Replace with the module-level `JWT_SECRET` constant (already narrowed to `string`). (confirmed — lines 271, 313, 377)

3. **`setupFilesAfterFramework` typo silences jest-native in both Expo apps** — the correct Jest key is `setupFilesAfterEnv`. With the typo, jest-native matchers are never registered and `__tests__/setup.ts` is never run. Rename to `setupFilesAfterEnv` in `apps/passenger-app/package.json` and `apps/driver-app/package.json`. (confirmed)

4. **SQL seed contains an invalid placeholder bcrypt hash** — `001_admin_seed.sql` inserts `$2b$10$YourBcryptHashHere`; `bcrypt.compare()` against this always returns `false`. Combined with `ON CONFLICT DO NOTHING`, any admin created via this file is permanently locked out and a subsequent Node.js seed run will not fix it. Either delete the SQL file or replace the placeholder with a real pre-computed hash. (confirmed)

</details>

---

<details>
<summary>Details</summary>

## Inline JWT reads bypass the module-level null guard

At the top of `routes/auth.ts`, the fix correctly establishes:

```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
```

But inside `GET /me`, `PATCH /me`, and `POST /change-password`, the token verification branches each do:

```ts
const secret = process.env.JWT_SECRET;
// ...
decoded = jwt.verify(token, secret);
```

`process.env.JWT_SECRET` has type `string | undefined`. TypeScript should reject the `jwt.verify` call because `Secret` doesn't accept `undefined` — the build report's claim of a passing TypeScript build is inconsistent with this and should be investigated. The module-level `JWT_SECRET` constant is already narrowed to `string` by the guard; using it everywhere is the fix.

## Admin seed: two artifacts with inconsistent guarantees

The Node.js script (`seed-admin.js`) hashes the password at runtime using bcrypt and upserts with `DO UPDATE`, so re-running it is safe. The SQL file (`001_admin_seed.sql`) inserts the literal string `$2b$10$YourBcryptHashHere` as the password hash — right prefix, garbage body. `bcrypt.compare()` against it always returns `false`, so the account is created but login is permanently impossible. `ON CONFLICT DO NOTHING` means the Node.js script won't repair this if the phone number was already inserted by the SQL file.

## Jest config typo silences setup files in both Expo apps

Both `apps/passenger-app/package.json` and `apps/driver-app/package.json` have:

```json
"setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"]
```

Jest does not warn on unrecognised keys in `package.json` jest config blocks — it simply ignores them. The consequence is that `@testing-library/jest-native/extend-expect` is never imported and the `__tests__/setup.ts` files are never invoked. Current test assertions use only `toBeTruthy()` and `findByText()`, which are standard RTL matchers, so tests may pass today. The infrastructure is broken for any future jest-native matcher use.

## Test coverage gaps

No tests cover the new `POST /auth/admin-register` endpoint. Its two security-relevant behaviors — returning 403 when `SETUP_SECRET` is unset, and rejecting a mismatched `X-Setup-Secret` header — have no test coverage. Not tested: the phone normalisation utility with its multiple prefix branches (`+255`, `0`, raw digits). Not tested: the CORS multi-origin parsing logic.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `services/api-gateway/src/routes/auth.ts` | Removed `'safiri-secret'` fallback at module level; added `POST /auth/admin-register`; inline token-verify reads still use `process.env` directly |
| `services/api-gateway/src/middleware/auth.ts` | Removed `'safiri-secret'` fallback; module-level `JWT_SECRET` constant with startup guard |
| `services/api-gateway/src/index.ts` | CORS origin parsing rewritten to support comma-separated list |
| `apps/operator-dashboard/src/store/auth.ts` | `res.data.operator` → `res.data.user` in login action |
| `apps/driver-app/App.tsx` | `BackgroundLocation` import moved from top-level to lazy `useEffect` |
| `infrastructure/database/postgres/seeds/001_admin_seed.sql` | New: SQL seed with invalid placeholder bcrypt hash |
| `infrastructure/database/postgres/seeds/seed-admin.js` | New: Node.js seed script that hashes password at runtime |
| `apps/passenger-app/__tests__/LoginScreen.test.tsx` | New: 5 tests covering render, validation, and navigation |
| `apps/passenger-app/__tests__/ActivityScreen.test.tsx` | New: 4 tests covering filter tabs, trip display, empty state |
| `apps/passenger-app/__tests__/MainTabNavigator.test.tsx` | New: 3 render tests |
| `apps/driver-app/__tests__/EarningsScreen.test.tsx` | New: 3 tests covering period tabs, currency format, empty history |
| `apps/driver-app/__tests__/MainNavigator.test.tsx` | New: 1 render test |
| `apps/admin-panel/src/__tests__/Login.test.tsx` | New: 4 tests covering render, non-admin rejection, and API call |
| `apps/admin-panel/src/__tests__/navigation.test.tsx` | New: 4 sidebar nav tests |
| `apps/operator-dashboard/src/__tests__/authStore.test.ts` | New: 4 store tests covering login, logout, token persistence, error |
| `apps/operator-dashboard/src/__tests__/LiveMap.test.tsx` | New: 3 render tests |
| `apps/passenger-app/package.json` | Added jest devDependencies and jest config block (typo: `setupFilesAfterFramework`) |
| `apps/driver-app/package.json` | Added jest devDependencies and jest config block (typo: `setupFilesAfterFramework`) |
| `apps/admin-panel/package.json` | Added vitest testing devDependencies |
| `apps/operator-dashboard/package.json` | Added vitest testing devDependencies |
| `apps/admin-panel/vite.config.ts` | Added `test` block: jsdom environment, globals, setupFiles |
| `apps/operator-dashboard/vite.config.ts` | Added `test` block: jsdom environment, globals, setupFiles |
| `apps/admin-panel/.env.example` | Updated with production URL comment |
| `apps/operator-dashboard/.env.example` | Created with `VITE_API_URL` |

Full diff: `git diff main` from `/home/masalago/projects/daladala`

</details>
