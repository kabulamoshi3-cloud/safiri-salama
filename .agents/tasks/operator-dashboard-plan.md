# Implementation Plan — Operator Dashboard

Target: `apps/operator-dashboard/` — React 18 + TypeScript + Vite SPA, matching driver-dashboard visual style.

**FEAT artifacts are under `.agents/tasks/operator-dashboard-run/`. The workflow tail has been restructured into 3 sequential FEAT coders + a convergence loop. This plan is kept as a reference fallback.**

---

## Exploration findings

- `apps/driver-dashboard/src/` is the visual template: `bg-gray-900` sidebar, `blue-600` active nav, `bg-gray-50` main area, white `rounded-lg shadow` cards.
- Auth pattern: `apps/admin-panel` uses `createBrowserRouter` + `<RequireAuth>` + `AuthContext`. The operator dashboard uses Zustand (matching driver-dashboard) instead of React Context, but router structure matches admin-panel.
- API gateway `POST /api/v1/auth/login` takes `{phone, password}` — operator login form labels "Email" but submits as `phone` field.
- `GET /api/v1/earnings/summary` and `/history` exist in `services/api-gateway/src/routes/earnings.ts`.
- `GET /api/v1/tracking/nearby` exists and returns mock drivers near Dar es Salaam in non-prod.
- `GET /api/v1/drivers` returns driver list (admin route — may 403 for operator token; mock fallback needed).
- No fleet-management endpoints exist (vehicles CRUD for an operator context) — Fleet and parts of Drivers use mock data.
- i18n pattern: inline resources object in a single `i18n/index.ts` file, JSON files imported and spread in.
- Leaflet needs icon default patch and `leaflet/dist/leaflet.css` import before Tailwind directives.

---

## Implementation Plan

- [ ] 1. **Install missing dependencies and create config files.**
      Add to `package.json` deps: `axios`, `recharts`, `lucide-react`, `zustand`, `leaflet`, `react-leaflet`, `@types/leaflet`. Add to devDeps: `tailwindcss`, `autoprefixer`, `postcss`. Create `index.html` (Vite boilerplate, title "SkyRex Operator Dashboard"), `vite.config.ts` (Vite+React plugin, port 5175), `tailwind.config.js` (content `['./index.html','./src/**/*.{ts,tsx}']`), `postcss.config.js`.
      Files: `apps/operator-dashboard/package.json`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
      Verify: `cd apps/operator-dashboard && npm install --legacy-peer-deps` exits 0.

- [ ] 2. **Create src/vite-env.d.ts and src/index.css.**
      `vite-env.d.ts`: `/// <reference types="vite/client" />` + `ImportMetaEnv` interface with `VITE_API_URL`.
      `index.css`: `@import 'leaflet/dist/leaflet.css';` first line, then `@tailwind base/components/utilities`. PNG module declaration if needed.
      Files: `src/vite-env.d.ts`, `src/index.css`
      Verify: `npm run build` does not error on CSS import.

- [ ] 3. **Create Zustand auth store (`src/store/auth.ts`).**
      `Operator` interface: `{id, name, phone, email, fleet_name, status}`. `AuthState`: `operator | null`, `isAuthenticated` (init from `!!localStorage.getItem('operator_token')`), `loading`, `token`. `login()` POSTs to `/auth/login` with `{phone, password}`, stores `operator_token`. `logout()` removes it. Follow `driver-dashboard/src/store/auth.ts` exactly.
      Files: `src/store/auth.ts`
      Verify: TypeScript compiles — `npm run build`.

- [ ] 4. **Create Axios API client (`src/services/api.ts`).**
      `baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'`. Request interceptor reads `operator_token`. Response interceptor 401 → `/login`. Matches `driver-dashboard/src/services/api.ts`.
      Files: `src/services/api.ts`
      Verify: `npm run build`.

