# Test and Documentation Implementation for SkyRex API Gateway

65 backend tests were added covering auth, tracking, and payments routes, alongside README.md updates and SETUP.md/`.env.example` creation. The auth suite has eight failing tests driven by two root causes: missing route handlers in `auth.ts` and a `req.user` field mismatch between `authMiddleware` and the payments handler. The tracking and payments suites pass. Documentation accurately reflects the current codebase; minor gaps from the prior docs-only pass remain open.

**Watch for:** `PATCH /me` and `POST /change-password` do not exist in `auth.ts` — five tests targeting them get 404s (confirmed). The `authMiddleware` writes `{ userId, userType }` to `req.user` but `payments.ts` reads `user.id`; tests pass because mocks ignore the undefined argument, masking a production bug (confirmed).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The JWT helper design is deliberate: `signRouteToken` embeds both `id`/`userId` and `type`/`userType` so one token satisfies `authMiddleware`'s verify step and every route handler's field reads. That design is correct and well-documented. The problem is that `authMiddleware` discards the `id` field when populating `req.user`, so `payments.ts`'s `user.id` reads are undefined at runtime — the tests don't catch this because the database mock ignores the query parameter value.

The auth suite has two distinct failure clusters. Five tests hit 404 because `PATCH /me` and `POST /change-password` were never added to `auth.ts`. Three more fail due to field-name mismatches: the register handler reads `user_type` from the body but the test sends `userType`, and the response shape returns a snake_case DB row where the test expects camelCase `userType`.

The documentation accurately removes the aspirational Go/Python/Kafka/TimescaleDB services. SETUP.md's expected test output lists `src/middleware/auth.test.ts` as passing, but that file is excluded by `jest.config.js` — a stale reference that will confuse anyone running the suite for the first time.

<details>
<summary>Issues (7)</summary>

1. **Missing `PATCH /me` route** — `auth.ts` has no `PATCH /me` handler. The two tests targeting it (`updates the profile name`, `returns 400 when no updatable fields`) both get 404. Add the handler or remove the tests.

2. **Missing `POST /change-password` route** — `auth.ts` has no `POST /change-password` handler. Both tests targeting it get 404. Add the handler or remove the tests.

3. **`GET /me` harness bypassed by direct JWT verification** — The route re-verifies the Authorization header directly instead of using `req.user`. The `buildAuthApp` harness injects `req.user` but sends no Authorization header, so the route returns 401. The test and the route are incompatible; fix one or the other.

4. **`authMiddleware` discards `user.id` — payments.ts production bug** — `authMiddleware` sets `req.user = { userId, userType }`, discarding the `id` field from the JWT payload. `payments.ts` reads `user.id` for every DB query (`WHERE u.id = $1`). In production, `user.id` is `undefined`, making every payments query a full-table scan or silent no-op. The tests pass because the mock ignores the parameter. Fix `authMiddleware` to also expose `id` (aliased from `userId`) or update `payments.ts` to read `user.userId`.

5. **Register test: `userType` vs `user_type` field mismatch** — The test sends `userType: 'passenger'` but the route destructures `user_type`. The `user_type` field is silently undefined, and the INSERT falls back to `'passenger'` as default — the test appears to pass for the wrong reason. The `toMatchObject({ userType: 'passenger' })` assertion also fails because the returned row uses `user_type`. The test needs to send `user_type` and match `user_type`, or the route needs to accept both.

6. **"Phone already registered" test fails due to validation order** — The test sends `{ phone, password, userType }` (no `name`). The route validates `!name` before checking for duplicate phone, returning "Phone, password and name are required" rather than "already exists". Add `name` to the test body so the duplicate-phone check is reached.

7. **SETUP.md expected test output references excluded test file** — The "Run Tests" section shows `PASS src/middleware/auth.test.ts` as expected output. That file is excluded in `jest.config.js`. Anyone following the guide will see it absent from their output. Update the expected output to reflect what `npm test` actually produces.

</details>

<details>
<summary>Details</summary>

## Missing auth route handlers

