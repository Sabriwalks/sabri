const appEl = document.querySelector(".app");
const startBtn = document.getElementById("start-btn");
const startPrompt = document.getElementById("start-prompt");
const tourControls = document.getElementById("tour-controls");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const locationName = document.getElementById("location-name");
const homePhoto = document.getElementById("home-photo");
const pulseEl = document.getElementById("pulse");
const playerCard = document.getElementById("player-card");
const drawerHandle = document.getElementById("drawer-handle");
const drawerClose = document.getElementById("drawer-close");
const placeName = document.getElementById("place-name");
const placeDescription = document.getElementById("place-description");
const speedButtons = document.querySelectorAll(".speed-btn");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const audioPlayer = document.getElementById("audio-player");
const installBanner = document.getElementById("install-banner");
const installBannerClose = document.getElementById("install-banner-close");
const installBannerCta = document.getElementById("install-banner-cta");
const installBannerIosOnly = document.querySelectorAll("[data-ios-only]");
const micBtn = document.getElementById("mic-btn");
const cameraBtn = document.getElementById("camera-btn");
const askSubtitle = document.getElementById("ask-subtitle");
const listeningHint = document.getElementById("listening-hint");
const toastEl = document.getElementById("toast");
const settingsBtn = document.getElementById("settings-btn");
const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
const voiceCards = document.querySelectorAll(".voice-card");
const depthPills = document.querySelectorAll(".depth-pill");
const languageSelect = document.getElementById("language-select");
const resetOnboardingBtn = document.getElementById("reset-onboarding-btn");
const accountSignedIn = document.getElementById("account-signed-in");
const accountGuest = document.getElementById("account-guest");
const accountNameEl = document.getElementById("account-name");
const accountEmailEl = document.getElementById("account-email");
const signOutBtn = document.getElementById("sign-out-btn");
const settingsGoogleBtn = document.getElementById("settings-google-btn");
const debugErrorBox = document.getElementById("debug-error-box");

// TEMPORARY diagnostic helper for the iOS Google Sign In investigation —
// shows the raw error text directly on screen since there's no easy way to
// read console output on a real iPhone without a connected Mac. Remove
// once the real bug is found and fixed.
function showDebugError(message) {
  console.log("[debug]", message);
  if (!debugErrorBox) return;
  debugErrorBox.textContent = String(message);
  debugErrorBox.classList.remove("hidden");
}

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

// TEMPORARY diagnostic (iOS Google Sign In investigation) — surface a
// missing config immediately on page load rather than waiting for the user
// to tap "Sign in" and be confused by nothing happening. If this fires, the
// server isn't injecting window.SUPABASE_URL/ANON_KEY into the page at all
// (check server.js's renderIndexHtml() actually ran — on Vercel this means
// checking vercel.json routes every path through server.js rather than
// serving a static index.html directly).
if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  showDebugError(
    "Configuration error - please contact support\n\n" +
      "(window.SUPABASE_URL=" +
      window.SUPABASE_URL +
      ", window.SUPABASE_ANON_KEY set=" +
      !!window.SUPABASE_ANON_KEY +
      ")"
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

let watchId = null;
let lastPosition = null;
let lastHeading = null;
let placeAbortController = null;
let geocodeAbortController = null;
let speakAbortController = null;
let hasActivePlace = false;
let isNarrating = false; // tour-narration pipeline busy
let isConversing = false; // tap-to-talk pipeline busy (independent flag —
// see interruptPlayback()/startListening() for why these can't share state)

let currentAudioObjectUrl = null;
let selectedSpeed = 1;
let currentNeighborhoodName = null;
let currentPlaceName = null;
let lastContextPlaces = [];
let correctionContext = null;

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

const onboarding = document.getElementById("onboarding");
const onboardingSteps = document.querySelectorAll(".onboarding-step");
const onboardingNameInput = document.getElementById("onboarding-name");
const onboardingWelcomeNextBtn = document.getElementById("onboarding-welcome-next");
const onboardingGoogleBtn = document.getElementById("onboarding-google-btn");
const onboardingGuestBtn = document.getElementById("onboarding-guest-btn");
const onboardingFinishBtn = document.getElementById("onboarding-finish");

let onboardingStepIndex = 0;
const onboardingAnswers = {
  name: "",
  reason: "",
  interests: [],
  companions: "",
  language: "en",
  depth: "standard",
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
  // Keep the settings panel's depth/language selections in sync with the
  // onboarding choices, so they don't silently diverge from each other.
  settings.depth = userProfile.depth || settings.depth;
  settings.language = userProfile.language || settings.language;
  saveSettings();
  applySettingsToUI();
  onboarding.classList.add("hidden");
  initializeAuthState();
}

if (onboardingFinishBtn) {
  onboardingFinishBtn.addEventListener("click", completeOnboarding);
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

async function signInWithGoogle() {
  // TEMPORARY diagnostics (iOS Google Sign In investigation) — alert() first
  // since it's the most reliable way to confirm a tap actually reached this
  // function on a real iPhone with no debugger attached; console.log right
  // after for anyone who IS watching Safari's Web Inspector over USB.
  alert("Sign in tapped");
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
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://getsabri.com/auth/callback",
        skipBrowserRedirect: false,
      },
    });

    console.log("[debug] signInWithOAuth resolved:", { data, error });

    if (error) {
      throw error;
    }
  } catch (error) {
    const message = (error && error.message) || String(error);
    showDebugError("Sign in failed: " + message);
  }
}

