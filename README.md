# Safiri Haraka — Minibus / Daladala Ride-Hailing Platform

Safiri Haraka is a ride-hailing platform built for the **daladala** (minibus) transport ecosystem of Dar es Salaam, Tanzania. It connects passengers, daladala/bajaji/boda-boda drivers, fleet operators, and system administrators through dedicated mobile and web interfaces.

---

## Architecture (Current)

```
apps/passenger-app      ──┐
apps/driver-app         ──┤──► services/api-gateway (Node.js/TS, Express)
apps/operator-dashboard ──┤        ├── PostgreSQL (pg pool)
apps/admin-panel        ──┘        ├── Redis (optional cache)
                                   └── External: ORS, M-Pesa, Airtel, Expo/FCM
```

**Current implementation:** Single Node.js/TypeScript API gateway serving all client apps. PostgreSQL provides data persistence. Redis is optional for caching. External services include OpenRouteService for routing, mobile money providers (M-Pesa, Airtel Money, Tigo Pesa, Halotel), and push notification services (Expo Push, Firebase Cloud Messaging).

### Planned Future Architecture

The following services are planned but not yet implemented:
- **Go fleet-tracker** — High-throughput GPS ingestion and real-time tracking
- **Python AI engine** — ML-based trip planning, demand prediction, and traffic forecasting
- **Kafka** — Message bus for event streaming
- **TimescaleDB** — Time-series GPS and analytics data
- **Elasticsearch** — Full-text search for trips, drivers, and locations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Passenger App | React Native (Expo) |
| Driver App | React Native (Expo) |
| Driver Dashboard | React + Vite |
| Operator Dashboard | React + Vite |
| Admin Panel | React + Vite |
| Web Platform | React + Vite |
| API | Node.js 20, TypeScript, Express |
| Database | PostgreSQL 15 |
| Auth | JWT (HS256, `jsonwebtoken`) |
| Password hashing | bcryptjs |
| Routing / Maps | OpenStreetMap tiles + OpenRouteService (with straight-line fallback) |
| Mobile Money | M-Pesa, Airtel Money, Tigo Pesa, Halotel |
| Push Notifications | Expo Push + Firebase Cloud Messaging |
| Deployment | Vercel serverless |

---

## Monorepo Structure

```
daladala/
├── apps/
│   ├── passenger-app/          # React Native (Expo) — Android & iOS passenger app
│   ├── driver-app/             # React Native (Expo) — Android & iOS driver app
│   ├── operator-dashboard/     # Vite SPA — fleet operator web interface
│   ├── admin-panel/            # Vite SPA — system administrator web interface
│   └── web-platform/           # Vite SPA — responsive web app for passengers
│
├── services/
│   └── api-gateway/            # Node.js/TypeScript Express API (only implemented backend)
│       ├── src/
│       │   ├── routes/         # Express routers (30+ route prefixes)
│       │   ├── middleware/     # auth, RBAC, validation, rate limiter, error handler
│       │   ├── database/       # pg Pool wrappers
│       │   ├── services/       # Business logic (GPS validation, traffic prediction)
│       │   └── __tests__/      # Jest + supertest tests
│       ├── migrations/         # SQL migration files
│       ├── scripts/            # run-migrations.ts, seed-data.ts
│       └── .env.example        # Environment variable template
│
├── packages/
│   └── shared-types/           # TypeScript interfaces shared across apps
│
├── infrastructure/
│   └── database/               # DB schema reference and docker-compose
│
├── SETUP.md                    # Step-by-step setup guide (see this first!)
└── README.md                   # This file
```

---

## API Reference

All routes are served from `services/api-gateway`. Public routes require no token; protected routes require `Authorization: Bearer <token>`.

