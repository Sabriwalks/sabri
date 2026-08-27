const appEl = document.querySelector(".app");
const startBtn = document.getElementById("start-btn");
const startPrompt = document.getElementById("start-prompt");
const tourControls = document.getElementById("tour-controls");
const statusText = document.getElementById("status-text");
const locationName = document.getElementById("location-name");
const neighborhoodNameEl = document.getElementById("neighborhood-name");
const homePhoto = document.getElementById("home-photo");
const pulseEl = document.getElementById("pulse");
const mapEl = document.getElementById("map");
const recenterBtn = document.getElementById("recenter-btn");
const personaChipEl = document.getElementById("persona-chip");
const personaChipNameEl = document.getElementById("persona-chip-name");
const tourLoadingOverlay = document.getElementById("tour-loading-overlay");
const tourLoadingText = document.getElementById("tour-loading-text");
const narrationWaveEl = document.getElementById("narration-wave");
const cameraOverlay = document.getElementById("camera-overlay");
const cameraVideo = document.getElementById("camera-video");
const cameraCanvas = document.getElementById("camera-canvas");
const cameraCloseBtn = document.getElementById("camera-close-btn");
const cameraIdentifyBtn = document.getElementById("camera-identify-btn");
const cameraLoading = document.getElementById("camera-loading");
const cameraPermissionDenied = document.getElementById("camera-permission-denied");
const cameraPermissionMessage = document.getElementById("camera-permission-message");
const cameraPermissionHint = document.getElementById("camera-permission-hint");
const cameraPermissionCloseBtn = document.getElementById("camera-permission-close-btn");
const cameraPermissionRetryBtn = document.getElementById("camera-permission-retry-btn");
const micPermissionDenied = document.getElementById("mic-permission-denied");
const micPermissionHint = document.getElementById("mic-permission-hint");
const micPermissionCloseBtn = document.getElementById("mic-permission-close-btn");
const micPermissionRetryBtn = document.getElementById("mic-permission-retry-btn");
const deleteAccountBtn = document.getElementById("delete-account-btn");
const deleteAccountConfirm = document.getElementById("delete-account-confirm");
const deleteAccountConfirmBtn = document.getElementById("delete-account-confirm-btn");
const playerCard = document.getElementById("player-card");
const drawerHandle = document.getElementById("drawer-handle");
const drawerClose = document.getElementById("drawer-close");
const placeName = document.getElementById("place-name");
const placeDescription = document.getElementById("place-description");
const speedButtons = document.querySelectorAll(".speed-btn");
const narrationSkipBtn = document.getElementById("narration-skip-btn");
const narrationReplayBtn = document.getElementById("narration-replay-btn");
const moodButtons = document.querySelectorAll(".mood-btn");
const plannerMoodCardsContainer = document.getElementById("planner-mood-cards");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const audioPlayer = document.getElementById("audio-player");
const installBanner = document.getElementById("install-banner");
const installBannerClose = document.getElementById("install-banner-close");
const installBannerCta = document.getElementById("install-banner-cta");
const installBannerIosOnly = document.querySelectorAll("[data-ios-only]");
const updateBanner = document.getElementById("update-banner");
const updateBannerCta = document.getElementById("update-banner-cta");
const micBtn = document.getElementById("mic-btn");
const cameraBtn = document.getElementById("camera-btn");
const askSubtitle = document.getElementById("ask-subtitle");
const askEditBtn = document.getElementById("ask-edit-btn");
const askEditInput = document.getElementById("ask-edit-input");
const listeningHint = document.getElementById("listening-hint");
const toastEl = document.getElementById("toast");
const settingsBtn = document.getElementById("settings-btn");
const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
// Scoped to #settings-drawer specifically — #preferences-drawer below
// reuses the same .voice-card/.depth-pill classes for visual consistency
// but needs its own independent selection state (see preferences* refs),
// so a global querySelectorAll(".voice-card") would wrongly double-bind.
const voiceCards = document.querySelectorAll("#settings-drawer .voice-card");
const depthPills = document.querySelectorAll("#settings-drawer .depth-pill");
const languageSelect = document.getElementById("language-select");

const preferencesDrawer = document.getElementById("preferences-drawer");
const preferencesOverlay = document.getElementById("preferences-overlay");
const preferencesClose = document.getElementById("preferences-close");
const editPreferencesBtn = document.getElementById("edit-preferences-btn");
const preferencesNameInput = document.getElementById("preferences-name");
const preferencesInterestsContainer = document.getElementById("preferences-interests");
// Pillar 3 (ENABLE_NEEDS_ROUTING) — dietary restrictions for food/place
// ranking (see applyNeedsRoutingSettingsUI in app.js and buildDietaryFilter-
// Note in server.js). Section stays hidden (see index.html) unless the
// flag is on.
const preferencesDietarySection = document.getElementById("preferences-dietary-section");
const preferencesDietaryContainer = document.getElementById("preferences-dietary");
const preferencesArchetypeContainer = document.getElementById("preferences-archetype");
const preferencesVoiceCards = document.querySelectorAll("#preferences-drawer .voice-card");
const preferencesDepthPills = document.querySelectorAll("#preferences-drawer .depth-pill");
const preferencesLanguageSelect = document.getElementById("preferences-language");
const preferencesSaveBtn = document.getElementById("preferences-save-btn");

const reportProblemBtn = document.getElementById("report-problem-btn");
const feedbackDrawer = document.getElementById("feedback-drawer");
const feedbackOverlay = document.getElementById("feedback-overlay");
const feedbackClose = document.getElementById("feedback-close");
const feedbackMessageInput = document.getElementById("feedback-message-input");
const feedbackScreenshotInput = document.getElementById("feedback-screenshot-input");
const feedbackScreenshotPreview = document.getElementById("feedback-screenshot-preview");
const feedbackScreenshotPreviewImg = document.getElementById("feedback-screenshot-preview-img");
const feedbackScreenshotRemoveBtn = document.getElementById("feedback-screenshot-remove-btn");
const feedbackError = document.getElementById("feedback-error");
const feedbackConfirm = document.getElementById("feedback-confirm");
const feedbackSubmitBtn = document.getElementById("feedback-submit-btn");

const tourModeModal = document.getElementById("tour-mode-modal");
const tourModeClose = document.getElementById("tour-mode-close");
const tourModeWanderBtn = document.getElementById("tour-mode-wander-btn");
const tourModePlanBtn = document.getElementById("tour-mode-plan-btn");

const tourPlanner = document.getElementById("tour-planner");
const plannerClose = document.getElementById("planner-close");
const plannerDurationCards = document.getElementById("planner-duration-cards");
const plannerDistancePills = document.getElementById("planner-distance-pills");
const plannerStep0NextBtn = document.getElementById("planner-step0-next");
const plannerSpecificTimesToggle = document.getElementById("planner-specific-times-toggle");
const plannerSpecificTimesField = document.getElementById("planner-specific-times-field");
const plannerStartTimeInput = document.getElementById("planner-start-time");
const plannerEndTimeInput = document.getElementById("planner-end-time");
const plannerStartInput = document.getElementById("planner-start-input");
const plannerUseCurrentLocationBtn = document.getElementById("planner-use-current-location");
const plannerEndNoBtn = document.getElementById("planner-end-no");
const plannerEndYesBtn = document.getElementById("planner-end-yes");
const plannerEndField = document.getElementById("planner-end-field");
const plannerEndInput = document.getElementById("planner-end-input");
const plannerStep1NextBtn = document.getElementById("planner-step1-next");
const plannerSavedInterestsNote = document.getElementById("planner-saved-interests-note");
const plannerInterestPillsContainer = document.getElementById("planner-interest-pills");
const plannerSpecificFocus = document.getElementById("planner-specific-focus");
const plannerGenerateBtn = document.getElementById("planner-generate-btn");

const plannedTourCard = document.getElementById("planned-tour-card");
const plannedTourTitleEl = document.getElementById("planned-tour-title");
const plannedTourDescEl = document.getElementById("planned-tour-desc");
const plannedTourMetaEl = document.getElementById("planned-tour-meta");
const plannedTourStartBtn = document.getElementById("planned-tour-start-btn");
const plannedTourDiscardBtn = document.getElementById("planned-tour-discard-btn");
const resetOnboardingBtn = document.getElementById("reset-onboarding-btn");
// Pillar 3 (ENABLE_NEEDS_ROUTING) — see checkNeedsAndMaybeSuggest below.
const needsSuggestionBanner = document.getElementById("needs-suggestion-banner");
const needsSuggestionTextEl = document.getElementById("needs-suggestion-text");
const needsSuggestionClarifyEl = document.getElementById("needs-suggestion-clarify");
const needsSuggestionYesBtn = document.getElementById("needs-suggestion-yes");
const needsSuggestionNoBtn = document.getElementById("needs-suggestion-no");
const needsSuggestionMicBtn = document.getElementById("needs-suggestion-mic-btn");
const needsSuggestionVoiceInput = document.getElementById("needs-suggestion-voice-input");
const needsSuggestionVoiceHint = document.getElementById("needs-suggestion-voice-hint");
const settingsNeedsSuggestionsSection = document.getElementById("settings-needs-suggestions-section");
const needsSuggestionsToggle = document.getElementById("needs-suggestions-toggle");
// Guided Destination pillar (ENABLE_GUIDED_DESTINATION).
const guideMeBtn = document.getElementById("guide-me-btn");
const destinationPicker = document.getElementById("destination-picker");
const destinationPickerCloseBtn = document.getElementById("destination-picker-close");
const destinationPickerTitle = document.getElementById("destination-picker-title");
const destinationMicBtn = document.getElementById("destination-mic-btn");
const destinationInput = document.getElementById("destination-input");
const destinationSearchBtn = document.getElementById("destination-search-btn");
const destinationPickerHint = document.getElementById("destination-picker-hint");
const destinationPickerStatus = document.getElementById("destination-picker-status");
const destinationActiveRow = document.getElementById("destination-active-row");
const destinationActiveName = document.getElementById("destination-active-name");
const destinationStopBtn = document.getElementById("destination-stop-btn");
const destinationSkipBtn = document.getElementById("destination-skip-btn");
const destinationRerouteBanner = document.getElementById("destination-reroute-banner");
const destinationRerouteText = document.getElementById("destination-reroute-text");
const destinationRerouteMicBtn = document.getElementById("destination-reroute-mic-btn");
const destinationRerouteVoiceInput = document.getElementById("destination-reroute-voice-input");
const destinationRerouteVoiceHint = document.getElementById("destination-reroute-voice-hint");
const destinationRerouteYesBtn = document.getElementById("destination-reroute-yes");
const destinationRerouteNoBtn = document.getElementById("destination-reroute-no");
const accountSignedIn = document.getElementById("account-signed-in");
const accountGuest = document.getElementById("account-guest");
const accountNameEl = document.getElementById("account-name");
const accountEmailEl = document.getElementById("account-email");
const signOutBtn = document.getElementById("sign-out-btn");
const settingsGoogleBtn = document.getElementById("settings-google-btn");

console.log(
  "[debug] Google button elements found — onboardingGoogleBtn:",
  !!document.getElementById("onboarding-google-btn"),
  "settingsGoogleBtn:",
  !!settingsGoogleBtn
);

// --- Supabase client (frontend uses the anon key only; the service role
// key never leaves server.js). SUPABASE_URL/SUPABASE_ANON_KEY are injected
// into the page by server.js's renderIndexHtml(). ---
// Named supabaseClient (not `supabase`) — the CDN script itself creates a
// global `window.supabase` namespace object, and declaring a top-level
// `const supabase` collides with it (SyntaxError: already declared).
const supabaseClient =
  window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  console.log(
    "[debug] Supabase config missing — window.SUPABASE_URL:",
    window.SUPABASE_URL,
    "| window.SUPABASE_ANON_KEY set:",
    !!window.SUPABASE_ANON_KEY
  );
}

let currentUser = null; // Supabase auth user, or null for a guest
let visitedPlaceIds = new Set(); // cross-session — fetched after login
let crossSessionVisitedPlaceNames = []; // last 5 place names, sent to every /api/narrate + /api/ask
let returningUserContext = null; // {recentSessions, recentPlaces} — first narration only
let isFirstNarrationOfSession = true;
let tourStartedAt = null;
let totalNarrationsThisSession = 0;
let totalQuestionsThisSession = 0;
let totalDistanceWalkedMeters = 0;

let watchId = null;
let lastPosition = null;
let lastHeading = null;
let placeAbortController = null;
let geocodeAbortController = null;
let speakAbortController = null;
// Aborts the in-flight /api/narrate or /api/ask SSE stream itself — separate
// from speakAbortController (which only ever covered a single /api/speak
// call) since a streaming narration fires many /api/speak calls, one per
// sentence, over its lifetime.
let streamAbortController = null;

// --- Gapless TTS playback queue ---
// Each sentence from a streaming narration/answer gets its own /api/speak
// call fired the moment the sentence arrives — synthesis for sentence 2
// happens in parallel while sentence 1 is still playing, so by the time
// playback reaches it, the audio is usually already sitting in the queue
// ready to go. Reuses the single existing audioPlayer element (rather than
// a second alternating one) to avoid duplicating its play/pause/ended
// listeners elsewhere in this file — the gap between clips is just an src
// swap on an already-fully-downloaded blob, not a fresh network fetch.
let ttsQueue = [];
let ttsQueueGeneration = 0;
let ttsQueueActive = false;
let firstAudioPlaybackAt = null; // timestamp, for time-to-first-audio measurement
// Wander Mode start-latency breakdown (see startTour) — tourStartPerfMark is
// null once the first narration's audio has started and been logged, so
// later narrations in the same session don't re-trigger this.
let tourStartPerfMark = null;
let tourStartStageTimestamps = {};

// Replay button's cache — accumulated by driveTtsQueue (see its own
// comment), but only while cachingNarrationForReplay is true, so a
// tap-to-talk Q&A answer right after a narration can't silently overwrite
// "replay the last NARRATION" with Q&A audio instead. Set true/false at
// the start/end of narrateAndSpeak specifically — the one flow this button
// actually applies to.
let lastNarrationAudioBlobs = [];
let cachingNarrationForReplay = false;

async function fetchSpeechBlobUrl(text) {
  // No `speed` sent here — see the speedButtons click handler's comment
  // for why. Every clip synthesizes at natural 1x; speed is applied
  // purely via audio.playbackRate at play time in driveTtsQueue, so it's
  // provider-agnostic and can never compound with a server-side rate.
  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: settings.voice, language: settings.language }),
  });
  if (!response.ok) throw new Error("TTS request failed");
  const arrayBuffer = await response.arrayBuffer();
  // Returns the Blob alongside the URL (not just the URL) so the replay
  // cache below can keep the underlying Blob alive and mint its own fresh
  // object URL later, independent of whatever happens to the URL created
  // here — driveTtsQueue revokes THIS url once superseded by the next
  // clip, which would otherwise silently break Replay if it only ever
  // held onto this same, soon-to-be-revoked url.
  const blob = new Blob([arrayBuffer], { type: "audio/wav" });
  return { blob, url: URL.createObjectURL(blob) };
}

function enqueueTtsSentence(text) {
  const generation = ttsQueueGeneration;
  const resultPromise = fetchSpeechBlobUrl(text).catch((error) => {
    console.log("[tts] sentence synthesis failed, skipping:", error?.message || error);
    return null;
  });
  ttsQueue.push({ text, resultPromise, generation });
  if (!ttsQueueActive) driveTtsQueue();
}

async function driveTtsQueue() {
  if (ttsQueueActive) return;
  ttsQueueActive = true;
  try {
    while (ttsQueue.length > 0) {
      const item = ttsQueue.shift();
      if (item.generation !== ttsQueueGeneration) continue; // interrupted — skip
      const result = await item.resultPromise;
      if (item.generation !== ttsQueueGeneration) {
        if (result) URL.revokeObjectURL(result.url);
        continue;
      }
      if (!result) continue; // this sentence failed to synthesize — skip it, don't stall the queue
      const { blob, url: blobUrl } = result;

      if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
      currentAudioObjectUrl = blobUrl;
      audioPlayer.src = blobUrl;
      // Applied on every clip (not just once) so the gapless queue keeps
      // respecting the chosen speed across sentence boundaries — src swaps
      // don't preserve playbackRate on all browsers.
      audioPlayer.playbackRate = selectedSpeed;
      // Replay button's cache (see replayLastNarration) — keeps the Blob,
      // not the url above (which gets revoked the moment the NEXT clip
      // starts), so Replay can mint a fresh url instantly with no re-fetch.
      // Only accumulated during an actual narration (see
      // cachingNarrationForReplay's own comment) — cleared at the start of
      // each new narration, not appended to indefinitely.
      if (cachingNarrationForReplay) lastNarrationAudioBlobs.push({ text: item.text, blob });

      if (firstAudioPlaybackAt === null) {
        firstAudioPlaybackAt = performance.now();
      }

      await new Promise((resolve) => {
        currentPlaybackResolve = resolve;
        audioPlayer.addEventListener("ended", resolve, { once: true });
        const playPromise = audioPlayer.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => resolve());
        }
      });
      currentPlaybackResolve = null;
      // A stale queue may have been cleared while this clip was playing —
      // stop advancing rather than play leftover interrupted-narration audio.
      if (item.generation !== ttsQueueGeneration) break;
    }
  } finally {
    ttsQueueActive = false;
  }
}

// Invalidates any in-flight synthesis and empties the queue — called the
// MOMENT the mic/question flow activates (see startListening/interruptPlayback),
// not when speech recognition finishes, so an interrupted narration's
// remaining queued sentences never resume or play after the question
// exchange ends.
function clearTtsQueue() {
  ttsQueueGeneration += 1;
  ttsQueue = [];
}
let hasActivePlace = false;
let isNarrating = false; // tour-narration pipeline busy
let isConversing = false; // tap-to-talk pipeline busy (independent flag —
// see interruptPlayback()/startListening() for why these can't share state)

let currentAudioObjectUrl = null;
let selectedSpeed = 1;
let currentNeighborhoodName = null;
let currentPlaceName = null;
let currentPlaceId = null;
let currentCity = null;
let currentCountry = null;
let lastContextPlaces = [];
let correctionContext = null;

// Real-world testing: one conversation about a single place produced three
// different construction dates and two different architectural styles —
// Claude was regenerating historical claims fresh on every /api/ask call
// with no memory of what it already said. currentPlaceConversation holds
// this session's verbatim Q&A for the CURRENT place only (reset whenever
// the focused place changes, see initFocusedPlaceUI), distinct from the
// whole-walk sessionLog below (which truncates each entry to ~150 chars —
// nowhere near enough to stay consistent within one deep back-and-forth).
// placeFactsCache holds the shared, cross-session cached facts fetched via
// ensurePlaceFacts() the moment a place is narrated — see /api/get-place-facts.
let currentPlaceConversation = [];
let placeFactsCache = {};

// Extracted from user speech (see askSabri's userStatedDirection/
// userStatedDestination handling) — persists for the rest of the session
// (or until overwritten by a newer stated intent) and is both (a) sent to
// /api/narrate so Claude weights it over raw GPS proximity when choosing
// what to focus on, and (b) used to bias the effective heading used for
// context-place lookups (see computeEffectiveHeading), so a stated "I'm
// heading to X" starts reorienting the app immediately rather than waiting
// for GPS heading to catch up.
let userStatedDirection = null;
let userStatedDestination = null;

// Session-only ("how are you feeling today") — never saved to the profile,
// resets to the default every time a new tour starts. See
// MOOD_OPTIONS/setSessionMood below for the selector UI wiring.
let sessionMood = "curious";

const COMPASS_WORD_TO_DEGREES = {
  north: 0,
  northeast: 45,
  east: 90,
  southeast: 135,
  south: 180,
  southwest: 225,
  west: 270,
  northwest: 315,
};

function computeEffectiveHeading() {
  if (userStatedDirection && COMPASS_WORD_TO_DEGREES[userStatedDirection] !== undefined) {
    return COMPASS_WORD_TO_DEGREES[userStatedDirection];
  }
  return lastHeading;
}

// Weather — fetched on tour start and refreshed every 30 min; passed as
// context to /api/narrate and /api/ask. Never blocks the tour if it fails.
let currentWeather = null;
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
let weatherRefreshInterval = null;

// Interest-matched places — the relevanceTier === "high" subset of
// /api/map-pins results (see loadInterestPlaces) — loaded once per
// orientation area and used for both priority map pins and the proactive
// "something fascinating up ahead" guidance.
let interestPlaces = [];
const INTEREST_PROACTIVE_MIN_METERS = 100;
const INTEREST_PROACTIVE_MAX_METERS = 300;
const INTEREST_IMMEDIATE_METERS = 30;

// GPS stabilization: don't act on the raw first fix, which can be noisy.
// Show a fast, provisional welcome immediately, but wait for a couple of
// consecutive readings to agree before starting real orientation.
let recentPositions = [];
let gpsStabilized = false;
let hasShownFastWelcome = false;
const GPS_STABILIZATION_METERS = 30;
const GPS_STABILIZATION_READINGS = 2;

// Last 3 raw GPS fixes, used only to derive the user's actual direction of
// TRAVEL — distinct from compass heading (which way the phone points, not
// necessarily the way the user is walking).
let travelHistory = [];
const TRAVEL_HISTORY_SIZE = 3;
const TRAVEL_MIN_METERS = 10;

// Three-tier location state. orientationCenter/isOriented track whether
// we've given the user a neighborhood orientation for their current area;
// narratedPlaceIds ensures nothing (neighborhood or specific) is ever
// narrated twice in a session. visitedPlaceIds (cross-session, above) is
// merged with this everywhere a candidate place gets filtered.
let orientationCenter = null;
let isOriented = false;
const narratedPlaceIds = new Set();

// Which place's map pin currently shows the pulsing "narrating now" ring —
// see buildPlaceMarkerIcon()/refreshAllPlaceMarkers() in the map module.
let narratingPlaceId = null;

// Short-term memory: every narration and every question/answer pair, sent
// (last 5) to /api/narrate and /api/ask so Sabri has context of the walk so
// far, can reference earlier stops, and never repeats itself.
const sessionLog = [];

// Pacing: once a narration finishes, wait for both a time and a distance
// threshold before the next one can start, so narrations never jumble
// together while walking at a normal pace.
let lastNarrationEndTime = 0;
let lastNarrationPosition = null;
const NARRATION_COOLDOWN_MS = 10000;
const NARRATION_COOLDOWN_METERS = 10;

const SIGNIFICANT_MOVE_METERS = 15;
const ORIENTATION_RADIUS_METERS = 100;
const CONTEXT_RADIUS_METERS = 50;

const NEIGHBORHOOD_PLACE_TYPES = ["neighborhood", "locality", "sublocality"];
const SPECIFIC_PLACE_TYPES = [
  "synagogue",
  "church",
  "mosque",
  "tourist_attraction",
  "museum",
  "park",
  "cemetery",
  "premise",
  "establishment",
];

const PLACE_TYPE_LABELS = {
  synagogue: "Synagogue",
  church: "Church",
  mosque: "Mosque",
  tourist_attraction: "Tourist Attraction",
  place_of_worship: "Place of Worship",
  museum: "Museum",
  park: "Park",
  natural_feature: "Natural Feature",
  cemetery: "Cemetery",
  stadium: "Stadium",
  neighborhood: "Neighborhood",
  locality: "Neighborhood",
  sublocality: "Neighborhood",
  library: "Library",
  school: "School",
  bakery: "Bakery",
  cafe: "Cafe",
  restaurant: "Restaurant",
  supermarket: "Supermarket",
  hospital: "Hospital",
  premise: "Premise",
  establishment: "Establishment",
};

// --- Onboarding (first-launch profile capture + Google sign-in) ---

const ONBOARDED_KEY = "sabri_onboarded";
const USER_PROFILE_KEY = "sabri_user_profile";
const ONBOARDING_DRAFT_KEY = "sabri_onboarding_draft";
// Which Supabase user id the LOCAL onboarded/profile cache above actually
// belongs to (null/absent for pure guest data that was never tied to any
// account). See getTrustworthyLocalProfile() — this is what lets the app
// tell "my own cached profile" apart from "a different person's leftover
// data on this shared device."
const LOCAL_PROFILE_OWNER_KEY = "sabri_profile_owner_id";

const onboarding = document.getElementById("onboarding");
const onboardingSteps = document.querySelectorAll(".onboarding-step");
const onboardingNameInput = document.getElementById("onboarding-name");
const onboardingWelcomeNextBtn = document.getElementById("onboarding-welcome-next");
const onboardingGoogleBtn = document.getElementById("onboarding-google-btn");
const onboardingGuestBtn = document.getElementById("onboarding-guest-btn");
const onboardingFinishBtn = document.getElementById("onboarding-finish");
const onboardingPathChatBtn = document.getElementById("onboarding-path-chat");
const onboardingPathQuickBtn = document.getElementById("onboarding-path-quick");
const onboardingSigninExistingBtn = document.getElementById("onboarding-signin-existing-btn");

const onboardingChatEl = document.getElementById("onboarding-chat");
const onboardingChatMessagesEl = document.getElementById("onboarding-chat-messages");
const onboardingChatLoadingEl = document.getElementById("onboarding-chat-loading");
const onboardingChatInput = document.getElementById("onboarding-chat-input");
const onboardingChatSendBtn = document.getElementById("onboarding-chat-send-btn");
const onboardingChatMicBtn = document.getElementById("onboarding-chat-mic-btn");
const onboardingChatSkipBtn = document.getElementById("onboarding-chat-skip");
const onboardingChatProgressEl = document.getElementById("onboarding-chat-progress");

let onboardingStepIndex = 0;
const onboardingAnswers = {
  name: "",
  reason: "",
  interests: [],
  companions: "",
  language: "en",
  depth: "standard",
  preferredArchetype: "local_friend",
};

function isOnboarded() {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function loadUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

// Wipes every locally-cached identity/profile key — called on sign-out and
// whenever getTrustworthyLocalProfile() detects the cache belongs to
// someone else. Deliberately does NOT touch ONBOARDING_DRAFT_KEY (a
// short-lived, pre-redirect draft that's cleaned up separately by whatever
// consumes it) or settings-only keys unrelated to identity.
function clearLocalIdentityState() {
  try {
    localStorage.removeItem(ONBOARDED_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(LOCAL_PROFILE_OWNER_KEY);
  } catch (error) {
    // Non-fatal.
  }
}

// The local onboarded/profile cache is only ever safe to ADOPT (i.e. use
// its answers as if they were freshly confirmed) when it's pure guest data
// that was never tied to any signed-in account — that's the one case where
// there's no Supabase record to conflict with yet, so there's nothing to
// override. It is deliberately NOT treated as adoptable just because it
// happens to be tagged to the CURRENT account: if Supabase and a
// same-account local cache ever disagree, Supabase must always win (a
// stale local cache is not "confirmation" of anything) — so that case
// returns onboarded: false here too, same as a stranger's leftover data
// from a shared device would. The only thing this function protects
// against showing is guest data that turns out to belong to someone else
// entirely, which is worse than showing nothing.
function getTrustworthyLocalProfile(currentUserId) {
  let ownerId = null;
  try {
    ownerId = localStorage.getItem(LOCAL_PROFILE_OWNER_KEY);
  } catch (error) {
    ownerId = null;
  }

  if (ownerId && ownerId !== currentUserId) {
    // Belongs to someone else — never surface it, and clean it up so it
    // doesn't linger and cause the same confusion again later.
    clearLocalIdentityState();
    return { onboarded: false, profile: null };
  }

  if (ownerId) {
    // Tagged to this exact account already, but the caller only reaches
    // this function when Supabase itself says that account has no
    // completed profile — so this local copy is stale, not adoptable.
    // Clear it rather than leaving it to linger untrusted: once onboarding
    // is redone, completeOnboarding()/applyProfileFromSupabase() will
    // write a fresh copy anyway.
    clearLocalIdentityState();
    return { onboarded: false, profile: null };
  }

  return { onboarded: isOnboarded(), profile: loadUserProfile() };
}

// Records which account the local onboarded/profile cache belongs to,
// alongside the existing ONBOARDED_KEY/USER_PROFILE_KEY writes — call this
// any time those are written for a signed-in user (never for guest-only
// onboarding, which intentionally leaves no owner so it stays "adoptable"
// by whichever account it later gets attached to via sign-in).
function markLocalProfileOwner(userId) {
  try {
    localStorage.setItem(LOCAL_PROFILE_OWNER_KEY, userId);
  } catch (error) {
    // Non-fatal.
  }
}

// THE single correct way to determine what a signed-in user's real
// profile/onboarding state is. Local state (userProfile, ONBOARDED_KEY,
// settings) must NEVER be trusted on its own for anything identity-related
// — every caller here gets it only as something already verified against
// Supabase, not a shortcut around checking it.
//
// This exists because of two real production bugs, both the same root
// cause: code that made an onboarding/routing decision from local state
// without first confirming it against Supabase.
//   1. handleOAuthSignIn used to trust a local "onboarded" flag instead of
//      the account's actual onboarding_complete status in Supabase —
//      silently re-onboarded (and overwrote the real saved profile of) a
//      returning user signing in on a new device/browser.
//   2. Signing out never cleared local identity keys, so a shared device
//      could show one person's cached profile to the next person who opened
//      the app, even after the first person explicitly signed out.
// Both happened because the local-vs-Supabase check was implemented
// independently in more than one place. Every place that needs to know "is
// this user onboarded, and with what profile" MUST call this function
// rather than writing its own version of that check — if you're tempted to
// read ONBOARDED_KEY or userProfile directly to make a routing decision,
// that's the same mistake happening again.
//
// Retries the profile fetch a couple of times before giving up, so a
// single flaky request doesn't immediately fall back to guessing — but it
// still never falls back to trusting a signed-in user's LOCAL cache as
// truth; if Supabase genuinely can't be reached, callers get status
// "error" and must show that honestly (a retry/offline state), not paper
// over it with local data that might be stale or belong to someone else.
//
// Returns one of:
//   { status: "signed-in-complete", session, profile }     — real, confirmed Supabase profile with onboarding done
//   { status: "signed-in-incomplete", session, profile }   — signed in, but no completed onboarding for this account yet (profile may be null)
//   { status: "guest", localProfile: { onboarded, profile } } — no session; localProfile is already vetted to belong to no one else
//   { status: "error", session }                            — could not confirm the profile (network failure) even after retrying
const AUTHORITATIVE_PROFILE_FETCH_RETRIES = 2;
const AUTHORITATIVE_PROFILE_RETRY_DELAY_MS = 1200;

async function getAuthoritativeProfile(knownSession) {
  if (!supabaseClient) {
    return { status: "guest", localProfile: getTrustworthyLocalProfile(null) };
  }

  let session = knownSession || null;
  if (!session) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      session = data?.session || null;
    } catch (error) {
      return { status: "error", session: null };
    }
  }

  if (!session) {
    return { status: "guest", localProfile: getTrustworthyLocalProfile(null) };
  }

  for (let attempt = 0; attempt <= AUTHORITATIVE_PROFILE_FETCH_RETRIES; attempt++) {
    try {
      const response = await fetch(`/api/auth/user-history?userId=${encodeURIComponent(session.user.id)}`);
      if (!response.ok) throw new Error(`user-history responded ${response.status}`);
      const data = await response.json();
      const profile = data?.profile || null;

      if (profile && profile.onboarding_complete) {
        return { status: "signed-in-complete", session, profile };
      }
      return { status: "signed-in-incomplete", session, profile };
    } catch (error) {
      if (attempt < AUTHORITATIVE_PROFILE_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, AUTHORITATIVE_PROFILE_RETRY_DELAY_MS));
      }
    }
  }

  return { status: "error", session };
}

let userProfile = loadUserProfile();

function updateNameSlots() {
  const name = onboardingAnswers.name || userProfile?.name || "friend";
  document.querySelectorAll("[data-name-slot]").forEach((el) => {
    el.textContent = name;
  });
}

function goToOnboardingStep(index) {
  onboardingStepIndex = index;
  updateNameSlots();
  onboardingSteps.forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.step) === index);
  });
}

function advanceOnboarding() {
  if (onboardingStepIndex < onboardingSteps.length - 1) {
    goToOnboardingStep(onboardingStepIndex + 1);
  }
}

onboardingSteps.forEach((step) => {
  const nextBtn = step.querySelector("[data-next]");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (step.dataset.step === "1") {
        onboardingAnswers.name = onboardingNameInput.value.trim();
      }
      advanceOnboarding();
    });
  }

  const singleSelectContainer = step.querySelector("[data-single-select]");
  if (singleSelectContainer) {
    const field = singleSelectContainer.dataset.field;
    const buttons = singleSelectContainer.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        onboardingAnswers[field] = btn.dataset.value;
        const isLastStep = onboardingStepIndex === onboardingSteps.length - 1;
        if (!step.querySelector(".onboarding-next") && !isLastStep) {
          setTimeout(advanceOnboarding, 250);
        }
      });
    });
  }

  const pillsContainer = step.querySelector(".onboarding-pills");
  if (pillsContainer) {
    const nextBtnForPills = step.querySelector("[data-next]");
    pillsContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        pill.classList.toggle("is-selected");
        onboardingAnswers.interests = Array.from(pillsContainer.querySelectorAll(".onboarding-pill.is-selected")).map(
          (p) => p.dataset.value
        );
        if (nextBtnForPills) nextBtnForPills.disabled = onboardingAnswers.interests.length === 0;
      });
    });
  }
});

if (onboardingNameInput) {
  onboardingNameInput.addEventListener("input", () => {
    if (onboardingNameInput.value.trim().length >= 2) {
      onboardingWelcomeNextBtn.classList.remove("hidden");
    } else {
      onboardingWelcomeNextBtn.classList.add("hidden");
    }
  });
}