// If the user tapped "Sign in with Google" from onboarding, the page just
// did a full redirect out to Google and back (redirect mode, not a popup —
// see signInWithGoogle) — every in-memory JS variable (including
// onboardingAnswers) was wiped. This restores the draft saved right before
// the redirect and either:
//  - sign-in succeeded: saves the profile and skips straight into the main
//    app, same as finishing onboarding normally — no extra tap needed.
//  - sign-in didn't complete (cancelled, error, still pending): restores
//    the answers and drops the user back on the "save" screen so they can
//    retry or go guest, instead of losing 6 screens of answers and
//    restarting from the splash.
async function resumeOnboardingAfterAuth() {
  const session = supabaseClient ? (await supabaseClient.auth.getSession()).data?.session : null;

  let draftAnswers = null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (raw) draftAnswers = JSON.parse(raw);
  } catch (error) {
    draftAnswers = null;
  }

  if (!session) {
    if (draftAnswers) {
      Object.assign(onboardingAnswers, draftAnswers);
      goToOnboardingStep(onboardingSteps.length - 2); // the "save" screen
    } else if (onboardingStepIndex === 0) {
      // No draft at all — this wasn't actually a redirect return, just a
      // stale flag somehow. Fall back to the normal splash flow.
      advanceOnboarding();
    }
    return;
  }

  const fallbackName =
    session.user.user_metadata?.full_name?.split(" ")[0] ||
    session.user.user_metadata?.name?.split(" ")[0] ||
    session.user.email?.split("@")[0] ||
    "friend";

  Object.assign(onboardingAnswers, draftAnswers || { name: fallbackName });
  currentUser = session.user;

  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch (error) {
    // Non-fatal.
  }

  completeOnboarding();
  saveProfileToSupabase();
}

if (resetOnboardingBtn) {
  resetOnboardingBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(ONBOARDED_KEY);
      localStorage.removeItem(USER_PROFILE_KEY);
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      // ignore
    }
    location.reload();
  });
}

// Skip the splash's 2s auto-advance entirely when we're resuming a
// just-completed Google sign-in redirect — otherwise the timer and the
// async session check race, and the timer usually wins.
const hasPendingAuthResume = (() => {
  try {
    return !isOnboarded() && !!localStorage.getItem(ONBOARDING_DRAFT_KEY);
  } catch (error) {
    return false;
  }
})();

