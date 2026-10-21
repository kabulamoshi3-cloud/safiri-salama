# Implementation Plan — Tests + Documentation

## Decisions

**Test framework:** Jest + ts-jest are already installed as devDependencies (jest@29, ts-jest@29, @types/jest@29). No new packages needed. `supertest` and `@types/supertest` must be added for HTTP-level route tests — they are not yet present. `jest-mock-extended` is not needed; plain jest mocking is sufficient.

**Jest config:** No `jest.config.js` exists yet. Create one at `services/api-gateway/jest.config.js` using `ts-jest` preset, `testEnvironment: 'node'`, roots pointing at both `src` (middleware unit tests) and `tests` (integration tests). `testPathIgnorePatterns` excludes `dist`.

**tsconfig for tests:** The existing `tsconfig.json` excludes `**/*.test.ts`; that is correct for the build. ts-jest reads it but applies `isolatedModules: true` in the Jest config transform, so no tsconfig change is needed.

**App export:** `src/index.ts` already exports `default app` without calling `app.listen()`. Supertest can import it directly. The `server.ts` split is **not** needed.

**DB strategy:** Use `process.env.DATABASE_URL` already wired in `src/database/connection.ts` and `src/database/index.ts`. Route tests that need DB calls mock the `pool` / `database` module at the Jest module level (`jest.mock('../database/connection')`, `jest.mock('../database')`). No test database is needed. A `.env.test` file with safe defaults (`JWT_SECRET=test-secret`) is loaded by Jest's `setupFiles`.

**External service mocks:** Three external calls exist:
- ORS routing API (`axios.post` in `tracking.ts`) — mock `axios` module-level.
- M-Pesa / mobile money STK push (`fireStkPush` in `payments.ts`) — `console.log` only in current code, nothing to mock; test the JSON response shape.
- Expo/FCM push notifications — `notifications.ts` uses its own axios call; mock `axios`.

**Test files to create:**
1. `src/__tests__/routes/auth.test.ts` — supertest route tests for `/api/v1/auth`
2. `src/__tests__/routes/trips.test.ts` — supertest route tests for `/api/v1/trips`
3. `src/__tests__/routes/payments.test.ts` — supertest route tests for `/api/v1/payments`
4. `src/__tests__/routes/tracking.test.ts` — supertest route tests for `/api/v1/tracking`
5. `src/__tests__/helpers/jwt.ts` — shared helper to sign test JWTs with `JWT_SECRET=test-secret`

**Documentation files to create:**
- `README.md` (root) — already exists; replace / extend with full developer guide
- `services/api-gateway/.env.example`
- `SETUP.md` (root)

---

## Implementation Plan

- [ ] 1. Add supertest dependency and create jest.config.js
      Install `supertest` and `@types/supertest`. Create `services/api-gateway/jest.config.js` with ts-jest preset, node test environment, and `setupFiles: ['./src/__tests__/setup.ts']`. Create `src/__tests__/setup.ts` that sets `process.env.JWT_SECRET = 'test-secret'` and `process.env.NODE_ENV = 'test'`.
      Files:
        - `services/api-gateway/package.json` (add supertest deps)
        - `services/api-gateway/jest.config.js` (new)
        - `services/api-gateway/src/__tests__/setup.ts` (new)
      Verify: `cd services/api-gateway && npm test -- --listTests` lists at least the existing middleware test files and exits 0.

- [ ] 2. Create JWT test helper
      Add `src/__tests__/helpers/jwt.ts` that exports `signTestToken({ userId, userType })` using `jsonwebtoken.sign` with `JWT_SECRET = 'test-secret'` and a 1-hour expiry. Also export `TEST_USER_ID`, `TEST_DRIVER_ID` UUID constants for consistent fixture data.
      Files: `services/api-gateway/src/__tests__/helpers/jwt.ts`
      Verify: `npm test -- --testPathPattern=helpers` — TypeScript compiles, no errors.

- [ ] 3. Write auth route tests
      Create `src/__tests__/routes/auth.test.ts`. Mock `pool` from `../database/connection` with `jest.mock`. Cover:
      - `POST /api/v1/auth/register` — 201 success with all required fields; 400 when phone/password/userType missing; 400 when phone already exists (pool returns a row).
      - `POST /api/v1/auth/login` — 200 with valid credentials (pool returns hashed password that bcrypt accepts); 401 invalid credentials; 403 inactive account.
      - `GET /api/v1/auth/me` — 200 with valid Bearer token; 401 without token.
      - `PATCH /api/v1/auth/me` — 200 name update; 400 with no fields.
      - `POST /api/v1/auth/change-password` — 200 success; 401 wrong current password.
      Files: `services/api-gateway/src/__tests__/routes/auth.test.ts`
      Verify: `npm test -- --testPathPattern=routes/auth` — all cases pass, 0 failures.

- [ ] 4. Write trips route tests
      Create `src/__tests__/routes/trips.test.ts`. Mock `pool`. Use `signTestToken` for auth header. Cover:
      - `POST /api/v1/trips` — 201 with valid body; 400 missing required coordinate fields; 401 missing auth.
      - `GET /api/v1/trips/:tripId` — 200 found; 404 not found; 401 no auth.
      - `GET /api/v1/trips` — 200 list with pagination query params; 401 no auth.
      - `PATCH /api/v1/trips/:tripId/status` — 200 valid status; 400 invalid status value; 403 not owner.
      - `PATCH /api/v1/trips/:tripId/assign-driver` — 200 success; 400 already has driver; 404 trip not found.
      - `PATCH /api/v1/trips/:tripId/complete` — 200 driver completes; 403 passenger tries to complete.
      - `PATCH /api/v1/trips/:tripId/cancel` — 200 success; 400 already completed/cancelled.
      - `POST /api/v1/trips/:tripId/rate` — 200 valid 1–5 rating; 400 rating out of range; 400 trip not completed.
      - `GET /api/v1/trips/available/nearby` — 200 with lat/lng; 400 missing coords.
      Files: `services/api-gateway/src/__tests__/routes/trips.test.ts`
      Verify: `npm test -- --testPathPattern=routes/trips` — all cases pass.