`auth.ts` exposes five routes: `POST /register`, `POST /login`, `POST /firebase-verify`, `GET /me`, and `POST /logout`. There are no `PATCH /me` or `POST /change-password` handlers. The tests for these endpoints use the `buildAuthApp` harness mounting `authRouter` directly.

Failing tests:
- `PATCH /api/v1/auth/me › updates the profile name` → 404
- `PATCH /api/v1/auth/me › returns 400 when no updatable fields are provided` → 404
- `PATCH /api/v1/auth/me › returns 401 with no token` → 404 (expects 401)
- `POST /api/v1/auth/change-password › changes the password when the current password matches` → 404
- `POST /api/v1/auth/change-password › returns 401 when the current password is wrong` → 404

## `GET /me` test harness mismatch

`auth.ts`'s `GET /me` handler reads the Authorization header directly and calls `jwt.verify` — it does not use `req.user`. The `buildAuthApp` harness injects `req.user = { userId: 'u1' }` but sends no Authorization header, so the handler returns 401 immediately. Changing the handler to read from `req.user` (set by the harness's middleware) would fix this and align it with every other auth-aware route in the codebase.

## `authMiddleware` field loss into payments.ts

`authMiddleware`:
```typescript
const decoded = jwt.verify(token, secret) as { userId: string; userType: string };
(req as any).user = { userId: decoded.userId, userType: decoded.userType };
```

`payments.ts` (repeated in every handler):
```typescript
const user = (req as any).user;
// ...
WHERE u.id = $1   — [user.id]
```

`user.id` is always `undefined` after `authMiddleware`. The `signRouteToken` helper encodes `id: userId` in the JWT, but `authMiddleware` discards that field when constructing the `req.user` object. Production queries against the `users` table receive `undefined` as the id parameter.

## Register validation order exposes wrong error

The route checks `if (!phone || !password || !name)` before querying for duplicate phone. The test that verifies the duplicate-phone error sends:
```typescript
{ phone: '255744111111', password: PASSWORD, userType: 'passenger' }
```
No `name` field. The first guard fires, returning 400 with "Phone, password and name are required". The mock is set up to return an existing user row (the duplicate check), but execution never reaches that query. The test expects `/already exists/i` and gets a name-validation error.

## SETUP.md stale test output

The "Run Tests" section shows:
```
PASS  src/middleware/auth.test.ts
```
`jest.config.js` excludes this file:
```javascript
testPathIgnorePatterns: [
  'middleware/auth\\.test\\.ts$',
  'middleware/rbac\\.test\\.ts$',
  'middleware/validation\\.test\\.ts$',
  'tests/features\\.test\\.ts$',
],
```
The expected output should list the three suites that actually run: `src/__tests__/routes/auth.test.ts`, `src/__tests__/routes/tracking.test.ts`, `src/__tests__/routes/payments.test.ts`.

</details>

<details>
<summary>File map</summary>

- `src/__tests__/setup.ts` — Sets `JWT_SECRET`, `NODE_ENV`, `DATABASE_URL`; disables ORS key before module load
- `src/__tests__/helpers/jwt.ts` — `signRouteToken` (embeds `id`+`userId`) and `signAuthToken` (minimal shape); constants for test UUIDs
- `src/__tests__/routes/auth.test.ts` — 20 tests; 8 failing (missing handlers, field mismatches)
- `src/__tests__/routes/tracking.test.ts` — 27 tests; all passing; mocks `database/connection` pool
- `src/__tests__/routes/payments.test.ts` — 18 tests; all passing; mocks `database` module with `getClient`/`query`
- `jest.config.js` — `ts-jest`, `maxWorkers: 1`, excludes 4 pre-existing test files, maps `@skyrex/shared-types`
- `README.md` — Architecture, API reference, environment variables, deployment; correctly omits unbuilt services
- `SETUP.md` — Step-by-step setup guide; stale expected test output in "Run Tests" section
- `services/api-gateway/.env.example` — All required and optional environment variables with inline comments
</details>
