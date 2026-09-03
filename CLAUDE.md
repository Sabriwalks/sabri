# Sabri — Project Memory

AI-powered conversational audio tour guide app. Vanilla JS frontend (`app.js`), Node/Express backend (`server.js`, stateless Vercel serverless — no server-side session, all session state lives client-side in app.js globals). Supabase for persistence. Live at getsabri.com.

## Standing engineering rules (apply to every task, not just when told)

- **Investigate root cause before fixing. Never assume a hypothesis is correct — verify it with direct evidence** (live state tracing, console/network inspection, direct DB queries) before writing a fix. Several past bugs turned out to have a different root cause than the initial hypothesis; the fix is only trustworthy once the real cause is confirmed.
- **Self-review before finalizing:** re-test against the real reported reproduction path, not just the code logic in isolation. Confirm no regression to previously-verified behavior.
- **Report honestly, including what wasn't verifiable** from this environment (real device sensors, real GPS movement, real network latency) vs. what was confirmed live.
- **Get real measured numbers when performance/timing is the complaint** — don't describe a change qualitatively ("should be faster") when a before/after number is obtainable.
- Commit messages must be specific and descriptive of what actually changed, not generic.
- Push to `master` by default after every commit, unless explicitly told to hold off (e.g. "commit only, don't push" or a paste that says so directly). Default is push — the risk of forgetting to push outweighs the risk of an unwanted push, since pushed code still requires a real device test/confirmation before it matters.

## Known recurring bug classes (check these first when debugging something that smells similar)

- **Shared-flag stalls around `checkForNarration`:** multiple distinct bugs have blocked this pipeline via `isConversing`/`isNarrating` — not always the same mechanism, so verify each one directly rather than assuming it matches a prior bug. Confirmed variants so far: (a) a flag genuinely left `true` on an edge-case path (e.g. a decline/skip branch, not just the main "confirm" branch); (b) a flag that clears correctly, but `checkForNarration` only ever runs from the GPS `watchPosition` callback and is gated by a one-shot "just stabilized or moved 15m" check — if that one shot is consumed while the flag was still up, nothing re-drives it for a stationary user afterward (fixed in `hideDestinationPicker` by re-triggering with the last known position once the flag actually clears). When investigating a "stuck"/"frozen"/"never starts" report, trace the actual flag state and call counts live — don't assume it's (a) without checking.
- **CSS specificity beating JS state:** a leftover `hidden` class (with `!important`) once silently overrode a `.is-visible` animation class — the JS state was correct throughout, but the element never rendered. When something "should be visible but isn't," check computed style directly, don't trust the JS state alone.
- **Schema drift between `schema.sql` and production:** production Supabase has silently missed columns/tables defined in `schema.sql` more than once (a whole table missing; a `gender` column missing on `guide_personas`, which caused every persona cache-check to silently miss and pay for full regeneration on every request). When something is mysteriously slow or a cache never seems to hit, check the production schema directly against `schema.sql` rather than assuming they match. There's no migration runner — schema changes have to be applied by hand in the Supabase SQL editor.
- **PWA/service-worker update propagation:** update-detection has needed more than one round of fixing, and has silently failed in the field even after passing sandbox testing — don't trust a fix here without a real-device diagnostic. Current mechanism: a periodic `registration.update()` check while the tab stays visible, not just on visibility-transition (`checkForUpdateAndMaybeApply` / `UPDATE_CHECK_INTERVAL_MS` in app.js). A visible-marker diagnostic (temporary boot-screen color change, same throwaway pattern used before) is currently deployed to get a definitive real-device answer on whether this actually works — check whether it's still live (`.app-boot-loading` in style.css, marked "REVERT AFTER CONFIRMING") and whether a result has come back before assuming this mechanism works or touching it again.

## Architecture landmarks

- GPS/narration state machine: `onLocation` → `checkForNarration` → `runNeighborhoodOrientation` / `runSpecificZoomIn` / `checkGuidedTourProgress` → `narrateAndSpeak`
- Two tour modes: Wander (no fixed route) vs. Guided Tour Mode (curated multi-stop `plannedTour`, client-side ephemeral state, not DB-persisted)
- Place names are always resolved to real coordinates via a dedicated resolution pipeline (`findPlaceForQuery` in server.js, wrapping Google's Places `findplacefromtext`) — never trust raw Claude-generated coordinates directly
- TTS provider is swappable via `TTS_PROVIDER` env var (Inworld active by default, OpenAI kept as an intact fallback implementation)
- New major features ship behind their own **permanent** env flag (not temporary staging), default off in code. Rollback is fast — a Vercel env-var flip, no code revert — but per Vercel's own docs, env var changes only apply to new deployments, not instantly without a redeploy. This is the established pattern, follow it for anything pillar-sized.

## Current feature flags

- `ENABLE_GUIDED_DESTINATION` — opt-in destination guidance layered on Wander mode
- `ENABLE_RELATIONSHIP_CONTINUITY` — region-scoped memory across repeat visits
- `ENABLE_NEEDS_ROUTING` — hunger/weather-aware detour suggestions
- `ENABLE_PROACTIVE_DEPTH` — dwell/pause-triggered proactive narration depth

Verify actual values in Vercel before assuming — these change during active testing. As of 2026-09-03 (checked directly via `vercel env pull`, not assumed): Guided Destination and Relationship Continuity are `true`; Needs Routing and Proactive Depth are `false`.

## Maintaining this file

This file should stay under ~200 lines — longer files consume more context and reduce how reliably instructions get followed. If an edit would push this file close to or over that limit, don't just keep appending: split the newest or least-central section out into a topic-specific file under `.claude/rules/` (e.g. `.claude/rules/known-bug-classes.md`, `.claude/rules/architecture.md`), and leave a one-line pointer here instead of the full content. Keep in this top-level file only what needs to be in context every single session — standing engineering rules and anything currently active/urgent; move stable reference material (architecture landmarks, resolved bug-class writeups) into `.claude/rules/` first when trimming is needed.

## Product context worth knowing

- Solo founder (Aharon), building toward an App Store launch as the gate before any investor/influencer outreach begins
- Go-to-market is direct-to-consumer: App Store launch → organic push through personal network → travel influencer outreach (non-paid asks to try it first) → VC/angel fundraising once real usage traction exists
- Beta testers are real people on real devices — bug reports come from genuine field use, not synthetic testing, so real device constraints (GPS jitter patterns, iOS permission prompts, real network latency) are frequently the actual differentiator between "works in sandbox" and "works for real"