if (isOnboarded()) {
  onboarding.classList.add("hidden");
} else {
  onboarding.classList.remove("hidden");
  if (hasPendingAuthResume) {
    resumeOnboardingAfterAuth();
  } else {
    setTimeout(() => {
      if (onboardingStepIndex === 0) advanceOnboarding();
    }, 2000);
  }
}

// --- Auth state (Supabase session, cross-session history) ---

async function initializeAuthState() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data?.session?.user || null;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAccountSettingsUI();
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

async function saveProfileToSupabase() {
  if (!currentUser) return;
  try {
    await fetch("/api/auth/save-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, profile: userProfile }),
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
        city: null,
        narrationSummary: narrationText.slice(0, 200),
      }),
    });
  } catch (error) {
    // Non-fatal — local session state still works this run.
  }
}

// Fired when the app is backgrounded/closed — uses sendBeacon so the
// request actually survives the page being torn down, which a plain fetch
// often doesn't.
function saveSessionToSupabase() {
  if (!currentUser) return;
  const payload = JSON.stringify({
    userId: currentUser.id,
    neighborhood: currentNeighborhoodName,
    city: null,
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
    updateAccountSettingsUI();
    showToast("Signed out");
  });
}

if (settingsGoogleBtn) {
  settingsGoogleBtn.addEventListener("click", signInWithGoogle);
}

initializeAuthState();

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
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });

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
  settingsDrawer.classList.add("is-open");
  settingsDrawer.setAttribute("aria-hidden", "false");
  settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
  settingsDrawer.classList.remove("is-open");
  settingsDrawer.setAttribute("aria-hidden", "true");
  settingsOverlay.classList.add("hidden");
}

// --- PWA: service worker ---

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
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

if (isIosSafari && !isStandalone) {
  configureInstallBannerForIos();
  setTimeout(showInstallBanner, 3000);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isIosSafari) {
    configureInstallBannerForAndroid();
    showInstallBanner();
  }
});

window.addEventListener("appinstalled", () => {
  dismissInstallBanner();
  deferredInstallPrompt = null;
});

// --- Tour controls ---

startBtn.addEventListener("click", () => {
  // iOS Safari only allows "unlocking" audio playback from directly inside
  // a user gesture handler. Doing it here (once) means every later
  // location-triggered narration can call .play() on this same element
  // without a fresh tap, including with the screen locked.
  unlockAudio();
  startTour();
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

// Placeholder for the camera feature — swap this implementation for real
// capture functionality later; the button/toast scaffolding stays the same.
function handleCameraTap() {
  showToast("Camera feature coming soon");
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
  });
});

