# Implementation and validation record

## Preservation

Phase 1 analysis preceded implementation. The baseline covers 141 original files. `verify-source` passed before the final Android build and was run separately after packaging on October 10: original files and protected copies match. No backend deployment, database migration, remote authentication configuration change or dataset replacement was performed.

The embedded network contains 837 bus routes, 2 metro lines and 1,895 merged searchable places. Source data retains bus/metro stops, coordinates, fares, timings, schedules and geometry. The original A*, priority queue, transfer discovery and Pareto routing implementation is reused. The source did not contain a separately named Dijkstra implementation; none was invented.

## Feature mapping

| Native destination | Existing functionality connected |
| --- | --- |
| Home | Existing route presets, timetable, live buses, cab options, layers, SafarBot |
| Plan | Origin/destination search, map selection, six preferences, departure time, multimodal alternatives, legs, stops, fare, savings, save, explain, book |
| Nearby | Original nearby transit, radius, map anchor, live nearby buses and source POI services |
| Trips | Original saved/recent journeys, ticket wallet, multi-leg booking, concessions, demo payment, QR pass, source gate simulation, sharing/export |
| Profile | Existing profile/session, logout, impact, rewards, history, theme/contrast and backend address |
| Secondary sheets | Bus timetable, live route tracker, map layers, cab service, AI explanation/comparison/chat |
| Authentication | Same Supabase email/password, registration, phone/email verification, reset/update, Google OAuth and existing demo fallback |

The native app uses locally bundled original web map/algorithm/service modules behind a React Native interface. The map stays mounted during navigation. Sheets have explicit close/collapse/back controls, retain form state while collapsed, and adjust map camera padding. Search and map-picking are separate states with an explicit cancel action.

## Material and navigation implementation

Environment plus four glass levels share tint, highlights, shadow and restrained reflection. Native iOS glass is used where available; web uses backdrop blur. Android uses layered translucency without background blur because the WebView blur path produced rectangular clipping artifacts. Physical optical refraction is not claimed. The five-icon floating pill has equal accessible touch targets and a continuously translating active bubble. It respects safe areas, keyboard visibility, reduced motion, contrast settings and app background state.

## Completed automated checks

- TypeScript validation passed.
- Final full suite: six tests passed, zero failed on October 10 (`artifacts/tests-final.log`, 110.99 seconds).
- Original/protected source checksums match.
- Original and copied network exports, bus routes, all six route preference results, nearby results at four radii, and fare/concession calculations agree.
- Embedded runtime contains no server-only environment values.
- Navigation geometry passes 320, 360, 375, 390, 412 and 430 widths with safe-area insets and minimum touch targets.
- Panel geometry tests cover portrait and landscape bounds and retained map space.
- Gradle release build succeeded: 553 actionable tasks. APK contains arm64-v8a and x86_64 support.

## Completed browser interaction checks

- All five navigation destinations and selected state checked at all six required widths. No horizontal overflow; equal targets are at least 48 px.
- Existing demo session, map display, sheet close/collapse/reopen and session persistence checked.
- Sitabuldi → Airport at 08:30 produced three original alternatives (metro and two bus alternatives), with rendered route geometry. The source's unavailable-service result at a late departure time was retained.
- Demo metro booking returned the source fare and savings, issued a persisted pass, rendered its QR and accepted the original metro entry scan simulation.
- Landscape preview checked at 844 × 390. This does not substitute for real-device orientation testing.
- Nearby search around Sitabuldi returned metro and bus stops with original distances/walking times. Map-picking collapses the panel, exposes the map and provides a working cancel action.
- Live route 400 returned stop coordinates from the source service, rendered its route, and reopened after collapse. Its linked timetable returned both directions and original departure slots. Chalo returned zero active vehicles for the tested route.
- SafarBot returned the original metro-booking answer. This FAQ response alone does not prove the remote n8n AI workflow is available.
- Profile displayed the persisted demo ticket's 0.94 kg savings and one green trip; reward milestones showed the original thresholds and locked states.
- October 10: actual map tap selected `21.1438, 79.0753`; Nearby returned stops, collapsed, closed and reopened with the selected point retained. Cab overlays disappeared when switching to Nearby.
- The refreshed preview verified landscape search begins to the right of the map sheet. Cab search returned source service options; route/pickup/drop-off remained visible after collapse. No external cab booking was initiated.
- Nearby Food returned existing place-service results. Route explanation and comparison displayed correct journey summaries, but browser logs confirm both n8n requests failed with `TypeError: Failed to fetch`; the source's local fallback produced those answers. Remote n8n success is therefore **not verified**.

## Fixes from final inspection

- Landscape global search no longer overlaps the left map sheet.
- Native external map-attribution links open in the device browser.
- Late AI replies cannot restore chat memory after logout or starting a new conversation.
- Switching map features now follows the source application's overlay visibility rules, so a previously opened live route and nearby stops do not clutter a planned journey. Underlying screen data remains available when reopening. A regression test checks this transition and retained source object identity.
- Android Studio generated a Java 25 daemon criterion; the mobile project now specifies Java 17. A subsequent rebuild exposed long native dependency paths; the build script now also uses the short app-directory alias for its Gradle cache.
- Ninja's old dependency indexes retained long paths after regeneration; the build script selectively discards those stale generated indexes inside this directory. A later native compilation failed with `CreateProcess: Access is denied` while many compiler processes were active. The successful rebuild used one Gradle worker and two native compile jobs; this records the mitigation without claiming a confirmed cause for the Windows error.
- Dynamic bridge detection and handshake retry: in `runtime/bootstrap.ts`, dynamic `isNative()` detection and recurring handshake attempts eliminate cold-boot race conditions between the native WebView and React Native container.
- Non-blocking route enrichment: in `runtime/index.tsx`, external pedestrian street enrichment is raced against a 3.5s timeout, falling back smoothly to fast local calculated geometry (150ms) if OpenRouteService or network connectivity is latent.
- Android ViewGroup touch event dispatch: in `src/components/Glass.tsx`, `pointerEvents="none"` was set on native `BlurView` to prevent background blurs from intercepting touches. In `src/components/LiquidNav.tsx`, added `{zIndex: 100, elevation: 10}` to guarantee that bottom floating navigation stays above elevated sheet layers on Android.
- Sheet typography & hit targets: in `src/components/Sheet.tsx`, adjusted title font size (`17px`, `letterSpacing: -0.3`) to prevent "Your way through Nagpur" from truncating on 320-360dp devices, and expanded handle touch area to 24dp min-height.

