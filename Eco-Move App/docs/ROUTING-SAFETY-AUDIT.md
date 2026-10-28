# Routing and Safety Mode reference audit — 29 October 2026

Branch: `New-Changes`; starting HEAD: `8803bbf`. Existing external APK modification is unrelated and preserved. No commit or push authorized.

Reference: `C:/Users/LENOVO/Pictures/lastbarEco/Eco-Move.zip`, SHA256 `ed45b056e2d16261fcd8866f403e8241407c9c74161f6688c9eecb1646123445`. Read-only extraction: `artifacts/reference-20261029/Eco-Move`. Target: this `Eco-Move App` directory.

## Pre-edit comparison

| Area | Finding / decision |
|---|---|
| Bus fares, schedules, route index, line geometry, metro fares, network | All six JSON datasets are semantically identical. Retain existing files. |
| fares.ts, network.ts, busTimetableService.ts, frequencies.ts | Identical after CRLF normalization. Retain exact lookups, reverse fare lookup, metro matrix, station tariff, stop offsets and frequency behavior. |
| routing.ts | Graph search, preferences, timetable calculations, scoring and fares identical. Reference adds <=120 m interchange walking and rejects walking detours >1.7× direct distance; missing geometry becomes a direct-distance estimate. Port these differences with estimate disclosure. |
| Runtime enrichment | Target abandons enrichment after 3.5 seconds, while reference waits for bounded router requests. Remove early race; keep existing RPC timeout and stale-request guards. |
| ors.ts | Reference changes router priority, walk speed conversion, short-distance handling and adds road-preference walking. Adapt without moving private ORS credentials into the browser; retain existing server proxy. Version the walking cache to exclude stale pre-migration metrics. |
| Safety engine | Missing from target. Reuse reference graph search, operating windows, metro preference, route geometry and fallback calculations. Source has heuristic scores, not measured safety. Do not display safety percentages or invented fallback anchors as verified facts. |
| Safety fares / duration | Reference uses fixed ₹20 metro / ₹16 bus estimates and distance/speed ride durations, even where standard routing uses fares/schedules. Preserve these Safety Mode estimates explicitly; do not substitute them into standard routing or ticket pricing. |
| Safety timestamps | Reference writes trip departure into every transit leg and enrichment can move the timeline backwards. Preserve route choices, waits, leg durations and rounded total duration; derive displayed leg timestamps sequentially. This deliberate exception must be reported, not called exact timestamp parity. |
| Ordinary enrichment timeline | Reference retains original transit waits after changing walking durations. Preserve its values for parity; these remain schedule-based estimates, not live arrivals or a fresh timetable search. |
| Fallback departure | Reference ordinary driving fallback ignores requested departure and uses current time. Correct only supplied departure handling; retain distance, cost and duration calculations. Document exception. |
| Map | Existing single Leaflet map retained. Adapt reference cased route colors, transfer dashes, safety palette and static corridor/anchor overlays; retain source/destination interactions and actual geometry. |
| AI/n8n | Keep service unchanged. Pass the same selected journey shown in cards; sanitize misleading safety claims in the journey before it reaches explanations. |

## Acceptance checklist

- [ ] Comparable-input reference regression report (raw and enriched legs, time, distance, fares, transfers, CO₂).
- [ ] Working Safety Mode toggle, recalculation and stale-result protection; restore standard mode.
- [ ] Safety corridor overlays, metadata, palette and estimate disclosures.
- [ ] Bus, metro, transfer, reverse fare, unavailable router and night fallback cases.
- [ ] Type check, regression suite, runtime build, production export and source preservation.
- [ ] Browser verification in both modes, including narrow layout.

Planning policy: deep; dependency context; impact verification; no delegation. All edits restricted to this app. Reuse verified reference services with minimal documented adapters. External service responses and physical-device performance must be reported separately from deterministic fixture tests.

## Verified results

- `node scripts/compare-routing-reference.cjs`: **PASS**, 15 equivalent-input cases. All raw and enriched route metrics and geometry hashes match; standard timestamps match. Coverage includes six preferences, bus routes, metro, bus+metro, transfers, exact reverse bus fares, unavailable services and late-night driving. Detailed leg-by-leg inputs/results: `tests/fixtures/reference-routing.json` (generated from the ZIP, never hand-authored fares).
- Safety timestamp corrections were observed in `safe-metro` and `safe-short-walk`; numeric duration parity is retained. These cases are explicitly not timestamp-identical to the buggy reference. Static safety scores and fallback anchor claims are not displayed as verified safety evidence.
- Full suite at routing checkpoint: **123 passed, 0 failed**. Type check, runtime build, web production export and original-source checks passed. Later voice work has its own validation record.
- Browser at 390×844: Sitabuldi Interchange → Dr. Babasaheb Ambedkar Airport, 08:30; standard mode returned three routes. Safety Mode recalculated to one 16-minute/₹20 estimated metro route, displayed corridors/anchors and safety notice. Turning it off restored three standard routes and removed safety overlays. Screenshot: `artifacts/safety-mode-390.jpg`.
- Runtime HTML grew from 14,322,968 to approximately 14.48 MB (exact current size recorded in verification JSON). Existing map instance, auth, environment and datasets retained. The extra dataset is 22 corridors / 77 support anchors.
- Boundaries: deterministic parity tests simulate router unavailability; external routing geometry can change or fail. The reference treats some two-point walks as direct-distance estimates and uses fixed safety fares and speed-derived safety durations. This is behavioral parity, not a validation of real-world travel times or personal safety. AI endpoints unchanged; cache now includes fare, timestamps, legs and safety context, with journey facts added to its existing query string.

VERDICT: PASS for the recorded comparisons and browser toggle behavior. Full real-world timing/safety accuracy and exact parity across all possible journeys remain unverified.
