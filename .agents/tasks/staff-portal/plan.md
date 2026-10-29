# Implementation Plan: Merge Admin Panel and Operator Dashboard into Staff Portal

## Overview

Merge `/home/masalago/projects/daladala/apps/admin-panel` and `/home/masalago/projects/daladala/apps/operator-dashboard` into a unified `/home/masalago/projects/daladala/apps/staff-portal` with role-based routing and shared authentication.

---

## Directory Structure Analysis

### admin-panel structure
```
apps/admin-panel/
├── package.json                     # React 18.3.1, react-router-dom 6.26.1, react-i18next
├── vite.config.ts                   # @ alias -> ./src
├── tsconfig.json                    # baseUrl: ".", strict: false
├── index.html                       # title: "SkyRex Admin"
├── src/
│   ├── main.tsx                     # Entry: imports './i18n', renders <App />
│   ├── i18n.ts                      # Single file with embedded en/sw translations
│   ├── index.css                    # CSS variables, inline styles used throughout
│   ├── App.tsx                      # BrowserRouter with AuthProvider wrapper
│   ├── context/
│   │   └── AuthContext.tsx          # Context API: token, isAuthenticated, setToken, logout
│   ├── components/
│   │   ├── RequireAuth.tsx          # Checks isAuthenticated, redirects to /login
│   │   ├── Layout.tsx               # Sidebar (inline styles) + Outlet
│   │   ├── Modal.tsx                # Generic modal
│   │   ├── StatusBadge.tsx
│   │   └── Table.tsx
│   ├── pages/
│   │   ├── Login.tsx                # Admin login: checks userType === 'admin'
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Drivers.tsx
│   │   ├── Fleet.tsx
│   │   ├── Trips.tsx
│   │   ├── Finance.tsx
│   │   ├── Pricing.tsx
│   │   ├── Promotions.tsx
│   │   ├── Analytics.tsx
│   │   ├── Support.tsx
│   │   ├── StaffRoles.tsx
│   │   ├── Settings.tsx
│   │   └── Passengers.tsx
│   └── services/
│       ├── api.ts                   # Fetch-based API client, token: 'admin_token'
│       └── AdminAPI.ts
```

### operator-dashboard structure
```
apps/operator-dashboard/
├── package.json                     # React 18.3.1, react-router-dom 6.26.1, axios, zustand, 
│                                    # recharts, lucide-react, leaflet, react-leaflet,
│                                    # tailwindcss, autoprefixer, postcss
├── vite.config.ts                   # No path alias, server port 5175
├── tsconfig.json                    # baseUrl: ".", strict: false
├── index.html                       # title: "SkyRex Operator Dashboard"
├── tailwind.config.js               # (assumed to exist for Tailwind)
├── postcss.config.js                # (assumed to exist for Tailwind)
├── src/
│   ├── main.tsx                     # Entry: imports './i18n/index', renders <App />
│   ├── i18n/
│   │   ├── index.ts                 # i18next init with en.json, sw.json
│   │   ├── en.json
│   │   └── sw.json
│   ├── index.css                    # Tailwind directives
│   ├── App.tsx                      # BrowserRouter, NO AuthProvider wrapper (uses Zustand)
│   ├── store/
│   │   └── auth.ts                  # Zustand store: operator, isAuthenticated, login, logout, fetchProfile
│   ├── components/
│   │   ├── RequireAuth.tsx          # Checks isAuthenticated from Zustand
│   │   ├── Layout.tsx               # Simple wrapper: Sidebar + Outlet
│   │   ├── Sidebar.tsx              # Dark theme, lucide-react icons, Tailwind classes
│   │   ├── StatCard.tsx
│   │   ├── VehicleCard.tsx
│   │   ├── DriverCard.tsx
│   │   └── AlertBadge.tsx
│   ├── pages/
│   │   ├── Login.tsx                # Operator login using Zustand store
│   │   ├── Dashboard.tsx
│   │   ├── Dispatch.tsx
│   │   ├── LiveMap.tsx
│   │   ├── ActiveTrips.tsx
│   │   ├── Drivers.tsx
│   │   ├── Incidents.tsx
│   │   ├── Cancellations.tsx
│   │   ├── DemandSupply.tsx
│   │   ├── SupportQueue.tsx
│   │   ├── ServiceAlerts.tsx
│   │   ├── Fleet.tsx
│   │   ├── Earnings.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   └── services/
│       └── api.ts                   # Axios client with interceptors, token: 'operator_token'
```

