# Sabri — Architecture Decisions

A living log of real architecture/technical decisions and the reasoning behind them — not current state (see `CLAUDE.md` for that). Any paste with a real architecture/technical decision gets a new entry here, the same way `CLAUDE.md` gets updated for standing rules and current state.

Each entry: the decision, the real reasoning, the alternative(s) it was chosen over, and a commit reference where one exists. Confirmed-fact only — entries were checked against actual git history/code when this file was seeded (2026-09-10), not copied verbatim from a draft.

---

## TTS / Audio

**TTS provider: Inworld over OpenAI.** Switched Inworld in as the active provider, with OpenAI kept fully intact behind `TTS_PROVIDER` env var (`server.js`) as a switchable fallback — confirmed still switchable both directions today, `speakWithOpenAI` untouched. Commit `119a5c0` ("Add Inworld TTS as active provider with OpenAI kept as switchable fallback"). Note: the "~20x lower cost than ElevenLabs, higher blind-test quality than both" figures don't appear in the commit message or any code comment — recorded here as Aharon's recollection, not independently code-verified.

**Speed control is fully client-side, deliberately provider-agnostic.** Narration speed applied via `audioPlayer.playbackRate` at playback time (`app.js`), never sent to any TTS provider — specifically so it can never compound with a server-side rate (a server-side 1.25x plus a client-side 1.25x would silently play at 1.5625x). Provider-agnostic by construction. Commit `7390278`.

**Streaming/playback architecture: SSE + parallel per-sentence `/api/speak`, not a TTS streaming endpoint.** `/api/narrate` and `/api/ask` stream via SSE; each sentence gets its own `/api/speak` call fired the moment it arrives, queued for gapless playback (`driveTtsQueue` in `app.js`); `interruptPlayback()` clears the queue on question-interrupt. Confirmed architecture. The specific claim that per-sentence REST was chosen over a streaming TTS endpoint *because* `normalizeWavLoudness` needs the full audio buffer is plausible (normalization does require the complete sample buffer) but isn't stated in any commit message or comment — recorded as the working rationale, not a documented decision.

**RMS-based loudness normalization over peak-based.** Peak-only normalization (bounding just the loudest sample) was measured to actively *widen* perceived-loudness variance rather than fix it — replaced with RMS-targeting (`WAV_TARGET_RMS = 3800`, `WAV_PEAK_CEILING = 30000` as a safety cap, `server.js`). Real measured numbers, not assumption: in-code comment cites peak varying ~5dB clip-to-clip vs. RMS ~1.1dB, with peak-targeting widening RMS spread to ~4dB (worse than no normalization). Original peak-only version shipped in `d303e56`; replaced in `862878d`.