function completeOnboarding() {
  userProfile = { ...onboardingAnswers };
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    localStorage.setItem(ONBOARDED_KEY, "true");
  } catch (error) {
    // localStorage unavailable — onboarding just won't persist.
  }
  // Tags the local cache with whose it is when signed in — guest-only
  // onboarding intentionally leaves it untagged (see markLocalProfileOwner/
  // getTrustworthyLocalProfile), so it stays adoptable if this guest later
  // signs in with no pre-existing Supabase profile.
  if (currentUser) markLocalProfileOwner(currentUser.id);
  // Keep the settings panel's depth/language selections in sync with the
  // onboarding choices, so they don't silently diverge from each other.
  settings.depth = userProfile.depth || settings.depth;
  settings.language = userProfile.language || settings.language;
  saveSettings();
  applySettingsToUI();
  onboarding.classList.add("hidden");
  // Covers every path that reaches completeOnboarding() while already
  // signed in — including a brand-new account that signed in from
  // onboarding screen 1, got routed into the real questions (see
  // handleOAuthSignIn), and just finished them normally via the "Start
  // Exploring" button. Without this, that profile would only ever persist
  // to localStorage, never to their actual Supabase account.
  if (currentUser) {
    saveProfileToSupabase(true);
  }
  initializeAuthState();
}

if (onboardingFinishBtn) {
  onboardingFinishBtn.addEventListener("click", completeOnboarding);
}

// --- Conversational onboarding ("Talk to Sabri") ---
// Alternative to the 8-screen form flow — a short (3-5 turn) natural
// conversation that extracts the same profile fields via /api/onboarding-chat.
// Stateless server, so the client owns the full conversation history.
const ONBOARDING_CHAT_OPENING =
  "Hey! I'm Sabri, I'll be your guide. Before we start exploring - tell me a bit about yourself. " +
  "What should I call you, and what kind of things do you love learning about when you travel?";

let onboardingChatHistory = [];
let onboardingChatTurnCount = 0;
let onboardingChatBusy = false;

function addOnboardingChatMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `onboarding-chat-message ${role === "assistant" ? "is-sabri" : "is-user"}`;
  bubble.textContent = text;
  onboardingChatMessagesEl.appendChild(bubble);
  onboardingChatMessagesEl.scrollTop = onboardingChatMessagesEl.scrollHeight;
}

function updateOnboardingChatProgress() {
  if (!onboardingChatProgressEl) return;
  onboardingChatProgressEl.textContent =
    onboardingChatTurnCount === 0 ? "Getting to know you..." : `Getting to know you${".".repeat((onboardingChatTurnCount % 3) + 1)}`;
}

async function openOnboardingChat() {
  onboarding.classList.add("hidden");
  onboardingChatEl.classList.remove("hidden");
  onboardingChatHistory = [{ role: "assistant", content: ONBOARDING_CHAT_OPENING }];
  onboardingChatTurnCount = 0;
  onboardingChatMessagesEl.innerHTML = "";
  updateOnboardingChatProgress();
  addOnboardingChatMessage("assistant", ONBOARDING_CHAT_OPENING);
  // Spoken aloud like the rest of the app's voice-first feel — not awaited,
  // so the user can start typing/speaking immediately without waiting for
  // playback to finish.
  speakNarration(ONBOARDING_CHAT_OPENING).catch(() => {});
}

function closeOnboardingChatToQuickSetup() {
  onboardingChatMic?.cancel();
  onboardingChatEl.classList.add("hidden");
  onboarding.classList.remove("hidden");
  logEvent("onboarding_path_chosen", { path: "quick_setup_after_chat_escape", turns: onboardingChatTurnCount });
  // Land on the name screen (Quick Setup's actual first step) rather than
  // the path-choice screen the user already moved past.
  goToOnboardingStep(2);
}

async function sendOnboardingChatMessage(userText) {
  if (onboardingChatBusy || !userText.trim()) return;
  onboardingChatBusy = true;
  onboardingChatInput.value = "";
  onboardingChatInput.disabled = true;
  onboardingChatSendBtn.disabled = true;

  addOnboardingChatMessage("user", userText);
  onboardingChatHistory.push({ role: "user", content: userText });
  onboardingChatTurnCount += 1;
  updateOnboardingChatProgress();
  onboardingChatLoadingEl.classList.remove("hidden");

  try {
    const response = await fetch("/api/onboarding-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: onboardingChatHistory }),
    });
    const data = await response.json();

    if (!response.ok || !data.reply) {
      addOnboardingChatMessage("assistant", "Sorry, I lost my train of thought — could you say that again?");
      return;
    }

    onboardingChatHistory.push({ role: "assistant", content: data.reply });
    addOnboardingChatMessage("assistant", data.reply);
    speakNarration(data.reply).catch(() => {});

    if (data.isComplete) {
      completeConversationalOnboarding(data.extractedProfile || {});
    }
  } catch (error) {
    addOnboardingChatMessage("assistant", "Sorry, I lost my train of thought — could you say that again?");
  } finally {
    onboardingChatLoadingEl.classList.add("hidden");
    onboardingChatBusy = false;
    onboardingChatInput.disabled = false;
    onboardingChatSendBtn.disabled = false;
    onboardingChatInput.focus();
  }
}

// Reuses completeOnboarding()'s existing localStorage/settings-sync/
// initializeAuthState plumbing (same as the form flow) — just populates
// onboardingAnswers from the chat-extracted fields first, then layers on
// the voice preference (which the form flow gathers later, in Settings,
// not during onboarding at all).
function completeConversationalOnboarding(extractedProfile) {
  onboardingAnswers.name = extractedProfile.name || "friend";
  onboardingAnswers.language = extractedProfile.language || "en";
  onboardingAnswers.interests =
    Array.isArray(extractedProfile.interests) && extractedProfile.interests.length
      ? extractedProfile.interests
      : ["All of it"];
  onboardingAnswers.depth = extractedProfile.depth || "standard";

  onboardingChatEl.classList.add("hidden");
  completeOnboarding();

  if (extractedProfile.voice) {
    settings.voice = extractedProfile.voice;
    saveSettings();
    applySettingsToUI();
  }

  saveProfileToSupabase(true);
  logEvent("onboarding_path_chosen", { path: "conversational", turns: onboardingChatTurnCount });
}

if (onboardingPathChatBtn) {
  onboardingPathChatBtn.addEventListener("click", openOnboardingChat);
}
if (onboardingPathQuickBtn) {
  onboardingPathQuickBtn.addEventListener("click", () => {
    logEvent("onboarding_path_chosen", { path: "quick_setup" });
    advanceOnboarding();
  });
}
if (onboardingChatSkipBtn) {
  onboardingChatSkipBtn.addEventListener("click", closeOnboardingChatToQuickSetup);
}
if (onboardingChatSendBtn) {
  onboardingChatSendBtn.addEventListener("click", () => sendOnboardingChatMessage(onboardingChatInput.value));
}
if (onboardingChatInput) {
  onboardingChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendOnboardingChatMessage(onboardingChatInput.value);
  });
}

// Deliberately does NOT touch isConversing/isNarrating (the tour Q&A flags)
// since onboarding always happens before any tour starts. Routed through
// SabriSpeechRecognition/createChatMicController (defined further down,
// alongside the core tour flow's own mic handling) rather than talking to
// the shared `recognition` global directly — see the comment on
// createChatMicController for why that direct-usage pattern was the actual
// bug behind unreliable pickup and mistimed stop-listening in real-world
// testing.
const onboardingChatMic = onboardingChatMicBtn
  ? createChatMicController({
      micBtn: onboardingChatMicBtn,
      inputEl: onboardingChatInput,
      onFinalTranscript: (text) => sendOnboardingChatMessage(text),
    })
  : null;
if (onboardingChatMicBtn) {
  onboardingChatMicBtn.addEventListener("click", () => onboardingChatMic.start());
}

// --- Conversational tour creation ("Just tell Sabri what you want") ---
// Same chat-UI pattern as onboarding above, talking to /api/plan-tour-chat
// instead of /api/onboarding-chat. On completion, populates plannerAnswers
// from the extracted params and hands off to the exact same
// generatePlannedTour()/plan-tour pipeline the step-by-step flow uses.
const plannerChatEl = document.getElementById("planner-chat");
const plannerChatMessagesEl = document.getElementById("planner-chat-messages");
const plannerChatLoadingEl = document.getElementById("planner-chat-loading");
const plannerChatInput = document.getElementById("planner-chat-input");
const plannerChatSendBtn = document.getElementById("planner-chat-send-btn");
const plannerChatMicBtn = document.getElementById("planner-chat-mic-btn");
const plannerChatSkipBtn = document.getElementById("planner-chat-skip");
const plannerChatOpenBtn = document.getElementById("planner-chat-open-btn");

const PLANNER_CHAT_OPENING =
  "Tell me about the tour you're picturing — how long you have, where you'd like to start, and what you're " +
  "into. I'll figure out the rest.";

let plannerChatHistory = [];
let plannerChatBusy = false;

function addPlannerChatMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `onboarding-chat-message ${role === "assistant" ? "is-sabri" : "is-user"}`;
  bubble.textContent = text;
  plannerChatMessagesEl.appendChild(bubble);
  plannerChatMessagesEl.scrollTop = plannerChatMessagesEl.scrollHeight;
}

async function openPlannerChat() {
  document.querySelectorAll(".planner-step").forEach((step) => step.classList.remove("is-active"));
  plannerChatEl.classList.remove("hidden");
  plannerChatHistory = [{ role: "assistant", content: PLANNER_CHAT_OPENING }];
  plannerChatMessagesEl.innerHTML = "";
  addPlannerChatMessage("assistant", PLANNER_CHAT_OPENING);
  speakNarration(PLANNER_CHAT_OPENING).catch(() => {});
}

function closePlannerChatToStepByStep() {
  plannerChatMic?.cancel();
  plannerChatEl.classList.add("hidden");
  showPlannerStep(0);
}

async function sendPlannerChatMessage(userText) {
  if (plannerChatBusy || !userText.trim()) return;
  plannerChatBusy = true;
  plannerChatInput.value = "";
  plannerChatInput.disabled = true;
  plannerChatSendBtn.disabled = true;

  addPlannerChatMessage("user", userText);
  plannerChatHistory.push({ role: "user", content: userText });
  plannerChatLoadingEl.classList.remove("hidden");

  try {
    const response = await fetch("/api/plan-tour-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: plannerChatHistory,
        currentCity,
        currentLocation: lastPosition,
        userProfile,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.reply) {
      addPlannerChatMessage("assistant", "Sorry, I lost my train of thought — could you say that again?");
      return;
    }

    plannerChatHistory.push({ role: "assistant", content: data.reply });
    addPlannerChatMessage("assistant", data.reply);
    speakNarration(data.reply).catch(() => {});

    if (data.isComplete && data.extractedTourParams) {
      await completePlannerChat(data.extractedTourParams);
    }
  } catch (error) {
    addPlannerChatMessage("assistant", "Sorry, I lost my train of thought — could you say that again?");
  } finally {
    plannerChatLoadingEl.classList.add("hidden");
    plannerChatBusy = false;
    plannerChatInput.disabled = false;
    plannerChatSendBtn.disabled = false;
    plannerChatInput.focus();
  }
}

async function completePlannerChat(extractedTourParams) {
  plannerAnswers.startLocation = extractedTourParams.startLocation || { lat: lastPosition?.latitude, lng: lastPosition?.longitude, name: currentCity };
  plannerAnswers.hasCustomEnd = Boolean(extractedTourParams.endLocation);
  plannerAnswers.endLocation = extractedTourParams.endLocation || null;
  plannerAnswers.duration = extractedTourParams.duration || "1-2 hours";
  plannerAnswers.hasSpecificTimes = false;
  plannerAnswers.maxDistance = extractedTourParams.maxDistance || "1-3km (moderate)";
  plannerAnswers.interests = Array.isArray(extractedTourParams.interests) ? extractedTourParams.interests : [];
  plannerAnswers.specificFocus = extractedTourParams.specificFocus || "";

  plannerChatEl.classList.add("hidden");
  tourPlanner.classList.remove("hidden");
  showPlannerStep(3);
  logEvent("tour_planner_path_chosen", { path: "conversational", turns: plannerChatHistory.length });
  await generatePlannedTour();
}

if (plannerChatOpenBtn) plannerChatOpenBtn.addEventListener("click", openPlannerChat);
if (plannerChatSkipBtn) plannerChatSkipBtn.addEventListener("click", closePlannerChatToStepByStep);
if (plannerChatSendBtn) {
  plannerChatSendBtn.addEventListener("click", () => sendPlannerChatMessage(plannerChatInput.value));
}
if (plannerChatInput) {
  plannerChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendPlannerChatMessage(plannerChatInput.value);
  });
}

// Same createChatMicController pattern as onboarding-chat's mic button —
// see its comment above for why this replaced direct `recognition` usage.
const plannerChatMic = plannerChatMicBtn
  ? createChatMicController({
      micBtn: plannerChatMicBtn,
      inputEl: plannerChatInput,
      onFinalTranscript: (text) => sendPlannerChatMessage(text),
    })
  : null;
if (plannerChatMicBtn) {
  plannerChatMicBtn.addEventListener("click", () => plannerChatMic.start());
}

// Pillar 3 (ENABLE_NEEDS_ROUTING) voice-first consent — same
// createChatMicController pattern as onboarding-chat/planner-chat's mic
// buttons just above, not a new speech-recognition path. The single
// onFinalTranscript callback branches on needsSuggestionPending.stage
// (set by offerNeedsSuggestion/handleNeedsSuggestionYes) since one banner
// serves both the yes/no confirmation and the food-type clarifying
// question, unlike onboarding/planner chat's one-purpose mic buttons.
const needsSuggestionMic = needsSuggestionMicBtn
  ? createChatMicController({
      micBtn: needsSuggestionMicBtn,
      inputEl: needsSuggestionVoiceInput,
      onFinalTranscript: (text) => handleNeedsSuggestionVoiceTranscript(text),
    })
  : null;
if (needsSuggestionMicBtn) {
  needsSuggestionMicBtn.addEventListener("click", () => needsSuggestionMic.start());
}

async function handleNeedsSuggestionVoiceTranscript(transcript) {
  if (!needsSuggestionPending) return; // banner closed mid-listen — nothing to resolve
  const stage = needsSuggestionPending.stage === "clarifying" ? "clarify" : "confirm";
  if (needsSuggestionVoiceHint) needsSuggestionVoiceHint.classList.add("hidden");

  try {
    const response = await fetch("/api/interpret-needs-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, stage, userId: currentUser ? currentUser.id : null }),
    });
    if (!response.ok) throw new Error(`responded ${response.status}`);
    const data = await response.json();

    if (stage === "confirm") {
      if (data.intent === "yes") {
        handleNeedsSuggestionYes();
      } else if (data.intent === "no") {
        handleNeedsSuggestionNo();
      } else {
        showNeedsSuggestionVoiceUnclear();
      }
      return;
    }

    // stage === "clarify" — any genuinely on-topic reply proceeds (arriving
    // here already implies "yes" was given at the confirm stage); only a
    // truly uninterpretable reply falls back to the pills/button.
    if (data.unclear) {
      showNeedsSuggestionVoiceUnclear();
      return;
    }
    (data.matchedLabels || []).forEach((label) => {
      const pill = needsSuggestionClarifyEl?.querySelector(`.onboarding-pill[data-value="${label}"]`);
      if (pill) pill.classList.add("is-selected");
    });
    handleNeedsSuggestionYes([], data.preferenceText || transcript);
  } catch (error) {
    // Fail silently toward the safest option — never proceed on a guess.
    // The buttons/pills are always still right there, fully functional.
    console.log("[needs] voice interpretation failed, falling back to buttons:", error?.message || error);
    showNeedsSuggestionVoiceUnclear();
  }
}

function showNeedsSuggestionVoiceUnclear() {
  if (!needsSuggestionVoiceHint) return;
  needsSuggestionVoiceHint.textContent = "Didn't quite catch that — go ahead and tap below.";
  needsSuggestionVoiceHint.classList.remove("hidden");
}

if (onboardingGuestBtn) {
  onboardingGuestBtn.addEventListener("click", () => {
    goToOnboardingStep(onboardingSteps.length - 1);
  });
}

if (onboardingGoogleBtn) {
  onboardingGoogleBtn.addEventListener("click", () => {
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(onboardingAnswers));
    } catch (error) {
      // Draft won't survive the redirect — the post-auth resume falls back
      // to the Supabase user's own name/email instead.
    }
    signInWithGoogle();
  });
}

// Screen 1's "already have an account" link — for a returning user who
// isn't in a persisted session, lets them sign back in immediately instead
// of being forced through onboarding again. Same signInWithGoogle() redirect
// flow as the end-of-onboarding button, and — critically — this ALSO needs
// to set ONBOARDING_DRAFT_KEY before redirecting even though there's no
// real draft to save: hasPendingAuthResume (below) keys off this exact
// localStorage entry to know a page load is a redirect return rather than
// a fresh cold load. Without it, bootstrapApp raced Supabase's async
// URL-hash session parsing on the plain cold-load path instead of taking
// the deliberate, awaited resumeOnboardingAfterAuth() path — that race is
// what caused the flicker/bounce-back-to-onboarding bug.
if (onboardingSigninExistingBtn) {
  onboardingSigninExistingBtn.addEventListener("click", () => {
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(onboardingAnswers));
    } catch (error) {
      // Non-fatal — worst case this falls through to the ordinary cold-load
      // session check instead, which still works once Supabase's client
      // finishes parsing the redirect.
    }
    signInWithGoogle();
  });
}

// --- Native Google Sign-In (Capacitor) ---
// Google's OAuth policy explicitly disallows embedded/in-app-WebView sign-in
// (it detects "embedded user-agents" and blocks them with a "this browser
// or app may not be secure" error) — inside the native app, the consent
// screen MUST open in the real system browser via @capacitor/browser, not
// this app's own WKWebView. The redirect back into the app then needs a
// custom URL scheme (registered in Info.plist's CFBundleURLTypes — see
// CAPACITOR_NOTES.md) that @capacitor/app's appUrlOpen listener catches.
//
// IMPORTANT — this is implemented per Supabase + Capacitor's documented
// pattern but has NOT been verified on a real device/simulator (none
// available in this environment): the exact session-exchange call
// (exchangeCodeForSession) should be re-checked against the installed
// @supabase/supabase-js version's current docs, and this whole flow also
// needs the custom-scheme redirect URL added to the Supabase dashboard's
// allowed redirect URLs before it can work at all. See CAPACITOR_NOTES.md.
const NATIVE_OAUTH_REDIRECT_URL = "com.getsabri.app://auth/callback";

async function signInWithGoogleNative() {
  const capBrowser = window.Capacitor?.Plugins?.Browser;
  if (!supabaseClient || !capBrowser) {
    showToast("Sign in isn't available right now.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true, // we open the URL ourselves, in the system browser below
      },
    });
    if (error) throw error;
    if (data?.url) {
      await capBrowser.open({ url: data.url });
    }
  } catch (error) {
    console.log("[debug] signInWithGoogleNative failed:", error?.message || error);
    showToast("Sign in failed — please try again.");
  }
}

if (isCapacitorNative()) {
  const capApp = window.Capacitor?.Plugins?.App;
  if (capApp) {
    capApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url || !url.startsWith(NATIVE_OAUTH_REDIRECT_URL)) return;
      const capBrowser = window.Capacitor?.Plugins?.Browser;
      if (capBrowser) capBrowser.close().catch(() => {});
      try {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(url);
        if (error) throw error;
        if (data?.session) await handleOAuthSignIn(data.session);
      } catch (error) {
        console.log("[debug] native OAuth callback failed:", error?.message || error);
        showToast("Sign in failed — please try again.");
      }
    });
  }
}

async function signInWithGoogle() {
  if (isCapacitorNative()) {
    return signInWithGoogleNative();
  }

  console.log("Sign in button tapped");
  console.log(
    "[debug] supabaseClient exists:",
    !!supabaseClient,
    "| has auth:",
    !!(supabaseClient && supabaseClient.auth),
    "| window.SUPABASE_URL:",
    window.SUPABASE_URL,
    "| window.SUPABASE_ANON_KEY set:",
    !!window.SUPABASE_ANON_KEY,
    "| window.supabase (CDN lib) loaded:",
    typeof window.supabase
  );

  try {
    if (!supabaseClient) {
      throw new Error(
        "supabaseClient is null — window.supabase=" +
          typeof window.supabase +
          ", window.SUPABASE_URL=" +
          window.SUPABASE_URL +
          ", window.SUPABASE_ANON_KEY set=" +
          !!window.SUPABASE_ANON_KEY
      );
    }
    if (!supabaseClient.auth) {
      throw new Error("supabaseClient exists but has no .auth property");
    }

    // skipBrowserRedirect: false (the default, made explicit here) makes
    // Supabase navigate the whole page to Google instead of trying a
    // popup — iOS Safari blocks popups not opened synchronously from the
    // click handler, which is what was silently swallowing the sign-in
    // attempt.
    //
    // redirectTo must be the canonical www. domain, not the bare apex —
    // getsabri.com (no www) 308-redirects to www.getsabri.com at the
    // Vercel/DNS level. Supabase appends the session tokens as a URL hash
    // fragment on this exact URL; routing through an extra cross-host
    // redirect first is an unnecessary hop that risks that fragment not
    // surviving on some browsers. This must also be registered as an
    // allowed redirect URL in the Supabase dashboard (Authentication → URL
    // Configuration).
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://www.getsabri.com/auth/callback",
        skipBrowserRedirect: false,
      },
    });

    console.log("[debug] signInWithOAuth resolved:", { data, error });

    if (error) {
      throw error;
    }
  } catch (error) {
    const message = (error && error.message) || String(error);
    console.log("[debug] signInWithGoogle failed:", message);
    showToast("Sign in failed — please try again.");
  }
}

// If the user tapped "Sign in with Google" from onboarding, the page just
// did a full redirect out to Google and back (redirect mode, not a popup —
// see signInWithGoogle) — every in-memory JS variable (including
// onboardingAnswers) was wiped. This restores the draft saved right before
// the redirect and either:
//  - sign-in succeeded: hand off to handleOAuthSignIn, which saves the
//    profile and skips straight into the main app — no extra tap needed.
//  - sign-in didn't complete (cancelled, error, still pending): restores
//    the answers and drops the user back on the "save" screen so they can
//    retry or go guest, instead of losing 6 screens of answers and
//    restarting from the splash.
async function resumeOnboardingAfterAuth() {
  const session = supabaseClient ? (await supabaseClient.auth.getSession()).data?.session : null;

  if (session) {
    // handleOAuthSignIn owns onboarding's visibility for every success
    // outcome (straight to map, complete-and-go, or route into real
    // questions) — deliberately NOT shown here first. bootstrapApp keeps
    // the boot-loading overlay up for the whole duration of this await, so
    // whichever screen handleOAuthSignIn lands on is already in its final
    // state by the time the overlay lifts, instead of onboarding flashing
    // visible for a moment before being hidden again.
    await handleOAuthSignIn(session);
    return;
  }

  // No session — sign-in was cancelled, failed, or is somehow still
  // pending. This path only needs to show onboarding itself (the success
  // path above never does), landing back on the "save" screen so the user
  // can retry or continue as a guest instead of losing their answers.
  onboarding.classList.remove("hidden");

  let draftAnswers = null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (raw) draftAnswers = JSON.parse(raw);
  } catch (error) {
    draftAnswers = null;
  }

  if (draftAnswers) {
    Object.assign(onboardingAnswers, draftAnswers);
    goToOnboardingStep(onboardingSteps.length - 2); // the "save" screen
  } else if (onboardingStepIndex === 0) {
    // No draft at all — this wasn't actually a redirect return, just a
    // stale flag somehow. Fall back to the normal splash flow.
    advanceOnboarding();
  }
}

// The single place that completes a Google sign-in once a session is
// confirmed, whether it's discovered by the one-shot getSession() check
// above (the common case — the redirect back to /auth/callback) or
// reactively via the onAuthStateChange listener in initializeAuthState
// (the safety net, in case the session wasn't ready at the exact moment of
// that first check). Guarded so it only ever runs once per page load even
// if both paths fire.
let oauthSignInHandled = false;

async function handleOAuthSignIn(session) {
  if (!session || oauthSignInHandled) return;
  oauthSignInHandled = true;

  currentUser = session.user;

  // getAuthoritativeProfile is the ONLY correct way to know this account's
  // real state — see its doc comment for why local state (isOnboarded(),
  // userProfile) must never be trusted here on its own.
  const result = await getAuthoritativeProfile(session);

  if (result.status === "signed-in-complete") {
    applyProfileFromSupabase(result.profile);
    onboarding.classList.add("hidden");
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      // Non-fatal.
    }
  } else if (result.status === "error") {
    // Couldn't confirm this account's real profile (network failure even
    // after retrying) — never guess using local state that might be stale
    // or belong to a different account on a shared device. Surface this
    // honestly: land on onboarding (safe default) with a toast explaining
    // why, rather than silently trusting a cache that hasn't been verified.
    onboarding.classList.remove("hidden");
    showToast("Couldn't confirm your profile — check your connection and try again.");
  } else {
    // "signed-in-incomplete" — Supabase itself confirms this ACCOUNT
    // genuinely has no completed onboarding yet, so it's now safe to look
    // at local state — but only the local state getTrustworthyLocalProfile
    // has verified belongs to THIS account (or was never tied to any
    // account at all, i.e. genuine guest data), never a stranger's
    // leftover profile from a shared device.
    let draftAnswers = null;
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) draftAnswers = JSON.parse(raw);
    } catch (error) {
      draftAnswers = null;
    }

    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      // Non-fatal.
    }

    const fallbackName =
      session.user.user_metadata?.full_name?.split(" ")[0] ||
      session.user.user_metadata?.name?.split(" ")[0] ||
      session.user.email?.split("@")[0] ||
      "friend";

    // A draft with real answers (a stated reason or interests) means this
    // came from the normal end-of-onboarding "save" screen — the whole
    // form is already filled in, sign-in was just the last step. Otherwise,
    // a verified-trustworthy local profile means this device has genuine
    // guest onboarding data ready to attach to this (apparently new)
    // account. Neither present means this came from the screen-1 "already
    // have an account" link on an account that, it turns out, was never
    // actually onboarded — route them into the real onboarding questions
    // instead of silently completing with blank/foreign data.
    const hasRealDraftAnswers =
      draftAnswers && (draftAnswers.reason || (Array.isArray(draftAnswers.interests) && draftAnswers.interests.length > 0));
    const trustworthyLocal = getTrustworthyLocalProfile(session.user.id);

    if (hasRealDraftAnswers || trustworthyLocal.onboarded) {
      Object.assign(onboardingAnswers, draftAnswers || trustworthyLocal.profile || { name: fallbackName });
      // Saves the profile locally AND to Supabase (currentUser is already
      // set above, so completeOnboarding()'s own save-when-signed-in step
      // covers it), sets sabri_onboarded, hides the onboarding overlay, and
      // syncs settings — the user lands straight on the main app's home
      // screen, ready to tour.
      completeOnboarding();
    } else {
      onboardingAnswers.name = fallbackName;
      onboarding.classList.remove("hidden");
      goToOnboardingStep(2); // first real onboarding question, past the path-choice screen
    }
  }

  await loadVisitedPlaceIds();
  updateAccountSettingsUI();
}

if (resetOnboardingBtn) {
  resetOnboardingBtn.addEventListener("click", () => {
    clearLocalIdentityState();
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      // ignore
    }
    location.reload();
  });
}

// Skip the splash's 2s auto-advance entirely when we're resuming a
// just-completed Google sign-in redirect — otherwise the timer and the
// async session check race, and the timer usually wins. Purely a routing
// hint (which check bootstrapApp runs first), never a trust decision about
// profile content — both branches it leads to ultimately go through
// getAuthoritativeProfile() before showing anything, so a stale/wrong
// value here can't cause the wrong profile to be shown, only a slightly
// less direct route to the same correct outcome.
const hasPendingAuthResume = (() => {
  try {
    return !!localStorage.getItem(ONBOARDING_DRAFT_KEY);
  } catch (error) {
    return false;
  }
})();

function hideAppBootLoading() {
  const el = document.getElementById("app-boot-loading");
  if (el) el.classList.add("hidden");
}

// Maps a Supabase profiles row (persistent sign-in restore) into the same
// in-memory shape completeOnboarding() produces from a fresh onboarding
// run, so every downstream consumer of userProfile/settings behaves
// identically either way.
function applyProfileFromSupabase(profile) {
  userProfile = {
    name: profile.name || "",
    reason: profile.reason || "",
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    dietaryRestrictions: Array.isArray(profile.dietary_restrictions) ? profile.dietary_restrictions : [],
    companions: profile.companions || "",
    language: profile.language || "en",
    depth: profile.depth || "standard",
    preferredArchetype: profile.preferred_archetype || "local_friend",
    inferredInterests: Array.isArray(profile.inferred_interests) ? profile.inferred_interests : [],
  };
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    localStorage.setItem(ONBOARDED_KEY, "true");
  } catch (error) {
    // Non-fatal — restored profile just won't persist locally this run.
  }
  // Tags the local cache with whose it is (currentUser must already be set
  // by the caller before this runs) — see getTrustworthyLocalProfile().
  if (currentUser) markLocalProfileOwner(currentUser.id);
  settings.depth = userProfile.depth;
  settings.language = userProfile.language;
  if (profile.voice) settings.voice = profile.voice;
  saveSettings();
  applySettingsToUI();
}

// Decides, once, which of three screens to show: the OAuth-redirect resume
// flow, straight to the map (returning signed-in user with a completed
// profile), or the normal onboarding flow (new user, guest, or a signed-in
// user who never finished onboarding). Runs behind #app-boot-loading so
// there's no flash of the wrong screen while the session/profile check
// (network round trip) is in flight.
async function bootstrapApp() {
  if (hasPendingAuthResume) {
    // Stay behind the boot-loading overlay for the whole resume check —
    // showing onboarding first and then immediately hiding it again (the
    // old behavior here) was the visible flicker/bounce-back a returning
    // user saw when signing in from onboarding screen 1. resumeOnboardingAfterAuth
    // (via handleOAuthSignIn) now owns onboarding's visibility itself for
    // every outcome, so whichever screen it lands on is already final by
    // the time hideAppBootLoading() runs.
    await resumeOnboardingAfterAuth();
    hideAppBootLoading();
    initializeAuthState();
    return;
  }

  // getAuthoritativeProfile is the ONLY correct way to know what to show
  // here — see its doc comment. Never re-add an independent local-state
  // check in this function; that's exactly how the bugs this audit found
  // happened in the first place.
  const result = await getAuthoritativeProfile();

  if (result.status === "signed-in-complete") {
    currentUser = result.session.user;
    applyProfileFromSupabase(result.profile);
    onboarding.classList.add("hidden");
    hideAppBootLoading();
    await initializeAuthState();
    return;
  }

  if (result.status === "signed-in-incomplete") {
    currentUser = result.session.user;
    // Confirmed via Supabase that this ACCOUNT has no completed profile —
    // only local state getTrustworthyLocalProfile has verified belongs to
    // THIS account (or is untagged guest data) is safe to use here.
    const trustworthyLocal = getTrustworthyLocalProfile(result.session.user.id);
    hideAppBootLoading();
    if (trustworthyLocal.onboarded && trustworthyLocal.profile) {
      // Genuine guest-onboarding data on this device, now attaching to
      // this (apparently new-to-Sabri) signed-in account — same migration
      // handleOAuthSignIn performs for the redirect-return case.
      userProfile = trustworthyLocal.profile;
      onboarding.classList.add("hidden");
      saveProfileToSupabase(true);
    } else {
      onboarding.classList.remove("hidden");
      if (onboardingStepIndex === 0) advanceOnboarding();
    }
    initializeAuthState();
    return;
  }

  if (result.status === "error") {
    // Couldn't confirm this account's real profile even after retrying —
    // never fall back to guessing from local state here, it might belong
    // to a different account (see getAuthoritativeProfile's doc comment).
    hideAppBootLoading();
    if (result.session) {
      currentUser = result.session.user;
      showToast("Couldn't load your profile — check your connection and reopen Sabri.");
    }
    onboarding.classList.remove("hidden");
    if (onboardingStepIndex === 0) advanceOnboarding();
    initializeAuthState();
    return;
  }

  // "guest" — no Supabase session at all. localProfile is already vetted
  // by getAuthoritativeProfile/getTrustworthyLocalProfile to not belong to
  // anyone else, so it's safe to trust directly here.
  hideAppBootLoading();
  if (result.localProfile.onboarded) {
    onboarding.classList.add("hidden");
  } else {
    onboarding.classList.remove("hidden");
    setTimeout(() => {
      if (onboardingStepIndex === 0) advanceOnboarding();
    }, 2000);
  }
  initializeAuthState();
}

// Real production regression, root-caused after the fact: a visibilitychange
// firing while bootstrapApp()'s async session check was still in flight
// (very plausible right after a fresh deploy, when an update is most likely
// to be pending) could trigger the PWA update banner's auto-apply path,
// which sets userRequestedUpdate and reloads on the next controllerchange —
// aborting the in-flight sign-in check mid-request. This is the same CLASS
// of bug as the original Sign-In Saga (an under-guarded reload colliding
// with in-progress auth work), just via a new trigger path the original
// userRequestedUpdate guard was never built to anticipate, since it assumed
// a reload could only ever be requested by an explicit banner tap. See
// appBootComplete's use in handleUpdateAvailable below — auto-apply now
// cannot fire until this is true, regardless of which specific async path
// (persistent session, OAuth redirect, guest) bootstrapApp took.
let appBootComplete = false;
bootstrapApp().finally(() => {
  appBootComplete = true;
});

