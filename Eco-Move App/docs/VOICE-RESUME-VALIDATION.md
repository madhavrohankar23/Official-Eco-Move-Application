# Voice continuation — 27 October 2026

Work continues in `Eco-Move App` on `New-Changes`. The latest user instruction overrides the earlier migration push request: **do not commit or push**. No commit or push has been performed. Earlier migration changes are preserved. Generated-file index removals staged during the preceding migration cleanup were unstaged; no working files were deleted.

## Confirmed issues and targeted changes

- SafarBot typed route commands used `CHATBOT_QUERY`, unlike the working speech `PARSE_NATURAL_LANGUAGE_COMMAND` path. A real Marathi browser request returned a generic answer. Explicit two-endpoint typed routes now use the existing `VoiceSession.submit`, n8n transport, station resolver and `applyVoiceIntent`; general chat is retained. Browser verification subsequently filled Sitabuldi (Interchange) → Airport Metro Station and returned real metro/bus alternatives, including the 22-minute ₹20 metro journey.
- A final recognized transcript left the recognizer active during the network request. `VoiceSession.dispatch` now changes to `thinking` and aborts recognition before sending the request. Abort/end callbacks cannot cancel the accepted transcript. A regression test exercises synchronous recognizer callbacks and delayed network completion.
- Collapsing/backgrounding SafarBot now cancels typed voice-command work as well as microphone work. Existing generation guards, unmount cleanup, timeout handling, account boundaries and retry paths remain intact.
- `voiceOutput.ts` owns spoken-output cancellation, pending stop operations and stale completion callbacks. English response text uses an English voice; Hindi/Marathi text respects the selected language. Engine failure retains the text and shows an actionable notice. General answers obtained through actual speech are spoken automatically; route/action commands continue through their existing navigation handlers. Listen/Stop remains available for chat answers.
- Existing route-preview instructions now have a Read this step action and a Stop spoken instruction control. Collapsing, leaving or backgrounding stops speech. **This is a geometry-based route preview, not location-tracked turn-by-turn GPS navigation.** No unsupported navigation capability was invented.
- During the migration UI review, switching Satellite → CARTO and then tracking a bus exposed a Leaflet `null.project` crash. Removing all tile listeners before `remove()` had discarded Leaflet's own subscription cleanup. The removal order was corrected and the failing browser sequence and lifecycle tests passed.

## Actual evidence so far

| Check | Result |
| --- | --- |
| TypeScript | Passed after voice changes (`artifacts/voice-resume-typecheck.log`). |
| Full regression suite | 93 passed, 0 failed (`artifacts/voice-resume-full-tests.log`). |
| Final speech cleanup tests | 15 passed, 0 failed after the last hook cleanup (`artifacts/voice-resume-final-targeted.log`). |
| New speech/preview lint | 0 errors, 0 warnings after cleanup (`artifacts/voice-output-lint.json`). |
| Live n8n transcript/action requests | 5/5 passed: English, Hindi, Marathi, mixed Hindi/English and mixed Marathi/English (`artifacts/voice-resume-n8n.log`, `artifacts/multilingual-live-validation.json`). |
| Browser Marathi command | Real request, resolved original station coordinates, selected Plan tab and displayed actual route options (`artifacts/voice-marathi-route-proof.png`). |
| Original preservation | 140 original files plus the explicit original `.env` checkpoint passed; all 164 audited V-source files unchanged; protected mobile changes match the 10-entry migration manifest. |

Tests cover microphone permission denial, missing recognition support, silence/end without speech, low-confidence transcript review, cancellation while permission or network requests are pending, HTTP failure, invalid JSON/action, empty response, timeout, repeated request IDs, mixed-language route extraction, all 37 metro station aliases, ambiguous places and late navigation results. These failure cases use controlled test adapters; they are not claims of physical microphone tests.

Environment values were reconciled without printing or overwriting them. Production n8n configuration remains environment-derived; no credential is hardcoded. The voice request timeout is 25 seconds; cancellation aborts transport. Offline/invalid workflow responses show an error and preserve manual search rather than fabricating a successful AI answer. Public station queries only were used in live probes.

## Build checkpoint / exact next step

The final all-platform Expo export is running with one Metro worker, followed by the existing Java 17 Android build and APK verification. Inspect `artifacts/voice-resume-export.log` and `artifacts/voice-resume-android.log`; do not present the preceding APK as containing the final voice changes until that build completes.

Next: verify final export startup, Marathi route handoff, instruction speech controls, absence of new runtime errors, final APK contents/signature, source hashes and bundle sizes. Then update this record and `IMPLEMENTATION-AND-VALIDATION.md`. Leave Git uncommitted and do not push.

## Explicit limitations

- No physical iPhone/Android microphone recognition, audible output, language-model installation, sensor gesture or native permission-dialog test has been completed in this continuation. Code tests do not measure speech accuracy.
- The app uses Expo SDK 58 and a custom native speech module. The previously reported Expo Go SDK 57 is incompatible, and Expo Go does not provide this custom speech module. Use a compatible installed development/release build; typed input remains available where speech is unsupported.
- The browser speech API's presence does not guarantee that its external recognition service is available. Permission/service errors remain visible; no universal browser speech support is claimed.
- Chalo was reachable but returned zero vehicles in sampled checks; moving live telemetry was not verified. Authenticated Supabase writes and real ticket payment/delivery were not performed.
- The broader inherited lint configuration still reports legacy formatting issues and an existing `ExplainScreen` dependency warning. New speech and feature modules were checked separately; repository-wide lint is not claimed clean.
- No 120–144 Hz hardware performance, GPS navigation or universal back-tap claim is made.
