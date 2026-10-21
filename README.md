# DalaSmart — Minibus / Daladala Ride-Hailing Platform

DalaSmart is a ride-hailing platform built for the **daladala** (minibus) transport ecosystem of Dar es Salaam, Tanzania. It connects passengers, daladala/bajaji/boda-boda drivers, fleet operators, and system administrators through dedicated mobile and web interfaces.

---

## Architecture (Current)

```
apps/passenger-app      ──┐
apps/driver-app         ──┤──► services/api-gateway (Node.js / TypeScript / Express)
apps/driver-dashboard   ──┤       ├── PostgreSQL  (pg pool, 15 migrations)
apps/operator-dashboard ──┤       ├── Redis       (optional cache)
apps/admin-panel        ──┤       └── External: OpenRouteService, M-Pesa / Airtel
apps/web-platform       ──┘            Money / Tigo Pesa / Halotel, Expo push / FCM
                                 
packages/shared-types             (TypeScript interfaces shared across apps)
```

### Planned (not yet built)
A Go fleet-tracker microservice, Python AI / trip-planner services, Kafka message bus, TimescaleDB, and Elasticsearch are planned for a future phase. The current implementation is a Node.js monolith in `services/api-gateway`.

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
│   ├── driver-dashboard/       # Vite SPA — advanced driver analytics dashboard
│   ├── operator-dashboard/     # Vite SPA — fleet operator web SPA
│   ├── admin-panel/            # Vite SPA — system administrator web SPA
│   └── web-platform/           # Vite SPA — responsive web app for passengers
│
├── services/
│   └── api-gateway/            # Node.js / TypeScript — the only built backend service
│       ├── src/
│       │   ├── routes/         # Express routers (26 route prefixes)
│       │   ├── middleware/     # auth, RBAC, validation, rate limiter, error handler
│       │   ├── database/       # pg Pool wrappers
│       │   └── __tests__/     # Jest + supertest route tests
│       ├── migrations/         # 15 numbered SQL migration files
│       └── scripts/            # run-migrations.ts, seed-data.ts
│
├── packages/
│   └── shared-types/           # TypeScript interfaces shared across apps
│
├── infrastructure/
│   └── database/               # DB schema reference and docker-compose
│
├── .env.example                # Environment variable template
├── SETUP.md                    # Step-by-step setup guide
└── README.md                   # This file
```

---

## API Reference

All routes are served from `services/api-gateway`. Public routes require no token; protected routes require `Authorization: Bearer <token>`.

| Prefix | Auth | Description |
|---|---|---|
| `GET /health` | None | Health check |
| `POST /api/v1/auth/register` | None | Register a new user |
| `POST /api/v1/auth/login` | None | Login, receive JWT |
| `GET /api/v1/auth/me` | Bearer | Get current user profile |
| `PATCH /api/v1/auth/me` | Bearer | Update profile |
| `POST /api/v1/auth/change-password` | Bearer | Change password |
| `GET /api/v1/trips` | Bearer | List / history of trips |
| `POST /api/v1/trips` | Bearer (passenger) | Create a trip request |
| `PATCH /api/v1/trips/:id/accept` | Bearer (driver) | Driver accepts trip |
| `PATCH /api/v1/trips/:id/driver-arriving` | Bearer (driver) | Driver en route |
| `PATCH /api/v1/trips/:id/arrived` | Bearer (driver) | Driver arrived at pickup |
| `PATCH /api/v1/trips/:id/start` | Bearer (driver) | Trip begins |
| `PATCH /api/v1/trips/:id/complete` | Bearer (driver) | Trip completed |
| `PATCH /api/v1/trips/:id/cancel` | Bearer | Cancel trip |
| `POST /api/v1/tracking/calculate-route` | None | Route + fare estimate |
| `POST /api/v1/tracking/driver/update` | Bearer | Driver location update |
| `GET /api/v1/tracking/driver/:id` | Bearer | Get driver location |
| `GET /api/v1/tracking/nearby` | Bearer | Online drivers near a point |
| `GET /api/v1/tracking/trip/:id` | Bearer | Live trip tracking |
| `GET /api/v1/payments/info` | Bearer | Available payment methods |
| `POST /api/v1/payments/pay` | Bearer | Initiate payment (M-Pesa / Airtel / Tigo / Halotel / Wallet / Cash) |
| `GET /api/v1/payments/status/:ref` | Bearer | Poll payment status |
| `GET /api/v1/payments/receipt/:ref` | Bearer | Get payment receipt |
| `POST /api/v1/ratings` | Bearer | Submit trip rating |
| `GET /api/v1/earnings` | Bearer (driver) | Driver earnings summary |
| `POST /api/v1/notifications/register` | Bearer | Register push token |
| `GET /api/v1/promo/available` | Bearer | List available promo codes |
| `POST /api/v1/promo/validate` | Bearer | Validate a promo code |
| `GET /api/v1/drivers` | Bearer | Driver list |
| `GET /api/v1/admin/*` | Bearer (admin) | Admin management endpoints |

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

Copy `.env.example` to `services/api-gateway/.env` and fill in the required values. See `.env.example` for the full annotated list. Minimum required for local development:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/dalasmart
JWT_SECRET=<64-char random hex string>
NODE_ENV=development
```

Optional (enables extra features):

```env
ORS_API_KEY=           # turn-by-turn routing; falls back to straight-line without it
MPESA_CONSUMER_KEY=    # M-Pesa STK push
AIRTEL_CLIENT_ID=      # Airtel Money
TIGO_MERCHANT_ACCOUNT= # Tigo Pesa
HALOTEL_MERCHANT_CODE= # Halotel
EXPO_ACCESS_TOKEN=     # Expo push notifications
FCM_SERVER_KEY=        # Firebase Cloud Messaging
```

---

## Setup

See **[SETUP.md](./SETUP.md)** for the full step-by-step guide. Quick summary:

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example services/api-gateway/.env
# Edit DATABASE_URL and JWT_SECRET

# 3. Migrate
cd services/api-gateway && npm run migrate

# 4. Run
npm run dev

# 5. Smoke test
curl http://localhost:3000/health
```

---

## Running Tests

Tests use Jest + supertest. The database and all external services (ORS, M-Pesa) are mocked — no live DB or internet connection required.

```bash
cd services/api-gateway
npm test
```

Expected output: all test suites pass.

---

## Features Completed

- User authentication — register, login, JWT, profile, password change
- Trip lifecycle with full state machine (REQUESTED → ACCEPTED → DRIVER_ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED)
- Real-time driver location tracking — in-memory store + PostgreSQL fallback, ORS route calculation, straight-line estimate fallback
- Payments — M-Pesa STK push, Airtel Money, Tigo Pesa, Halotel, DalaSmart Wallet, Cash, QR Code; receipts; status polling; P2P transfers; bill payments (LUKU/DAWASCO/DSTV/NHIF)
- Ratings and driver earnings
- Push notifications — Expo Push + FCM
- Promo codes and referral program
- Driver incentives and subscription plans
- Corporate accounts
- Food delivery, shop delivery, university marketplace
- Advertising, money transfer, insurance modules
- Admin panel API routes
- OTP, pricing, feature flags, upload, maps, chat support

---

## Known Limitations / Features Remaining

- WebSocket real-time updates are not yet implemented — clients poll the API
- The Go fleet-tracker, Python AI/ML engine, and separate microservices (payment-service, safety-module, notification-service) are scaffolded but not implemented
- Unit test coverage for trips, ratings, and earnings routes is not yet written
- No end-to-end tests

---

## Deployment

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for production deployment steps. The API exports `default app` (no `app.listen()`) for Vercel serverless.

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