## External-service limits

Tests did not create real accounts, send OTPs or ticket emails, change Supabase settings, or make payments. Live telemetry, remote AI responses, OAuth, real account persistence and SMTP delivery depend on the original credentials and third-party service availability; wiring these services is not a claim that each external provider has passed an end-to-end production test. Payments and gate scans remain the original demos.

The source email middleware is extracted unchanged into a Node adapter because the original implementation lived in Vite middleware. Run it separately when using email; SMTP configuration is not shipped in the APK. The bundled application is installable without a development server, but network maps and hosted services require connectivity.

## APK & Build Artifacts

- **Primary Distributable APK**: `C:\Users\LENOVO\Documents\Eco-Move_Nagpur-main\Eco-Move App\dist\Eco-Move-Nagpur-Android.apk`
- **Workspace Artifact**: `C:\Users\LENOVO\Documents\Eco-Move_Nagpur-main\Eco-Move App\artifacts\Eco-Move-Nagpur.apk`
- **Exact File Size**: **52,149,910 bytes** (49.73 MiB), both workspace copies verified identical after the October 15 design repair. Any external IDE copy was not updated.
- **SHA-256 Checksum**: `F3A57BDC137C08DF920BA4C73AF03D641E8B88E6CAB654C0A547180EFB71367D`
- **Package Identity**: `in.ecomove.nagpur` (versionCode `1`, versionName `1.0.0`)
- **SDK Target & Minimum**: minSdk `26` (Android 8.0+ Oreo), targetSdk `36` (Android 16), compileSdk `36`
- **Native Architectures**: `arm64-v8a`, `x86_64`
- **Signature Scheme**: APK Signature Scheme v2 verified (`true`)
- **Gradle Release Build**: `build-glass-final.log` confirms **BUILD SUCCESSFUL in 8m 23s**, 553 actionable tasks (28 executed, 525 up-to-date), using Java 17 and the local Android SDK. Standalone release-mode APK signed with the development key; no Metro server is required.

## Android Emulator Live Validation & UI Refinement

Historical observations below predate the final continuation. The latest installed-build results at the end of this document supersede conflicting claims, particularly startup speed and service availability.

- **Target Device**: `EcoMove35` (emulator-5554, Android 35 x86_64, 720x1600 @ 320dpi).
- **Cold Boot & Bridge**: Clean launch into welcome screen, instant transition to live Leaflet map rendering Nagpur central corridors (Sadar flyover, Inner Ring Road, Sitabuldi interchange).
- **Liquid Glass Defect Fixes & System Refinement**:
  - **Eliminated Horizontal Streaks across Buttons**: Removed harsh linear gradients and mid-button highlight cutoffs from `Glass.Action`, `Glass.IconButton`, and `Glass.Field`. Buttons now have continuous, balanced translucent background fills without horizontal bands.
  - **Resolved Android BlurView Clipping Artifacts**: Replaced native hardware-accelerated `BlurView` on Android (which produced sharp rectangular cutouts and dropped frames over the native WebView map) with silky, high-performance translucent materials (`rgba(244, 250, 246, 0.52 - 0.90)` light / `rgba(13, 31, 23, 0.52 - 0.90)` dark) through which the underlying interactive Leaflet map remains beautifully perceptible. Native `BlurView` is retained exclusively for iOS.
  - **Removed Distracting Embossing & Nested Shadows**: Reset `elevation: 0` and `shadowOpacity: 0` on Level 1 nested controls (buttons, inputs, chips) so they sit naturally on glass cards without fake 3D bevels or double drop shadows. Outer borders tuned to subtle hairlines (`rgba(255, 255, 255, 0.50)` / `rgba(18, 54, 38, 0.08)`).
  - **Fixed Button Typography & Clipping**: Replaced tight wrapping with single-line labels (`numberOfLines={1}`, `ellipsizeMode="tail"`) and balanced horizontal padding (`paddingHorizontal: 16`), preventing awkward wrapping on buttons like "Create an account".
  - **Bottom Sheet Scroll Padding**: Added `paddingBottom: 36` to sheet scroll containers to prevent content from clipping behind bottom floating controls.
  - **Floating Navbar Capsule (`LiquidNav`)**: Maintained 5-destination icon-only capsule with smooth active-indicator lens, spring physics, and safe-area inset protection.
- **Minimal Progressive Disclosure Refactor**:
  - **Home**: Clean overview prioritizing map canvas and primary route planning action, quick transit hub (Live buses, SafarBot, Cabs), and expandable "Familiar Journeys".
  - **Plan**: Minimal origin/destination fields, expandable route preferences drawer (`PREFS`), departure time picker, candidate route cards, and step-by-step leg breakdown with stop toggles.
  - **Nearby**: Segmented radius (500m–5km) and mode selector (Transit, Live buses, Food, Hospitals) with POI markers.
  - **Trips**: Clean boarding pass design with countdown ticker, dynamic QR display, multi-stage pass customization, and progressive checkout.
  - **Profile**: Concise summary card first, CO2 impact progress tracker, interactive scratch/tap-to-reveal coupon card, and system settings.
- **Verification Across Screens**: Verified live on emulator across Welcome, Home, Plan, Nearby, Trips, and Profile tabs. All 141 original files unchanged; 6/6 automated regression tests passing.

## October 15 — Liquid Glass presentation repair

This continuation repaired the current shared presentation; it did not recreate screens or change services, datasets, authentication or routing.

Confirmed before editing: a 44 px map control contained a glass surface only 21 px tall; empty fixed-height glass surfaces could collapse, hiding the selected navigation lens. Web backdrop blur was absent, and the `moving` material prop had no implementation.

