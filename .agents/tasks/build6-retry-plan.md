# Implementation Plan — Tests + Documentation (Retry)

## Exploration Findings

### What already exists
- `jest.config.js` — already present at `services/api-gateway/jest.config.js` with ts-jest preset, `testEnvironment: 'node'`, `runInBand: true`, matches `**/src/**/*.test.ts`. No `setupFiles` entry yet.
- No `src/__tests__/` directory exists — needs to be created.
- Three middleware test files already exist: `src/middleware/auth.test.ts`, `src/middleware/rbac.test.ts`, `src/middleware/validation.test.ts`.
- `supertest` and `@types/supertest` are **missing** from `package.json` (both deps and devDeps). Must install.

### Critical auth shape mismatch
The `src/middleware/auth.ts` sets `req.user = { id, type, phone }` (decoded JWT has `id`, `type`, `phone`).
The route files (`auth.ts`, `tracking.ts`, `payments.ts`) read `(req as any).user?.userId` and `(req as any).user?.userType`.
**This means the existing `authMiddleware` is mounted on `/api` routes — but the auth routes bypass it and set `.userId` directly from bcrypt/jwt in the route handler itself.**
JWT helper for tests must sign tokens with `{ userId, userType }` (the shape used in route handlers), not `{ id, type }` (the shape from `authMiddleware`). Route tests that go through `/api/v1/*` will have `authMiddleware` decode the token and put `id`/`type` on `req.user`, but the route then reads `.userId`. For test purposes, call protected routes directly as `app.use('/api', authMiddleware, routes)` — the JWT must be signed with both fields OR the test must stub the auth middleware. The safest approach: in test setup, set `JWT_SECRET=test-secret` and sign tokens that satisfy `authMiddleware` (fields `id`, `type`, `phone`) but also mock `req.user` at the supertest level by injecting a header. See step 2 for the exact approach.

### `payments.ts` export name
`payments.ts` exports `paymentsRouter` (named export), not a `default` export. The route index uses `safeUse('/v1/payments', () => require('./payments'))` with `mod.default || mod` — which falls through to the named export correctly. Tests must import app, not the router directly.

### `database/index.ts` vs `database/connection.ts`
- `tracking.ts` and `auth.ts` use `pool` from `../database/connection`.
- `payments.ts` uses `database` default from `../database` (which wraps a different Pool instance).
- Each test file must mock the correct module for its route.

### Existing documentation
Root already has `README.md`, `DEPLOYMENT_GUIDE.md`, `FEATURES_README.md`, `QUICKSTART.md`, `TESTING_GUIDE.md`, `LAUNCH_CHECKLIST.md`. The README describes a planned architecture that includes services not yet built (fleet-tracker in Go, AI engine in Python, etc.). `SETUP.md` does not exist yet.

---

## FEAT-001: Test Infrastructure + Route Tests

### Missing dependencies (install first)
`supertest` and `@types/supertest` are not in `package.json`. Install as devDependencies before writing any test.

---

### Plan

- [ ] 1. Install supertest and add jest setupFiles
      Run `cd services/api-gateway && npm install --save-dev supertest @types/supertest` to add the missing deps.
      Then add `"setupFiles": ["./src/__tests__/setup.ts"]` to `jest.config.js`.
      Also add `"testPathIgnorePatterns": ["dist"]` to `jest.config.js`.
      Files:
        - `services/api-gateway/package.json` (updated by npm install)
        - `services/api-gateway/jest.config.js` (add setupFiles + testPathIgnorePatterns)
      Verify: `cd services/api-gateway && npm test -- --listTests` exits 0 and lists the three existing middleware test files.

