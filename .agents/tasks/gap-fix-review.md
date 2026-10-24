# Safiri Haraka — Seven gap fixes (pass 2)

All seven placeholders and dead-code items identified in the gap analysis have been addressed
across two commits. The prior review pass flagged two blocking issues: a `RoleBasedRoute`
`correctDashboard` logic gap for `super_admin`, and missing driver app links in `Footer.tsx`.
Both are resolved in the follow-up commit. `HomePage.tsx` icon deviation (emoji vs react-icons)
is also corrected.

**Watch for:** No remaining blocking concerns. All 7 gaps are confirmed fixed.

**Verdict**: APPROVED

---

## High-level view

TripDetailsScreen and VehicleInfoScreen both replace single-line placeholder `<Text>` with
full implementations: API fetch, loading/error states with retry, and card-based scroll
layouts using theme tokens. Both screens receive navigation/route props correctly and are
wired into `HomeStackParamList`. VehicleInfoScreen handles the nested-vs-flat profile
response shape defensively (`data.vehicle ?? data`) and expiry warnings fire at < 30 days
in `theme.colors.error`.

TripsScreen.tsx is deleted with zero remaining references in the passenger app — confirmed
by grep.

The `super_admin` role plumbing covers the full surface: type union, login detection (both
`super_admin` and `superadmin` API values), `RootRedirect`, `RoleBasedRoute` bypass guard,
`/admin` and `/ops` `allowedRoles`, sidebar selection in `Layout.tsx`, and `AdminSidebar`
rendering extra ops nav items for `super_admin`. The `correctDashboard` fallback in
`RoleBasedRoute` now uses `role !== 'operator' ? '/admin' : '/ops'`, which correctly routes
`super_admin` (and any future non-operator, non-admin role) to `/admin`.

Admin panel Passengers page is imported, routed at `/passengers`, and appears in the sidebar
with i18n keys in both English and Swahili.

The HelpPage contact form is positioned above Emergency Numbers, covers all six required
fields (name, contact, category, message, select, submit), POSTs to
`/support/create-ticket`, and shows green success / red error states. The error banner
renders at the top of the form rather than immediately above the submit button, which is a
minor visual deviation from the plan spec but is not a blocker.

All three public-website files now have both passenger and driver download sections using
`FaGooglePlay` / `FaApple` from react-icons with the correct store URLs. The disclaimer note
("Links will be updated when apps are published on the stores.") is present in HomePage and
ServicesPage. Footer carries the disclaimer note implicitly through section labels rather
than an explicit text note — acceptable, as the plan's disclaimer requirement was stated for
the named sections only.

<details>
<summary>Issues (0)</summary>

No blocking issues remain.

</details>

<details>
<summary>Details</summary>

## GAP 1 — TripDetailsScreen replacement

Reads `tripId` from `route.params`, fetches `GET /trips/:tripId` via `APIClient.get`. The
`TripDetail` interface uses snake_case names (`pickup_address`, `distance_km`, etc.) which
matches the REST convention used by the existing API client throughout the project.
`formatDateTime` accepts both `created_at` and `started_at` to guard against backend
variation. Stars render using `MaterialCommunityIcons` `star`/`star-outline` for filled/empty
states. The "Report an Issue" button deep-links to `mailto:support@safiriharaka.co.tz` with the
trip reference URI-encoded.

## GAP 2 — VehicleInfoScreen replacement

Calls `GET /drivers/profile` and handles both flat (`data.plate`) and nested (`data.vehicle.plate`)
response shapes. Expiry warnings fire at < 30 days. The save path calls
`PUT /drivers/vehicle/:id` when `vehicleId` is available, otherwise falls back to
`POST /drivers/vehicle` — handling the new-vehicle case. Edit form pre-fills from fetched
data and resets on cancel.

## GAP 3 — TripsScreen deletion

`apps/passenger-app/screens/TripsScreen.tsx` is deleted. `grep -r "TripsScreen" apps/passenger-app/`
returns no output — confirmed no navigator or screen references remain.

## GAP 4 — super_admin role coverage

`UserRole` extended to include `'super_admin'`. Login mapping detects both `super_admin` and
`superadmin` from the API response `userType` field. `RoleBasedRoute` bypass guard:
`role !== 'super_admin'` prevents any denial page rendering. `correctDashboard` fixed to
`role !== 'operator' ? '/admin' : '/ops'` — `super_admin` lands at `/admin`. `AdminSidebar`
renders a labelled Admin + Operations nav section for `super_admin`.

## GAP 5 — HelpPage contact form

All six fields present. POSTs to `${VITE_API_URL}/support/create-ticket`. Success state
replaces the form with a green banner. Error state shows a red inline banner at the top of
the form (plan spec said above the submit button — minor placement deviation, not blocking).
Section is inserted at line 271, before Emergency Numbers at line 372.

## GAP 6 — Admin panel Passengers page

`Passengers` imported in `App.tsx`, routed at `children` path `passengers` inside the
authenticated layout. `NAV_ITEMS` in `Layout.tsx` adds the sidebar entry. `i18n.ts` adds
`nav_passengers: 'Passengers'` (English) and `nav_passengers: 'Abiria'` (Swahili).

## GAP 7 — Download links

All three files updated. URLs match the plan spec exactly. Both passenger and driver sections
present in HomePage, ServicesPage, and Footer. `FaGooglePlay` / `FaApple` from `react-icons/fa`
used across all three files (HomePage previously used emoji — corrected in the follow-up commit).

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|--------------|
| `apps/driver-app/src/screens/trip/TripDetailsScreen.tsx` | Full replacement — API fetch, loading/error/retry, header/route/stats/passenger/rating/report cards |
| `apps/driver-app/src/screens/profile/VehicleInfoScreen.tsx` | Full replacement — API fetch, verification badge, document expiry warnings, edit form |
| `apps/passenger-app/screens/TripsScreen.tsx` | Deleted |
| `apps/staff-portal/src/context/AuthContext.tsx` | `super_admin` added to `UserRole`; login mapping extended |
| `apps/staff-portal/src/components/RoleBasedRoute.tsx` | Bypass guard added; `correctDashboard` fixed for non-operator roles |
| `apps/staff-portal/src/App.tsx` | `RootRedirect` and `allowedRoles` updated for `super_admin` |
| `apps/staff-portal/src/components/Layout.tsx` | Sidebar selection inverted; `role` prop passed to sidebar |
| `apps/staff-portal/src/components/AdminSidebar.tsx` | Accepts `role` prop; renders merged Admin+Ops nav for `super_admin` |
| `apps/staff-portal/src/components/OperatorSidebar.tsx` | Accepts optional `role` prop |
| `apps/admin-panel/src/App.tsx` | Imports `Passengers`; adds `/passengers` route |
| `apps/admin-panel/src/components/Layout.tsx` | Adds `nav_passengers` sidebar entry |
| `apps/admin-panel/src/i18n.ts` | Adds `nav_passengers` in English and Swahili |
| `apps/public-website/src/pages/HelpPage.tsx` | Adds contact form above Emergency Numbers |
| `apps/public-website/src/pages/HomePage.tsx` | Replaces dead download divs with passenger+driver link groups; emoji icons replaced with react-icons |
| `apps/public-website/src/pages/ServicesPage.tsx` | Replaces dead download divs with passenger+driver link groups using react-icons |
| `apps/public-website/src/components/Footer.tsx` | Adds driver app links below passenger links |

Full diff: `git diff HEAD~2..HEAD` in `/home/masalago/projects/daladala`

</details>
