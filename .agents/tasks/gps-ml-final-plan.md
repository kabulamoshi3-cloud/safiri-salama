# GPS Integrity + ML Traffic Pipeline — Implementation Plan

Goal: complete the partially-built GPS/ML traffic pipeline across six file groups in the
`daladala` monorepo. Work runs **directly in the repo** (no worktree, no merge step); commit
to the current branch, never push.

> Source of truth for this plan: the step task prompt. All facts below were confirmed by
> reading the actual files (see "Confirmed codebase facts"). Where the brief left a gap, a
> decision is recorded under "Documented decisions/assumptions" — implement to that decision,
> do not re-decide.

---

## Confirmed codebase facts (do not re-discover)

- **DB pool**: `services/api-gateway/src/database/connection.ts` exports `pool` (a `pg.Pool`).
  Import in route files as `import { pool } from '../database/connection';` and call
  `pool.query(sql, params)`. From `src/services/*.ts` the same relative path
  `'../database/connection'` resolves correctly (services is a sibling of `routes`/`database`
  under `src`). Type the pool param as `import { Pool } from 'pg'`.
- **`src/services/` does NOT exist yet** — must be created (`GpsValidator.ts`, `TrafficPredictor.ts`).
- **Migrations**: `services/api-gateway/migrations/` currently ends at **015_ratings_earnings.sql**.
  Next is **016**. Runner: `scripts/run-migrations.ts` (`npm run migrate` = `ts-node scripts/run-migrations.ts`),
  scans `*.sql` sorted by leading number, runs each in a transaction, tracks applied versions in
  `schema_migrations`. `gen_random_uuid()` is already used by existing migrations (pgcrypto is
  enabled — do NOT add `CREATE EXTENSION`). No live DB is available in this environment, so the
  migration is verified by file presence + valid SQL review, NOT by applying it.
- **TypeScript**: `services/api-gateway/tsconfig.json` — `strict: false`, `rootDir: ./src`,
  `include: ["src/**/*"]`, typecheck = `tsc --noEmit` (script `typecheck`). New `src/services/`
  files are compiled; `migrations/*.sql` and `services/ml-service/*` are OUTSIDE `src` and
  ignored by tsc (good). Tests (`**/*.test.ts`) are excluded from compile.
- **Driver app ingestion payload**: `apps/driver-app/src/screens/trip/NavigationScreen.tsx` and
  `apps/driver-app/src/services/BackgroundLocation.ts` POST to `/tracking/driver/location` every
  ~5s with body `{ lat, lng, bearing, speed, trip_id }`. **No `accuracy`, no `timestamp`** is sent.
  => GpsValidator must treat `accuracy_m` as optional and default `timestamp` to server-received
  time when the client omits it.
- **tracking.ts** (`services/api-gateway/src/routes/tracking.ts`) already imports
  `axios`, `Router/Request/Response` from express, and `pool` from `'../database/connection'`.
  It has a flat-earth `haversineKm` helper. Mock-data fallbacks exist in: `GET /nearby` (catch),
  `GET /nearby-drivers` (mockDrivers returned when 0 rows or on error), `GET /traffic`
  (mockSegments when 0 rows or error), `GET /trip/:tripId` (mock trip when no DB row), and
  `GET /trip/:tripId/driver-location` (mock coords on error). All must be gated out of production.
- **Routes mount**: `services/api-gateway/src/routes/index.ts` already mounts `tracking` at
  `/v1/tracking` via `safeUse`. New endpoints are added in `tracking.ts` itself — no index edit.
- **Passenger app**: `apps/passenger-app/screens/TrafficScreen.tsx` uses `axios` + `AsyncStorage`
  token, base `const API = 'https://simon-daladala-api.vercel.app/api/v1'`, polls
  `GET /tracking/traffic` every 30s, renders `<Polyline>` per segment with `STATUS_COLORS`.
  `package.json` has **no typecheck/build script** but a `tsconfig.json` exists. No `react-i18next`
  in this screen — text is hardcoded Swahili (keep that style).
- **No existing tests touch tracking/traffic** — `features.test.ts` only covers promo/referral/food/
  corporate/etc. The `mock` hits in that file are a `mockAuthToken` variable, not mock data. So
  tracking.ts changes will not break the suite.
