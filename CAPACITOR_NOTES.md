# Capacitor native app conversion — audit + status

This is the reference doc pointed to by "See CAPACITOR_NOTES.md" comments
scattered through `app.js`, `server.js`, and `ios/App/App/Info.plist`.

## What exists now

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/geolocation`,
  `@capacitor/browser`, `@capacitor/app`, `@capacitor-community/speech-recognition`
  installed (see `package.json`).
- `capacitor.config.json` — appId `com.getsabri.app`, appName `Sabri`, webDir `www`.
- `ios/` — the native Xcode project scaffold (`npx cap add ios`), committed to
  git (unlike `www/`, this contains real native project state — Info.plist
  permissions, the app icon, plugin manifests — that isn't safely
  regenerable from a script).
- `www/` — **gitignored, regenerated**. This app has no bundler; index.html,
  app.js, style.css, etc. live at the repo root next to `server.js` and
  `.env`. Run `npm run build:capacitor` (copies only the client-safe files
  into `www/`) before `npx cap sync ios` whenever a client file changes.
- `ios/App/App/Info.plist` — camera/microphone/location/speech-recognition
  usage strings, `UIBackgroundModes` (audio + location, for narration
  continuing with the screen locked), and a custom URL scheme
  (`com.getsabri.app://`) for the native Google Sign-In redirect.
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` — the
  new logo at 1024x1024, no alpha channel.
- `branding-source-logo.jpg` — the source illustration, committed so icons
  are regenerable. `scripts/generate-icons.ps1` + `scripts/build-favicon-ico.ps1`
  regenerate the full icon set from it (PowerShell/GDI+, since no
  ImageMagick was available in this environment).

## Browser API → Capacitor audit

| Web API | Works as-is in Capacitor's WKWebView? | What was done |
|---|---|---|
| `getUserMedia` (camera) | **Yes** — WKWebView supports it directly given `NSCameraUsageDescription`. `@capacitor/camera` exists but suits a "take one photo" native-picker flow, not this app's live viewfinder overlay — deliberately NOT swapped in, to preserve the current UX. | Nothing changed; Info.plist permission string added. |
| `navigator.geolocation` | Works, but `@capacitor/geolocation` is the more idiomatic/reliable choice for background behavior in a native app. | **Swapped.** `app.js` now has `geoGetCurrentPosition`/`geoWatchPosition`/`geoClearWatch`/`hasGeolocationSupport` wrappers that call `window.Capacitor.Plugins.Geolocation` when `isCapacitorNative()`, else fall back to the Web API — same file serves both the web PWA and the native app, so this had to be runtime-detected, not build-time-swapped. |
| `SpeechRecognition` / `webkitSpeechRecognition` | **No.** iOS Safari/WKWebView has historically had little-to-no support for the Web Speech *recognition* API (as opposed to speech *synthesis*, which is unrelated and not used here). | **Swapped for the core "Talk to Sabri" flow only.** `@capacitor-community/speech-recognition` installed; `app.js` has a `SabriSpeechRecognition` abstraction (same runtime-detection pattern as geolocation) that `startListening()`/`stopListening()`/`cancelListening()` now go through. The onboarding-chat and planner-chat mic buttons were deliberately left untouched — they still call the raw Web Speech API directly, so they simply won't have working mic input inside the native app until/unless they're converted the same way later. **See "First things to test in Xcode" below — this is unverified on a real device and the single biggest functional risk in the conversion.** |
| `navigator.mediaSession` (lock-screen controls) | Should work — WKWebView on iOS 15+ supports Media Session. | Nothing changed. `UIBackgroundModes: audio` was added to Info.plist since background audio continuation needs that native capability declared regardless of the web API support. |
| `navigator.sendBeacon` | Should work (WebKit-based). | Nothing changed. |
| Service worker / cache-busting-via-version-bump | **Doesn't apply** — the native app bundles its own assets locally and updates via App Store review, not live cache invalidation. Registering a SW there is pure overhead at best, unknown-behavior risk at worst (WebView backgrounding/foregrounding was never tested against it). | **Disabled for native.** `if ("serviceWorker" in navigator && !isCapacitorNative())` — same for the PWA install banner (`beforeinstallprompt`/`isIosSafari` logic), which is meaningless inside an already-installed native app. |
| `window.navigator.standalone`, `beforeinstallprompt`, `appinstalled` | N/A inside Capacitor. | Guarded out via the same `isCapacitorNative()` checks above. |
| `window.location.href`/`.reload()` full-page navigations | Only two real usages found: the SW update-reload (now native-guarded, see above) and a `new URL(..., window.location.origin)` for MediaSession artwork (harmless either way). | No changes needed beyond the SW guard. |

## Google Sign-In / OAuth — the trickiest part, extra attention as requested

**Google's OAuth policy explicitly disallows embedded/in-app-WebView sign-in**
— it detects "embedded user-agents" and blocks them with a "this browser or
app may not be secure" error. The current web flow
(`skipBrowserRedirect: false`, full-page redirect inside the same WebView)
would very likely be **rejected outright** by Google if run unmodified
inside the native WKWebView, not just need minor adjustment.

**What was implemented** (`app.js`, `signInWithGoogleNative()` +
`appUrlOpen` listener):

1. `isCapacitorNative()` branches `signInWithGoogle()` to a native-only path.
2. That path calls `signInWithOAuth({ redirectTo: "com.getsabri.app://auth/callback", skipBrowserRedirect: true })`, then opens the returned URL via `@capacitor/browser`'s `Browser.open()` — the **system** browser (Safari), not the app's own WebView. This satisfies Google's policy.
3. `@capacitor/app`'s `appUrlOpen` listener catches the redirect back into the app via the custom URL scheme, closes the system browser tab, and calls `supabaseClient.auth.exchangeCodeForSession(url)` to finish establishing the session, then hands off to the existing `handleOAuthSignIn()` — the same function the web flow already uses, so all the identity/profile-reconciliation logic from the earlier auth audit applies unchanged.
4. The custom scheme `com.getsabri.app://` is registered in `Info.plist`'s `CFBundleURLTypes`.

