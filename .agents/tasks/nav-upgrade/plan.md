# Implementation Plan: Safiri Haraka Navigation Upgrade

## Overview

Upgrade navigation across all four Safiri Haraka apps to match Bolt-like industry standards:
- **Passenger app**: Add bottom tabs (Home, Activity, Payments, Notifications, Account)
- **Driver app**: Enhance bottom tabs from 4 to 5 (Home, Earnings, Activity, Notifications, Account)
- **Admin panel**: Expand sidebar from 5 to 12 sections (Overview, Users, Drivers, Fleet, Trips, Finance, Pricing, Promotions, Analytics, Support, Staff & Roles, Settings)
- **Operator dashboard**: Expand sidebar from 6 to 14 routes focusing on real-time operations (Live Overview, Dispatch, Live Map, Active Trips, Drivers, Incidents, Cancellations, Demand & Supply, Support Queue, Service Alerts, plus existing Fleet, Earnings, Reports, Settings)

## Gap Analysis

### Passenger App (React Native + Expo)
**Current**: Stack navigator with drawer-style MainScreen, no bottom tabs
- ✅ Has: MainScreen (map + drawer), RideRequest, TripActive, Rating, Orders, Payment, Promo, Settings, Support, Profile, Traffic
- ❌ Missing: Bottom tab navigation, dedicated Home/Activity/Payments/Notifications/Account tabs

**Target**: 5 bottom tabs
- Home → map, location, booking UI
- Activity → trip history with filters
- Payments → payment methods, transactions
- Notifications → driver updates, payment confirmations, promos
- Account → profile, settings, help, logout

### Driver App (React Native + Expo)
**Current**: 4 bottom tabs (Home, Trips, Earnings, Profile)
- ✅ Has: Bottom tabs already, home screen with online toggle, trip workflows, earnings breakdown
- ❌ Missing: Notifications tab, enhanced Account section

**Target**: 5 bottom tabs (Home, Earnings, Activity, Notifications, Account)
- Rename Trips → Activity
- Add Notifications tab
- Rename Profile → Account and enhance content

### Admin Panel (React + Vite)
**Current**: 5 sidebar items (Dashboard, Drivers, Passengers, Trips, Settings)
- ✅ Has: Sidebar navigation, existing pages functional
- ❌ Missing: Fleet, Finance, Pricing, Promotions, Analytics, Support, Staff & Roles pages

**Target**: 12 sidebar sections
- Rename Dashboard → Overview
- Rename Passengers → Users
- Add 7 new scaffold pages: Fleet, Finance, Pricing, Promotions, Analytics, Support, Staff & Roles

### Operator Dashboard (React + Vite + Tailwind)
**Current**: 6 sidebar items (Dashboard, Fleet, Drivers, Earnings, Reports, Settings)
- ✅ Has: Sidebar navigation with Tailwind styling, Lucide icons, existing operational pages
- ❌ Missing: Dispatch, Live Map, Active Trips, Incidents, Cancellations, Demand & Supply, Support Queue, Service Alerts

**Target**: 14 routes (10 new operational + 4 existing)
- Rename Dashboard → Live Overview
- Add 8 new operational pages with real-time focus

---

## Implementation Plan