// --- Auth state (Supabase session, cross-session history) ---

async function initializeAuthState() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data?.session?.user || null;

  // Reactive safety net alongside resumeOnboardingAfterAuth's one-shot
  // check: also completes/refreshes sign-in the moment Supabase's SDK
  // itself confirms SIGNED_IN (e.g. if the session wasn't ready yet at the
  // exact moment of that first check), and keeps visited-place history
  // fresh if a user signs in later from Settings mid-session.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAccountSettingsUI();
    // handleOAuthSignIn also covers a guest signing in later from
    // Settings mid-session (isOnboarded() is already true, so it just
    // saves the profile and refreshes visited-place history) — the
    // oauthSignInHandled guard only skips it if this exact sign-in was
    // already handled by resumeOnboardingAfterAuth's one-shot check.
    if (event === "SIGNED_IN" && session) {
      handleOAuthSignIn(session);
    }
  });

  updateAccountSettingsUI();

  if (currentUser) {
    await loadVisitedPlaceIds();
  }
}

async function loadVisitedPlaceIds() {
  if (!currentUser) return;
  try {
    const response = await fetch(`/api/auth/visited-place-ids?userId=${encodeURIComponent(currentUser.id)}`);
    const data = await response.json();
    if (response.ok && Array.isArray(data.placeIds)) {
      visitedPlaceIds = new Set(data.placeIds);
    }
  } catch (error) {
    // Non-fatal — this run just won't cross-session-filter.
  }
}

async function loadReturningUserContext() {
  if (!currentUser) return;
  try {
    const response = await fetch(`/api/auth/user-history?userId=${encodeURIComponent(currentUser.id)}`);
    const data = await response.json();
    if (response.ok) {
      returningUserContext = {
        recentSessions: (data.recentSessions || []).slice(0, 3),
        recentPlaces: (data.recentPlaces || []).slice(0, 10),
      };
      crossSessionVisitedPlaceNames = (data.recentPlaces || [])
        .slice(0, 5)
        .map((place) => place.place_name)
        .filter(Boolean);
    }
  } catch (error) {
    // Non-fatal — the first narration just won't have returning-user framing.
  }
}

async function saveProfileToSupabase(onboardingComplete) {
  if (!currentUser) return;
  try {
    await fetch("/api/auth/save-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        // voice lives in `settings`, not `userProfile` (it's a Settings-panel
        // choice, not an onboarding question) — merge it in here so the
        // saved row still has it for persistent-sign-in restore.
        profile: { ...userProfile, language: settings.language, voice: settings.voice },
        onboardingComplete,
      }),
    });
  } catch (error) {
    // Non-fatal — profile still persists locally via localStorage.
  }
}

async function saveVisitToSupabase(place, narrationText) {
  if (!currentUser) return;
  try {
    await fetch("/api/auth/save-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        placeId: place.placeId,
        placeName: place.name,
        neighborhood: currentNeighborhoodName,
        city: currentCity,
        narrationSummary: narrationText.slice(0, 200),
      }),
    });
  } catch (error) {
    // Non-fatal — local session state still works this run.
  }
}

async function saveQuestionToSupabase(question, answer) {
  if (!currentUser) return;
  try {
    await fetch("/api/auth/save-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        placeId: currentPlaceId,
        question,
        answerSummary: answer.slice(0, 200),
      }),
    });
  } catch (error) {
    // Non-fatal — local session state still works this run.
  }
}

let currentSessionId = null;

function generateSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Fire-and-forget behavioral event logging (see interaction_events in
// supabase/schema.sql) — never awaited by callers, never blocks the UX.
// No-ops for guests (no userId to attribute it to) and swallows any
// failure, since losing an analytics event is never worth surfacing to the
// user or retrying.
function logEvent(eventType, eventData = {}) {
  if (!currentUser) return;
  try {
    fetch("/api/log-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        sessionId: currentSessionId,
        eventType,
        eventData,
        city: currentCity,
      }),
    }).catch(() => {});
  } catch (error) {
    // Non-fatal.
  }
}

// Fired when the app is backgrounded/closed — uses sendBeacon so the
// request actually survives the page being torn down, which a plain fetch
// often doesn't.
// sendBeacon (not plain fetch) for both calls here — this fires as the page
// is being backgrounded/torn down, and sendBeacon is the one delivery
// mechanism reliably guaranteed to survive that, unlike a normal fetch.
function logEventViaBeacon(eventType, eventData) {
  if (!currentUser || !navigator.sendBeacon) return;
  const payload = JSON.stringify({
    userId: currentUser.id,
    sessionId: currentSessionId,
    eventType,
    eventData,
    city: currentCity,
  });
  navigator.sendBeacon("/api/log-event", new Blob([payload], { type: "application/json" }));
}

// Client-triggered stand-in for a periodic cron job (this app has no
// background worker infra) — every 3rd completed session, fires a
// fire-and-forget request to re-derive inferred_interests from recent
// behavior. Non-blocking and silently skipped for guests/on failure.
const INTEREST_INFERENCE_SESSION_INTERVAL = 3;
const SESSION_COUNT_KEY = "sabri_session_count";

function maybeTriggerInterestInference() {
  if (!currentUser) return;
  let sessionCount = 0;
  try {
    sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(sessionCount));
  } catch (error) {
    return;
  }
  if (sessionCount % INTEREST_INFERENCE_SESSION_INTERVAL !== 0) return;

  fetch("/api/infer-interests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id }),
  }).catch(() => {});
}

function saveSessionToSupabase() {
  if (!currentUser) return;
  maybeTriggerInterestInference();
  maybeTriggerRegionMemoryExtraction(); // Pillar 2, no-op unless ENABLE_RELATIONSHIP_CONTINUITY
  const payload = JSON.stringify({
    userId: currentUser.id,
    neighborhood: currentNeighborhoodName,
    city: currentCity,
    placesVisited: Array.from(narratedPlaceIds),
    totalNarrations: totalNarrationsThisSession,
    questionsAsked: totalQuestionsThisSession,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/auth/save-session", new Blob([payload], { type: "application/json" }));
  } else {
    fetch("/api/auth/save-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  if (tourStartedAt) {
    logEventViaBeacon("session_duration", {
      durationMs: Date.now() - tourStartedAt,
      totalDistanceWalkedMeters: Math.round(totalDistanceWalkedMeters),
      totalNarrations: totalNarrationsThisSession,
    });
  }
  if (plannedTourActive && plannedTour) {
    logEventViaBeacon("tour_abandoned", {
      totalStops: plannedTour.stops.length,
      stopsReached: plannedTourStopIndex,
    });
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && currentUser && tourStartedAt) {
    saveSessionToSupabase();
  }
});

function updateAccountSettingsUI() {
  if (!accountSignedIn || !accountGuest) return;

  if (currentUser) {
    accountSignedIn.classList.remove("hidden");
    accountGuest.classList.add("hidden");
    accountNameEl.textContent = userProfile?.name || currentUser.user_metadata?.full_name || "Signed in";
    accountEmailEl.textContent = currentUser.email || "";
  } else {
    accountSignedIn.classList.add("hidden");
    accountGuest.classList.remove("hidden");
  }
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    currentUser = null;
    visitedPlaceIds = new Set();
    // Sign-out used to only clear the Supabase session, leaving this
    // account's onboarded flag/profile/voice-language preferences sitting
    // in localStorage indefinitely — on a shared device, whoever opened
    // Sabri next would silently inherit them (see
    // clearLocalIdentityState/getTrustworthyLocalProfile). Reset both the
    // storage AND the in-memory state so "Signed out" is actually true
    // immediately, not just on the next cold load.
    clearLocalIdentityState();
    userProfile = null;
    settings.voice = DEFAULT_SETTINGS.voice;
    settings.depth = DEFAULT_SETTINGS.depth;
    settings.language = DEFAULT_SETTINGS.language;
    saveSettings();
    applySettingsToUI();
    updateNameSlots();
    updateAccountSettingsUI();
    showToast("Signed out");
  });
}

if (settingsGoogleBtn) {
  settingsGoogleBtn.addEventListener("click", signInWithGoogle);
}

// Requires an explicit second tap (the confirmation panel) before doing
// anything irreversible — a single accidental tap on the red button alone
// never deletes anything.
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", () => {
    deleteAccountConfirm.classList.remove("hidden");
  });
}

if (deleteAccountConfirmBtn) {
  deleteAccountConfirmBtn.addEventListener("click", async () => {
    deleteAccountConfirmBtn.disabled = true;
    deleteAccountConfirmBtn.textContent = "Deleting...";

    try {
      if (currentUser) {
        await fetch("/api/auth/delete-account", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        if (supabaseClient) await supabaseClient.auth.signOut();
      }
    } catch (error) {
      // Proceed with the local reset regardless — the user asked to leave.
    }

    try {
      localStorage.clear();
    } catch (error) {
      // Non-fatal.
    }

    location.reload();
  });
}

// initializeAuthState() is invoked once from bootstrapApp() (see above,
// near hasPendingAuthResume) after it's decided which screen to show —
// not called bare here, so it never races the boot-loading/onboarding gate.

// --- Settings (voice / tour depth / language), persisted to localStorage ---

const SETTINGS_STORAGE_KEY = "sabri-settings";
const DEFAULT_SETTINGS = { voice: "onyx", depth: "standard", language: "en" };
const SPEECH_RECOGNITION_LANGS = {
  en: "en-US",
  he: "he-IL",
  ar: "ar-SA",
  es: "es-ES",
  fr: "fr-FR",
  ru: "ru-RU",
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // localStorage may be unavailable (private browsing) — non-fatal.
  }
}

const settings = loadSettings();
applySettingsToUI();

function applySettingsToUI() {
  voiceCards.forEach((card) => card.classList.toggle("is-active", card.dataset.voice === settings.voice));
  depthPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.depth === settings.depth));
  if (languageSelect) languageSelect.value = settings.language;
  applyActiveVoiceProviderUI();
}

// Real bug this fixes: after the Inworld TTS switch, Settings and Edit
// Preferences kept showing the OpenAI voice picker (Onyx/Nova/Shimmer/Echo)
// even though settings.voice has no effect at all under Inworld — it picks
// one fixed voice per language (see INWORLD_LANGUAGE_VOICE_MAP in
// server.js), so the picker was actively lying about what the guide would
// sound like. window.TTS_PROVIDER / window.INWORLD_LANGUAGE_VOICE_MAP are
// injected by renderIndexHtml in server.js. Written to read the active
// provider rather than assume Inworld, so this keeps working correctly if
// TTS_PROVIDER is ever switched back to "openai" (the picker reappears
// automatically, no hardcoding either provider's names as "the" names).
// preferencesLanguage lets the Edit Preferences drawer preview the readonly
// note against its own draft language selection (not yet saved to
// settings.language — see populatePreferencesForm/preferencesSaveBtn) so
// switching language there updates the note live without mutating global
// settings before Save Changes is actually clicked.
function applyActiveVoiceProviderUI(preferencesLanguage) {
  const provider = window.TTS_PROVIDER || "openai";
  const isInworld = provider === "inworld";

  const settingsOptions = document.getElementById("settings-voice-options");
  const settingsReadonly = document.getElementById("settings-voice-readonly");
  const preferencesOptions = document.getElementById("preferences-voice");
  const preferencesReadonly = document.getElementById("preferences-voice-readonly");

  const voiceMap = window.INWORLD_LANGUAGE_VOICE_MAP || {};
  const noVoiceText = "Voice selection isn't available for the current guide voice provider.";
  const textFor = (language) => {
    const activeVoiceName = voiceMap[language] || voiceMap.en;
    return activeVoiceName
      ? `Your guide speaks with the "${activeVoiceName}" voice for the selected language. Voice choice isn't available for this provider — it's tied to language.`
      : noVoiceText;
  };

  if (settingsOptions) settingsOptions.classList.toggle("hidden", isInworld);
  if (settingsReadonly) {
    settingsReadonly.classList.toggle("hidden", !isInworld);
    if (isInworld) settingsReadonly.textContent = textFor(settings.language);
  }
  if (preferencesOptions) preferencesOptions.classList.toggle("hidden", isInworld);
  if (preferencesReadonly) {
    preferencesReadonly.classList.toggle("hidden", !isInworld);
    if (isInworld) preferencesReadonly.textContent = textFor(preferencesLanguage || settings.language);
  }
}

voiceCards.forEach((card) => {
  card.addEventListener("click", () => {
    settings.voice = card.dataset.voice;
    voiceCards.forEach((c) => c.classList.remove("is-active"));
    card.classList.add("is-active");
    saveSettings();
    playVoiceSample(card.dataset.voice);
  });
});

depthPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    settings.depth = pill.dataset.depth;
    depthPills.forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    saveSettings();
  });
});

if (languageSelect) {
  languageSelect.addEventListener("change", () => {
    settings.language = languageSelect.value;
    saveSettings();
    applyActiveVoiceProviderUI();
  });
}

async function playVoiceSample(voice) {
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Welcome to Sabri, your personal guide", voice, speed: 1 }),
    });
    if (!response.ok) return;

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/wav" });

    if (currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
    }
    currentAudioObjectUrl = URL.createObjectURL(blob);
    audioPlayer.src = currentAudioObjectUrl;
    audioPlayer.play().catch(() => {});
  } catch (error) {
    // A failed sample preview isn't critical — just don't play anything.
  }
}

settingsBtn.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

function openSettings() {
  updateAccountSettingsUI();
  // Real field bug this fixes: applyActiveVoiceProviderUI() was already
  // called from applySettingsToUI() and the language-change listeners, but
  // never from openSettings() itself — so a fresh page load that hadn't
  // yet hit one of those other triggers (e.g. no profile restore, no
  // language change) showed the stale OpenAI-style voice picker the
  // moment Settings was opened, even under Inworld. Confirmed by reading
  // openSettings() directly: it was the one real gap, not a broken
  // applyActiveVoiceProviderUI() itself (that function is correct and
  // covers every voice-picker surface in index.html — Settings and Edit
  // Preferences, the only two that exist).
  applyActiveVoiceProviderUI();
  // Pillar 3 (ENABLE_NEEDS_ROUTING) — the toggle only makes sense once the
  // server has the feature enabled at all.
  if (settingsNeedsSuggestionsSection) settingsNeedsSuggestionsSection.classList.toggle("hidden", !ENABLE_NEEDS_ROUTING);
  settingsDrawer.classList.add("is-open");
  settingsDrawer.setAttribute("aria-hidden", "false");
  settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
  settingsDrawer.classList.remove("is-open");
  settingsDrawer.setAttribute("aria-hidden", "true");
  settingsOverlay.classList.add("hidden");
}

// --- Edit Preferences (Settings > Account, signed-in users only) ---
// Reuses the onboarding pill/voice-card/depth-pill components but tracks
// its own draft selection independently of the live settings object —
// nothing takes effect until Save Changes commits it all at once (see
// preferencesSaveBtn handler), matching "update in-memory state at the
// same time as the Supabase write."

function openPreferences() {
  if (!isOnboarded()) {
    // Shouldn't normally be reachable (the button only shows once signed
    // in, which by then always implies onboarding is complete) — but route
    // to onboarding rather than showing a broken/empty preferences form.
    closeSettings();
    onboarding.classList.remove("hidden");
    return;
  }
  closeSettings();
  populatePreferencesForm();
  preferencesDrawer.classList.add("is-open");
  preferencesDrawer.setAttribute("aria-hidden", "false");
  preferencesOverlay.classList.remove("hidden");
}

function closePreferences() {
  preferencesDrawer.classList.remove("is-open");
  preferencesDrawer.setAttribute("aria-hidden", "true");
  preferencesOverlay.classList.add("hidden");
}

function populatePreferencesForm() {
  preferencesNameInput.value = userProfile?.name || "";
  const currentInterests = new Set(userProfile?.interests || []);
  preferencesInterestsContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
    pill.classList.toggle("is-selected", currentInterests.has(pill.dataset.value));
  });
  if (preferencesDietarySection) preferencesDietarySection.classList.toggle("hidden", !ENABLE_NEEDS_ROUTING);
  if (preferencesDietaryContainer) {
    const currentDietary = new Set(userProfile?.dietaryRestrictions || []);
    preferencesDietaryContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
      pill.classList.toggle("is-selected", currentDietary.has(pill.dataset.value));
    });
  }
  preferencesVoiceCards.forEach((card) => card.classList.toggle("is-active", card.dataset.voice === settings.voice));
  const currentDepth = userProfile?.depth || settings.depth;
  preferencesDepthPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.depth === currentDepth));
  if (preferencesLanguageSelect) preferencesLanguageSelect.value = settings.language;
  applyActiveVoiceProviderUI();
  const currentArchetype = userProfile?.preferredArchetype || "local_friend";
  if (preferencesArchetypeContainer) {
    preferencesArchetypeContainer.querySelectorAll(".onboarding-pace-option").forEach((option) => {
      option.classList.toggle("is-selected", option.dataset.archetype === currentArchetype);
    });
  }
}

if (preferencesArchetypeContainer) {
  preferencesArchetypeContainer.querySelectorAll(".onboarding-pace-option").forEach((option) => {
    option.addEventListener("click", () => {
      preferencesArchetypeContainer
        .querySelectorAll(".onboarding-pace-option")
        .forEach((o) => o.classList.remove("is-selected"));
      option.classList.add("is-selected");
    });
  });
}

preferencesInterestsContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
  pill.addEventListener("click", () => pill.classList.toggle("is-selected"));
});

if (preferencesDietaryContainer) {
  preferencesDietaryContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
    pill.addEventListener("click", () => pill.classList.toggle("is-selected"));
  });
}

preferencesVoiceCards.forEach((card) => {
  card.addEventListener("click", () => {
    preferencesVoiceCards.forEach((c) => c.classList.remove("is-active"));
    card.classList.add("is-active");
  });
});

if (preferencesLanguageSelect) {
  preferencesLanguageSelect.addEventListener("change", () => {
    applyActiveVoiceProviderUI(preferencesLanguageSelect.value);
  });
}

preferencesDepthPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    preferencesDepthPills.forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
  });
});

if (editPreferencesBtn) editPreferencesBtn.addEventListener("click", openPreferences);
if (preferencesClose) preferencesClose.addEventListener("click", closePreferences);
if (preferencesOverlay) preferencesOverlay.addEventListener("click", closePreferences);

if (preferencesSaveBtn) {
  preferencesSaveBtn.addEventListener("click", async () => {
    const name = preferencesNameInput.value.trim();
    const interests = Array.from(preferencesInterestsContainer.querySelectorAll(".onboarding-pill.is-selected")).map(
      (pill) => pill.dataset.value
    );
    const dietaryRestrictions = preferencesDietaryContainer
      ? Array.from(preferencesDietaryContainer.querySelectorAll(".onboarding-pill.is-selected")).map((pill) => pill.dataset.value)
      : userProfile?.dietaryRestrictions || [];
    const activeVoiceCard = Array.from(preferencesVoiceCards).find((card) => card.classList.contains("is-active"));
    const activeDepthPill = Array.from(preferencesDepthPills).find((pill) => pill.classList.contains("is-active"));
    const voice = activeVoiceCard ? activeVoiceCard.dataset.voice : settings.voice;
    const depth = activeDepthPill ? activeDepthPill.dataset.depth : settings.depth;
    const language = preferencesLanguageSelect ? preferencesLanguageSelect.value : settings.language;
    const activeArchetypeOption = preferencesArchetypeContainer
      ? preferencesArchetypeContainer.querySelector(".onboarding-pace-option.is-selected")
      : null;
    const preferredArchetype = activeArchetypeOption
      ? activeArchetypeOption.dataset.archetype
      : userProfile?.preferredArchetype || "local_friend";

    // Commit the draft to live app state (affects the very next narration,
    // no restart needed) at the same time as the Supabase write below.
    const archetypeChanged = preferredArchetype !== userProfile?.preferredArchetype;
    userProfile = { ...userProfile, name, interests, dietaryRestrictions, depth, language, preferredArchetype };
    settings.voice = voice;
    settings.depth = depth;
    settings.language = language;

    // A different guide means a different persona — clear the cached one so
    // the next narration fetches (and introduces) the new one, rather than
    // silently keeping the old name around.
    if (archetypeChanged) {
      currentPersona = null;
      currentPersonaCity = null;
      currentPersonaLanguage = null;
    }

    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    } catch (error) {
      // Non-fatal — still applied in-memory for this session.
    }
    saveSettings();
    applySettingsToUI();
    updateNameSlots();

    preferencesSaveBtn.disabled = true;
    preferencesSaveBtn.textContent = "Saving...";
    await saveProfileToSupabase();
    preferencesSaveBtn.disabled = false;
    preferencesSaveBtn.textContent = "Save Changes";

    updateAccountSettingsUI();
    closePreferences();
    showToast("Preferences updated");
  });
}

// --- Report a Problem (Settings > Support) ---
// Deliberately reachable whether or not the tester has signed in — see
// /api/feedback in server.js and feedback_reports in supabase/schema.sql.
// Kept intentionally lightweight: one textarea, one optional screenshot,
// one submit button, no categories/severity — the goal is a tester filing
// this mid-walk without breaking stride.

// A rough, best-effort snapshot of "what screen was the tester looking at"
// — not a real state machine, just checks which top-level overlay (if any)
// is currently visible. Good enough for triage context; see app_context in
// the feedback_reports schema comment for the full rationale.
function getCurrentAppScreen() {
  if (onboarding && !onboarding.classList.contains("hidden")) return "onboarding";
  if (cameraOverlay && !cameraOverlay.classList.contains("hidden")) return "camera";
  if (tourPlanner && !tourPlanner.classList.contains("hidden")) return "guided_tour_planner";
  if (settingsDrawer && settingsDrawer.classList.contains("is-open")) return "settings";
  return "wander_mode";
}

async function getServiceWorkerVersion() {
  if (!("caches" in window)) return null;
  try {
    const keys = await caches.keys();
    return keys.find((key) => key.startsWith("sabri-cache-")) || null;
  } catch (error) {
    return null;
  }
}

let feedbackScreenshotDataUrl = null;

function resetFeedbackForm() {
  feedbackMessageInput.value = "";
  feedbackScreenshotInput.value = "";
  feedbackScreenshotDataUrl = null;
  feedbackScreenshotPreview.classList.add("hidden");
  feedbackScreenshotPreviewImg.src = "";
  feedbackError.classList.add("hidden");
  feedbackError.textContent = "";
  feedbackConfirm.classList.add("hidden");
  feedbackSubmitBtn.disabled = false;
  feedbackSubmitBtn.textContent = "Submit";
}

function openFeedbackForm() {
  closeSettings();
  resetFeedbackForm();
  feedbackDrawer.classList.add("is-open");
  feedbackDrawer.setAttribute("aria-hidden", "false");
  feedbackOverlay.classList.remove("hidden");
}

function closeFeedbackForm() {
  feedbackDrawer.classList.remove("is-open");
  feedbackDrawer.setAttribute("aria-hidden", "true");
  feedbackOverlay.classList.add("hidden");
}

if (reportProblemBtn) reportProblemBtn.addEventListener("click", openFeedbackForm);
if (feedbackClose) feedbackClose.addEventListener("click", closeFeedbackForm);
if (feedbackOverlay) feedbackOverlay.addEventListener("click", closeFeedbackForm);

if (feedbackScreenshotInput) {
  feedbackScreenshotInput.addEventListener("change", () => {
    const file = feedbackScreenshotInput.files && feedbackScreenshotInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      feedbackError.textContent = "Please choose an image file.";
      feedbackError.classList.remove("hidden");
      feedbackScreenshotInput.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      feedbackError.textContent = "That screenshot is too large (5MB max).";
      feedbackError.classList.remove("hidden");
      feedbackScreenshotInput.value = "";
      return;
    }
    feedbackError.classList.add("hidden");
    const reader = new FileReader();
    reader.onload = () => {
      feedbackScreenshotDataUrl = reader.result;
      feedbackScreenshotPreviewImg.src = feedbackScreenshotDataUrl;
      feedbackScreenshotPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
}

if (feedbackScreenshotRemoveBtn) {
  feedbackScreenshotRemoveBtn.addEventListener("click", () => {
    feedbackScreenshotInput.value = "";
    feedbackScreenshotDataUrl = null;
    feedbackScreenshotPreview.classList.add("hidden");
    feedbackScreenshotPreviewImg.src = "";
  });
}

if (feedbackSubmitBtn) {
  feedbackSubmitBtn.addEventListener("click", async () => {
    const message = feedbackMessageInput.value.trim();
    if (!message) {
      feedbackError.textContent = "Let us know what happened before submitting.";
      feedbackError.classList.remove("hidden");
      return;
    }

    feedbackError.classList.add("hidden");
    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.textContent = "Submitting...";

    const serviceWorkerVersion = await getServiceWorkerVersion();
    const appContext = {
      screen: getCurrentAppScreen(),
      city: currentCity || null,
      session_id: currentSessionId || null,
      service_worker_version: serviceWorkerVersion,
      user_agent: navigator.userAgent,
    };

    let screenshotBase64 = null;
    let screenshotMediaType = null;
    if (feedbackScreenshotDataUrl) {
      const match = /^data:([^;]+);base64,/.exec(feedbackScreenshotDataUrl);
      screenshotMediaType = match ? match[1] : "image/jpeg";
      screenshotBase64 = feedbackScreenshotDataUrl;
    }

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          screenshotBase64,
          screenshotMediaType,
          userId: currentUser ? currentUser.id : null,
          appContext,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit — please try again.");
      }

      logEvent("feedback_submitted", { hasScreenshot: Boolean(screenshotBase64), screen: appContext.screen });

      feedbackConfirm.classList.remove("hidden");
      feedbackSubmitBtn.textContent = "Submit";
      feedbackSubmitBtn.disabled = false;
      setTimeout(closeFeedbackForm, 1200);
    } catch (error) {
      feedbackError.textContent = error.message || "Failed to submit — please try again.";
      feedbackError.classList.remove("hidden");
      feedbackSubmitBtn.disabled = false;
      feedbackSubmitBtn.textContent = "Submit";
    }
  });
}

// --- PWA: service worker + update lifecycle ---
//
// The service worker itself already calls skipWaiting() on install and
// clients.claim() on activate (see service-worker.js), so a new worker
// activates and starts controlling fetches immediately rather than sitting
// idle until every open tab/instance closes — that part of the old
// "testers have to delete and reinstall" problem is already solved
// server-side.
//
// What's still missing is telling the ALREADY-OPEN page that new code is
// available: activating a new worker doesn't retroactively update the
// JavaScript already running in memory. That part used to rely entirely on
// a fresh page load/navigation to even ASK the browser whether a new
// service-worker.js exists — fine for a browser tab, but a standalone PWA
// reopened from the home screen icon (especially on iOS Safari) very often
// RESUMES a suspended process rather than performing a real navigation, so
// that check might rarely or never run. A tester who deletes and
// reinstalls the PWA is really just forcing the one code path (a genuine
// fresh load) that was ever checking for updates at all. Fixed below by
// also actively polling registration.update() on every foreground/resume,
// not just on load — see checkForUpdateAndMaybeApply().
//
// Silently reloading the moment an update lands is jarring if someone's
// mid-narration on a real walk, so the decision is: if nothing's actively
// playing/listening/mid-sign-in right now, apply and reload immediately
// (no banner, no tap needed) — deliberately more assertive than a
// dismissible banner would be, since this is a fast-iterating beta where
// testers giving feedback against stale code is a real cost. If something
// IS active, fall back to the banner so the update doesn't interrupt them
// — but the very next foreground gets another chance to auto-apply, so a
// tester is never permanently stuck more than one open/close cycle behind.
//
// Skipped entirely inside the native Capacitor app: it bundles its own
// assets locally and updates via the App Store, not live cache
// invalidation — registering a service worker there would be pure
// overhead at best, and at worst an unknown interaction with the native
// WebView's own lifecycle (backgrounding/foregrounding) that was never
// designed for or tested. See CAPACITOR_NOTES.md.
let swRegistration = null;

if ("serviceWorker" in navigator && !isCapacitorNative()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        swRegistration = registration;

        // A worker found here mid-install (rather than via the
        // "updatefound" event below) covers the case where an update was
        // already installing before this page finished loading.
        if (registration.waiting && navigator.serviceWorker.controller) {
          handleUpdateAvailable(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            // "installed" while a controller ALREADY exists means this is a
            // genuine update over a previously-active version — not the
            // very first install on a fresh device, which also passes
            // through "installed" but has no existing controller yet and
            // needs no banner (there's nothing to update FROM).
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              handleUpdateAvailable(registration);
            }
          });
        });
      })
      .catch(() => {});
  });

  // Actively re-checks for a new service-worker.js every time the app is
  // foregrounded — not just relying on whatever infrequent automatic check
  // the browser does on its own schedule (typically throttled to roughly
  // once per 24h per spec, tied to navigation), which is exactly the gap
  // that let a standalone home-screen PWA run stale JS indefinitely.
  // "visible" fires both on a browser tab regaining focus and (per WebKit's
  // own PWA lifecycle docs) when a standalone iOS PWA resumes from a
  // suspended background state — the one signal available for "the app was
  // just reopened" that doesn't depend on a real navigation happening.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    checkForUpdateAndMaybeApply();
  });
  // Belt-and-suspenders for the bfcache-restore case (event.persisted) —
  // some browsers restore a page from the back-forward cache without a
  // visibilitychange firing at all.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) checkForUpdateAndMaybeApply();
  });
  // Real bug this fixes: skipWaiting()/clients.claim() in service-worker.js
  // (unconditional, already correct) only affect NETWORK REQUESTS from an
  // already-open tab — they don't reload the page's already-parsed shell
  // (index.html, with that load's env-var injection baked in), so a page
  // still needs to actually detect an update and reload. Every check above
  // is tied to a visibility TRANSITION (backgrounding/returning, bfcache
  // restore) — a tab that's watched continuously through an entire deploy
  // (e.g. testing a flag: deploy, then just look at the still-open tab)
  // never fires any of them, so it can run stale JS indefinitely until
  // manually force-closed. This periodic check is the fix: re-checks on an
  // interval too, not only on transitions, so a continuously-visible tab
  // still discovers updates. Guarded to skip entirely while hidden (no
  // point checking, and avoids needless network/battery use backgrounded)
  // — visibilitychange already covers that transition when it happens.
  const UPDATE_CHECK_INTERVAL_MS = 3 * 60 * 1000;
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    checkForUpdateAndMaybeApply();
  }, UPDATE_CHECK_INTERVAL_MS);

  // Reloads when the new worker actually takes control — either because
  // the user tapped the update banner, or because handleUpdateAvailable()
  // decided it was safe to auto-apply (userRequestedUpdate covers both;
  // the name predates the auto-apply path but the guard's purpose is the
  // same either way — see below).
  //
  // This guard is the fix for a real production bug: service-worker.js's
  // self.skipWaiting() (install) and self.clients.claim() (activate) are
  // BOTH unconditional by design (see the comment above), so a new worker
  // silently self-activates and claims every open page on its own,
  // completely independent of whether anyone ever saw or tapped the
  // banner. Without this guard, *every* controllerchange event — including
  // one firing on a totally ordinary page load that just happens to
  // coincide with a fresh deploy activating — triggered an unrequested
  // location.reload(). The Google OAuth sign-in flow full-page-navigates
  // to accounts.google.com and back, landing on a freshly loaded page at
  // exactly the moment bootstrapApp()/handleOAuthSignIn() are mid-flight
  // parsing the returned session — an unrequested reload right then aborts
  // that in-progress resume, which is what "looks like it's working then
  // bounces back to onboarding" actually was.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloadedForUpdate || !userRequestedUpdate) return;
    hasReloadedForUpdate = true;
    window.location.reload();
  });
}

let hasReloadedForUpdate = false;
let userRequestedUpdate = false;
let updateFallbackTimer = null;

// Actively asks the browser to re-fetch service-worker.js and compare it
// byte-for-byte against the currently installed one — this is the part
// that was previously only ever triggered as a side effect of a fresh page
// load. Safe/cheap to call often: it's a no-op if nothing's changed.
async function checkForUpdateAndMaybeApply() {
  if (!swRegistration) return;
  try {
    await swRegistration.update();
  } catch (error) {
    // Offline or a transient network hiccup — next foreground tries again.
    return;
  }
  if (swRegistration.waiting && navigator.serviceWorker.controller) {
    handleUpdateAvailable(swRegistration);
  }
}

// Deliberately more assertive than a plain dismissible banner for this
// beta/rapid-iteration phase specifically: if nothing that would be
// disrupted by a reload is actually in progress right now, apply the
// update immediately with no tap required. Otherwise, fall back to the
// banner — and since checkForUpdateAndMaybeApply() re-runs on every
// foreground, a tester who declined because they were mid-narration gets
// re-offered (and likely auto-applied) the moment they're not.
function handleUpdateAvailable(registration) {
  const midAuthResume = (() => {
    try {
      return !!localStorage.getItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      return false;
    }
  })();
  // appBootComplete is the fix for a real regression: without it, this
  // could auto-apply (and reload) while bootstrapApp()'s async session
  // check was still resolving, silently losing an in-progress sign-in. See
  // appBootComplete's own comment at the bootstrapApp() call site.
  const safeToApplyNow = appBootComplete && !isNarrating && !isConversing && !midAuthResume;

  if (safeToApplyNow) {
    applyUpdate(registration);
  } else {
    showUpdateBanner(registration);
  }
}

