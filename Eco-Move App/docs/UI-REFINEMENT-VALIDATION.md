# UI refinement validation — 28 October 2026

Work remains uncommitted on `New-Changes`; the existing migration/voice changes were preserved. No commit or push was performed.

## Implemented

- Light appearance uses matte-white surfaces, grey boundaries, stronger readable text and denser floating shadows. A separate shadow sibling prevents sheet clipping from hiding its shadow.
- Light/Night radio controls use the existing preference writer. Saved Night material is retained. Source shake is optional, permission-aware, uses the existing GPS Source flow, and takes priority over voice shake without overwriting its preference. Strong alternating impulses and an eight-second cooldown prevent repeated Source triggers; the manual fallback remains.
- Compact Home typography and search wording keep the primary action usable at 320 × 568. Sheet headers constrain text while preserving dismissal targets. Map tools use compact placement where vertical space is limited.
- Auth loading now shows a preparing state before session hydration instead of briefly flashing the landing page. The authentication submit handler was not changed.
- Latest reference correction: Night navigation now has a smoky silver left edge fading horizontally into near-black, pale inactive icons and a bright white-grey selected lens with a green icon. This applies independently of legacy material preferences. The previously attempted uniformly silver navigation has been superseded. Light navigation and other Night surfaces are unchanged by this correction.

## Files

Shared presentation: `App.tsx`, `src/theme.tsx`, `src/glassTokens.ts`, `src/components/{Glass,GlassAppearance,LiquidNav,SearchGlass,Sheet}.tsx`, `src/screens/{AuthScreen,HomePlan,AccountScreens}.tsx`, `runtime/index.tsx`, `runtime/map.css` and generated runtime assets. Source gesture: `src/features/gestures/useSourceShake.ts`, `src/platform/shake.ts`, `src/AppContext.tsx`, and the motion permission description in `app.json`. Relevant tests were extended; two test output paths were isolated to avoid Windows mapped-file locks. No packages were added.

## Executed checks

| Check | Result / evidence |
| --- | --- |
| Full regression suite before final presentation-only refinements | 98 passed, 0 failed; `artifacts/ui-release-tests.log` |
| Shadow/layout follow-up | 16 passed, 0 failed; `artifacts/ui-shadow-tests.log` |
| Latest reference-navigation follow-up | 12 passed, 0 failed; `artifacts/ui-night-reference-tests.log` |
| Latest TypeScript | Passed; `artifacts/ui-night-reference-typecheck.log` |
| Latest production web export | Passed; `artifacts/ui-night-reference-export.log` |
| Prior all-platform export | Web, iOS and Android export passed before the final navigation-colour correction; `artifacts/ui-shadow-export.log` |
| Original preservation | 140 original files plus the original environment checkpoint verified; protected copies match baseline or the 10 previously audited migration entries |
| Focused lint | Three new/reworked files had zero errors/warnings with the formatting rule disabled; `artifacts/ui-new-lint.json`. Broader legacy lint is not clean (`artifacts/ui-lint.json`). |

Latest web bundle: **2,687,048 bytes**, `index-1e43f415ecf863b602262b3b6294fb03.js`. Preview at `http://localhost:8082/` serves this export. Copying the unchanged runtime HTML encountered a Windows mapped-file lock; source/export runtime hashes were checked and were identical, and the served index references the new bundle.

Browser checks actually completed: matte Home at 320 × 568 and 430 × 932, narrow search and dismissal, landscape Home at 844 × 390, desktop Home at 1280 × 800, Light/Night switching, saved appearance after reload, profile scrolling, map-point selection with panel restoration, and navigation destination/selected-state updates. Latest Night reference was visually checked at 390 × 844 with Plan selected. No browser error entries were returned in the final check. Screenshots are in `artifacts/ui-*.jpg`; latest reference proof is `ui-night-reference-390.jpg`.

## Limits

