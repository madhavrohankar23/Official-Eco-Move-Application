# 🌿 Eco-Move Nagpur
### Intelligent Multimodal Public Transit, Real-Time Telemetry & Smart Ticketing Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Auth-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![n8n](https://img.shields.io/badge/n8n-AI_Agent_Workflow-EA4B71?style=flat&logo=n8n&logoColor=white)](https://n8n.io/)

**Eco-Move Nagpur** is an advanced, WebGIS-powered multimodal urban transit planner and digital mobility ecosystem designed specifically for the **Nagpur Metropolitan Region (Maharashtra, India)**. Conceptualized with the polish of Google Maps but built from the ground up for sustainable public transportation, the platform unifies **Pedestrian Walking, Aapli Bus corridors, Nagpur Metro (Orange and Aqua Lines), and First/Last-Mile Ride Hailing** into optimized, multi-criteria itineraries with integrated digital QR ticketing and AI conversational guidance.

---

## 🌟 Comprehensive Feature Modules

### 1. 🧠 State-Aware A* Multimodal Pathfinding & 4D Pareto Engine
* **State-Tuple Graph Search:** Tracks physical nodes, active vehicle lines, and transfer penalties simultaneously ($(\text{Stop ID}) \mathbin{\Vert} (\text{Line ID}) \mathbin{\Vert} (\text{Transfer Count})$).
* **2D Spatial Hash Grid Indexing:** Uses an $O(1)$ constant-time spatial bucketing grid (~800m cells) to discover transfer walks in sub-millisecond time.
* **4D Pareto Frontier Optimization:** Generates non-dominated journey trade-offs balancing **Travel Time, Walking Fatigue, Transfer Count, and Carbon Emissions**.
* **Realistic Vector Road Curves:** Slices dense vector polylines (`lineGeometries.json`) and OpenRouteService (ORS) pedestrian paths to render accurate curves following Nagpur's real road network.
* **Schedule-Aware Time Picker:** Filters departures by exact time of day (*Depart at* / *Arrive by*) using verified Aapli Bus and Maha Metro timetable datasets.

### 2. 🚌 Real-Time Live Bus Fleet Telemetry & Tracking
* **Live Vehicle Simulation & Telemetry:** Simulates real-time GPS telemetry for Aapli Bus routes with vehicle registration codes, bearing, velocity, and halt detection.
* **Dynamic ETAs & Stop Countdowns:** Displays time-to-arrival (`formatLiveEta`) and active vehicle markers with animated pulsing rings and directional orientation.
* **Camera Focus Tracking:** Smoothly tracks selected buses and routes on the map (`FlyToLiveStop`, `FitLiveRoute`).

### 3. 📅 "Know Your Bus" Timetable & Schedule Explorer
* **Complete Route Timetables:** Comprehensive stop-by-stop departure schedules for all Nagpur Aapli Bus corridors (including multi-variant ring routes such as Bus 99 / 100).
* **Operating Hours & Frequency:** Highlights first bus, last bus, daily trip counts, and headway intervals directly from the search bar or itinerary cards.

### 4. 🤖 SafarBot — n8n Powered AI Transit Assistant
* **Natural Language Queries:** Answers commuter inquiries about bus routes, metro lines, fares, interchange stations, and accessibility.
* **Hybrid Intelligence Pipeline:** Connects to an external n8n AI Agent webhook with an automatic fallback to high-precision local transit matrices for 100% uptime.
* **Ticketing & Helpline Guidance:** Directs commuters to online booking on Eco-Move, physical Metro station counters/TVMs, Maha Metro official WhatsApp ticketing (**`+91 86248 88568`**), and Aapli Bus Chalo/conductor ticketing.

### 5. 🎫 Smart Digital Ticketing, Eco-Pass & Wallet
* **Exclusive Eco-Pass:** Combined Bus + Metro transfer pass offering an automated **12% fare discount**.
* **Instant QR Generation:** Produces cryptographically verifiable QR tickets for Single, Return, and Eco-Pass journeys.
* **Interactive Payment Gateway:** Realistic checkout supporting UPI QR code scanning (with tap-to-reveal lock protection), MahaCard Smart Card, and Debit Card options.
* **Automated Ticket Emailing:** Dispatches styled HTML transit passes with inline embedded CID QR attachments directly to the commuter's registered email via Gmail SMTP / Nodemailer.
* **Offline Ticket Downloads:** Instant high-resolution **PDF** and **PNG** ticket exports.
* **Ticket Wallet Drawer:** Persistent digital wallet managing active passes with countdown timers, QR expanders, and automatic state locking upon journey completion.

