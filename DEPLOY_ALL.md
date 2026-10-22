# Deploy DalaSmart: web, API, database, tracking, Android, and iPhone

This repository is prepared for a low-cost pilot. Provider dashboards still need to be connected to accounts you control. Do not use the sample values below as production credentials.

## What deploys where

| Part | Repository path | Target |
| --- | --- | --- |
| API | `services/api-gateway` | Existing Vercel project `safiri-salama` |
| Passenger website | `apps/web-platform` | A separate Vercel project |
| PostgreSQL | — | A managed PostgreSQL provider, such as Neon |
| Live GPS and sockets | `services/tracking-service` | Koyeb Docker service |
| Passenger app | `apps/passenger-app` | Expo EAS Build, Android and iOS |
| Driver app | `apps/driver-app` | Expo EAS Build, Android and iOS |

The API root returning JSON is expected: that Vercel project is the backend. The passenger website is its own project and URL.

## 1. Create the database

1. Create a PostgreSQL database in your provider dashboard and copy its **pooled TLS connection string**.
2. Keep the connection string private. Add it as `DATABASE_URL` to the API Vercel project. The tracking service currently stores its live location state in Redis and memory; it does not need a second copy of the SQL database.
3. Apply the schema once from this repository, with `DATABASE_URL` available in your terminal:

   ```bash
   cd services/api-gateway
   npm ci
   npm run migrate
   ```

   The migration command now stops if `DATABASE_URL` is missing. Do not run the seed command against a live database without reviewing its contents.

## 2. Configure the API on Vercel

Use the existing Vercel project connected to the repository root. Add these Production variables under **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The database TLS connection string |
| `JWT_SECRET` | A new random secret with at least 32 characters |
| `CORS_ORIGIN` | The exact passenger web origin, after step 4 |
| `TRACKING_SERVICE_URL` | The public Koyeb URL, after step 3 |
| `INTERNAL_API_SECRET` | A new random secret shared with the tracking service |

Only add integration variables when those accounts are configured: `AT_USERNAME`, `AT_API_KEY`, `GOOGLE_MAPS_API_KEY`, payment credentials, and upload credentials. Never put private API keys in `VITE_*` or `EXPO_PUBLIC_*` variables. Redeploy after changing variables. Check `https://safiri-salama.vercel.app/health` and confirm the API root shows its service JSON.

## 3. Configure real-time tracking on Koyeb

Create a **Web Service** from the GitHub repository using Docker:

- Root/build directory: `services/tracking-service`
- Dockerfile: `Dockerfile`
- Port: `3001`
- Health check: `GET /health`
- Region: choose the closest offered region

Set these Koyeb environment variables:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRACKING_PORT` | `3001` |
| `JWT_SECRET` | The same value as the API |
| `INTERNAL_API_SECRET` | The same value as the API |
| `REDIS_URL` | A TLS Redis URL, such as an Upstash URL |
| `CORS_ORIGIN` | The passenger web origin |
| `WEB_APP_URL` | The passenger web origin |

Copy the generated HTTPS service domain. Use it as `TRACKING_SERVICE_URL` in Vercel and `EXPO_PUBLIC_TRACKING_URL` in both Expo production environments. Do not include a trailing slash. Confirm `/health` responds and test a real authenticated Socket.IO connection.

## 4. Deploy the passenger website

Create another Vercel project from the same repository:

- Root Directory: `apps/web-platform`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set `VITE_API_URL=https://safiri-salama.vercel.app/api/v1` and `VITE_TRACKING_URL=<Koyeb HTTPS domain>`. Deploy it, copy its final `https://...` origin, then set that exact origin as `CORS_ORIGIN` on both the API and Koyeb services and redeploy both.

## 5. Prepare Expo and mobile environment variables

For each app (`apps/passenger-app` and `apps/driver-app`):

1. Sign in to Expo and verify the `owner` and EAS project ID in `app.json` belong to your Expo account.
2. In Expo project settings, create Production environment variables:
   - `EXPO_PUBLIC_API_URL=https://safiri-salama.vercel.app/api/v1`
   - `EXPO_PUBLIC_TRACKING_URL=<Koyeb HTTPS domain>`
3. For passenger map rendering, add `GOOGLE_MAPS_API_KEY` to the EAS environment. Restrict the key to the app's package/bundle IDs and required Maps APIs. The key is visible in the installed app, so restrictions matter.
4. Install dependencies and create builds from the repository root:

   ```bash
   ./scripts/build-mobile.sh both android preview
   ./scripts/build-mobile.sh both ios preview
   ```

   The Android preview is an APK for direct testing. The iOS preview creates simulator builds. Production store artifacts use:

   ```bash
   ./scripts/build-mobile.sh both android production
   ./scripts/build-mobile.sh both ios production
   ```

   EAS Build requires an Expo login. Builds require the relevant app identifiers and signing credentials. The script installs the SDK-compatible Expo notification modules before building.

## 6. Store release and costs

- Android APK sharing can be used for a small pilot. Google Play publication requires a Play Console account and its one-time registration fee.
- App Store and TestFlight distribution require Apple Developer Program membership. iOS simulator builds do not install on iPhones.
- Expo EAS has limited free monthly cloud build quota. Vercel Hobby is restricted to personal, non-commercial use. Koyeb's free service is limited and may sleep; its free PostgreSQL allowance is only five active hours per month. Free tiers can help prove the app, but they do not provide dependable always-on ride operations.
- The mobile apps currently use Expo SDK 51. Before publishing to Google Play, upgrade and validate the apps against the current target API requirement (API 36 for new apps/updates starting August 31, 2026). Upgrade Expo one SDK major version at a time and address resulting native dependency changes before making store builds.

## 7. Release checks

- API health and database connection succeed.
- Web sign-in, route navigation, API calls, and CORS work on its real domain.
- Tracking `/health`, Socket.IO authentication, and trip updates work with the Koyeb service awake.
- Passenger and driver builds point to the production API and tracking domains.
- Driver foreground/background location permissions and battery behavior are reviewed on physical devices.
- SMS, payments, map APIs, push notifications, privacy disclosures, data deletion, and emergency flows are tested with live provider credentials before public launch.

## Credential cleanup

Previously embedded Maps and SMS credentials were removed from source. Treat the old values as exposed: revoke/rotate them in their provider dashboards, then add replacements only to Vercel or Expo's build environment as appropriate. Production OTP delivery is disabled until valid SMS credentials are configured.