- [ ] 2. Create test setup file and JWT helper
      Create `src/__tests__/setup.ts`:
      ```ts
      process.env.JWT_SECRET = 'test-secret';
      process.env.NODE_ENV   = 'test';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_not_real';
      ```
      Create `src/__tests__/helpers/jwt.ts`:
      ```ts
      import jwt from 'jsonwebtoken';
      export const TEST_SECRET = 'test-secret';
      export const TEST_PASSENGER_ID = '11111111-1111-1111-1111-111111111111';
      export const TEST_DRIVER_ID    = '22222222-2222-2222-2222-222222222222';

      /** Signs a token matching what authMiddleware expects: { id, type, phone } */
      export function signAuthToken(userId: string, userType: 'passenger'|'driver'|'admin' = 'passenger'): string {
        return jwt.sign({ id: userId, type: userType, phone: '255744000001' }, TEST_SECRET, { expiresIn: '1h' });
      }

      /** Signs a token matching what route handlers expect (userId/userType).
       *  Used for routes that read (req as any).user?.userId directly. */
      export function signRouteToken(userId: string, userType: string = 'passenger'): string {
        return jwt.sign({ userId, userType, id: userId, type: userType, phone: '255744000001' }, TEST_SECRET, { expiresIn: '1h' });
      }
      ```
      Use `signRouteToken` for auth route tests (which read `.userId`).
      Use `signAuthToken` for any route mounted behind `authMiddleware`.
      Files: `services/api-gateway/src/__tests__/setup.ts`, `services/api-gateway/src/__tests__/helpers/jwt.ts`
      Verify: `cd services/api-gateway && npm test -- --testPathPattern=helpers` compiles and exits 0 (no test cases needed in this file; it just type-checks).

- [ ] 3. Write auth route tests
      Create `src/__tests__/routes/auth.test.ts`.
      Import `supertest` and `app` from `../../index`.
      Mock `pool` from `../../database/connection` with `jest.mock('../../database/connection', ...)`.
      The mock must return a `pool` object with a `.query` method that is a `jest.fn()`.

      **Endpoint coverage:**
      ```
      POST /api/v1/auth/register
        - 201: pool.query returns [] for SELECT (no existing user), then returns a user row for INSERT
        - 400: missing phone
        - 400: missing password
        - 400: missing userType
        - 400: phone already exists (pool returns row on first SELECT)

      POST /api/v1/auth/login
        - 200: user found, status=active, bcrypt matches
        - 400: missing phone or password
        - 401: user not found (empty rows)
        - 401: wrong password
        - 403: user status != 'active'

      GET /api/v1/auth/me
        - 401: no Authorization header
        - 200: valid Bearer token (set req.user.userId via signRouteToken); pool returns user row
        - Note: this route reads (req as any).user?.userId — the token's 'userId' field.
          Since authMiddleware decodes to 'id', use signRouteToken which sets both 'userId' AND 'id'.

      PATCH /api/v1/auth/me
        - 401: no token
        - 200: name update (pool returns updated row)
        - 400: no fields to update (body = {})

      POST /api/v1/auth/change-password
        - 401: no token
        - 200: correct currentPassword (pool returns hashed password that bcrypt matches)
        - 401: wrong currentPassword
      ```

      **DB mock pattern (use for all route tests that touch pool):**
      ```ts
      jest.mock('../../database/connection');
      import { pool } from '../../database/connection';
      const mockQuery = pool.query as jest.Mock;

      beforeEach(() => mockQuery.mockReset());
      ```
      Then in each test: `mockQuery.mockResolvedValueOnce({ rows: [...], rowCount: 1 })`.

      Files: `services/api-gateway/src/__tests__/routes/auth.test.ts`
      Verify: `cd services/api-gateway && npm test -- --testPathPattern=routes/auth` — all cases pass, 0 failures.

