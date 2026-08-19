# DalaSmart AI-Powered Mobility Platform

DalaSmart is a multi-sided mobility platform built for the public transport ecosystem of Dar es Salaam, Tanzania. It serves passengers, daladala drivers, fleet operators, and system administrators through dedicated mobile and web interfaces.

---

## Monorepo Structure

```
dalasmart/
├── apps/
│   ├── passenger-app/          # React Native — Android & iOS passenger app
│   ├── driver-app/             # React Native — Android & iOS driver app
│   ├── operator-dashboard/     # React + TypeScript — fleet operator web SPA
│   └── admin-panel/            # React + TypeScript — system administrator web SPA
│
├── services/
│   ├── fleet-tracker/          # Go — GPS ingestion, SSE, deviation & geofence detection
│   ├── payment-service/        # Node.js + TypeScript — wallet, QR payments, mobile money
│   ├── safety-module/          # Node.js + TypeScript — emergency, incidents, trip sharing
│   ├── notification-service/   # Node.js + TypeScript — FCM push, SMS, scheduling
│   ├── trip-planner/           # Python / FastAPI — multi-modal routing, schedules
│   └── ai-engine/              # Python / FastAPI — crowding, NLP, fraud, maintenance ML
│
├── packages/
│   └── shared-types/           # TypeScript interfaces & enums shared across all workspaces
│
├── package.json                # npm workspaces root
├── tsconfig.base.json          # Shared TypeScript compiler options
├── .eslintrc.js                # Root ESLint configuration
├── .prettierrc                 # Prettier formatting rules
└── README.md                   # This file
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Passenger App | React Native (Android / iOS) |
| Driver App | React Native (Android / iOS) |
| Operator Dashboard | React + TypeScript (Vite SPA) |
| Admin Panel | React + TypeScript (Vite SPA) |
| Fleet Tracker | Go |
| Payment Service | Node.js + TypeScript |
| Safety Module | Node.js + TypeScript |
| Notification Service | Node.js + TypeScript |
| Trip Planner | Python / FastAPI |
| AI/ML Engine | Python / FastAPI + scikit-learn / XGBoost / Transformers |
| Shared Types | TypeScript |
| Maps | OpenStreetMap |
| Mobile Money | M-Pesa, Airtel Money, Tigo Pesa |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Message Bus | Apache Kafka |
| Cache / Pub-Sub | Redis |
| Transactional DB | PostgreSQL |
| Time-Series DB | TimescaleDB |
| Search / Logs | Elasticsearch |
| Object Storage | S3-compatible |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 and npm ≥ 10
- **Go** ≥ 1.23 (for `services/fleet-tracker`)
- **Python** ≥ 3.12 (for `services/ai-engine` and `services/trip-planner`)
- **Docker** and Docker Compose (for infrastructure services)

### Quick Start

#### 1. Set Up Infrastructure

```bash
cd infrastructure

# Download and preprocess OSRM map data (one-time setup, ~15 minutes)
# See infrastructure/OSRM_SETUP.md for detailed instructions
mkdir osrm-data
# Download Tanzania OSM extract to osrm-data/
# Then preprocess with Docker commands in OSRM_SETUP.md

# Start all infrastructure services
docker compose up -d
```

This starts:
- PostgreSQL + TimescaleDB + PostGIS
- Redis
- Elasticsearch + Kibana
- MinIO (S3-compatible storage)
- OSRM routing engine

#### 2. Install Dependencies

```bash
# Install all JavaScript/TypeScript dependencies
npm install

# Build shared types
npm run build --workspace=packages/shared-types

# Install simulator dependencies
cd scripts
npm install
cd ..
```

#### 3. Verify Setup

```bash
# Check all Docker services are healthy
docker compose ps

# Test OSRM routing
curl "http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311?overview=false"

# Test PostgreSQL
docker exec dalasmart-postgres psql -U dalasmart -c "SELECT mode, base_fare, cost_per_km FROM fare_configs;"
```

### Development Commands

#### Run tests
```bash
npm test
```

#### Type-check all TypeScript workspaces
```bash
npm run typecheck
```

#### Lint
```bash
npm run lint
```

#### Format
```bash
npm run format
```

### Testing with GPS Simulator

Simulate vehicle GPS updates for testing:

```bash
# Simulate 5 daladala vehicles
cd scripts
npm run simulate