- **gitignore gotchas**: `.agents/` is NOT ignored (planning artifacts show as untracked — stage
  only code). `services/ml-service/.env.example` IS matched by `.gitignore` patterns `.env*` and
  `.env.*` — it must be force-added with `git add -f`.
- **No new npm packages** may be added to the Node.js service. Everything below uses only existing
  deps (`pg`, `express`, `axios`).

---

## Documented decisions / assumptions (gaps in the brief — implement to these)

1. **Seed road_segment coordinates/lengths were not in the repo or the task message.** The brief
   says "the exact ids/names/coordinates/lengths from the brief", but no such brief exists in the
   repo. Decision: use the 12 plausible Dar es Salaam coordinates + haversine-derived lengths
   listed in Item 3 below, verbatim. They are geographically reasonable and self-consistent.
2. **Ingestion gap (gps_observations → segment_speed_observations) is unspecified.** Without it,
   the predictor's `ml` branch (>=10 obs) can never engage and the Python trainer has no data.
   Decision: in the GPS-update flow, after storing a VALID `gps_observations` row, map the point
   to the nearest `road_segments` row (perpendicular distance ≤ 75 m) and insert a
   `segment_speed_observations` row. Only real validated observations feed this table (satisfies
   "never use simulated GPS as training data"). Add the mapping helper in `TrafficPredictor.ts`
   as `ingestObservationToSegment` + `nearestSegment`, exported for use in `tracking.ts`.
3. **`accuracy_m` is optional.** The interface lists it, but the driver app never sends it.
   Decision: `GpsObservation.accuracy_m?: number`; skip the `low_accuracy` rule when undefined.
4. **`timestamp` defaults to server-received time** when the client omits it (so the `stale` rule
   only fires when a client-provided timestamp is >30s old).
5. **`gps_observations.driver_id` stores `drivers.id`** (not the JWT `user_id`). Obtain it via
   `UPDATE drivers SET ... WHERE user_id = $1 RETURNING id` (no extra round-trip; the update
   already happens). No FK on the column per the brief.
6. **`model_type` semantics** (the brief lists `ml|baseline|insufficient_data` but a 2-branch rule):
   - `observations_used >= 10` → `ml`: speed = AVG(observed_speed_kmh); confidence from count &
     stddev (clamped 0.7–0.95).
   - `1 <= observations_used < 10` → `insufficient_data`: speed from baseline rules (faithful to
     "if no use baseline rules"), confidence 0.30.
   - `observations_used == 0` → `baseline`: speed from baseline rules, confidence 0.35.
   - unknown `segment_id` (not in `road_segments`) → `insufficient_data`, generic clear speed,
     confidence 0.10, `road_name = segment_id`.
7. **Status/color thresholds**: `predicted_speed_kmh < 15` → `jam` (red `#ff3b30`); `15–35` →
   `slow` (orange `#ff9500`); `> 35` → `clear` (green `#00d46a`). Match the existing
   `STATUS_COLORS` in `TrafficScreen.tsx`.
8. **Dar-local time**: store/query `day_of_week`/`hour_of_day` in East Africa Time (UTC+3).
   Helper: `darHour = (utcHour + 3) % 24`, with day rollover when `utcHour + 3 >= 24`.
9. **Baseline rules**: Mon–Fri (day 1–5, JS `getDay()` convention where Sun=0): hours 6–8
   (6 ≤ h < 9) and 16–18 (16 ≤ h < 19) → `jam` (8 km/h) on the four major roads
   `nyerere-s-001`, `morogoro-001`, `kilwa-001`, `pugu-001`; other roads `slow` (25 km/h) in those
   windows. All other times → `clear` (50 km/h). Sat/Sun → `clear`.
10. **Mock gating**: mock data returned only when `process.env.NODE_ENV !== 'production'`; each
    mock object tagged `_mock: true`. In production, driver-list endpoints return
    `{ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' }`; single-driver/trip
    endpoints return a 404 / not-available error (no mock coordinates); `GET /traffic` returns
    `[]` when no real rows.