- [ ] **1. Passenger App: Refactor to Bottom Tab Navigation**
      
      **What**: Transform passenger-app from single MainScreen with drawer to 5-tab bottom navigation (Home, Activity, Payments, Notifications, Account). Extract map/booking UI from MainScreen to new HomeScreen. Create new screens for Activity, Payments, Notifications, and refactor Profile into Account screen.
      
      **Files**:
      - Create: `apps/passenger-app/navigation/MainTabNavigator.tsx`
      - Create: `apps/passenger-app/navigation/HomeStackNavigator.tsx`
      - Create: `apps/passenger-app/screens/HomeScreen.tsx` (extract from MainScreen.tsx)
      - Create: `apps/passenger-app/screens/ActivityScreen.tsx`
      - Create: `apps/passenger-app/screens/PaymentsScreen.tsx`
      - Create: `apps/passenger-app/screens/NotificationsScreen.tsx`
      - Create: `apps/passenger-app/screens/AccountScreen.tsx` (refactor ProfileScreen)
      - Modify: `apps/passenger-app/App.tsx` (replace Main screen with MainTabNavigator)
      - Modify: `apps/passenger-app/i18n/en.json` (add tab_home, tab_activity, tab_payments, tab_notifications, tab_account, activity_title, payments_title, notifications_title, account_title, no_notifications, mark_all_read, add_payment_method, transaction_history, saved_places, refer_friends, legal_terms, about_app)
      - Modify: `apps/passenger-app/i18n/sw.json` (add Swahili translations for above keys)
      
      **Verify**: 
      ```bash
      cd apps/passenger-app
      npx expo start
      # Open in iOS Simulator or Android Emulator
      # 1. Verify 5 bottom tabs appear and are tappable
      # 2. Tap each tab and verify correct screen loads
      # 3. From Home tab, tap "Where to?" and verify RideRequestScreen opens
      # 4. Navigate to Activity and verify trip history displays
      # 5. Navigate to Payments and verify payment methods list
      # 6. Navigate to Notifications and verify list appears
      # 7. Navigate to Account and verify all menu items present
      # 8. Change language to Swahili and verify all labels update
      # 9. Test ride booking flow end-to-end from Home tab
      ```

- [ ] **2. Driver App: Enhance to 5-Tab Navigation with Notifications**
      
      **What**: Upgrade driver-app from 4 tabs (Home, Trips, Earnings, Profile) to 5 tabs (Home, Earnings, Activity, Notifications, Account). Rename Trips → Activity, Profile → Account. Add new NotificationsScreen. Update content in TripsScreen (now Activity) and ProfileScreen (now Account) to match industry patterns.
      
      **Files**:
      - Modify: `apps/driver-app/src/navigation/MainNavigator.tsx` (reorder tabs: Home, Earnings, Activity, Notifications, Account; update tab labels and icons)
      - Create: `apps/driver-app/src/screens/main/NotificationsScreen.tsx`
      - Modify: `apps/driver-app/src/screens/main/TripsScreen.tsx` (enhance with filters: All/Completed/Cancelled)
      - Modify: `apps/driver-app/src/screens/main/ProfileScreen.tsx` (add sections: Vehicle Registration, Driving License, Required Documents, Verification Status)
      - Modify: `apps/driver-app/src/i18n/locales/en.json` (add tab_activity, tab_notifications, tab_account, notifications_title, no_notifications, mark_all_read, account_title, vehicle_registration, driving_license, required_documents, verification_status)
      - Modify: `apps/driver-app/src/i18n/locales/sw.json` (add Swahili translations for above keys)
      
      **Verify**:
      ```bash
      cd apps/driver-app
      npx expo start
      # Open in iOS Simulator or Android Emulator
      # 1. Verify 5 bottom tabs appear: Home, Earnings, Activity, Notifications, Account
      # 2. Tap each tab and verify correct screen loads
      # 3. On Home tab, toggle online/offline and verify status changes
      # 4. Navigate to Earnings and verify daily/weekly/monthly breakdown
      # 5. Navigate to Activity and verify trip history with filters
      # 6. Navigate to Notifications and verify list displays
      # 7. Navigate to Account and verify all sections present
      # 8. Test trip acceptance flow from Home tab
      # 9. Change language to Swahili and verify all labels update
      ```