- [ ] 4. Write tracking route tests
      Create `src/__tests__/routes/tracking.test.ts`.
      Mock `../../database/connection` (for `pool`) and `axios` (for ORS calls).

      **Endpoint coverage:**
      ```
      POST /api/v1/tracking/driver/update
        - 401: no token
        - 400: missing latitude (lat/lng)
        - 200 {status:'ok'}: valid lat/lng with token; pool.query mock can reject (fire-and-forget)

      POST /api/v1/tracking/driver/location
        - 401: no token
        - 400: missing lat or lng
        - 200 {status:'ok', trip_id}: valid body with trip_id

      GET /api/v1/tracking/driver/:driverId
        - 401: no token
        - 200 (source:'realtime'): POST /driver/update first to seed in-memory, then GET same driverId
        - 404: driverId not in memory, pool.query returns empty rows

      GET /api/v1/tracking/nearby?lat=X&lng=Y
        - 400: missing lat
        - 400: missing lng
        - 200 {drivers:[...], count:N}: returns array (may come from mock fallback)

      POST /api/v1/tracking/driver/offline
        - 401: no token
        - 200 {status:'offline'}: valid token

      POST /api/v1/tracking/calculate-route
        (NO auth required — public endpoint)
        - 400: missing from_lat
        - 400: missing to_lng
        - 200 with is_estimate=true: no ORS_API_KEY in test env → straight-line fallback
          Response shape MUST include: distance_km, duration_minutes, fare_tzs, polyline_coords, steps, is_estimate
        - 200 with is_estimate=false: mock axios.post to return valid ORS GeoJSON; ORS_API_KEY set

      GET /api/v1/tracking/route?trip_id=X
        - 400: missing trip_id param
        - 404: unknown trip_id
        - 200: POST /calculate-route with trip_id first, then GET /route?trip_id=same

      GET /api/v1/tracking/trip/:tripId
        - 401: no token
        - 200: pool.query rejects → mock fallback data returned (shape includes driver_lat, driver_lng, eta_minutes)

      GET /api/v1/tracking/nearby-drivers?lat=X&lng=Y
        - 400: missing lat
        - 400: missing lng
        - 200: pool.query rejects → mock driver list returned

      GET /api/v1/tracking/traffic?lat=X&lng=Y
        - 400: missing lat
        - 400: missing lng
        - 200: pool.query rejects → mock segments returned
      ```

      **axios mock pattern:**
      ```ts
      jest.mock('axios');
      import axios from 'axios';
      const mockAxiosPost = axios.post as jest.Mock;
      // ORS success mock:
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          features: [{
            properties: {
              summary: { distance: 5000, duration: 600 },
              segments: [{ steps: [{ instruction: 'Turn left', distance: 100 }] }]
            },
            geometry: { coordinates: [[39.2, -6.8], [39.25, -6.79]] }
          }]
        }
      });
      ```

      Files: `services/api-gateway/src/__tests__/routes/tracking.test.ts`
      Verify: `cd services/api-gateway && npm test -- --testPathPattern=routes/tracking` — all cases pass.

- [ ] 5. Write payments route tests
      Create `src/__tests__/routes/payments.test.ts`.
      `payments.ts` uses `database` from `../../database` (not `../../database/connection`).
      Mock it:
      ```ts
      jest.mock('../../database');
      import database from '../../database';
      const mockGetClient = database.getClient as jest.Mock;
      ```
      `getClient` returns a mock db client with `query`, `release`, methods.
      Helper:
      ```ts
      function makeMockClient(responses: any[]) {
        let call = 0;
        return {
          query: jest.fn().mockImplementation(() => Promise.resolve(responses[call++] ?? { rows: [], rowCount: 0 })),
          release: jest.fn(),
        };
      }
      ```

      **Endpoint coverage:**
      ```
      GET /api/v1/payments/info
        - 401: no token
        - 200: token present; db.query returns user row with phone='255744123456', wallet_balance=5000
          Response must include: registered_phone, payment_methods array, wallet_balance

      POST /api/v1/payments/pay
        - 401: no token
        - 400: amount < 100 (amount: 50)
        - 400: invalid method (method: 'bitcoin')
        - 400: context_id is not a UUID (context_id: 'abc-123')
        - 400: mismatch — Airtel number (0685xxx) + method:'mpesa'
        - Cash path: method='cash', amount=1000 → 201 status='pending_confirmation', reference present
          (db.query mock: first call returns user row; second call resolves INSERT)
        - Wallet path sufficient balance: amount=1000, walletBalance=5000 → 200 status='completed'
          (db.query mock returns: user row with wallet_balance=5000, then BEGIN, UPDATE, creditPayee queries, INSERT, COMMIT)
        - Wallet path insufficient: amount=10000, walletBalance=1000 → 400 with 'shortfall' key
        - M-Pesa path: method='mpesa', phone not provided (use registered 0744xxx) →
          200 status='pending', poll_url present
          (fireStkPush is just console.log — no need to mock it)

      GET /api/v1/payments/status/:reference
        - 401: no token
        - 404: db returns empty rows
        - 200: db returns tx row with status='pending', expires_at=future

      GET /api/v1/payments/receipt/:reference
        (read the end of payments.ts for the receipt endpoint shape)
        - 401: no token
        - 404: db returns empty rows
        - 200: db returns completed tx row; response includes reference, amount, method
      ```

      **Important:** `payments.ts` also calls `database.query` (the module-level export) for status expiry in the status endpoint. The mock must cover `database.query` too:
      ```ts
      (database.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      ```

      Files: `services/api-gateway/src/__tests__/routes/payments.test.ts`
      Verify: `cd services/api-gateway && npm test -- --testPathPattern=routes/payments` — all cases pass.