### 6. 🚖 First/Last-Mile Uber Ride Hailing
* **Real-Time Fare & ETA Estimates:** Direct integration with Uber products (Uber Go, Premier, Uber Auto, Uber Moto, Uber Shuttle) with simulated road routing.
* **Instant Deep-Linking:** Direct one-click deep link to open the native Uber app with pre-filled pickup and drop-off coordinates.

### 7. 🗺️ Google Maps-Style WebGIS Experience
* **Dual Map Themes:** Toggle between **Google Maps Roadmap** tiles and **CARTO Voyager** tiles.
* **Strict Metropolitan Boundary Lock:** Map viewport is locked to Greater Nagpur (`[20.80, 78.75]` to `[21.42, 79.40]`) using `maxBoundsViscosity={1.0}` and `minZoom={11}` to prevent accidental panning outside the city.
* **Unified Floating Search Bar:** Autocomplete search across 300+ transit stations, Nagpur landmarks, hospitals, colleges, and custom GPS pins.
* **Nearby POI Discovery:** One-tap discovery of hospitals, restaurants, and transit stops within custom radial buffers.

### 8. 🌿 Gamified Carbon Footprint & Green Rewards
* **Live Carbon Tracking:** Calculates net grams of CO₂ saved per trip compared to private vehicle baselines (192 g/km).
* **Green Rewards Tier System:** Commuters earn green transit points, unlocking Bronze, Silver, Gold, and Platinum commuter badges.

---

## 🏗️ System Architecture & Data Pipeline

```
 Commuter Input (Origin, Destination, Time, Preference)
                       │
                       ▼
 ┌────────────────────────────────────────────────────────┐
 │   Google Maps Floating Search Bar / GPS Geolocation    │
 └───────────────────────┬────────────────────────────────┘
                         │
                         ▼
 ┌────────────────────────────────────────────────────────┐
 │      SpatialIndex (2D Hash Grid ~800m Bucket Cells)    │
 └───────────────────────┬────────────────────────────────┘
                         │ Fast O(1) Candidate Hubs
                         ▼
 ┌────────────────────────────────────────────────────────┐
 │     State-Aware A* Multimodal Router (routing.ts)      │
 │  ├── Graph: network.json (Aapli Bus + Metro lines)    │
 │  ├── Pedestrian Routing: OpenRouteService (ORS) API    │
 │  ├── Schedule Filter: bus_schedules.json (Timetables)  │
 │  └── Heuristic: h(n) = Haversine(n, dest) / 32 km/h    │
 └───────────────────────┬────────────────────────────────┘
                         │
                         ▼
 ┌────────────────────────────────────────────────────────┐
 │         4D Pareto Multi-Objective Evaluator            │
 │     (Travel Time, Walk Fatigue, Transfers, CO₂)        │
 └───────────┬────────────────────────────────┬───────────┘
             │                                │
             ▼                                ▼
 ┌───────────────────────────┐    ┌───────────────────────────┐
 │   Supabase PostgreSQL DB  │    │  n8n AI Workflow Agent    │
 │   & Modular Services      │    │  & Natural Language API   │
 │   (src/services/*)        │    │  (src/lib/n8nAiService.ts)│
 └───────────┬───────────────┘    └───────────┬───────────────┘
             │                                │
             └────────────────┬───────────────┘
                              ▼
 ┌────────────────────────────────────────────────────────┐
 │           Interactive WebGIS Interface (MapView)       │
 │  ├── Leaflet + Google Maps Raster Tiles                │
 │  ├── Live Bus Fleet GPS Telemetry Markers              │
 │  ├── SafarBot AI Conversational Transit Chatbot        │
 │  ├── First/Last-Mile Uber Ride Hailing Options         │
 │  └── Smart Digital Ticket Wallet & Payment Gateway     │
 └────────────────────────────────────────────────────────┘
```

---

## 🗄️ Supabase Backend & Services Architecture (`src/services/`)

Eco-Move Nagpur uses **Supabase (PostgreSQL)** for user authentication, data isolation, trip history, gamified carbon rewards, and digital ticket persistence. All database interactions are decoupled into clean, typed service modules under `src/services/`:

