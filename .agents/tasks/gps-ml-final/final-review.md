# GPS & ML Traffic Pipeline for Safiri Haraka

All four FEATs are implemented. The pipeline adds GPS validation at the driver update endpoints, populates per-segment speed observations, serves ML-backed traffic predictions with a SQL baseline fallback, and surfaces the result in a passenger-facing screen with departure-time selection and best-time recommendations.

**Watch for:** (1) `ON CONFLICT (segment_id, predicted_for)` in the cache upsert has no corresponding UNIQUE constraint in the migration — confirmed to cause a runtime error on the very first write. (2) The legacy `GET /tracking/traffic` route queries a `traffic_segments` table that does not exist in any migration, making it dead on arrival in production even in the non-mock path. (3) The Python predictor's day-of-week calculation is wrong for UTC observations arriving near midnight — confirmed off-by-one. (4) The in-memory `_lastObservation` map in `GpsValidator.ts` is module-level state, meaning it is shared across all concurrent requests in the same process and leaks indefinitely.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The GPS validation layer (`GpsValidator.ts`) covers all six required rules. The module-level `_lastObservation` map introduces a process-lifetime memory leak, and in the current integration it is dead weight — `handleGpsUpdate` always supplies `previous` explicitly, so the module cache is never reached.

`TrafficPredictor.ts` implements SQL-based speed aggregation with a tiered confidence model (pure baseline → insufficient_data → ml) and a 12-slot best-departure-time scan. The `predictTraffic` function issues a `fetchAllSegments` query on every call; `findBestDepartureTime` compounds this by calling `predictTraffic` 12 times, totalling 25+ DB round-trips per best-time request.

The `tracking.ts` route layer wires everything together correctly for the new endpoints (`/traffic/segments`, `/traffic/predict`, `/traffic/best-time`). Two problems exist in the older traffic plumbing: the legacy `/traffic` GET route queries a nonexistent `traffic_segments` table, and the `ON CONFLICT` clause in the cache upsert references columns that have no UNIQUE constraint defined on the table, so every upsert will throw.

The Python ML microservice (`main.py` + `trainer.py` + `predictor.py`) segment encoding is consistent between trainer and predictor (`abs(hash(sid)) % 1000`). A day-of-week calculation bug in `predictor.py` produces the wrong value for UTC observations near midnight, and the convention mismatch (Python `weekday()` vs PostgreSQL DOW) means Sunday predictions land outside the training distribution. The microservice is intentionally not wired into the Node gateway — the Node side uses only the SQL predictor today.

`TrafficScreen.tsx` implements the full FEAT-003 scope: departure-time selector, ML predictions, confidence labels, best-time card, and a cached-data banner. TypeScript compiles cleanly for this file; the only TS errors in the repo are pre-existing issues in `rbac.ts` and `validation.ts` unrelated to this diff. The `usingCache` banner is set on predict failure but never reset to `false` on traffic fetch success, so a transient predict failure leaves a stale banner until the next successful predict.

Migration 016 creates all five tables and seeds the 12 road segments. The missing UNIQUE constraint on `traffic_predictions_cache(segment_id, predicted_for)` is the only schema defect.

---

<details>
<summary>Issues (6)</summary>

1. **Missing UNIQUE constraint on cache table** — `ON CONFLICT (segment_id, predicted_for)` in the cache upsert has no backing UNIQUE index in migration 016; every cache write will throw `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification`. Add `UNIQUE (segment_id, predicted_for)` to the `traffic_predictions_cache` table definition.

2. **Dead `traffic_segments` query** — `GET /tracking/traffic` queries `SELECT * FROM traffic_segments` but no such table exists in any migration. In production this will return a 500 (the error handler returns `[]` there, so it silently produces empty results). Either remove this legacy route or redirect it to `road_segments`.

3. **Predictor day-of-week off-by-one at midnight UTC** — In `predictor.py`, `dar_day` is computed as `dt.weekday() + 1 if (utc_hour + 3) < 24 else (dt.weekday() + 2) % 7`. For a UTC timestamp like 23:00 where `utc_hour + 3 = 26`, the condition `< 24` is false, so the else branch runs. But `(dt.weekday() + 2) % 7` gives the day-after-tomorrow for Saturday, and produces values in a different range than the trainer's `day_of_week` (which is `0=Sun` PostgreSQL convention vs Python's `0=Mon`). The trainer uses Postgres `day_of_week` (Sunday=0); the predictor should use the same UTC+3 offset logic as `TrafficPredictor.ts`: compute the Dar time as a shifted UTC date and take `getUTCDay()`.

4. **Module-level GPS observation cache leaks indefinitely** — `_lastObservation` in `GpsValidator.ts` is a module-level `Map` that grows without bound. On a long-running process with many drivers, this accumulates stale entries for disconnected drivers forever. The map should be bounded (e.g., evict entries older than N minutes) or moved to the caller, which already passes `previous` explicitly via `handleGpsUpdate`.

5. **Excessive DB round-trips in best-time calculation** — `findBestDepartureTime` calls `predictTraffic` 12 times, and each `predictTraffic` call starts with `fetchAllSegments`. For a 12-slot scan over 5 segments this is 24 full `road_segments` queries per request. `fetchAllSegments` should be called once, with the result passed into the inner calls or cached at module level with a short TTL.

6. **`usingCache` banner never clears on traffic success** — In `TrafficScreen.tsx`, `setUsingCache(false)` is only called inside a successful `fetchPredict`, not inside `fetchTraffic`. If `fetchPredict` fails (setting `usingCache = true`) and subsequent `fetchTraffic` polls succeed, the stale-data banner stays visible indefinitely. Reset `usingCache` at the start of `fetchTraffic` or at the top of `fetchPredict` before the request.