- [ ] **3. Admin Panel: Expand to 12-Section Sidebar**
      
      **What**: Expand admin-panel sidebar from 5 items (Dashboard, Drivers, Passengers, Trips, Settings) to 12 items (Overview, Users, Drivers, Fleet, Trips, Finance, Pricing, Promotions, Analytics, Support, Staff & Roles, Settings). Rename Dashboard→Overview, Passengers→Users. Create 7 new scaffold pages with placeholder content.
      
      **Files**:
      - Modify: `apps/admin-panel/src/components/Layout.tsx` (update NAV_ITEMS array to 12 items with icons and labelKeys)
      - Modify: `apps/admin-panel/src/pages/Dashboard.tsx` (or keep as-is, just relabel in nav)
      - Rename/Modify: `apps/admin-panel/src/pages/Passengers.tsx` → `Users.tsx`
      - Create: `apps/admin-panel/src/pages/Fleet.tsx` (scaffold with title, subtitle, placeholder table)
      - Create: `apps/admin-panel/src/pages/Finance.tsx` (scaffold)
      - Create: `apps/admin-panel/src/pages/Pricing.tsx` (scaffold)
      - Create: `apps/admin-panel/src/pages/Promotions.tsx` (scaffold)
      - Create: `apps/admin-panel/src/pages/Analytics.tsx` (scaffold)
      - Create: `apps/admin-panel/src/pages/Support.tsx` (scaffold)
      - Create: `apps/admin-panel/src/pages/StaffRoles.tsx` (scaffold)
      - Modify: `apps/admin-panel/src/App.tsx` (update router children to include all 12 routes, import new components)
      - Modify: `apps/admin-panel/src/i18n.ts` (add keys: nav_overview, nav_users, nav_fleet, nav_finance, nav_pricing, nav_promotions, nav_analytics, nav_support, nav_staff, and corresponding page titles/subtitles in both en and sw)
      
      **Verify**:
      ```bash
      cd apps/admin-panel
      npm run dev
      # Open browser to http://localhost:5173 (or assigned port)
      # 1. Log in with admin credentials
      # 2. Verify sidebar displays 12 navigation items
      # 3. Click each item and verify page loads with title and subtitle
      # 4. Verify Overview (formerly Dashboard) shows existing dashboard content
      # 5. Verify Users (formerly Passengers) shows user management table
      # 6. Verify Drivers, Trips, Settings pages unchanged
      # 7. Verify each new page (Fleet, Finance, Pricing, Promotions, Analytics, Support, Staff & Roles) displays with placeholder structure
      # 8. Verify sidebar highlights active route correctly
      # 9. Change language and verify nav labels translate
      # 10. Resize window small and verify sidebar scrolls
      ```

- [ ] **4. Operator Dashboard: Expand to 14-Route Operations Console**
      
      **What**: Expand operator-dashboard from 6 routes to 14, focusing on real-time operations. Rename Dashboard→Live Overview. Add 8 new pages: Dispatch, Live Map (with Leaflet), Active Trips, Incidents, Cancellations, Demand & Supply, Support Queue, Service Alerts. Keep existing Fleet, Drivers, Earnings, Reports, Settings.
      
      **Files**:
      - Modify: `apps/operator-dashboard/src/components/Sidebar.tsx` (update navItems to 10+ items, group operational vs management, update Lucide icons)
      - Modify: `apps/operator-dashboard/src/pages/Dashboard.tsx` (or rename/relabel to LiveOverview)
      - Create: `apps/operator-dashboard/src/pages/Dispatch.tsx` (scaffold: Available Drivers, Pending Requests, Manual Assignment, Dispatch History)
      - Create: `apps/operator-dashboard/src/pages/LiveMap.tsx` (scaffold with react-leaflet map centered on DSM, driver markers, filters)
      - Create: `apps/operator-dashboard/src/pages/ActiveTrips.tsx` (scaffold with table: Trip ID, Driver, Passenger, Pickup, Destination, Status, ETA, Actions)
      - Create: `apps/operator-dashboard/src/pages/Incidents.tsx` (scaffold with table: Incident ID, Trip ID, Type, Severity, Status, Actions)
      - Create: `apps/operator-dashboard/src/pages/Cancellations.tsx` (scaffold with table + analytics: cancellation rate, top reasons)
      - Create: `apps/operator-dashboard/src/pages/DemandSupply.tsx` (scaffold: Demand Heatmap, Supply vs Demand chart, Driver Availability by Hour)
      - Create: `apps/operator-dashboard/src/pages/SupportQueue.tsx` (scaffold with table: Ticket ID, Requester, Subject, Priority, Status, Actions)
      - Create: `apps/operator-dashboard/src/pages/ServiceAlerts.tsx` (scaffold: form to create alert, list of active/past alerts)
      - Modify: `apps/operator-dashboard/src/App.tsx` (update router children to include all 14 routes, import new components)
      - Modify: `apps/operator-dashboard/src/i18n/en.json` and `sw.json` (add keys: nav_live_overview, nav_dispatch, nav_live_map, nav_active_trips, nav_incidents, nav_cancellations, nav_demand_supply, nav_support_queue, nav_service_alerts, and corresponding titles/subtitles)
      
      **Verify**:
      ```bash
      cd apps/operator-dashboard
      npm run dev
      # Open browser to http://localhost:5173 (or assigned port)
      # 1. Log in with operator credentials
      # 2. Verify sidebar displays all navigation items in logical groups
      # 3. Click Live Overview and verify page loads
      # 4. Click Dispatch and verify page displays with sections for Available Drivers, Pending Requests, Manual Assignment
      # 5. Click Live Map and verify Leaflet map renders centered on Dar es Salaam (-6.7924, 39.2083)
      # 6. Click Active Trips and verify table displays with correct columns
      # 7. Click Drivers and verify existing Drivers page unchanged
      # 8. Click Incidents and verify page displays with table structure
      # 9. Click Cancellations and verify table + analytics placeholder
      # 10. Click Demand & Supply and verify heatmap, chart, tables
      # 11. Click Support Queue and verify ticket table
      # 12. Click Service Alerts and verify alert form + list
      # 13. Click Fleet, Earnings, Reports, Settings and verify existing pages unchanged
      # 14. Change language and verify all nav labels translate
      # 15. Resize window and verify sidebar scrolls
      ```