- [ ] 6. Run full test suite and fix remaining failures
      Run `npm test` from `services/api-gateway`. The existing middleware tests (`auth.test.ts`, `rbac.test.ts`, `validation.test.ts`) may fail if they import from `@dalasmart/shared-types` or rely on a different `req.user` shape. Check their imports and add a `moduleNameMapper` in `jest.config.js` if needed:
      ```js
      moduleNameMapper: {
        '^@dalasmart/shared-types(.*)$': '<rootDir>/../../packages/shared-types/src$1',
      }
      ```
      Fix any TypeScript type errors in newly created test files (common: `jest.fn()` return type on pool.query).
      Files: `services/api-gateway/jest.config.js`, any test file needing minor fixes.
      Verify: `cd services/api-gateway && npm test` exits 0, all suites green.

---

## FEAT-002: Documentation

### What already exists at the root
`README.md` already exists with a planned architecture (includes unbuilt services like fleet-tracker in Go, AI engine in Python). `DEPLOYMENT_GUIDE.md`, `QUICKSTART.md`, `TESTING_GUIDE.md`, `LAUNCH_CHECKLIST.md`, `FEATURES_README.md` also exist. **Do not describe services that do not exist.** The README must be updated to reflect only what is actually built.

**Actually-built features (from reading the route index and confirmed route files):**
- Auth (register, login, JWT, profile)
- Trips (create, status, assign driver, complete, cancel, rate, nearby)
- Driver management
- Real-time tracking (in-memory + DB fallback, ORS route calculation with straight-line estimate fallback)
- Payments (M-Pesa, Airtel Money, Tigo Pesa, Halotel, DalaSmart Wallet, Cash, QR Code; receipts; status polling; P2P transfer; bill payments: LUKU/DAWASCO/DSTV/NHIF)
- Push notifications (Expo/FCM)
- Ratings and earnings
- Promo codes and referral
- Driver incentives and subscription
- Corporate accounts
- Food delivery, shop delivery, university marketplace
- Advertising, money transfer, insurance
- Upload, maps, chat, pricing, OTP, feature flags
- Admin panel routes

**Not built / do not mention:**
- fleet-tracker microservice (Go)
- AI/ML engine (Python/FastAPI)
- Separate payment-service microservice (payments are in api-gateway)
- safety-module microservice
- Kafka message bus
- TimescaleDB
- Elasticsearch

---

### Plan

- [ ] 7. Create `services/api-gateway/.env.example`
      Create the file listing every `process.env.*` reference found in the codebase.
      Variables found by reading `index.ts`, `database/connection.ts`, `database/index.ts`, `routes/tracking.ts`, `routes/payments.ts`, `middleware/auth.ts`, `middleware/rateLimiter.ts`:

      ```env
      # Server
      NODE_ENV=development
      PORT=3000

      # Database (PostgreSQL)
      # Format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
      DATABASE_URL=postgresql://postgres:password@localhost:5432/dalasmart

      # Authentication
      # Generate with: node -e "require('crypto').randomBytes(64).toString('hex')|head -c64"
      JWT_SECRET=change-me-generate-a-random-64-char-string

      # CORS
      # Use * for development; set to your frontend URL in production
      CORS_ORIGIN=http://localhost:3001

      # Rate limiting
      RATE_LIMIT_WINDOW_MS=900000
      RATE_LIMIT_MAX_REQUESTS=100

      # OpenRouteService (optional — falls back to straight-line estimate if absent)
      # Get a free key at https://openrouteservice.org/dev/#/signup
      ORS_API_KEY=

      # Redis (optional — not required for basic operation)
      REDIS_URL=redis://localhost:6379

      # M-Pesa / Vodacom TZ
      MPESA_CONSUMER_KEY=
      MPESA_CONSUMER_SECRET=
      MPESA_PASSKEY=
      MPESA_SHORTCODE=
      MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/payments/webhook/mpesa

      # Airtel Money TZ
      AIRTEL_CLIENT_ID=
      AIRTEL_CLIENT_SECRET=

      # Tigo Pesa TZ
      TIGO_MERCHANT_ACCOUNT=
      TIGO_MERCHANT_PIN=

      # Halotel TZ
      HALOTEL_MERCHANT_CODE=

      # Push Notifications (one or both)
      EXPO_ACCESS_TOKEN=
      FCM_SERVER_KEY=

      # Logging
      LOG_LEVEL=info
      ```

      Files: `services/api-gateway/.env.example`
      Verify: `bash -n services/api-gateway/.env.example` exits 0 (valid shell syntax — requires no `=` in values, which the template satisfies).