</details>

---

<details>
<summary>Details</summary>

### Cache upsert fails without a UNIQUE constraint

`tracking.ts` inserts into `traffic_predictions_cache` with:

```sql
ON CONFLICT (segment_id, predicted_for)
DO UPDATE SET ...
```

Migration 016 creates the table with only a regular index on `(segment_id, predicted_for)` — no `UNIQUE` clause. PostgreSQL requires the conflicting columns to be covered by a unique constraint or exclusion constraint; a plain index does not satisfy this. Every call to the `POST /traffic/predict` endpoint that attempts to populate the cache will throw `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`. The `catch` block suppresses this, so the endpoint still returns predictions, but the cache is never written, meaning every predict request pays the full SQL aggregation cost.

Fix: add `UNIQUE (segment_id, predicted_for)` in migration 016.

### Legacy `/traffic` route queries a nonexistent table

`GET /api/v1/tracking/traffic` (the older route, not `/traffic/segments`) runs:

```sql
SELECT * FROM traffic_segments LIMIT 50
```

No migration creates `traffic_segments`; the pipeline introduced `road_segments` and `segment_speed_observations`. In production (`isProd = true`) this will silently return an empty array. In non-production it falls through to the hardcoded mock. The route is effectively dead in production and misleadingly appears to work in dev. It should be removed or pointed at the new `/traffic/segments` handler.

### Python predictor day-of-week calculation

`predictor.py` computes the Dar es Salaam day as:

```python
dar_day = dt.weekday() + 1 if (utc_hour + 3) < 24 else (dt.weekday() + 2) % 7
```

Python's `dt.weekday()` returns 0=Monday, 6=Sunday. The trainer uses PostgreSQL's `EXTRACT(DOW ...)` convention (0=Sunday, 6=Saturday). The predictor's formula adds 1 to shift to 1=Monday, but this produces a range 1–7 (Sunday becomes 7 from `6+1`) while the trainer stores 0–6 Sunday-first. The mismatch means predictions for Sunday are trained on DOW=0 but predicted with DOW=7, landing outside the training distribution. The midnight-rollover branch compounds the error. The correct approach is to mirror `darLocalTime()` from `TrafficPredictor.ts`: shift the UTC timestamp by 3 hours and use the resulting UTC weekday (0=Sun).

### Module-level GPS cache in GpsValidator

`_lastObservation` is a module-global `Map<string, GpsObservation>` that grows without bound. `handleGpsUpdate` always supplies `previous` explicitly, so the cache path is never reached in production — it is dead weight and a latent leak. The `_driverId` field and cache update path can be removed from `validateGpsObservation` entirely.

### Best-time query fan-out

`findBestDepartureTime` scans 12 time slots. For each slot it calls `predictTraffic`, which calls `fetchAllSegments` first. With 12 road segments and 12 slots this is 12 full `SELECT` scans of `road_segments` plus 12 `segment_speed_observations` aggregates. The `road_segments` table is static after seeding and could be fetched once per request (or cached module-level with a multi-minute TTL). The `segment_speed_observations` query is genuinely slot-specific but still runs 12 times; batching all 12 `(day_of_week, hour_of_day)` pairs into a single query with a `WHERE (day_of_week, hour_of_day) IN (...)` would reduce that to one round-trip.

### FEAT completion status

| FEAT | Status | Notes |
|------|--------|-------|
| FEAT-001 GpsValidator | ✅ Complete | All six validation rules present and correctly ordered. Haversine implemented. Module-level cache should be removed (see Issues). |
| FEAT-002 tracking.ts routes | ✅ Complete | GPS validation wired, mock data gated on `isProd`, new `/traffic/segments`, `/traffic/predict`, `/traffic/best-time` endpoints present. Legacy `/traffic` route is a dead query (see Issues). |
| FEAT-003 TrafficScreen.tsx | ✅ Complete | Departure selector, ML predictions, confidence labels, best-time card all present. `usingCache` banner has a stale-state bug. |
| FEAT-004 ML microservice | ✅ Complete | FastAPI scaffold, XGBoost trainer, predictor present. Segment encoding consistent between trainer and predictor. Day-of-week bug in predictor. Microservice intentionally not wired into gateway; SQL baseline is the production path. |

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `services/api-gateway/src/services/GpsValidator.ts` | New — haversine, six validation rules, module-level driver cache |
| `services/api-gateway/src/services/TrafficPredictor.ts` | New — SQL-based speed prediction, best-departure scan, GPS-to-segment ingestion |
| `services/api-gateway/src/routes/tracking.ts` | Extended — GPS validation wired to driver update, three new traffic endpoints added |
| `apps/passenger-app/screens/TrafficScreen.tsx` | New — departure selector, ML predictions, confidence labels, best-time card |
| `services/api-gateway/migrations/016_gps_ml_pipeline.sql` | New — five tables created, 12 road segments seeded; missing UNIQUE constraint on cache table |
| `services/ml-service/main.py` | New — FastAPI scaffold with `/health` and `/predict` endpoints |
| `services/ml-service/trainer.py` | New — XGBoost trainer pulling from `segment_speed_observations` |
| `services/ml-service/predictor.py` | New — model loader/predictor with hash-based segment encoding; day-of-week bug |
| `services/ml-service/requirements.txt` | New — pinned deps: fastapi, uvicorn, psycopg2-binary, scikit-learn, xgboost, pandas, numpy |

</details>