- [ ] 5. **Create i18n translation files and initializer.**
      `src/i18n/en.json` — all keys for all 7 pages: nav keys, login keys, stat card keys, table headers, fleet/drivers/earnings/reports/settings keys, status labels. `src/i18n/sw.json` — same key set in Swahili. `src/i18n/index.ts` — imports both JSONs, calls `i18n.use(initReactI18next).init({resources:{en:{translation:en},sw:{translation:sw}}, lng:'en', fallbackLng:'en', interpolation:{escapeValue:false}})`.
      Files: `src/i18n/en.json`, `src/i18n/sw.json`, `src/i18n/index.ts`
      Verify: `npm run build`.

- [ ] 6. **Create shared components: StatCard, AlertBadge, Sidebar, RequireAuth, VehicleCard, DriverCard.**
      `StatCard`: copy from `driver-dashboard/src/components/StatCard.tsx` exactly — props `{title, value, icon: React.ReactNode, color, trend?, subtext?}`.
      `AlertBadge`: `{status: string}` → colored badge span.
      `Sidebar`: fixed `w-64 bg-gray-900` with SkyRex logo, 5 nav links (Dashboard, Fleet, Drivers, Earnings, Reports), footer (Settings + Logout). Active = `bg-blue-600`. All text via `t()`. Shows operator name + fleet_name.
      `RequireAuth`: reads `useAuthStore().isAuthenticated`, redirects to `/login`.
      `VehicleCard`, `DriverCard`: minimal card components.
      Files: `src/components/Sidebar.tsx`, `src/components/StatCard.tsx`, `src/components/AlertBadge.tsx`, `src/components/RequireAuth.tsx`, `src/components/VehicleCard.tsx`, `src/components/DriverCard.tsx`
      Verify: `npm run build`.

- [ ] 7. **Create Login page (`src/pages/Login.tsx`) — full implementation.**
      Email + password form. Submit sends `{phone: emailValue, password}` to `useAuthStore().login()`. Error → `t('login_error')`. Spinner on loading. Tailwind-styled centered card on `bg-gray-100`. Logo/title at top. No inline styles — Tailwind classes only. Pattern adapted from `admin-panel/src/pages/Login.tsx`.
      Files: `src/pages/Login.tsx`
      Verify: `npm run build`.

- [ ] 8. **Create App.tsx, Layout, and main.tsx.**
      `src/App.tsx`: `createBrowserRouter` — `/login` → `<Login>`, `/` → `<RequireAuth><Layout /></RequireAuth>` with children for Dashboard, Fleet, Drivers, Earnings, Reports, Settings.
      `src/components/Layout.tsx` (or inline): `<Sidebar />` + `<main className="ml-64 flex-1 bg-gray-50 min-h-screen"><Outlet /></main>`.
      Stub placeholder pages for Dashboard, Fleet, Drivers, Earnings, Reports, Settings (just `<div>Page name</div>`).
      `src/main.tsx`: imports `./i18n/index`, `./index.css`, renders `<App />`.
      Files: `src/App.tsx`, `src/main.tsx`, `src/pages/Dashboard.tsx` (stub), `src/pages/Fleet.tsx` (stub), `src/pages/Drivers.tsx` (stub), `src/pages/Earnings.tsx` (stub), `src/pages/Reports.tsx` (stub), `src/pages/Settings.tsx` (stub)
      Verify: `npm run build && npm test` — both exit 0. Full project structure now compiles.

- [ ] 9. **Implement Fleet page (`src/pages/Fleet.tsx`).**
      Fetch `GET /api/v1/drivers` (admin route); mock fallback `// MOCK DATA` 5 vehicles. Table: plate, type, driver, mileage, last_maintenance, status (`AlertBadge`), Edit button. Edit modal: form with Save/Cancel. Add Vehicle button + form. Labels via `t()`.
      Files: `src/pages/Fleet.tsx`
      Verify: `npm run build`.

- [ ] 10. **Implement Drivers page (`src/pages/Drivers.tsx`).**
      Fetch driver list (mock fallback `// MOCK DATA`). StatCards row: total/online/avg rating. Table: name, phone, status badge, trips, rating, earnings, plate, Assign/Unassign button. Assign modal with vehicle select. Labels via `t()`.
      Files: `src/pages/Drivers.tsx`
      Verify: `npm run build`.