| Route Prefix | Auth | Description |
|---|---|---|
| `/health` | None | Health check endpoint |
| `/api/v1/status` | None | API status and feature list |
| `/api/v1/auth` | Mixed | Authentication (register, login, profile, change password) |
| `/api/v1/trips` | Bearer | Trip lifecycle management (create, accept, start, complete, cancel, rate) |
| `/api/v1/drivers` | Bearer | Driver management and availability |
| `/api/v1/tracking` | Mixed | Real-time GPS tracking, driver location updates, route calculation (ORS with fallback) |
| `/api/v1/payments` | Bearer | Payment processing (M-Pesa, Airtel, Tigo, Halotel, Wallet, Cash, QR Code; receipts; bill payments) |
| `/api/v1/ratings` | Bearer | Trip ratings and reviews |
| `/api/v1/earnings` | Bearer | Driver earnings, payouts, and revenue reports |
| `/api/v1/notifications` | Bearer | Push notification registration (Expo Push, FCM) |
| `/api/v1/promo` | Bearer | Promo code management and validation |
| `/api/v1/referral` | Bearer | Referral program and rewards |
| `/api/v1/driver-incentives` | Bearer | Driver incentive programs and bonuses |
| `/api/v1/subscription` | Bearer | Subscription plans and billing |
| `/api/v1/support` | Bearer | Customer support tickets and chat |
| `/api/v1/corporate` | Bearer | Corporate account management |
| `/api/v1/food` | Bearer | Food delivery orders and restaurant management |
| `/api/v1/shop` | Bearer | Shop delivery orders and inventory |
| `/api/v1/advertising` | Bearer | In-app advertising campaigns |
| `/api/v1/money` | Bearer | P2P money transfers and wallet top-ups |
| `/api/v1/insurance` | Bearer | Trip insurance and claims |
| `/api/v1/university` | Bearer | University marketplace for students |
| `/api/v1/upload` | Bearer | File uploads (Cloudinary integration) |
| `/api/v1/maps` | Bearer | Map data, tiles, and geocoding |
| `/api/v1/chat` | Bearer | In-app chat support between passengers and drivers |
| `/api/v1/pricing` | Bearer | Dynamic pricing and fare calculation |
| `/api/v1/features` | Bearer | Feature flags and A/B testing |
| `/api/v1/otp` | Mixed | OTP verification (SMS via Africa's Talking) |
| `/api/v1/admin` | Bearer (admin) | Admin management endpoints and dashboards |

For detailed endpoint documentation, see route files in `services/api-gateway/src/routes/`.

---

## Trip State Machine

```
                  ┌──────────────────────────────────────────┐
                  │ passenger cancels from any non-terminal  │
                  │ state                                    │
                  ▼                                          │
              REQUESTED ──(driver accepts)──► ACCEPTED       │
                  │                              │           │
                  │                     (driver sets)        │
                  │                              ▼           │
                  │                     DRIVER_ARRIVING      │
                  │                              │           │
                  │                     (driver arrives)     │
                  │                              ▼           │
                  │                           ARRIVED        │
                  │                              │           │
                  │                     (driver starts)      │
                  │                              ▼           │
                  │                         IN_PROGRESS      │
                  │                              │           │
                  │                    (driver completes)    │
                  │                              ▼           │
                  └─────────────────────────► COMPLETED      │
                                                             │
CANCELLED ◄──────────────────────────────────────────────────┘
```

`COMPLETED` and `CANCELLED` are terminal states — no further transitions allowed.

---

## Environment Variables

The API requires specific environment variables to run. See `services/api-gateway/.env.example` for the complete list with descriptions.

### Required (minimum for local development)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/safiriharaka` |
| `JWT_SECRET` | 64-character random hex string | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `NODE_ENV` | Environment | `development` / `production` |
| `PORT` | Server port | `3000` |

### Optional (enables additional features)

| Variable | Description |
|---|---|
| `ORS_API_KEY` | OpenRouteService API key for turn-by-turn routing (falls back to straight-line estimate without it) |
| `REDIS_URL` | Redis connection string for caching |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc. | M-Pesa payment integration |
| `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET` | Airtel Money integration |
| `TIGO_MERCHANT_ACCOUNT`, `TIGO_MERCHANT_PIN` | Tigo Pesa integration |
| `HALOTEL_MERCHANT_CODE` | Halotel payment integration |
| `EXPO_ACCESS_TOKEN` | Expo push notifications |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging |
| `CORS_ORIGIN` | CORS allowed origin (use `*` for development) |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Rate limiting configuration |
| `LOG_LEVEL` | Logging verbosity (`info`, `debug`, `error`) |

---

## Setup

See **[SETUP.md](./SETUP.md)** for the complete step-by-step setup guide with troubleshooting.

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp services/api-gateway/.env.example services/api-gateway/.env
# Edit DATABASE_URL and JWT_SECRET in services/api-gateway/.env

# 3. Create database and run migrations
createdb safiriharaka
cd services/api-gateway && npm run migrate

# 4. Start development server
npm run dev

# 5. Verify it's running
curl http://localhost:3000/health
```

Expected response from health check:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123
}
```

---

## Running Tests

All tests use Jest + supertest with mocked database and external services (ORS, M-Pesa, Airtel, etc.). No live database connection or internet access is required to run tests.

```bash
cd services/api-gateway
npm test
```

Expected output:
```
PASS  src/__tests__/auth.test.ts
PASS  src/__tests__/health.test.ts
...
Test Suites: X passed, X total
Tests:       X passed, X total
```

---

## Deployment

Safiri Haraka API is designed for **Vercel serverless** deployment. The application exports `default app` without calling `app.listen()` — Vercel handles the HTTP server automatically.

### Deployment Steps

1. **Link repository to Vercel:**
   ```bash
   vercel link
   ```

2. **Configure environment variables:**
   - Navigate to Project Settings → Environment Variables in Vercel dashboard
   - Add all required variables from your `.env` file:
     - `DATABASE_URL` (production PostgreSQL connection string)
     - `JWT_SECRET` (same 64-char hex string)
     - `NODE_ENV=production`
     - `CORS_ORIGIN` (your frontend URL)
     - Optional: payment provider credentials, push notification tokens, etc.

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Production Database

For production, use a managed PostgreSQL service:
- **Vercel Postgres** (integrated)
- **Neon** (serverless Postgres)
- **Supabase**
- **Railway**
- **AWS RDS**

Ensure your production `DATABASE_URL` uses SSL: the connection pool automatically enables SSL when `NODE_ENV=production`.

---

## Troubleshooting

See [SETUP.md](./SETUP.md#troubleshooting) for detailed troubleshooting steps. Common issues:

| Issue | Solution |
|---|---|
| Database connection refused | Verify PostgreSQL is running (`pg_isready`), check `DATABASE_URL` |
| JWT authentication errors | Ensure `JWT_SECRET` is set and at least 32 characters |
| Port already in use | Change `PORT` in `.env` or stop the process using that port |
| Routes return straight-line estimates | Set `ORS_API_KEY` for turn-by-turn routing (optional) |

---

---

## Features Implemented

### Core Features
- **Authentication** — User registration, login, JWT tokens, profile management, password change
- **Trip Management** — Complete state machine (REQUESTED → ACCEPTED → DRIVER_ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED)
- **Real-time Tracking** — Driver location updates, in-memory store with PostgreSQL fallback, nearby driver search
- **Route Calculation** — OpenRouteService integration with straight-line fallback
- **Payments** — M-Pesa, Airtel Money, Tigo Pesa, Halotel STK push; Safiri Haraka Wallet; Cash; QR Code payments
- **Payment Features** — Receipts, status polling, P2P transfers, bill payments (LUKU, DAWASCO, DSTV, NHIF)
- **Ratings & Reviews** — Trip rating system
- **Driver Earnings** — Earnings tracking and payout management
- **Push Notifications** — Expo Push and Firebase Cloud Messaging integration

### Business Features
- Promo codes and validation
- Referral program
- Driver incentive programs
- Subscription plans
- Corporate account management
- Food delivery orders
- Shop delivery orders
- University marketplace
- In-app advertising
- P2P money transfers
- Trip insurance
- Chat support
- Dynamic pricing
- Feature flags
- OTP verification
- File uploads
- Admin management panel

### Known Limitations
- **WebSocket** — Real-time updates use polling; WebSocket not yet implemented
- **Microservices** — Planned Go fleet-tracker, Python AI engine, Kafka, TimescaleDB, and Elasticsearch are not yet built
- **Test Coverage** — Some route tests not yet written
- **E2E Tests** — No end-to-end tests currently

---

## Contributing

1. Fork and create a feature branch.
2. Follow the existing TypeScript style (strict: false, ESLint configured).
3. Add or update tests in `services/api-gateway/src/__tests__/`.
4. Ensure `npm test` passes before opening a PR.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## Language Support

All user-facing text in the API responses is in Swahili (sw) where contextually appropriate (e.g., trip status messages, push notification body text). Client apps implement `react-i18next` for English/Swahili switching.