```
src/services/
├── dbTypes.ts                # TypeScript interfaces for all Supabase tables
├── profileService.ts         # User profile management & travel preferences
├── savedJourneysService.ts   # Commuter favorite routes and saved itineraries
├── recentJourneysService.ts  # Automatic trip search & planning history
├── ecoRewardsService.ts      # Green points ledger, CO₂ offsets & badge levels
├── ticketService.ts          # Digital transit pass persistence, status & QR codes
└── emailService.ts           # Automated HTML ticket dispatch via Gmail SMTP / Edge Functions
```

### Database Schema Overview (`src/lib/supabase-schema.sql`)

| Table Name | Primary Key | Key Fields & Purpose |
|---|---|---|
| **`profiles`** | `id` (UUID $\to$ `auth.users`) | User full name, email, avatar, phone, preferred routing mode (`fastest`, `least_walking`, `least_transfers`). |
| **`saved_journeys`** | `id` (UUID) | Bookmarked multimodal routes with JSON origin/destination, legs, fare, duration, and carbon metrics. |
| **`recent_journeys`**| `id` (UUID) | Automatically logged commuter search queries and selected route results. |
| **`user_eco_rewards`**| `id` (UUID) | User's lifetime total CO₂ saved (kg), green trip counts, and unlocked reward IDs. |
| **`user_tickets`**   | `id` (TEXT, e.g. `ECO-2026-...`)| Digital transit passes with ticket type (`eco_pass`, `metro`, `bus`), origin/dest, validity window, QR payload, and status (`active`, `completed`, `expired`). |
| **`ticket_email_logs`**| `id` (UUID) | Audit log of sent ticket confirmation emails, recipient address, subject, and delivery status. |

### Row Level Security (RLS)
All database tables enforce strict **PostgreSQL Row Level Security (RLS)** policies ensuring multi-tenant isolation. Commuters can only read, insert, update, and delete records linked to their authenticated `auth.uid()`.

---

## ⚡ n8n AI Agent Workflow Architecture

Eco-Move Nagpur integrates an autonomous transit AI pipeline orchestrated via **n8n Workflow Automation**:

```
[ Commuter Query in SafarBot / Route Explainer ]
                       │
                       ▼
         [ src/lib/n8nAiService.ts ]
  (Pre-injects local timetable & fare ground truth)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[ Webhook 1: explain-route ]   [ Webhook 2: chatbot ]
Multi-leg journey analysis     Free-form Q&A on Nagpur
Transfer & CO₂ explanation     Transit, Fares & Timetables
       │                               │
       └───────────────┬───────────────┘
                       │
                       ▼
          [ n8n AI Agent Node (LLM) ]
  (Evaluates context, dataset rules & transit prompts)
                       │
                       ▼
 [ Cleaned AI Response + Voice TTS + Platform Links ]
                       │
       (Fallback if webhook offline / timeout >3.5s)
                       │
                       ▼
 [ Resilient Local Transit Matrix Intelligence Engine ]
```

### Key Workflow Capabilities:
1. **Explain Route Webhook (`/webhook/explain-route`):** Accepts rich JSON journey context (transfers, total time, fare, walking legs, carbon saved) and returns human-friendly advice detailing why this itinerary is optimal and where to transfer (e.g. Sitabuldi Interchange).
2. **Chatbot Webhook (`/webhook/chatbot`):** Handles open queries like *"How to reach Airport from Nagpur Railway Station"*, *"Schedule of Bus 100"*, or *"How to apply for MahaCard"*.
3. **Local Intelligence Fallback:** If the external n8n webhook is unavailable or latency exceeds 3.5 seconds, `n8nAiService.ts` instantly answers from local dataset matrices, ensuring 100% uptime with zero broken UI states.

---

## 🧮 Algorithmic & Mathematical Specifications

### 1. State-Aware Graph Key
In our multimodal transit graph, nodes are state tuples:
$$\text{State Key} = (\text{Stop ID}) \mathbin{\Vert} (\text{Line ID}) \mathbin{\Vert} (\text{Transfer Count})$$

### 2. A* Evaluation Formula ($f(n) = g(n) + h(n)$)
* **$g(n)$ (Accumulated Cost):** Sum of elapsed walking time, in-vehicle transit time, scheduled headway wait times, and transfer penalties.
* **$h(n)$ (Admissible Heuristic):**
  $$h(n) = \left( \frac{\text{HaversineDistance}(n, \text{Destination})}{v_{\max}} \right) \times 60$$
  where $v_{\max} = 32.0\text{ km/h}$ (Nagpur Metro commercial speed). Since no transit mode exceeds $32\text{ km/h}$, $h(n) \le h^*(n)$ always holds true, guaranteeing shortest path optimality.

