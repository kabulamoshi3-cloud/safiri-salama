# DalaSmart Setup Guide

Step-by-step instructions to get the DalaSmart API and mobile apps running locally.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 | Use [nvm](https://github.com/nvm-sh/nvm) for easy version management |
| npm | 10 | Bundled with Node.js 20 |
| PostgreSQL | 15 | Or use a Docker container |
| Git | any | |
| Expo CLI | latest | `npm install -g expo-cli` (for mobile apps only) |

No Go, Python, or Docker is required to run the API.

---

## 1. Clone the Repository

```bash
git clone <your-repo-url> daladala
cd daladala
```

---

## 2. Install Dependencies

```bash
# Install root and workspace dependencies
npm install

# Install api-gateway dependencies explicitly (if workspace hoisting skips it)
cd services/api-gateway
npm install
cd ../..
```

---

## 3. Environment Setup

```bash
# Copy the example file
cp .env.example services/api-gateway/.env

# Open and edit the required values
#   DATABASE_URL  — your PostgreSQL connection string
#   JWT_SECRET    — run: node -e "require('crypto').randomBytes(64).toString('hex')"
#   ORS_API_KEY   — optional; see section 7 below
nano services/api-gateway/.env
```

At minimum you must set `DATABASE_URL` and `JWT_SECRET`. Everything else is optional for local development.

---

## 4. Database Setup

### Create the database

```bash
# Using psql client (replace postgres with your DB user if different)
createdb dalasmart

# Or with psql:
psql -U postgres -c "CREATE DATABASE dalasmart;"
```

### Run migrations

```bash
cd services/api-gateway
npm run migrate
```

This runs the numbered SQL files in `migrations/` in order:

```
001_base_schema.sql       — core tables (users, trips, drivers, vehicles)
008_add_features.sql      — promo codes, referrals, subscriptions, support
009_add_tracking_features — driver location, route cache
010_add_extended_features — food delivery, shop, corporate, advertising, etc.
011_payments.sql          — transactions, wallets, payment_splits
012_trip_state_machine.sql — trip_state_logs, index updates
013_admin_settings.sql    — admin tables
014_push_tokens.sql       — push_tokens, notification_log
015_ratings_earnings.sql  — ratings, driver_earnings
```

### Seed sample data (optional)

```bash
npm run seed
```

Inserts sample users, drivers, and vehicles so you can test without creating accounts manually.

---

## 5. Start the API

```bash
cd services/api-gateway
npm run dev
```

The server starts on `http://localhost:3000` (or the `PORT` you set in `.env`).

Nodemon watches for TypeScript changes and restarts automatically.

---

## 6. Smoke Test

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

# Auth register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"255744111111","password":"test1234","userType":"passenger","name":"Amina"}'
# Expected: 201 with user + token
```

---

## 7. Getting an ORS API Key (optional)

OpenRouteService provides free turn-by-turn routing:

1. Sign up at [openrouteservice.org/dev](https://openrouteservice.org/dev/#/signup)
2. Go to **Dashboard → Tokens → Request a token** (free tier: 2 000 requests/day)
3. Copy the token into `ORS_API_KEY` in your `.env`

Without the key the API returns straight-line distance estimates instead of road-based routes.

---

## 8. Mobile App Setup

### Passenger app

```bash
cd apps/passenger-app
npm install
npx expo start
```

### Driver app

```bash
cd apps/driver-app
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in each app's `.env` (or `app.config.js` extra) to point at your running API:

```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api/v1
```

Use your machine's LAN IP (not `localhost`) when connecting from a physical device or Android emulator.

---

## 9. Admin Panel Setup

```bash
cd apps/admin-panel
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 10. Mobile Money Sandbox Setup

All four providers offer sandbox environments for testing:

| Provider | Sandbox docs |
|---|---|
| M-Pesa (Vodacom TZ) | [developer.vodacom.co.tz](https://developer.vodacom.co.tz) |
| Airtel Money | [developers.airtel.africa](https://developers.airtel.africa) |
| Tigo Pesa | Contact Tigo developer relations |
| Halotel | Contact Halotel merchant services |

Populate the corresponding `MPESA_*`, `AIRTEL_*`, `TIGO_*`, `HALOTEL_*` keys in `.env` with your sandbox credentials. In development without credentials, payment initiation calls still work — they log the STK push to the console instead of calling the real provider API.

---

## 11. Running Tests

```bash
cd services/api-gateway
npm test
```

Tests mock the database and external services so no live PostgreSQL or internet connection is required.

---

## 12. Deployment (Vercel)

The API is designed for Vercel serverless deployment:

1. Connect the repo to Vercel.
2. Set the **Root Directory** to `services/api-gateway`.
3. Add all environment variables from `.env.example` in the Vercel dashboard.
4. Deploy.

`app.listen()` is intentionally **not** called in `src/index.ts` — the file exports `default app` for Vercel's serverless runtime. Vercel handles the port binding automatically.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED` on DB queries | PostgreSQL not running | `pg_ctl start` or `docker start <pg-container>` |
| `JWT_SECRET not configured` 500 | `.env` not loaded | Check `services/api-gateway/.env` exists and has `JWT_SECRET=...` |
| `Invalid or expired token` 401 | Wrong secret or expired token | Ensure `JWT_SECRET` matches between sign and verify; re-login |
| Port 3000 in use | Another process on port 3000 | Set `PORT=3001` in `.env` |
| Route calculation is a straight line | No ORS key | Set `ORS_API_KEY` (see section 7) |
| `supertest` not found during `npm test` | devDeps not installed | `cd services/api-gateway && npm install` |
