# Updated source migration — 26 October 2026

## Baseline and authority

Target: `C:/Users/LENOVO/Documents/Eco-Move_Nagpur-main/Eco-Move App`, repository HEAD `da8b333`, branch **New-Changes**, remote Official-Eco-Move-Application. Source: `V:/Eco-Nagpur/Eco-Move_Nagpur`, HEAD `0a8957b`, main, separate Eco-Move_Nagpur repository (read-only). The 163 ZIP entries match the supplied V folder after line-ending normalization. Original root APK was already modified and is excluded from this work.

Source is React 19 / TanStack Start / Leaflet. Target is Expo 58 / React Native 0.88, with native glass screens and a single embedded React/Leaflet runtime. Its RPC and storage bridges preserve existing services and authentication. Source desktop pages and styles must not replace the mobile screens.

All six transit JSON datasets are semantically identical: network, line geometry, schedules, bus fares, metro fares and Chalo route index. Preserve the target bytes and calculations. All environment keys and values match across source, target and supplied `env (2)`; no environment overwrite is needed. SMTP remains server-only. Client map keys require provider restrictions; public webhook URLs are endpoints, not credentials.

## Feature checklist and decisions

| Area | Decision | Reason / verification required |
| --- | --- | --- |
| A*, Dijkstra, Pareto, transfer graph, fares, carbon, schedules | Retain | No dataset change. Source walk enrichment replaces detours with straight lines and marks them resolved; this is not a reliable improvement. Run route/fare parity. |
| Nearby stops | Migrate | Bounding-box prefilter and metro-line cache preserve exact distances/results; test multiple radii/anchors. |
| Nearby live buses | Adapt source sampling | Source adds cardinal/diagonal samples. Bound concurrency/timeouts, deduplicate by vehicle/stream and preserve latest timestamps. Do not claim complete coverage or invent fresh telemetry. |
| Police stations | Migrate supplied station dataset and lookup | Static reference data, not live verification. Expose through existing Nearby panel and map. |
| Maps and layers | Retain single instance; migrate compatible performance work | Source whole MapView adds unrelated styling and Google tile changes. Keep authorized satellite adapter and original route geometry. Remove native visible zoom buttons; preserve pinch/keyboard. |
| Turn instructions / route preview | Adapt source geometry-based instructions and controller | Explicitly a preview, not GPS guidance. Do not infer exact road names from approximate corridor centers. Pause/exit, reduced motion and cleanup required. |
| Safe routing | Exclude unsupported guarantees | Source assigns 88–99% protection scores without evidence; fallback hardcodes 90%, four guardian anchors and patrolled highways. `getArterialMainRoadPath` returns two points marked as main road. Do not introduce a second misleading route engine. |
| Commuter profile | Adapt source service, existing glass profile panel | Same Supabase table/metadata/local-cache schema; optional, no forced onboarding or preference overwrite. Report local-only persistence when cloud is unavailable. No production SQL execution. |
| AI / n8n | Retain stronger target voice; migrate environment-based configuration | Source defaults DEV_ENABLE_N8N=false despite valid endpoints. Preserve live target behavior and explicit endpoint configuration; verify response formats with public test queries. |
| Hindi/English/Marathi voice and TTS | Retain | Target already has multilingual hints, station resolution, review, timeout and cancellation. Source has browser-only recognition and no new native hardware support. |
| Camera / motion gestures | Retain and verify opt-in lifecycle | Source camera refers to route animation, not a new physical-camera implementation. Target supports MediaPipe and native motion with fallbacks. No universal back-tap claim. |
| Tickets / QR | Retain isolation and validity contracts | Source merges all users' local tickets and copies tickets into every user's cache. Source also shortens existing validity retrospectively. Reject these regressions; preserve real account ownership and current issued expiries. |
| Profile request cache | Migrate with invalidation | Source TTL useful; correct demo persistence and auth invalidation before integration. |
| Themes / customization / navigation | Retain | Existing Liquid, Matte, Solid choices and controls remain unchanged. |
| Organization / size | Feature-scoped additions and measured optimization | No source decorative images, source theme system or duplicate clients. Keep lockfile compatible. Measure runtime and platform export, no speculative deletions. |

## Baseline artifacts

Existing completed APK: `artifacts/Eco-Move-Nagpur.apk`, **55,127,749 bytes**, SHA256 `407a1e3fd6473a670fdb27c84ea8bcedefb4f13b5f0ad46e9084ea5d20a782f7`.
Embedded runtime HTML: **21,407,187 bytes**. This is the pre-migration build, not proof of migrated-feature validation.

Implementation and verification results are recorded separately as they run. Physical-device microphone/camera testing and live authenticated cloud writes require actual devices/accounts; code tests do not prove them.