### 3. Model Constants & Speeds
| Parameter | Configured Value | Description |
|---|---|---|
| **Walking Speed** | `4.8 km/h` (1.33 m/s) | Standard urban pedestrian pace |
| **Aapli Bus Speed** | `17.0 km/h` | Nagpur arterial road traffic average |
| **Metro Speed** | `32.0 km/h` | Commercial rapid rail operational average |
| **Bus Initial Wait** | `5.0 min` | Average headway at bus stops |
| **Metro Initial Wait**| `4.0 min` | Average platform headway |
| **Transfer Penalty** | `3.0 min` | Buffer time added per modal interchange |
| **Max First/Last Walk** | `1,500 m` (1.5 km) | Maximum walking radius to transit |
| **Max Transfer Walk** | `700 m` (0.7 km) | Maximum walk to switch lines |
| **Metro CO₂ Emission** | `22 g/km` | Electric rail per passenger-km |
| **Bus CO₂ Emission** | `68 g/km` | Shared public transit bus |
| **Car Baseline CO₂** | `192 g/km` | Private ICE vehicle benchmark |

---

## 📁 Codebase Directory Structure

```
Eco-Move_Nagpur FYP/
├── public/                     # Favicons, background video & static assets
├── src/
│   ├── components/             # Reusable UI, Map & Modal components
│   │   ├── AiRouteExplainer.tsx      # Modal explaining journey choices via AI
│   │   ├── AiTransitChatbot.tsx      # SafarBot floating AI assistant with TTS
│   │   ├── BusTimetablePanel.tsx     # "Know your bus" daily schedule viewer
│   │   ├── CabOptions.tsx            # First/last-mile Uber estimates & deep links
│   │   ├── DevBusRouteInspector.tsx  # Developer route inspection overlay
│   │   ├── DigitalTicketPass.tsx     # Realistic QR transit pass view
│   │   ├── DummyPaymentModal.tsx     # Interactive UPI/Card checkout modal
│   │   ├── GoogleMapsLayersFAB.tsx   # Floating map style toggle button
│   │   ├── GoogleMapsSearchBar.tsx   # Unified place & station search bar
│   │   ├── GreenRewardsPanel.tsx     # Carbon savings & green tier rewards
│   │   ├── Hero.tsx                  # Landing page hero with background video
│   │   ├── HowItWorks.tsx            # Platform feature explainer section
│   │   ├── LiveBusTracker.tsx        # Real-time bus GPS tracker drawer
│   │   ├── MapView.tsx               # Leaflet WebGIS engine with boundary lock
│   │   ├── MaterialTimePicker.tsx    # Departure/arrival time selector
│   │   ├── Navbar.tsx                # Floating navigation header
│   │   ├── PlaceSearch.tsx           # Station autocomplete selector
│   │   ├── ProtectedRoute.tsx        # Supabase authentication route guard
│   │   ├── SideRouteAiExplainer.tsx  # Side panel route breakdown
│   │   ├── TicketBookingModal.tsx    # Modal for buying passes with email trigger
│   │   ├── TicketWalletDrawer.tsx    # Digital pass wallet drawer
│   │   ├── WhyNagpurConnect.tsx      # Sustainable transit mission section
│   │   └── ui/                       # Radix UI & shadcn/ui design primitives
│   ├── context/
│   │   └── AuthContext.tsx           # Supabase auth session & OAuth state
│   ├── data/
│   │   ├── bus_fares.json            # Pairwise Aapli Bus fare matrix
│   │   ├── bus_schedules.json        # Official Aapli Bus departure timetables
│   │   ├── chalo_routes_index.json   # Chalo route cross-reference index
│   │   ├── lineGeometries.json       # Vector road curves & viaduct paths
│   │   ├── metro_fares.json          # Maha Metro station-to-station fare matrix
│   │   └── network.json              # 20 Bus corridors + 2 Metro lines (300+ stops)
│   ├── lib/
│   │   ├── busTimetableService.ts    # Timetable parser & route matcher
│   │   ├── fares.ts                  # Multimodal fare calculation engine
│   │   ├── frequencies.ts            # Headway and interval estimators
│   │   ├── liveBus.ts                # Real-time synthetic bus GPS telemetry
│   │   ├── n8nAiService.ts           # n8n AI webhook client & local transit dataset AI
│   │   ├── nagpurPlaces.ts           # Landmarks, hospitals & POI dataset
│   │   ├── nearby.ts                 # Radial transit stop proximity search
│   │   ├── network.ts                # Transit network graph builder
│   │   ├── ors.ts                    # OpenRouteService pedestrian walking client
│   │   ├── placesSearch.ts           # Fuzzy place search engine
│   │   ├── routing.ts                # State-aware A* & 4D Pareto router
│   │   ├── supabase-schema.sql       # Full PostgreSQL database schema with RLS
│   │   ├── ticketExporter.ts         # High-resolution PDF & PNG pass exporter
│   │   ├── ticketing.ts              # Local ticket pass persistence & state
│   │   ├── uberApi.ts                # Uber product pricing & route estimator
│   │   └── utils.ts                  # Tailwind class utilities
│   ├── routes/
│   │   ├── __root.tsx                # Root layout shell with Auth providers
│   │   ├── index.tsx                 # Public Landing Page ("/")
│   │   ├── app.tsx                   # Main Multimodal Transit Planner ("/app")
│   │   ├── login.tsx                 # Authentication Login ("/")
│   │   └── signup.tsx                # User Registration ("/signup")
│   ├── services/                     # Database connectivity & service layers
│   │   ├── dbTypes.ts                # TypeScript interfaces for Supabase tables
│   │   ├── ecoRewardsService.ts      # Green points & carbon reward management
│   │   ├── emailService.ts           # Automated ticket emailing (SMTP / Edge)
│   │   ├── profileService.ts         # User profile CRUD & travel preferences
│   │   ├── recentJourneysService.ts  # Automatic trip search & plan logging
│   │   ├── savedJourneysService.ts   # Saved favorite journeys & bookmarks
│   │   └── ticketService.ts          # Digital pass CRUD, validation & locking
│   ├── supabaseClient.ts             # Supabase live PostgreSQL client
│   └── styles.css                    # Tailwind CSS v4 design tokens
├── .env                              # Environment credentials & API keys
├── package.json                      # Project dependencies & npm scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite build configuration
└── work_log_report.md                # Chronological development activity log
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
* **Node.js**: `v20.0.0` or higher
* **npm**: `v10.0.0` or higher

### 1. Clone the Repository
```bash
git clone https://github.com/rohit6996/Eco-Move_Nagpur.git
cd "Eco-Move_Nagpur FYP"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Supabase Authentication & PostgreSQL Database
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# CARTO Basemap Tiles (Optional / Pre-configured)
VITE_CARTO_API_KEY=your-carto-api-key