---

## Key Findings

### 1. Dependency Comparison

**Shared dependencies (same versions):**
- react: ^18.3.1
- react-dom: ^18.3.1
- react-router-dom: ^6.26.1
- react-i18next: ^15.0.1
- i18next: ^23.14.0
- typescript: ^5.5.4
- vite: ^5.4.2
- vitest: ^2.0.5
- @vitejs/plugin-react: ^4.3.1
- @skyrex/shared-types: file:../../packages/shared-types

**operator-dashboard-specific dependencies (must add to staff-portal):**
- axios: ^1.7.7
- recharts: ^2.12.7
- lucide-react: ^0.447.0
- zustand: ^4.5.5
- leaflet: ^1.9.4
- react-leaflet: ^4.2.1
- @types/leaflet: ^1.9.12
- tailwindcss: ^3.4.13
- autoprefixer: ^10.4.20
- postcss: ^8.4.47

**Version conflicts:** None

### 2. Path Alias Configuration

- **admin-panel:** uses `@` alias → `./src` (defined in vite.config.ts)
- **operator-dashboard:** NO path alias, uses relative imports

**Decision:** Keep `@` alias in staff-portal for consistency with admin pages, update operator pages to use it.

### 3. Authentication Patterns

- **admin-panel:** Context API (`AuthContext.tsx`), localStorage key: `admin_token`, token-only state
- **operator-dashboard:** Zustand store (`store/auth.ts`), localStorage key: `operator_token`, includes user profile (operator, fleet_name)

**Decision:** Extend AuthContext to include role (`admin` | `operator`) and userProfile fields. Keep Context API pattern as primary (admin-panel base), but preserve Zustand store as secondary option for operator pages that need it.

### 4. API Client Patterns

- **admin-panel:** fetch-based, inline token attachment
- **operator-dashboard:** axios with interceptors, auto-redirects on 401

**Decision:** Keep both patterns. Admin pages use fetch-based api.ts, operator pages use axios-based api (rename import or keep separate file).

### 5. i18n Patterns

- **admin-panel:** Single `src/i18n.ts` file with embedded translations object
- **operator-dashboard:** `src/i18n/index.ts` + separate `en.json` / `sw.json` files

**Decision:** Adopt operator-dashboard pattern (separate JSON files) for better maintainability. Merge all translations from admin-panel i18n.ts into en.json/sw.json.

### 6. Styling Patterns

- **admin-panel:** Inline styles with CSS variables (--color-accent, --color-sidebar-bg, etc.)
- **operator-dashboard:** Tailwind CSS utility classes (className="flex bg-gray-900 text-white")

**Decision:** Keep both. Admin pages continue using inline styles, operator pages use Tailwind. Ensure Tailwind config and postcss.config.js are copied.

### 7. RequireAuth Component

Both apps have `RequireAuth.tsx` but slightly different implementations:
- **admin-panel:** uses `useAuth()` from Context
- **operator-dashboard:** uses `useAuthStore()` from Zustand

**Decision:** Create unified `RequireAuth` that checks AuthContext. Create new `RoleBasedRoute` component for role-specific access control.

### 8. Page Overlap

Both apps have pages with the same name but different content:
- Dashboard.tsx (different stats and layouts)
- Drivers.tsx (admin: driver approvals; operator: real-time driver status)
- Fleet.tsx (admin: system-wide fleet; operator: own fleet)
- Settings.tsx (admin: system settings; operator: profile settings)

**Decision:** Keep both sets separate under `/admin/` and `/ops/` routes.

---

## Implementation Plan

### Phase 1: Create staff-portal base structure

- [ ] 1. **Copy admin-panel as base for staff-portal**

      Copy the entire admin-panel directory (excluding node_modules, dist, .vercel) to apps/staff-portal.
      
      Files: New directory `apps/staff-portal/`
      
      Command:
      ```bash
      rsync -av --exclude='node_modules' --exclude='dist' --exclude='.vercel' \
        /home/masalago/projects/daladala/apps/admin-panel/ \
        /home/masalago/projects/daladala/apps/staff-portal/
      ```
      
      Verify: `ls /home/masalago/projects/daladala/apps/staff-portal/package.json` exists

