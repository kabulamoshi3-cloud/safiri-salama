# DalaSmart deployment runbook

Use [DEPLOY_ALL.md](DEPLOY_ALL.md) for the complete setup of the database, Vercel API and website, Koyeb tracking service, and Android/iOS builds. It records the correct repository paths, required variables, migration command, release checks, and free-tier limits.

## Release order

1. Create PostgreSQL and Redis services; store credentials only in provider settings.
2. Apply API database migrations once.
3. Deploy the API and tracking service, then verify health endpoints and authenticated sockets.
4. Deploy the passenger website on its own Vercel project; set its origin as API/Koyeb CORS origin.
5. Add API/tracking URLs to each Expo project's Production environment.
6. Build and install preview apps; validate the trip flow on physical devices.
7. Upgrade Expo SDK 51 to meet current store requirements before production store builds.

The deployment providers are not connected to this workspace. Creating cloud resources, changing their environment variables, or publishing store releases must be done while signed into the account owner dashboards.
