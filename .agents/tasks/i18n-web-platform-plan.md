# Implementation Plan: i18n for web-platform App

## Context

The web-platform app needs full internationalization for English/Kiswahili support. The i18n infrastructure already exists at `src/i18n/` with 402 translation keys copied from passenger-app.

**Current state:** All UI text is hardcoded in English. LoginPage has a local T object with en/sw translations but doesn't use the i18n system.

**Goal:** Replace all hardcoded strings with `i18n.t(key)` calls and add reactivity so language changes update the UI immediately.


## Files to Modify

### Pages (8 files)
1. `/home/masalago/projects/daladala/apps/web-platform/src/pages/LoginPage.tsx`
2. `/home/masalago/projects/daladala/apps/web-platform/src/pages/HomePage.tsx`
3. `/home/masalago/projects/daladala/apps/web-platform/src/pages/BookingPage.tsx`
4. `/home/masalago/projects/daladala/apps/web-platform/src/pages/ActiveTripPage.tsx`
5. `/home/masalago/projects/daladala/apps/web-platform/src/pages/TripHistoryPage.tsx`
6. `/home/masalago/projects/daladala/apps/web-platform/src/pages/WalletPage.tsx`
7. `/home/masalago/projects/daladala/apps/web-platform/src/pages/ProfilePage.tsx`
8. `/home/masalago/projects/daladala/apps/web-platform/src/pages/FoodPage.tsx`

### Components (5 files)
9. `/home/masalago/projects/daladala/apps/web-platform/src/components/Navbar.tsx`
10. `/home/masalago/projects/daladala/apps/web-platform/src/components/LanguageSwitcher.tsx`
11. `/home/masalago/projects/daladala/apps/web-platform/src/components/VehicleTypeSelector.tsx`
12. `/home/masalago/projects/daladala/apps/web-platform/src/components/TripSharing.tsx`
13. `/home/masalago/projects/daladala/apps/web-platform/src/components/SOSButton.tsx`