11. **GpsValidator is wired into BOTH `POST /driver/location` (brief's named endpoint) AND
    `POST /driver/update`** (the high-frequency endpoint the driver app also calls), via a shared
    `handleGpsUpdate(userId, obs, pool)` helper, so the pipeline actually ingests real data.

---

# Implementation Plan (ordered by dependency)

- [ ] 1. Create `services/api-gateway/src/services/GpsValidator.ts` (pure logic, no DB import).
      Define `interface GpsObservation { lat:number; lng:number; speed_kmh:number; heading:number;
      accuracy_m?:number; timestamp:number }` and `interface ValidationResult { valid:boolean;
      rejection_reason?: 'impossible_speed'|'low_accuracy'|'stale'|'duplicate'|'impossible_jump'|'out_of_bounds' }`.
      Rules (evaluate in this order, return first failure): speed_kmh > 150 → `impossible_speed`;
      accuracy_m != null && accuracy_m > 50 → `low_accuracy`; outside Tanzania
      (lat < -11.7 || lat > -0.99 || lng < 29.3 || lng > 40.5) → `out_of_bounds`;
      Date.now() - timestamp > 30000 → `stale`; vs `previous` (when provided): moved > 500 m in < 5 s
      → `impossible_jump`; same coords (haversine < 1 m) within 2 s → `duplicate`. Export
      `function haversineMeters(lat1,lng1,lat2,lng2):number` (R=6371000) and
      `function validateGpsObservation(obs: GpsObservation, previous?: GpsObservation): ValidationResult`.
      Store the previous observation per driver in a module-level `Map<string, GpsObservation>`
      so `duplicate`/`impossible_jump` work across calls when the helper is invoked without an
      explicit previous; allow the explicit `previous` arg to override.
      Files: services/api-gateway/src/services/GpsValidator.ts
      Verify: `cd services/api-gateway && npx tsc --noEmit 2>&1 | grep -E "GpsValidator" | grep -v node_modules`
      → empty output (0 errors).

- [ ] 2. Create `services/api-gateway/src/services/TrafficPredictor.ts` (depends on Item 3 tables
      conceptually, but compiles standalone; imports `pool`/`Pool` only).
      Export:
      - `predictTraffic(segmentIds: string[], departureTime: string|number|Date, pool: Pool):
        Promise<PredictionResult[]>` where each result is
        `{ segment_id, road_name, predicted_speed_kmh, status:'jam'|'slow'|'clear', color, confidence,
        model_type:'ml'|'baseline'|'insufficient_data', observations_used }`. Per Decision 6:
        query `segment_speed_observations` for each `(segment_id, day_of_week, hour_of_day)` in Dar
        time (Decision 8); >=10 rows → `ml` (AVG + count/stddev confidence); 1–9 → `insufficient_data`
        (baseline speed, conf 0.30); 0 → `baseline` (baseline speed, conf 0.35); unknown segment →
        `insufficient_data` conf 0.10. Use Decision 7 thresholds + Decision 9 baseline rules.
      - `findBestDepartureTime(segmentIds: string[], fromTime: string|number|Date, pool: Pool):
        Promise<{ from_time, best_time, savings_minutes, total_minutes_at_from,
        total_minutes_at_best }>` — test every 15 min for 3 h (12 slots); for each slot compute
        per-segment travel time `length_m / (predicted_speed_kmh*1000/60)` minutes, sum across
        segments; best_time = slot with min total; savings_minutes = total_at_from − total_at_best.
      - `ingestObservationToSegment(obs, pool)` + `nearestSegment(lat, lng, segments)` (Decision 2):
        load `road_segments`, find nearest within 75 m (perpendicular distance, equirectangular
        approximation), insert into `segment_speed_observations`
        `(segment_id, day_of_week, hour_of_day, observed_speed_kmh, trip_id, observed_at)` for valid
        observations with a non-null speed. Skip if no segment within tolerance.
      Files: services/api-gateway/src/services/TrafficPredictor.ts
      Verify: `cd services/api-gateway && npx tsc --noEmit 2>&1 | grep -E "TrafficPredictor" | grep -v node_modules`
      → empty output (0 errors).

- [ ] 3. Create `services/api-gateway/migrations/016_gps_ml_pipeline.sql`.
      Tables (all `CREATE TABLE IF NOT EXISTS`):
      - `gps_observations(id UUID PK DEFAULT gen_random_uuid(), driver_id UUID NOT NULL, trip_id UUID,
        lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, speed_kmh DOUBLE PRECISION,
        heading DOUBLE PRECISION, accuracy_m DOUBLE PRECISION, obs_timestamp TIMESTAMPTZ NOT NULL,
        is_valid BOOLEAN NOT NULL DEFAULT false, rejection_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`.
      - `road_segments(id TEXT PK, road_name TEXT NOT NULL, lat_start DOUBLE PRECISION NOT NULL,
        lng_start DOUBLE PRECISION NOT NULL, lat_end DOUBLE PRECISION NOT NULL, lng_end DOUBLE PRECISION
        NOT NULL, length_m INTEGER, created_at TIMESTAMPTZ DEFAULT NOW())`.
      - `segment_speed_observations(id UUID PK DEFAULT gen_random_uuid(), segment_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL, hour_of_day INTEGER NOT NULL, observed_speed_kmh DOUBLE PRECISION
        NOT NULL, trip_id UUID, observed_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`.
      - `ml_model_versions(id UUID PK DEFAULT gen_random_uuid(), model_type TEXT, version TEXT,
        training_samples INTEGER, accuracy_mae DOUBLE PRECISION, trained_at TIMESTAMPTZ,
        is_active BOOLEAN, notes TEXT)`.
      - `traffic_predictions_cache(id UUID PK DEFAULT gen_random_uuid(), segment_id TEXT,
        predicted_for TIMESTAMPTZ, predicted_speed_kmh DOUBLE PRECISION, confidence DOUBLE PRECISION,
        model_version_id UUID, model_type TEXT, expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW())`.
      Indexes (`CREATE INDEX IF NOT EXISTS`): `idx_gps_obs_driver ON gps_observations(driver_id)`,
        `idx_gps_obs_trip ON gps_observations(trip_id)`, `idx_gps_obs_timestamp ON
        gps_observations(obs_timestamp)`, `idx_gps_obs_valid ON gps_observations(is_valid)`,
        `idx_seg_speed_segment ON segment_speed_observations(segment_id)`,
        `idx_seg_speed_window ON segment_speed_observations(day_of_week, hour_of_day)`,
        `idx_traffic_cache_segment ON traffic_predictions_cache(segment_id, predicted_for)`.
      Seed the 12 road_segments with `INSERT ... ON CONFLICT (id) DO NOTHING` using EXACTLY these
      rows (Decision 1):
      `('nyerere-n-001','Julius K. Nyerere Road (N)',-6.8100,39.2750,-6.8020,39.2720,948)`,
      `('nyerere-s-001','Julius K. Nyerere Road (S)',-6.8235,39.2695,-6.8150,39.2730,1020)`,
      `('morogoro-001','Morogoro Road (1)',-6.8250,39.2700,-6.8150,39.2550,1990)`,
      `('morogoro-002','Morogoro Road (2)',-6.8150,39.2550,-6.8050,39.2450,1565)`,
      `('sam-nujoma-001','Sam Nujoma Road',-6.8150,39.2650,-6.8050,39.2820,2180)`,
      `('bagamoyo-001','Bagamoyo Road',-6.7750,39.2400,-6.7600,39.2250,2345)`,
      `('ali-mwinyi-001','Ali Hassan Mwinyi Road',-6.8120,39.2680,-6.8020,39.2750,1350)`,
      `('mandela-001','Nelson Mandela Road',-6.7600,39.2350,-6.7450,39.2550,2760)`,
      `('kilwa-001','Kilwa Road',-6.8500,39.2700,-6.8350,39.2850,2345)`,
      `('pugu-001','Pugu Road',-6.8700,39.2500,-6.8550,39.2650,2345)`,
      `('bibi-titi-001','Bibi Titi Mohammed Road',-6.8180,39.2750,-6.8120,39.2700,865)`,
      `('kivukoni-001','Kivukoni Road',-6.8230,39.2850,-6.8180,39.2800,782)`.
      Files: services/api-gateway/migrations/016_gps_ml_pipeline.sql
      Verify: file exists; SQL is well-formed (review). Optional if a DB is reachable:
      `cd services/api-gateway && npm run migrate` applies without error.

- [ ] 4. Wire the pipeline into `services/api-gateway/src/routes/tracking.ts` (depends on Items 1–3).
      Read the full file first (it changes substantially). Changes:
      a. Add `const isProd = process.env.NODE_ENV === 'production';` and
         `const isTest = process.env.NODE_ENV === 'test';`. Gate ALL mock fallbacks behind
         `!isProd`; tag every mock object with `_mock: true` (Decision 10).
         - `GET /nearby` & `GET /nearby-drivers`: in prod, when no real drivers, return
           `{ drivers: [], count: 0, message: 'Hakuna madereva karibu sasa' }`.
         - `GET /trip/:tripId` & `GET /trip/:tripId/driver-location`: in prod, when no real data,
           return `res.status(404).json({ error: '...not available' })` (no mock coordinates).
         - `GET /traffic`: in prod, when no real rows, return `[]`.
      b. Stale detection: for `GET /driver/:driverId`, `GET /trip/:tripId`,
         `GET /trip/:tripId/driver-location`, `GET /nearby`, `GET /nearby-drivers`, compute
         `last_seen_seconds = round((Date.now()-updatedAt)/1000)` and add `is_stale: last_seen_seconds>30`
         + `last_seen_seconds` to each driver/location response.
      c. Import `validateGpsObservation`, `GpsObservation` from `../services/GpsValidator` and
         `ingestObservationToSegment`, `predictTraffic`, `findBestDepartureTime` from
         `../services/TrafficPredictor`. Add shared `async function handleGpsUpdate(userId, obs,
         pool)` (Decision 11): validate; `UPDATE drivers ... WHERE user_id=$1 RETURNING id`; insert
         into `gps_observations` (valid AND invalid, with `rejection_reason`); if valid and
         `speed_kmh != null`, call `ingestObservationToSegment`. Use it in BOTH `POST /driver/location`
         and `POST /driver/update`. Build `GpsObservation` from the request: `accuracy_m: body.accuracy`
         (optional), `timestamp: body.timestamp ?? Date.now()` (Decision 3/4).
      d. `POST /tracking/traffic/predict` — body `{ segment_ids: string[], departure_time: string }`.
         400 if `segment_ids` empty. Cache 15 min: SELECT from `traffic_predictions_cache` WHERE
         `segment_id IN (...)` AND `predicted_for = $departure` AND `expires_at > NOW()`; if all
         present return cached `{ departure_time, predictions, cached:true, model_summary }`. Else
         call `predictTraffic`, upsert each into `traffic_predictions_cache` with
         `expires_at = NOW() + INTERVAL '15 minutes'`, return `{ ..., cached:false, model_summary }`.
      e. `GET /tracking/traffic/best-time?segment_ids=id1,id2&from_time=ISO` — parse
         `segment_ids` (comma split) and `from_time`; call `findBestDepartureTime`; return its result.
      f. `GET /tracking/traffic/segments` — SELECT all `road_segments`; for each, get realtime
         status: AVG(`observed_speed_kmh`) from `segment_speed_observations` WHERE `segment_id=$1` AND
         `observed_at > NOW() - INTERVAL '10 minutes'`; if rows exist → `source:'realtime'`,
         `current_speed_kmh=avg`, status/color from thresholds; else `source:'baseline'` using
         current Dar day/hour baseline. Return `{ segments: [...] }` with coords + length_m.
      Files: services/api-gateway/src/routes/tracking.ts
      Verify: `cd services/api-gateway && npx tsc --noEmit 2>&1 | grep -E "tracking" | grep -v node_modules`
      → empty output (0 errors). And `grep -n "mock" services/api-gateway/src/routes/tracking.ts`
      review: every mock array is inside a `!isProd`/`isTest`-gated branch and objects carry `_mock: true`
      (no mock path reachable when `NODE_ENV=production`).

- [ ] 5. Update `apps/passenger-app/screens/TrafficScreen.tsx` (depends on Item 4 endpoints).
      Read the full file first. Changes (keep existing imports/style; add `Alert` only if needed —
      prefer a `Text` banner for the offline warning):
      a. Add departure-time selector state `departureOffset` (0 | 30 | 60 minutes) with three buttons
         `'Ondoka Sasa'` / `'+Dakika 30'` / `'+Saa 1'`. Compute `departure_time` = ISO of
         `new Date(Date.now() + offset*60000)`.
      b. Replace the `fetchTraffic` source: GET `${API}/tracking/traffic/segments` → `setSegments`
         (coords + current status). Keep 30s polling for the segment list.
      c. Add `fetchPredict()`: POST `${API}/tracking/traffic/predict` with
         `{ segment_ids: segments.map(s=>s.segment_id), departure_time }`; store predictions in state;
         render each `<Polyline>` using the matching prediction's `color` (fallback to the segment's
         own status color). Re-run on mount, on `departureOffset` change, and on each segment refresh.
      d. Confidence indicator: avg of predictions' `confidence` → `>0.7 'Utabiri wa juu'`,
         `0.4–0.7 'Utabiri wa wastani'`, `<0.4 'Mfumo wa msingi'`. Show near the top card.
      e. Best-time card: on predict success call GET
         `${API}/tracking/traffic/best-time?segment_ids=...&from_time=<now ISO>`; if
         `savings_minutes > 5` show `'Ondoka HH:MM — okoa dakika N 🕒'` (format `best_time` to
         local HH:MM).
      f. On any API failure: keep the last successful `segments`/predictions in state and show a
         `'Kutumia data ya zamani'` warning banner (do not clear the map).
      Files: apps/passenger-app/screens/TrafficScreen.tsx
      Verify: `cd apps/passenger-app && npx tsc --noEmit 2>&1 | grep TrafficScreen` → no errors
      attributable to `TrafficScreen.tsx` (pre-existing unrelated RN/Expo type errors are acceptable;
      the file must introduce none of its own).