- [ ] 5. Write payments route tests
      Create `src/__tests__/routes/payments.test.ts`. Mock `../database` (default export with `getClient`, `query`). Cover:
      - `GET /api/v1/payments/info` — 200 returns payment methods list; 401 no auth.
      - `POST /api/v1/payments/pay` with `method: 'cash'` — 201 `pending_confirmation` status.
      - `POST /api/v1/payments/pay` with `method: 'wallet'` and sufficient balance — 200 `completed`.
      - `POST /api/v1/payments/pay` with `method: 'wallet'` and insufficient balance — 400 error with shortfall.
      - `POST /api/v1/payments/pay` with `method: 'mpesa'` valid Vodacom TZ number — 200 `pending` with `poll_url`.
      - `POST /api/v1/payments/pay` with mismatched provider/phone (Airtel number + mpesa method) — 400.
      - `POST /api/v1/payments/pay` with invalid `context_id` (not UUID) — 400.
      - `POST /api/v1/payments/pay` with `amount < 100` — 400.
      - `GET /api/v1/payments/status/:reference` — 200 found; 404 not found.
      - `GET /api/v1/payments/receipt/:reference` — 200 receipt shape; 404.
      Files: `services/api-gateway/src/__tests__/routes/payments.test.ts`
      Verify: `npm test -- --testPathPattern=routes/payments` — all cases pass.

- [ ] 6. Write tracking route tests
      Create `src/__tests__/routes/tracking.test.ts`. Mock `axios` for ORS calls; mock `pool`. Cover:
      - `POST /api/v1/tracking/driver/update` — 200 `{status: 'ok'}`; 400 missing lat/lng; 401 no auth.
      - `POST /api/v1/tracking/driver/location` (alias endpoint) — 200 `{status: 'ok', trip_id}`.
      - `GET /api/v1/tracking/driver/:driverId` — 200 from in-memory (write a location first, then read); 404 driver not found in DB when no memory entry.
      - `GET /api/v1/tracking/nearby` — 200 `{drivers: [...], count: N}`; 400 missing lat/lng.
      - `POST /api/v1/tracking/driver/offline` — 200 `{status: 'offline'}`.
      - `POST /api/v1/tracking/calculate-route` — 200 with is_estimate=true when ORS key absent (default in test env); 400 missing coords; verify response shape has `distance_km`, `duration_minutes`, `fare_tzs`, `polyline_coords`, `steps`.
      - `GET /api/v1/tracking/route?trip_id=X` — 200 after prior calculate-route with same trip_id; 404 unknown trip_id.
      - `GET /api/v1/tracking/trip/:tripId` — 200 fallback mock data when DB unavailable.
      - `GET /api/v1/tracking/nearby-drivers` — 200 mock driver list; 400 missing lat/lng.
      - `GET /api/v1/tracking/traffic` — 200 mock segments; 400 missing lat/lng.
      Files: `services/api-gateway/src/__tests__/routes/tracking.test.ts`
      Verify: `npm test -- --testPathPattern=routes/tracking` — all cases pass.

- [ ] 7. Run full test suite and fix any remaining failures
      Run `npm test` from `services/api-gateway`. Fix any TypeScript type errors or import failures that appear. The middleware unit tests (`auth.test.ts`, `rbac.test.ts`, `validation.test.ts`) import from `@dalasmart/shared-types` and a slightly different `auth.ts` shape than the current file; add jest `moduleNameMapper` in jest.config.js if needed to resolve workspace packages, or adjust the test imports to match current source.
      Files: `services/api-gateway/jest.config.js`, any test files requiring minor fixes.
      Verify: `npm test` exits 0, all suites green.

- [ ] 8. Create `.env.example`
      Create `services/api-gateway/.env.example` listing every env variable referenced in the codebase with safe placeholder values and inline comments explaining each.
      Variables to include: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `ORS_API_KEY`, `REDIS_URL`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_CALLBACK_URL`, `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN`, `FCM_SERVER_KEY`, `LOG_LEVEL`.
      Files: `services/api-gateway/.env.example`
      Verify: File exists and is valid shell syntax (`bash -n` passes on the file).

- [ ] 9. Create SETUP.md (root)
      Create `/SETUP.md` with step-by-step developer onboarding: prerequisites (Node 20, PostgreSQL 15, Redis), clone, `npm install` at root, copy `.env.example` to `.env`, run database migrations (`npm run migrate` inside `services/api-gateway`), run seed data (`npm run seed`), start dev server (`npm run dev` inside `services/api-gateway`), run tests. Include a Vercel deployment section and a quick curl smoke-test for the `/health` endpoint.
      Files: `SETUP.md` (repo root)
      Verify: File exists; `markdownlint SETUP.md` (or manual review) confirms valid markdown.

- [ ] 10. Extend root README.md
      Update the existing `/README.md` to add: architecture diagram (text-based), API reference table (all route prefixes + auth requirement + brief description), environment variable reference pointing to `.env.example`, link to SETUP.md, testing section showing `npm test` commands, and a troubleshooting section for common errors (DB connection, JWT_SECRET not set, port conflicts).
      Files: `README.md` (repo root)
      Verify: `cat README.md | grep -c '##'` returns ≥ 8 sections (architecture, api-reference, env-vars, setup, testing, deployment, troubleshooting, contributing).