**What this could NOT verify or complete from this environment (needs the
user's own access):**

- **Never tested on a real device/simulator.** No Mac/Xcode/simulator available here. The `exchangeCodeForSession` call is implemented per Supabase's documented pattern but should be re-checked against the currently-installed `@supabase/supabase-js` version's docs before relying on it.
- **Supabase dashboard → Authentication → URL Configuration** needs `com.getsabri.app://auth/callback` added to the allowed redirect URLs list, or the exchange will be rejected server-side regardless of how correct the client code is.
- **Google Cloud Console → OAuth client** — the existing "Web application" client type should still work for this pattern (the consent screen is still web-based, just opened in the system browser instead of embedded), but the authorized redirect URIs list should be double-checked against what's actually configured, since a mismatch here fails silently in a way that looks like "it redirects and then just bounces back" — worth checking regardless of the native conversion, see the separate real-world sign-in investigation.
- **Google OAuth consent screen branding** (the new logo) can't be uploaded from here — Google Cloud Console → Google Auth Platform → Branding → App logo is a manual step in the browser, with the user's own Google account access.

## App icons / splash screens

- Source: `branding-source-logo.jpg` (1600x1600, no alpha).
- Generated: `icon-1024-master.png` (iOS AppIcon source), `icon-512.png`,
  `icon-192.png`, `icon-180.png` (Apple touch icon), `favicon.ico`
  (16/32/48px, multi-resolution).
- The full illustration (two suns + layered dunes) turns muddy at
  16x16/32x32, so the favicon specifically uses a tighter crop of just the
  cactus; every larger size uses the full illustration.
- **iOS launch screen (`LaunchScreen.storyboard`)** was NOT customized —
  it still has Capacitor's default blank/white storyboard. Xcode is
  required to edit a `.storyboard` file (it's Interface Builder XML, not
  something to hand-edit blind); this is a manual next step. The existing
  warm cream (`#FAF7F2`)/navy (`#0F1B2D`) palette and the cactus mark
  should carry through here for a non-jarring launch transition — worth
  doing before the TestFlight build, not launch-blocking for it.
- **App Store Connect** also wants its own marketing assets (screenshots
  per device size, etc.) — separate from the in-app icon, not attempted
  here, genuinely a manual/design task for later.

## First things to test once this can run in Xcode

In priority order — do these before anything else, since both are
foundational to the core "walking with the phone locked, listening via
AirPods" use case:

1. **Speech recognition (`SabriSpeechRecognition`, `app.js`).** Tap the mic
   button and confirm, in order: (a) the native permission prompt actually
   appears (iOS should ask for both Speech Recognition and Microphone the
   first time — `NSSpeechRecognitionUsageDescription` +
   `NSMicrophoneUsageDescription` are both in `Info.plist`); (b) denying it
   shows the friendly `#mic-permission-denied` overlay, not a silent
   failure; (c) granting it and speaking a real question gets transcribed
   correctly and flows into `askSabri()` exactly like the web version does
   — same silence-timeout behavior, same short-transcript rejection, same
   "confirm the captured text for a beat" delay before it's sent.
   **Unverified in this environment** — no Mac/simulator available, so this
   was built strictly against the plugin's documented TypeScript API
   (verified to match `node_modules/@capacitor-community/speech-recognition`'s
   actual `definitions.d.ts`) and tested as thoroughly as possible on the
   *web* path (confirmed zero regression there — interim results, final
   transcript, cancel, and short-transcript rejection all still work
   exactly as before). The native branch itself has not run on real
   hardware.
   **Rollback note:** because everything routes through the
   `SabriSpeechRecognition` abstraction, if the native plugin has problems
   on a real device, only that module's native branch (inside
   `SabriSpeechRecognition` in `app.js`) needs fixing or swapping for a
   different plugin — `startListening()`, `askSabri()`, and everything else
   that consumes a transcript are unaffected either way.
   One packaging note: unlike the other plugins, `@capacitor-community/speech-recognition`
   does **not** ship a `Package.swift` (Capacitor's sync warned about this),
   so it isn't Swift-Package-Manager-compatible — Xcode will need
   CocoaPods to install it, where the other plugins didn't require that.
2. **Background audio.** Start narration, lock the phone, confirm audio
   keeps playing and lock-screen/AirPods controls (play/pause/skip) still
   work — matching the existing web PWA behavior on iOS Safari.
   `UIBackgroundModes: audio` is already declared in `Info.plist` (added in
   an earlier pass, confirmed present, no conflicts with the other keys
   added since). This is a config-only declaration; the Media Session API
   code already built for the web version is reused as-is — Media Session
   generally works fine inside WKWebView once background audio is
   declared, but this assumption specifically needs confirming on real
   hardware too, since it's never actually been tested outside Safari.

## Manual next steps requiring Xcode / Apple Developer account / a Mac

None of the following could be done from this environment:

1. Open `ios/App/App.xcworkspace` in Xcode, resolve Swift Package Manager /
   CocoaPods dependencies (SPM should be automatic on first open; CocoaPods
   is needed specifically for the speech-recognition plugin, see above).
2. The two tests above — speech recognition and background audio — first.
3. Run on a simulator (`npx cap run ios` from a Mac, or Xcode's own Run
   button) and walk through the rest: onboarding, sign-in (native OAuth
   flow above), camera, geolocation/map.
4. Set up code signing — requires an Apple Developer account (noted in an
   earlier task as still pending).
5. Add the Supabase + Google Cloud Console redirect URL entries above.
6. Design a proper `LaunchScreen.storyboard`.
7. TestFlight build + internal testing once the above are in place.