- `Glass.tsx`: the clipped surface now grows inside fixed-height parents, while natural-height cards retain their content sizing. The luminous border is an absolute overlay and no longer changes control geometry. Web backdrop blur is restored; supported iOS uses native GlassView with a lighter tint so the native material is not covered by an opaque fill. Android retains the documented translucent fallback because earlier hardware blur produced WebView clipping artifacts. No physical refraction is claimed for that fallback.
- Material levels have separate tint densities, soft full-surface lighting, subtle edges, lower nested-card depth and clear focus/pressed states. Highlights have no mid-control cutoffs. Compact actions now have 44 px targets.
- `LiquidNav.tsx`: the selected lens is visible at its full 52 px height, travels between five equal icon-only targets and has restrained press feedback. A low-opacity reflection moves slowly across the capsule. Motion pauses when hidden/backgrounded and respects reduced motion; high contrast removes the reflection and blur.
- `theme.tsx`: dark secondary text and accent colors were softened for readability; iOS reduced-transparency changes are subscribed to while the app is running.
- `Sheet.tsx` / `App.tsx`: changing destinations resets the sheet scroll position. Collapsing/reopening the same destination retains its mounted content and scroll position.

Actual validation in this continuation:

- TypeScript passed after the final application edit.
- Full regression suite: **6 passed, 0 failed**, 84.61 seconds (`artifacts/tests-glass-design.log`). Original/protected source checksum test passed for all 141 files.
- Browser DOM verified map control and material heights both **44 px**, versus 44/21 before; the navigation lens measured **52 px** tall.
- Clicked all five destinations and verified the matching selected state and empty text content in each icon target.
- Browser measurements at **320, 360, 375, 390, 412, 430 px**: equal targets, minimum **54.39 × 52 px**, no horizontal overflow. Landscape **844 × 390** also had no horizontal overflow and retained usable map space.
- Light/dark material screenshots saved as `artifacts/liquid-glass-light.jpg` and `artifacts/liquid-glass-dark.jpg`. Increased contrast produced **zero backdrop-blur layers**. User appearance was restored to dark, contrast off; the temporary viewport override was reset.
- Reproduced Settings → Home scroll transition: Home's scroll position now resets to **0**, with its heading visible. Collapse/reopen and map-picking/cancel flows remained usable.
- Geometry/navigation observations are recorded in `artifacts/liquid-glass-browser-checks.json`.

These browser checks do not establish iOS 26 device rendering, physical optical refraction or sustained mobile frame rate. An Apple device/simulator is not available on this Windows host. The Gravitas CLI is not installed; the recorded project commands and direct browser measurements provide the evidence, rather than a claimed Gravitas-owned validator run.


## October 15 evening — installed APK continuation

The screenshot supplied by the user showed a second emulator display. Android reported the app on virtual display 2 while the primary screen showed the launcher. Removed emulator multidisplay slot 1, confirmed only the primary display remained, and relaunched `in.ecomove.nagpur/.MainActivity` explicitly on display 0. This recovery did not clear app data.

The 15:26 build installed successfully at approximately 20:15. Native screenshots confirmed the map, full Home content, circular map controls and selected navigation lens rendered without the previous blank material rectangles. The first software-rendered emulator session was severely slow under host memory pressure and a route request timed out. These observations supersede the historical claim of instant startup above.

The native Home screenshot exposed a truncated "Live buses" label. Compact actions now use slightly smaller horizontal padding/gaps and allow up to two lines while preserving the 44 dp minimum touch target. Full-size actions retain their existing single-line presentation.

The emulator launcher now accepts `-Gpu auto`, `host` or `swiftshader`; its default is the emulator's recommended `auto` mode. The system-image path is quoted correctly for the space in `Eco-Move App`.

Post-edit verification: TypeScript passed in the build pipeline. `artifacts/tests-glass-final.log` records **6 passed, 0 failed**, 148.63 seconds, including all 141 source/protected checksums, routing/nearby/fares parity, configuration exclusions and navigation/panel/overlay checks. No backend or original source file was edited.


## October 19 — final APK verification and emulator recovery

- Final Java 17 build: `artifacts/build-glass-final.log`, **BUILD SUCCESSFUL in 8m 23s**, 553 tasks (28 executed, 525 up-to-date).
- Final artifact: `dist/Eco-Move-Nagpur-Android.apk`, **52,149,910 bytes**, SHA-256 `F3A57BDC137C08DF920BA4C73AF03D641E8B88E6CAB654C0A547180EFB71367D`. The dist, artifacts and Gradle output copies match; their former contents were replaced. No older app APK remains in the distribution folder.
- Installed with `adb install -r`: **Success** (`artifacts/install-glass-final.log`). Android's installed `base.apk` SHA-256 matches the downloadable APK exactly.
- Activity launch on display 0: **Status: ok**, cold launch, TotalTime 14342 ms (`artifacts/launch-glass-final.log`). This is an activity-start result, not proof that all screens finished loading.
- Original-source check rerun on October 19: **PASS, 141 original files unchanged; all protected copies match**.
- Hardware-rendered emulator boot completed, but Android System UI became unresponsive. Windows reported approximately 140 MB available RAM during the failure. The popup prevented reliable native interaction testing; no full final-APK native flow pass is claimed from that attempt.
- Recovery retry uses the existing AVD/data with 1536 MB and SwiftShader. The launcher exposes `-MemoryMB` and omits verbose kernel console output. These are development-environment changes only and do not change the APK.

## October 21 — material refinement and Expo Go compatibility

Scope: only the existing `Eco-Move App/` implementation. No original/protected service, dataset, authentication implementation or routing algorithm was edited.

### Changes