- [ ] 11. **Implement Earnings page (`src/pages/Earnings.tsx`).**
      Fetch `GET /api/v1/earnings/summary` and `/history`. Period tabs (Today/Week/Month/All). Stat cards: gross, commission (15% mock), payout. Commission breakdown table. Payout history table. CSV export button (data URI download). Labels via `t()`.
      Files: `src/pages/Earnings.tsx`
      Verify: `npm run build`.

- [ ] 12. **Implement Reports page (`src/pages/Reports.tsx`).**
      All mock data (`// MOCK DATA`). 4 Recharts charts: trip volume BarChart (30 days), top drivers table, vehicle utilization BarChart, revenue per vehicle horizontal BarChart. Period selector. Labels via `t()`.
      Files: `src/pages/Reports.tsx`
      Verify: `npm run build`.

- [ ] 13. **Implement Settings page (`src/pages/Settings.tsx`).**
      Sections: Fleet Info form (fleet_name, contact — PATCH /api/v1/auth/me), Commission Rate (read-only mock 15%), Notifications toggles (useState), Language select (`i18n.changeLanguage()`), Account/Logout. Toggle component matches `driver-dashboard/src/pages/Settings.tsx`. Labels via `t()`.
      Files: `src/pages/Settings.tsx`
      Verify: `npm run build`.

- [ ] 14. **Implement Dashboard page (`src/pages/Dashboard.tsx`) — map + charts.**
      4 StatCards: total vehicles (mock), online drivers (`GET /api/v1/tracking/nearby` count; mock fallback), active trips (mock), today revenue (`GET /api/v1/earnings/summary` `.today`).
      Leaflet map `h-80`: patch default icon with `L.Icon.Default.mergeOptions({...})` module-level, `MapContainer` center Dar es Salaam, `TileLayer` OSM, `Marker`s from tracking/nearby response (mock 3 drivers).
      Revenue LineChart (last 7 days, `GET /api/v1/earnings/history` aggregated; mock fallback).
      Trips-per-vehicle BarChart (mock 5 vehicles).
      Recent alerts list (mock 5 entries, `AlertBadge` for type).
      All text via `t()`.
      Files: `src/pages/Dashboard.tsx`
      Verify: `npm run build` exits 0 — zero TypeScript/Vite errors.

- [ ] 15. **Final verification: full build + test.**
      Run `npm install --legacy-peer-deps && npm run build && npm test` from `apps/operator-dashboard/`. Fix any remaining TS errors (PNG imports, recharts types, leaflet types). Confirm `dist/` directory created with `index.html` and `assets/`.
      Files: any files needing TS fixes
      Verify: `npm run build` — "built in Xs" message, exit 0. `npm test` — "passed" or "no test files found", exit 0.

---

## Key decisions recorded

1. **Auth field**: Login POSTs `phone` field (operator value from the email input) — api-gateway auth.ts queries `WHERE phone = $1`. Label shows "Email" in UI since operators may use email-style phone.
2. **Zustand over Context**: driver-dashboard uses Zustand; operator-dashboard follows same pattern for consistency. Admin-panel's React Context is not adopted.
3. **createBrowserRouter**: Admin-panel's router pattern is used (children + Outlet layout) rather than driver-dashboard's simpler BrowserRouter pattern, since it cleanly separates the login route from the protected layout.
4. **react-leaflet**: Used instead of raw Leaflet imperative API — integrates cleanly with React component lifecycle and matches the component-based codebase style.
5. **Mock data**: Fleet CRUD, driver assignment, reports analytics, and commission rates are mocked with `// MOCK DATA` comments since no operator-scoped endpoints exist for these. API calls are attempted first with try/catch fallback.
6. **i18n as JSON files**: Separate `en.json`/`sw.json` imported into `index.ts` — cleaner than admin-panel's inline resources object, easier to extend.