// Keep UI, status text, and the lock-screen playback indicator in sync
// regardless of what triggered the play/pause — our own buttons, the
// drawer, or the lock-screen/AirPods media controls.
audioPlayer.addEventListener("play", () => {
  play();
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

function startTour() {
  if (!("geolocation" in navigator)) {
    statusText.textContent = "Geolocation isn't supported on this device.";
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  recentPositions = [];
  travelHistory = [];
  gpsStabilized = false;
  hasShownFastWelcome = false;
  lastPosition = null;
  tourStartedAt = Date.now();
  isFirstNarrationOfSession = true;
  totalNarrationsThisSession = 0;
  totalQuestionsThisSession = 0;
  pulseEl.classList.remove("is-locked");
  micBtn.classList.add("is-available");

  if (currentUser) {
    loadReturningUserContext();
  }

  statusText.textContent = "Finding your location...";
  watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
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
      pulseEl.classList.add("is-locked");
    } else {
      return;
    }
  }

  if (lastPosition && distanceInMeters(lastPosition, current) < SIGNIFICANT_MOVE_METERS) {
    return;
  }
  lastPosition = current;

  if (!hasActivePlace) {
    locationName.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  }

  reverseGeocode(latitude, longitude);
  checkForNarration(latitude, longitude, lastHeading);
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
async function showFastWelcome(latitude, longitude) {
  try {
    const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
    const data = await response.json();

    if (response.ok && data.locationName) {
      statusText.textContent = `GPS finding you in ${data.locationName}...`;
      if (!hasActivePlace) {
        locationName.textContent = data.locationName;
      }
    }
  } catch (error) {
    // Leave the coordinates fallback in place if this quick check fails.
  }
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

    // A narrated place's name is more precise than a general area name, so
    // don't clobber it once one's already showing.
    if (response.ok && data.locationName && !hasActivePlace) {
      locationName.textContent = data.locationName;
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

  const place = await fetchNearbyPlace(latitude, longitude, NEIGHBORHOOD_PLACE_TYPES, { strategy: "nearest" });
  isOriented = true;

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

async function narrateAndSpeak({ tier, place, places, heading, triggerPosition }) {
  isNarrating = true;
  lastNarrationPosition = triggerPosition;
  statusText.textContent = tier === "neighborhood" ? "Getting your bearings..." : "Generating your story...";

  const directionOfTravel = computeDirectionOfTravel();

  try {
    const response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.narration) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    const focusedPlace =
      tier === "neighborhood" ? place : places.find((p) => p.placeId === data.focusedPlaceId) || choosePrimaryPlace(places);

    if (!focusedPlace) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    narratedPlaceIds.add(focusedPlace.placeId);
    hasActivePlace = true;
    currentPlaceName = focusedPlace.name;
    if (tier === "neighborhood") {
      currentNeighborhoodName = focusedPlace.name;
    }
    recordNarrationLog(focusedPlace, data.narration, heading, focusedPlace.relativePosition === "in front of");
    totalNarrationsThisSession += 1;
    isFirstNarrationOfSession = false;

    if (currentUser) {
      visitedPlaceIds.add(focusedPlace.placeId);
      saveVisitToSupabase(focusedPlace, data.narration);
    }

    const typeLabel = PLACE_TYPE_LABELS[focusedPlace.primaryType] || focusedPlace.primaryType;
    locationName.textContent = `${focusedPlace.name} - ${typeLabel}`;

    const photoUrl = focusedPlace.photoReference
      ? `/api/photo?ref=${encodeURIComponent(focusedPlace.photoReference)}&maxwidth=800`
      : null;
    applyHomePhoto(photoUrl);

    startStory(focusedPlace.name, data.narration);
    updateMediaSessionMetadata(focusedPlace.name, currentNeighborhoodName, photoUrl);
    await speakNarration(data.narration);
  } catch (error) {
    statusText.textContent = "Couldn't generate your story.";
  } finally {
    isNarrating = false;
    lastNarrationEndTime = Date.now();
  }
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
      body: JSON.stringify({ text, speed: selectedSpeed, voice: settings.voice }),
      signal: speakAbortController.signal,
    });

    if (!response.ok) {
      statusText.textContent = "Couldn't load audio for your story.";
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });

    if (currentAudioObjectUrl) {
      URL.revokeObjectURL(currentAudioObjectUrl);
    }
    currentAudioObjectUrl = URL.createObjectURL(blob);
    audioPlayer.src = currentAudioObjectUrl;

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
// pending speakNarration() promise immediately, so the caller's finally
// block runs right away instead of hanging until a natural 'ended' event
// that will never come once we overwrite audioPlayer.src.
function interruptPlayback() {
  audioPlayer.pause();
  if (currentPlaybackResolve) {
    const resolve = currentPlaybackResolve;
    currentPlaybackResolve = null;
    resolve();
  }
}

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
const FOLLOWUP_SILENCE_MS = 3000; // stop 3s after the user stops speaking
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
} else {
  micBtn.classList.add("hidden");
}