- [ ] 8. Create `SETUP.md` at the repo root
      Create `/SETUP.md`. Content must be accurate — describe only what is actually buildable.

      Sections:
      1. **Prerequisites** — Node.js 20+, npm 10+, PostgreSQL 15+, Git. Redis is optional. No Go, Python, or Kafka required.
      2. **Clone and install** — `git clone`, `npm install` at repo root.
      3. **Environment setup** — `cp services/api-gateway/.env.example services/api-gateway/.env`, then edit at minimum `DATABASE_URL` and `JWT_SECRET`.
      4. **Database setup** — create database (`createdb dalasmart`), run migrations (`cd services/api-gateway && npm run migrate`), optionally seed data (`npm run seed`).
      5. **Start the API** — `cd services/api-gateway && npm run dev`. Server starts on `PORT` (default 3000).
      6. **Smoke test** — `curl http://localhost:3000/health` returns `{"status":"healthy",...}`.
      7. **Run tests** — `cd services/api-gateway && npm test`.
      8. **Deployment (Vercel)** — link repo, set env vars in Vercel dashboard, deploy. Note that `app.listen()` is NOT called in `index.ts` — the app exports `default app` for Vercel serverless.
      9. **Troubleshooting** — DB connection refused (check DATABASE_URL, ensure postgres is running), JWT errors (check JWT_SECRET is set), port conflict (set PORT env var), ORS route calculation is straight-line estimate (set ORS_API_KEY).

      Files: `SETUP.md` (repo root)
      Verify: File exists and renders valid markdown (no broken headers). Run `node -e "require('fs').readFileSync('SETUP.md','utf8').split('#').length > 8 && console.log('OK')"` from repo root.

- [ ] 9. Update root `README.md`
      The existing README describes an aspirational architecture with unbuilt services. Replace the monorepo structure diagram and tech stack table with the **actual current state**. Keep a brief "planned future" note so the vision is not lost.

      Add or replace these sections:
      ```
      ## Architecture (Current)
      ## API Reference
      ## Environment Variables
      ## Setup
      ## Running Tests
      ## Deployment
      ## Troubleshooting
      ## Contributing
      ```

      **Architecture section** — Text diagram showing only what exists:
      ```
      apps/passenger-app  ──┐
      apps/driver-app     ──┤──► services/api-gateway (Node.js/TS, Express)
      apps/operator-dashboard ──┤       ├── PostgreSQL (pg pool)
      apps/admin-panel    ──┘       ├── Redis (optional cache)
                                    └── External: ORS, M-Pesa, Airtel, Expo/FCM
      ```

      **API Reference table** — one row per route prefix, showing path, auth requirement, brief description. Include all 26 route prefixes registered in `routes/index.ts`.

      **Do NOT list** the Go fleet-tracker, Python AI engine, Kafka, TimescaleDB, or Elasticsearch as existing — they are planned. One sentence under a "Planned" subsection is fine.

      Files: `README.md` (repo root — update in-place, do not delete existing content wholesale; extend and correct it)
      Verify: `grep -c '^## ' README.md` returns ≥ 8 (at least 8 top-level sections).

---

## Dependency summary

| Step | Depends on |
|------|-----------|
| 1    | nothing   |
| 2    | 1 (jest.config.js setupFiles must exist before setup.ts is loaded) |
| 3    | 2         |
| 4    | 2         |
| 5    | 2         |
| 6    | 3, 4, 5   |
| 7    | nothing (documentation, independent) |
| 8    | nothing (documentation, independent) |
| 9    | nothing (documentation, independent) |

Steps 7–9 are fully independent of steps 1–6 and can be done in any order relative to them.