// Real bug found in device testing: tapping the banner showed a "pressed"
// state and then just sat there forever — never reloading, never telling
// the user anything, never going away. Root cause: registration.waiting
// can legitimately already be empty by the time this runs (e.g. a
// background auto-apply check from an earlier foreground already consumed
// it seconds before the user got around to tapping the still-visible
// banner) — in that case controllerchange never fires, and there was no
// fallback at all. Fixed two ways: (1) an explicit "Updating..." state so
// the tap always gives visible feedback, (2) a fallback timer that forces
// the reload directly if controllerchange doesn't fire promptly, so a tap
// always resolves to a reload one way or another instead of ever getting
// stuck. Also the single function both the click handler AND the
// background auto-apply path call, so if the banner happens to already be
// showing when an auto-apply fires, it flips to the same "Updating..."
// state instead of being silently reloaded out from under a stale-looking
// "Update" button.
function applyUpdate(registration) {
  userRequestedUpdate = true;
  if (updateBannerCta) {
    updateBannerCta.disabled = true;
    updateBannerCta.textContent = "Updating...";
  }

  const waitingWorker = registration.waiting;
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  clearTimeout(updateFallbackTimer);
  updateFallbackTimer = setTimeout(() => {
    if (!hasReloadedForUpdate) {
      hasReloadedForUpdate = true;
      window.location.reload();
    }
  }, 4000);
}

function showUpdateBanner(registration) {
  if (!updateBanner || updateBanner.classList.contains("is-visible")) return;
  updateBannerCta.disabled = false;
  updateBannerCta.textContent = "Update";
  updateBanner.classList.add("is-visible");
  updateBannerCta.onclick = () => applyUpdate(registration);
}

// --- PWA install banner ---
// iOS Safari never fires beforeinstallprompt, so there's no way to trigger
// a native install flow there — instead we show manual step-by-step
// instructions. On Android/Chrome, the same banner shell shows a real
// "Install" button wired to the native prompt.

const INSTALL_BANNER_DISMISSED_KEY = "sabri-install-banner-dismissed";
const isIosSafari = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone === true;

let deferredInstallPrompt = null;

function isInstallBannerDismissed() {
  try {
    return localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function dismissInstallBanner() {
  installBanner.classList.remove("is-visible");
  try {
    localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true");
  } catch (error) {
    // localStorage unavailable — banner just won't remember being dismissed.
  }
}

function showInstallBanner() {
  if (isInstallBannerDismissed()) return;
  installBanner.classList.add("is-visible");
}

function configureInstallBannerForIos() {
  installBannerIosOnly.forEach((el) => el.classList.remove("hidden"));
  installBannerCta.textContent = "Got it";
  installBannerCta.onclick = dismissInstallBanner;
}

function configureInstallBannerForAndroid() {
  installBannerIosOnly.forEach((el) => el.classList.add("hidden"));
  installBannerCta.textContent = "Install";
  installBannerCta.onclick = async () => {
    if (!deferredInstallPrompt) {
      dismissInstallBanner();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dismissInstallBanner();
  };
}

installBannerClose.addEventListener("click", dismissInstallBanner);

// "Install to your home screen" is meaningless inside the native app —
// it's already installed. Guarded out entirely there rather than relying
// on isStandalone/beforeinstallprompt to naturally not fire, since neither
// is guaranteed never to fire inside a native WebView.
if (isIosSafari && !isStandalone && !isCapacitorNative()) {
  configureInstallBannerForIos();
  setTimeout(showInstallBanner, 3000);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isIosSafari && !isCapacitorNative()) {
    configureInstallBannerForAndroid();
    showInstallBanner();
  }
});

window.addEventListener("appinstalled", () => {
  dismissInstallBanner();
  deferredInstallPrompt = null;
});

// --- Map-based home screen ---
// Full-screen Google Map that's always live (not gated behind Start Tour) —
// the user location dot, place pins, and everything else layer on top of it
// as the tour progresses. See initMap() below for the warm custom style.

// Warm, sandy/parchment style tuned for bright-sunlight readability — the
// opposite of a typical dark/night map style.
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F2E9DA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3A2F22" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F2E9DA" }, { weight: 3 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#A9CBD8" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#EFE3CF" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#E4D8BE" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#C9D9B5" }] },
  // Default Google business/POI icons compete visually with our own place
  // pins (see upsertPlaceMarker) — hide them and their labels entirely.
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FBF6EC" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#F7EFDD" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#E9C989" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#C9B896" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const MAP_WORLD_ZOOM = 2;
const MAP_CITY_ZOOM = 17;
const MAP_WIDE_ZOOM = 15;

let map = null;

// Mobile viewport-height fix — 100dvh alone isn't enough on some devices/
// browser versions, and Google Maps specifically needs to be told to
// re-measure its container after a real resize or it leaves a stale
// gray/white gap where its internal canvas didn't grow to fill the
// corrected height. --app-vh (used by .app in style.css) is the most
// robust of the three height fallbacks since it reacts in real time to the
// dynamic toolbar showing/hiding, rather than relying on the browser's own
// dvh implementation.
function setAppViewportHeight() {
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--app-vh", `${viewportHeight * 0.01}px`);
  if (map) {
    google.maps.event.trigger(map, "resize");
  }
}
setAppViewportHeight();
window.addEventListener("resize", setAppViewportHeight);
window.addEventListener("orientationchange", setAppViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", setAppViewportHeight);
}
let userLocationMarker = null;
const placeMarkersByPlaceId = new Map();
let activeInfoWindow = null;
let hasMapCenteredOnUser = false;

function waitForGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    const interval = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(interval);
        resolve();
      }
    }, 150);
  });
}

// Waits briefly for the @googlemaps/markerclusterer module (see index.html
// — loaded as an ES module and re-exposed as window.MarkerClusterer, since
// this package ships ESM-only with no reliable classic-script global) to
// finish loading. Clustering is a performance optimization, not a
// correctness requirement, so this gives up after a few seconds and lets
// initMap() fall back to unclustered markers rather than blocking the whole
// map on a slow/failed third-party script load.
function waitForMarkerClusterer(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (window.MarkerClusterer) {
      resolve(true);
      return;
    }
    const started = Date.now();
    const interval = setInterval(() => {
      if (window.MarkerClusterer) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 150);
  });
}

// The clusterer instance (distinct from window.MarkerClusterer, which is
// the constructor/class itself).
let mapMarkerClusterer = null;

async function initMap() {
  if (!mapEl) {
    console.log("[map] initMap aborted — #map element not found in DOM");
    return;
  }
  console.log("[map] waiting for Google Maps JS API to load...");
  await waitForGoogleMaps();
  console.log("[map] Google Maps JS API ready, creating map instance");

  // Neutral world view — no specific city — until the user's real GPS fix
  // re-centers this (see updateUserLocationOnMap).
  map = new google.maps.Map(mapEl, {
    center: { lat: 20, lng: 0 },
    zoom: MAP_WORLD_ZOOM,
    disableDefaultUI: true,
    // "greedy" is correct here specifically because the map fills the
    // entire viewport with nothing scrollable behind it — there's no page
    // scroll for a one-finger drag to conflict with, unlike a map embedded
    // within a scrollable page (where "cooperative" would be the right
    // choice). Re-verified this is still the right call while investigating
    // the sluggish pan/zoom complaint — gestureHandling wasn't the cause.
    gestureHandling: "greedy",
    styles: MAP_STYLE,
  });
  console.log("[map] map instance created");

  setupManualPanDetection();
  setupViewportPinRefresh();

  // Dozens of individual DOM-backed google.maps.Marker instances (one per
  // nearby place, and this count is only going up now that pin discovery
  // covers a wider area — see refreshMapPinsAroundUser) is exactly the kind
  // of thing that makes pan/zoom feel jerky: the browser has to reposition
  // every one of them on every frame. Clustering collapses nearby pins into
  // a single circle until the user zooms in, which is both faster to
  // render and less visually noisy.
  const hasClusterer = await waitForMarkerClusterer();
  if (hasClusterer) {
    mapMarkerClusterer = new window.MarkerClusterer({ map, markers: [] });
    console.log("[map] marker clustering enabled");
  } else {
    console.log("[map] marker clustering unavailable — falling back to unclustered markers");
  }
}

initMap();

// Guided Destination pillar — two-arrow redesign, replacing the old
// separate single-arrow DOM element entirely (removed). Arrow 1 (heading)
// is genuinely "existing behavior, keep as-is" — same shape/position as
// before this pillar ever existed; Arrow 2 (bearing to activeDestination)
// only ever renders once a destination is active, and the two visually
// merge/glow together within COMPASS_MERGE_THRESHOLD_DEGREES (with wider
// COMPASS_UNMERGE_THRESHOLD_DEGREES hysteresis to avoid flicker right at
// one fixed boundary — see isCompassMerged, updated here since this is
// where both angles are actually compared).
function buildUserLocationIcon(heading, bearingToDestination) {
  const hasHeading = typeof heading === "number" && !Number.isNaN(heading);
  const hasDestinationBearing = typeof bearingToDestination === "number" && !Number.isNaN(bearingToDestination);

  let merged = false;
  if (hasHeading && hasDestinationBearing) {
    let diff = Math.abs(heading - bearingToDestination) % 360;
    if (diff > 180) diff = 360 - diff;
    const threshold = isCompassMerged ? COMPASS_UNMERGE_THRESHOLD_DEGREES : COMPASS_MERGE_THRESHOLD_DEGREES;
    merged = diff <= threshold;
  }
  isCompassMerged = merged;

  const headingArrow = hasHeading
    ? `<g transform="rotate(${heading} 28 28)">` +
      `<path d="M28 6 L34 20 L28 15 L22 20 Z" fill="#D4A853"/>` +
      (merged ? `<animate attributeName="opacity" values="1;0.45;1" dur="1.1s" repeatCount="indefinite"/>` : "") +
      `</g>`
    : "";
  // Un-merged: a plain, un-glowing outline (per spec, "returns to its
  // plain, un-glowing rotating-indicator state"). Merged: solid and
  // pulsing together with Arrow 1.
  const destinationArrow = hasDestinationBearing
    ? `<g transform="rotate(${bearingToDestination} 28 28)">` +
      (merged
        ? `<path d="M28 2 L37 22 L28 17 L19 22 Z" fill="#D4A853" opacity="0.85">` +
          `<animate attributeName="opacity" values="0.85;0.3;0.85" dur="1.1s" repeatCount="indefinite"/></path>`
        : `<path d="M28 2 L35 19 L28 14 L21 19 Z" fill="none" stroke="#FAF7F2" stroke-width="1.5" opacity="0.55"/>`) +
      `</g>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
    `<circle cx="28" cy="28" r="18" fill="#D4A853" fill-opacity="0.22"/>` +
    `<circle cx="28" cy="28" r="10" fill="#D4A853" fill-opacity="0.45"/>` +
    `${destinationArrow}` +
    `${headingArrow}` +
    `<circle cx="28" cy="28" r="6" fill="#D4A853" stroke="#FAF7F2" stroke-width="2"/>` +
    `</svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(56, 56),
    anchor: new google.maps.Point(28, 28),
  };
}

// Set true the moment the user manually drags the map (see
// setupManualPanDetection) and only cleared by tapping the Recenter button.
// While true, updateUserLocationOnMap keeps the location dot itself moving
// live but stops fighting the user by recentering the viewport out from
// under them — this was the actual cause of "panning to look at the route
// gets snapped back."
let userHasManuallyPanned = false;
let lastKnownUserPosition = null;

function setupManualPanDetection() {
  if (!map) return;
  map.addListener("dragstart", () => {
    userHasManuallyPanned = true;
    if (recenterBtn) recenterBtn.classList.add("is-visible");
  });
}

function recenterMapOnUser() {
  userHasManuallyPanned = false;
  if (recenterBtn) recenterBtn.classList.remove("is-visible");
  if (map && lastKnownUserPosition) {
    map.panTo(lastKnownUserPosition);
  }
}

if (recenterBtn) {
  recenterBtn.addEventListener("click", recenterMapOnUser);
}

function updateUserLocationOnMap(latitude, longitude, heading) {
  if (!map) return;
  const position = { lat: latitude, lng: longitude };
  lastKnownUserPosition = position;
  // Guided Destination pillar — Arrow 1 prefers live device-compass
  // heading (via deviceOrientationHeading, tracked only once a
  // destination is active — see startDestinationOrientationTracking) over
  // GPS course-of-travel whenever it's available, since GPS heading is
  // null/absent while stationary, exactly when someone pausing to check
  // direction needs it most. Arrow 2 (bearing to activeDestination) is
  // pure geometry, no permission needed. Both are entirely absent with no
  // active destination — bearingToDestination stays null, which
  // buildUserLocationIcon treats as "today's single-heading-arrow
  // behavior," unchanged from before this pillar existed.
  const effectiveHeading = activeDestination && deviceOrientationHeading !== null ? deviceOrientationHeading : heading;
  const bearingToDestination = activeDestination ? bearingDegreesTo({ latitude, longitude }, activeDestination) : null;
  const icon = buildUserLocationIcon(effectiveHeading, bearingToDestination);

  if (!userLocationMarker) {
    userLocationMarker = new google.maps.Marker({ position, map, icon, zIndex: 1000 });
  } else {
    userLocationMarker.setPosition(position);
    userLocationMarker.setIcon(icon);
  }

  if (!hasMapCenteredOnUser) {
    hasMapCenteredOnUser = true;
    map.setCenter(position);
    map.setZoom(MAP_CITY_ZOOM);
  } else if (!userHasManuallyPanned) {
    map.panTo(position);
  }
}

// Pin size/color: large gold for interest-matched places, size otherwise
// driven by the Claude-assigned relevanceTier (see /api/map-pins) —
// high/medium/low — small warm grey for already-visited-this-session, and
// a pulsing gold ring layered on top for whichever place is currently
// narrating. Every pin here has already been through both the Places-API
// exclusion filter and the Claude relevance filter server-side (see
// server.js scorePlaceRelevance), so nothing reaches this point that
// wasn't judged worth showing — size just communicates how worth it.
const RELEVANCE_TIER_SIZES = { high: 24, medium: 18, low: 12 };

