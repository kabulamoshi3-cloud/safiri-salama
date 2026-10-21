# Trip State Machine Rewrite — trips.ts

The rewrite replaces an ad-hoc status-mutation API with a formal state machine for the full trip lifecycle: REQUESTED → ACCEPTED → DRIVER_ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED, with CANCELLED exits from most states. Every transition is atomic — a single transaction SELECTs FOR UPDATE, UPDATEs the trips row, and INSERTs the audit log entry, with a ROLLBACK on any failure. The old `/status` catch-all is tombstoned as 410 Gone. WebSocket push is delegated to the tracking-service via best-effort HTTP, which keeps Socket.IO out of the gateway entirely.

Watch for: **ARRIVED → CANCELLED is missing from the passenger cancel path** (confirmed — TRANSITIONS allows only `actor: 'driver'` from ARRIVED, but the cancel endpoint doesn't give passengers a 403, it silently falls through to a 409 from the state machine); the **active-trip guard has a TOCTOU gap for the first concurrent insert** (confirmed — FOR UPDATE locks only existing rows; the partial unique index catches the race but returns a raw 23505 code rather than a 409 with a useful body); and the **admin role sees a confusing scope in GET /** (likely — the whereClause for non-passenger/non-driver falls back to `passenger_id = $1 OR driver_id = $1` rather than a full-scan, so admins only see their own trips).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The `TRANSITIONS` table in `trips.types.ts` is the authoritative source for what is legal. ARRIVED → CANCELLED is restricted to `actor: 'driver'` only, matching the schema's driver no-show intent. The cancel endpoint's precondition guard only validates a cancellation reason for drivers in the ARRIVED state — it never explicitly forbids passengers. The actor check inside `transitionTrip` blocks them, but with a 409 "Invalid transition" rather than a 403. Passengers are forbidden from that path; the wrong status code misrepresents why.

The active-trip guard in POST /trips uses a layered strategy: FOR UPDATE on existing rows prevents duplicate concurrent inserts when a row already exists (returns 409 with `active_trip_id`), and the partial unique index catches the first-insert race. The 23505 catch converts the constraint violation to a 409, but the response body loses `active_trip_id` — mobile clients that rely on this field to navigate to the conflicting trip hit a dead end on the race path.

GET / scopes passengers and drivers correctly, but the admin/operator branch sets `whereClause = '(t.passenger_id = $1 OR t.driver_id = $1)'`, meaning an admin only sees trips they personally took. GET /:tripId has the same gap: an admin fetching a trip they're not party to gets 404 rather than 403, leaking whether a given trip ID exists.

The rating endpoint adds a correct 409 idempotency guard against re-submission, but the trip rating update and user average recalculation run as two separate `pool.query` calls outside a transaction. A crash between them leaves the trip rated but the user's aggregate stale.

---

<details>
<summary>Issues (6)</summary>

1. **Passenger cancel blocked from ARRIVED without clear error** — TRANSITIONS allows ARRIVED → CANCELLED only for `actor: 'driver'`. A passenger who calls PATCH /cancel on an ARRIVED trip gets a 409 "Invalid transition" rather than a 403. The plan's migration comment explicitly documents this restriction ("Requires a cancellation_reason — covers driver no-show scenarios"). The cancel handler should detect this case and return 403 with an explanatory message. (confirmed)

2. **Active-trip 23505 response loses active_trip_id** — When the unique partial index fires (the first-insert TOCTOU race), the 23505 catch returns `{ error: 'You already have an active trip' }` with no `active_trip_id`. The FOR UPDATE path correctly includes `active_trip_id`. Mobile clients that rely on this field to navigate to the existing trip will fail silently for the race path. (confirmed)

3. **Admin GET / scope is party-scoped, not global** — The non-passenger/non-driver branch sets `whereClause = '(t.passenger_id = $1 OR t.driver_id = $1)'`. An admin calling GET / with their own JWT will only see trips they personally took as a passenger or driver, not all trips in the system. If admin/operator roles need a full view, the clause should be `'1=1'` or omitted for those roles. (confirmed — behaviour is visible in the code; whether it's a bug depends on the access-control spec)

4. **GET /:tripId returns 404 for admins on trips they're not party to** — The `WHERE t.id = $1 AND (t.passenger_id = $2 OR t.driver_id = $2)` query conflates "not found" and "forbidden" for admin callers. An admin fetching an existing trip they're not party to gets 404, which leaks the non-existence of trip IDs in the admin tool. GET /:tripId/state-log correctly handles admins with an explicit 403; /:tripId should match. (confirmed)

5. **Rating update runs outside a transaction** — POST /:tripId/rate issues two separate `pool.query` calls: one to set `passenger_rating`/`driver_rating` on the trip, and a second to recalculate and write `users.rating`. If the process dies between the two, the trip has a rating but the user's aggregate is stale. The two updates should run in a single transaction. (confirmed)

6. **`any` type in error handling helpers** — `sendTransitionError` and `transitionTrip` use `err as any` to read `statusCode` and `message`. The pattern is contained and consistent, but a typed `ApiError` interface would eliminate the unsafe casts and make the error contract explicit across all transition call sites. (confirmed — minor, not blocking)

</details>

<details>
<summary>Details</summary>

### ARRIVED → CANCELLED passenger path

The `TRANSITIONS` table enforces ARRIVED → CANCELLED as driver-only (`actor: 'driver'`). The cancel handler has a `preconditions` array that fires only when `actorType === 'driver'`; it never explicitly blocks passengers. When a passenger calls PATCH /cancel on an ARRIVED trip, `transitionTrip` finds no matching transition and throws `statusCode: 409` with "Invalid transition: ARRIVED → CANCELLED". The caller sees a conflict error, not a forbidden error — semantically wrong. A fix is to check inside `transitionTrip` (or the handler) whether the blocked transition exists for a different actor type, and return 403 in that case.

### Active-trip 23505 response gap

Two concurrent POST / requests with no existing active trip both pass the FOR UPDATE check (no rows to lock), both attempt INSERT, and one hits the `trips_one_active_per_passenger` unique constraint. The outer catch converts 23505 to 409, but returns `{ error: 'You already have an active trip' }` with no `active_trip_id`. The FOR UPDATE path correctly includes `active_trip_id`. A client that gets the race-path 409 cannot navigate to the blocking trip. Fix: query the active trip in the 23505 catch block and include its ID in the response.

### Rating without a transaction

```
// Two separate pool.query calls:
await pool.query(`UPDATE trips SET passenger_rating = $1 ...`, [...]);
await pool.query(`UPDATE users SET rating = (SELECT AVG(...)) ...`, [...]);
```

A crash or connection drop between these two queries leaves the trip with a rating but the driver's average unrecalculated. Over time, repeated partial writes cause `users.rating` to drift from the actual average. Wrapping both in a `BEGIN`/`COMMIT` eliminates this window.

### TypeScript `any` usage

`transitionTrip` throws errors typed as `any` via `const err = new Error(...) as any; err.statusCode = N`. `sendTransitionError` reads `(err as any).statusCode`. The pattern works but bypasses TypeScript's type system entirely for the error channel of every state transition. A simple `interface ApiError extends Error { statusCode: number }` would remove all the casts. This is non-blocking but creates a maintenance footprint as more transitions are added.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `services/api-gateway/src/routes/trips.ts` | Full rewrite — state machine transitions, atomic accept, audit log, all endpoints |
| `services/api-gateway/src/routes/trips.types.ts` | New file — TripStatus, TripRow, TripStateLogRow, TRANSITIONS table |
| `services/api-gateway/migrations/012_trip_state_machine.sql` | New migration — trip_state_logs table, timestamp columns, partial unique index |

Full diff: `git diff main -- services/api-gateway/src/routes/trips.ts services/api-gateway/src/routes/trips.types.ts services/api-gateway/migrations/012_trip_state_machine.sql`

</details>
