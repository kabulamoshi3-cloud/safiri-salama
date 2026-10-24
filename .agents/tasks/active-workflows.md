# Active Workflows — Session Handoff

## Running Workflows
- `wf_aef993da8423ffbc` → **complete-public-website** (building all 8 pages + components + services)
- `wf_78fe613435adb54c` → **complete-staff-portal** (planner → merge build-review loop, max 4 iterations)

## Completed Work This Session

### 1. Navigation Audit ✅
Audited all 5 navigation systems against the Bolt-like spec:
- Public Website: 🔴 15% (biggest gap - entire public site missing)
- Passenger App: 🟢 90% (nearly complete)
- Driver App: 🟡 80% (placeholders for trip details, vehicle info)
- Admin Dashboard: 🟢 98% (essentially complete)
- Operations Console: 🟢 100% (fully complete per spec)

### 2. Test Fixes ✅ (committed as d6c3a69)
- Fixed JWT field mismatch: payments.ts now reads `user.userId` instead of `user.id`
- Fixed auth response: transforms DB `user_type` to camelCase `userType`
- **All 65 backend tests passing**
- Also implemented missing PATCH /me and POST /change-password endpoints

### 3. GPS ML Pipeline ✅ (committed as 9ae7e5e)
- All 4 FEATs complete: GpsValidator, TrafficPredictor, migration 016, tracking endpoints, TrafficScreen UI, Python ML scaffold
- Traffic prediction with baseline model + ML prediction ready

## In-Progress Work

### Public Website Build (wf_aef993da8423ffbc)
**Status**: Coder implementing all components and pages
**Location**: `apps/public-website/`
**Components**: Button, Card, Input, Navbar, Footer (5 files)
**Pages**: Home, Services, Traffic, BecomeDriver, About, Help, Login, Register (8 files)
**Services**: api.ts, auth.ts (API integration)
**Next**: npm install + build verification + README

### Staff Portal Consolidation (wf_78fe613435adb54c)
**Status**: Planner analyzing both source apps
**Goal**: Merge `admin-panel` + `operator-dashboard` → `staff-portal`
**Structure**:
- `/admin/*` routes (12 pages from admin-panel)
- `/ops/*` routes (11 pages from operator-dashboard)
- Role-based sidebar navigation
- Shared authentication with role permissions
**Next**: Coder builds merged structure → reviewer checks → loop until approved

## Pending Work

### i18n Coverage
- Plan at `.agents/tasks/i18n-coverage-plan.md` (41 files)
- **Action needed**: Break into smaller chunks by app

## Architecture Evolution

### Current (before these workflows)
```
apps/
├── web-platform/         (post-login passenger web)
├── passenger-app/        (mobile) ✅
├── driver-app/          (mobile) ✅
├── driver-dashboard/    (unused/legacy)
├── admin-panel/         (staff management) ✅
└── operator-dashboard/  (operations) ✅
```

### Target (after workflows complete)
```
apps/
├── public-website/      🟡 (wf_aef993da8423ffbc building)
├── web-app/            (rename web-platform, post-login passenger)
├── passenger-app/      ✅ unchanged
├── driver-app/         ✅ unchanged
└── staff-portal/       🟡 (wf_78fe613435adb54c building)
```

## API Backend Status
- 26 route modules in `services/api-gateway/src/routes/`
- All core functionality implemented
- 65 backend tests passing ✅
- GPS ML traffic pipeline operational ✅

## Recent Commits
- d6c3a69 - fix: JWT field mismatch in payments and auth response transformation
- 9ae7e5e - feat: GPS integrity, observation storage, traffic ML predictor with baseline model
- 821536f - feat(backend): add driver documents table migration, admin analytics/audit/finance endpoints

## Next After These Workflows
1. Verify both apps build and run
2. Commit public-website and staff-portal
3. Consider: rename web-platform → web-app
4. Consider: remove/archive driver-dashboard (unused), admin-panel, operator-dashboard (replaced by staff-portal)
5. Launch i18n coverage in smaller chunks