---

## i18n Keys Summary

### Passenger App (apps/passenger-app/i18n/)
**English (en.json)**: tab_home, tab_activity, tab_payments, tab_notifications, tab_account, activity_title, payments_title, notifications_title, account_title, no_notifications, mark_all_read, add_payment_method, transaction_history, saved_places, refer_friends, legal_terms, about_app

**Swahili (sw.json)**: tab_home: "Nyumbani", tab_activity: "Shughuli", tab_payments: "Malipo", tab_notifications: "Arifa", tab_account: "Akaunti", activity_title: "Shughuli", payments_title: "Malipo", notifications_title: "Arifa", account_title: "Akaunti", no_notifications: "Hakuna arifa", mark_all_read: "Weka yote kusoma", add_payment_method: "Ongeza njia ya malipo", transaction_history: "Historia ya shughuli", saved_places: "Maeneo yaliyohifadhiwa", refer_friends: "Waelekeze marafiki", legal_terms: "Masharti ya kisheria", about_app: "Kuhusu programu"

### Driver App (apps/driver-app/src/i18n/locales/)
**English (en.json)**: tab_activity, tab_notifications, tab_account, notifications_title, no_notifications, mark_all_read, account_title, vehicle_registration, driving_license, required_documents, verification_status

**Swahili (sw.json)**: tab_activity: "Shughuli", tab_notifications: "Arifa", tab_account: "Akaunti", notifications_title: "Arifa", no_notifications: "Hakuna arifa", mark_all_read: "Weka yote kusoma", account_title: "Akaunti", vehicle_registration: "Usajili wa Gari", driving_license: "Leseni ya Udereva", required_documents: "Hati Zinazohitajika", verification_status: "Hali ya Uthibitisho"

### Admin Panel (apps/admin-panel/src/i18n.ts)
**English**: nav_overview, nav_users, nav_fleet, nav_finance, nav_pricing, nav_promotions, nav_analytics, nav_support, nav_staff, fleet_title, fleet_subtitle, finance_title, finance_subtitle, pricing_title, pricing_subtitle, promotions_title, promotions_subtitle, analytics_title, analytics_subtitle, support_title, support_subtitle, staff_title, staff_subtitle