function buildPlaceMarkerIcon({ isInterestMatch, isVisited, isNarratingNow, relevanceTier }) {
  const tierSize = RELEVANCE_TIER_SIZES[relevanceTier] || 18;
  const size = isNarratingNow ? 30 : isInterestMatch ? 26 : isVisited ? 14 : tierSize;
  const color = isVisited && !isNarratingNow ? "#B8A898" : "#D4A853";
  const ringSvg = isNarratingNow
    ? `<circle cx="20" cy="20" r="18" fill="none" stroke="#D4A853" stroke-width="2" opacity="0.6">` +
      `<animate attributeName="r" values="12;18;12" dur="1.8s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite"/>` +
      `</circle>`
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `${ringSvg}` +
    `<circle cx="20" cy="20" r="${size / 2}" fill="${color}" stroke="#0F1B2D" stroke-width="1.5"/>` +
    `</svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  };
}

function buildPinPopupContent(place) {
  const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType || "Place";
  const container = document.createElement("div");
  container.className = "map-pin-popup";
  container.innerHTML =
    `<div class="map-pin-popup-name"></div>` +
    `<div class="map-pin-popup-type"></div>` +
    `<button type="button" class="map-pin-popup-btn">Tell me about this →</button>`;
  container.querySelector(".map-pin-popup-name").textContent = place.name;
  container.querySelector(".map-pin-popup-type").textContent = typeLabel;
  container.querySelector(".map-pin-popup-btn").addEventListener("click", () => {
    if (activeInfoWindow) activeInfoWindow.close();
    logEvent("pin_tapped", { placeId: place.placeId, placeType: place.primaryType, relevanceTier: place.relevanceTier || null });
    const marker = placeMarkersByPlaceId.get(place.placeId);
    if (marker) marker.sabriTapped = true;
    triggerNarrationForPlace(place);
  });
  // Guided Destination pillar — this popup's normal "Tell me about this"
  // behavior above is completely untouched; this is a purely additive
  // second button that only ever appears while the destination picker is
  // open and specifically waiting for a pin-tap selection (Section 4's
  // "tap a pin on the map" input method).
  if (destinationPickerActive) {
    const guideBtn = document.createElement("button");
    guideBtn.type = "button";
    guideBtn.className = "map-pin-popup-btn map-pin-popup-btn--destination";
    guideBtn.textContent = "Guide me here →";
    guideBtn.addEventListener("click", () => {
      if (activeInfoWindow) activeInfoWindow.close();
      handleDestinationSelected(place);
    });
    container.appendChild(guideBtn);
  }
  return container;
}

// Adds/updates a pin for a place. isInterestMatch/isVisited/isNarratingNow/
// relevanceTier determine its size/color (see buildPlaceMarkerIcon). Safe to
// call repeatedly for the same placeId — just updates the existing marker.
// New markers are handed to the clusterer (see initMap) instead of being
// added to the map directly, so pan/zoom doesn't have to reposition every
// individual pin every frame once there are more than a handful.
function upsertPlaceMarker(place, { isInterestMatch, relevanceTier } = {}) {
  if (!map) {
    console.log("[map] upsertPlaceMarker skipped — map not initialized yet", place?.name);
    return;
  }
  if (!place || !place.placeId || typeof place.latitude !== "number" || typeof place.longitude !== "number") {
    console.log("[map] upsertPlaceMarker skipped — missing placeId or invalid lat/lng", place);
    return;
  }

  const resolvedIsInterestMatch =
    typeof isInterestMatch === "boolean" ? isInterestMatch : interestPlaces.some((p) => p.placeId === place.placeId);
  const isVisited = narratedPlaceIds.has(place.placeId) || visitedPlaceIds.has(place.placeId);
  const isNarratingNow = narratingPlaceId === place.placeId;
  const resolvedTier = relevanceTier || place.relevanceTier;
  const icon = buildPlaceMarkerIcon({ isInterestMatch: resolvedIsInterestMatch, isVisited, isNarratingNow, relevanceTier: resolvedTier });

  let marker = placeMarkersByPlaceId.get(place.placeId);
  if (!marker) {
    marker = new google.maps.Marker({
      position: { lat: place.latitude, lng: place.longitude },
      icon,
      zIndex: isNarratingNow ? 900 : resolvedIsInterestMatch ? 500 : 200,
    });
    marker.addListener("click", () => {
      if (activeInfoWindow) activeInfoWindow.close();
      activeInfoWindow = new google.maps.InfoWindow({ content: buildPinPopupContent(place) });
      activeInfoWindow.open({ map, anchor: marker });
    });
    // Stashed directly on the marker so refreshAllPlaceMarkers() can rebuild
    // the icon later without needing a separate place-data lookup table.
    // sabriFirstSeenAt/sabriTapped feed the sampled pin_ignored_within_view
    // check (see samplePinIgnoredEvents).
    marker.sabriRelevanceTier = resolvedTier;
    marker.sabriFirstSeenAt = Date.now();
    if (mapMarkerClusterer) {
      mapMarkerClusterer.addMarker(marker);
    } else {
      marker.setMap(map);
    }
    placeMarkersByPlaceId.set(place.placeId, marker);
    console.log(`[map] pin added for "${place.name}" (total pins: ${placeMarkersByPlaceId.size})`);
    pinsEverLoaded = true;
    clearTimeout(noPinsToastTimeout);
  } else {
    marker.setIcon(icon);
  }
}

// Independent of the narration-triggering pipeline (see onLocation) — keeps
// map pins fresh purely based on GPS movement/time, so pins show up even if
// the user is standing still or moving slowly. Uses its own fetch (no
// shared AbortController with the narration pipeline's fetchContextPlaces)
// since an occasional overlapping/stale response here is harmless and
// shouldn't cancel/be cancelled by narration-triggering requests.
let lastPinRefreshPosition = null;
let lastPinRefreshTime = 0;
const PIN_REFRESH_MIN_METERS = 30;
const PIN_REFRESH_MIN_MS = 8000;
let pinsEverLoaded = false;
let noPinsToastTimeout = null;

// Fetches relevance-filtered pins (see /api/map-pins — Places-type
// exclusion + Claude relevance scoring + grid search for density) around a
// given point and drops them on the map. Shared by the GPS-tied refresh
// (refreshMapPinsAroundUser) and the map-idle/viewport-tied refresh
// (refreshMapPinsAroundViewport) below — deliberately does NOT touch
// lastContextPlaces, which is /api/context's shape (with
// distanceMeters/relativePosition) used for narration/conversation context,
// not this endpoint's relevance-tiered shape.
async function fetchAndPlacePins(latitude, longitude, logLabel) {
  try {
    const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
    if (userProfile?.interests?.length) params.set("interests", userProfile.interests.join("|"));
    if (userProfile?.inferredInterests?.length) params.set("inferredInterests", userProfile.inferredInterests.join("|"));

    console.log(`[map] fetching /api/map-pins for ${logLabel}`, { latitude, longitude });
    const response = await fetch(`/api/map-pins?${params.toString()}`);
    const data = await response.json();
    const places = response.ok && Array.isArray(data.places) ? data.places : [];
    console.log(`[map] /api/map-pins returned ${places.length} relevant place(s) for ${logLabel}`);

    places.forEach((place) => {
      const hasCoords = typeof place.latitude === "number" && typeof place.longitude === "number";
      if (!hasCoords) {
        console.log("[map] skipping place with invalid coordinates", place.name, place.placeId);
        return;
      }
      upsertPlaceMarker(place, { relevanceTier: place.relevanceTier });
    });

    if (places.length > 0) {
      pinsEverLoaded = true;
      clearTimeout(noPinsToastTimeout);
    }
  } catch (error) {
    console.log(`[map] pin refresh failed for ${logLabel}`, error);
  }
}

async function refreshMapPinsAroundUser(latitude, longitude, heading) {
  if (!map) {
    console.log("[map] refreshMapPinsAroundUser skipped — map not ready yet");
    return;
  }

  const now = Date.now();
  if (
    lastPinRefreshPosition &&
    distanceInMeters(lastPinRefreshPosition, { latitude, longitude }) < PIN_REFRESH_MIN_METERS &&
    now - lastPinRefreshTime < PIN_REFRESH_MIN_MS
  ) {
    return;
  }
  lastPinRefreshPosition = { latitude, longitude };
  lastPinRefreshTime = now;

  await fetchAndPlacePins(latitude, longitude, "user location");
}

// Zoomed-out / manually-panned density: refreshes pins around wherever the
// user is currently LOOKING (the map's center), not just their physical GPS
// location — this is what gives "something interesting in every direction"
// when the map is zoomed out or panned away from the user's own position.
// Debounced on the map's 'idle' event (fires once panning/zooming has
// genuinely settled), not on every intermediate 'bounds_changed'/'drag'
// frame, per the pan/zoom performance investigation.
let viewportPinRefreshTimeout = null;
const VIEWPORT_PIN_REFRESH_DEBOUNCE_MS = 250;

function setupViewportPinRefresh() {
  if (!map) return;
  map.addListener("idle", () => {
    clearTimeout(viewportPinRefreshTimeout);
    viewportPinRefreshTimeout = setTimeout(() => {
      const center = map.getCenter();
      if (!center) return;
      fetchAndPlacePins(center.lat(), center.lng(), "map viewport");
    }, VIEWPORT_PIN_REFRESH_DEBOUNCE_MS);
  });
}

// If genuinely nothing has loaded within 10s of tour start, reassure the
// user the app isn't frozen — it's just that Google Places hasn't returned
// any nearby candidates yet (or the request is still in flight).
function scheduleNoPinsFallback() {
  clearTimeout(noPinsToastTimeout);
  noPinsToastTimeout = setTimeout(() => {
    if (!pinsEverLoaded && placeMarkersByPlaceId.size === 0) {
      showToast("Loading nearby places...");
    }
  }, 10000);
}

function refreshAllPlaceMarkers() {
  const interestPlaceIds = new Set(interestPlaces.map((p) => p.placeId));
  for (const [placeId, marker] of placeMarkersByPlaceId) {
    const isVisited = narratedPlaceIds.has(placeId) || visitedPlaceIds.has(placeId);
    const isNarratingNow = narratingPlaceId === placeId;
    marker.setIcon(
      buildPlaceMarkerIcon({
        isInterestMatch: interestPlaceIds.has(placeId),
        isVisited,
        isNarratingNow,
        relevanceTier: marker.sabriRelevanceTier,
      })
    );
  }
}

// Sampled (not exhaustive) — periodically checks which high-relevance pins
// have sat on screen for a while without being tapped or narrated, and logs
// ONE event covering all of them at once rather than one event per pin.
// Each qualifying pin is only ever counted once (sabriTapped gets set here
// too, reusing the same flag pin-tap logging uses to mean "already
// accounted for").
const PIN_IGNORED_SAMPLE_MS = 3 * 60 * 1000;
let pinIgnoredSampleInterval = null;

function samplePinIgnoredEvents() {
  const now = Date.now();
  const ignored = [];
  for (const [placeId, marker] of placeMarkersByPlaceId) {
    if (marker.sabriTapped) continue;
    if (marker.sabriRelevanceTier !== "high") continue;
    if (narratedPlaceIds.has(placeId) || visitedPlaceIds.has(placeId)) continue;
    if (!marker.sabriFirstSeenAt || now - marker.sabriFirstSeenAt < PIN_IGNORED_SAMPLE_MS) continue;
    ignored.push(placeId);
    marker.sabriTapped = true; // treat as accounted-for so it isn't sampled again
  }
  if (ignored.length > 0) {
    logEvent("pin_ignored_within_view", { placeIds: ignored.slice(0, 10), count: ignored.length });
  }
}

// User tapped a pin's "Tell me about this →" button — narrate that place
// immediately, bypassing the normal cooldown/discovery flow (this is an
// explicit user request, not the passive walking-discovery pipeline).
async function triggerNarrationForPlace(place) {
  if (isNarrating || isConversing) return;
  await narrateAndSpeak({
    tier: "specific",
    places: [place],
    heading: lastHeading,
    triggerPosition: lastPosition || { latitude: place.latitude, longitude: place.longitude },
  });
}

// --- Pillar 1: proactive mid-walk depth (ENABLE_PROACTIVE_DEPTH) ---
// Entirely new, self-contained logic that runs ALONGSIDE onLocation ->
// checkForNarration -> narrateAndSpeak via its own setInterval (mirroring
// the pinIgnoredSampleInterval pattern above) — nothing here is inserted
// into those functions' bodies. It only ever READS the `lastPosition`
// global that onLocation already maintains, and reuses the same
// isNarrating flag those functions already guard on, so this pipeline can
// never talk over real narration or a tap-to-talk conversation, and real
// narration/the PWA auto-updater (see handleUpdateAvailable) can never
// interrupt an in-progress proactive interjection either.
const ENABLE_PROACTIVE_DEPTH = window.ENABLE_PROACTIVE_DEPTH === true;
const DWELL_THRESHOLD_MS = (window.DWELL_THRESHOLD_MINUTES || 2.5) * 60 * 1000;
const DWELL_STILL_RADIUS_METERS = 20; // small movement (looking around) still counts as "dwelling"
const PROACTIVE_CALLBACKS_PER_WALK = window.PROACTIVE_CALLBACKS_PER_WALK || 2;
const PROACTIVE_INTERJECTIONS_PER_HOUR = window.PROACTIVE_INTERJECTIONS_PER_HOUR || 3;
const PROACTIVE_INTERJECTION_WINDOW_MS = 60 * 60 * 1000;
const PROACTIVE_SUPPRESS_AFTER_QUESTION_MS =
  (window.PROACTIVE_SUPPRESS_AFTER_QUESTION_MINUTES || 5) * 60 * 1000;
const DWELL_CHECK_INTERVAL_MS = 20000;

let dwellCheckInterval = null;
let dwellAnchorPosition = null;
let dwellAnchorTime = null;
let dwellInterjectedForAnchor = false;
let proactiveCallbacksUsedThisWalk = 0;
let proactiveInterjectionTimestamps = []; // sliding 1-hour window for the per-hour cap
let lastQuestionAskedAt = 0; // stamped by recordQuestionLog

function resetProactiveDepthState() {
  dwellAnchorPosition = null;
  dwellAnchorTime = null;
  dwellInterjectedForAnchor = false;
  proactiveCallbacksUsedThisWalk = 0;
  proactiveInterjectionTimestamps = [];
  lastQuestionAskedAt = 0;
}

async function checkDwellAndMaybeInterject() {
  try {
    if (!ENABLE_PROACTIVE_DEPTH) return;
    if (isNarrating || isConversing) return;
    if (!lastPosition) return;
    if (Date.now() - lastQuestionAskedAt < PROACTIVE_SUPPRESS_AFTER_QUESTION_MS) return;

    proactiveInterjectionTimestamps = proactiveInterjectionTimestamps.filter(
      (ts) => Date.now() - ts < PROACTIVE_INTERJECTION_WINDOW_MS
    );
    if (proactiveInterjectionTimestamps.length >= PROACTIVE_INTERJECTIONS_PER_HOUR) return;

    if (!dwellAnchorPosition || distanceInMeters(dwellAnchorPosition, lastPosition) > DWELL_STILL_RADIUS_METERS) {
      dwellAnchorPosition = lastPosition;
      dwellAnchorTime = Date.now();
      dwellInterjectedForAnchor = false;
      return;
    }
    if (dwellInterjectedForAnchor) return;
    if (Date.now() - dwellAnchorTime < DWELL_THRESHOLD_MS) return;
    dwellInterjectedForAnchor = true;

    const earlierNarrations = sessionLog.filter((entry) => entry.type === "narration" && entry.placeName !== currentPlaceName);
    const canCallback = proactiveCallbacksUsedThisWalk < PROACTIVE_CALLBACKS_PER_WALK && earlierNarrations.length > 0;

    if (canCallback && Math.random() < 0.5) {
      const entry = earlierNarrations[Math.floor(Math.random() * earlierNarrations.length)];
      proactiveCallbacksUsedThisWalk += 1;
      await offerProactiveInterjection({ type: "callback", callbackTopic: entry.summary });
    } else if (currentPlaceName) {
      await offerProactiveInterjection({ type: "dwell", place: { name: currentPlaceName } });
    }
  } catch (error) {
    // Fail silently — a missed or broken proactive interjection must never
    // interrupt or block the core narration pipeline. Logged server-side
    // isn't possible here (no request was made), so this is the client-side
    // equivalent: console-only, never surfaced to the user.
    console.log("[proactive] dwell check failed, skipping:", error?.message || error);
  }
}

async function offerProactiveInterjection({ type, place, callbackTopic }) {
  if (isNarrating || isConversing) return; // re-check — time may have passed since the caller checked
  isNarrating = true;
  proactiveInterjectionTimestamps.push(Date.now());
  try {
    await streamSSE(
      "/api/narrate-proactive",
      {
        type,
        place,
        callbackTopic,
        sessionLog,
        userProfile,
        language: settings.language,
        persona: currentPersona,
        city: currentCity,
        country: currentCountry,
        userId: currentUser ? currentUser.id : null,
      },
      {
        onSentence: (sentenceText) => enqueueTtsSentence(sentenceText),
      }
    );
    await waitForTtsQueueDrain();
    logEvent("proactive_interjection_delivered", { type, placeId: currentPlaceId || null });
  } catch (error) {
    console.log("[proactive] interjection failed, skipping:", error?.message || error);
    logEvent("proactive_interjection_failed", { type, message: error?.message || String(error) });
  } finally {
    isNarrating = false;
  }
}

// --- Pillar 3: needs-aware proactive routing (ENABLE_NEEDS_ROUTING) ---
// Entirely new, self-contained logic — its own setInterval (mirroring
// pinIgnoredSampleInterval/dwellCheckInterval above), its own cooldown
// state (separate from narration's and Pillar 1's), and it never modifies
// checkForNarration/narrateAndSpeak. It DOES touch two other existing,
// non-protected pieces of state directly: plannedTour.stops (Guided Tour
// Mode's stop list) via a plain array splice from OUTSIDE
// checkGuidedTourProgress — so that function's own unchanged arrival/
// narrate/advance logic picks up the inserted stop and auto-resumes the
// original itinerary afterward for free — and upsertPlaceMarker (Wander
// Mode's existing marker-rendering helper) to surface a suggested detour
// on the live map.
const ENABLE_NEEDS_ROUTING = window.ENABLE_NEEDS_ROUTING === true;
const NEEDS_MEAL_TRIGGER_MS = (window.NEEDS_MEAL_TRIGGER_MINUTES || 30) * 60 * 1000;
const NEEDS_WEATHER_TEMP_THRESHOLD_C = window.NEEDS_WEATHER_TEMP_THRESHOLD_C || 32;
const NEEDS_WEATHER_RAIN_PROB_THRESHOLD = window.NEEDS_WEATHER_RAIN_PROB_THRESHOLD || 0.5;
const NEEDS_SUGGESTION_COOLDOWN_MS = (window.NEEDS_SUGGESTION_COOLDOWN_MINUTES || 20) * 60 * 1000;
const NEEDS_CHECK_INTERVAL_MS = 60000;
const NEEDS_SUGGESTIONS_SETTING_KEY = "sabri_needs_suggestions_enabled";
const NEEDS_SUGGESTION_AUTO_DISMISS_MS = 6000;
// Set false by the SabriSpeechRecognition.ensureReady() check further down
// if this device has no working speech engine at all — restoreMainMic()
// checks this so it never un-hides a mic button that's supposed to stay
// permanently hidden on an unsupported device.
let speechRecognitionAvailable = true;

let needsCheckInterval = null;
let lastNeedsSuggestionAt = 0;
let needsSuggestionCategoriesUsedThisWalk = new Set();
// { category, stage: "confirm" | "clarifying" | "resolved" } while the
// banner is open — non-null is itself the guard against a second
// suggestion firing on top of an unresolved one.
let needsSuggestionPending = null;
let activeDetourPlace = null; // Wander Mode's current suggested-detour marker, if any

function needsSuggestionsEnabledSetting() {
  if (!settingsNeedsSuggestionsSection) return true;
  try {
    const stored = localStorage.getItem(NEEDS_SUGGESTIONS_SETTING_KEY);
    return stored === null ? true : stored === "true"; // on by default per spec, once the server flag is on
  } catch (error) {
    return true;
  }
}

if (needsSuggestionsToggle) {
  needsSuggestionsToggle.checked = needsSuggestionsEnabledSetting();
  needsSuggestionsToggle.addEventListener("change", () => {
    try {
      localStorage.setItem(NEEDS_SUGGESTIONS_SETTING_KEY, String(needsSuggestionsToggle.checked));
    } catch (error) {
      // Non-fatal — the toggle just won't persist across reloads this run.
    }
  });
}

function resetNeedsRoutingState() {
  lastNeedsSuggestionAt = 0;
  needsSuggestionCategoriesUsedThisWalk = new Set();
  needsSuggestionPending = null;
  activeDetourPlace = null;
  hideNeedsSuggestionBanner();
}

function hideNeedsSuggestionBanner() {
  if (needsSuggestionBanner) needsSuggestionBanner.classList.add("hidden");
  if (needsSuggestionClarifyEl) {
    needsSuggestionClarifyEl.classList.add("hidden");
    needsSuggestionClarifyEl.innerHTML = "";
  }
  stopNeedsSuggestionListening();
  isConversing = false;
}

// Voice-first consent (this round's addition): SabriSpeechRecognition is a
// single shared engine — only one caller can be actively listening at a
// time (see its own comments). While the suggestion banner's mic might be
// listening, the main "Tap to talk" mic is suppressed so tapping it can't
// silently steal the recognition session out from under the banner (or
// vice versa) and orphan whichever caller loses. This only ever
// hides/shows an existing button via a class the button's own click
// handler doesn't touch — startListening()/checkForNarration/
// narrateAndSpeak are untouched.
function suppressMainMic() {
  micBtn.classList.add("hidden");
}
function restoreMainMic() {
  if (speechRecognitionAvailable) micBtn.classList.remove("hidden");
}

function stopNeedsSuggestionListening() {
  if (needsSuggestionMicBtn?.classList.contains("is-listening")) needsSuggestionMic.cancel();
  if (needsSuggestionVoiceInput) needsSuggestionVoiceInput.value = "";
  if (needsSuggestionVoiceHint) needsSuggestionVoiceHint.classList.add("hidden");
  restoreMainMic();
}

async function checkNeedsAndMaybeSuggest() {
  try {
    if (!ENABLE_NEEDS_ROUTING || !needsSuggestionsEnabledSetting()) return;
    if (isNarrating || isConversing) return;
    if (needsSuggestionPending) return;
    if (Date.now() - lastNeedsSuggestionAt < NEEDS_SUGGESTION_COOLDOWN_MS) return;
    if (!lastPosition || !tourStartedAt) return;

    if (!needsSuggestionCategoriesUsedThisWalk.has("meal") && Date.now() - tourStartedAt >= NEEDS_MEAL_TRIGGER_MS) {
      await offerNeedsSuggestion("meal");
      return;
    }
    if (currentWeather) {
      if (
        !needsSuggestionCategoriesUsedThisWalk.has("weather_shade") &&
        typeof currentWeather.temperatureC === "number" &&
        currentWeather.temperatureC >= NEEDS_WEATHER_TEMP_THRESHOLD_C
      ) {
        await offerNeedsSuggestion("weather_shade");
        return;
      }
      if (
        !needsSuggestionCategoriesUsedThisWalk.has("weather_shelter") &&
        typeof currentWeather.rainProbabilitySoon === "number" &&
        currentWeather.rainProbabilitySoon >= NEEDS_WEATHER_RAIN_PROB_THRESHOLD
      ) {
        await offerNeedsSuggestion("weather_shelter");
      }
    }
  } catch (error) {
    // Fail silently — a missed needs-suggestion check must never interrupt
    // or block core narration.
    console.log("[needs] check failed, skipping:", error?.message || error);
  }
}

function defaultNeedsSuggestionText(category) {
  if (category === "meal") return "It's coming up on a good time to eat — want me to find a well-rated spot nearby?";
  if (category === "weather_shade") return "It's quite warm out — want to route toward some shade or a nearby park?";
  return "Rain looks likely soon — want to head toward some shelter before it starts?";
}

async function offerNeedsSuggestion(category) {
  needsSuggestionCategoriesUsedThisWalk.add(category);
  lastNeedsSuggestionAt = Date.now();
  needsSuggestionPending = { category, stage: "confirm" };
  isNarrating = true;
  try {
    let questionText = "";
    await streamSSE(
      "/api/needs-suggestion",
      {
        category,
        place: currentPlaceId ? { name: currentPlaceName } : null,
        weather: currentWeather,
        language: settings.language,
        persona: currentPersona,
        userId: currentUser ? currentUser.id : null,
      },
      { onSentence: (text) => { questionText = questionText ? `${questionText} ${text}` : text; enqueueTtsSentence(text); } }
    );
    await waitForTtsQueueDrain();
    showNeedsSuggestionBanner(questionText || defaultNeedsSuggestionText(category));
    logEvent("needs_suggestion_offered", { category });
  } catch (error) {
    console.log("[needs] suggestion generation failed, skipping:", error?.message || error);
    needsSuggestionPending = null;
  } finally {
    isNarrating = false;
  }
}

function showNeedsSuggestionBanner(text) {
  if (!needsSuggestionBanner || !needsSuggestionTextEl) return;
  needsSuggestionTextEl.textContent = text;
  if (needsSuggestionClarifyEl) {
    needsSuggestionClarifyEl.classList.add("hidden");
    needsSuggestionClarifyEl.innerHTML = "";
  }
  if (needsSuggestionYesBtn) needsSuggestionYesBtn.textContent = "Yes, take me";
  if (needsSuggestionVoiceInput) needsSuggestionVoiceInput.value = "";
  if (needsSuggestionVoiceHint) needsSuggestionVoiceHint.classList.add("hidden");
  needsSuggestionBanner.classList.remove("hidden");
  // Voice is available the moment the banner shows (tap the mic, same
  // convention as the core "Tap to talk" flow) — not auto-started, since
  // starting recognition without a user gesture right after Sabri just
  // finished speaking risks picking up TTS tail-end audio on a phone
  // speaker (no headphones) and can silently fail under browser
  // microphone-gesture policies anyway. See the buttons/pills below, which
  // work identically whether or not voice is used at all.
  suppressMainMic();
  // Reuses isConversing — the exact flag checkForNarration/
  // triggerNarrationForPlace/handleUpdateAvailable already respect — so a
  // fresh narration or PWA update can't fire mid-answer while a spoken
  // reply genuinely takes a few seconds to give (this gap existed even
  // before voice input, but a several-second voice round trip made it a
  // real, not just theoretical, risk worth closing now).
  isConversing = true;
}

const MEAL_CLARIFY_OPTIONS = ["Quick bite", "Sit-down meal", "Local favorite", "Date spot"];

function showMealClarifyPills() {
  if (!needsSuggestionClarifyEl || !needsSuggestionTextEl) return;
  needsSuggestionTextEl.textContent = "What are you in the mood for?";
  needsSuggestionClarifyEl.innerHTML = "";
  MEAL_CLARIFY_OPTIONS.forEach((label) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "onboarding-pill";
    pill.dataset.value = label;
    pill.textContent = label;
    pill.addEventListener("click", () => pill.classList.toggle("is-selected"));
    needsSuggestionClarifyEl.appendChild(pill);
  });
  needsSuggestionClarifyEl.classList.remove("hidden");
  if (needsSuggestionYesBtn) needsSuggestionYesBtn.textContent = "Find it";
  if (needsSuggestionVoiceInput) needsSuggestionVoiceInput.value = "";
  if (needsSuggestionVoiceHint) needsSuggestionVoiceHint.classList.add("hidden");
}

// Shared by both the tap (Yes button) and voice ("yes"/on-topic clarify
// reply) paths — see handleNeedsSuggestionVoiceTranscript above — so voice
// and buttons genuinely resolve the same interaction through the same
// code, not two parallel implementations that could drift.
async function handleNeedsSuggestionYes(extraPreferenceLabels = [], extraPreferenceText = "") {
  if (!needsSuggestionPending) return;
  const { category, stage } = needsSuggestionPending;

  if (category === "meal" && stage === "confirm") {
    needsSuggestionPending.stage = "clarifying";
    showMealClarifyPills();
    return;
  }

  if (needsSuggestionYesBtn) needsSuggestionYesBtn.disabled = true;
  try {
    const pillLabels = needsSuggestionClarifyEl
      ? Array.from(needsSuggestionClarifyEl.querySelectorAll(".is-selected")).map((pill) => pill.dataset.value)
      : [];
    const preferenceLabels = Array.from(new Set([...pillLabels, ...extraPreferenceLabels]));
    await resolveNeedsSuggestionAccepted(category, preferenceLabels, extraPreferenceText);
  } finally {
    if (needsSuggestionYesBtn) needsSuggestionYesBtn.disabled = false;
  }
}

function handleNeedsSuggestionNo() {
  if (!needsSuggestionPending) return;
  logEvent("needs_suggestion_declined", { category: needsSuggestionPending.category });
  needsSuggestionPending = null;
  hideNeedsSuggestionBanner();
}

if (needsSuggestionYesBtn) needsSuggestionYesBtn.addEventListener("click", () => handleNeedsSuggestionYes());
if (needsSuggestionNoBtn) needsSuggestionNoBtn.addEventListener("click", () => handleNeedsSuggestionNo());

async function resolveNeedsSuggestionAccepted(category, preferenceLabels, extraPreferenceText = "") {
  try {
    let options = [];
    if (category === "meal") {
      const preferenceText = [...preferenceLabels, extraPreferenceText].filter(Boolean).join(" ");
      const params = new URLSearchParams({
        lat: String(lastPosition.latitude),
        lng: String(lastPosition.longitude),
        dietary: (userProfile?.dietaryRestrictions || []).join(","),
        preferenceText,
      });
      const response = await fetch(`/api/find-meal-options?${params.toString()}`);
      const data = await response.json();
      options = data.options || [];
      // preferenceText captured here (whether typed via pill taps or
      // spoken) is the same interaction-logging pattern inferred_interests
      // is built from — see /api/infer-interests — for future sharpening.
      logEvent("needs_suggestion_accepted", { category, preferenceLabels, preferenceText });
    } else {
      const kind = category === "weather_shelter" ? "shelter" : "shade";
      const params = new URLSearchParams({ lat: String(lastPosition.latitude), lng: String(lastPosition.longitude), kind });
      const response = await fetch(`/api/find-nearby-refuge?${params.toString()}`);
      const data = await response.json();
      options = data.options || [];
      logEvent("needs_suggestion_accepted", { category });
    }

    const chosen = options[0];
    if (!chosen) {
      needsSuggestionTextEl.textContent = "Couldn't find a good option nearby right now — let's keep walking.";
      needsSuggestionPending = null;
      setTimeout(hideNeedsSuggestionBanner, NEEDS_SUGGESTION_AUTO_DISMISS_MS);
      return;
    }

    if (plannedTourActive && plannedTour) {
      await insertGuidedTourDetour(chosen, category);
    } else {
      insertWanderDetour(chosen, category);
    }

    needsSuggestionTextEl.textContent = `Heading toward ${chosen.name} — I'll pick your walk back up once you're ready.`;
    needsSuggestionPending = null;
    setTimeout(hideNeedsSuggestionBanner, NEEDS_SUGGESTION_AUTO_DISMISS_MS);
  } catch (error) {
    console.log("[needs] resolving accepted suggestion failed:", error?.message || error);
    needsSuggestionTextEl.textContent = "Something went wrong finding a spot — let's keep walking.";
    needsSuggestionPending = null;
    setTimeout(hideNeedsSuggestionBanner, NEEDS_SUGGESTION_AUTO_DISMISS_MS);
  }
}

// Wander Mode has no fixed route to insert into (checkForNarration is
// purely GPS-driven, see its own comments) — so "insert a waypoint and
// auto-resume" here just means surfacing the suggested place prominently
// on the live map. Once the user physically walks there, the existing,
// completely unmodified checkForNarration/narrateAndSpeak chain picks it
// up like any other place — nothing to explicitly "resume" since Wander
// Mode never had a fixed path to begin with.
function insertWanderDetour(place, reason) {
  activeDetourPlace = place;
  upsertPlaceMarker(place);
  if (map && typeof place.latitude === "number" && typeof place.longitude === "number") {
    map.panTo({ lat: place.latitude, lng: place.longitude });
  }
  logEvent("needs_detour_started", { reason, mode: "wander" });
}

function buildDetourStopFromPlace(place, reason) {
  return {
    stopNumber: -1, // synthetic — not part of the original numbered itinerary
    placeName: place.name,
    placeType: place.primaryType || "restaurant",
    searchQuery: place.name,
    whyThisStop: reason === "meal" ? "A quick suggested stop to eat." : "A suggested stop to wait out the weather.",
    estimatedTimeHere: reason === "meal" ? "30-45 min" : "10-15 min",
    place,
    isDetourStop: true,
  };
}

// Splices a synthetic stop into plannedTour.stops at the current index —
// checkGuidedTourProgress (entirely unmodified) then arrives at, narrates,
// and advances past it exactly like any planned stop, which is what makes
// "auto-resume the original itinerary afterward" work for free: advancing
// past the inserted stop lands right back on the next ORIGINAL stop.
async function insertGuidedTourDetour(place, reason) {
  if (!plannedTour || !plannedTourActive) return;

  // Persisted BEFORE mutating the array, so a reload mid-detour has
  // something to recover the original remaining itinerary from — see
  // tour_detour_cache in schema.sql. (Note: plannedTour itself isn't
  // currently restored across a reload at all, with or without this
  // pillar — see the final report's honest scope note on this.)
  fetch("/api/save-tour-detour", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: currentSessionId,
      userId: currentUser ? currentUser.id : null,
      remainingStops: plannedTour.stops.slice(plannedTourStopIndex),
      detourReason: reason,
    }),
  }).catch(() => {});

  plannedTour.stops.splice(plannedTourStopIndex, 0, buildDetourStopFromPlace(place, reason));
  logEvent("needs_detour_started", { reason, mode: "guided" });
}

// --- Guided Destination pillar (ENABLE_GUIDED_DESTINATION) ---
// Entirely new, self-contained logic — its own setInterval (mirroring
// pinIgnoredSampleInterval/dwellCheckInterval/needsCheckInterval above),
// its own state, own error isolation. This is explicitly NOT an extension
// of plannedTour/Guided Tour Mode — activeDestination is a single-
// destination directional OVERLAY on top of Wander mode. onLocation ->
// checkForNarration -> narrateAndSpeak keeps running completely
// unmodified alongside it; this only ever READS lastPosition/lastHeading
// (already maintained by onLocation) and reuses isNarrating the same way
// Pillars 1 and 3 do, so it can never talk over real narration and real
// narration can never interrupt a direction being spoken either.
const ENABLE_GUIDED_DESTINATION = window.ENABLE_GUIDED_DESTINATION === true;
const DESTINATION_ARRIVAL_METERS = 25; // similar in spirit to GUIDED_TOUR_ARRIVAL_METERS (30)
const DESTINATION_CHECK_INTERVAL_MS = 20000;

let activeDestination = null; // { name, placeId, latitude, longitude, naturalLanguageDirections, distanceMeters }
let destinationPickerActive = false; // true only while the picker is open AND a map-pin-tap selection is a live option
let destinationCheckInterval = null;
let destinationRerouteCandidate = null; // pending place while the reroute confirm banner is showing

function resetGuidedDestinationState() {
  activeDestination = null;
  destinationPickerActive = false;
  destinationRerouteCandidate = null;
  clearInterval(destinationCheckInterval);
  destinationCheckInterval = null;
  stopDestinationOrientationTracking();
  hideDestinationPicker();
  hideDestinationRerouteBanner();
  applyGuidedDestinationUI();
}

// Called alongside applySettingsToUI-style setup — visibility only, never
// gates anything about the core narration pipeline.
function applyGuidedDestinationUI() {
  if (!guideMeBtn) return;
  const shouldShow = ENABLE_GUIDED_DESTINATION && tourStartedAt && !plannedTourActive;
  guideMeBtn.classList.toggle("hidden", !shouldShow);
  guideMeBtn.classList.toggle("is-active", !!activeDestination);
}

// --- Entry Point A: right after Wander mode is chosen ---
function maybeOfferDestinationPrompt() {
  if (!ENABLE_GUIDED_DESTINATION) return;
  applyGuidedDestinationUI();
  openDestinationPicker();
}

// --- Entry Point B: persistent "Guide Me" control mid-walk ---
if (guideMeBtn) {
  guideMeBtn.addEventListener("click", () => openDestinationPicker());
}

function openDestinationPicker() {
  if (!destinationPicker) return;
  destinationInput.value = "";
  destinationPickerStatus.classList.add("hidden");
  destinationPickerStatus.textContent = "";
  if (activeDestination) {
    destinationActiveName.textContent = `Currently guiding you to ${activeDestination.name}`;
    destinationActiveRow.classList.remove("hidden");
    destinationPickerTitle.textContent = "Head somewhere else instead?";
  } else {
    destinationActiveRow.classList.add("hidden");
    destinationPickerTitle.textContent = "Anywhere specific — or a general area — you want to head toward?";
  }
  destinationPicker.classList.add("is-visible");
  destinationPickerActive = true;
  suppressMainMic(); // same SabriSpeechRecognition single-engine guard Pillar 3 uses
  // Same isConversing reuse Pillar 3's needs-suggestion banner relies on —
  // checkForNarration/triggerNarrationForPlace/handleUpdateAvailable
  // already respect this flag, so a fresh narration or PWA update can't
  // fire while the picker (which can involve a real voice round trip) is
  // open.
  isConversing = true;
}

function hideDestinationPicker() {
  if (!destinationPicker) return;
  destinationPicker.classList.remove("is-visible");
  destinationPickerActive = false;
  if (destinationMic?.cancel) destinationMic.cancel();
  restoreMainMic();
  // Only clear isConversing if nothing else (the reroute banner) still
  // needs it held — avoids the same "who clears it last" issue a naive
  // unconditional reset would risk if both could ever be open back to back.
  if (destinationRerouteBanner.classList.contains("hidden")) isConversing = false;
}

if (destinationPickerCloseBtn) destinationPickerCloseBtn.addEventListener("click", hideDestinationPicker);
if (destinationSkipBtn) {
  destinationSkipBtn.addEventListener("click", () => {
    // Entry Point A declining, or Entry Point B just closing without a
    // change — either way, activeDestination is left exactly as it was.
    hideDestinationPicker();
  });
}
if (destinationStopBtn) {
  destinationStopBtn.addEventListener("click", () => {
    stopGuidedDestination();
    hideDestinationPicker();
  });
}

const destinationMic = destinationMicBtn
  ? createChatMicController({
      micBtn: destinationMicBtn,
      inputEl: destinationInput,
      onFinalTranscript: (text) => searchDestination(text),
    })
  : null;
if (destinationMicBtn) destinationMicBtn.addEventListener("click", () => destinationMic.start());
if (destinationSearchBtn) destinationSearchBtn.addEventListener("click", () => searchDestination(destinationInput.value.trim()));
if (destinationInput) {
  destinationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchDestination(destinationInput.value.trim());
  });
}

// Reuses the EXACT SAME place-resolution pipeline Guided Tour planning
// already uses (findPlaceForQuery server-side, real Google Place lookup —
// never trusting raw coordinates) via the thin /api/resolve-destination
// wrapper, rather than a second resolution path.
async function searchDestination(query) {
  if (!query) return;
  destinationPickerStatus.textContent = "Looking that up...";
  destinationPickerStatus.classList.remove("hidden");
  try {
    const params = new URLSearchParams({ query });
    if (lastPosition) {
      params.set("biasLat", String(lastPosition.latitude));
      params.set("biasLng", String(lastPosition.longitude));
    }
    const response = await fetch(`/api/resolve-destination?${params.toString()}`);
    const data = await response.json();
    if (!data.place) {
      destinationPickerStatus.textContent = "Couldn't find that — try a different search.";
      return;
    }
    handleDestinationSelected(data.place);
  } catch (error) {
    console.log("[destination] search failed:", error?.message || error);
    destinationPickerStatus.textContent = "Something went wrong — try again.";
  }
}

// Shared entry point for BOTH destination-input methods (map pin tap and
// search) from BOTH entry points — the single place that decides whether
// a reroute confirmation is needed.
function handleDestinationSelected(place) {
  if (activeDestination && activeDestination.placeId !== place.placeId) {
    destinationRerouteCandidate = place;
    hideDestinationPicker();
    showDestinationRerouteBanner(`Head to ${place.name} instead of ${activeDestination.name}?`);
    return;
  }
  hideDestinationPicker();
  setActiveDestination(place);
}

async function setActiveDestination(place) {
  activeDestination = { name: place.name, placeId: place.placeId, latitude: place.latitude, longitude: place.longitude };
  applyGuidedDestinationUI();
  logEvent("guided_destination_set", { placeId: place.placeId });

  // Real user gesture (a tap or voice-confirm) just happened right above —
  // this IS the valid gesture context iOS Safari's
  // DeviceOrientationEvent.requestPermission() requires; it cannot be
  // requested proactively on load. See startDestinationOrientationTracking
  // for the Android/no-prompt-needed path and the graceful-degradation
  // fallback.
  startDestinationOrientationTracking();

  clearInterval(destinationCheckInterval);
  destinationCheckInterval = setInterval(checkDestinationArrival, DESTINATION_CHECK_INTERVAL_MS);

  await fetchAndSpeakDirections();
}

// Directions are spoken as an ADDITIONAL element woven into the existing
// speech flow (same enqueueTtsSentence pipeline everything else uses), not
// a separate UI voice or narration pathway.
async function fetchAndSpeakDirections() {
  if (!activeDestination || !lastPosition) return;
  if (isNarrating || isConversing) return; // never talk over real narration/Q&A
  isNarrating = true;
  try {
    const params = new URLSearchParams({
      originLat: String(lastPosition.latitude),
      originLng: String(lastPosition.longitude),
      destLat: String(activeDestination.latitude),
      destLng: String(activeDestination.longitude),
      destName: activeDestination.name,
      language: settings.language,
    });
    const response = await fetch(`/api/get-directions?${params.toString()}`);
    const data = await response.json();
    if (!data.naturalLanguageDirections) {
      console.log("[destination] no route found");
      return;
    }
    activeDestination.distanceMeters = data.distanceMeters;
    data.naturalLanguageDirections
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .forEach((sentence) => enqueueTtsSentence(sentence));
    await waitForTtsQueueDrain();
  } catch (error) {
    console.log("[destination] fetchAndSpeakDirections failed, skipping:", error?.message || error);
  } finally {
    isNarrating = false;
  }
}

function stopGuidedDestination() {
  if (!activeDestination) return;
  logEvent("guided_destination_stopped", { placeId: activeDestination.placeId, reason: "user_cancelled" });
  activeDestination = null;
  clearInterval(destinationCheckInterval);
  destinationCheckInterval = null;
  stopDestinationOrientationTracking();
  applyGuidedDestinationUI();
}

async function checkDestinationArrival() {
  try {
    if (!activeDestination || !lastPosition) return;
    const distance = distanceInMeters(lastPosition, activeDestination);
    if (distance > DESTINATION_ARRIVAL_METERS) return;
    logEvent("guided_destination_arrived", { placeId: activeDestination.placeId });
    if (!isNarrating && !isConversing) {
      isNarrating = true;
      try {
        enqueueTtsSentence(`You've made it to ${activeDestination.name}.`);
        await waitForTtsQueueDrain();
      } finally {
        isNarrating = false;
      }
    }
    activeDestination = null;
    clearInterval(destinationCheckInterval);
    destinationCheckInterval = null;
    stopDestinationOrientationTracking();
    applyGuidedDestinationUI();
  } catch (error) {
    console.log("[destination] arrival check failed, skipping:", error?.message || error);
  }
}

// --- Reroute confirmation (Entry Points A/B, both input methods) ---
function showDestinationRerouteBanner(text) {
  if (!destinationRerouteBanner) return;
  destinationRerouteText.textContent = text;
  destinationRerouteVoiceInput.value = "";
  destinationRerouteVoiceHint.classList.add("hidden");
  destinationRerouteBanner.classList.remove("hidden");
  suppressMainMic();
  isConversing = true;
}
function hideDestinationRerouteBanner() {
  if (!destinationRerouteBanner) return;
  destinationRerouteBanner.classList.add("hidden");
  if (destinationRerouteMic?.cancel) destinationRerouteMic.cancel();
  restoreMainMic();
  if (!destinationPicker.classList.contains("is-visible")) isConversing = false;
}

// Shared by BOTH the tap (Yes button) and voice ("yes") paths — same
// pattern as Pillar 3's handleNeedsSuggestionYes/No, one handler, not two
// parallel implementations.
function handleDestinationRerouteYes() {
  if (!destinationRerouteCandidate) return;
  const place = destinationRerouteCandidate;
  destinationRerouteCandidate = null;
  hideDestinationRerouteBanner();
  setActiveDestination(place);
}
function handleDestinationRerouteNo() {
  destinationRerouteCandidate = null;
  hideDestinationRerouteBanner();
}
if (destinationRerouteYesBtn) destinationRerouteYesBtn.addEventListener("click", handleDestinationRerouteYes);
if (destinationRerouteNoBtn) destinationRerouteNoBtn.addEventListener("click", handleDestinationRerouteNo);

const destinationRerouteMic = destinationRerouteMicBtn
  ? createChatMicController({
      micBtn: destinationRerouteMicBtn,
      inputEl: destinationRerouteVoiceInput,
      onFinalTranscript: (text) => handleDestinationRerouteVoiceTranscript(text),
    })
  : null;
if (destinationRerouteMicBtn) destinationRerouteMicBtn.addEventListener("click", () => destinationRerouteMic.start());

// Reuses /api/interpret-needs-response's "confirm" stage — the same
// generic yes/no/unclear classifier Pillar 3 already built, rather than a
// second one for this pillar.
async function handleDestinationRerouteVoiceTranscript(transcript) {
  if (!destinationRerouteCandidate) return;
  try {
    const response = await fetch("/api/interpret-needs-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, stage: "confirm", userId: currentUser ? currentUser.id : null }),
    });
    const data = await response.json();
    if (data.intent === "yes") {
      handleDestinationRerouteYes();
    } else if (data.intent === "no") {
      handleDestinationRerouteNo();
    } else {
      destinationRerouteVoiceHint.textContent = "Didn't quite catch that — go ahead and tap below.";
      destinationRerouteVoiceHint.classList.remove("hidden");
    }
  } catch (error) {
    console.log("[destination] reroute voice interpretation failed, falling back to buttons:", error?.message || error);
    destinationRerouteVoiceHint.textContent = "Didn't quite catch that — go ahead and tap below.";
    destinationRerouteVoiceHint.classList.remove("hidden");
  }
}

// --- Two-arrow compass, rendered as part of the "you are here" marker
// itself (see buildUserLocationIcon/updateUserLocationOnMap) ---
// Real finding from investigating this rather than assuming: the OLD
// single arrow (removed) was a separate DOM element off to the side near
// the recenter button, and it compared DEVICE ORIENTATION against
// destination bearing. The marker's OWN existing heading arrow (Arrow 1,
// genuinely "keep as-is" per spec) has never used DeviceOrientationEvent
// at all — it's built from GPS course-of-travel (position.coords.heading,
// see onLocation/lastHeading), which is null/absent whenever the user is
// stationary — exactly when someone pausing to check a compass needs it
// most. So DeviceOrientationEvent is kept, but repurposed: only requested
// once a destination is active (same valid-gesture-context reasoning as
// before), and only used to make Arrow 1 itself more reliable —
// deviceOrientationHeading below is preferred over GPS heading whenever
// it's available, falling back to GPS heading otherwise. Arrow 2 (bearing
// to destination) needs no permission at all — it's pure geometry from
// already-available coordinates.
let deviceOrientationHeading = null;
let deviceOrientationHandler = null;
let destinationCompassPermissionRequested = false;
// Hysteresis (self-review requirement) — a lower bar to MERGE than to
// UN-merge prevents flicker right at one fixed boundary; chosen after
// reasoning about typical GPS/compass jitter (a few degrees) rather than
// picked arbitrarily; open to tuning from real walk-test feedback.
const COMPASS_MERGE_THRESHOLD_DEGREES = 18;
const COMPASS_UNMERGE_THRESHOLD_DEGREES = 26;
let isCompassMerged = false;

async function startDestinationOrientationTracking() {
  try {
    if (typeof DeviceOrientationEvent === "undefined") return;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (destinationCompassPermissionRequested) return; // iOS doesn't re-prompt; a denial can't be un-denied here
      destinationCompassPermissionRequested = true;
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") return;
    }
    deviceOrientationHandler = (event) => {
      const heading = typeof event.webkitCompassHeading === "number" ? event.webkitCompassHeading : 360 - (event.alpha || 0);
      deviceOrientationHeading = Number.isNaN(heading) ? null : heading;
    };
    window.addEventListener("deviceorientation", deviceOrientationHandler);
  } catch (error) {
    // Degrades gracefully — Arrow 1 just keeps using GPS heading, Arrow 2
    // and directions/narration are entirely unaffected either way.
    console.log("[destination] compass permission/setup failed, degrading gracefully:", error?.message || error);
  }
}

function stopDestinationOrientationTracking() {
  if (deviceOrientationHandler) {
    window.removeEventListener("deviceorientation", deviceOrientationHandler);
    deviceOrientationHandler = null;
  }
  deviceOrientationHeading = null;
  isCompassMerged = false;
}

function bearingDegreesTo(from, to) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// --- Tour mode selector + guided tour planner ---
// Two entry points from the Start Tour button: Wander (existing GPS-driven
// discovery flow, unchanged) or Plan My Tour (multi-step planner ->
// /api/plan-tour -> route drawn on the map -> guided walk between stops).

const plannerAnswers = {
  duration: null,
  maxDistance: null,
  startLocation: null, // {lat, lng, name}
  hasCustomEnd: false,
  endLocation: null, // {lat, lng, name} or null
  interests: [],
  specificFocus: "",
  hasSpecificTimes: false,
  startTime: null,
  endTime: null,
  computedDuration: null,
};

let plannedTour = null; // {tourTitle, tourDescription, estimatedDuration, estimatedDistance, stops:[{...,place}], openingNote}
let plannedTourActive = false;
let plannedTourStopIndex = 0;
let plannedTourMarkers = [];
let plannedTourRouteLine = null;
const GUIDED_TOUR_ARRIVAL_METERS = 30;
// Set when the user tapped "Start This Tour" while still meaningfully far
// from stop 0 — defers the openingNote until checkGuidedTourProgress
// detects real arrival there, instead of narrating as if they were already
// standing at the start point.
let plannedTourOpeningNotePending = false;

let startAutocomplete = null;
let endAutocomplete = null;

function openTourModeModal() {
  tourModeModal.classList.remove("hidden");
}

function closeTourModeModal() {
  tourModeModal.classList.add("hidden");
}

if (tourModeClose) tourModeClose.addEventListener("click", closeTourModeModal);
if (tourModeWanderBtn) {
  tourModeWanderBtn.addEventListener("click", async () => {
    closeTourModeModal();
    // Wander mode always starts fresh at the default mood — the planner's
    // mood step (Guided Tour) sets sessionMood right before its own
    // startTour() call, so this reset must NOT live inside startTour()
    // itself or it would clobber that choice.
    setSessionMood("curious");
    await startTour();
    // Guided Destination pillar, Entry Point A — a new call alongside
    // startTour(), not inside it; a no-op when the flag is off. Awaited
    // so the picker appears once wandering has actually begun (GPS
    // watch registered etc.), not racing startTour()'s own async setup.
    maybeOfferDestinationPrompt();
  });
}
if (tourModePlanBtn) {
  tourModePlanBtn.addEventListener("click", () => {
    closeTourModeModal();
    openTourPlanner();
  });
}

async function openTourPlanner() {
  showPlannerStep(0);
  populatePlannerInterests();
  tourPlanner.classList.remove("hidden");
  initPlannerAutocomplete();
}

function closeTourPlanner() {
  tourPlanner.classList.add("hidden");
}

if (plannerClose) plannerClose.addEventListener("click", closeTourPlanner);

function showPlannerStep(index) {
  document.querySelectorAll(".planner-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.plannerStep) === index);
  });
}

async function initPlannerAutocomplete() {
  await waitForGoogleMaps();
  if (!window.google?.maps?.places) return;

  if (!startAutocomplete && plannerStartInput) {
    startAutocomplete = new google.maps.places.Autocomplete(plannerStartInput, {
      fields: ["geometry", "name", "formatted_address"],
    });
    startAutocomplete.addListener("place_changed", () => {
      const place = startAutocomplete.getPlace();
      if (place.geometry?.location) {
        plannerAnswers.startLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || place.formatted_address,
        };
      }
    });
  }

  if (!endAutocomplete && plannerEndInput) {
    endAutocomplete = new google.maps.places.Autocomplete(plannerEndInput, {
      fields: ["geometry", "name", "formatted_address"],
    });
    endAutocomplete.addListener("place_changed", () => {
      const place = endAutocomplete.getPlace();
      if (place.geometry?.location) {
        plannerAnswers.endLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || place.formatted_address,
        };
      }
    });
  }
}

// --- Planner Step 0: time + distance ---

if (plannerDurationCards) {
  plannerDurationCards.querySelectorAll(".planner-card").forEach((card) => {
    card.addEventListener("click", () => {
      plannerDurationCards.querySelectorAll(".planner-card").forEach((c) => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      plannerAnswers.duration = card.dataset.value;
      updatePlannerStep0NextState();
    });
  });
}

if (plannerDistancePills) {
  plannerDistancePills.querySelectorAll(".planner-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      plannerDistancePills.querySelectorAll(".planner-pill").forEach((p) => p.classList.remove("is-selected"));
      pill.classList.add("is-selected");
      plannerAnswers.maxDistance = pill.dataset.value;
      updatePlannerStep0NextState();
    });
  });
}