- Shared glass materials now avoid redundant nested backdrop samples, interpolate selection/illumination, and use restrained touch springs. Sheet expansion/collapse/dismissal transitions stop overlapping animations and retain mounted content. Collapsed content is removed from accessibility and pointer navigation after its fade.
- The top search pill has a fine green perimeter with a faint light following the actual rounded border over 14 seconds, driven by native transforms. Background, reduced-motion and high-contrast modes stop the moving light. Navigation retains five icon-only targets and a travelling active lens.
- Search, cards, controls, sheets and choice dialogs retain their original actions. The chooser height is bounded by its option count and available screen space; short lists do not fill a phone with empty space or automatically open the keyboard.
- Restored `node_modules` from the existing SDK 57 lockfile using `npm ci`: the previously installed Expo 44 / RN 0.72 did not match the declared Expo 57 / RN 0.86 project. Then aligned `expo-linking` to ~57.0.13 and `expo-location` to ~57.0.21 using Expo's SDK version check.
- User confirmed **Expo Go 57.0.9, supported SDK 57.0.0, iOS 27.0**. This project stays on SDK 57; no SDK 58 migration was performed.
- Speech loads through `requireOptionalNativeModule`, with unconditional React effect hooks and subscription cleanup. Missing native speech in Expo Go cannot fail the app import. Browser Web Speech support has its own platform entry. Voice unavailability and denied microphone permission have distinct messages.
- Added handled failures for local/live search, fare, ticket QR, recent journeys, booking preparation and persistence. Stale results after panel exit or Nearby anchor changes are ignored. This only changes mobile request lifecycle/error presentation.
- Storage hydration errors now produce a visible startup failure with Retry. Map restarts/unmounts reject outstanding requests and clear their timers. Late HTTP results from a previous map session are discarded. The existing authentication store is not cleared on failure.
- Expo Go cannot handle the app's `ecomove://auth/callback` scheme. Google OAuth and password reset explain the installed-build requirement before launching a flow that cannot return. Email/password and existing demo access remain available; no Supabase settings were changed.

### Observed checks

- TypeScript passed after the request and optional-module changes; `artifacts/typecheck-compatibility.log`. It also passed after the bounded chooser change (`artifacts/typecheck-final.log`); later final build/export checks must be consulted for the exact final revision.
- `artifacts/tests-compatibility.log`: **10 passed, 0 failed**, 77.80 seconds. Includes absent/present speech module behavior, subscription removal, storage-error recovery, RPC cancellation, navigation/map layout, animated perimeter continuity, all 141 source/protected checksums, source routing/nearby/fares parity and server-secret exclusions.
- `artifacts/native-export.log`: iOS **2,483 modules** and Android **2,489 modules** bundled and Hermes bytecode exported successfully. This initial export predates the final bounded-chooser and Expo Go auth-link messaging edits; it is not an iPhone runtime test.
- `artifacts/expo-doctor-final.log`: **20/21 checks passed**; package compatibility passed. Remaining warning: checked-in native folders coexist with app.json prebuild settings. The Android build intentionally uses its existing native project, including custom Windows/CMake configuration. No clean prebuild or blanket suppression was used. Manifest inspection confirms the current scheme, permissions, keyboard resize and cleartext development-server policy; SDK levels are explicitly present in gradle.properties. Future app.json native changes still require deliberate synchronization.
- Browser checks at widths **320, 360, 375, 390, 412, 430**: no horizontal overflow, five equal icon-only targets at least **54.39 x 52 px**, matching active states on all destinations, search width viewport minus 40 px. Search for Airport returned the original locations; choosing Airport Metro Station restored the map. Collapse/reopen and chooser open/close worked. Evidence: `artifacts/refinement-browser-checks.json`, `artifacts/refinement-light.png`. These measurements validate web presentation, not native frame rate.

### Limits and operational notes

- No physical iPhone or iOS simulator is attached to this Windows host. SDK compatibility and iOS bundle success do not establish device-rendering or end-to-end authentication success.
- Native speech requires the installed app/development build, not Expo Go. Google OAuth/reset require the existing callback to be allowed in Supabase. Real sign-in, email sending, payment, remote n8n and live-provider availability were not proven by the unit suite.
- Android keeps its tested translucent fallback because hardware blur over WebView previously caused rectangular clipping. Native iOS glass and web blur remain enabled where supported. No physical refraction or sustained frame-rate measurement is claimed.
- `npm audit` recorded 27 advisories (1 low, 8 moderate, 18 high), including build-tool transitives and the preserved Nodemailer server dependency. Its suggested force fixes include incompatible downgrades to Expo 44/RN 0.72; these were NOT applied. This audit is not clean, and the app is not claimed universally error-free or production-security certified. See `artifacts/npm-audit-refinement.json`.
- The old October 15 APK is not evidence for these October 21 changes. Only the final rebuild/install record below should identify a replacement APK.

## October 22 — verified replacement build and final export

- Java 17 Android release build completed: **BUILD SUCCESSFUL in 30m 57s**, 553 tasks (452 executed, 101 up-to-date), `artifacts/build-refinement-final.log`.
- Replacement APK: `C:\Users\LENOVO\Documents\Eco-Move_Nagpur-main\Eco-Move App\dist\Eco-Move-Nagpur-Android.apk`, **52,149,974 bytes** (49.73 MiB), SHA-256 **3CD6DB3A7553903482D115CF492E79448F45AE7B56423F84E9D13FB09B9A5DC8**.
- Distribution, artifacts and Gradle output APK hashes match. Prior APK contents at those paths were replaced. Signature v2 verified, package `in.ecomove.nagpur`, minimum API 26, target API 36, arm64-v8a and x86_64. This is a release-mode build using the existing development signing configuration.
- Inspected the APK's `assets/index.android.bundle`: it contains `search-border-light`, the new Expo Go auth-return explanation and `Retry map startup`. This confirms the artifact contains the current fixes rather than only rebuilt native libraries.
- Final export after the last application edit: **web 2,100 modules, Android 2,461 modules, iOS 2,483 modules**; all exported successfully (`artifacts/final-export.log`). Final TypeScript check passed (`artifacts/typecheck-final.log`).
- Loaded that final static web export at port 8082. Startup restored the existing demo session and map. Sitabuldi → Airport returned three real source-computed candidates: **22 min / Rs20 metro**, **25 min / Rs16 bus**, **43 min / Rs12 bus** at the test's departure time. Route-linked booking retained the Orange Line and boarding/alighting stops. Demo checkout issued pass `ECO-NAG-51653` with a visible QR and expiry; no real payment or email was sent. Profile changed from 0.94 kg / 1 trip to **1.88 kg / 2 trips** using the existing reward calculation.
- Final compact three-option chooser rendered without the former full-height empty area and dismissed successfully (`artifacts/final-choice-dialog.png`). Earlier final-export console-error sample was empty. This does not prove all remote services or iPhone rendering.
- Source verification rerun: **PASS: 141 original files unchanged; all protected copies match**.
- Emulator boot reported complete in approximately 100 seconds, but Android system processes then reported an ANR with near-100% guest CPU load. Windows available memory remained under 300 MB during this attempt. Native installation/launch results must be read from the continuation below; boot-complete alone is not an app-launch pass.