# Simulate 20 boda-boda vehicles
NUM_VEHICLES=20 TRANSPORT_MODE=boda-boda npm run simulate

# Custom route and interval
ROUTE_ORIGIN="-6.7924,39.2083" ROUTE_DEST="-6.8206,39.2731" PING_INTERVAL_MS=10000 npm run simulate
```

See `scripts/fake-driver-simulator.js` for full configuration options.

---

## Shared Types

All TypeScript interfaces and enums live in `packages/shared-types/src/index.ts`. Import them in any workspace:

```typescript
import type { User, Vehicle, VehiclePosition, Wallet, Transaction } from '@dalasmart/shared-types';
import { CrowdingLevel, UserType, TransactionStatus } from '@dalasmart/shared-types';
```

Key types defined:

- **Users**: `User`, `PassengerProfile`, `DriverProfile`
- **Vehicles**: `Vehicle`, `VehiclePosition`
- **Payments**: `Wallet`, `Transaction`, `QRPaymentToken`, `FareTable`
- **Safety**: `IncidentReport`, `EmergencyEvent`
- **Routes & Trips**: `Route`, `Stop`, `TripPlan`, `TripOption`, `TripSegment`, `RecurringTripSchedule`
- **Primitives**: `GeoPoint`, `Attachment`, `SavedPlace`, `SavedRoute`, `EmergencyContact`
- **Fleet**: `FleetAlert`, `DRTScoreBreakdown`
- **Notifications**: `NotificationRequest`
- **Admin**: `AuditLogEntry`, `Announcement`, `SafetyTip`, `FAQEntry`
- **Enums**: `CrowdingLevel`, `UserType`, `UserStatus`, `TrustTier`, `VerificationStatus`, `TransactionType`, `TransactionStatus`, `MobileMoneyProvider`, `IncidentSeverity`, `IncidentStatus`, `VehicleType`, `VehicleStatus`, `TransportMode`

---

## Kafka Topics

| Topic | Producer | Consumers |
|---|---|---|
| `vehicle.positions` | Fleet Tracker | Passenger App (SSE), Operator Dashboard (SSE), AI Engine |
| `fleet.alerts` | Fleet Tracker | Safety Module, Operator Dashboard |
| `payment.events` | Payment Service | Notification Service |
| `safety.events` | Safety Module | AI Engine, Admin Panel |
| `notification.requests` | All services | Notification Service |

---

## Language Support

All user-facing text is available in **Swahili (sw)** and **English (en)**. The `SupportedLanguage` type in `shared-types` enforces this constraint. i18n is implemented via `react-i18next` in all client apps.

---

## Testing Strategy

- **Property-based tests**: `fast-check` (TypeScript), `gopter` (Go), `hypothesis` (Python)
- **Unit tests**: Jest (TypeScript/React Native), Vitest (React web), pytest (Python), Go testing package
- **Integration tests**: End-to-end flows for payments, GPS ingestion, notifications, and incident reporting

Each property test is tagged with the requirement it validates:

```
// Feature: dalasmart-ai-platform, Property N: <property_text>
```

---

## Architecture Overview

```
Client Layer (Passenger App, Driver App, Operator Dashboard, Admin Panel)
        │
        ▼
   API Gateway (Kong / AWS API Gateway)
   JWT auth · Role-based routing · Rate limiting · TLS
        │
        ▼
Core Services ──────────────────────────────────────────────────────────
Fleet Tracker │ Payment Service │ Safety Module │ Notification Service │
Trip Planner  │ AI/ML Engine
        │
        ▼
Data Layer
PostgreSQL · TimescaleDB · Redis · Elasticsearch · S3-compatible storage
        │
        ▼
External Services
OpenStreetMap · M-Pesa · Airtel Money · Tigo Pesa · Firebase Cloud Messaging
```