// Specific start/end times are an alternative to (not a replacement for)
// the bucketed duration cards — either alone is enough to proceed. When
// both times are set, the computed duration between them overrides
// plannerAnswers.duration so it drives pacing/stop count in /api/plan-tour
// instead of the bucketed value.
if (plannerSpecificTimesToggle) {
  plannerSpecificTimesToggle.addEventListener("click", () => {
    plannerSpecificTimesField.classList.toggle("hidden");
  });
}

function updatePlannerComputedTime() {
  const startVal = plannerStartTimeInput?.value;
  const endVal = plannerEndTimeInput?.value;
  if (!startVal || !endVal) {
    plannerAnswers.hasSpecificTimes = false;
    updatePlannerStep0NextState();
    return;
  }
  const [startH, startM] = startVal.split(":").map(Number);
  const [endH, endM] = endVal.split(":").map(Number);
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) minutes += 24 * 60; // end time is past midnight
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const durationLabel = [hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : null, mins > 0 ? `${mins} minutes` : null]
    .filter(Boolean)
    .join(" ");
  plannerAnswers.hasSpecificTimes = true;
  plannerAnswers.startTime = startVal;
  plannerAnswers.endTime = endVal;
  plannerAnswers.computedDuration = durationLabel || "a short while";
  updatePlannerStep0NextState();
}

if (plannerStartTimeInput) plannerStartTimeInput.addEventListener("change", updatePlannerComputedTime);
if (plannerEndTimeInput) plannerEndTimeInput.addEventListener("change", updatePlannerComputedTime);

function updatePlannerStep0NextState() {
  const hasDuration = Boolean(plannerAnswers.duration) || Boolean(plannerAnswers.hasSpecificTimes);
  plannerStep0NextBtn.disabled = !(hasDuration && plannerAnswers.maxDistance);
}

if (plannerStep0NextBtn) {
  plannerStep0NextBtn.addEventListener("click", () => showPlannerStep(1));
}

// --- Planner Step 1: start / end points ---

if (plannerUseCurrentLocationBtn) {
  plannerUseCurrentLocationBtn.addEventListener("click", () => {
    if (!hasGeolocationSupport()) {
      showToast("Location isn't available on this device");
      return;
    }
    plannerUseCurrentLocationBtn.textContent = "Locating...";
    geoGetCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name = "Current location";
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (response.ok && data.locationName) name = data.locationName;
        } catch (error) {
          // Fall back to the generic label.
        }
        plannerAnswers.startLocation = { lat: latitude, lng: longitude, name };
        plannerStartInput.value = name;
        plannerUseCurrentLocationBtn.textContent = "Use my current location";
      },
      () => {
        plannerUseCurrentLocationBtn.textContent = "Use my current location";
        showToast("Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

if (plannerEndNoBtn) {
  plannerEndNoBtn.addEventListener("click", () => {
    plannerAnswers.hasCustomEnd = false;
    plannerEndNoBtn.classList.add("is-active");
    plannerEndYesBtn.classList.remove("is-active");
    plannerEndField.classList.add("hidden");
  });
}

if (plannerEndYesBtn) {
  plannerEndYesBtn.addEventListener("click", () => {
    plannerAnswers.hasCustomEnd = true;
    plannerEndYesBtn.classList.add("is-active");
    plannerEndNoBtn.classList.remove("is-active");
    plannerEndField.classList.remove("hidden");
  });
}

if (plannerStep1NextBtn) {
  plannerStep1NextBtn.addEventListener("click", () => {
    if (!plannerAnswers.startLocation) {
      showToast("Please choose a starting point from the suggestions");
      return;
    }
    if (plannerAnswers.hasCustomEnd && !plannerAnswers.endLocation) {
      showToast("Please choose an end point from the suggestions");
      return;
    }
    showPlannerStep(2);
  });
}

// --- Planner Step 2: today's interests ---

function populatePlannerInterests() {
  const savedInterests = userProfile?.interests || [];
  if (plannerSavedInterestsNote) {
    plannerSavedInterestsNote.textContent = savedInterests.length
      ? `Your saved interests are ${savedInterests.join(", ")} — but today might be different.`
      : "";
  }
  if (!plannerInterestPillsContainer) return;
  const pills = plannerInterestPillsContainer.querySelectorAll(".onboarding-pill");
  pills.forEach((pill) => {
    pill.classList.toggle("is-selected", savedInterests.includes(pill.dataset.value));
  });
  plannerAnswers.interests = Array.from(pills)
    .filter((pill) => pill.classList.contains("is-selected"))
    .map((pill) => pill.dataset.value);
}

if (plannerInterestPillsContainer) {
  plannerInterestPillsContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      pill.classList.toggle("is-selected");
      plannerAnswers.interests = Array.from(
        plannerInterestPillsContainer.querySelectorAll(".onboarding-pill.is-selected")
      ).map((p) => p.dataset.value);
    });
  });
}

// --- Planner Step 3: generate ---

if (plannerGenerateBtn) {
  plannerGenerateBtn.addEventListener("click", async () => {
    plannerAnswers.specificFocus = plannerSpecificFocus.value.trim();
    showPlannerStep(3);
    await generatePlannedTour();
  });
}

async function generatePlannedTour() {
  try {
    const response = await fetch("/api/plan-tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startLocation: plannerAnswers.startLocation,
        endLocation: plannerAnswers.hasCustomEnd ? plannerAnswers.endLocation : null,
        duration: plannerAnswers.hasSpecificTimes ? plannerAnswers.computedDuration : plannerAnswers.duration,
        maxDistance: plannerAnswers.maxDistance,
        interests: plannerAnswers.interests,
        specificFocus: plannerAnswers.specificFocus,
        userProfile,
        currentCity: currentCity || plannerAnswers.startLocation?.name,
      }),
    });
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.stops) || data.stops.length === 0) {
      showToast("Couldn't plan a tour — try again");
      closeTourPlanner();
      return;
    }

    plannedTour = data;
    closeTourPlanner();
    showPlannedTourOnMap(data);
  } catch (error) {
    showToast("Couldn't plan a tour — try again");
    closeTourPlanner();
  }
}

// --- Rendering the planned tour on the map ---

function showPlannedTourOnMap(tour) {
  clearPlannedTourFromMap();
  if (!map || !window.google) return;

  const bounds = new google.maps.LatLngBounds();
  const path = [];

  tour.stops.forEach((stop, index) => {
    const place = stop.place;
    if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") return;
    const position = { lat: place.latitude, lng: place.longitude };
    path.push(position);
    bounds.extend(position);

    const marker = new google.maps.Marker({
      position,
      map,
      label: { text: String(index + 1), color: "#0F1B2D", fontWeight: "700", fontSize: "13px" },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#D4A853",
        fillOpacity: 1,
        strokeColor: "#0F1B2D",
        strokeWeight: 1.5,
        scale: 16,
      },
      zIndex: 700,
    });
    marker.addListener("click", () => {
      if (activeInfoWindow) activeInfoWindow.close();
      activeInfoWindow = new google.maps.InfoWindow({ content: buildPlannedStopPopupContent(stop, index) });
      activeInfoWindow.open({ map, anchor: marker });
    });
    plannedTourMarkers.push(marker);
  });

  if (path.length > 1) {
    plannedTourRouteLine = new google.maps.Polyline({
      path,
      map,
      strokeColor: "#D4A853",
      strokeOpacity: 0.8,
      strokeWeight: 3,
    });
  }

  if (!bounds.isEmpty()) map.fitBounds(bounds, 60);

  plannedTourTitleEl.textContent = tour.tourTitle || "Your custom tour";
  plannedTourDescEl.textContent = tour.tourDescription || "";
  plannedTourMetaEl.textContent = `${tour.estimatedDuration || ""} · ${tour.estimatedDistance || ""} · ${tour.stops.length} stops`;
  plannedTourCard.classList.remove("hidden");
}

// Simple preview popup — "tap a numbered pin to preview what stop is about."
function buildPlannedStopPopupContent(stop, index) {
  const container = document.createElement("div");
  container.className = "map-pin-popup";
  container.innerHTML = `<div class="map-pin-popup-name"></div><div class="map-pin-popup-type"></div>`;
  container.querySelector(".map-pin-popup-name").textContent = `${index + 1}. ${stop.placeName}`;
  container.querySelector(".map-pin-popup-type").textContent = stop.whyThisStop || stop.placeType || "";
  return container;
}

function clearPlannedTourFromMap() {
  plannedTourMarkers.forEach((marker) => marker.setMap(null));
  plannedTourMarkers = [];
  if (plannedTourRouteLine) {
    plannedTourRouteLine.setMap(null);
    plannedTourRouteLine = null;
  }
}

if (plannedTourDiscardBtn) {
  plannedTourDiscardBtn.addEventListener("click", () => {
    plannedTourCard.classList.add("hidden");
    clearPlannedTourFromMap();
    plannedTour = null;
  });
}

if (plannedTourStartBtn) {
  plannedTourStartBtn.addEventListener("click", async () => {
    if (!plannedTour) return;
    plannedTourCard.classList.add("hidden");
    plannedTourActive = true;
    plannedTourStopIndex = 0;
    plannedTourOpeningNotePending = false;

    unlockAudio();

    // Check the user's actual distance from stop 0 BEFORE assuming they're
    // standing there — a fresh one-off fix, since startTour()'s
    // watchPosition hasn't produced any reading yet at this exact moment.
    const firstStopPlace = plannedTour.stops[0]?.place;
    const distanceToStart = await new Promise((resolve) => {
      if (!firstStopPlace || !hasGeolocationSupport()) {
        resolve(0);
        return;
      }
      geoGetCurrentPosition(
        (position) =>
          resolve(
            distanceInMeters(
              { latitude: position.coords.latitude, longitude: position.coords.longitude },
              { latitude: firstStopPlace.latitude, longitude: firstStopPlace.longitude }
            )
          ),
        () => resolve(0),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    startTour();

    if (distanceToStart > GUIDED_TOUR_ARRIVAL_METERS) {
      // Not there yet — defer the opening note to checkGuidedTourProgress,
      // which will speak it the moment real arrival at stop 0 is detected.
      plannedTourOpeningNotePending = true;
      showToast(
        `You're about ${Math.round(distanceToStart)}m from the start — head there and I'll begin once you arrive.`
      );
      statusText.textContent = `Head toward ${plannedTour.stops[0].placeName} to begin (${Math.round(distanceToStart)}m)`;
    } else if (plannedTour.openingNote) {
      startStory(plannedTour.tourTitle || "Your Tour", plannedTour.openingNote);
      await speakNarration(plannedTour.openingNote);
    }
  });
}

// Called from checkForNarration (in place of the normal
// orientation/specific-zoom-in flow) whenever a guided tour is active —
// narrates the current target stop once the user is within
// GUIDED_TOUR_ARRIVAL_METERS of it, then advances to the next stop.
let lastKnownDistanceToStop = null;
let lastRouteDeviationLogTime = 0;
const ROUTE_DEVIATION_THRESHOLD_METERS = 150;
const ROUTE_DEVIATION_LOG_COOLDOWN_MS = 5 * 60 * 1000;

// Guided-tour-only prefetch: the next stop's location is already known in
// advance (unlike Wander mode, where the next place isn't predictable), so
// narration generation can start in the background once the user is
// getting close — well before they're within GUIDED_TOUR_ARRIVAL_METERS —
// so it's ready or nearly ready by the time arrival actually triggers
// playback. This only prefetches the Claude generation step (usually the
// slower, more variable part); TTS synthesis still happens at arrival time
// via the normal gapless queue in narrateAndSpeak.
const GUIDED_TOUR_PREFETCH_METERS = 50;
let guidedTourPrefetch = null; // { stopIndex, focusedPlace, narrationText, done, failed }

function prefetchGuidedTourStop(stopIndex, place, heading, triggerPosition) {
  if (guidedTourPrefetch && guidedTourPrefetch.stopIndex === stopIndex) return; // already in flight or done

  const entry = { stopIndex, focusedPlace: null, narrationText: "", done: false, failed: false };
  guidedTourPrefetch = entry;
  console.log(`[prefetch] starting background narration generation for guided tour stop ${stopIndex}`);

  const directionOfTravel = computeDirectionOfTravel();
  const { proactive: nearbyInterestPlace } = triggerPosition
    ? findNearbyInterestPlace(triggerPosition.latitude, triggerPosition.longitude, heading)
    : { proactive: null };

  streamSSE(
    "/api/narrate",
    {
      tier: "specific",
      places: [place],
      heading,
      directionOfTravel,
      depth: settings.depth,
      language: settings.language,
      userProfile,
      sessionLog,
      correctionContext,
      crossSessionVisitedPlaces: crossSessionVisitedPlaceNames,
      returningUserContext,
      isFirstNarrationOfSession,
      neighborhood: currentNeighborhoodName,
      city: currentCity,
      country: currentCountry,
      weather: currentWeather,
      nearbyInterestPlace,
      firstVisitToCity: computeFirstVisitToCity(),
      timeOfDay: computeTimeOfDay(),
      userStatedDirection,
      userStatedDestination,
      persona: currentPersona,
      isCityChange: false,
      sessionMood,
      isGuidedTour: true,
    },
    {
      onMarker: () => {
        // Only one candidate place for a guided tour stop (unlike Wander
        // mode's multi-place specific tier) — the marker exists for API
        // consistency but there's nothing to disambiguate here.
        entry.focusedPlace = place;
      },
      onSentence: (text) => {
        entry.narrationText = entry.narrationText ? `${entry.narrationText} ${text}` : text;
      },
      onDone: (payload) => {
        if (payload.fullText) entry.narrationText = payload.fullText;
        entry.done = true;
        console.log(`[prefetch] guided tour stop ${stopIndex} narration ready ahead of arrival`);
      },
    }
  ).catch((error) => {
    entry.failed = true;
    console.log(`[prefetch] guided tour stop ${stopIndex} prefetch failed:`, error?.message || error);
  });
}

async function checkGuidedTourProgress(latitude, longitude, heading) {
  if (!plannedTour || plannedTourStopIndex >= plannedTour.stops.length) {
    if (plannedTourActive) {
      logEvent("tour_completed", { totalStops: plannedTour?.stops.length || 0, stopsReached: plannedTourStopIndex });
    }
    plannedTourActive = false;
    statusText.textContent = "Tour complete! Keep exploring or start a new one.";
    return;
  }

  const stop = plannedTour.stops[plannedTourStopIndex];
  const place = stop.place;
  if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") {
    plannedTourStopIndex += 1;
    return;
  }

  const distance = distanceInMeters({ latitude, longitude }, { latitude: place.latitude, longitude: place.longitude });

  if (distance <= GUIDED_TOUR_ARRIVAL_METERS) {
    lastKnownDistanceToStop = null;
    if (narratedPlaceIds.has(place.placeId)) {
      plannedTourStopIndex += 1;
      return;
    }
    if (plannedTourOpeningNotePending && plannedTourStopIndex === 0) {
      plannedTourOpeningNotePending = false;
      if (plannedTour.openingNote) {
        startStory(plannedTour.tourTitle || "Your Tour", plannedTour.openingNote);
        await speakNarration(plannedTour.openingNote);
      }
      narratedPlaceIds.add(place.placeId);
      plannedTourStopIndex += 1;
      return;
    }
    const prefetched =
      guidedTourPrefetch &&
      guidedTourPrefetch.stopIndex === plannedTourStopIndex &&
      guidedTourPrefetch.done &&
      !guidedTourPrefetch.failed &&
      guidedTourPrefetch.narrationText
        ? guidedTourPrefetch
        : null;
    await narrateAndSpeak({
      tier: "specific",
      places: [place],
      heading,
      triggerPosition: { latitude, longitude },
      prefetchedNarrationText: prefetched?.narrationText || null,
      prefetchedFocusedPlace: prefetched?.focusedPlace || null,
    });
    guidedTourPrefetch = null;
    plannedTourStopIndex += 1;
    return;
  }

  // Guided tour only — the next stop is already known, so start generating
  // its narration in the background once close enough that arrival is
  // imminent, rather than only starting at the exact trigger moment. Not
  // applied to Wander mode, where the next place isn't predictable.
  if (distance <= GUIDED_TOUR_PREFETCH_METERS) {
    prefetchGuidedTourStop(plannedTourStopIndex, place, heading, { latitude, longitude });
  }

  // Sampled/throttled — only logs when the user is sustainedly moving
  // AWAY from the target stop (not just GPS jitter or walking around a
  // building), and at most once every 5 minutes.
  if (
    lastKnownDistanceToStop !== null &&
    distance - lastKnownDistanceToStop > ROUTE_DEVIATION_THRESHOLD_METERS &&
    Date.now() - lastRouteDeviationLogTime > ROUTE_DEVIATION_LOG_COOLDOWN_MS
  ) {
    logEvent("route_deviation", {
      stopNumber: stop.stopNumber,
      distanceMeters: Math.round(distance),
      increasedByMeters: Math.round(distance - lastKnownDistanceToStop),
    });
    lastRouteDeviationLogTime = Date.now();
  }
  lastKnownDistanceToStop = distance;

  const bearing = travelBearingDegrees(latitude, longitude, place.latitude, place.longitude);
  const direction = bearingToCompassWord(bearing);
  statusText.textContent = `Head ${direction || "ahead"} toward ${stop.placeName} (${Math.round(distance)}m)`;
}

// --- Weather ---

async function fetchWeather(latitude, longitude) {
  try {
    const response = await fetch(`/api/weather?lat=${latitude}&lng=${longitude}`);
    const data = await response.json();
    currentWeather = response.ok ? data.weather || null : null;
  } catch (error) {
    currentWeather = null;
  }
}

function startWeatherRefresh(latitude, longitude) {
  fetchWeather(latitude, longitude);
  clearInterval(weatherRefreshInterval);
  weatherRefreshInterval = setInterval(() => {
    if (lastPosition) fetchWeather(lastPosition.latitude, lastPosition.longitude);
  }, WEATHER_REFRESH_MS);
}

// --- Interest-based map pins + proactive guidance ---
// Backed by /api/map-pins's Claude relevance scoring (server does the
// interest-matching; the client just passes the user's raw stated +
// inferred interest labels).

// Was its own /api/interest-places endpoint with a crude interest-label ->
// Google-Places-type map (e.g. "Hidden stories" -> point_of_interest) and
// zero relevance filtering — that's exactly what let hotels and other noise
// through, since point_of_interest is attached to nearly every commercial
// establishment. Now consolidated onto /api/map-pins: same relevance-tiered
// pipeline (Places-type exclusion list + Claude scoring against stated AND
// inferred interests) that general map pins already use, just treating
// relevanceTier === "high" as "genuinely interest-matched" for this
// specific purpose — large priority pins, proactive guidance, and the
// immediate-narrate-within-30m bypass (see findNearbyInterestPlace).
async function loadInterestPlaces(latitude, longitude) {
  if (!userProfile || !Array.isArray(userProfile.interests) || userProfile.interests.length === 0) {
    console.log("[map] loadInterestPlaces skipped — no saved interests on profile");
    interestPlaces = [];
    return;
  }
  try {
    const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
    params.set("interests", userProfile.interests.join("|"));
    if (userProfile.inferredInterests?.length) {
      params.set("inferredInterests", userProfile.inferredInterests.join("|"));
    }
    const response = await fetch(`/api/map-pins?${params.toString()}`);
    const data = await response.json();
    const allPlaces = response.ok && Array.isArray(data.places) ? data.places : [];
    interestPlaces = allPlaces.filter((place) => place.relevanceTier === "high");
    console.log(
      `[map] /api/map-pins (for interests) returned ${allPlaces.length} place(s), ${interestPlaces.length} high-relevance`
    );
    if (interestPlaces.length > 0) {
      pinsEverLoaded = true;
      clearTimeout(noPinsToastTimeout);
    }
    interestPlaces.forEach((place) => upsertPlaceMarker(place, { isInterestMatch: true }));
  } catch (error) {
    console.log("[map] loadInterestPlaces failed", error);
    interestPlaces = [];
  }
}

// Finds the nearest not-yet-narrated interest place and buckets it into
// "immediately narrate" (within 30m — bypasses the normal cooldown) or
// "mention proactively at the end of this narration" (100-300m away).
function findNearbyInterestPlace(latitude, longitude, heading) {
  const here = { latitude, longitude };
  let nearest = null;
  let nearestDistance = Infinity;

  for (const place of interestPlaces) {
    if (narratedPlaceIds.has(place.placeId) || visitedPlaceIds.has(place.placeId)) continue;
    if (typeof place.latitude !== "number" || typeof place.longitude !== "number") continue;
    const distance = distanceInMeters(here, { latitude: place.latitude, longitude: place.longitude });
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = place;
    }
  }

  if (!nearest) return { immediate: null, proactive: null };

  if (nearestDistance <= INTEREST_IMMEDIATE_METERS) {
    return { immediate: nearest, proactive: null };
  }

  if (nearestDistance >= INTEREST_PROACTIVE_MIN_METERS && nearestDistance <= INTEREST_PROACTIVE_MAX_METERS) {
    const bearing = travelBearingDegrees(latitude, longitude, nearest.latitude, nearest.longitude);
    const direction = typeof heading === "number" ? relativeDirectionFromHeading(heading, bearing) : bearingToCompassWord(bearing);
    return { immediate: null, proactive: { name: nearest.name, distanceMeters: nearestDistance, direction } };
  }

  return { immediate: null, proactive: null };
}

// Direction phrased relative to the user's own heading ("to your left") when
// we know which way they're facing, otherwise falls back to a compass word.
function relativeDirectionFromHeading(heading, bearingToPlace) {
  let diff = ((bearingToPlace - heading) % 360 + 360) % 360;
  if (diff <= 20 || diff >= 340) return "straight ahead";
  if (diff > 20 && diff < 160) return "right";
  if (diff >= 160 && diff <= 200) return "behind you";
  return "left";
}

// --- Tour controls ---

startBtn.addEventListener("click", () => {
  // iOS Safari only allows "unlocking" audio playback from directly inside
  // a user gesture handler. Doing it here (once) means every later
  // location-triggered narration can call .play() on this same element
  // without a fresh tap, including with the screen locked.
  unlockAudio();
  openTourModeModal();
});
playBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePlayback();
});
pauseBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePlayback();
});

drawerHandle.addEventListener("click", () => {
  playerCard.classList.add("is-open");
});
drawerClose.addEventListener("click", (event) => {
  event.stopPropagation();
  playerCard.classList.remove("is-open");
});

cameraBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  handleCameraTap();
});

// "Point and learn" camera feature. Uses getUserMedia — when this app is
// ever wrapped with Capacitor for the App Store, the native camera plugin
// should replace getUserMedia here for better performance/reliability; the
// rest of the flow (capture → /api/identify → drawer + speech) stays the
// same either way.
const CAMERA_ENABLED = true;
let cameraStream = null;
let isIdentifying = false;

// Real field bug this fixes: /api/identify used to receive no location
// context at all, so a photo taken well after (and well away from) the
// last narrated place still got interpreted with that place bleeding
// into Claude's reasoning. This decay check is what decides whether
// recentNarrationContext is even sent — see buildIdentifyLocationGuidance
// in server.js, which trusts that by the time this field arrives, it's
// still genuinely relevant. "Still standing at the same spot" vs. "clearly
// moved on" — picked via judgment, not a precise science.
const CAMERA_CONTEXT_DECAY_MINUTES = 2.5;
const CAMERA_CONTEXT_DECAY_METERS = 40;

function buildRecentNarrationContextForCamera() {
  if (!currentPlaceName || lastNarrationEndTime === 0) return null;
  const minutesAgo = (Date.now() - lastNarrationEndTime) / 60000;
  if (minutesAgo > CAMERA_CONTEXT_DECAY_MINUTES) return null;
  if (lastNarrationPosition && lastPosition) {
    const moved = distanceInMeters(lastNarrationPosition, lastPosition);
    if (moved > CAMERA_CONTEXT_DECAY_METERS) return null;
  }
  return { placeName: currentPlaceName, minutesAgo: Math.round(minutesAgo * 10) / 10 };
}

async function handleCameraTap() {
  if (!CAMERA_ENABLED) {
    showToast("Camera feature is unavailable");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Camera isn't supported on this device");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    cameraVideo.srcObject = cameraStream;
    if (cameraPermissionDenied) cameraPermissionDenied.classList.add("hidden");
    cameraOverlay.classList.remove("hidden");
  } catch (error) {
    showCameraPermissionDenied(error);
  }
}

// Replaces the bare "Camera permission denied" toast — explains WHY Sabri
// wants camera access and, specifically for the "previously blocked" case
// (NotAllowedError/SecurityError on a repeat attempt), how to actually
// re-enable it, since a silent failure or generic toast leaves the user
// with no path forward.
function showCameraPermissionDenied(error) {
  if (!cameraPermissionDenied) {
    showToast("Camera permission denied");
    return;
  }
  cameraOverlay.classList.add("hidden");

  const wasBlocked = error && (error.name === "NotAllowedError" || error.name === "SecurityError");
  const noCameraFound = error && (error.name === "NotFoundError" || error.name === "OverconstrainedError");

  if (noCameraFound) {
    cameraPermissionMessage.textContent =
      "No camera was found on this device — point-and-learn needs one to identify what you're looking at.";
  } else {
    cameraPermissionMessage.textContent =
      "Point-and-learn uses your camera to identify what you're looking at — nothing is saved or shared, it's " +
      "just sent once to figure out what you're seeing.";
  }
  cameraPermissionHint.classList.toggle("hidden", !wasBlocked);
  cameraPermissionRetryBtn.classList.toggle("hidden", noCameraFound);
  cameraPermissionDenied.classList.remove("hidden");
}

if (cameraPermissionRetryBtn) {
  cameraPermissionRetryBtn.addEventListener("click", () => {
    cameraPermissionDenied.classList.add("hidden");
    handleCameraTap();
  });
}

if (cameraPermissionCloseBtn) {
  cameraPermissionCloseBtn.addEventListener("click", () => {
    cameraPermissionDenied.classList.add("hidden");
  });
}

function closeCameraOverlay() {
  cameraOverlay.classList.add("hidden");
  if (cameraPermissionDenied) cameraPermissionDenied.classList.add("hidden");
  if (cameraLoading) cameraLoading.classList.add("hidden");
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

if (cameraCloseBtn) {
  cameraCloseBtn.addEventListener("click", closeCameraOverlay);
}

// In-character, spoken failure message — matches how every other failure
// in the app (narration, Q&A) stays in Sabri's voice rather than a raw
// error, and is spoken aloud since this app is voice-first throughout.
function handleIdentifyFailure() {
  const message = "Hmm, I couldn't quite make that out — want to try again?";
  showToast(message);
  speakNarration(message).catch(() => {});
}

if (cameraIdentifyBtn) {
  cameraIdentifyBtn.addEventListener("click", async () => {
    if (isIdentifying || !cameraStream) return;
    isIdentifying = true;
    cameraIdentifyBtn.disabled = true;
    // Loading state layers OVER the still-live (but now static-looking)
    // preview for the few seconds Claude is processing the frame — matches
    // the wave+text loading pattern used for narration/onboarding chat
    // elsewhere, rather than just a button-text change that's easy to miss.
    if (cameraLoading) cameraLoading.classList.remove("hidden");

    try {
      const videoWidth = cameraVideo.videoWidth || 1280;
      const videoHeight = cameraVideo.videoHeight || 720;
      cameraCanvas.width = videoWidth;
      cameraCanvas.height = videoHeight;
      const context = cameraCanvas.getContext("2d");
      context.drawImage(cameraVideo, 0, 0, videoWidth, videoHeight);
      const imageBase64 = cameraCanvas.toDataURL("image/jpeg", 0.85);

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mediaType: "image/jpeg",
          language: settings.language,
          city: currentCity,
          country: currentCountry,
          neighborhood: currentNeighborhoodName,
          recentNarrationContext: buildRecentNarrationContextForCamera(),
        }),
      });
      const data = await response.json();

      closeCameraOverlay();

      if (!response.ok || !data.narration) {
        handleIdentifyFailure();
        return;
      }

      placeName.textContent = "Sabri";
      placeDescription.textContent = data.narration;
      placeDescription.classList.remove("story-description--fallback");
      playerCard.classList.remove("hidden");
      playerCard.classList.add("is-open");
      appEl.classList.add("has-player");
      startPrompt.classList.add("hidden");
      tourControls.classList.remove("hidden");

      logEvent("camera_identify_used", { resultSnippet: data.narration.slice(0, 80) });
      await speakNarration(data.narration);
    } catch (error) {
      closeCameraOverlay();
      handleIdentifyFailure();
    } finally {
      isIdentifying = false;
      cameraIdentifyBtn.disabled = false;
      if (cameraLoading) cameraLoading.classList.add("hidden");
    }
  });
}

let toastHideTimeout = null;
function showToast(message) {
  clearTimeout(toastHideTimeout);
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  toastHideTimeout = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 2200);
}

// --- Tour-start loading overlay (Wander mode) ---
// Covers the map from "Start Wandering" until the first narration is ready,
// so the GPS-lock -> places-search -> Claude pipeline never looks frozen.
// Stages only ever move forward — advanceTourLoadingStage ignores calls for
// a stage at or before the current one (e.g. a second GPS fix arriving
// after we've already moved on to "discovering").
const TOUR_LOADING_STAGES = ["locating", "locking", "discovering", "meeting_guide", "preparing"];
const TOUR_LOADING_MESSAGES = {
  locating: "Finding your location...",
  locking: "Locking GPS...",
  discovering: "Discovering nearby places...",
  meeting_guide: "Meeting your guide...",
  preparing: "Preparing your guide...",
};
let tourLoadingStageIndex = -1;

function showTourLoadingOverlay() {
  if (!tourLoadingOverlay) return;
  tourLoadingStageIndex = -1;
  tourLoadingOverlay.classList.remove("hidden");
  advanceTourLoadingStage("locating");
}

function advanceTourLoadingStage(stage) {
  if (!tourLoadingOverlay || tourLoadingOverlay.classList.contains("hidden")) return;
  const index = TOUR_LOADING_STAGES.indexOf(stage);
  if (index < 0 || index <= tourLoadingStageIndex) return;
  tourLoadingStageIndex = index;
  tourLoadingText.textContent = TOUR_LOADING_MESSAGES[stage];
}

function hideTourLoadingOverlay() {
  if (!tourLoadingOverlay) return;
  tourLoadingOverlay.classList.add("hidden");
}

// --- Narration loading state (place-name-visible, story-not-ready-yet) ---
// Typically 3-8 seconds (Claude narration + OpenAI TTS) — the wave/spinner
// keep it feeling alive, and the 15s fallback message covers the rare slow
// call so it never reads as frozen.
const NARRATION_LOADING_SLOW_MS = 15000;
let narrationLoadingTimeout = null;

function showNarrationLoadingState(bestGuessPlaceName) {
  if (bestGuessPlaceName) {
    locationName.textContent = bestGuessPlaceName;
  }
  if (narrationWaveEl) narrationWaveEl.classList.remove("hidden");
  statusText.classList.add("is-loading");
  const playIcon = playBtn.querySelector(".play-icon");
  const spinner = playBtn.querySelector(".loading-spinner");
  if (playIcon) playIcon.classList.add("hidden");
  if (spinner) spinner.classList.remove("hidden");

  clearTimeout(narrationLoadingTimeout);
  narrationLoadingTimeout = setTimeout(() => {
    statusText.textContent = "Still working on it... great stories take a moment";
  }, NARRATION_LOADING_SLOW_MS);
}

function hideNarrationLoadingState() {
  clearTimeout(narrationLoadingTimeout);
  if (narrationWaveEl) narrationWaveEl.classList.add("hidden");
  statusText.classList.remove("is-loading");
  const playIcon = playBtn.querySelector(".play-icon");
  const spinner = playBtn.querySelector(".loading-spinner");
  if (playIcon) playIcon.classList.remove("hidden");
  if (spinner) spinner.classList.add("hidden");
}

let drawerTouchStartY = null;
playerCard.addEventListener(
  "touchstart",
  (event) => {
    drawerTouchStartY = event.touches[0].clientY;
  },
  { passive: true }
);
playerCard.addEventListener("touchend", (event) => {
  if (drawerTouchStartY === null) return;
  const deltaY = event.changedTouches[0].clientY - drawerTouchStartY;
  if (deltaY < -40) {
    playerCard.classList.add("is-open");
  } else if (deltaY > 40) {
    playerCard.classList.remove("is-open");
  }
  drawerTouchStartY = null;
});

speedButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedSpeed = parseFloat(button.dataset.speed);
    speedButtons.forEach((b) => b.classList.remove("is-active"));
    button.classList.add("is-active");
    // Real bug found while wiring this up: these buttons previously only
    // sent a `speed` param to /api/speak, which speakWithOpenAI honors but
    // speakWithInworld (server.js) never even reads — under the current
    // Inworld-default setup, tapping 0.75x/1.25x did nothing audible at
    // all. audio.playbackRate works regardless of which TTS provider
    // generated the clip, so it's now the only speed mechanism — see
    // fetchSpeechBlobUrl, which no longer sends `speed` server-side at
    // all, to avoid the two ever compounding (1.25x server + 1.25x client
    // would silently play at 1.5625x). Applied immediately here so a
    // speed change takes effect on whatever's already playing, not just
    // the next clip.
    audioPlayer.playbackRate = selectedSpeed;
  });
});

