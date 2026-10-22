# GPS ML Pipeline — Fix Verification Pass

All 6 blocking issues from the prior review were addressed in commit `84f5841`. The approach is correct in every case. No new blocking concerns were introduced.

**Watch for:** The GPS cache is now bounded rather than removed — see Issue 4 discussion below for why this is acceptable but a partial fix relative to the original recommendation.

**Verdict**: APPROVED

---

## High-level view

The UNIQUE constraint is delivered as a separate migration (017) rather than patching 016, which is the right call for a deployed schema — existing environments can apply the fix without replaying the full pipeline migration. The `ON CONFLICT` upsert will now work correctly.

The legacy `/traffic` route now queries `road_segments` with a column alias list that maps the new schema to the old field names callers expected, preserving backward compatibility without perpetuating the nonexistent-table error.

The Python predictor's DOW calculation is now correct. The `dar_dt = dt + timedelta(hours=3)` shift followed by `(dar_dt.weekday() + 1) % 7` cleanly mirrors the PostgreSQL Sunday=0 convention and eliminates the midnight-rollover bug in one step.

The GPS cache is now capped at 10,000 entries via LRU-style eviction (insertion-order first key). It still exists as module-level state, but it is no longer unbounded. The original review flagged this as dead weight because `handleGpsUpdate` always passes `previous` explicitly — that analysis still holds, but a bounded cache is a safe improvement and the leak risk is gone.

`findBestDepartureTime` now calls `fetchAllSegments` once and threads the result through `predictTrafficWithSegments`, an internal variant of `predictTraffic` that accepts a pre-fetched segment list. The public `predictTraffic` signature is unchanged. The 12-slot scan is now 1 `road_segments` query plus 12 `segment_speed_observations` aggregates instead of 13 per slot.

`TrafficScreen.tsx` resets `usingCache` to `false` at the top of `fetchTraffic`. A successful traffic poll now clears the stale-data banner, and a successful predict call also clears it inside `fetchPredict`. Both paths are covered.

---

<details>
<summary>Issues (0)</summary>

No blocking concerns remain. All 6 original issues are resolved.

</details>

---

<details>
<summary>Details</summary>

### Issue 1 — UNIQUE constraint: confirmed resolved

Migration 017 adds `UNIQUE (segment_id, predicted_for)` via `ALTER TABLE ... ADD CONSTRAINT`. The constraint name is explicit (`traffic_predictions_cache_segment_predicted_unique`), which makes future drops or inspections unambiguous. The `ON CONFLICT (segment_id, predicted_for)` clause in `tracking.ts` now has a backing constraint and will no longer throw `42P10`.

### Issue 2 — Legacy `/traffic` route: confirmed resolved

The query now targets `road_segments` with explicit column aliases (`id AS segment_id`, `typical_speed_kmh AS speed_kmh`). The `WHERE is_active = true OR is_active IS NULL` guard is defensive — it handles both the seeded rows (which have `is_active` set) and any rows where the column might be null. The route now returns real data in production.

### Issue 3 — Python predictor DOW: confirmed resolved

```python
dar_dt = dt + _dt_mod.timedelta(hours=3)
dar_day = (dar_dt.weekday() + 1) % 7
dar_hour = dar_dt.hour
```

`timedelta(hours=3)` correctly advances the date when crossing midnight — `datetime + timedelta` rolls over the date automatically, so the midnight-rollover conditional in the original code is no longer needed. `(weekday() + 1) % 7` maps Python's Mon=0…Sun=6 to PostgreSQL's Sun=0…Sat=6 without range overflow. Sunday: `weekday()=6`, `(6+1)%7=0`. Monday: `weekday()=0`, `(0+1)%7=1`. Correct.

### Issue 4 — GPS cache: confirmed bounded, not removed

The cap is 10,000 entries with oldest-first eviction. The original recommendation was to remove the cache entirely because `handleGpsUpdate` always passes `previous` explicitly. That path is still the production path; the cache is still dead weight in practice. However, a 10,000-entry cap with eviction eliminates the unbounded-growth risk. The fix is pragmatically sufficient — the cache can't grow large enough to cause memory pressure at any realistic driver fleet size.

### Issue 5 — `fetchAllSegments` fan-out: confirmed resolved

`findBestDepartureTime` calls `fetchAllSegments` once before the slot loop. The inner `totalMinutes` closure now calls `predictTrafficWithSegments` (the new internal function) with the pre-fetched `allSegments`. The public `predictTraffic` function is a thin wrapper that fetches segments and delegates, so its external callers (route handlers in `tracking.ts`) are unaffected. The 12-slot scan is now 1 segments query + 12 observations queries, down from 12 × (1 + 1) = 24 queries per best-time request.

### Issue 6 — `usingCache` banner: confirmed resolved

`setUsingCache(false)` is called at the very top of `fetchTraffic`, before the `try` block. This means every successful traffic poll clears the banner regardless of what the predict path did previously. Inside `fetchPredict`, `setUsingCache(false)` is also called after a successful predict response. The failure path sets `setUsingCache(true)` in the catch block. All three state transitions are now consistent.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `services/api-gateway/migrations/017_cache_unique_constraint.sql` | New migration — adds UNIQUE constraint to `traffic_predictions_cache(segment_id, predicted_for)` |
| `services/api-gateway/src/routes/tracking.ts` | Legacy `/traffic` route repointed from nonexistent `traffic_segments` to `road_segments` with column aliases |
| `services/api-gateway/src/services/GpsValidator.ts` | Module-level cache capped at 10,000 entries with insertion-order eviction |
| `services/api-gateway/src/services/TrafficPredictor.ts` | `predictTrafficWithSegments` extracted; `findBestDepartureTime` calls `fetchAllSegments` once |
| `services/ml-service/predictor.py` | DOW calculation replaced with `timedelta(hours=3)` shift + `(weekday()+1)%7` |
| `apps/passenger-app/screens/TrafficScreen.tsx` | `setUsingCache(false)` added at top of `fetchTraffic` |

</details>
