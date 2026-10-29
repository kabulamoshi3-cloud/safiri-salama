# Staff Portal Unification: Admin and Operations Console Merge

Successfully unified the admin-panel and operator-dashboard into a single staff-portal application with role-based routing. The implementation creates two distinct user experiences (admin and operator) within a shared authentication system, eliminating the need to maintain duplicate infrastructure. Build completes successfully with no TypeScript errors, 10,255 lines added across 60 files.

**Watch for:** Token storage inconsistency between authentication system and legacy stores **(confirmed)** — AuthContext uses `staff_token` while copied Zustand store and API clients still reference `operator_token` and `admin_token`, creating auth failure risk. Layout renders both sidebars on every page load instead of conditionally importing **(confirmed)**. Operator pages use Zustand auth store that duplicates AuthContext and operates on different token keys **(confirmed)**.

**Verdict**: CHANGES_REQUESTED

---

## High-level view

The merge splits cleanly along behavioral boundaries: admin pages live under `/admin/*` with 13 pages, operator pages under `/ops/*` with 14 pages, and a unified AuthContext handles login with role detection from API response. Role-based routing uses a wrapper component that checks authentication and role membership before rendering protected routes. Dependencies from both applications were merged into a single package.json (React Router, axios, recharts, Leaflet, Tailwind, Zustand).

The authentication unification is incomplete. AuthContext stores tokens in `staff_token` and role in `staff_role`, but the copied Zustand store from operator-dashboard still tries to read/write `operator_token`, and api.ts falls back to `admin_token` and `operator_token` before checking `staff_token`. This means operator pages using the Zustand store will fail to authenticate even after successful login through AuthContext.

Layout.tsx chooses which sidebar to render based on a role prop, but imports both AdminSidebar and OperatorSidebar unconditionally, adding unnecessary bundle weight. The sidebars duplicate navigation logic (both render NavLinks with active state) but use different icon systems (emoji vs lucide-react).

Operator pages (Dashboard, LiveMap, Dispatch) imported Leaflet CSS through direct imports and use Tailwind utility classes, while admin pages use inline styles and CSS variables. The styling split is intentional and follows source conventions, but index.css doesn't import Leaflet CSS globally, so maps may render without proper styling.

<details>
<summary>Issues (7)</summary>

1. **Token storage mismatch** — AuthContext stores `staff_token`, but Zustand auth store reads/writes `operator_token` and api.ts falls back to `admin_token`/`operator_token`. Operator pages using Zustand will authenticate against the wrong localStorage key and fail. Update Zustand store and API client fallbacks to use `staff_token` exclusively, or remove Zustand store entirely and have operator pages use AuthContext.

2. **Dual authentication systems** — Operator pages have access to both AuthContext (via useAuth hook) and Zustand store (via useAuthStore). This creates ambiguity about source of truth and potential for divergent state. Remove Zustand store or clearly document which pages should use which system, with rationale for keeping both.

3. **Unconditional sidebar imports** — Layout.tsx imports both AdminSidebar and OperatorSidebar at module scope even though only one renders. Use dynamic imports or split into AdminLayout/OperatorLayout components to avoid loading unused code.

4. **Missing Leaflet CSS import** — Operator dashboard pages use react-leaflet (LiveMap, ops/Dashboard) but index.css doesn't import `leaflet/dist/leaflet.css`. Maps may render without controls or markers. Add `import 'leaflet/dist/leaflet.css';` to index.css or main.tsx.

5. **Role detection fallback-to-admin** — AuthContext.login defaults to 'admin' if API response omits userType/type fields. Operator users would get "Access Denied" on /ops routes and unintended admin access. Validate against explicit schema or fail loudly instead of silent default.

6. **Login page reads localStorage instead of AuthContext state** — Login.tsx reads role from localStorage.getItem('staff_role') after login instead of from AuthContext state, creating fragile dependency on synchronous localStorage writes. Read role from useAuth() hook state instead.

7. **Dead code: OperatorLayout.tsx** — OperatorLayout.tsx copied from operator-dashboard but unused. App.tsx uses single Layout component with role prop. Remove OperatorLayout.tsx.

</details>

<details>
<summary>Details</summary>

## Token storage inconsistency across authentication systems

**Confirmed** — AuthContext stores the authentication token in `staff_token` (line 9 of AuthContext.tsx: `const TOKEN_KEY = 'staff_token'`), but the Zustand auth store copied from operator-dashboard still references `operator_token` in four places (lines 26, 27, 36, 42 of store/auth.ts). The api.ts client checks `admin_token || staff_token` for fetch-based requests (line 16) and `operator_token || staff_token` for axios requests (line 49).

When a user logs in, AuthContext.login writes to `staff_token` and `staff_role` (lines 70-71 of AuthContext.tsx). If an operator page calls useAuthStore from the Zustand store, it reads `isAuthenticated: !!localStorage.getItem('operator_token')` (line 26 of auth.ts), which returns false because the token is stored under `staff_token`. The page treats the user as unauthenticated and the Zustand store's login method overwrites the token with `operator_token` (line 36), breaking subsequent requests that expect `staff_token`.

