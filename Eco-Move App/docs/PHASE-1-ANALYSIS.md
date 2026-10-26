# Phase 1 — source audit and preservation boundary

Completed before mobile implementation, 8 October 2026. This document and the file inventory are the analysis deliverables. All work is confined to `Eco-Move App`. Existing source is read-only. `source-baseline.json` records SHA-256 fingerprints for verification after building.

## Actual architecture

The source is a React 19 / TanStack Start web application. `/` is the landing page; `/login`, `/signup`, `/forgot-password`, `/update-password` implement account flows; `/app` contains the protected map planner and every transit feature. There are no separate server routing-engine endpoints: route calculation runs in the client. The Vite development plugin provides `/api/send-ticket-email`; the SSR server itself only wraps TanStack responses and error handling. A production SMTP endpoint is not implemented by that SSR entry.

`src/components/ui/*` consists of Radix/shadcn presentation primitives (the individual files and their dependencies are enumerated in FILE-INVENTORY.md). Landing-page sections, typography, layout, dialogs, buttons and navigation may be replaced. Business logic also exists inside UI handlers, especially ticket creation and planner orchestration; these are protected and must be ported verbatim or invoked unchanged.

## Feature and dependency map

| Feature / original entry | Protected dependencies and behavior | Mobile destination |
|---|---|---|
| Landing: index, Hero, HowItWorks, WhyNagpurConnect, Navbar | Existing intro and route presets; no new transit data | Welcome / Home |
| Authentication routes, ProtectedRoute | AuthContext → supabaseClient → profileService; email/password, phone/password, OTP, resend, Google OAuth, reset/update password, demo login, logout, persisted sessions | Native account forms, same AuthContext in embedded runtime; native deep-link adapter |
| app planner, PlaceSearch, GoogleMapsSearchBar | placesSearch local transit + curated POI + coordinate parser; Google Places then Nominatim/Photon; debounce/abort and duplicate suppression; GPS and map selection; AI intents/voice | Home search / Plan |
| routing.ts | network → datasets + frequencies; state-aware A*, heap, spatial index, transfer edges, schedule-aware boarding, preference scores, Pareto candidate frontier, exact fare lookup, geometry slicing, walk enrichment, driving fallback | Plan calls original functions |
| MapView.tsx | Leaflet/react-leaflet; city bounds; per-mode/per-line colors; selected journey paths, transfers, O/D/GPS/search pins; radius circle/stops; Chalo routes/vehicles/stop ETAs; POIs; Uber vehicles/polyline; fit/fly camera and marker callbacks | Persistent bundled Leaflet map inside React Native WebView |
| GoogleMapsLayersFAB | Google roadmap / CARTO Voyager; bus stops, metro stations, network toggles | Native layer sheet |
| Nearby Transit | nearby.ts → haversine, busStops/metroStations; 80m/min walk estimate; radius filtering | Nearby sheet, collapse to map for picking |
| Nearby restaurants/hospitals | nagpurPlaces curated data + Google Nearby; citywide lookup and nearest fallback | Nearby category controls |
| LiveBusTracker | liveBus → 978-route Chalo index; route details, road polyline decoding, variant IDs, vehicle dedup, stop ETA sort, nearby buses, five-second polling | Home / Nearby → Live tracker |
| BusTimetablePanel | busTimetableService → bus_schedules + network; route variants, stop offsets, departure status and stop-specific schedules | Live / Plan → Timetable |
| CabOptions | uberApi; Uber pricing/vehicles, OSRM road navigation, existing estimated fallback, exact external Uber link construction | Home / Plan → Cabs |
| AiRouteExplainer, SideRouteAiExplainer | n8nAiService; EXPLAIN_ROUTE / COMPARE_ROUTES payloads, local explanatory fallback, cache invalidation, English/Hindi/Marathi, large text, TTS/copy | Plan → Explanation / comparison |
| AiTransitChatbot, GoogleMapsSearchBar AI | same n8n service, verified fare/schedule context, intent parser + fallback, speech | Home → SafarBot / search commands |
| TicketBookingModal, DummyPaymentModal | ticketing fare/concession/12% Eco discount; up to four reorderable bus/metro legs; source issuance handler, local + Supabase persistence, CO2 accounting | Trips → Book / checkout |
| DigitalTicketPass, TicketWalletDrawer | QR payload, expiry, active/used tickets, bus validation / metro entry-exit simulator, transfer window, PDF/PNG | Trips → Wallet / ticket detail |
| GreenRewardsPanel, EcoCarbonPanel | reward constants and ecoRewardsService; per-user claims and CO2 accounting | Profile → Rewards / impact |
| Saved / Recent / Profile | original savedJourneysService, recentJourneysService, profileService, dbTypes and cache keys | Trips / Profile |
| DevBusRouteInspector | public/data/devRoutes.json, disabled by original flag | Preserved with original MapView; no new production toggle |
| wavRecorder, ticketExporter | Browser audio and DOM image/PDF APIs; platform-specific | Native speech, file sharing and PDF presentation adapters |

## Map details that must remain intact

Map initializes at 21.1458, 79.0882, zoom 13, min 11 / max 19; bounds SW 20.80,78.75 to NE 21.42,79.40 with viscosity 1. Canvas rendering is preferred. Selected journey fit, live route fit, stop fly-to, search fly-to, POI fit and cab fit are separate effects. Map clicks return latitude/longitude to active picking state. Bus/metro visibility is controlled separately. Live stop selection and timetable callbacks, searched-place and POI direction callbacks must cross the native bridge. The map remains mounted when navigating. Sheet presentation may change map viewport/padding but not coordinate data or route geometry.