# OpenRouteService for Real Road Walking Geometry
VITE_ORS_API_KEY=your-openrouteservice-api-key

# n8n AI Transit Assistant Webhooks
VITE_N8N_EXPLAIN_ROUTE_WEBHOOK_URL=https://your-n8n-instance.cloud/webhook/explain-route
VITE_N8N_CHATBOT_WEBHOOK_URL=https://your-n8n-instance.cloud/webhook/chatbot

# Gmail SMTP for Automated Digital Ticket Emailing (Optional)
VITE_SMTP_USER=ecomove.teams@gmail.com
VITE_SMTP_PASS=your-gmail-app-password
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 🚌 Zero-Code Transit Data Extensibility

New bus corridors, metro stations, and schedules can be added without modifying source code:

1. **Add Stops & Route Sequence** in `src/data/network.json`:
   ```json
   {
     "route": "Sitabuldi - Hingna Gramin Hospital",
     "bus_number": "135",
     "stops": [
       { "name": "Sitabuldi", "lat": 21.141195, "lon": 79.079900 },
       { "name": "Jhansi Rani Chowk", "lat": 21.142512, "lon": 79.073412 },
       { "name": "Hingna Gramin Hospital", "lat": 21.074312, "lon": 78.954803 }
     ]
   }
   ```
2. **Add Daily Departures** in `src/data/bus_schedules.json`:
   ```json
   {
     "135": {
       "routeName": "Sitabuldi - Hingna Gramin Hospital",
       "tripsPerDay": 103,
       "departures": [360, 375, 390, 400, 420, 1170]
     }
   }
   ```
3. **Add Fare Rules** in `src/data/bus_fares.json`.

---

## 👥 Project & Institutional Affiliation

* **Project Title:** Eco-Move Nagpur — Multimodal Intelligent Transportation System (ITS)
* **Academic Program:** Final Year Project (B.Tech FYP)
* **Department:** Department of Computer Science & Engineering
* **Institution:** G.H. Raisoni College of Engineering (GHRCE), Nagpur
* **Domain:** Smart Cities, Intelligent Mobility, WebGIS, Carbon Optimization
