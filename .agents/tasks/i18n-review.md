# i18n Implementation — All 17 Passenger-App Screens Complete

Commit 613c718 closes the loop on the i18n effort across the DalaSmart passenger app. All three findings from the previous pass are resolved: DriverActiveTripScreen is now fully translated, DriverMainScreen has its subscribe hook, and TrafficScreen stores a key in state rather than a translated string so confidence labels re-translate correctly on language switch. The locale files maintain perfect key symmetry — both en.json and sw.json contain exactly 356 keys, and every key referenced by `i18n.t()` across all 24 screens resolves in both locales.

Watch for: **"English" and "Kiswahili" remain hardcoded in SettingsScreen** (confirmed — lines 33 and 38, no locale keys for these language name labels). Minor but technically incomplete. No new issues introduced.

**Verdict**: APPROVED

## High-level view

All 17 screens (plus the 4 driver/traffic screens in the passenger-app folder) now import from `../i18n`, carry the `forceUpdate` subscribe pattern, and replace their user-visible strings with `i18n.t()` calls. The 254 unique keys used across all screens are present in both locale files — no missing translations, no silent key fallbacks.

SettingsScreen has its subscribe hook wired correctly and now triggers `setLanguage(i18n.getLanguage())` alongside the forceUpdate, which is the right pattern for this screen since language state drives the active-language indicator. The "English" / "Kiswahili" text nodes on lines 33 and 38 are the only remaining hardcoded user-visible strings in the codebase. As proper nouns universally recognizable to the user selecting between them, they're a minor gap rather than a blocking issue.

TrafficScreen now stores a key string in state (`confidenceKey`) rather than a pre-translated label, so the forceUpdate hook re-translates confidence labels correctly on language switch without re-fetching. The `t(key: string): string` signature accepts dynamic keys, and the fallback chain (`current → en → key`) means an unresolvable key shows the key name rather than crashing.

<details>
<summary>Issues (1)</summary>

1. **"English" / "Kiswahili" hardcoded in SettingsScreen** — `SettingsScreen.tsx` lines 33 and 38 render the language picker labels as bare string literals. No locale keys exist for these labels (`english_name` / `kiswahili_name` or similar are absent from both JSON files). The language names are proper nouns that don't need translation in the strict sense, but they're inconsistent with the otherwise complete coverage. Add keys if consistency is required; leave as-is if the product decision is that language names are always rendered in their native script.

</details>

<details>
<summary>Details</summary>

### Remaining gap — language name labels

The two language-name labels in SettingsScreen (`>English<`, `>Kiswahili<` at lines 33 and 38) are the only user-visible strings not routing through `i18n.t()`. No locale keys exist for them. CountryLanguageScreen has the same pattern via a data array (`{ code: 'en', name: 'English' }`), rendering `lang.name` directly. Neither will cause a runtime error; both are cosmetically inconsistent with otherwise complete i18n coverage.

</details>

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `apps/passenger-app/i18n/en.json` | +134 keys covering driver screens, traffic, promos, schedule, payment, common UI |
| `apps/passenger-app/i18n/sw.json` | +134 keys, Swahili translations for all new keys above |
| `apps/passenger-app/screens/DriverActiveTripScreen.tsx` | Added i18n import, subscribe hook; replaced all 9 hardcoded strings |
| `apps/passenger-app/screens/DriverMainScreen.tsx` | Added subscribe/forceUpdate hook; replaced hardcoded `'Vehicle'` label |
| `apps/passenger-app/screens/DriverTripRequestScreen.tsx` | Added i18n import, subscribe hook; replaced 6 hardcoded strings |
| `apps/passenger-app/screens/TrafficScreen.tsx` | Refactored confidence labels to key-in-state pattern; unrolled departure buttons; gated best-time card on savings > 5 min |

Full diff: `git diff fe91062..613c718`

</details>