- [ ] 2. **Update package.json metadata**

      Update name to `@skyrex/staff-portal`, description to "SkyRex Staff Portal — Unified admin and operations console"
      
      Files: `apps/staff-portal/package.json`
      
      Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/package.json | grep staff-portal` shows new name

- [ ] 3. **Merge dependencies from operator-dashboard**

      Add operator-specific dependencies to package.json:
      - dependencies: axios@^1.7.7, recharts@^2.12.7, lucide-react@^0.447.0, zustand@^4.5.5, leaflet@^1.9.4, react-leaflet@^4.2.1, @types/leaflet@^1.9.12
      - devDependencies: tailwindcss@^3.4.13, autoprefixer@^10.4.20, postcss@^8.4.47
      
      Files: `apps/staff-portal/package.json`
      
      Verify: `cd /home/masalago/projects/daladala/apps/staff-portal && npm install` completes without errors

- [ ] 4. **Copy Tailwind configuration**

      Copy tailwind.config.js and postcss.config.js from operator-dashboard if they exist. If missing, create minimal configs for Tailwind to work with operator pages.
      
      Files: `apps/staff-portal/tailwind.config.js`, `apps/staff-portal/postcss.config.js`
      
      Verify: Files exist and can be parsed

- [ ] 5. **Update index.html title**

      Change title from "SkyRex Admin" to "SkyRex Staff Portal"
      
      Files: `apps/staff-portal/index.html`
      
      Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/index.html | grep "Staff Portal"`

---

### Phase 2: Restructure pages and copy operator content

