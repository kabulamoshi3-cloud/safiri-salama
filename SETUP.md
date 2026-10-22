# DalaSmart — Setup Guide

Complete step-by-step instructions for setting up the DalaSmart platform on your local machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** — [Download from nodejs.org](https://nodejs.org/)
- **npm 10+** — Comes with Node.js
- **PostgreSQL 15+** — [Download from postgresql.org](https://www.postgresql.org/download/)
- **Git** — [Download from git-scm.com](https://git-scm.com/)

**Optional:**
- **Redis** — For caching (not required for basic operation)

**Note:** No Go, Python, or Kafka installation is required for local development. The current implementation uses only Node.js.

---

## Clone and Install

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/daladala.git
   cd daladala
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   This installs all dependencies for the monorepo, including the API gateway and all client apps.

---

## Environment Setup

1. **Create the environment file:**

   ```bash
   cp services/api-gateway/.env.example services/api-gateway/.env
   ```

2. **Edit the environment file:**

   Open `services/api-gateway/.env` in your text editor and configure at minimum:

   - **`DATABASE_URL`** — Your PostgreSQL connection string:
     ```
     DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/dalasmart
     ```

   - **`JWT_SECRET`** — Generate a secure 64-character random string:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
     Copy the output and paste it as the value for `JWT_SECRET`.

   All other variables are optional. The API will work with just these two configured.

---

## Database Setup

1. **Create the database:**

   ```bash
   createdb dalasmart
   ```

   If the `createdb` command is not found, use `psql`:
   ```bash
   psql -U postgres
   CREATE DATABASE dalasmart;
   \q
   ```

2. **Run migrations:**

   ```bash
   cd services/api-gateway
   npm run migrate
   ```

   This creates all required tables and indexes.

3. **(Optional) Seed sample data:**

   ```bash
   npm run seed
   ```

   This populates the database with sample users, drivers, and trips for testing.

---

## Start the API

1. **Start the development server:**

   ```bash
   cd services/api-gateway
   npm run dev
   ```

   The server will start on the port specified in your `.env` file (default: `3000`).

2. **Expected output:**

   ```
   Server listening on http://localhost:3000
   Database connected
   ```

---

## Smoke Test

Verify the API is running correctly:

```bash
curl http://localhost:3000/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123
}
```

If you see this response, the API is running successfully!

---

## Run Tests

All tests use Jest with mocked database and external services (no live connections required).

```bash
cd services/api-gateway
npm test
```

**Expected output:**

```
PASS  src/__tests__/routes/auth.test.ts
PASS  src/__tests__/routes/tracking.test.ts
PASS  src/__tests__/routes/payments.test.ts
PASS  src/middleware/auth.test.ts
...
Test Suites: X passed, X total
Tests:       X passed, X total
```

To run tests in watch mode during development:

```bash
npm test -- --watch
```

---

## Deployment (Vercel)

DalaSmart is designed for **Vercel serverless** deployment. The API exports `default app` without calling `app.listen()` — Vercel handles the HTTP server automatically.

### Steps:

1. **Link your repository to Vercel:**

   ```bash
   npm install -g vercel
   vercel link
   ```

2. **Configure environment variables in Vercel:**

   - Navigate to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
   - Go to **Settings** → **Environment Variables**
   - Add all required variables from your local `.env` file:
     - `DATABASE_URL` (use a production PostgreSQL service)
     - `JWT_SECRET` (same secret as local, or generate a new one)
     - `NODE_ENV=production`
     - `CORS_ORIGIN` (your frontend URL)
     - Optional: payment provider credentials, push notification tokens, etc.

3. **Deploy:**

   ```bash
   vercel --prod
   ```

### Production Database Options:

- **Vercel Postgres** — Integrated with Vercel
- **Neon** — Serverless Postgres
- **Supabase** — Open-source Firebase alternative
- **Railway** — Simple PostgreSQL hosting
- **AWS RDS** — Amazon's managed database service

The connection pool automatically enables SSL when `NODE_ENV=production`.

---

## Troubleshooting

### Database connection refused

**Problem:** API fails to start with `ECONNREFUSED` or `Connection refused`.

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```
   If not running, start it:
   ```bash
   # macOS (Homebrew):
   brew services start postgresql

   # Linux (systemd):
   sudo systemctl start postgresql

   # Windows:
   # Start PostgreSQL service from Services panel
   ```

2. Check your `DATABASE_URL`:
   - Ensure the host, port, username, and password are correct
   - Default PostgreSQL port is `5432`
   - Try connecting with `psql` to verify credentials:
     ```bash
     psql postgresql://postgres:yourpassword@localhost:5432/dalasmart
     ```

### JWT authentication errors

**Problem:** All authenticated requests return `401 Unauthorized` or `Authentication not configured`.

**Solutions:**
1. Ensure `JWT_SECRET` is set in your `.env` file
2. The secret must be at least 32 characters (we recommend 64)
3. Restart the server after changing `.env` variables

### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
1. Change the `PORT` in your `.env` file to a different port (e.g., `3001`)
2. Or stop the process using port 3000:
   ```bash
   # Find the process:
   lsof -i :3000

   # Kill it:
   kill -9 <PID>
   ```

### Route calculation returns straight-line estimates

**Problem:** Route calculations always return `is_estimate: true` and simplified routes.

**Solution:** This is expected behavior when `ORS_API_KEY` is not set. To get turn-by-turn routing:
1. Sign up for a free OpenRouteService API key at [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
2. Add it to your `.env` file:
   ```
   ORS_API_KEY=your-key-here
   ```
3. Restart the server

The straight-line fallback is intentional and allows the app to work without external dependencies.

### Migrations fail

**Problem:** `npm run migrate` fails with permission errors or syntax errors.

**Solutions:**
1. Ensure your PostgreSQL user has `CREATE TABLE` permissions
2. Try running migrations as a superuser:
   ```bash
   psql -U postgres dalasmart < migrations/001_initial.sql
   ```
3. Check that the database exists:
   ```bash
   psql -U postgres -c "\l" | grep dalasmart
   ```

### Tests fail with "Cannot find module"

**Problem:** `npm test` fails with module resolution errors.

**Solutions:**
1. Ensure all dependencies are installed:
   ```bash
   cd services/api-gateway
   npm install
   ```
2. Clear Jest cache:
   ```bash
   npm test -- --clearCache
   ```

---

## Next Steps

- Read the [API Reference](./README.md#api-reference) to understand available endpoints
- Explore the [Features](./FEATURES_README.md) document for detailed feature documentation
- Check the [Testing Guide](./TESTING_GUIDE.md) for writing new tests
- Review the [Deployment Guide](./DEPLOYMENT_GUIDE.md) for production deployment

---

## Need Help?

- **Issues:** [GitHub Issues](https://github.com/yourusername/daladala/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/daladala/discussions)
- **Email:** support@dalasmart.co.tz
