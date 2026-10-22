# DalaSmart deployment runbook

This repository has three deployable parts: the API on Vercel, the passenger web app on Vercel, and the persistent tracking/socket service on Fly.io. Passenger and driver Android/iOS apps are built separately with Expo EAS.

## 1. Vercel API

Keep the existing Vercel project connected to the repository root. The root `vercel.json` routes requests to `services/api-gateway`; this is why visiting the API domain root returns API status JSON.

Set these Production environment variables in the Vercel API project:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | TLS-enabled PostgreSQL connection string |
| `JWT_SECRET` | Unique random secret, at least 32 characters |
| `CORS_ORIGIN` | Exact deployed passenger web origin, such as `https://<web-project>.vercel.app` |
| `TRACKING_SERVICE_URL` | `https://dalasmart-tracking.fly.dev` |
| `INTERNAL_API_SECRET` | Random secret shared with the Fly tracking service |

Set provider credentials only when those integrations are configured. Never commit production secrets or put them in Vite/Expo variables. Those client variables are public by design.

Before the first production release, apply the SQL migrations in `services/api-gateway/migrations` to the production database. Take a backup first, verify the migration history, and avoid applying migrations manually if the deployment pipeline already runs them. Do not run the seed script against production unless its data has been reviewed.

After setting variables, redeploy the API and confirm `/health` returns `status: healthy` and `/api/v1/status` returns `status: ok`.

## 2. Passenger web app

Create a **separate Vercel project** from the same GitHub repository. Set its Root Directory to `apps/web-platform`; framework preset Vite; build command `npm run build`; output directory `dist`.

Set these Production variables:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://safiri-salama.vercel.app/api/v1` |
| `VITE_TRACKING_URL` | `https://dalasmart-tracking.fly.dev` |

The app-local `vercel.json` sends client-side routes to `index.html`. `apps/web-platform/.env.example` documents the same variables for local setup. When the web project has its final domain, update the API project's `CORS_ORIGIN` to that exact origin and redeploy the API.

## 3. Persistent tracking and sockets on Fly.io

The tracking service uses long-lived Socket.IO connections and in-memory active trip state, so run it as a persistent Fly.io service rather than a Vercel function. Its Fly configuration is `services/tracking-service/fly.toml`.

From `services/tracking-service`, configure Fly secrets for `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, and `INTERNAL_API_SECRET`. The JWT and internal secrets must match the API project. Set `CORS_ORIGIN` to the deployed web origin, then deploy with `fly deploy`. Confirm `/health`, HTTP route calls, and a real Socket.IO connection before relying on live tracking. If the Fly app name or domain differs, update the Vercel, web, and EAS URL settings.

## 4. Passenger and driver mobile apps

Production EAS profiles now point at the API and tracking service URLs. Build Android store bundles with:

```bash
cd apps/passenger-app && npx eas-cli build --platform android --profile production
cd ../driver-app && npx eas-cli build --platform android --profile production
```

For iOS, build each project with `--platform ios --profile production`; Apple Developer credentials and store enrollment are required for App Store distribution. Review app identifiers, permissions, privacy disclosures, icons, and store listings before submitting builds.

## 5. Release sequence

1. Configure PostgreSQL, Redis, Vercel environment variables, and Fly secrets.
2. Apply and verify database migrations.
3. Deploy and check the API.
4. Deploy the Fly tracking service and verify HTTP plus Socket.IO connectivity.
5. Deploy the web Vercel project and confirm login, navigation, and API calls on its final domain.
6. Build mobile preview artifacts, validate them on devices, then create production store builds.

Vercel can build the API and web app when their Git projects are connected to `main`. EAS mobile builds and Fly deployments are separate release actions and do not happen automatically just because code is pushed.
