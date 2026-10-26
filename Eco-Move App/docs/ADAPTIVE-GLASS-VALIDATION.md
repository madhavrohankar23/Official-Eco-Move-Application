# Adaptive glass appearance — 23 October 2026

Historical checkpoint: the later user request removed **UI Theme Contrast**. Statements below about preserving/testing its slider describe the earlier checkpoint only. The latest implementation and camera validation are recorded in [IMPLEMENTATION-AND-VALIDATION.md](IMPLEMENTATION-AND-VALIDATION.md), October 23–24 sections.

Implemented inside Eco-Move App only: three shared material presets, a persisted appearance selector in Profile & preferences → Customization, deeper emerald default, differentiated Matte/Solid surfaces, refined brand/search/navigation materials, readable type, and keyboard focus. Existing dark appearance, contrast slider/presets, profile fields, travel preference, password and email-server settings remain. No new adjustment sliders/toggles were added.

Changed presentation files: App.tsx; src/theme.tsx; src/glassTokens.ts; src/components/{Glass,GlassAppearance,SearchGlass,MotionPressable,LiquidNav,Sheet,ContrastSlider}.tsx; src/screens/{AccountScreens,HomePlan}.tsx. Added tests/glass-appearance.test.cjs. Protected backend/domain source was not edited.

Observed evidence:

- Regression suite: 13 passed, 0 failed (baseline 10/0). Final targeted checks: 6/6.
- TypeScript passed; iOS, Android and web exports passed after final presentation changes. No lint command is configured.
- Original 141 files and protected copies retained all audited checksums.
- Calculated normal text contrast across the sampled light/dark backgrounds, material levels, selected/hover states and fallbacks: minimum 4.82:1. This is a compositing test, not a physical-device pixel measurement.
- Browser: Liquid default; Matte persisted after reload; contrast stayed 25% across theme changes and reload. Light/dark stayed unchanged when selecting another material. Solid had zero backdrop-filter elements. Tab focus produced a 2px visible outline; Enter selected Solid.
- Settled layouts at 320×568, 360×800, 375×812, 390×844, 412×900, 430×932, 768×1024, 1440×900 and 844×390: no horizontal overflow; sheet stayed within bounds; five navigation targets were at least 54.39×52px.
- Sitabuldi→Airport at 08:30 produced 22 min/₹20, 30 min/₹16 and 48 min/₹12 candidates. Switching to Matte preserved all three labels/results. The after-hours driving fallback also displayed correctly.
- Nearby public map pick (21.1490, 79.0813) returned Zero Mile Freedom Park at 228m/3 min. Closing/reopening preserved the anchor. Existing expired demo passes opened; no new transaction was issued.

Limits: physical iOS/Android testing and high-refresh-rate measurements were not performed in this iteration. The previous APK is not rebuilt by the appearance export. Android retains the established translucent fallback to avoid its WebView blur artifact. Live external services were not comprehensively retested. Subsequent motion/satellite work is recorded separately.

Logs: artifacts/adaptive-glass-tests.log, adaptive-glass-final-targeted.log, adaptive-glass-typecheck.log, adaptive-glass-source.log, adaptive-glass-final-export.log.

VERDICT: PASS