**Swahili**: nav_overview: "Muhtasari", nav_users: "Watumiaji", nav_fleet: "Usafiri", nav_finance: "Fedha", nav_pricing: "Bei", nav_promotions: "Matangazo", nav_analytics: "Uchambuzi", nav_support: "Msaada", nav_staff: "Wafanyakazi na Majukumu", fleet_title: "Usimamizi wa Usafiri", finance_title: "Fedha", pricing_title: "Usimamizi wa Bei", promotions_title: "Matangazo", analytics_title: "Uchambuzi", support_title: "Tiketi za Msaada", staff_title: "Wafanyakazi na Majukumu"

### Operator Dashboard (apps/operator-dashboard/src/i18n/)
**English (en.json)**: nav_live_overview, nav_dispatch, nav_live_map, nav_active_trips, nav_incidents, nav_cancellations, nav_demand_supply, nav_support_queue, nav_service_alerts, plus corresponding title/subtitle keys

**Swahili (sw.json)**: nav_live_overview: "Muonekano wa Moja kwa Moja", nav_dispatch: "Utumaji", nav_live_map: "Ramani ya Moja kwa Moja", nav_active_trips: "Safari Zinazoendelea", nav_incidents: "Matukio", nav_cancellations: "Kufutwa", nav_demand_supply: "Mahitaji na Ugavi", nav_support_queue: "Foleni ya Msaada", nav_service_alerts: "Arifa za Huduma"

---

## Constraints & Risks

**Constraints**:
- Preserve all existing features and routes — no functionality loss
- Use existing navigation libraries (React Navigation v6 for mobile, react-router-dom v6 for web)
- Match existing component and icon libraries (@expo/vector-icons for passenger, react-native-vector-icons for driver, emoji for admin, lucide-react for operator)
- Maintain existing i18n patterns and language support (English/Swahili)
- No breaking API changes

**Architectural Risks**:
- **Passenger app**: Significant refactor from drawer-style to tabs. Risk: breaking ride booking flow or losing drawer functionality. Mitigation: extract MainScreen map/booking logic carefully, test ride flow thoroughly.
- **Driver app**: Modest change (4→5 tabs). Risk: low. Mitigation: ensure trip workflows (accept, navigate, complete) remain intact after tab reordering.
- **Admin & Operator dashboards**: Additive changes (new routes/pages). Risk: low, but many new pages. Mitigation: scaffold pages with clear structure, verify routing and sidebar scrolling.

**Dependencies**:
- Passenger app: @react-navigation/bottom-tabs (already installed)
- Driver app: react-native-vector-icons/MaterialCommunityIcons (already used)
- Operator dashboard: react-leaflet, leaflet (already in package.json)
- All: react-i18next or custom i18n (already configured)

**No new dependencies required.**

---

## Testing Strategy

1. **Manual smoke testing** per app after each feature:
   - Verify navigation structure appears correctly
   - Test all tabs/routes are accessible
   - Verify i18n labels in both languages
   - Test existing workflows (ride booking, trip acceptance, admin approvals)

2. **Cross-feature integration testing** after all features:
   - Verify no regressions in auth flows
   - Test deep linking / push notification navigation (passenger, driver)
   - Verify responsive behavior (web dashboards on mobile viewport)

3. **No automated tests exist currently** — manual verification is the primary strategy.

---

## Acceptance Criteria (Overall)

- [ ] Passenger app has 5 bottom tabs (Home, Activity, Payments, Notifications, Account) and ride booking works end-to-end
- [ ] Driver app has 5 bottom tabs (Home, Earnings, Activity, Notifications, Account) and trip workflows are intact
- [ ] Admin panel has 12 sidebar items, all routes accessible, existing pages functional
- [ ] Operator dashboard has 14 routes with operational focus, Live Map renders correctly
- [ ] All apps support English and Swahili i18n for navigation labels
- [ ] No existing functionality is lost or broken
- [ ] All verification commands pass successfully

---

## Rollout Plan

1. Implement passenger app navigation (FEAT-001) → test → commit
2. Implement driver app navigation (FEAT-002) → test → commit
3. Implement admin panel navigation (FEAT-003) → test → commit
4. Implement operator dashboard navigation (FEAT-004) → test → commit
5. Integration testing across all apps
6. Final review and merge

**Estimated effort**: 3-5 features × 2-4 hours each = 8-16 hours total implementation + 2-4 hours integration testing.

