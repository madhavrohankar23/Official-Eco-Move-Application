# Eco-Move Nagpur mobile

React Native / Expo application built around the existing Eco-Move source. All application work, protected source copies, generated Android project, build tools and artifacts are contained in this directory.

## Install & Deliverables

The latest verified Android release APK is located at:
- Primary Distributable: [`dist/Eco-Move-Nagpur-Android.apk`](file:///c:/Users/LENOVO/Documents/Eco-Move_Nagpur-main/Eco-Move%20App/dist/Eco-Move-Nagpur-Android.apk) (exact size, SHA-256 and verification timestamp: `artifacts/apk-verification.json`)
- Workspace Artifact: [`artifacts/Eco-Move-Nagpur.apk`](file:///c:/Users/LENOVO/Documents/Eco-Move_Nagpur-main/Eco-Move%20App/artifacts/Eco-Move-Nagpur.apk)

Supported on Android 8.0+ (API 26+) for `arm64-v8a` and `x86_64`. It is a standalone, prebundled release APK with APK Signature Scheme v2 verified. The embedded runtime and transport graph execute locally inside the WebView with no Metro dev server dependency.

## Run and build

```powershell
npm ci
npm run build:runtime
npm run typecheck
npm test
npm run web -- --port 8082
npm run build:apk
powershell -ExecutionPolicy Bypass -File scripts/verify-apk.ps1
```

The Windows APK script uses Java 17, the app-local Android SDK and Gradle cache. A drive alias to this directory avoids Windows native compiler path limits. Open `android` in Android Studio to inspect the native project. The prebuilt APK runs without Metro.

The verification script checks the APK signature, package identity and both supported architectures, and writes its exact path, size and SHA-256 to `artifacts/apk-verification.json`. The app-local QA emulator can be started with `powershell -ExecutionPolicy Bypass -File scripts/start-emulator.ps1` once its existing Android 35 image is available.

## Architecture

- `src/screens`: native mobile screens, forms and independently scrolling, dismissible map sheets.
- `src/components`: five-icon animated navigation and shared glass material/state system. Android uses a translucent tint/highlight fallback to avoid WebView blur artifacts; supported iOS versions use native glass and web uses backdrop blur. Motion respects reduced-motion settings and pauses in the background.
- `runtime`: locally bundled original Leaflet map, authentication and service/algorithm runtime, connected to native controls through an explicit message bridge. This is a hybrid React Native application; it does not replace the original map with a different routing engine or load the hosted website.
- `protected`: byte-preserved source and datasets. `scripts/verify-source.cjs` checks both these copies and the original project against the Phase 1 baseline.
- `src/platform`: native HTTP, location, persistence and map-host adapters. Supabase session keys use SecureStore; other existing local state uses AsyncStorage.
- `docs/PHASE-1-ANALYSIS.md` and `docs/FILE-INVENTORY.md`: source audit and dependency map.

The copied `.env` is ignored by Git. Only the public client configuration needed by the original application is embedded in the runtime. SMTP credentials are excluded from the APK and verified by a test. Do not distribute the private `.env` or server configuration.

## Existing services

The application uses the original Supabase project, Chalo live buses, routing/search endpoints and n8n webhook. Network access and the availability/configuration of those external services are still required. Maps require network tiles; the transport datasets and routing code are bundled locally.

Google OAuth and password-reset deep links use `ecomove://auth/callback`; that URL must be allowed by the existing Supabase project for those flows. No remote authentication or database settings were changed.

Ticket payments and gate scans remain the source project's demo simulations. They are explicitly presented as demonstrations, not real payment processing or transit admission. The source's demo-account fallback and cab fallback behavior are preserved.

The original ticket-email middleware can run separately with `npm run server:email`. Its default port is 8099. Android Emulator's default backend URL is `http://10.0.2.2:8099`; set the actual reachable backend URL in Profile → preferences for a physical device. SMTP settings remain server-side. Email is opt-in; no real ticket emails were sent during development. The original middleware's recipient handling is preserved, so review the Phase 1 audit before enabling it in production.

## Validation

See `docs/IMPLEMENTATION-AND-VALIDATION.md` for tested behavior and remaining external-service verification requirements. The checks compare all six original routing preferences, nearby results, fare calculations and network data with the preserved source rather than substituting expected mock results.

## iPhone with Expo Go (SDK 57)

The confirmed device uses Expo Go 57.0.9 (SDK 57) on iOS 27.0. Keep the project on SDK 57 for this client.

From this directory:

```powershell
npm ci --cache ./toolchain/npm-cache
npm run build:runtime
npx expo start --go --clear --lan
```

Connect the computer and iPhone to the same Wi-Fi, then scan the terminal QR code with the iPhone camera. If Windows asks about network access, manage that prompt yourself. Do not scan an Android APK link to open the app on iOS. If another Metro server already uses port 8081, stop that project's server first or choose a different port.

- Expo Go supports typed place search, the embedded map, routing and the bundled compatible native libraries. Voice recognition is a custom native module and requires an installed development/standalone build; its absence is handled safely in Expo Go.
- Google OAuth and password-reset return links use the app's custom URL scheme and require an installed app build. Email/password and existing demo access remain available in Expo Go. Remote Supabase access still depends on its current settings and network.
- Ticket email needs the same existing backend at an address reachable from the phone. In Profile → preferences set the computer's LAN server URL or the deployed server URL. `10.0.2.2` is only the Android emulator's host address.
- If dependencies become inconsistent, use `npm ci` from the lockfile. Do **not** apply `npm audit fix --force`: its current suggestions include incompatible Expo/RN downgrades. The recorded audit findings and native-config warning are listed in the validation document.
- iOS JavaScript/Hermes export was verified on Windows. Physical iPhone execution is not yet verified; a native iOS binary requires an Apple build environment or a configured build service.