### Installed replacement APK — actual result

- `adb install -r`: **Success** (`artifacts/install-refinement.log`).
- Activity launch: **Status: ok**, cold, TotalTime **4323 ms** (`artifacts/launch-refinement.log`).
- Android installed `base.apk` SHA-256 equals **3CD6DB3A7553903482D115CF492E79448F45AE7B56423F84E9D13FB09B9A5DC8** (`artifacts/installed-refinement-sha256.txt`).
- Native Welcome UI rendered, but Pixel Launcher and then **Process system isn't responding** dialogs interrupted startup while it still displayed Preparing your city. The attempted launcher dismissal was followed by the system-process ANR. Screenshot: `artifacts/emulator-refinement-system-anr.png`. The sampled ReactNativeJS/AndroidRuntime error log was empty; this does not exclude errors outside the sampled interval.
- **NOT PASSED on this replacement APK:** native map completion, navigation, route/map picking, Nearby, live buses, timetables, ticket QR, rewards and AI end-to-end flows. System/guest startup instability prevented reliable interaction. Prior native observations and current web results must not be substituted for these missing native checks.
- Existing external service, iPhone, OAuth, email and dependency-audit limits above remain. No claim of universal error-free behavior is made.

Final evidence verdict: **PASS** for replacement build/signature/architectures, installed artifact identity, three platform exports, TypeScript, the 10-test regression suite and original-source preservation. **FAIL / blocked** for complete emulator interaction validation because of system-process ANRs under host resource pressure. Physical iPhone runtime validation remains pending.

Additional final-export browser checks on October 22:

- Bus 35 timetable displayed the preserved Pardi–Hingna variants, 144 outbound departures, first 05:15 and last 21:30; its independent panel remained dismissible.
- SafarBot answered the public bus-35 schedule question with matching dataset facts. This verifies that chat flow and local/dataset response, not remote n8n availability.
- Live-bus search returned the preserved 35/35A/351 variants. Selecting the Pardi–Hingna route displayed its 59 stops and a zero-active-vehicles state. Moving live telemetry was not observed.
- Nearby → Pick on map collapsed the panel and hid navigation while keeping a large usable map. A public test point (21.1486, 79.0762) restored the panel and returned Zero Mile Freedom Park at 478 m / 6 min walk. Close returned to the map; reopening Nearby preserved the anchor and results.
- Final Home screenshot: `artifacts/final-glass-home.png`. Temporary browser viewport override was reset. The stalled emulator was shut down without deleting its data to release host memory; the final static preview remains at port 8082.

## October 23 — adaptive glass and map interaction continuation

- Liquid, Matte and Solid appearance presets use the shared material system. Per the latest user instruction, **UI Theme Contrast was removed** from Profile and Preferences; system accessibility overrides remain. This supersedes earlier statements that the manual contrast slider was retained. Appearance changes persist without resetting unrelated preferences.
- Sheet motion uses native transforms instead of per-frame height layout. Search/loading lanes avoid content jumps; outside-map taps collapse panels while preserving selections. Press feedback and haptics respect reduced motion and platform support.
- Authorized Google Map Tiles satellite sessions are presented over the preserved Leaflet map. Viewport attribution, tile/session cancellation, overview imagery with empty copyright metadata, zoom limits and restoration of the original base layer were tested.
- Browser observations: real satellite imagery and route polylines; Sitabuldi–Airport returned 22 min / ₹20, 28 min / ₹16, 48 min / ₹12 at the tested departure time; Nearby map picking retained a public test point and results after reopening; all five navigation destinations and three appearance presets responded. No manual contrast control remained in Profile or Preferences.
- Nine viewport sizes passed the recorded overflow/navigation measurements, including 320 × 568 and 844 × 390. Evidence: `artifacts/island-responsive.json`, `artifacts/island-satellite-route.png`. This is web-layout evidence, not measured native refresh rate.
- At that checkpoint, 22 tests, TypeScript, runtime build, all three platform exports and original-source verification passed. These do not establish physical iPhone/120–144 Hz behavior or live external-provider availability.

## October 24 — camera gesture repair

### Confirmed causes and repairs

- The mobile AppContext instantiated a DOM/getUserMedia controller inside React Native. MediaPipe was also an undeclared mobile dependency, camera permission was absent from the Android manifest, and sub-step gesture zoom deltas were rounded away by Leaflet's default zoom snapping.
- Camera detection now runs in a separate browser surface: a same-origin iframe on web and the existing React Native WebView library on Android/iOS. Native HTML has an HTTPS base origin, inline muted video, platform media permission handling and restricted navigation. The map, routing runtime and protected files are unchanged.
- The actual MediaPipe 0.10.14 package is declared and pinned. `scripts/build-gestures.cjs` builds the camera HTML; `build:runtime` invokes it. Web ships the existing 7,819,105-byte hand model and version-matched WASM. Native loads the pinned HTTPS WASM/model on demand; internet is required for this loading path. Frames are processed locally and are not persisted or sent to a backend.
- Added Android CAMERA permission in Expo configuration and the existing native manifest, plus the iOS camera usage description. These native configuration changes require a new installed build; the October 22 APK does not include them. Expo Go uses its own host permission declarations.
- Added a visible preview, actionable status, Stop and Retry. Startup has a 45-second timeout. Cancellation invalidates pending permission/model work; late streams are stopped, tracks/listeners/frames are released on stop or backgrounding, and a newly visible hand recalibrates. Returning to neutral does not continue the previous zoom direction.
- GPU initialization falls back to CPU. Duplicate video frames are skipped; inference is limited to approximately 15 Hz, independent of map rendering. Only status changes and validated zoom events cross the bridge; no per-frame AppContext updates. Small intentional zoom deltas accumulate into normal map zoom steps without changing Leaflet configuration or route calculations.
- Enabling gestures collapses the sheet to expose the map. Keyboard and map-picking interactions suspend camera tracking. The landscape preview uses a compact layout above navigation.

### Observed verification