Physical phone shaking, GPS permission dialogs, real microphone recognition, native rendering and device refresh-rate performance were not verified in this UI pass. No fresh APK was built for these UI changes; older APKs must not be represented as containing them. External service transactions and authenticated sign-in were not repeated for this presentation change. Computed shared-theme text contrast passed at a minimum of 4.53:1; this is not a universal screenshot-level accessibility certification. The complete regression suite predates the final colour-only navigation edits; targeted tests and TypeScript were rerun afterwards.

VERDICT: PASS — scoped presentation checks and production web export; device and external-service limitations listed above.

## Reference shade and double-ring correction

Night navigation's left reflection was neutralized to smoky grey and its selected lens softened to the supplied reference. Removed LiquidNav's unconditional focus border: it duplicated the selected lens after pointer taps. MotionPressable's existing focus-visible keyboard outline remains. Home and Plan pointer navigation were visually checked at 390 x 844 with a single lens; evidence: artifacts/ui-night-single-lens-390.jpg. TypeScript, 12 targeted tests and web export passed again (artifacts/ui-nav-ring-*.log). Latest web bundle: index-0fbe9e72999e8f4835e8b208954073ac.js, 2686916 bytes. No native rebuild for this colour correction.

VERDICT: PASS — targeted navigation presentation checks.


## Simplified map header

Removed only the signed-in map header branding and avatar from App.tsx. Search starts at safe-area top + 12; tools and touchless status at +76; map-selection instructions at +12. Updated viewport padding and top fade to the shorter presentation. Login branding and bottom Profile destination remain. Browser verified search, Home layout and bottom Profile access at 390 x 844. TypeScript, 11 layout/lifecycle tests, and production web export passed (artifacts/ui-header-*.log). Screenshot: artifacts/ui-header-simplified-390.jpg. No commit or push.

VERDICT: PASS — scoped header presentation checks.


## Authentication motion and progressive disclosure — latest continuation

- Added `src/components/AuthMotion.tsx`: short native-driver fade/translation/scale entrance and a subtle indeterminate loading light. No artificial wait, success claim, or fake percentage. Reduced motion disables movement; animations stop on unmount/background where applicable.
- `AuthScreen.tsx` adds real request loading to both demo entry points, blocks duplicate demo requests, restores interaction after failures, and keeps the existing login request/validation handler. Authenticated controls enter over the same map instance.
- Removed Source/Voice shake subscriptions, preference hydration and controls from AppContext, Settings and SafarBot. Manual Voice/GPS and optional camera gestures remain. Motion permission is disabled in Expo configuration; installed binaries need a new native build to reflect that configuration. Unreferenced legacy detector utilities/tests remain in source for recoverability and are not connected to the application. Neither shake preference key is present in the production web bundle.
- Initial Home is collapsed. Navigation taps open destinations; tapping the current destination collapses/reopens it. Map Tools reveals Layers, GPS, Voice and Camera on demand. Existing services remain inside the expandable screens.
- TypeScript passed (`ui-minimal-typecheck.log`). Full suite: **100 passed, 0 failed** (`ui-minimal-tests.log`), including new auth loading duplicate-request/failure-retry and reduced-motion/cleanup tests. Web production export passed (`ui-minimal-export.log`); bundle `index-fb0c2c58a69623c62bf0479bccd06724.js` is **2,669,166 bytes**. Original preservation check passed again.
- Browser verified: compact initial screen at 320 x 568, 390 x 844 and 1280 x 800; Map Tools reveal; Home expansion; absence of shake settings; Sign In form navigation; actual demo logout and login returning to compact Home. Final console error query returned no entries. No user-password authentication transaction was performed. Fast demo completion does not establish the duration of loading under slow real networks; failure/retry is covered by the unit harness.
- Physical microphone/camera/GPS hardware and device frame rates have not been reverified. No claim that every external service or hardware feature is universally error-free; no fresh APK was built in this continuation. No commit or push.

VERDICT: PASS — scoped UI flows, regression suite and production web export; hardware/external-service limitations remain.