## Algorithm findings

Actual implementation uses a priority-queue state-aware A* search. No separate named Dijkstra implementation exists in the supplied source; zero-heuristic paths share the same heap search. Do not invent or replace an algorithm to match README terminology. SpatialIndex uses 500m cells. Places merge at 120m for normalized matching names or 40m for same-mode physical matches. Bus edges are directed forward; metro edges go both ways. Walking transfers use 700m max and a 1.25 multiplier; access walking is 1500m; max total walking 4000m; max transfers 3. Timetables govern waiting and boarding. Six preference profiles are implemented. Pareto dominance currently includes fare as well as time, walk, transfers and CO2 (despite some four-objective comments). These exact decisions remain unchanged.

The source exposes departure-time selection. It does not implement a distinct arrive-by route search. Do not claim that functionality exists. Original enrichment resolves walking via ORS then OSM/OSRM, including cooldown on quota failure and cached results. When no transit route exists, app.tsx calls the original driving fallback and identifies it as a driving alternative.

## Dataset inventory

All JSON is reused byte-for-byte. network.json: 837 bus routes, 2 metro lines, 25,052 bus-stop occurrences and 38 metro-station occurrences. bus_schedules.json: 837 route keys. bus_fares.json: 460 keys. metro_fares.json: 1,444 fare rows. chalo_routes_index.json: 978 entries. lineGeometries.json: two top-level collections of full geometries. nagpurPlaces.ts contains curated POIs; ticketing.ts contains canonical stations and stop aliases. Never replace these with invented points or simplified networks.

## Authentication, persistence, database

The existing Supabase project and publishable/anon key are reused. AuthContext calls getSession/onAuthStateChange, loads/upserts profiles, persists a demo flag, and exposes all account methods. Existing demo email/password and OTP shortcuts and email-signup fallback are source behavior, not new mobile authentication. A native secure persistence mirror and OAuth callback handling are platform adapters, not a new auth backend. The same six tables and RLS definitions remain untouched: profiles, saved_journeys, recent_journeys, user_eco_rewards, user_tickets, ticket_email_logs. SQL is copied for reference only; no migration or remote database modification is performed.

## Environment and services

The complete .env is copied locally as requested, ignored by version control and excluded from client bundling. Only the five client configuration keys actually consumed by protected code (Supabase URL/anon/publishable, ORS, Google Places, CARTO as applicable) are supplied to the embedded build. SMTP_HOST/PORT/USER/PASS/FROM stay on the server. Numerous URL variables in .env are documentation/configuration values that current code does not read; hardcoded source endpoints stay unchanged. No secret values are reproduced in these reports.

Chalo route details, telemetry and nearby services are real fetch calls; contrary to the README simulation wording, this lib does not synthesize bus telemetry. Uber contains estimated vehicle/pricing fallbacks. Payments and gate scans are explicitly simulations in the source. QR tokens are client-generated strings, not server-signed authority-issued tickets. The mobile UI must identify this existing demo checkout behavior.

Ticket email source redirects certain demo addresses to a hardcoded recipient and can report success even if its HTTP call failed. Preserve the source; do not send demo emails during testing. An explicit email action must identify the recipient and delivery result. The app requires an absolute deployed web-backend URL or emulator-accessible local server for the relative /api endpoint. This cannot be invented.

`agent.json` is the n8n workflow: POST explain-route → switch → intent parser, route explainer/comparison, or transit Q&A → response node; OpenAI language-model node and fare/schedule data-table nodes supply the workflow. The code already injects verified dataset context. Both chatbot and route explanation use the same production webhook in the actual service. Workflow JSON and remote workflow remain unchanged. No standalone scraper scripts are present; dynamic scraping/integration is implemented as direct service fetches.

## Phase 2 implementation boundary

Native React Native presentation, five icon-only primary destinations (Home, Plan, Nearby, Trips, Profile), layered material system, native location/speech/share adapters and a typed message bridge are new. A bundled browser runtime invokes exact copies of protected services and AuthContext and renders the original MapView; this avoids a rewrite of Leaflet plotting or browser-dependent business modules. It is an offline-bundled hybrid map/runtime, not a remote website wrapper. Original code and datasets are preserved separately with checksum verification. Native screens must handle loading/error/empty/success and all sheet open/collapse/close/reopen paths.

Five glass levels: map environment, light controls, tinted navigation/cards, focused sheets/selections, command/search/checkout surfaces. iOS 26 native glass where supported; Android backdrop blur with restrained light movement and layered highlights. Reduced motion and increased contrast supported. Navigation targets >=48px; safe area + 18px spacing; keyboard hides navigation; Android Back dismisses nested content before leaving a destination. Explicit mobile viewport/landscape tests and an emulator installation are required. APK output and test evidence belong inside this folder.

## Toolchain discovery

Node 24, Java 17, Android Studio and Android SDK/platform-tools are installed. Existing Android platforms include 36 and 37, build tools 36.0.0, and a Medium Phone API 37 AVD. No device was running during analysis. Native dependency/build availability must be tested in Phase 2. No video reference was attached; written motion/material specification is the design reference.