// Session mood — UX decision: made this an always-visible, always-editable
// toggle in the control bar (Wander mode) rather than a blocking overlay
// after "Start Wandering", so tour start stays exactly as fast as it is
// today (zero extra taps). The tradeoff: it's a little less discoverable
// than an upfront prompt would be, since a first-time user might not
// notice the small icon row right away. For Guided Tour mode, the planner
// already has a natural moment for it (step 3, alongside interests), so
// that one IS an upfront choice — see plannerMoodCardsContainer below.
function setSessionMood(mood) {
  sessionMood = mood;
  moodButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.mood === mood));
  if (plannerMoodCardsContainer) {
    plannerMoodCardsContainer.querySelectorAll(".planner-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.mood === mood);
    });
  }
  logEvent("mood_selected", { mood });
}

moodButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setSessionMood(button.dataset.mood);
  });
});

if (plannerMoodCardsContainer) {
  plannerMoodCardsContainer.querySelectorAll(".planner-card").forEach((card) => {
    card.addEventListener("click", () => setSessionMood(card.dataset.mood));
  });
}

// Keep UI, status text, and the lock-screen playback indicator in sync
// regardless of what triggered the play/pause — our own buttons, the
// drawer, or the lock-screen/AirPods media controls.
audioPlayer.addEventListener("play", () => {
  play();
  hideNarrationLoadingState();
  hideTourLoadingOverlay();
  statusText.textContent = "Playing...";
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "playing";
  }
});
audioPlayer.addEventListener("pause", () => {
  pause();
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
  if (!audioPlayer.ended) {
    statusText.textContent = "Paused";
  }
});
audioPlayer.addEventListener("ended", () => {
  statusText.textContent = "Move to discover more...";
});

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => {
    audioPlayer.play().catch(() => {});
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    audioPlayer.pause();
  });
  // AirPods' double-tap gesture is commonly routed to next/previous-track
  // by the OS — there's no dedicated "double tap" Media Session action, so
  // this is the closest standard hook available for triggering tap-to-talk
  // hands-free. Wrapped in try/catch since not every browser supports it.
  try {
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      startListening();
    });
  } catch (error) {
    // Unsupported action type — non-fatal.
  }
}

// A silent, near-zero-length WAV. iOS Safari only "unlocks" an <audio>
// element for later script-triggered playback (no fresh user gesture, e.g.
// after a narration is fetched a few seconds later, or via lock-screen/
// AirPods controls) if that exact element actually started real playback
// during a user gesture. Calling .play() with no src at all doesn't count
// on iOS — hence AirPods/background playback regressing even though the
// desktop pipeline looked fine. Playing this tiny clip inside the tap
// handler satisfies that requirement reliably.
const SILENT_AUDIO_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function unlockAudio() {
  try {
    audioPlayer.src = SILENT_AUDIO_DATA_URI;
    audioPlayer.load();
    const playPromise = audioPlayer.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  } catch (error) {
    // Some browsers throw synchronously here — harmless, later playback
    // just falls back to needing its own gesture on that device.
  }
  ensureAudioContext();
}

// iOS Safari has no web-exposed API for setting AVAudioSession categories
// (that's a native-only API — there is no way from JS to explicitly tell
// iOS "allow simultaneous record and playback"). Keeping a real, running
// AudioContext alive for the whole tour is the closest practical mitigation
// available to web content: it signals continuous audio engagement to
// WebKit, which measurably reduces (though cannot 100% guarantee) iOS
// tearing down the AirPods playback route when SpeechRecognition grabs the
// mic. Created once on the Start Tour tap (a real user gesture, required
// for AudioContext to start unsuspended) and resumed again right before
// every mic use, since backgrounding/other audio interruptions can suspend
// it in between.
let audioContext = null;

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// The delay iOS needs to re-establish the Bluetooth route back to AirPods
// after SpeechRecognition releases the microphone — resuming playback
// immediately on `onend` routinely comes out of the phone's own speaker
// for a beat before snapping back to AirPods, or doesn't snap back at all.
const AIRPODS_ROUTE_RECOVERY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Geolocation: Capacitor's native plugin when running inside the
// native app shell, the standard Web API everywhere else (including the
// plain web PWA, served from this exact same app.js — there's no separate
// native build of this file). Both APIs expose the same Position shape
// ({coords: {latitude, longitude, ...}}), so these wrappers just pick the
// right implementation underneath and every OTHER call site in this file
// stays exactly as it was. See CAPACITOR_NOTES.md for the full context.
function isCapacitorNative() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
}

function getCapacitorGeolocation() {
  return window.Capacitor?.Plugins?.Geolocation || null;
}

function hasGeolocationSupport() {
  return isCapacitorNative() || "geolocation" in navigator;
}

function geoGetCurrentPosition(onSuccess, onError, options) {
  const capGeo = isCapacitorNative() ? getCapacitorGeolocation() : null;
  if (capGeo) {
    capGeo.getCurrentPosition(options).then(onSuccess).catch(onError);
    return;
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
}

// The Web API's watchPosition returns a numeric id synchronously;
// Capacitor's returns a Promise<string>. Every call site already treats
// the watch id as an opaque value only ever passed back into
// geoClearWatch, so the TYPE difference doesn't matter — but the ASYNC
// difference does, which is why this (and startTour, its only caller) is
// async where the old code wasn't.
async function geoWatchPosition(onSuccess, onError, options) {
  const capGeo = isCapacitorNative() ? getCapacitorGeolocation() : null;
  if (capGeo) {
    return capGeo.watchPosition(options, (position, error) => {
      if (error) onError(error);
      else onSuccess(position);
    });
  }
  return navigator.geolocation.watchPosition(onSuccess, onError, options);
}

function geoClearWatch(watchId) {
  if (watchId === null || watchId === undefined) return;
  const capGeo = isCapacitorNative() ? getCapacitorGeolocation() : null;
  if (capGeo) {
    capGeo.clearWatch({ id: String(watchId) });
    return;
  }
  navigator.geolocation.clearWatch(watchId);
}

async function startTour() {
  if (!hasGeolocationSupport()) {
    statusText.textContent = "Geolocation isn't supported on this device.";
    return;
  }

  if (watchId !== null) {
    geoClearWatch(watchId);
  }

  recentPositions = [];
  travelHistory = [];
  gpsStabilized = false;
  hasShownFastWelcome = false;
  lastPosition = null;
  tourStartedAt = Date.now();
  // Real-world testing: Wander Mode start took 20-30s with no way to tell
  // which stage actually ate the time. Stamped here and read at each stage
  // below, then logged as one breakdown once the first narration's audio
  // actually starts — not guessing at the bottleneck, measuring it.
  tourStartPerfMark = performance.now();
  tourStartStageTimestamps = {};
  isFirstNarrationOfSession = true;
  totalNarrationsThisSession = 0;
  totalQuestionsThisSession = 0;
  totalDistanceWalkedMeters = 0;
  currentSessionId = generateSessionId();
  clearInterval(pinIgnoredSampleInterval);
  pinIgnoredSampleInterval = setInterval(samplePinIgnoredEvents, 60000);
  // Pillar 1 (ENABLE_PROACTIVE_DEPTH) — same start/clear pattern as
  // pinIgnoredSampleInterval just above; harmless no-op interval when the
  // flag is off (checkDwellAndMaybeInterject returns immediately).
  resetProactiveDepthState();
  clearInterval(dwellCheckInterval);
  dwellCheckInterval = setInterval(checkDwellAndMaybeInterject, DWELL_CHECK_INTERVAL_MS);
  // Pillar 3 (ENABLE_NEEDS_ROUTING) — same start/clear pattern again.
  resetNeedsRoutingState();
  clearInterval(needsCheckInterval);
  needsCheckInterval = setInterval(checkNeedsAndMaybeSuggest, NEEDS_CHECK_INTERVAL_MS);
  // Guided Destination pillar (ENABLE_GUIDED_DESTINATION) — same
  // start/clear pattern again.
  resetGuidedDestinationState();
  pulseEl.classList.remove("is-locked");
  micBtn.classList.add("is-available");

  if (currentUser) {
    loadReturningUserContext();
  }

  pinsEverLoaded = false;
  scheduleNoPinsFallback();
  showTourLoadingOverlay();

  statusText.textContent = "Finding your location...";
  watchId = await geoWatchPosition(onLocation, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 20000,
  });
}

function onLocation(position) {
  const { latitude, longitude, heading } = position.coords;
  const current = { latitude, longitude };
  if (typeof heading === "number" && !Number.isNaN(heading)) {
    lastHeading = heading;
  }
  recordTravelPosition(latitude, longitude);
  updateUserLocationOnMap(latitude, longitude, lastHeading);

  // Pin loading used to be entirely gated behind the narration pipeline
  // (orientation -> 15m of further movement -> runSpecificZoomIn), so a
  // stationary or slow-moving user could go a long time without seeing any
  // pins besides interest-matched ones. Pins are cosmetic/map-only, so they
  // get their own lightweight, independently-throttled refresh here that
  // runs on every GPS tick regardless of the narration cooldown/movement
  // gates below.
  refreshMapPinsAroundUser(latitude, longitude, computeEffectiveHeading());

  // Immediate feedback the moment any fix arrives, before GPS has settled.
  if (!hasShownFastWelcome) {
    hasShownFastWelcome = true;
    locationName.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
    showFastWelcome(latitude, longitude);
  }

  recentPositions.push(current);
  if (recentPositions.length > GPS_STABILIZATION_READINGS) {
    recentPositions.shift();
  }

  if (!gpsStabilized) {
    if (recentPositions.length === GPS_STABILIZATION_READINGS && isGpsStable(recentPositions)) {
      gpsStabilized = true;
      if (tourStartPerfMark !== null) {
        tourStartStageTimestamps.gpsLockedMs = Math.round(performance.now() - tourStartPerfMark);
      }
      pulseEl.classList.add("is-locked");
      advanceTourLoadingStage("locking");
    } else {
      return;
    }
  }

  if (lastPosition && distanceInMeters(lastPosition, current) < SIGNIFICANT_MOVE_METERS) {
    return;
  }
  if (lastPosition) {
    totalDistanceWalkedMeters += distanceInMeters(lastPosition, current);
  }
  lastPosition = current;

  if (!hasActivePlace) {
    locationName.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  }

  reverseGeocode(latitude, longitude);
  checkForNarration(latitude, longitude, computeEffectiveHeading());
}

function isGpsStable(positions) {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (distanceInMeters(positions[i], positions[j]) > GPS_STABILIZATION_METERS) return false;
    }
  }
  return true;
}

// Stores raw GPS fixes (not the stabilized/significant-move-filtered ones
// above) purely to derive direction of travel — a short, fast-moving
// window is more accurate for that than the narration pipeline's own
// slower-moving position tracking.
function recordTravelPosition(latitude, longitude) {
  travelHistory.push({ latitude, longitude, timestamp: Date.now() });
  if (travelHistory.length > TRAVEL_HISTORY_SIZE) {
    travelHistory.shift();
  }
}

// True unless returningUserContext (loaded from Supabase for a signed-in
// user, see loadReturningUserContext) shows a prior session already in this
// exact city — feeds the first-narration "give big picture orientation"
// vs. "welcome back" framing server-side (see GREETING_AND_CONTEXT_RULES).
function computeFirstVisitToCity() {
  if (!currentCity) return true;
  if (!returningUserContext || !Array.isArray(returningUserContext.recentSessions)) return true;
  const priorCities = returningUserContext.recentSessions.map((session) => session.city).filter(Boolean);
  return !priorCities.includes(currentCity);
}

function computeTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// Direction of TRAVEL (which way the user is actually walking) as derived
// from consecutive GPS fixes — distinct from compass heading (which way the
// phone is pointing, which can differ, e.g. if held sideways).
function computeDirectionOfTravel() {
  if (travelHistory.length < 2) return null;
  const oldest = travelHistory[0];
  const newest = travelHistory[travelHistory.length - 1];
  const moved = distanceInMeters(oldest, newest);
  if (moved < TRAVEL_MIN_METERS) return null;

  const bearing = travelBearingDegrees(oldest.latitude, oldest.longitude, newest.latitude, newest.longitude);
  return bearingToCompassWord(bearing);
}

function travelBearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingToCompassWord(bearing) {
  if (bearing === null || bearing === undefined || Number.isNaN(bearing)) return null;
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const index = ((Math.round(bearing / 45) % 8) + 8) % 8;
  return directions[index];
}

// Fires once, on the very first GPS fix, so the user sees proof the app is
// working well before the tiered orientation/narration pipeline kicks in.
// --- Guide personas ---
// Resolved once per distinct city (see ensurePersonaForCity, called from
// narrateAndSpeak right before the /api/narrate request is built) and
// cached for the rest of the session — never re-fetched mid-session unless
// the user actually walks into a new city or changes their preferred guide
// type in Edit Preferences (which clears the cache, see preferencesSaveBtn).
let currentPersona = null;
let currentPersonaCity = null;
// Tracked alongside currentPersonaCity — a persona's generated name is now
// gender-matched to the default TTS voice for the tour's language (see
// VOICE_GENDER in server.js), so switching languages mid-session needs a
// fresh persona fetch even if the city hasn't changed, the same as walking
// into a new city does.
let currentPersonaLanguage = null;
let personaFetchPromise = null;
let personaCityChangedForNextNarration = false;
// True for exactly the one narration that should include a genuine
// self-introduction (see buildPersonaGuidance's isFirstPersonaMeeting
// branch, server.js) — set by ensurePersonaForCity once it's confirmed
// this user has never met this persona+city combo before, consumed and
// reset to false the moment narrateAndSpeak() sends the next narration
// request, so it never accidentally applies to a later one.
let isFirstPersonaMeetingForNextNarration = false;

const PERSONA_INTRO_STORAGE_KEY = "sabri_persona_introductions";

// Signed-in users get this tracked server-side (user_persona_introductions
// — persists across devices/reinstalls). Guests have no persistent
// identity to key a Supabase row on, so this is the local equivalent —
// same guest/signed-in split already used for profile/settings elsewhere
// in this app. Both paths converge on the same guarantee: once ever per
// city+archetype, not once per session.
async function checkIsFirstPersonaMeeting(city, archetype, language) {
  if (currentUser) {
    try {
      const response = await fetch("/api/check-persona-introduction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, city, archetype, language }),
      });
      const data = await response.json();
      return response.ok ? !!data.isFirstMeeting : false;
    } catch (error) {
      // Fail safe toward "no introduction" rather than risk repeating a
      // multi-sentence intro every narration if this call keeps failing.
      return false;
    }
  }

  try {
    const seen = JSON.parse(localStorage.getItem(PERSONA_INTRO_STORAGE_KEY) || "[]");
    const key = `${city}:${archetype}:${language}`;
    if (seen.includes(key)) return false;
    seen.push(key);
    localStorage.setItem(PERSONA_INTRO_STORAGE_KEY, JSON.stringify(seen));
    return true;
  } catch (error) {
    return false;
  }
}

function updatePersonaChip() {
  if (!personaChipEl || !personaChipNameEl) return;
  if (currentPersona?.generated_name) {
    personaChipNameEl.textContent = `with ${currentPersona.generated_name}`;
    personaChipEl.classList.remove("hidden");
  } else {
    personaChipEl.classList.add("hidden");
  }
}

// Folds into the existing tour-loading overlay (advanceTourLoadingStage is
// a no-op once that overlay is already hidden, so this only visibly shows
// "Meeting your guide..." during the very first narration of a tour — a
// cache-miss city+archetype combination on any later narration would
// otherwise be an unexplained pause).
async function ensurePersonaForCity(city, country) {
  const language = settings.language || "en";
  if (!city || (city === currentPersonaCity && language === currentPersonaLanguage)) return;
  if (personaFetchPromise) return personaFetchPromise;

  advanceTourLoadingStage("meeting_guide");

  personaFetchPromise = (async () => {
    try {
      const archetype = userProfile?.preferredArchetype || "local_friend";
      const response = await fetch("/api/get-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, country, archetype, language }),
      });
      const data = await response.json();
      if (response.ok && data.persona) {
        if (currentPersonaCity && (currentPersonaCity !== city || currentPersonaLanguage !== language)) {
          // Walked into a new city (or switched languages, which can mean a
          // differently-gendered persona) mid-session — the next narration
          // should narratively introduce the handoff rather than silently
          // swapping the name (see buildPersonaGuidance's isCityChange branch).
          personaCityChangedForNextNarration = true;
        }
        currentPersona = data.persona;
        currentPersonaCity = city;
        currentPersonaLanguage = language;
        updatePersonaChip();
        logEvent("persona_selected", { archetype, city, language, cached: data.cached === true });
        isFirstPersonaMeetingForNextNarration = await checkIsFirstPersonaMeeting(city, archetype, language);
      }
    } catch (error) {
      // Non-fatal — narration just proceeds as generic Sabri, no persona
      // identity, rather than blocking the tour.
    } finally {
      personaFetchPromise = null;
    }
  })();

  return personaFetchPromise;
}

// Fire-and-forget, kicked off the moment a place is narrated (see
// initFocusedPlaceUI) — not awaited by anything, since it only needs to
// finish before the user's first FOLLOW-UP question, not before the
// narration itself. See place_facts in supabase/schema.sql and
// buildPlaceFactsGuidance in server.js for how the result gets used.
async function ensurePlaceFacts(placeId, placeName) {
  if (!placeId || placeFactsCache[placeId]) return;
  try {
    const response = await fetch("/api/get-place-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, placeName, city: currentCity, country: currentCountry }),
    });
    const data = await response.json();
    if (response.ok && data.facts) {
      placeFactsCache[placeId] = data.facts;
    }
  } catch (error) {
    // Non-fatal — /api/ask just proceeds without cached facts this time,
    // same as before this cache existed.
  }
}

async function showFastWelcome(latitude, longitude) {
  try {
    const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
    const data = await response.json();

    if (response.ok && data.locationName) {
      statusText.textContent = `Welcome to ${data.locationName}`;
      if (!hasActivePlace) {
        locationName.textContent = data.locationName;
      }
      if (data.neighborhood && neighborhoodNameEl) {
        neighborhoodNameEl.textContent = data.neighborhood;
      }
      currentCity = data.city || currentCity;
      currentCountry = data.country || currentCountry;
    }
  } catch (error) {
    // Leave the coordinates fallback in place if this quick check fails.
  }

  startWeatherRefresh(latitude, longitude);
}

async function reverseGeocode(latitude, longitude) {
  if (geocodeAbortController) {
    geocodeAbortController.abort();
  }
  geocodeAbortController = new AbortController();

  try {
    const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`, {
      signal: geocodeAbortController.signal,
    });
    const data = await response.json();

    if (response.ok) {
      // A narrated place's name is more precise than a general area name, so
      // don't clobber it once one's already showing.
      if (data.locationName && !hasActivePlace) {
        locationName.textContent = data.locationName;
      }
      if (data.neighborhood && neighborhoodNameEl && !hasActivePlace) {
        neighborhoodNameEl.textContent = data.neighborhood;
      }
      currentCity = data.city || currentCity;
      currentCountry = data.country || currentCountry;
      // Fire-and-forget, deliberately as early as possible: this used to
      // only start once narrateAndSpeak() awaited it directly, which meant
      // it only began AFTER the neighborhood place lookup had already
      // finished — stacking a full extra Claude round-trip (on a persona
      // cache miss) in front of narration generation instead of overlapping
      // with it. ensurePersonaForCity no-ops if already resolved/in-flight
      // for this city, so triggering it here is free when there's nothing
      // to do, and narrateAndSpeak's own await just picks up whatever's
      // left of this same in-flight request.
      ensurePersonaForCity(currentCity, currentCountry);
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    // Leave the coordinates fallback in place if geocoding fails.
  }
}

// Entry point for the three-tier flow: never interrupt an in-progress
// narration or conversation, respect the pacing cooldown, then decide
// whether we need a fresh neighborhood orientation (STEP 1) or can zoom
// into something specific (STEP 2). Once GPS is locked, this fires
// immediately — the user can stand still and still get a narration.
async function checkForNarration(latitude, longitude, heading) {
  if (isNarrating || isConversing) return;
  advanceTourLoadingStage("discovering");

  if (plannedTourActive) {
    await checkGuidedTourProgress(latitude, longitude, heading);
    return;
  }

  // Interest-matched place within 30m — bypasses the normal cooldown
  // entirely, since this is exactly the kind of place the user said they
  // care about and they're standing right next to it.
  const { immediate } = findNearbyInterestPlace(latitude, longitude, heading);
  if (immediate) {
    await narrateAndSpeak({ tier: "specific", places: [immediate], heading, triggerPosition: { latitude, longitude } });
    return;
  }

  if (lastNarrationEndTime > 0) {
    const cooledDown = Date.now() - lastNarrationEndTime >= NARRATION_COOLDOWN_MS;
    const movedEnough =
      !lastNarrationPosition ||
      distanceInMeters(lastNarrationPosition, { latitude, longitude }) >= NARRATION_COOLDOWN_METERS;

    if (!cooledDown || !movedEnough) {
      statusText.textContent = "Keep walking, discovering...";
      return;
    }
  }

  const needsOrientation =
    !orientationCenter || distanceInMeters(orientationCenter, { latitude, longitude }) > ORIENTATION_RADIUS_METERS;

  if (needsOrientation) {
    orientationCenter = { latitude, longitude };
    isOriented = false;
  }

  if (!isOriented) {
    await runNeighborhoodOrientation(latitude, longitude);
    return;
  }

  await runSpecificZoomIn(latitude, longitude, heading);
}

// STEP 1 - orient the user to the neighborhood they've just arrived in.
// Sorted by actual distance (not prominence) so we never grab a famous but
// far-away neighborhood over the one the user is actually standing in.
async function runNeighborhoodOrientation(latitude, longitude) {
  statusText.textContent = "Getting your bearings...";

  // Refresh interest-matched places for this newly-entered area — powers
  // both the priority map pins and the proactive "up ahead" guidance.
  loadInterestPlaces(latitude, longitude);

  const place = await fetchNearbyPlace(latitude, longitude, NEIGHBORHOOD_PLACE_TYPES, { strategy: "nearest" });
  isOriented = true;
  if (tourStartPerfMark !== null) {
    tourStartStageTimestamps.placeFoundMs = Math.round(performance.now() - tourStartPerfMark);
  }

  if (!place || narratedPlaceIds.has(place.placeId) || visitedPlaceIds.has(place.placeId)) {
    statusText.textContent = "Keep walking, discovering...";
    return;
  }

  await narrateAndSpeak({ tier: "neighborhood", place, triggerPosition: { latitude, longitude } });
}

// STEP 2 - once oriented and still within range, fetch the nearest points
// of interest (with distance + compass bearing + front/side/behind relative
// to the user's heading) and let Claude reason about what's actually being
// looked at, rather than blindly narrating the single closest place.
async function runSpecificZoomIn(latitude, longitude, heading) {
  const contextPlaces = await fetchContextPlaces(latitude, longitude, heading);
  lastContextPlaces = contextPlaces;
  contextPlaces.forEach((place) => upsertPlaceMarker(place));

  const newPlaces = contextPlaces.filter(
    (place) => !narratedPlaceIds.has(place.placeId) && !visitedPlaceIds.has(place.placeId)
  );

  if (newPlaces.length === 0) {
    // STEP 3 - nothing new nearby; keep watching as the user walks.
    statusText.textContent = "Keep walking, discovering...";
    return;
  }

  await narrateAndSpeak({ tier: "specific", places: newPlaces, heading, triggerPosition: { latitude, longitude } });
}

async function fetchNearbyPlace(latitude, longitude, types, options) {
  if (placeAbortController) {
    placeAbortController.abort();
  }
  placeAbortController = new AbortController();

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      types: types.join(","),
    });
    if (options.strategy) {
      // The backend runs its own staged 150m/300m search internally for
      // the "nearest" strategy, so no radius needs to be sent here.
      params.set("strategy", options.strategy);
    } else {
      params.set("radius", String(options.radius));
    }

    const response = await fetch(`/api/places?${params.toString()}`, {
      signal: placeAbortController.signal,
    });
    const data = await response.json();
    return response.ok ? data.place || null : null;
  } catch (error) {
    return null;
  }
}

async function fetchContextPlaces(latitude, longitude, heading) {
  if (placeAbortController) {
    placeAbortController.abort();
  }
  placeAbortController = new AbortController();

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      radius: String(CONTEXT_RADIUS_METERS),
      types: SPECIFIC_PLACE_TYPES.join(","),
    });
    if (typeof heading === "number" && !Number.isNaN(heading)) {
      params.set("heading", String(heading));
    }

    const response = await fetch(`/api/context?${params.toString()}`, {
      signal: placeAbortController.signal,
    });
    const data = await response.json();
    return response.ok && Array.isArray(data.places) ? data.places : [];
  } catch (error) {
    return [];
  }
}

// Heuristic used only as a fallback if Claude's focusedPlaceId doesn't
// match anything we sent it — prioritize whatever's in front, then nearest.
function choosePrimaryPlace(places) {
  if (!places || places.length === 0) return null;
  const inFront = places.filter((place) => place.relativePosition === "in front of");
  const pool = inFront.length > 0 ? inFront : places;
  return pool.reduce((best, place) => (!best || place.distanceMeters < best.distanceMeters ? place : best), null);
}

// --- Pillar 2: relationship continuity (ENABLE_RELATIONSHIP_CONTINUITY) ---
// Entirely new functions. The only touch-point inside narrateAndSpeak
// itself is two single-line, purely additive changes (see below): one new
// function call alongside the existing ensurePersonaForCity call (same
// "fetch once per city, reuse across narrations" shape that call already
// has), and one new optional field in the /api/narrate request body that's
// null and inert whenever the flag is off. Nothing about narrateAndSpeak's
// control flow, decision logic, or behavior changes when the flag is off.
const ENABLE_RELATIONSHIP_CONTINUITY = window.ENABLE_RELATIONSHIP_CONTINUITY === true;
let regionMemoryEntries = [];
let regionMemoryFetchedForCity = null;

async function ensureRegionMemoryForCity(city) {
  if (!ENABLE_RELATIONSHIP_CONTINUITY || !currentUser || !city) return;
  if (regionMemoryFetchedForCity === city) return;
  regionMemoryFetchedForCity = city;
  try {
    const response = await fetch(
      `/api/get-region-memory?userId=${encodeURIComponent(currentUser.id)}&city=${encodeURIComponent(city)}`
    );
    if (!response.ok) throw new Error(`responded ${response.status}`);
    const data = await response.json();
    regionMemoryEntries = Array.isArray(data.entries) ? data.entries : [];
  } catch (error) {
    // Fail silently — missing region memory just means narration proceeds
    // without a personal callback this time, never a blocked narration.
    console.log("[region-memory] fetch failed, skipping:", error?.message || error);
    regionMemoryEntries = [];
  }
}

// Called alongside maybeTriggerInterestInference (see saveSessionToSupabase)
// on the same every-3rd-session cadence — a new function call added next to
// an existing one, not a change to it.
function maybeTriggerRegionMemoryExtraction() {
  if (!ENABLE_RELATIONSHIP_CONTINUITY || !currentUser || !currentCity) return;
  fetch("/api/extract-region-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id, city: currentCity }),
  }).catch(() => {});
}

async function narrateAndSpeak({
  tier,
  place,
  places,
  heading,
  triggerPosition,
  prefetchedNarrationText = null,
  prefetchedFocusedPlace = null,
}) {
  isNarrating = true;
  updateNarrationControlButtons();
  statusText.textContent = "Sabri is preparing your story...";

  // Must resolve (or at least attempt) BEFORE advancing to "preparing" —
  // advanceTourLoadingStage only ever moves forward, so meeting_guide has
  // to run first or its message never gets a chance to show.
  await ensurePersonaForCity(currentCity, currentCountry);
  await ensureRegionMemoryForCity(currentCity); // Pillar 2, no-op unless ENABLE_RELATIONSHIP_CONTINUITY
  if (tourStartPerfMark !== null) {
    tourStartStageTimestamps.personaResolvedMs = Math.round(performance.now() - tourStartPerfMark);
  }
  const isCityChange = personaCityChangedForNextNarration;
  personaCityChangedForNextNarration = false;
  const isFirstPersonaMeeting = isFirstPersonaMeetingForNextNarration;
  isFirstPersonaMeetingForNextNarration = false;

  advanceTourLoadingStage("preparing");
  const bestGuessName = tier === "neighborhood" ? place?.name : choosePrimaryPlace(places)?.name;
  showNarrationLoadingState(bestGuessName);

  const directionOfTravel = computeDirectionOfTravel();
  const { proactive: nearbyInterestPlace } = triggerPosition
    ? findNearbyInterestPlace(triggerPosition.latitude, triggerPosition.longitude, heading)
    : { proactive: null };

  const triggerTime = performance.now();
  firstAudioPlaybackAt = null;
  clearTtsQueue();
  if (streamAbortController) streamAbortController.abort();
  streamAbortController = new AbortController();
  // Replay button — fresh cache for THIS narration, see driveTtsQueue and
  // cachingNarrationForReplay's own comments.
  lastNarrationAudioBlobs = [];
  cachingNarrationForReplay = true;

  let focusedPlace = tier === "neighborhood" ? place : null;
  let narrationText = "";
  let uiInitialized = false;
  const narrationStartedAt = Date.now();

  // Runs the moment focusedPlace is actually known — immediately for the
  // neighborhood tier, or as soon as the leading [[FOCUS:...]] marker
  // arrives for the specific tier — rather than waiting for the whole
  // narration to finish streaming, since none of this depends on the full
  // text.
  const initFocusedPlaceUI = () => {
    if (!focusedPlace || uiInitialized) return;
    uiInitialized = true;
    narratedPlaceIds.add(focusedPlace.placeId);
    hasActivePlace = true;
    // New focused place — the previous place's Q&A no longer applies, and
    // this is the trigger point for warming the shared place-facts cache
    // well before the user could plausibly ask a follow-up question.
    if (currentPlaceId !== focusedPlace.placeId) {
      currentPlaceConversation = [];
      ensurePlaceFacts(focusedPlace.placeId, focusedPlace.name);
    }
    currentPlaceName = focusedPlace.name;
    currentPlaceId = focusedPlace.placeId;
    if (tier === "neighborhood") {
      currentNeighborhoodName = focusedPlace.name;
    }
    locationName.textContent = focusedPlace.name;
    if (neighborhoodNameEl) neighborhoodNameEl.textContent = currentNeighborhoodName || "";
    narratingPlaceId = focusedPlace.placeId;
    upsertPlaceMarker(focusedPlace);
    refreshAllPlaceMarkers();
    const photoUrl = focusedPlace.photoReference
      ? `/api/photo?ref=${encodeURIComponent(focusedPlace.photoReference)}&maxwidth=800`
      : null;
    applyHomePhoto(photoUrl);
    startStory(focusedPlace.name, "");
    updateMediaSessionMetadata(focusedPlace.name, currentNeighborhoodName, photoUrl);
    hideTourLoadingOverlay();
    logEvent("narration_started", { placeId: focusedPlace.placeId, placeType: focusedPlace.primaryType, tier });
  };

  if (tier === "neighborhood") initFocusedPlaceUI();

  try {
    if (prefetchedNarrationText && prefetchedFocusedPlace) {
      // Guided-tour prefetch already did the (usually slower, more
      // variable-latency) Claude generation step in the background while
      // the user was still walking toward this stop — skip straight to
      // UI setup + TTS instead of starting a fresh stream from scratch.
      console.log("[prefetch] using pre-generated narration for this stop, skipping fresh generation");
      focusedPlace = prefetchedFocusedPlace;
      initFocusedPlaceUI();
      narrationText = prefetchedNarrationText;
      placeDescription.textContent = narrationText;
      narrationText
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .forEach((sentence) => enqueueTtsSentence(sentence));
    } else {
      await streamSSE(
        "/api/narrate",
        {
          tier,
          place,
          places,
          heading,
          directionOfTravel,
          depth: settings.depth,
          language: settings.language,
          userProfile,
          sessionLog,
          correctionContext,
          crossSessionVisitedPlaces: crossSessionVisitedPlaceNames,
          returningUserContext,
          isFirstNarrationOfSession,
          neighborhood: currentNeighborhoodName,
          city: currentCity,
          country: currentCountry,
          weather: currentWeather,
          nearbyInterestPlace,
          firstVisitToCity: computeFirstVisitToCity(),
          timeOfDay: computeTimeOfDay(),
          userStatedDirection,
          userStatedDestination,
          persona: currentPersona,
          isCityChange,
          sessionMood,
          isGuidedTour: plannedTourActive,
          isFirstPersonaMeeting,
          userId: currentUser ? currentUser.id : null,
          regionMemory: ENABLE_RELATIONSHIP_CONTINUITY ? regionMemoryEntries : null,
        },
        {
          signal: streamAbortController.signal,
          onMarker: (markerContent) => {
            if (tier === "neighborhood") return;
            const focusedPlaceId = !markerContent || markerContent === "NONE" ? null : markerContent;
            focusedPlace = places.find((p) => p.placeId === focusedPlaceId) || choosePrimaryPlace(places);
            initFocusedPlaceUI();
          },
          onSentence: (sentenceText) => {
            narrationText = narrationText ? `${narrationText} ${sentenceText}` : sentenceText;
            if (uiInitialized) placeDescription.textContent = narrationText;
            enqueueTtsSentence(sentenceText);
          },
          onDone: (payload) => {
            if (payload.fullText) narrationText = payload.fullText;
            if (uiInitialized) placeDescription.textContent = narrationText;
          },
        }
      );
    }

    if (!focusedPlace || !narrationText) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    recordNarrationLog(focusedPlace, narrationText, heading, focusedPlace.relativePosition === "in front of");
    totalNarrationsThisSession += 1;
    isFirstNarrationOfSession = false;

    if (currentUser) {
      visitedPlaceIds.add(focusedPlace.placeId);
      saveVisitToSupabase(focusedPlace, narrationText);
    }

    // Most sentences are already playing/played by now, since synthesis for
    // each one starts the moment it arrives — this just waits for the tail.
    await waitForTtsQueueDrain();

    if (firstAudioPlaybackAt !== null) {
      const latencyMs = Math.round(firstAudioPlaybackAt - triggerTime);
      console.log(`[latency] time-to-first-audio (streamed narration): ${latencyMs}ms`);
      logEvent("time_to_first_audio", { ms: latencyMs, tier, flow: "narrate" });
    }

    // Full Wander Mode start breakdown — only for the actual first
    // narration of the session, and only once (tourStartPerfMark is nulled
    // right after). Covers the whole tap-Start-Tour-to-first-word pipeline,
    // not just the narration-generation slice time_to_first_audio measures
    // above — see startTour/onLocation/runNeighborhoodOrientation for where
    // each stage timestamp gets stamped.
    if (tourStartPerfMark !== null && firstAudioPlaybackAt !== null) {
      const breakdown = {
        ...tourStartStageTimestamps,
        firstAudioMs: Math.round(firstAudioPlaybackAt - tourStartPerfMark),
      };
      console.log("[latency] Wander Mode start breakdown:", breakdown);
      logEvent("tour_start_latency", breakdown);
      tourStartPerfMark = null;
    }

    // audioPlayer.ended is only true after a natural finish — interruptPlayback()
    // (tap-to-talk cutting in, or a new narration overtaking this one) pauses
    // rather than lets it end, so this reliably tells completed from skipped.
    logEvent(audioPlayer.ended ? "narration_completed" : "narration_skipped", {
      placeId: focusedPlace.placeId,
      listenedMs: Date.now() - narrationStartedAt,
      textLength: narrationText.length,
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      statusText.textContent = "Couldn't generate your story.";
    }
  } finally {
    isNarrating = false;
    lastNarrationEndTime = Date.now();
    // Real field bug this fixes: this used to be set at the START of
    // narrateAndSpeak (to triggerPosition, before Claude generation + TTS
    // playback even began), so if the user kept walking during a
    // 20-40s narration, the cooldown's distance-moved check in
    // checkForNarration compared against a position that was already
    // 50-100m stale by the time playback actually finished — silently
    // blocking the next narration even though the user had genuinely
    // moved on well past the trigger threshold. Anchoring to the user's
    // ACTUAL current position here instead (lastPosition, kept live by
    // onLocation throughout) means movement DURING playback counts
    // toward the next trigger, not just movement after it ends. Confirmed
    // via code trace that lastNarrationPosition has no other reader that
    // needs it set earlier — checkForNarration always early-returns while
    // isNarrating is true, so nothing ever reads the mid-narration value.
    lastNarrationPosition = lastPosition || triggerPosition;
    narratingPlaceId = null;
    refreshAllPlaceMarkers();
    hideTourLoadingOverlay();
    hideNarrationLoadingState();
    // Stop accumulating into the replay cache once this narration is
    // genuinely done — a Q&A answer right after must not silently get
    // appended to "replay the last narration"'s audio.
    cachingNarrationForReplay = false;
    updateNarrationControlButtons();
  }
}

// Generic Server-Sent-Events reader for the streaming /api/narrate and
// /api/ask endpoints — manual parsing (not EventSource) since EventSource
// can't send a POST body. Dispatches each event to the matching callback as
// it arrives, well before the stream/response as a whole is done.
async function streamSSE(url, body, { signal, onMarker, onSentence, onDone } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`${url} responded ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      let payload;
      try {
        payload = JSON.parse(dataLine.slice(6));
      } catch (error) {
        continue;
      }
      if (payload.type === "marker") onMarker?.(payload.markerContent);
      else if (payload.type === "sentence") onSentence?.(payload.text);
      else if (payload.type === "done") onDone?.(payload);
      else if (payload.type === "error") throw new Error(`${url} stream reported an error`);
    }
  }
}