- [ ] 6. Create the Python ML scaffold under `services/ml-service/` (independent of Node).
      - `README.md`: setup (venv, `pip install -r requirements.txt`), training
        (`python trainer.py`), running (`uvicorn main:app`), and how Node calls it; state explicitly
        that the Node.js gateway NEVER depends on this service and always falls back to the SQL
        baseline.
      - `requirements.txt`: `fastapi`, `uvicorn`, `psycopg2-binary`, `scikit-learn`, `xgboost`,
        `pandas`, `numpy` (pin to recent compatible versions).
      - `main.py`: FastAPI app with `POST /predict` (reads `segment_id`/`departure_time`, calls
        `predictor.predict`) and `GET /health` → `{"status":"ok"}`.
      - `trainer.py`: connect via `DATABASE_URL`, read `segment_speed_observations`, train an
        XGBoost regressor (features: day_of_week, hour_of_day, segment_id encoded), save to
        `MODEL_PATH`; honor `MIN_TRAINING_SAMPLES` (skip training below threshold).
      - `predictor.py`: load model from `MODEL_PATH`, expose `predict(segment_id, departure_time)`.
      - `.env.example`: `DATABASE_URL=`, `MODEL_PATH=`, `MIN_TRAINING_SAMPLES=500`.
      Files: services/ml-service/{README.md,requirements.txt,main.py,trainer.py,predictor.py,.env.example}
      Verify: all six files exist. If `python3` is available:
      `python3 -m py_compile services/ml-service/main.py services/ml-service/trainer.py
      services/ml-service/predictor.py` succeeds (syntax only; deps need not be installed).

- [ ] 7. Final verification + commit.
      - `cd services/api-gateway && npx tsc --noEmit` → 0 errors overall (or, minimally, 0 errors in
        the new/edited files: `GpsValidator`, `TrafficPredictor`, `tracking`).
      - `grep -n "mock" services/api-gateway/src/routes/tracking.ts` confirms no mock path is
        reachable in production.
      - All six file groups exist and the new files compile/parse.
      - Stage ONLY the code files for this feature: the two new `src/services/*.ts`, the new
        `migrations/016_*.sql`, the edited `src/routes/tracking.ts`, the edited
        `apps/passenger-app/screens/TrafficScreen.tsx`, and the `services/ml-service/*` files.
        Force-add the env example: `git add -f services/ml-service/.env.example`. Do NOT stage
        anything under `.agents/`. Commit with message:
        `feat: GPS integrity, observation storage, traffic ML predictor with baseline model`.
      Verify: `git status --short` shows the code files committed and no `.agents/` files staged;
      `git log -1 --format=%s` shows the required message.
