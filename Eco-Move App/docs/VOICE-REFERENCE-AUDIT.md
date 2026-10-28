# ZIP voice integration — 29 October 2026

Same ZIP and SHA256 as `ROUTING-SAFETY-AUDIT.md`; no second extraction or replacement of the app. Branch `New-Changes`. Preserve all preceding uncommitted routing work. New scope: voice integration and neutral-grey depth in light navigation/cards only.

## Verified implementation differences

- Reference `GoogleMapsSearchBar.tsx` uses browser `SpeechRecognition` / `webkitSpeechRecognition`, continuous interim input, navigator language and browser speech synthesis. It sends **text**, not audio, to `onAiCommand`.
- Reference `n8nAiService.ts` uses `PARSE_NATURAL_LANGUAGE_COMMAND`, `query`, `userLocation`, `fallbackIntent`. Structured results contain intent, origin/destination, preference, departureTime and replyMessage/message. Its default execution guard disables n8n. Retain the target's already active workflow and validated transport rather than porting that guard.
- Current target has cancellation, timeouts, explicit multilingual endpoint grammar, transcript alternatives and dataset-based station matching. Retain these stronger safeguards. Reference browser APIs cannot be copied into Expo Go.
- No audio transcription endpoint exists in the inspected ZIP/current environment conventions. User explicitly authorized keyboard text fallback in Expo Go. Do not add fake recording or unsupported audio payloads.
- Installed dependency `expo-speech-recognition` 3.1.3 is tagged for SDK 54/55. Target Expo is SDK 58. Registry and maintainer documentation identify 58.0.0 as current; use the matching SDK 58 package, preserving plugin permissions and optional-native-module loading.
- `applyVoiceIntent` currently overwrites existing endpoints after matching. Require explicit replacement confirmation; cancellation or manual edits during an outstanding request must preserve the trip.
- Ambiguous places must be selected from actual service results; no inferred coordinates or automatic first-result choice.

## Compatibility sources

- https://docs.expo.dev/workflow/customizing/ — Expo Go cannot add custom native modules.
- https://github.com/jamsch/expo-speech-recognition — SDK-specific releases, config plugin and development-build requirement.
- https://docs.expo.dev/versions/latest/sdk/audio/ — Expo Go recording is available, but recording alone does not transcribe speech.

## Validation pending

Record code tests, live text-contract probes, build/export and UI results separately. No physical-device microphone result may be inferred from a text probe. Native dependency changes require a rebuilt development/production app; SDK 57 Expo Go cannot run this SDK 58 project.