- Full suite: **37 passed, 0 failed** (`artifacts/camera-full-tests.log`). Gesture tests now import the actual production utilities instead of testing duplicated implementations. Lifecycle tests cover late permission resolution, model cancellation, denial/retry, background release, calibration/spread/pinch, stationary drift, hand reacquisition, bridge validation, zoom accumulation and GPU-to-CPU fallback.
- TypeScript: PASS (`artifacts/camera-typecheck.log`). Web, iOS and Android exports: PASS (`artifacts/camera-final-export.log`). Native and web camera HTML assets match current source build bytes; the shipped hand model matches the user's original model (`artifacts/camera-asset-validation.json`).
- **Real model execution in the browser passed:** the production `HandDetector` loaded the actual WASM/model and detected **21 landmarks** in Google's official `hand_model.png` sample. This used a canvas-backed video fixture, **not a physical webcam or synthetic landmark result**. Screenshot: `artifacts/camera-model-validation.png`. Harness: `artifacts/final-export/camera-validation.html`. The local preview server's WASM MIME type was corrected after the first run revealed a streaming-compilation fallback; the model was rerun afterward.
- Browser camera activation opened the preview; Stop removed it and restored the enable control. The in-app browser did not complete its camera-permission request, and the actual timeout displayed an actionable retry state. This proves the pending-permission recovery flow, not successful physical-camera capture.
- `verify:source`: **141 original files unchanged; protected copies match**. A second before/after hash comparison for this camera repair found **zero original-file changes**.

### Remaining device limitations

- `adb devices -l` returned no connected device. No current-camera APK install or native camera run is claimed. Physical Android/iPhone permission, video capture, hand recognition and gesture-to-map behavior still need a real-device check.
- The current user-upgraded dependency tree is Expo **58.0.17**, React Native **0.88.0**, React **19.3.0**. It was preserved. The previously reported Expo Go **57.0.9 / SDK 57** cannot open this SDK 58 project; use an Expo Go version supporting SDK 58, or a compatible development build.
- To check on a compatible device: reload the app, tap the camera control, allow camera access, hold thumb/index slightly apart and steady for calibration, then spread/pinch. Hold still to confirm zoom stops; use Stop to confirm the camera indicator turns off. Background/reopen, deny/retry, and portrait/landscape should also be checked.