function waitForTtsQueueDrain() {
  return new Promise((resolve) => {
    const check = () => {
      if (!ttsQueueActive && ttsQueue.length === 0) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

// Keeps a running record of every narration and question/answer pair, sent
// (last 5) to /api/narrate and /api/ask so Sabri has context of the walk so
// far and never repeats itself.
function recordNarrationLog(place, narrationText, heading, wasInFront) {
  sessionLog.push({
    type: "narration",
    placeName: place.name,
    placeType: place.primaryType,
    neighborhood: currentNeighborhoodName,
    timestamp: new Date().toISOString(),
    summary: summarizeForHistory(narrationText),
    heading: typeof heading === "number" ? heading : null,
    wasInFront: wasInFront === true,
  });
  if (sessionLog.length > 20) {
    sessionLog.shift();
  }
}

function recordQuestionLog(question, answer, heading) {
  // Read by checkDwellAndMaybeInterject (Pillar 1, ENABLE_PROACTIVE_DEPTH)
  // to suppress proactive interjections for a short window after active
  // Q&A — a question was just asked, so this isn't dead air to fill.
  lastQuestionAskedAt = Date.now();
  sessionLog.push({
    type: "question",
    placeName: currentPlaceName,
    placeType: null,
    neighborhood: currentNeighborhoodName,
    timestamp: new Date().toISOString(),
    summary: summarizeForHistory(`Asked: "${question}" — ${answer}`),
    heading: typeof heading === "number" ? heading : null,
    wasInFront: null,
  });
  if (sessionLog.length > 20) {
    sessionLog.shift();
  }
}

function summarizeForHistory(text) {
  return text.length > 150 ? `${text.slice(0, 150)}...` : text;
}

// Crossfades the home-screen background photo in once it's actually
// loaded, so there's no flash of a broken image mid-transition.
function applyHomePhoto(url) {
  if (!url) {
    homePhoto.classList.remove("is-visible");
    homePhoto.style.backgroundImage = "";
    return;
  }

  const preload = new Image();
  preload.onload = () => {
    homePhoto.style.backgroundImage = `url("${url}")`;
    homePhoto.classList.add("is-visible");
  };
  preload.onerror = () => {
    homePhoto.classList.remove("is-visible");
  };
  preload.src = url;
}

function updateMediaSessionMetadata(title, neighborhoodName, photoUrl) {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: "Sabri Tour Guide",
    album: neighborhoodName || "Sabri Tour Guide",
    artwork: photoUrl
      ? [{ src: new URL(photoUrl, window.location.origin).href, sizes: "800x800", type: "image/jpeg" }]
      : [],
  });
}

// Resolves once playback has genuinely finished, failed, or been
// interrupted (see interruptPlayback()) — awaiting this is what keeps
// isNarrating/isConversing true for the whole time audio is playing, not
// just while it's being generated. Playback goes through the real HTML5
// <audio> element (not the Web Audio API) because that's what iOS Safari
// allows to keep playing with the screen locked, and what Media Session
// needs to attach lock-screen/AirPods controls to.
let currentPlaybackResolve = null;

async function speakNarration(text) {
  if (speakAbortController) {
    speakAbortController.abort();
  }
  speakAbortController = new AbortController();

  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: settings.voice, language: settings.language }),
      signal: speakAbortController.signal,
    });

    if (!response.ok) {
      statusText.textContent = "Couldn't load audio for your story.";
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/wav" });

    if (currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
    }
    currentAudioObjectUrl = URL.createObjectURL(blob);
    audioPlayer.src = currentAudioObjectUrl;
    audioPlayer.playbackRate = selectedSpeed;

    await new Promise((resolve) => {
      currentPlaybackResolve = resolve;
      audioPlayer.addEventListener("ended", resolve, { once: true });
      const playPromise = audioPlayer.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          statusText.textContent = "Audio unavailable — read your story below.";
          placeDescription.classList.add("story-description--fallback");
          resolve();
        });
      }
    });
    currentPlaybackResolve = null;
  } catch (error) {
    if (error.name === "AbortError") return;
    // Audio didn't play — make sure the story is still readable front and
    // center rather than leaving the user with nothing.
    statusText.textContent = "Audio unavailable — read your story below.";
    placeDescription.classList.add("story-description--fallback");
  }
}

// Cleanly stops whatever's currently playing (if anything) and resolves any
// pending speakNarration()/TTS-queue promise immediately, so the caller's
// finally block runs right away instead of hanging until a natural 'ended'
// event that will never come once we overwrite audioPlayer.src.
//
// Called the MOMENT the mic/question flow activates (see startListening —
// this runs before speech recognition even starts, not after it finishes),
// so narration audio genuinely stops immediately rather than finishing its
// current sentence. Also clears the gapless TTS queue and aborts any
// in-flight /api/narrate or /api/ask stream — without this, a
// pre-fetched-but-not-yet-played sentence chunk from the interrupted
// narration would otherwise resume playing right after the question
// exchange ends, which was the actual bug: interruptPlayback() alone always
// stopped the CURRENT clip instantly, but nothing told the queue not to
// advance to the next one.
function interruptPlayback() {
  audioPlayer.pause();
  if (currentPlaybackResolve) {
    const resolve = currentPlaybackResolve;
    currentPlaybackResolve = null;
    resolve();
  }
  clearTtsQueue();
  if (streamAbortController) {
    streamAbortController.abort();
    streamAbortController = null;
  }
}

// Skip — stops the current narration outright and does NOT restart until
// the next real trigger (a new place, a tap-to-narrate, etc.), per spec.
// Reuses interruptPlayback() as-is (the same function question-interrupt
// already relies on) rather than a parallel stop mechanism — narrateAndSpeak's
// own catch/finally already handle an aborted stream and a paused (not
// "ended") audioPlayer correctly (see narration_skipped's own comment).
function skipNarration() {
  interruptPlayback();
  updateNarrationControlButtons();
}

// Replay — instantly re-plays the last narration's already-generated
// audio from the start. Deliberately does NOT call /api/narrate or
// /api/speak again (see lastNarrationAudioBlobs) — same content, no extra
// Claude/TTS cost, no wait.
async function replayLastNarration() {
  if (lastNarrationAudioBlobs.length === 0 || isNarrating) return;
  interruptPlayback();
  const blobsToPlay = lastNarrationAudioBlobs; // not cleared — replay can be tapped more than once
  for (const entry of blobsToPlay) {
    if (blobsToPlay !== lastNarrationAudioBlobs) return; // a newer narration started mid-replay — stop, don't talk over it
    const url = URL.createObjectURL(entry.blob);
    if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
    currentAudioObjectUrl = url;
    audioPlayer.src = url;
    audioPlayer.playbackRate = selectedSpeed;
    await new Promise((resolve) => {
      currentPlaybackResolve = resolve;
      audioPlayer.addEventListener("ended", resolve, { once: true });
      const playPromise = audioPlayer.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => resolve());
    });
    currentPlaybackResolve = null;
  }
}

// Shows Skip only while there's genuinely something playing to skip, and
// Replay only once a narration has finished and left something behind to
// replay — called from narrateAndSpeak's finally block and from
// skip/replay's own handlers, not on a timer.
function updateNarrationControlButtons() {
  if (narrationSkipBtn) narrationSkipBtn.classList.toggle("hidden", !isNarrating);
  if (narrationReplayBtn) narrationReplayBtn.classList.toggle("hidden", isNarrating || lastNarrationAudioBlobs.length === 0);
}

if (narrationSkipBtn) narrationSkipBtn.addEventListener("click", () => skipNarration());
if (narrationReplayBtn) narrationReplayBtn.addEventListener("click", () => replayLastNarration());

function togglePlayback() {
  if (!audioPlayer.src) return;

  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

function onLocationError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      statusText.textContent = "Location permission denied. Enable location access to start your tour.";
      break;
    case error.POSITION_UNAVAILABLE:
      statusText.textContent = "Your location is unavailable right now.";
      break;
    case error.TIMEOUT:
      statusText.textContent = "Timed out finding your location. Try again.";
      break;
    default:
      statusText.textContent = `Couldn't get your location: ${error.message}`;
  }
}

function distanceInMeters(a, b) {
  const earthRadius = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function startStory(title, description) {
  placeName.textContent = title;
  placeDescription.textContent = description;
  placeDescription.classList.remove("story-description--fallback");
  playerCard.classList.remove("hidden");

  // Playback controls (pause/resume, speed) live on the main screen, never
  // trapped inside the drawer — the drawer is for reading the text only.
  // This only needs to run once per tour, but toggling classes that are
  // already set is harmless.
  appEl.classList.add("has-player");
  startPrompt.classList.add("hidden");
  tourControls.classList.remove("hidden");
}

function play() {
  playBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
}

function pause() {
  pauseBtn.classList.add("hidden");
  playBtn.classList.remove("hidden");
}

// --- Tap to talk: speech-to-text + conversational Q&A (rebuilt) ---

const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null;
let isListening = false;
let isCancelledListening = false;
let silenceTimer = null;

const INITIAL_SILENCE_MS = 8000; // generous window before the user starts speaking
// Real-device testing (core tour Q&A flow): the mic reliably picks up
// speech, but was cutting off the last 1-2s before the person actually
// finished talking. This timer resets on every interim result, so the most
// likely cause is real Web Speech API processing latency between someone
// still actively speaking and the browser delivering the next interim
// result — 3000ms wasn't quite enough buffer for that gap in practice.
// Bumped modestly rather than aggressively, since this can't be verified
// without real speech on real hardware (this sandboxed environment has no
// real microphone) — re-check after this change on a real device before
// tuning further in either direction.
const FOLLOWUP_SILENCE_MS = 4000; // stop 4s after the last detected speech
const MIN_QUESTION_LENGTH = 5; // shorter than this is almost always a mis-hear, not a real question
const CONFIRM_DISPLAY_MS = 1000; // show the full captured text before sending it

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  // Requesting 3 alternatives and picking the highest-confidence one (see
  // pickBestAlternative) measurably improves accuracy on iOS Safari, whose
  // single-best guess is often the least likely of the alternatives it
  // actually considered.
  recognition.maxAlternatives = 3;
}

// Picks the highest-confidence alternative out of a SpeechRecognitionResult.
// iOS Safari doesn't always populate `confidence` (it's sometimes 0 for
// every alternative, especially on interim results) — falls back to the
// first alternative in that case, same as requesting just one.
//
// Only ever called from inside SabriSpeechRecognition's web path below —
// onboarding-chat and planner-chat used to call this directly too (talking
// to the shared `recognition` global themselves), but both were converted
// to go through SabriSpeechRecognition/createChatMicController instead
// after real-world beta testing surfaced two bugs from that direct-usage
// pattern: unreliable word pickup and mistimed stop-listening, caused by
// (a) no silence-timer fallback in the old onboarding/planner handlers,
// relying solely on the browser's own inconsistent end-of-speech
// detection, and (b) both flows assigning onresult/onend/onerror directly
// onto the same shared `recognition` object, silently stomping over
// whichever flow's handlers were assigned most recently. All three mic
// entry points now share one implementation, so this can't recur.
function pickBestAlternative(result) {
  let best = result[0];
  for (let i = 1; i < result.length; i++) {
    if ((result[i].confidence || 0) > (best.confidence || 0)) {
      best = result[i];
    }
  }
  return best;
}

// --- SabriSpeechRecognition: runtime-detected speech-to-text abstraction ---
// Same interface regardless of platform: the Web Speech API in a regular
// browser/PWA (completely unchanged behavior from before this module
// existed), or @capacitor-community/speech-recognition's native iOS Speech
// framework bridge once running inside Capacitor — checked via
// isCapacitorNative(), the same runtime-detection pattern already used for
// geolocation (see geoGetCurrentPosition et al). startListening() below is
// the only caller; it owns silence-detection timing, the confirm-display
// delay, and handing the final question to askSabri() — this module only
// ever reports interim/final transcript text and errors, so none of that
// app-level logic needs to know or care which engine produced the text.
//
// NOT verified against a real device/native build — no Mac/simulator
// available in this environment. See CAPACITOR_NOTES.md for what to test
// first once this can run in Xcode, and the rollback note if the native
// plugin turns out to need fixing: only this module's native branch would
// need to change, not startListening()/askSabri()/anything else.
const SabriSpeechRecognition = (() => {
  let nativeAvailableChecked = false;
  let nativeAvailable = false;
  let nativeListenersAttached = false;
  let activeSession = null; // { onInterimResult, onFinalResult, transcriptSoFar }

  function getNativePlugin() {
    return window.Capacitor?.Plugins?.SpeechRecognition || null;
  }

  async function checkNativeAvailability() {
    if (nativeAvailableChecked) return nativeAvailable;
    nativeAvailableChecked = true;
    const plugin = getNativePlugin();
    if (!plugin) {
      nativeAvailable = false;
      return false;
    }
    try {
      const result = await plugin.available();
      nativeAvailable = !!(result && result.available);
    } catch (error) {
      nativeAvailable = false;
    }
    return nativeAvailable;
  }

  // The native plugin has no per-result "final vs interim" flag the way
  // Web Speech API does — partialResults just keeps firing with an updated
  // best-guess transcript as recognition progresses, and whatever the most
  // recent one said is treated as "final" once listeningState reports
  // stopped. matches[0] (the plugin's own top-ranked guess) stands in for
  // pickBestAlternative()'s confidence-scoring, which is a workaround
  // specifically for Web Speech API's weaknesses on iOS Safari that don't
  // apply here — this goes straight through the real native Speech
  // framework, not a browser bridge to it.
  function attachNativeListenersOnce() {
    if (nativeListenersAttached) return;
    const plugin = getNativePlugin();
    if (!plugin) return;
    nativeListenersAttached = true;

    plugin.addListener("partialResults", (data) => {
      if (!activeSession) return;
      const text = Array.isArray(data?.matches) && data.matches.length > 0 ? data.matches[0] : "";
      if (!text) return;
      activeSession.transcriptSoFar = text;
      activeSession.onInterimResult?.(text);
    });

    plugin.addListener("listeningState", (data) => {
      if (!activeSession) return;
      if (data?.status === "stopped") {
        const session = activeSession;
        activeSession = null;
        session.onFinalResult?.(session.transcriptSoFar.trim());
      }
    });
  }

  return {
    // Resolves once we know for sure whether SOME implementation is usable
    // — call this once at startup to decide whether to hide the mic
    // button (mirrors the old synchronous `if (recognition) {...} else {
    // hide }` check, just accounting for the native availability check
    // being async where the web one wasn't).
    async ensureReady() {
      if (isCapacitorNative()) return checkNativeAvailability();
      return !!recognition;
    },

    async start({ language, onInterimResult, onFinalResult, onError }) {
      if (isCapacitorNative()) {
        const plugin = getNativePlugin();
        const available = await checkNativeAvailability();
        if (!plugin || !available) {
          onError?.({ reason: "unsupported" });
          return;
        }

        let permission;
        try {
          permission = await plugin.requestPermissions();
        } catch (error) {
          onError?.({ reason: "error" });
          return;
        }
        if (permission?.speechRecognition !== "granted") {
          onError?.({ reason: "permission-denied" });
          return;
        }

        attachNativeListenersOnce();
        activeSession = { onInterimResult, onFinalResult, transcriptSoFar: "" };

        try {
          await plugin.start({ language: language || "en-US", partialResults: true, popup: false });
        } catch (error) {
          activeSession = null;
          onError?.({ reason: "error" });
        }
        return;
      }

      // Web path — byte-for-byte the same behavior as before this module
      // existed, just routed through onInterimResult/onFinalResult/onError
      // callbacks instead of assigning recognition.onresult/onend/onerror
      // directly inside startListening().
      if (!recognition) {
        onError?.({ reason: "unsupported" });
        return;
      }
      recognition.lang = language || "en-US";
      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = pickBestAlternative(event.results[i]).transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }
        onInterimResult?.(finalTranscript || interim);
      };
      recognition.onend = () => {
        onFinalResult?.(finalTranscript.trim());
      };
      recognition.onerror = () => {
        onError?.({ reason: "error" });
      };

      try {
        recognition.start();
      } catch (error) {
        onError?.({ reason: "error" });
      }
    },

    stop() {
      if (isCapacitorNative()) {
        const plugin = getNativePlugin();
        if (plugin && activeSession) {
          plugin.stop().catch(() => {});
        }
        return;
      }
      if (!recognition) return;
      try {
        recognition.stop();
      } catch (error) {
        // Already stopped — harmless.
      }
    },
  };
})();

SabriSpeechRecognition.ensureReady().then((ready) => {
  speechRecognitionAvailable = ready;
  if (!ready) {
    micBtn.classList.add("hidden");
    onboardingChatMicBtn?.classList.add("hidden");
    plannerChatMicBtn?.classList.add("hidden");
    // Pillar 3's needs-suggestion banner still works fully via its
    // buttons/pills when voice genuinely isn't available on this device —
    // this just hides the mic affordance so it isn't shown as an option.
    needsSuggestionMicBtn?.classList.add("hidden");
    // Same reasoning for Guided Destination's search/reroute mic buttons —
    // both still work fully via typing/tapping.
    destinationMicBtn?.classList.add("hidden");
    destinationRerouteMicBtn?.classList.add("hidden");
  }
});

// Which flow's mic to retry when the user taps "Try Again" — defaults to
// the core tour flow's startListening, but any caller can pass its own
// retry action to showMicPermissionDenied() (see createChatMicController
// below, used by onboarding-chat/planner-chat).
let micPermissionRetryAction = startListening;

function showMicPermissionDenied(onRetry) {
  if (!micPermissionDenied) return;
  micPermissionRetryAction = onRetry || startListening;
  micPermissionHint.classList.remove("hidden");
  micPermissionDenied.classList.remove("hidden");
}

if (micPermissionCloseBtn) {
  micPermissionCloseBtn.addEventListener("click", () => micPermissionDenied.classList.add("hidden"));
}
if (micPermissionRetryBtn) {
  micPermissionRetryBtn.addEventListener("click", () => {
    micPermissionDenied.classList.add("hidden");
    micPermissionRetryAction();
  });
}

// Shared mic-button wiring for onboarding-chat, planner-chat, and the
// Pillar 3 needs-suggestion banner (see needsSuggestionMic above) — routes
// through the exact same SabriSpeechRecognition interface and
// silence-timer pattern the core "Talk to Sabri" flow above uses
// (INITIAL_SILENCE_MS before any speech, FOLLOWUP_SILENCE_MS resetting on
// every interim result), instead of relying solely on the browser's own
// end-of-speech detection with no fallback timeout. That gap — no silence
// timer at all, just whatever `recognition.onend` decided on its own — plus
// both flows assigning handlers directly onto the same shared `recognition`
// global (stomping over whichever flow's handlers were assigned last) were
// the two real bugs behind "mic doesn't pick up words reliably" and
// "doesn't stop listening at the right time" in real-world beta testing.
// Routing everything through SabriSpeechRecognition means there is now
// exactly one place that ever assigns recognition.onresult/onend/onerror,
// regardless of which mic button is in use.
function createChatMicController({ micBtn, inputEl, onFinalTranscript }) {
  let chatSilenceTimer = null;
  let cancelled = false;

  function resetSilenceTimer(duration) {
    clearTimeout(chatSilenceTimer);
    chatSilenceTimer = setTimeout(() => SabriSpeechRecognition.stop(), duration);
  }

  function start() {
    if (micBtn.classList.contains("is-listening")) {
      SabriSpeechRecognition.stop();
      return;
    }
    cancelled = false;
    micBtn.classList.add("is-listening");
    resetSilenceTimer(INITIAL_SILENCE_MS);

    SabriSpeechRecognition.start({
      language: SPEECH_RECOGNITION_LANGS[settings.language] || "en-US",
      onInterimResult: (text) => {
        resetSilenceTimer(FOLLOWUP_SILENCE_MS);
        inputEl.value = text;
      },
      onFinalResult: (text) => {
        clearTimeout(chatSilenceTimer);
        micBtn.classList.remove("is-listening");
        if (cancelled) {
          cancelled = false;
          return;
        }
        const trimmed = text.trim();
        if (trimmed) onFinalTranscript(trimmed);
      },
      onError: (info) => {
        clearTimeout(chatSilenceTimer);
        micBtn.classList.remove("is-listening");
        cancelled = false;
        if (info?.reason === "permission-denied") {
          showMicPermissionDenied(start);
        } else if (info?.reason === "unsupported") {
          showToast("Voice input isn't supported on this device");
        }
        // Any other reason (e.g. genuinely no speech detected) just stops
        // silently, same as the prior behavior of an empty finalTranscript.
      },
    });
  }

  // Discards whatever's been captured so far without sending it — for
  // navigating away mid-listen (e.g. tapping "skip"), which previously left
  // recognition running in the background with nothing to stop it.
  function cancel() {
    if (!micBtn.classList.contains("is-listening")) return;
    cancelled = true;
    SabriSpeechRecognition.stop();
  }

  return { start, cancel };
}

// Always tappable: a tap during an active narration interrupts it cleanly
// first; a tap while already listening stops listening early (and sends
// whatever was captured, same as the silence timeout completing on its
// own) — use the separate "Tap to cancel" control to abort without asking
// anything.
micBtn.addEventListener("click", () => {
  if (isListening) {
    stopListening();
    return;
  }
  startListening();
});

listeningHint.addEventListener("click", () => {
  if (isListening) cancelListening();
});

// Enter sends the corrected text (see the confirm-window edit affordance
// in finishListening above) — an empty edit is treated as "changed my mind,
// don't send anything" rather than falling back to the original mishearing.
if (askEditInput) {
  askEditInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const edited = askEditInput.value.trim();
    askEditInput.classList.add("hidden");
    if (edited) askSabri(edited);
  });
}

function startListening() {
  if (isListening) return;

  interruptPlayback();
  // Keeping this alive/running is the standard practical mitigation for the
  // iOS "SpeechRecognition kicks AirPods off the playback route" issue —
  // there's no web API to directly control AVAudioSession categories.
  ensureAudioContext();
  isCancelledListening = false;
  isConversing = true;
  isListening = true;
  micBtn.classList.add("is-listening");
  askSubtitle.textContent = "";
  askSubtitle.classList.remove("hidden");
  askEditBtn.classList.add("hidden");
  askEditInput.classList.add("hidden");
  listeningHint.classList.remove("hidden");
  listeningHint.textContent = "Tap to cancel";
  statusText.textContent = "Listening...";

  const resetSilenceTimer = (duration) => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => stopListening(), duration);
  };
  resetSilenceTimer(INITIAL_SILENCE_MS);

  const finishListening = (question) => {
    clearTimeout(silenceTimer);
    isListening = false;
    micBtn.classList.remove("is-listening");
    listeningHint.classList.add("hidden");

    if (isCancelledListening) {
      isCancelledListening = false;
      askSubtitle.classList.add("hidden");
      isConversing = false;
      statusText.textContent = "Keep walking, discovering...";
      return;
    }

    if (!question || question.length < MIN_QUESTION_LENGTH) {
      askSubtitle.textContent = "I didn't catch that — tap to try again";
      setTimeout(() => askSubtitle.classList.add("hidden"), 2500);
      isConversing = false;
      statusText.textContent = "Keep walking, discovering...";
      return;
    }

    // Show the full captured text for a beat so the user can confirm or
    // quickly correct what was actually heard before it's sent off to
    // Claude — speech recognition still isn't perfect, so a tap-to-edit
    // beats forcing a full re-ask over one misheard word.
    askSubtitle.textContent = question;
    askSubtitle.classList.remove("hidden");
    askEditBtn.classList.remove("hidden");
    statusText.textContent = "Sabri is thinking...";

    const sendTimer = setTimeout(() => {
      askEditBtn.classList.add("hidden");
      askSabri(question);
    }, CONFIRM_DISPLAY_MS);

    askEditBtn.onclick = () => {
      clearTimeout(sendTimer);
      askEditBtn.classList.add("hidden");
      askSubtitle.classList.add("hidden");
      askEditInput.value = question;
      askEditInput.classList.remove("hidden");
      askEditInput.focus();
      askEditInput.select();
    };
  };

  SabriSpeechRecognition.start({
    language: SPEECH_RECOGNITION_LANGS[settings.language] || "en-US",
    onInterimResult: (text) => {
      resetSilenceTimer(FOLLOWUP_SILENCE_MS);
      askSubtitle.textContent = text;
    },
    onFinalResult: (text) => finishListening(text),
    onError: (info) => {
      clearTimeout(silenceTimer);
      isListening = false;
      isConversing = false;
      isCancelledListening = false;
      micBtn.classList.remove("is-listening");
      listeningHint.classList.add("hidden");
      askSubtitle.classList.add("hidden");
      if (info?.reason === "permission-denied") {
        statusText.textContent = "Keep walking, discovering...";
        showMicPermissionDenied();
      } else {
        statusText.textContent = "Didn't catch that — tap the mic to try again.";
      }
    },
  });
}

// Stops listening AND sends whatever was captured — same completion path
// as the silence timeout firing on its own.
function stopListening() {
  SabriSpeechRecognition.stop();
}

// Stops listening and discards the transcript entirely — nothing gets sent
// to Claude, unlike stopListening()/the silence timeout.
function cancelListening() {
  isCancelledListening = true;
  SabriSpeechRecognition.stop();
}

async function askSabri(question) {
  const directionOfTravel = computeDirectionOfTravel();
  const triggerTime = performance.now();
  firstAudioPlaybackAt = null;
  clearTtsQueue();
  if (streamAbortController) streamAbortController.abort();
  streamAbortController = new AbortController();

  // Give iOS a moment to re-establish the Bluetooth route back to AirPods
  // after SpeechRecognition released the microphone, before any audio
  // element activity starts (including the first queued TTS sentence).
  await sleep(AIRPODS_ROUTE_RECOVERY_MS);

  let answerText = "";
  let answerShown = false;
  const showAnswerUI = () => {
    if (answerShown) return;
    answerShown = true;
    askSubtitle.classList.add("hidden");
    placeName.textContent = "Sabri";
    placeDescription.textContent = "";
    placeDescription.classList.remove("story-description--fallback");
    playerCard.classList.remove("hidden");
    playerCard.classList.add("is-open");
    appEl.classList.add("has-player");
    startPrompt.classList.add("hidden");
    tourControls.classList.remove("hidden");
  };

  try {
    await streamSSE(
      "/api/ask",
      {
        question,
        currentPlace: currentPlaceName,
        neighborhood: currentNeighborhoodName,
        heading: lastHeading,
        directionOfTravel,
        nearbyPlaces: lastContextPlaces,
        sessionLog,
        userProfile,
        correctionContext,
        crossSessionVisitedPlaces: crossSessionVisitedPlaceNames,
        language: settings.language,
        city: currentCity,
        country: currentCountry,
        weather: currentWeather,
        userStatedDirection,
        userStatedDestination,
        persona: currentPersona,
        sessionMood,
        placeFacts: currentPlaceId ? placeFactsCache[currentPlaceId] || null : null,
        placeConversationHistory: currentPlaceConversation,
        userId: currentUser ? currentUser.id : null,
      },
      {
        signal: streamAbortController.signal,
        onSentence: (sentenceText) => {
          showAnswerUI();
          answerText = answerText ? `${answerText} ${sentenceText}` : sentenceText;
          placeDescription.textContent = answerText;
          enqueueTtsSentence(sentenceText);
        },
        onDone: (payload) => {
          if (payload.fullText) answerText = payload.fullText;
          if (answerShown) placeDescription.textContent = answerText;

          let meta = {};
          if (payload.markerContent) {
            try {
              meta = JSON.parse(payload.markerContent);
            } catch (error) {
              // Malformed/truncated marker JSON — a real possible failure
              // mode with a streamed trailing marker. Non-fatal: the
              // answer itself already played fine, we just skip the
              // location-correction/stated-direction extraction this turn.
              console.log("[ask] failed to parse [[META]] marker, skipping extraction:", error?.message);
            }
          }

          if (meta.locationCorrection) {
            correctionContext = meta.locationCorrection;
          }
          // Real-world testing found Sabri kept narrating a street the user
          // had already said they were leaving — this is the fix: a stated
          // destination/direction persists (see userStatedDirection/Destination
          // declarations above) and outweighs raw GPS proximity for the
          // rest of the session, not just this one reply.
          if (meta.userStatedDestination || meta.userStatedDirection) {
            userStatedDestination = meta.userStatedDestination || null;
            userStatedDirection = meta.userStatedDirection || null;
            console.log("[intent] user stated new direction/destination:", userStatedDirection, userStatedDestination);
          }
        },
      }
    );

    if (!answerText) {
      statusText.textContent = "Sabri couldn't answer that.";
      askSubtitle.classList.add("hidden");
      return;
    }

    recordQuestionLog(question, answerText, lastHeading);
    // Deliberately more generous than sessionLog's 150-char truncation —
    // this is what actually keeps a deep back-and-forth about ONE place
    // consistent turn-to-turn (see buildPlaceConversationGuidance).
    currentPlaceConversation.push({ question, answer: answerText.length > 500 ? `${answerText.slice(0, 500)}...` : answerText });
    if (currentPlaceConversation.length > 6) currentPlaceConversation.shift();
    totalQuestionsThisSession += 1;
    saveQuestionToSupabase(question, answerText);
    logEvent("voice_question_asked", { placeId: currentPlaceId, questionLength: question.length });

    await waitForTtsQueueDrain();

    if (firstAudioPlaybackAt !== null) {
      const latencyMs = Math.round(firstAudioPlaybackAt - triggerTime);
      console.log(`[latency] time-to-first-audio (streamed answer): ${latencyMs}ms`);
      logEvent("time_to_first_audio", { ms: latencyMs, flow: "ask" });
    }

    statusText.textContent = "Listening for your next question...";
    setTimeout(() => {
      if (!isListening && statusText.textContent === "Listening for your next question...") {
        statusText.textContent = "Keep walking, discovering...";
      }
    }, 5000);
  } catch (error) {
    if (error.name !== "AbortError") {
      statusText.textContent = "Sabri couldn't answer that.";
      askSubtitle.classList.add("hidden");
    }
  } finally {
    isConversing = false;
  }
}
