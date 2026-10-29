# SkyRex — Future Deployments

This folder documents apps and services that are **not part of the initial deployment**.
They will be developed and deployed independently in future phases.

---

## Phase 1 — Current Deployment (Active)

| App / Service | Type | Status |
|---|---|---|
| `apps/passenger-app` | React Native (Expo) | ✅ Deploying |
| `apps/driver-app` | React Native (Expo) | ✅ Deploying |
| `apps/web-platform` | React + Vite | ✅ Deploying |
| `apps/admin-panel` | React + Vite | ✅ Deploying |
| `services/api-gateway` | Node.js / Express | ✅ Deploying |
| `services/tracking-service` | Node.js / Socket.io | ✅ Deploying |

---

## Phase 2 — Future Apps

### `apps/driver-dashboard`
- **What:** Advanced analytics dashboard for individual drivers
- **Tech:** React + Vite
- **Depends on:** api-gateway, fleet-tracker
- **Status:** Scaffolded, not fully implemented

### `apps/operator-dashboard`
- **What:** Fleet management dashboard for operators managing multiple vehicles/drivers
- **Tech:** React + Vite
- **Depends on:** api-gateway, fleet-tracker
- **Status:** Scaffolded, not fully implemented

---

## Phase 2 — Future Services

### `services/ai-engine`
- **What:** Python FastAPI ML engine — fraud detection, dynamic pricing, route optimization, demand forecasting, identity verification, chatbot, personalization, threat detection
- **Tech:** Python, FastAPI, scikit-learn, XGBoost, PyTorch
- **Status:** Substantially implemented, needs DB integration and model training data

### `services/ml-service`
- **What:** Traffic prediction ML microservice — XGBoost segment-based road predictor
- **Tech:** Python, FastAPI, XGBoost
- **Status:** Scaffolded and implemented (GPS ML pipeline)

### `services/fleet-tracker`
- **What:** High-performance GPS ingestion service for fleet operators
- **Tech:** Go, gorilla/websocket, pgx, Redis, Kafka
- **Status:** go.mod only — needs to be built from scratch

### `services/trip-planner`
- **What:** Advanced trip planning with multi-modal routing
- **Tech:** Python
- **Status:** Stub only — not yet built

### `services/notification-service`
- **What:** Dedicated push notification and SMS service (decoupled from api-gateway)
- **Tech:** Node.js
- **Status:** Stub only — logic currently lives in api-gateway

### `services/payment-service`
- **What:** Dedicated payment processing service — M-Pesa, Airtel, Tigo, Halotel (decoupled from api-gateway)
- **Tech:** Node.js
- **Status:** Stub only — logic currently lives in api-gateway

### `services/safety-module`
- **What:** Dedicated safety service — SOS, emergency contacts, geofencing (decoupled from tracking-service)
- **Tech:** Node.js
- **Status:** Stub only — logic currently lives in tracking-service

---

## Deployment Order (Recommended)

1. **Phase 1** — passenger-app, driver-app, web-platform, admin-panel, api-gateway, tracking-service
2. **Phase 2a** — ml-service (traffic predictions already integrated in api-gateway)
3. **Phase 2b** — notification-service, payment-service (decouple from monolith)
4. **Phase 2c** — ai-engine (fraud detection, dynamic pricing)
5. **Phase 2d** — fleet-tracker (Go), driver-dashboard, operator-dashboard
6. **Phase 2e** — trip-planner, safety-module