- [ ] 6. **Reorganize admin pages under src/pages/admin/**

      Create `src/pages/admin/` directory and move all existing pages except Login.tsx:
      - Dashboard.tsx, Users.tsx, Drivers.tsx, Fleet.tsx, Trips.tsx
      - Finance.tsx, Pricing.tsx, Promotions.tsx, Analytics.tsx
      - Support.tsx, StaffRoles.tsx, Settings.tsx, Passengers.tsx
      
      Keep Login.tsx at `src/pages/Login.tsx` (shared between roles).
      
      Files: `apps/staff-portal/src/pages/admin/*.tsx`
      
      Commands:
      ```bash
      cd /home/masalago/projects/daladala/apps/staff-portal
      mkdir -p src/pages/admin
      mv src/pages/Dashboard.tsx src/pages/admin/
      mv src/pages/Users.tsx src/pages/admin/
      mv src/pages/Drivers.tsx src/pages/admin/
      mv src/pages/Fleet.tsx src/pages/admin/
      mv src/pages/Trips.tsx src/pages/admin/
      mv src/pages/Finance.tsx src/pages/admin/
      mv src/pages/Pricing.tsx src/pages/admin/
      mv src/pages/Promotions.tsx src/pages/admin/
      mv src/pages/Analytics.tsx src/pages/admin/
      mv src/pages/Support.tsx src/pages/admin/
      mv src/pages/StaffRoles.tsx src/pages/admin/
      mv src/pages/Settings.tsx src/pages/admin/
      mv src/pages/Passengers.tsx src/pages/admin/
      ```
      
      Verify: `ls /home/masalago/projects/daladala/apps/staff-portal/src/pages/admin/*.tsx | wc -l` returns 13

- [ ] 7. **Update all import paths in admin pages**

      In every file under `src/pages/admin/*.tsx`, update imports:
      - `'../components/*'` → `'../../components/*'`
      - `'../services/*'` → `'../../services/*'`
      - `'../context/*'` → `'../../context/*'`
      - OR use `@/components/*`, `@/services/*`, `@/context/*` (preferred with @ alias)
      
      Files: All files in `apps/staff-portal/src/pages/admin/`
      
      Verify: `cd /home/masalago/projects/daladala/apps/staff-portal && npm run typecheck` — no import errors for admin pages

- [ ] 8. **Copy operator pages to src/pages/ops/**

      Copy all pages from operator-dashboard/src/pages/ to staff-portal/src/pages/ops/ (exclude Login.tsx):
      - Dashboard.tsx, Dispatch.tsx, LiveMap.tsx, ActiveTrips.tsx, Drivers.tsx
      - Incidents.tsx, Cancellations.tsx, DemandSupply.tsx, SupportQueue.tsx
      - ServiceAlerts.tsx, Fleet.tsx, Earnings.tsx, Reports.tsx, Settings.tsx
      
      Files: `apps/staff-portal/src/pages/ops/*.tsx`
      
      Commands:
      ```bash
      cd /home/masalago/projects/daladala/apps/staff-portal
      mkdir -p src/pages/ops
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Dashboard.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Dispatch.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/LiveMap.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/ActiveTrips.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Drivers.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Incidents.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Cancellations.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/DemandSupply.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/SupportQueue.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/ServiceAlerts.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Fleet.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Earnings.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Reports.tsx src/pages/ops/
      cp /home/masalago/projects/daladala/apps/operator-dashboard/src/pages/Settings.tsx src/pages/ops/
      ```
      
      Verify: `ls /home/masalago/projects/daladala/apps/staff-portal/src/pages/ops/*.tsx | wc -l` returns 14

- [ ] 9. **Update all import paths in operator pages**

      In every file under `src/pages/ops/*.tsx`, update imports:
      - `'../components/*'` → `'../../components/*'` OR `@/components/*`
      - `'../store/auth'` → `'../../store/auth'` OR `@/store/auth`
      - `'../services/api'` → `'../../services/operatorApi'` OR `@/services/operatorApi`
      
      Files: All files in `apps/staff-portal/src/pages/ops/`
      
      Verify: `cd /home/masalago/projects/daladala/apps/staff-portal && npm run typecheck` — no import errors for ops pages

- [ ] 10. **Copy operator-specific components**

       Copy operator-dashboard components (excluding Layout.tsx and RequireAuth.tsx which already exist):
       - Sidebar.tsx → OperatorSidebar.tsx
       - StatCard.tsx, VehicleCard.tsx, DriverCard.tsx, AlertBadge.tsx → same names
       - Layout.tsx → OperatorLayout.tsx
       
       Files: `apps/staff-portal/src/components/`
       
       Commands:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/Sidebar.tsx src/components/OperatorSidebar.tsx
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/StatCard.tsx src/components/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/VehicleCard.tsx src/components/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/DriverCard.tsx src/components/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/AlertBadge.tsx src/components/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/components/Layout.tsx src/components/OperatorLayout.tsx
       ```
       
       Verify: `ls /home/masalago/projects/daladala/apps/staff-portal/src/components/ | grep -E "(OperatorSidebar|StatCard|VehicleCard|DriverCard|AlertBadge|OperatorLayout)"`

- [ ] 11. **Copy operator Zustand store**

       Copy operator-dashboard store/auth.ts to src/store/auth.ts (create src/store/ directory first)
       
       Files: `apps/staff-portal/src/store/auth.ts`
       
       Commands:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal
       mkdir -p src/store
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/store/auth.ts src/store/
       ```
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/store/auth.ts | grep "useAuthStore"`

- [ ] 12. **Copy operator API client**

       Copy operator-dashboard services/api.ts to src/services/operatorApi.ts
       
       Files: `apps/staff-portal/src/services/operatorApi.ts`
       
       Commands:
       ```bash
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/services/api.ts \
          /home/masalago/projects/daladala/apps/staff-portal/src/services/operatorApi.ts
       ```
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/services/operatorApi.ts | grep "axios"`

---

### Phase 3: Implement unified authentication with roles

- [ ] 13. **Extend AuthContext with role support**

       Update `src/context/AuthContext.tsx` to add:
       - `role: 'admin' | 'operator' | null`
       - `userProfile: { name: string; phone: string; email: string } | null`
       - `login: (phone: string, password: string) => Promise<{ role: 'admin' | 'operator' }>`
       - `fetchProfile: () => Promise<void>`
       
       The login method should:
       1. Call `/api/v1/auth/login` with phone/password
       2. Check `response.user.userType` — if "admin" return role: "admin", otherwise "operator"
       3. Store token in localStorage as `staff_token` (unified key)
       4. Set role and userProfile state
       
       Files: `apps/staff-portal/src/context/AuthContext.tsx`
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/context/AuthContext.tsx | grep -E "(role|userProfile|login|fetchProfile)"`

- [ ] 14. **Create RoleBasedRoute component**

       Create `src/components/RoleBasedRoute.tsx`:
       - Props: `allowedRoles: Array<'admin' | 'operator'>`, `children: ReactNode`
       - Logic:
         - If not authenticated → redirect to `/login`
         - If authenticated but role not in allowedRoles → show "Access Denied" or redirect to appropriate home
       
       Files: `apps/staff-portal/src/components/RoleBasedRoute.tsx`
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/components/RoleBasedRoute.tsx | grep "allowedRoles"`

- [ ] 15. **Update RequireAuth to use extended AuthContext**

       Update `src/components/RequireAuth.tsx` to use extended AuthContext (no logic change, just ensure compatibility)
       
       Files: `apps/staff-portal/src/components/RequireAuth.tsx`
       
       Verify: `cd /home/masalago/projects/daladala/apps/staff-portal && npm run typecheck`

---

### Phase 4: Merge i18n translations

- [ ] 16. **Create i18n directory structure**

       Create `src/i18n/` directory and copy operator-dashboard i18n files:
       - Copy en.json, sw.json from operator-dashboard/src/i18n/
       - Copy index.ts from operator-dashboard/src/i18n/
       
       Files: `apps/staff-portal/src/i18n/index.ts`, `apps/staff-portal/src/i18n/en.json`, `apps/staff-portal/src/i18n/sw.json`
       
       Commands:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal
       mkdir -p src/i18n
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/i18n/en.json src/i18n/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/i18n/sw.json src/i18n/
       cp /home/masalago/projects/daladala/apps/operator-dashboard/src/i18n/index.ts src/i18n/
       ```
       
       Verify: `ls /home/masalago/projects/daladala/apps/staff-portal/src/i18n/*.{json,ts}`

- [ ] 17. **Merge admin translations into i18n JSON files**

       Extract all translation keys from `src/i18n.ts` (admin-panel embedded translations) and merge them into `src/i18n/en.json` and `src/i18n/sw.json`.
       
       Ensure no duplicate keys; operator translations take precedence if key exists in both.
       
       Files: `apps/staff-portal/src/i18n/en.json`, `apps/staff-portal/src/i18n/sw.json`
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/i18n/en.json | grep -E "(nav_users|nav_pricing|nav_dispatch|nav_live_map)"` — should find both admin and operator keys

- [ ] 18. **Delete old i18n.ts and update main.tsx**

       Delete `src/i18n.ts` (old single-file i18n), update `src/main.tsx` import from `'./i18n'` to `'./i18n/index'`
       
       Files: `apps/staff-portal/src/main.tsx`
       
       Commands:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal
       rm src/i18n.ts
       ```
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/main.tsx | grep "i18n/index"`

---

### Phase 5: Build unified App.tsx with role-based routing

- [ ] 19. **Create AdminLayout wrapper**

       Extract sidebar from `src/components/Layout.tsx` into new `src/components/AdminSidebar.tsx`, update Layout.tsx to render AdminSidebar. Or rename existing Layout.tsx to AdminLayout.tsx and create new unified Layout.tsx.
       
       Files: `apps/staff-portal/src/components/AdminLayout.tsx` OR `apps/staff-portal/src/components/AdminSidebar.tsx`
       
       Verify: Component exists and imports correctly

- [ ] 20. **Rebuild App.tsx with unified router**

       Replace `src/App.tsx` content with unified router structure:
       
       ```tsx
       import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
       import { AuthProvider, useAuth } from './context/AuthContext';
       import RoleBasedRoute from './components/RoleBasedRoute';
       import Login from './pages/Login';
       
       // Admin pages
       import AdminLayout from './components/Layout'; // or AdminLayout
       import AdminDashboard from './pages/admin/Dashboard';
       import AdminUsers from './pages/admin/Users';
       // ... all admin pages
       
       // Operator pages
       import OperatorLayout from './components/OperatorLayout';
       import OpsDashboard from './pages/ops/Dashboard';
       import OpsDispatch from './pages/ops/Dispatch';
       // ... all operator pages
       
       function RoleBasedHome() {
         const { role, isAuthenticated } = useAuth();
         if (!isAuthenticated) return <Navigate to="/login" replace />;
         if (role === 'admin') return <Navigate to="/admin" replace />;
         if (role === 'operator') return <Navigate to="/ops" replace />;
         return <Navigate to="/login" replace />;
       }
       
       const router = createBrowserRouter([
         { path: '/login', element: <Login /> },
         { path: '/', element: <RoleBasedHome /> },
         {
           path: '/admin',
           element: <RoleBasedRoute allowedRoles={['admin']}><AdminLayout /></RoleBasedRoute>,
           children: [
             { index: true, element: <AdminDashboard /> },
             { path: 'users', element: <AdminUsers /> },
             // ... all admin routes
           ],
         },
         {
           path: '/ops',
           element: <RoleBasedRoute allowedRoles={['operator']}><OperatorLayout /></RoleBasedRoute>,
           children: [
             { index: true, element: <OpsDashboard /> },
             { path: 'dispatch', element: <OpsDispatch /> },
             // ... all operator routes
           ],
         },
         { path: '*', element: <Navigate to="/" replace /> },
       ]);
       
       export default function App() {
         return (
           <AuthProvider>
             <RouterProvider router={router} />
           </AuthProvider>
         );
       }
       ```
       
       Full list of admin routes (under /admin):
       - / (index) → Dashboard
       - /users → Users
       - /drivers → Drivers
       - /fleet → Fleet
       - /trips → Trips
       - /finance → Finance
       - /pricing → Pricing
       - /promotions → Promotions
       - /analytics → Analytics
       - /support → Support
       - /staff → StaffRoles
       - /settings → Settings
       
       Full list of operator routes (under /ops):
       - / (index) → Dashboard
       - /dispatch → Dispatch
       - /live-map → LiveMap
       - /active-trips → ActiveTrips
       - /drivers → Drivers
       - /incidents → Incidents
       - /cancellations → Cancellations
       - /demand-supply → DemandSupply
       - /support-queue → SupportQueue
       - /service-alerts → ServiceAlerts
       - /fleet → Fleet
       - /earnings → Earnings
       - /reports → Reports
       - /settings → Settings
       
       Files: `apps/staff-portal/src/App.tsx`
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/App.tsx | grep -E "(RoleBasedRoute|/admin|/ops)"`

- [ ] 21. **Update Login page with unified auth flow**

       Update `src/pages/Login.tsx` to:
       1. Import `useAuth()` from AuthContext
       2. Call `login(phone, password)` which returns `{ role }`
       3. Navigate to `/admin` if role === 'admin', `/ops` if role === 'operator'
       
       Files: `apps/staff-portal/src/pages/Login.tsx`
       
       Verify: `cat /home/masalago/projects/daladala/apps/staff-portal/src/pages/Login.tsx | grep -E "(login|/admin|/ops)"`

---

### Phase 6: Final verification and build

- [ ] 22. **Run TypeScript type check**

       Verify no TypeScript errors in the merged codebase.
       
       Files: All TypeScript files
       
       Command:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal && npm run typecheck
       ```
       
       Verify: Exit code 0, no errors

- [ ] 23. **Build the staff-portal app**

       Run production build to verify all imports resolve and Vite can bundle the app.
       
       Files: Generated dist/ folder
       
       Command:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal && npm run build
       ```
       
       Verify: 
       - Build completes without errors
       - `ls /home/masalago/projects/daladala/apps/staff-portal/dist/index.html` exists
       - dist/ folder contains assets/ directory with bundled JS and CSS

- [ ] 24. **Test preview server (optional)**

       Start Vite preview server to manually verify routing and authentication flow.
       
       Command:
       ```bash
       cd /home/masalago/projects/daladala/apps/staff-portal && npm run preview
       ```
       
       Verify: Server starts on port (default 4173), can access /login route

---

## Summary

### Files Created
- `apps/staff-portal/` (entire directory structure)
- `apps/staff-portal/src/pages/admin/*.tsx` (13 admin pages)
- `apps/staff-portal/src/pages/ops/*.tsx` (14 operator pages)
- `apps/staff-portal/src/components/RoleBasedRoute.tsx`
- `apps/staff-portal/src/components/OperatorSidebar.tsx`
- `apps/staff-portal/src/components/OperatorLayout.tsx`
- `apps/staff-portal/src/components/AdminSidebar.tsx` (optional)
- `apps/staff-portal/src/store/auth.ts`
- `apps/staff-portal/src/services/operatorApi.ts`
- `apps/staff-portal/src/i18n/index.ts`, `en.json`, `sw.json`
- `apps/staff-portal/tailwind.config.js`, `postcss.config.js`

### Files Modified
- `apps/staff-portal/package.json` (name, dependencies)
- `apps/staff-portal/index.html` (title)
- `apps/staff-portal/src/App.tsx` (unified router)
- `apps/staff-portal/src/main.tsx` (i18n import)
- `apps/staff-portal/src/context/AuthContext.tsx` (role support)
- `apps/staff-portal/src/components/RequireAuth.tsx` (compatibility)
- `apps/staff-portal/src/pages/Login.tsx` (unified login)
- All files in `src/pages/admin/*.tsx` (import paths)
- All files in `src/pages/ops/*.tsx` (import paths)

### Files Deleted
- `apps/staff-portal/src/i18n.ts` (old single-file i18n)

### Verification Command
```bash
cd /home/masalago/projects/daladala/apps/staff-portal && \
  npm install && \
  npm run typecheck && \
  npm run build && \
  ls dist/index.html
```

Expected output: Build succeeds, dist/index.html exists.
