# Source file inventory

Every project-owned file is fingerprinted; installed third-party node_modules are represented by package.json and package-lock.json. Binary assets are inventoried, not interpreted as code.

| File | Classification | Bytes | Dependencies |
|---|---|---:|---|
| .env | configuration-or-asset | 2539 |  |
| .env.example | configuration-or-asset | 266 |  |
| .gitignore | configuration-or-asset | 602 |  |
| .prettierignore | configuration-or-asset | 92 |  |
| .prettierrc | configuration-or-asset | 90 |  |
| agent.json | protected-data-or-workflow | 19214 |  |
| components.json | configuration-or-asset | 443 |  |
| eslint.config.js | configuration-or-asset | 1250 | @eslint/js, eslint-plugin-prettier/recommended, globals, eslint-plugin-react-hooks, eslint-plugin-react-refresh, typescript-eslint |
| package-lock.json | configuration-or-asset | 243987 |  |
| package.json | configuration-or-asset | 3349 |  |
| public/amazon_pay.svg | configuration-or-asset | 8639 |  |
| public/android-chrome-192x192.png | configuration-or-asset | 55971 |  |
| public/android-chrome-512x512.png | configuration-or-asset | 313593 |  |
| public/apple-touch-icon.png | configuration-or-asset | 49891 |  |
| public/auth.png | configuration-or-asset | 5762979 |  |
| public/background.mp4 | configuration-or-asset | 2474632 |  |
| public/bhim_logo.svg | configuration-or-asset | 9586 |  |
| public/data/devRoutes.json | configuration-or-asset | 22661442 |  |
| public/favicon-16x16.png | configuration-or-asset | 920 |  |
| public/favicon-32x32.png | configuration-or-asset | 2733 |  |
| public/favicon.ico | configuration-or-asset | 15406 |  |
| public/favicon.png | configuration-or-asset | 313593 |  |
| public/safarbot-icon.svg | configuration-or-asset | 11230 |  |
| README.md | configuration-or-asset | 24748 |  |
| src/components/AiRouteExplainer.tsx | mixed-presentation-and-orchestration | 10255 | react, lucide-react, @/lib/routing, @/lib/n8nAiService |
| src/components/AiTransitChatbot.tsx | mixed-presentation-and-orchestration | 38448 | react, react-markdown, lucide-react, @/lib/n8nAiService |
| src/components/BusTimetablePanel.tsx | mixed-presentation-and-orchestration | 26936 | react, lucide-react, @/lib/busTimetableService |
| src/components/CabOptions.tsx | mixed-presentation-and-orchestration | 23349 | react, ./PlaceSearch, lucide-react, @/lib/uberApi |
| src/components/DevBusRouteInspector.tsx | mixed-presentation-and-orchestration | 11882 | react, react-leaflet, lucide-react |
| src/components/DigitalTicketPass.tsx | mixed-presentation-and-orchestration | 30169 | react, qrcode, lucide-react, @/lib/ticketing, @/lib/ticketExporter, @/services/ticketService, @/context/AuthContext |
| src/components/DummyPaymentModal.tsx | mixed-presentation-and-orchestration | 37881 | react, qrcode, lucide-react, @/lib/ticketing |
| src/components/GoogleMapsLayersFAB.tsx | mixed-presentation-and-orchestration | 11211 | react, lucide-react |
| src/components/GoogleMapsSearchBar.tsx | mixed-presentation-and-orchestration | 38855 | react, lucide-react, @/lib/placesSearch, @/components/PlaceSearch, ) ||
        query.trim().split( |
| src/components/GreenRewardsPanel.tsx | mixed-presentation-and-orchestration | 26682 | react, lucide-react, ../services/ecoRewardsService |
| src/components/Hero.tsx | mixed-presentation-and-orchestration | 8157 | react, @tanstack/react-router, lucide-react, ../context/AuthContext |
| src/components/HowItWorks.tsx | mixed-presentation-and-orchestration | 2559 | react |
| src/components/LiveBusTracker.tsx | mixed-presentation-and-orchestration | 29518 | react, lucide-react, @/lib/liveBus |
| src/components/MapView.tsx | mixed-presentation-and-orchestration | 62097 | ./DevBusRouteInspector, react-leaflet, react, leaflet, @/lib/routing, @/lib/routing, @/lib/nearby, @/lib/liveBus, @/lib/liveBus, @/lib/uberApi, @/lib/nagpurPlaces, lucide-react |
| src/components/MaterialTimePicker.tsx | mixed-presentation-and-orchestration | 16475 | react, lucide-react |
| src/components/Navbar.tsx | mixed-presentation-and-orchestration | 1355 | react, @tanstack/react-router, lucide-react |
| src/components/PlaceSearch.tsx | mixed-presentation-and-orchestration | 14750 | react, @/components/ui/input, lucide-react, @/lib/placesSearch |
| src/components/ProtectedRoute.tsx | mixed-presentation-and-orchestration | 2578 | react, @tanstack/react-router, ../context/AuthContext, lucide-react |
| src/components/SideRouteAiExplainer.tsx | mixed-presentation-and-orchestration | 63776 | react, lucide-react, @/lib/routing, @/lib/n8nAiService |
| src/components/TicketBookingModal.tsx | mixed-presentation-and-orchestration | 58109 | react, lucide-react, @/lib/ticketing, @/context/AuthContext, @/services/ticketService, @/services/ecoRewardsService, @/services/emailService, ./DummyPaymentModal, ./DigitalTicketPass |
| src/components/TicketWalletDrawer.tsx | mixed-presentation-and-orchestration | 14411 | react, lucide-react, @/lib/ticketing, @/services/ticketService, @/context/AuthContext, ./DigitalTicketPass |
| src/components/ui/accordion.tsx | web-presentation-primitive | 2015 | react, @radix-ui/react-accordion, lucide-react, @/lib/utils |
| src/components/ui/alert-dialog.tsx | web-presentation-primitive | 4183 | react, @radix-ui/react-alert-dialog, @/lib/utils, @/components/ui/button |
| src/components/ui/alert.tsx | web-presentation-primitive | 1589 | react, class-variance-authority, @/lib/utils |
| src/components/ui/aspect-ratio.tsx | web-presentation-primitive | 143 | @radix-ui/react-aspect-ratio |
| src/components/ui/avatar.tsx | web-presentation-primitive | 1413 | react, @radix-ui/react-avatar, @/lib/utils |
| src/components/ui/badge.tsx | web-presentation-primitive | 1123 | react, class-variance-authority, @/lib/utils |
| src/components/ui/breadcrumb.tsx | web-presentation-primitive | 2749 | react, @radix-ui/react-slot, lucide-react, @/lib/utils |
| src/components/ui/button.tsx | web-presentation-primitive | 1894 | react, @radix-ui/react-slot, class-variance-authority, @/lib/utils |
| src/components/ui/calendar.tsx | web-presentation-primitive | 7226 | react, lucide-react, react-day-picker, @/lib/utils, @/components/ui/button |
| src/components/ui/card.tsx | web-presentation-primitive | 1817 | react, @/lib/utils |
| src/components/ui/carousel.tsx | web-presentation-primitive | 6200 | react, embla-carousel-react, lucide-react, @/lib/utils, @/components/ui/button |
| src/components/ui/chart.tsx | web-presentation-primitive | 10570 | react, recharts, @/lib/utils |
| src/components/ui/checkbox.tsx | web-presentation-primitive | 1043 | react, @radix-ui/react-checkbox, lucide-react, @/lib/utils |
| src/components/ui/collapsible.tsx | web-presentation-primitive | 335 | @radix-ui/react-collapsible |
| src/components/ui/command.tsx | web-presentation-primitive | 4876 | react, @radix-ui/react-dialog, cmdk, lucide-react, @/lib/utils, @/components/ui/dialog |
| src/components/ui/context-menu.tsx | web-presentation-primitive | 7360 | react, @radix-ui/react-context-menu, lucide-react, @/lib/utils |
| src/components/ui/dialog.tsx | web-presentation-primitive | 3648 | react, @radix-ui/react-dialog, lucide-react, @/lib/utils |
| src/components/ui/drawer.tsx | web-presentation-primitive | 2973 | react, vaul, @/lib/utils |
| src/components/ui/dropdown-menu.tsx | web-presentation-primitive | 7565 | react, @radix-ui/react-dropdown-menu, lucide-react, @/lib/utils |
| src/components/ui/form.tsx | web-presentation-primitive | 4201 | react, @radix-ui/react-label, @radix-ui/react-slot, react-hook-form, @/lib/utils, @/components/ui/label |
| src/components/ui/hover-card.tsx | web-presentation-primitive | 1246 | react, @radix-ui/react-hover-card, @/lib/utils |
| src/components/ui/input-otp.tsx | web-presentation-primitive | 2232 | react, input-otp, lucide-react, @/lib/utils |
| src/components/ui/input.tsx | web-presentation-primitive | 776 | react, @/lib/utils |
| src/components/ui/label.tsx | web-presentation-primitive | 716 | react, @radix-ui/react-label, class-variance-authority, @/lib/utils |
| src/components/ui/menubar.tsx | web-presentation-primitive | 8515 | react, @radix-ui/react-menubar, lucide-react, @/lib/utils |
| src/components/ui/navigation-menu.tsx | web-presentation-primitive | 5152 | react, @radix-ui/react-navigation-menu, class-variance-authority, lucide-react, @/lib/utils |
| src/components/ui/pagination.tsx | web-presentation-primitive | 2739 | react, lucide-react, @/lib/utils, @/components/ui/button |
| src/components/ui/popover.tsx | web-presentation-primitive | 1352 | react, @radix-ui/react-popover, @/lib/utils |
| src/components/ui/progress.tsx | web-presentation-primitive | 781 | react, @radix-ui/react-progress, @/lib/utils |
| src/components/ui/radio-group.tsx | web-presentation-primitive | 1405 | react, @radix-ui/react-radio-group, lucide-react, @/lib/utils |
| src/components/ui/resizable.tsx | web-presentation-primitive | 1552 | lucide-react, react-resizable-panels, @/lib/utils |
| src/components/ui/scroll-area.tsx | web-presentation-primitive | 1635 | react, @radix-ui/react-scroll-area, @/lib/utils |
| src/components/ui/select.tsx | web-presentation-primitive | 5749 | react, @radix-ui/react-select, lucide-react, @/lib/utils |
| src/components/ui/separator.tsx | web-presentation-primitive | 723 | react, @radix-ui/react-separator, @/lib/utils |
| src/components/ui/sheet.tsx | web-presentation-primitive | 4248 | react, @radix-ui/react-dialog, class-variance-authority, lucide-react, @/lib/utils |
| src/components/ui/sidebar.tsx | web-presentation-primitive | 23975 | react, @radix-ui/react-slot, class-variance-authority, lucide-react, @/hooks/use-mobile, @/lib/utils, @/components/ui/button, @/components/ui/input, @/components/ui/separator, @/components/ui/sheet, @/components/ui/skeleton, @/components/ui/tooltip |
| src/components/ui/skeleton.tsx | web-presentation-primitive | 239 | @/lib/utils |
| src/components/ui/slider.tsx | web-presentation-primitive | 1025 | react, @radix-ui/react-slider, @/lib/utils |
| src/components/ui/sonner.tsx | web-presentation-primitive | 734 | sonner |
| src/components/ui/switch.tsx | web-presentation-primitive | 1156 | react, @radix-ui/react-switch, @/lib/utils |
| src/components/ui/table.tsx | web-presentation-primitive | 2820 | react, @/lib/utils |
| src/components/ui/tabs.tsx | web-presentation-primitive | 1934 | react, @radix-ui/react-tabs, @/lib/utils |
| src/components/ui/textarea.tsx | web-presentation-primitive | 677 | react, @/lib/utils |
| src/components/ui/toggle-group.tsx | web-presentation-primitive | 1752 | react, @radix-ui/react-toggle-group, class-variance-authority, @/lib/utils, @/components/ui/toggle |
| src/components/ui/toggle.tsx | web-presentation-primitive | 1534 | react, @radix-ui/react-toggle, class-variance-authority, @/lib/utils |
| src/components/ui/tooltip.tsx | web-presentation-primitive | 1278 | react, @radix-ui/react-tooltip, @/lib/utils |
| src/components/WhyNagpurConnect.tsx | mixed-presentation-and-orchestration | 2722 | react, lucide-react |
| src/context/AuthContext.tsx | protected-logic | 13338 | react, ../supabaseClient, @supabase/supabase-js, ../services/profileService, ../services/dbTypes |
| src/data/bus_fares.json | protected-data-or-workflow | 12925329 |  |
| src/data/bus_schedules.json | protected-data-or-workflow | 972074 |  |
| src/data/chalo_routes_index.json | protected-data-or-workflow | 1245976 |  |
| src/data/lineGeometries.json | protected-data-or-workflow | 17982319 |  |
| src/data/metro_fares.json | protected-data-or-workflow | 345042 |  |
| src/data/network.json | protected-data-or-workflow | 8573015 |  |
| src/hooks/use-mobile.tsx | configuration-or-asset | 576 | react |
| src/lib/busTimetableService.ts | protected-logic | 14228 | @/data/bus_schedules.json, @/data/network.json |
| src/lib/error-capture.ts | protected-logic | 2207 |  |
| src/lib/error-page.ts | protected-logic | 1371 |  |
| src/lib/fares.ts | protected-logic | 13907 | @/data/bus_fares.json, @/data/metro_fares.json |
| src/lib/frequencies.ts | protected-logic | 1288 |  |
| src/lib/liveBus.ts | protected-logic | 21055 | @/data/chalo_routes_index.json |
| src/lib/n8nAiService.ts | protected-logic | 72029 | ./routing, ./fares, ./placesSearch, @/data/bus_schedules.json, ./busTimetableService, ) ||
    lower.includes( |
| src/lib/nagpurPlaces.ts | protected-logic | 45030 |  |
| src/lib/nearby.ts | protected-logic | 3064 | @/lib/network, @/lib/routing |
| src/lib/network.ts | protected-logic | 7368 | @/data/network.json, @/data/bus_schedules.json, ./frequencies |
| src/lib/ors.ts | protected-logic | 9983 |  |
| src/lib/placesSearch.ts | protected-logic | 22685 | @/lib/routing, @/lib/nagpurPlaces |
| src/lib/routing.ts | protected-logic | 55698 | @/data/lineGeometries.json, ./network, ./ors, ./fares |
| src/lib/supabase-schema.sql | protected-data-or-workflow | 7317 |  |
| src/lib/ticketExporter.ts | protected-logic | 3068 | html-to-image, jspdf, ./ticketing |
| src/lib/ticketing.ts | protected-logic | 29084 | ./fares, @/data/chalo_routes_index.json |
| src/lib/uberApi.ts | protected-logic | 27303 |  |
| src/lib/utils.ts | protected-logic | 169 | clsx, tailwind-merge |
| src/lib/wavRecorder.ts | protected-logic | 5335 |  |
| src/router.tsx | configuration-or-asset | 394 | @tanstack/react-query, @tanstack/react-router, ./routeTree.gen |
| src/routes/app.tsx | mixed-presentation-and-orchestration | 166952 | ../components/ProtectedRoute, @tanstack/react-router, ../context/AuthContext, react, @/components/PlaceSearch, @/components/ui/button, lucide-react, @/components/TicketBookingModal, @/components/TicketWalletDrawer, @/lib/ticketing, @/services/savedJourneysService, @/services/recentJourneysService, @/services/ecoRewardsService, @/services/ticketService, @/lib/routing, @/lib/nearby, @/lib/nagpurPlaces, @/components/LiveBusTracker, @/components/CabOptions, @/components/SideRouteAiExplainer, @/components/AiTransitChatbot, @/components/BusTimetablePanel, @/components/GoogleMapsSearchBar, @/components/GoogleMapsLayersFAB, @/components/MaterialTimePicker, @/components/GreenRewardsPanel, @/lib/uberApi, @/lib/liveBus, @/lib/n8nAiService, @/lib/placesSearch |
| src/routes/forgot-password.tsx | mixed-presentation-and-orchestration | 6421 | react, @tanstack/react-router, lucide-react, ../context/AuthContext |
| src/routes/index.tsx | mixed-presentation-and-orchestration | 4252 | react, @tanstack/react-router, ../components/Navbar, ../components/Hero, ../components/WhyNagpurConnect, ../components/HowItWorks, lucide-react |
| src/routes/login.tsx | mixed-presentation-and-orchestration | 16723 | react, @tanstack/react-router, lucide-react, ../context/AuthContext, zod |
| src/routes/signup.tsx | mixed-presentation-and-orchestration | 33311 | react, @tanstack/react-router, lucide-react, ../context/AuthContext |
| src/routes/update-password.tsx | mixed-presentation-and-orchestration | 10184 | react, @tanstack/react-router, lucide-react, ../context/AuthContext |
| src/routes/__root.tsx | mixed-presentation-and-orchestration | 4148 | ../context/AuthContext, @tanstack/react-query, @tanstack/react-router, react, ../styles.css?url, ../lib/lovable-error-reporting |
| src/routeTree.gen.ts | configuration-or-asset | 5038 | ./routes/__root, ./routes/index, ./routes/app, ./routes/forgot-password, ./routes/login, ./routes/signup, ./routes/update-password, ./router.tsx, ./start.ts |
| src/server.ts | configuration-or-asset | 1892 | ./lib/error-capture, ./lib/error-page |
| src/services/dbTypes.ts | protected-logic | 1228 | ../components/PlaceSearch, ../lib/ticketing |
| src/services/ecoRewardsService.ts | protected-logic | 4015 | ../supabaseClient, ./dbTypes |
| src/services/emailService.ts | protected-logic | 18867 | qrcode, sonner, ../supabaseClient, ../lib/ticketing |
| src/services/profileService.ts | protected-logic | 2275 | ../supabaseClient, ./dbTypes |
| src/services/recentJourneysService.ts | protected-logic | 3678 | ../supabaseClient, ../components/PlaceSearch |
| src/services/savedJourneysService.ts | protected-logic | 5244 | ../supabaseClient, ./dbTypes, ../routes/app |
| src/services/ticketService.ts | protected-logic | 5256 | ../supabaseClient, ../lib/ticketing |
| src/start.ts | configuration-or-asset | 759 | @tanstack/react-start, ./lib/error-page |
| src/styles.css | configuration-or-asset | 9544 |  |
| src/supabaseClient.ts | protected-logic | 546 | @supabase/supabase-js |
| tsconfig.json | configuration-or-asset | 820 |  |
| vite.config.ts | configuration-or-asset | 7938 | vite, @tailwindcss/vite, @vitejs/plugin-react, @tanstack/react-start/plugin/vite, nitro/vite, node:path, node:fs, node:url |