Reference implementations: [React Native WebView configuration](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md), [MediaPipe hand detection](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [official sample source](https://github.com/google-ai-edge/mediapipe-samples-web).

VERDICT: PASS — code checks, regression tests, exports, real model fixture inference and original-source preservation. Physical-device camera capture remains unverified.

## October 24 — deliberate shake, current Source shortcut and n8n voice integration

### Implementation

All implementation and validation writes are confined to `Eco-Move App/`. The original project and protected business logic were read, not edited.

- Replaced the old single-spike shake/GPS action with `DeviceMotion` acceleration sensing. A gesture needs three alternating impulses above 2.4 g, at least 100 ms apart, within 900 ms; a 3-second cooldown prevents repeated triggers. Permission is requested from a user press. Settings and SafarBot expose the permission action, and a visible Voice control remains available without sensors. Listeners stop on backgrounding, disable and unmount; late permission results cannot subscribe after cleanup.
- A strong shake opens the existing SafarBot screen and starts one voice request. A second deliberate shake or Stop assistant cancels it. Final recognition results submit once; interim text stays visible. Permission, listening, waiting, timeout, unsupported recognition and error states are explicit. Pending permission, speech and HTTP results are invalidated when stopped, dismissed, backgrounded or unmounted. Existing typed chat and route-search speech remain available.
- The voice adapter posts the workflow's verified `PARSE_NATURAL_LANGUAGE_COMMAND` contract, using the original dataset extraction and local parsing helpers. It validates the returned action and fields, then calls the existing Plan, Nearby, Live Bus or Timetable handlers. It does not implement a new router or transport dataset. The 25-second timeout accommodates real workflow latency; cancellation reaches the native HTTP bridge as well as browser fetch.
- Mobile `.env` now uses the two n8n settings supplied in the original `.env`. The original file remains unchanged. Config generation reads only those public `VITE_N8N_*` endpoint settings, rejects embedded credentials/query secrets, and fails if production configuration is missing. A live probe caught broken CR-only line boundaries in the mobile copy; normalization and parser regression tests fixed them. No credentials, endpoint values or private user location were printed by the voice verification probe. Server-only SMTP values remain excluded from the shipped runtime. Endpoint URLs are client configuration under the existing VITE convention, not a place to store authentication secrets.
- `ecomove://location/source` is an installed-app deep link for an iPhone accessibility Shortcut. This is an OS-supported Back Tap integration, not a fabricated browser/accelerometer double-tap detector. Settings explains setup and offers Copy URL on installed iOS. Web, Expo Go and devices without a compatible shortcut expose **Use current location as Source**; the Plan GPS control uses the same action.
- Source acquisition requests location permission, times out unavailable GPS, optionally reverse-geocodes on native, and preserves GPS coordinates when address lookup fails. It preserves Destination and cancels stale results after a manual Source change or session/background cancellation. Permission dialogs becoming temporarily inactive do not cancel themselves. Web uses a readable coordinate label because Expo reverse-geocoding is native-only.
- The final 320 px camera screenshot exposed a persisted camera preview overlapping an open sheet. Camera tracking now pauses while a panel is open and resumes with the map exposed; enabling camera explicitly collapses the sheet. This also prevents camera/voice panel overlap. The final visual recheck of this adjustment remains pending because the browser automation connection disconnected.

### Actual evidence

- `npm test`: **61 passed, 0 failed** (`artifacts/voice-full-tests.log`), including original/mobile routing, dataset, fare and nearby parity, camera lifecycle, gesture debounce/cooldown, source-location failure paths, speech lifecycle/cancellation, command navigation, workflow validation and environment parsing. The 25 new targeted tests exercise production implementations with explicit sensor/speech/network test adapters; they do not constitute physical-device tests.
- `npm run typecheck`: PASS (`artifacts/voice-typecheck.log`), with strict checking of the new voice transport, speech session, source helper and action adapter. Runtime compilation: PASS (`artifacts/voice-runtime-build.log`). Existing protected code emits an import.meta build warning; it was not modified.
- Actual production n8n contract probes returned HTTP 200 for `CHATBOT_QUERY` and `PARSE_NATURAL_LANGUAGE_COMMAND` (`artifacts/voice-n8n-probe.json`). The final app transport was also executed against the real endpoint: Sitabuldi → Airport returned `PLAN_ROUTE` in 3,926 ms; a general Nagpur metro question returned `GENERAL_ANSWER` in 3,385 ms (`artifacts/voice-live-validation.json`). These used public place names and no account or GPS information. The verification script is `scripts/verify-voice-workflow.cjs` and makes real requests only when explicitly run.
- Source preservation: **140 original files match the initial checksum baseline**. The remaining file is the original `.env`, explicitly updated by the user before integration. Its exact supplied checksum is recorded separately in `docs/environment-baseline.json`; subsequent edits still fail `verify:source`. The original October 8 baseline remains intact, and every protected copy still matches it. This is not a claim that the user-edited `.env` matches October 8.
- Browser verification observed the map, existing home/navigation and new Voice control at 320 × 568. A screenshot is `artifacts/camera-320-final.png` (before the final panel/camera pause adjustment). Browser automation then disconnected and remained unavailable after reconnect; complete final UI interaction verification is not claimed.
- `adb devices -l` found no connected emulator/device in this session. No real shake, microphone capture, GPS, native permission prompt or OS Back Tap event was tested. Native deployment validation remains required.

### Device setup and remaining limitations

1. Use a compatible installed Eco-Move build for speech recognition. The current project is SDK 58; the previously reported Expo Go SDK 57 cannot load it. Expo Go also does not include the custom speech-recognition module or installed-app custom scheme; typed input remains the fallback.
2. In Profile → Profile & preferences, enable **Shake for voice assistant** and allow motion access where requested. Tap Voice once to allow microphone/speech access. Check gentle movement does nothing, a deliberate shake starts listening, a second shake after the cooldown stops it, and Stop assistant always works immediately.
3. On supported iPhones, create a Shortcut with an **Open URL** action containing `ecomove://location/source`. Assign it in iPhone Settings → Accessibility → Touch → Back Tap → Double Tap. With an existing Destination selected, invoke it, grant location permission, and confirm only Source changes. This setup is manual and requires the installed app. [Apple's Back Tap shortcut instructions](https://support.apple.com/en-euro/guide/shortcuts/apd897693606/ios).
4. On unsupported devices, use **Use current location as Source** in settings or the Plan GPS button. Check location denial, GPS unavailable/timeout, offline address lookup, repeated activation and background/reopen. On web, test from HTTPS or localhost; browser permissions and sensor availability vary.
5. Hardware validation must also cover rapidly stopping/reopening Voice, no speech, denied microphone, disconnect during a workflow call, panel dismissal and logout during an outstanding request. The automated tests cover these lifecycle paths through adapters; physical hardware is not inferred from those tests.

Build/export status after the final camera presentation adjustment is recorded in `artifacts/voice-release-status.json` when the running release validation finishes. An older APK must not be presented as containing these changes.

### October 24 continuation — final web preview and native toolchain recovery

- Final web, Android and iOS Hermes exports completed after the camera/panel pause change (`artifacts/voice-export.log`, `artifacts/voice-final-export`). The local preview serves those files at `http://127.0.0.1:8082/`.
- The browser connection recovered. At 320 × 568, camera activation exposed its preview and Stop control; opening SafarBot removed the camera preview, closing the panel restored it, and Stop removed it. This closes the earlier **panel overlap** visual-check gap. Physical camera capture remains unverified. Evidence: `artifacts/voice-panel-camera-paused-320.png`.
- Voice opened in its listening state. Stop assistant immediately restored the typed controls. A later browser speech-recognition failure displayed a retryable error and returned to Voice; microphone transcription was not proven. The existing bus 35 question returned the dataset timetable with 144 departures, 05:15–21:30, and Pardi–Hingna endpoints.
- A fresh Sitabuldi Interchange → Airport search returned **22 min / ₹20**, **25 min / ₹16**, and **48 min / ₹12** at the tested departure. View map collapsed the sheet and exposed the Orange Line polyline and endpoint markers (`artifacts/voice-route-preview-390.png`). Map-picking cancellation retained both selected places.
- Nearby map selection at the public test point **21.1439, 79.0774** restored its panel and returned Jhansi Rani Metro Station at 347 m and Zero Mile Freedom Park at 484 m. Closing/reopening retained the point and results. Trips → All passes opened existing demo pass ECO-NAG-51653 with its QR and correct expired state. No new payment or email was submitted. Profile still displayed the preserved 1.88 kg / 2 trips reward total.
- The sampled browser error log was empty (`artifacts/voice-browser-errors.json`). This is a bounded observation, not a claim that all provider/device failures are impossible.
- The native rebuild exposed configuration left over from the dependency upgrade: AGP 9.2.1 requires Gradle 9.4.1; AGP's built-in Kotlin conflicted with the existing Kotlin Android plugin; and AGP no longer accepts `proguard-android.txt`. Updated the **mobile** wrapper to 9.4.1 with its official SHA-256, added the documented `android.builtInKotlin=false` / `android.newDsl=false` compatibility settings, and selected `proguard-android-optimize.txt`. Release minification remains as previously configured. Java 17 is unchanged. References: [Android Kotlin migration](https://developer.android.com/build/migrate-to-built-in-kotlin), [Gradle 9.4.1](https://docs.gradle.org/9.4.1/release-notes.html).
- Preserved failure logs: `voice-android-gradle931.log`, `voice-android-kotlin-conflict.log`, `voice-android-proguard-conflict.log`. Native compilation is still pending at this checkpoint; **these corrections are not themselves an APK success claim**.
- `npm run build:apk` now explicitly uses PowerShell 7, avoiding Windows PowerShell 5 treating native warning output as terminating errors. Release validation supports APK-only continuation after verified exports, preserves the preceding build log, and returns a nonzero exit code on failure.
- Source checks passed again: 140 original files match the initial baseline, original `.env` matches the explicit user-supplied checkpoint, and all protected copies match.

## October 25 — Hindi, English, Marathi and mixed voice commands

### Confirmed causes and changes

- Both speech entry points forced `en-IN`. Search displayed a transcript but did not apply the command. Live workflow probes also showed that explicit starting points were replaced with `Your location`, in all five tested language cases.
- Search and SafarBot now share an English (`en-IN`), Hindi (`hi-IN`) or Marathi (`mr-IN`) speech choice, saved with the existing AsyncStorage preference mechanism. Recognition receives place-name hints from the existing place list. Mixed commands are accepted; select the main spoken language. This does **not** claim that iOS or every browser automatically detects or switches recognition languages.
- `src/voiceInput.ts` adapts explicit English/Hindi/Marathi/romanized and mixed route grammar and spoken spelling aliases. It contains no new coordinates, stops or routes. Explicit Source/Destination text takes precedence over the workflow's default source. The original datasets, local/online search services, API payload contract and routing algorithms remain unchanged.
- Voice place selection now prefers exact names or station base names over arbitrary short keyword matches. The live probe originally selected **Sitabuldi Fort** for “Sitabuldi”; it now selects the existing **Sitabuldi (Interchange)**. An ambiguous match or unrecognized explicit Source does not silently reuse a previous Source or start a wrong trip. The previous selection is retained with a request to choose the place.
- Final Search speech and **Ask directions** now use the same guarded command/action path. A complete route command fills both fields and calls the existing route planner; a single recognized place remains associated with the active search field. Interim results do not submit a trip. Stop, collapse, background, logout and unmount invalidate pending permission/results. Native speech subscriptions remain cleaned up through the existing adapter.
- Language-pack, microphone permission, silence and network failures show actionable messages. Typed commands remain available when device recognition is unavailable. No audio recording is saved by this change.

### Actual verification

- **70 tests passed, 0 failed**, including unchanged routing/data/fare parity and new production-code language, exact-place selection, cancellation and explicit-source tests: `artifacts/multilingual-final-tests.log`. Focused voice suite: **23 passed** after the final place-matching change.
- Strict TypeScript and runtime compilation passed: `artifacts/voice-typecheck.log`, `artifacts/voice-runtime-build.log`. Existing protected `import.meta` build warnings remain; protected files were not edited.
- Five real n8n requests passed through the production command transport and action adapter, resolving to the expected original place objects and invoking the planner callback: `artifacts/multilingual-live-validation.json`. They cover English, Hindi, Marathi, Hindi/English mix and Marathi/English mix. Example: “मला सीताबर्डीपासून विमानतळापर्यंत जायचे आहे” sets Sitabuldi (Interchange) → Airport Metro Station. These are **text transcript/integration checks, not microphone accuracy tests**; the probe spies on the plan callback rather than executing an entire UI journey.
- Original preservation passed again: **140 original files match the initial baseline; original `.env` matches the explicit user-supplied environment checkpoint; every protected copy matches**. No original file was changed in this work.
- The preceding native rebuild failed because installed Expo 58 AARs require Android compile SDK 37. Updated only the mobile compile SDK from 36 to 37, retaining target SDK 36, minimum SDK 26 and Java 17. The failure evidence is `artifacts/voice-android-compilesdk36.log`. Fresh exports and APK validation are recorded in `artifacts/voice-release-status.json`; the previous APK does not contain these changes.

### Device limitation

Real microphone transcription in these languages, installed recognition models, native permission prompts and mixed-speech accuracy still require supported-device testing. This Windows session cannot establish iPhone microphone accuracy. Expo Go lacks the custom speech module; the project is SDK 58, while the user previously reported Expo Go SDK 57. Voice requires a compatible installed native build, or a browser with an available speech service. Select the primary language for mixed speech; unsupported language/service errors retain the typed command fallback. [Speech module platform documentation](https://github.com/jamsch/expo-speech-recognition).

### October 25 follow-up — station accuracy and opaque Matte frost

- The user reported that many station names were misheard. The audit found two input-layer gaps: the recognizer received only the popular-place list, and 12 of the 37 full metro station names did not directly match the abbreviations in the original routing search (for example, Congress Nagar versus Congress Ngr Metro Station).
- Recognition now uses up to 100 contextual hints from current endpoints, the existing popular places, all 37 metro stations and frequently served bus stops. Hindi/Marathi hints include script spellings. The validation vocabulary includes 1,894 normalized names from the original data. The hint list is bounded to avoid overloading the device recognizer. iOS uses the supported search task hint; no unsupported universal language autodetection is claimed.
- Added spelling equivalents for the 37 existing metro labels and a **mobile voice-only** abbreviation adapter (`runtime/voicePlaces.ts`). It returns original place objects/coordinates, preserves exact local matches, and reconciles `Ngr`, `Sq.`, `Clg`, `Exchang` and other original labels. The existing ordinary search API, datasets, routing engine and backend services were not edited.
- The three recognition alternatives are now inspected conservatively. An alternative can correct a station only when both its endpoints are known, a known endpoint is unchanged, and its confidence is sufficiently close to the primary result. A valid primary result is retained. Competing corrections or a low-confidence final result stop the microphone and show an editable transcript with **Use transcript**; no trip is submitted until confirmation. Unknown confidence is not invented or treated as measured accuracy.
- Matte Glass now uses 96.5–98.5% surface opacity, stronger diffused blur, restrained saturation, broad soft shading and no moving reflection. Android/unsupported backdrop paths use 98.5–100% opacity. Existing nested surfaces still inherit their parent material instead of stacking extra blur. Liquid remains the default; no new theme controls or unrelated preference changes were added.
- **78 tests passed, 0 failed** (`artifacts/accuracy-matte-final-tests.log`). Tests cover confidence/alternative selection, review confirmation/cancellation, all 37 station labels and their script spelling variants against the original coordinates, the 100-hint bound, all three language vocabularies and existing original/mobile functional parity. Station evidence: `artifacts/speech-station-validation.json`, `artifacts/speech-station-context.json`.
- Computed minimum normal-text contrast across the tested themes, states, fallbacks and backgrounds is **4.60:1**. Strict TypeScript passed. Five live n8n transcript/action probes passed again after the abbreviation adapter (`artifacts/multilingual-live-validation.json`). These are not measurements of microphone word-error rate.
- The earlier multilingual APK did build and verify successfully at 09:40 UTC on October 25 (55,108,345 bytes). It predates this accuracy/Matte follow-up. The new build status must be read from `artifacts/voice-release-status.json` before delivering an APK as containing this follow-up.