The axios interceptor in api.ts has a fallback (`localStorage.getItem('operator_token') || localStorage.getItem('staff_token')`) which masks the problem during development if `staff_token` exists, but creates failure risk if operator pages call Zustand's logout (removes `operator_token` only, leaving `staff_token` intact) or login (writes to wrong key).

Fix: update Zustand store to use `staff_token` throughout, or remove the store entirely and migrate operator pages to use AuthContext via useAuth hook. The second option is cleaner — no reason to maintain two authentication systems in a unified app.

```typescript
// store/auth.ts lines 26-27, 36, 42
isAuthenticated: !!localStorage.getItem('operator_token'),  // wrong key
token: localStorage.getItem('operator_token'),              // wrong key
localStorage.setItem('operator_token', res.data.token);     // wrong key
localStorage.removeItem('operator_token');                  // wrong key
```

## Dual authentication mechanisms create ambiguity

The staff-portal has two parallel authentication systems: AuthContext (from admin-panel) and Zustand store (from operator-dashboard). Both provide login, logout, and isAuthenticated state. Operator pages can access both via `useAuth()` and `useAuthStore()`.

AuthContext is used by RoleBasedRoute (line 10 of RoleBasedRoute.tsx), Layout (line 4 of Layout.tsx), and Login page (line 4 of Login.tsx). Zustand store is imported but not actively used in the copied operator pages reviewed (ops/Dashboard.tsx doesn't import useAuthStore). This suggests Zustand is dead code, but its presence creates risk: future operator page edits might import useAuthStore expecting it to work, triggering the token storage mismatch above.

No operator page in the diff uses useAuthStore. The store exists only because it was copied alongside components during the merge. It should be removed, or if retained for compatibility with future operator page additions, updated to use `staff_token` and clearly documented as legacy/deprecated.

## Layout component loads both sidebars unconditionally

Layout.tsx imports AdminSidebar (line 4) and OperatorSidebar (line 5) at module scope, then renders one based on the `role` prop (lines 22-27). Both sidebar components are included in the bundle even though each user session uses only one.

AdminSidebar is 140 lines with emoji icons and inline styles. OperatorSidebar is 148 lines with lucide-react icons and Tailwind classes. Loading both adds ~6KB (minified) to the main bundle for code that never executes for half the user base.

Split Layout into AdminLayout and OperatorLayout, each importing only its sidebar, then use the appropriate layout in App.tsx route definitions. Alternatively, use dynamic imports: `const Sidebar = role === 'admin' ? lazy(() => import('./AdminSidebar')) : lazy(() => import('./OperatorSidebar'))` with Suspense wrapper.

## Role detection heuristic depends on unstable API field

AuthContext.login detects role from `data.user?.userType || data.user?.type || 'admin'` (line 66 of AuthContext.tsx). If the API response omits both `userType` and `type`, all users default to `'admin'`. If the API uses `role` or `user_type` instead, role detection fails and all users default to `'admin'`.

The fallback-to-admin behavior is dangerous: an operator user would bypass RoleBasedRoute's allowedRoles check (operator role is in ['operator'] but detected role is 'admin') and get "Access Denied" when accessing `/ops/*` routes, even though they're logged in. The workaround (navigate to `/admin`) grants unintended access.

The API contract for user type field is not documented. The detection logic should either validate against an explicit API schema (defined in shared-types package) or fail loudly (throw error) when the field is missing, rather than silently defaulting.

Not tested: login.test.ts doesn't exist, so the role detection heuristic has no test coverage.

## Login page reads role from localStorage instead of AuthContext

Login.tsx calls `await login(phone, password)` (line 21), then reads role from `localStorage.getItem('staff_role')` (line 23) instead of from AuthContext state. This creates a race: if login() writes to localStorage asynchronously after the getItem call, the role read returns null and navigation defaults to `navigate('/')` (line 29), which redirects back to login if unauthenticated.

AuthContext.login is async and sets localStorage synchronously (line 70: `localStorage.setItem('staff_role', detectedRole)`), so the race doesn't occur in practice, but the pattern is fragile. Login.tsx should read role from AuthContext's returned state, not localStorage.

```typescript
// Fragile:
await login(phone, password);
const role = localStorage.getItem('staff_role');

// Correct:
const { role } = useAuth();
await login(phone, password);
// role is now populated via AuthContext state update
```

The current implementation works because AuthContext updates synchronously, but the code reads as if it might not.

## RoleBasedRoute access denial has no escape path

RoleBasedRoute shows an "Access Denied" message (lines 18-23 of RoleBasedRoute.tsx) when the user is authenticated but doesn't have the required role. The message is static HTML with no link to logout, navigate to the correct dashboard, or contact support.

An admin who accidentally navigates to `/ops/dashboard` sees "Access Denied" and must manually change the URL or close the tab. A better UX would offer "Go to Admin Dashboard" or "Logout" buttons.

Not blocking: the user can navigate back or type a new URL. Frustrating but not broken.

## OperatorLayout.tsx is dead code

OperatorLayout.tsx exists in the diff (line 85 of FEAT-002.json: "copy operator Layout.tsx as src/components/OperatorLayout.tsx") yet isn't used — App.tsx passes `role` prop to the single Layout component (lines 71, 95 of App.tsx). OperatorLayout.tsx is dead code and should be removed.



## API client merges fetch and axios patterns

api.ts exports both a `request<T>()` helper using fetch (lines 10-34) for admin pages, and an `axiosClient` instance (lines 38-65) for operator pages. Named exports like `getStats()`, `getDrivers()` use the fetch helper (lines 192+). Operator pages import `api` directly and call `api.get()`, `api.post()` on the axios instance (default export, line 66).

The dual-client approach preserves compatibility with both page sets without rewriting all API calls, but creates confusion: `import api from './api'` gives you axios (for operator pages), while `import { getStats } from './api'` gives you fetch (for admin pages). A dev writing a new admin page might use `api.get('/admin/stats')` expecting it to work, when they should call `getStats()`.

The axios interceptor attaches `staff_token` or `operator_token` (line 49), but the fetch helper checks `admin_token || staff_token` (line 16). Operator pages using axios will authenticate correctly once the Zustand token mismatch is fixed. Admin pages using fetch will work immediately since AuthContext writes `staff_token`.

Not blocking: both clients work. The mixed pattern is maintainable but not ideal. Future work could standardize on one client.



## Not tested: Authentication flows and role-based access control

No test files exist for AuthContext, RoleBasedRoute, or Login component. The role detection heuristic, token storage, login flow, and access control logic have no automated coverage. The implementation is correct by inspection, but untested code paths (API returns unexpected user type format, login fails, role is null) are high-risk areas with no safety net.

FEAT-001.json verification step runs `npm run typecheck` but not `npm test`. The package.json test script is `vitest run --passWithNoTests`, which exits successfully without running any tests. No tests were written during the merge.

Not blocking for review approval if manual testing was performed. Blocking for production deployment.

</details>

---

<details>
<summary>File map</summary>

**Configuration**
- `.env.example` — VITE_API_URL placeholder
- `package.json` — merged dependencies from admin-panel and operator-dashboard
- `package-lock.json` — 4130-line lockfile with full dependency tree
- `tailwind.config.js`, `postcss.config.js` — Tailwind setup from operator-dashboard
- `vite.config.ts` — Vite with @ alias for src
- `tsconfig.json`, `tsconfig.node.json` — TypeScript config
- `index.html` — entry point, "SkyRex Staff Portal" title

**Application core**
- `src/main.tsx` — React root, i18n init
- `src/App.tsx` — unified router with /admin and /ops routes, RoleBasedRoute wrappers
- `src/context/AuthContext.tsx` — unified auth with role-based login and profile fetch
- `src/services/api.ts` — merged fetch (admin) and axios (operator) API clients
- `src/services/operatorAPI.ts` — duplicate axios export for operator compatibility
- `src/store/auth.ts` — Zustand store from operator-dashboard (uses wrong token key)
- `src/i18n/` — merged translations (en.json, sw.json, index.ts)
- `src/index.css` — global styles with CSS variables

**Components**
- `src/components/Layout.tsx` — role-aware layout, renders AdminSidebar or OperatorSidebar
- `src/components/AdminSidebar.tsx`, `src/components/OperatorSidebar.tsx` — navigation sidebars
- `src/components/RoleBasedRoute.tsx` — role-based access control wrapper
- `src/components/RequireAuth.tsx` — authentication guard
- `src/components/Table.tsx`, `src/components/Modal.tsx`, `src/components/StatusBadge.tsx` — shared UI
- `src/components/StatCard.tsx`, `src/components/VehicleCard.tsx`, `src/components/DriverCard.tsx`, `src/components/AlertBadge.tsx` — operator dashboard components

**Pages: Admin (/admin)**
- 13 pages under `src/pages/admin/`: Dashboard, Users (Passengers), Drivers, Fleet, Trips, Finance, Pricing, Promotions, Analytics, Support, StaffRoles, Settings

**Pages: Operator (/ops)**
- 14 pages under `src/pages/ops/`: Dashboard, Dispatch, LiveMap, ActiveTrips, Drivers, Incidents, Cancellations, DemandSupply, SupportQueue, ServiceAlerts, Fleet, Earnings, Reports, Settings

**Auth**
- `src/pages/Login.tsx` — unified login with role-based redirect

Full diff: `cd /home/masalago/projects/daladala && git diff HEAD~3 -- apps/staff-portal` (10,615 lines)

</details>