// Picks the highest-confidence alternative out of a SpeechRecognitionResult.
// iOS Safari doesn't always populate `confidence` (it's sometimes 0 for
// every alternative, especially on interim results) — falls back to the
// first alternative in that case, same as requesting just one.
function pickBestAlternative(result) {
  let best = result[0];
  for (let i = 1; i < result.length; i++) {
    if ((result[i].confidence || 0) > (best.confidence || 0)) {
      best = result[i];
    }
  }
  return best;
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

function startListening() {
  if (!recognition || isListening) return;

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
  listeningHint.classList.remove("hidden");
  listeningHint.textContent = "Tap to cancel";
  statusText.textContent = "Listening...";

  recognition.lang = SPEECH_RECOGNITION_LANGS[settings.language] || "en-US";

  let finalTranscript = "";
  const resetSilenceTimer = (duration) => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => stopListening(), duration);
  };
  resetSilenceTimer(INITIAL_SILENCE_MS);

  recognition.onresult = (event) => {
    resetSilenceTimer(FOLLOWUP_SILENCE_MS);

    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = pickBestAlternative(event.results[i]).transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }
    askSubtitle.textContent = finalTranscript || interim;
  };

  recognition.onend = () => {
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

    const question = finalTranscript.trim();
    if (!question || question.length < MIN_QUESTION_LENGTH) {
      askSubtitle.textContent = "I didn't catch that — tap to try again";
      setTimeout(() => askSubtitle.classList.add("hidden"), 2500);
      isConversing = false;
      statusText.textContent = "Keep walking, discovering...";
      return;
    }

    // Show the full captured text for a beat so the user can confirm what
    // was actually heard before it's sent off to Claude.
    askSubtitle.textContent = question;
    statusText.textContent = "Sabri is thinking...";
    setTimeout(() => askSabri(question), CONFIRM_DISPLAY_MS);
  };

  recognition.onerror = () => {
    clearTimeout(silenceTimer);
    isListening = false;
    isConversing = false;
    isCancelledListening = false;
    micBtn.classList.remove("is-listening");
    listeningHint.classList.add("hidden");
    askSubtitle.classList.add("hidden");
    statusText.textContent = "Didn't catch that — tap the mic to try again.";
  };

  try {
    recognition.start();
  } catch (error) {
    isListening = false;
    isConversing = false;
    micBtn.classList.remove("is-listening");
    listeningHint.classList.add("hidden");
  }
}

// Stops listening AND sends whatever was captured — same completion path
// as the silence timeout firing on its own.
function stopListening() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch (error) {
    // Already stopped — harmless.
  }
}

// Stops listening and discards the transcript entirely — nothing gets sent
// to Claude, unlike stopListening()/the silence timeout.
function cancelListening() {
  if (!recognition) return;
  isCancelledListening = true;
  try {
    recognition.stop();
  } catch (error) {
    // Already stopped — harmless.
  }
}

async function askSabri(question) {
  const directionOfTravel = computeDirectionOfTravel();

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.answer) {
      statusText.textContent = "Sabri couldn't answer that.";
      askSubtitle.classList.add("hidden");
      return;
    }

    if (data.locationCorrection) {
      correctionContext = data.locationCorrection;
    }

    recordQuestionLog(question, data.answer, lastHeading);
    totalQuestionsThisSession += 1;

    askSubtitle.classList.add("hidden");
    placeName.textContent = "Sabri";
    placeDescription.textContent = data.answer;
    placeDescription.classList.remove("story-description--fallback");
    playerCard.classList.remove("hidden");
    playerCard.classList.add("is-open");
    appEl.classList.add("has-player");
    startPrompt.classList.add("hidden");
    tourControls.classList.remove("hidden");

    // Give iOS a moment to re-establish the Bluetooth route back to
    // AirPods after SpeechRecognition released the microphone, before
    // asking the audio element to start playing again.
    await sleep(AIRPODS_ROUTE_RECOVERY_MS);
    await speakNarration(data.answer);

    statusText.textContent = "Listening for your next question...";
    setTimeout(() => {
      if (!isListening && statusText.textContent === "Listening for your next question...") {
        statusText.textContent = "Keep walking, discovering...";
      }
    }, 5000);
  } catch (error) {
    statusText.textContent = "Sabri couldn't answer that.";
    askSubtitle.classList.add("hidden");
  } finally {
    isConversing = false;
  }
}