**Arabic locked to Modern Standard Arabic, not regional dialect.** Explicit instruction added after live testing showed "write as a native speaker would" alone drifted unprompted into Egyptian colloquial Arabic. MSA chosen as broadly understood across Arabic-speaking regions for a general-audience app (code comment notes this is "a judgment call, not a proven-correct answer" — TTS voice's actual accent tuning was never confirmed). Commit `383edc4`.

**Pronunciation approach evolution (three real stages).** (1) Hyphenated-respelling baked directly into visible/spoken narration text via `HEBREW_PRONUNCIATION_GUIDE` — shipped `596b44a`, generalized from Hebrew-only to all 6 languages in `24468eb`. Flawed: literal "spelled-out" text shown on screen, and only a partial pronunciation fix. (2) Inline-IPA phoneme syntax — tested and sent for real-audio review (see `862878d`'s investigation notes) but never shipped as a prompt/code change. (3) Script-based native-text cross-lingual synthesis via `inworld-tts-2` — real Hebrew/foreign script written naturally in the text, the model pronounces it correctly on its own. **Shipped** (this entry, 2026-09-10): `buildPronunciationGuidance` now instructs the opposite of stage (1) — write terms naturally, never phonetically — and `INWORLD_TTS_MODEL` defaults to `inworld-tts-2`. Confirmed via real audio: short isolated pronunciation clips, a full narration-length side-by-side, and a live end-to-end test through the real `/api/ask` → `/api/speak` pipeline with no fake phonetic spellings generated.

**Empirical testing over assumption for language-quality fixes.** Reported: Hebrew niqud and Russian stress-marks were both tested via real round-trip Whisper transcription and *not* shipped because the data showed no clear benefit (niqud measurably made transcription worse). Could not independently verify via git history — a rejected experimental change naturally leaves no shipped code artifact, so the absence of a commit isn't itself contradicting evidence, but this entry is Aharon's reported account, not code-confirmed. Establishes the precedent that "sounds like it should help" isn't sufficient to ship a language-quality change.

---

## Maps / Location / Sensors

**Vector map rendering (Map ID) over raster + CSS-transform rotation.** The marker rewrite to `AdvancedMarkerElement` was required either way — legacy `Marker.setIcon()` was being called on every GPS tick, forcing a full image swap each time (real cost problem noted in `5d3f9d2`, independent of the vector/raster choice). Given that rewrite was happening regardless, the real tradeoff was vector's one-time Cloud Console style-migration cost vs. raster's permanent, structurally unfixable label/attribution rotation (raster's CSS `#map` rotation rotates every DOM descendant, including marker labels). Raster + CSS-transform kept only as an automatic fallback for non-WebGL devices. Commit `42f9baf`.

**Compass permission flow ("Option B").** Request device-heading permission once the user's own marker first renders in Wander mode — not on the mode-button tap, not behind a separate icon — reusing Guided Destination's exact permission mechanism and one-shot guard (`compassPermissionRequested`) rather than building a second pattern. Decline never blocks the feature; falls back to GPS-course heading. Commit `42f9baf`.

**Native app: Capacitor wrapping the existing web codebase, not a separate native rewrite.** Geolocation and speech recognition are runtime-detected and plugin-swapped (`isCapacitorNative()` in `app.js`); service worker conditionally disabled natively. `CAPACITOR_NOTES.md` at repo root documents an API-by-API audit, including at least one deliberate rejection (`@capacitor/camera` not adopted, to preserve the existing live-viewfinder UX). Scaffolded in `9880d30`, extended in `bc138c1`/`945b76e`.

**Marker rendering position is decoupled from narration-trigger position.** `onLocation`'s raw `latitude`/`longitude` feed two independent consumers: the marker's smoothed, minimum-movement-gated visual position, and `checkForNarration`'s raw, un-smoothed trigger logic. The two pipelines share only the raw GPS fix — smoothing the visual layer can't desync the logic layer. Confirmed in current `app.js`.

**Narration movement-gate exceptions are scoped narrowly, never restructure the whole gate.** The base one-shot movement/stabilization gate is untouched by either exception. Stationary-user 30-second forced narration (`forceFirstNarrationIfNeeded`, commit `a45dafa`) explicitly does not call `checkForNarration` itself, mirroring only its oriented-narration branch. Photo-triggered one-time bypass (commit `8ff75e7`) explicitly cross-references the same "deliberate one-time bypass" principle rather than introducing a new mechanism.

**Native speech-recognition abstraction (`SabriSpeechRecognition`/`createChatMicController`) over raw Web Speech API.** *(found in git history, not in the seed list)* iOS Safari/WKWebView has little-to-no support for the Web Speech recognition API — built a wrapper around `@capacitor-community/speech-recognition` behind the same runtime-detection pattern as geolocation (`bc138c1`), then consolidated onboarding-chat and planner-chat mic buttons onto one shared `createChatMicController()` helper (`945b76e`) after real beta testing found bugs from multiple flows silently overwriting each other's handlers on one shared raw recognition object.

**Google Sign-In: redirect mode over popup, on iOS Safari specifically.** *(found in git history)* iOS Safari blocks popups not opened synchronously from a click; switched to full-page redirect (`skipBrowserRedirect: false` via Supabase) with a dedicated OAuth-return draft-recovery flow. Commit `2108c5a`.

**Fixed-delay AirPods route-recovery workaround.** *(found in git history)* iOS has no web-exposed API to control `AVAudioSession` categories, so `SpeechRecognition` grabbing the mic tears down the AirPods playback route. Fixed with a measured `AIRPODS_ROUTE_RECOVERY_MS = 500` sleep before resuming playback, rather than trying to detect route re-establishment (no API exists to detect it). Commit `e84a11e`.

---

## Pillars / Feature Architecture

**3-pillar architecture uses permanent env flags, not temporary staging.** `ENABLE_PROACTIVE_DEPTH`, `ENABLE_RELATIONSHIP_CONTINUITY`, `ENABLE_NEEDS_ROUTING` (plus `ENABLE_GUIDED_DESTINATION` from the same pattern). Flags stay permanent post-launch since these pillars need ongoing tuning — fast rollback via a Vercel env-var flip, no code revert. Each pillar's logic has its own error isolation (try/catch with "must never interrupt or block core narration" comments; Pillar 2's region-memory extraction uses an isolated no-op `.catch`). Correction to the "never inserted into existing functions" framing: Pillar 2's `ensureRegionMemoryForCity` is one added line inside the existing `narrateAndSpeak`, not purely called alongside it — a minor exception, not a violation of the pattern's intent. Commits `8e22055` (pillars), `5f0a616` (Guided Destination).

**Needs-routing (Pillar 3) uses two different mechanisms by mode.** Guided Tour Mode gets true waypoint insertion — splicing into `plannedTour.stops`, picked up automatically by existing progress-tracking (`insertGuidedTourDetour`). Wander Mode has no fixed route to insert into, so it surfaces the suggestion as a map marker instead (`insertWanderDetour`). A deliberate architectural split, confirmed in `app.js`.

**Voice-first consent reuses existing infrastructure; buttons never removed.** Pillar 3's yes/no and food-type consent flows reuse the same `createChatMicController` abstraction already used by onboarding/planner chat, not a new speech path. Buttons remain wired as a permanent fallback. Ambiguous voice responses always fall back to buttons via `showNeedsSuggestionVoiceUnclear()` rather than the system guessing. Confirmed in `app.js`.

**Structured-output classification pattern for interpreting free speech — partially applied.** `/api/infer-interests` and `/api/interpret-needs-response` both use genuine structured Claude JSON-schema output (the latter's own comment explicitly says it reuses the former's pattern). Correction: `/api/find-meal-options` does **not** follow this pattern — it makes no Claude call at all, scoring Google Places results with a heuristic (substring/keyword matching, a `/date|nice|sit.?down|upscale/` regex). This is a real inconsistency with the stated pattern, not a documentation gap — worth a conscious decision on whether `/api/find-meal-options` should be converted or is fine as heuristic-only.

**Relationship continuity (Pillar 2) scoped by city.** Deliberately not single-session-only nor unlimited cross-trip. `region_memory` table's `region_key` is populated with the city value — chosen because city is the one geographic tier the codebase already uses consistently elsewhere (`interaction_events.city`, `walk_sessions.city`); no established neighborhood-tier concept exists to reuse instead. Confirmed in `schema.sql`, near-verbatim match to the schema's own comment.

**Photo/image source hierarchy, not a single fallback rule.** (1) Photo-triggered narration always uses the user's own captured photo, never substituted (`applyHomePhoto`, comment: "never a Places substitute"). (2) Q&A uses a generic neighborhood photo (`applyPlacePhotoWithFallback(null, ...)`). (3) Geographic narration about a specific place uses a topic-specific photo, falling back to generic neighborhood — comment explicitly: "never an unrelated nearby business substituted in." All three confirmed in `app.js`.

**Guide personas: 4 archetypes, per-city, gender-matched, one-time self-introduction.** `GUIDE_ARCHETYPES` (historian, local_friend, storyteller, wanderer) generated per-city via Claude, cached in `guide_personas`. Gender-matched voice↔name pairing self-heals on a stored `gender` mismatch (added after a real field report of a "Miriam" persona narrating with a male voice). Self-introduction tracked via `user_persona_introductions` for signed-in users, `localStorage` for guests. Correction: the dedup key is `user + city + archetype + language`, not just `user + city + archetype` — language is deliberately part of the cache key so meeting a persona in one language doesn't satisfy the "already met" check in another. Commits `507dc04` (original system), `f023543` (self-introduction).

**Popular-place narration caching requires human review.** `canonical_narrations` uses a `pending`/`approved`/`rejected` review queue, never auto-promotion. Personalized-wrapper approach: cached narration is adapted to the current listener, not served verbatim. Threshold confirmed exactly: `POPULARITY_THRESHOLD_USERS = 7`, `POPULARITY_WINDOW_DAYS = 30` (literal constants in `server.js`). Commits `d303e56` (original caching), `8e22055` (pillar-era touches).

---

## Database / Navigation Grounding

**Never trust raw Claude-generated coordinates for real navigation.** Claude-suggested stops/places always get resolved against real Google Places/Geocoding data (`findPlaceForQuery`, wrapping `findplacefromtext`) before being used as actual navigation coordinates. Confirmed at all 3 call sites in `server.js`, each with an explicit "never trust an LLM to invent lat/lng itself" comment.

---

## Permissions / Trust

**Sign-in trust resolution: `getAuthoritativeProfile()` — Supabase always wins.** Resolves a real trust-conflict bug class: (1) OAuth sign-in trusting a local "onboarded" flag and silently re-onboarding/overwriting a returning user's real profile, (2) sign-out not clearing local identity keys, leaking one user's cached profile to the next person on a shared device. One consolidating fix, no regressions/modifications since. Commit `516acce`.

---

## Engineering Practices (standing, not commit-tied)

**Investigate root cause before fixing; escalate on surprise.** Root-cause investigation required before implementing a fix; if investigation surfaces something bigger/different than the original ask, stop and report back rather than scope-creep unilaterally. Directly motivated by real incidents: PWA auto-update passing sandbox testing then failing for real testers twice; an original wrong GPS-hang hypothesis; a magenta CSS diagnostic reverted with no recorded outcome.

**Self-review before finalizing; escalate on surprise; this is the default for real bugs, not cosmetic/self-contained changes.** Re-test against the real reported reproduction path, not just code logic in isolation. Confirm no regression to previously-verified behavior.

**CLAUDE.md + Claude Code auto-memory as the standing session-continuity mechanism.** Established specifically so a fresh Claude Code session can onboard accurately without re-deriving project state — directly motivated by problems caused by one session running continuously across an entire multi-week debugging arc.

**Parallel investigation subagents as standard practice, not ad hoc.** Used deliberately for any paste with multiple independent investigation threads — decided per-paste by Claude, not something Aharon has to remember to request.

**Test new language pairs with real audio before trusting docs.** Before adding any new narration language beyond the current en/he/ar/es/fr/ru, generate real test audio for that specific pair and get Aharon's ear on it first, rather than trusting a TTS provider's documented coverage claims alone.

---

## Also found in git history (not in the original seed list)

**Deleted `/api/interest-places` in favor of `/api/map-pins`.** The old endpoint's hardcoded interest-label→Google-Places-type map used the overly broad `point_of_interest` type with no downstream filtering, letting hotels and noise through. `/api/map-pins` already had a Claude relevance pass scoring `relevanceTier` — "a strictly better signal than a hardcoded type list" (code comment). Commit `68c734c`.

**Original three-tier location/narration model (ancestor decision).** `neighborhood` vs. `specific` tier, `TIER_GUIDANCE` prompts, pacing cooldown — the likely origin of the current `checkForNarration` → `runNeighborhoodOrientation`/`runSpecificZoomIn` state machine documented in `CLAUDE.md`. Predates and was substantially reworked by later commits; noted here as pre-history, not verbatim-current. Commit `5ebc425`.

---

## Pending Part 2 addendum (2026-09-10)

**Inworld TTS-2 model switch — fast-rollback pattern.** `INWORLD_TTS_MODEL` env var (`server.js`), defaults to `"inworld-tts-2"`, mirrors `TTS_PROVIDER`'s rollback pattern exactly — flipping it back to `"inworld-tts-1.5-max"` is the entire rollback path if a real-world issue turns up. Shipped after a full parity check (parameters, WAV format, latency, voice catalog, GA status) found no blockers, and real audio confirmation (short clips + full narration-length comparison) on quality. See the "Pronunciation approach evolution" entry above for the full arc this completes.
