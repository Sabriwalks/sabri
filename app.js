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
const tourLoadingOverlay = document.getElementById("tour-loading-overlay");
const tourLoadingText = document.getElementById("tour-loading-text");
const narrationWaveEl = document.getElementById("narration-wave");
const cameraOverlay = document.getElementById("camera-overlay");
const cameraVideo = document.getElementById("camera-video");
const cameraCanvas = document.getElementById("camera-canvas");
const cameraCloseBtn = document.getElementById("camera-close-btn");
const cameraIdentifyBtn = document.getElementById("camera-identify-btn");
const deleteAccountBtn = document.getElementById("delete-account-btn");
const deleteAccountConfirm = document.getElementById("delete-account-confirm");
const deleteAccountConfirmBtn = document.getElementById("delete-account-confirm-btn");
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
const preferencesVoiceCards = document.querySelectorAll("#preferences-drawer .voice-card");
const preferencesDepthPills = document.querySelectorAll("#preferences-drawer .depth-pill");
const preferencesLanguageSelect = document.getElementById("preferences-language");
const preferencesSaveBtn = document.getElementById("preferences-save-btn");

const tourModeModal = document.getElementById("tour-mode-modal");
const tourModeClose = document.getElementById("tour-mode-close");
const tourModeWanderBtn = document.getElementById("tour-mode-wander-btn");
const tourModePlanBtn = document.getElementById("tour-mode-plan-btn");

const tourPlanner = document.getElementById("tour-planner");
const plannerClose = document.getElementById("planner-close");
const plannerDurationCards = document.getElementById("planner-duration-cards");
const plannerDistancePills = document.getElementById("planner-distance-pills");
const plannerStep0NextBtn = document.getElementById("planner-step0-next");
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
let currentCity = null;
let currentCountry = null;
let lastContextPlaces = [];
let correctionContext = null;

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

// Interest-matched places (see INTEREST_TYPE_MAP server-side) — loaded once
// per orientation area and used for both priority map pins and the
// proactive "something fascinating up ahead" guidance.
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
    await handleOAuthSignIn(session);
    return;
  }

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

  if (!isOnboarded()) {
    let draftAnswers = null;
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) draftAnswers = JSON.parse(raw);
    } catch (error) {
      draftAnswers = null;
    }

    const fallbackName =
      session.user.user_metadata?.full_name?.split(" ")[0] ||
      session.user.user_metadata?.name?.split(" ")[0] ||
      session.user.email?.split("@")[0] ||
      "friend";

    Object.assign(onboardingAnswers, draftAnswers || { name: fallbackName });

    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch (error) {
      // Non-fatal.
    }

    // Saves the profile locally, sets sabri_onboarded, hides the onboarding
    // overlay, and syncs settings — the user lands straight on the main
    // app's home screen, ready to tour.
    completeOnboarding();
  }

  // By this point onboarding is definitely complete — either it just ran
  // (the branch above) or it already was (a guest signing in later from
  // Settings mid-session, isOnboarded() already true).
  saveProfileToSupabase(true);
  await loadVisitedPlaceIds();
  updateAccountSettingsUI();
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
    companions: profile.companions || "",
    language: profile.language || "en",
    depth: profile.depth || "standard",
  };
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    localStorage.setItem(ONBOARDED_KEY, "true");
  } catch (error) {
    // Non-fatal — restored profile just won't persist locally this run.
  }
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
    onboarding.classList.remove("hidden");
    hideAppBootLoading();
    await resumeOnboardingAfterAuth();
    initializeAuthState();
    return;
  }

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const session = data?.session || null;
      if (session) {
        currentUser = session.user;
        const response = await fetch(`/api/auth/user-history?userId=${encodeURIComponent(session.user.id)}`);
        const historyData = response.ok ? await response.json() : null;
        const profile = historyData?.profile || null;

        if (profile && profile.onboarding_complete) {
          applyProfileFromSupabase(profile);
          onboarding.classList.add("hidden");
          hideAppBootLoading();
          await initializeAuthState();
          return;
        }
      }
    } catch (error) {
      // Session/profile check failed — fall through to the normal
      // localStorage-driven onboarding gate below rather than getting stuck.
    }
  }

  hideAppBootLoading();
  if (isOnboarded()) {
    onboarding.classList.add("hidden");
  } else {
    onboarding.classList.remove("hidden");
    setTimeout(() => {
      if (onboardingStepIndex === 0) advanceOnboarding();
    }, 2000);
  }
  initializeAuthState();
}

bootstrapApp();

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

// Fired when the app is backgrounded/closed — uses sendBeacon so the
// request actually survives the page being torn down, which a plain fetch
// often doesn't.
function saveSessionToSupabase() {
  if (!currentUser) return;
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
  preferencesVoiceCards.forEach((card) => card.classList.toggle("is-active", card.dataset.voice === settings.voice));
  const currentDepth = userProfile?.depth || settings.depth;
  preferencesDepthPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.depth === currentDepth));
  if (preferencesLanguageSelect) preferencesLanguageSelect.value = settings.language;
}

preferencesInterestsContainer.querySelectorAll(".onboarding-pill").forEach((pill) => {
  pill.addEventListener("click", () => pill.classList.toggle("is-selected"));
});

preferencesVoiceCards.forEach((card) => {
  card.addEventListener("click", () => {
    preferencesVoiceCards.forEach((c) => c.classList.remove("is-active"));
    card.classList.add("is-active");
  });
});

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
    const activeVoiceCard = Array.from(preferencesVoiceCards).find((card) => card.classList.contains("is-active"));
    const activeDepthPill = Array.from(preferencesDepthPills).find((pill) => pill.classList.contains("is-active"));
    const voice = activeVoiceCard ? activeVoiceCard.dataset.voice : settings.voice;
    const depth = activeDepthPill ? activeDepthPill.dataset.depth : settings.depth;
    const language = preferencesLanguageSelect ? preferencesLanguageSelect.value : settings.language;

    // Commit the draft to live app state (affects the very next narration,
    // no restart needed) at the same time as the Supabase write below.
    userProfile = { ...userProfile, name, interests, depth, language };
    settings.voice = voice;
    settings.depth = depth;
    settings.language = language;

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
    gestureHandling: "greedy",
    styles: MAP_STYLE,
  });
  console.log("[map] map instance created");
}

initMap();

function buildUserLocationIcon(heading) {
  const hasHeading = typeof heading === "number" && !Number.isNaN(heading);
  const arrow = hasHeading
    ? `<g transform="rotate(${heading} 28 28)"><path d="M28 6 L34 20 L28 15 L22 20 Z" fill="#D4A853"/></g>`
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">` +
    `<circle cx="28" cy="28" r="18" fill="#D4A853" fill-opacity="0.22"/>` +
    `<circle cx="28" cy="28" r="10" fill="#D4A853" fill-opacity="0.45"/>` +
    `${arrow}` +
    `<circle cx="28" cy="28" r="6" fill="#D4A853" stroke="#FAF7F2" stroke-width="2"/>` +
    `</svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(56, 56),
    anchor: new google.maps.Point(28, 28),
  };
}

function updateUserLocationOnMap(latitude, longitude, heading) {
  if (!map) return;
  const position = { lat: latitude, lng: longitude };
  const icon = buildUserLocationIcon(heading);

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
  } else {
    map.panTo(position);
  }
}

// Pin size/color: large gold for interest-matched places, medium gold for
// other nearby candidates, small warm grey for already-visited-this-session,
// and a pulsing gold ring layered on top for whichever place is currently
// narrating.
function buildPlaceMarkerIcon({ isInterestMatch, isVisited, isNarratingNow }) {
  const size = isNarratingNow ? 30 : isInterestMatch ? 26 : isVisited ? 14 : 18;
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
    triggerNarrationForPlace(place);
  });
  return container;
}

// Adds/updates a pin for a place. isInterestMatch/isVisited/isNarratingNow
// determine its size/color (see buildPlaceMarkerIcon). Safe to call
// repeatedly for the same placeId — just updates the existing marker.
function upsertPlaceMarker(place, { isInterestMatch } = {}) {
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
  const icon = buildPlaceMarkerIcon({ isInterestMatch: resolvedIsInterestMatch, isVisited, isNarratingNow });

  let marker = placeMarkersByPlaceId.get(place.placeId);
  if (!marker) {
    marker = new google.maps.Marker({
      position: { lat: place.latitude, lng: place.longitude },
      map,
      icon,
      zIndex: isNarratingNow ? 900 : resolvedIsInterestMatch ? 500 : 200,
    });
    marker.addListener("click", () => {
      if (activeInfoWindow) activeInfoWindow.close();
      activeInfoWindow = new google.maps.InfoWindow({ content: buildPinPopupContent(place) });
      activeInfoWindow.open({ map, anchor: marker });
    });
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

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      radius: String(CONTEXT_RADIUS_METERS),
      types: SPECIFIC_PLACE_TYPES.join(","),
    });
    if (typeof heading === "number" && !Number.isNaN(heading)) params.set("heading", String(heading));

    console.log("[map] fetching /api/context for pins", { latitude, longitude });
    const response = await fetch(`/api/context?${params.toString()}`);
    const data = await response.json();
    const places = response.ok && Array.isArray(data.places) ? data.places : [];
    console.log(`[map] /api/context returned ${places.length} place(s) for pins`);

    lastContextPlaces = places;
    places.forEach((place) => {
      const hasCoords = typeof place.latitude === "number" && typeof place.longitude === "number";
      if (!hasCoords) {
        console.log("[map] skipping place with invalid coordinates", place.name, place.placeId);
        return;
      }
      upsertPlaceMarker(place);
    });

    if (places.length > 0) {
      pinsEverLoaded = true;
      clearTimeout(noPinsToastTimeout);
    }
  } catch (error) {
    console.log("[map] pin refresh failed", error);
  }
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
    marker.setIcon(buildPlaceMarkerIcon({ isInterestMatch: interestPlaceIds.has(placeId), isVisited, isNarratingNow }));
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
};

let plannedTour = null; // {tourTitle, tourDescription, estimatedDuration, estimatedDistance, stops:[{...,place}], openingNote}
let plannedTourActive = false;
let plannedTourStopIndex = 0;
let plannedTourMarkers = [];
let plannedTourRouteLine = null;
const GUIDED_TOUR_ARRIVAL_METERS = 30;

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
  tourModeWanderBtn.addEventListener("click", () => {
    closeTourModeModal();
    startTour();
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

function updatePlannerStep0NextState() {
  plannerStep0NextBtn.disabled = !(plannerAnswers.duration && plannerAnswers.maxDistance);
}

if (plannerStep0NextBtn) {
  plannerStep0NextBtn.addEventListener("click", () => showPlannerStep(1));
}

// --- Planner Step 1: start / end points ---

if (plannerUseCurrentLocationBtn) {
  plannerUseCurrentLocationBtn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      showToast("Location isn't available on this device");
      return;
    }
    plannerUseCurrentLocationBtn.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition(
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
        duration: plannerAnswers.duration,
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

    unlockAudio();
    startTour();

    if (plannedTour.openingNote) {
      startStory(plannedTour.tourTitle || "Your Tour", plannedTour.openingNote);
      await speakNarration(plannedTour.openingNote);
    }
  });
}

// Called from checkForNarration (in place of the normal
// orientation/specific-zoom-in flow) whenever a guided tour is active —
// narrates the current target stop once the user is within
// GUIDED_TOUR_ARRIVAL_METERS of it, then advances to the next stop.
async function checkGuidedTourProgress(latitude, longitude, heading) {
  if (!plannedTour || plannedTourStopIndex >= plannedTour.stops.length) {
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
    if (narratedPlaceIds.has(place.placeId)) {
      plannedTourStopIndex += 1;
      return;
    }
    await narrateAndSpeak({ tier: "specific", places: [place], heading, triggerPosition: { latitude, longitude } });
    plannedTourStopIndex += 1;
    return;
  }

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
// See INTEREST_TYPE_MAP in server.js for the interest → Google Places type
// mapping (server does the mapping; the client just passes the user's raw
// onboarding interest labels).

async function loadInterestPlaces(latitude, longitude) {
  if (!userProfile || !Array.isArray(userProfile.interests) || userProfile.interests.length === 0) {
    console.log("[map] loadInterestPlaces skipped — no saved interests on profile");
    interestPlaces = [];
    return;
  }
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      interests: userProfile.interests.join("|"),
    });
    const response = await fetch(`/api/interest-places?${params.toString()}`);
    const data = await response.json();
    interestPlaces = response.ok && Array.isArray(data.places) ? data.places : [];
    console.log(`[map] /api/interest-places returned ${interestPlaces.length} place(s)`);
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
    cameraOverlay.classList.remove("hidden");
  } catch (error) {
    showToast("Camera permission denied");
  }
}

function closeCameraOverlay() {
  cameraOverlay.classList.add("hidden");
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

if (cameraCloseBtn) {
  cameraCloseBtn.addEventListener("click", closeCameraOverlay);
}

if (cameraIdentifyBtn) {
  cameraIdentifyBtn.addEventListener("click", async () => {
    if (isIdentifying || !cameraStream) return;
    isIdentifying = true;
    cameraIdentifyBtn.textContent = "Looking...";

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
        body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }),
      });
      const data = await response.json();

      closeCameraOverlay();

      if (!response.ok || !data.narration) {
        showToast("Couldn't identify that — try again");
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

      await speakNarration(data.narration);
    } catch (error) {
      closeCameraOverlay();
      showToast("Couldn't identify that — try again");
    } finally {
      isIdentifying = false;
      cameraIdentifyBtn.textContent = "Identify this";
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
const TOUR_LOADING_STAGES = ["locating", "locking", "discovering", "preparing"];
const TOUR_LOADING_MESSAGES = {
  locating: "Finding your location...",
  locking: "Locking GPS...",
  discovering: "Discovering nearby places...",
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
  });
});

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

  pinsEverLoaded = false;
  scheduleNoPinsFallback();
  showTourLoadingOverlay();

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
      pulseEl.classList.add("is-locked");
      advanceTourLoadingStage("locking");
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

async function narrateAndSpeak({ tier, place, places, heading, triggerPosition }) {
  isNarrating = true;
  lastNarrationPosition = triggerPosition;
  statusText.textContent = "Sabri is preparing your story...";

  advanceTourLoadingStage("preparing");
  const bestGuessName = tier === "neighborhood" ? place?.name : choosePrimaryPlace(places)?.name;
  showNarrationLoadingState(bestGuessName);

  const directionOfTravel = computeDirectionOfTravel();
  const { proactive: nearbyInterestPlace } = triggerPosition
    ? findNearbyInterestPlace(triggerPosition.latitude, triggerPosition.longitude, heading)
    : { proactive: null };

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
        neighborhood: currentNeighborhoodName,
        city: currentCity,
        country: currentCountry,
        weather: currentWeather,
        nearbyInterestPlace,
        firstVisitToCity: computeFirstVisitToCity(),
        timeOfDay: computeTimeOfDay(),
        userStatedDirection,
        userStatedDestination,
      }),
    });
    const data = await response.json();
    hideTourLoadingOverlay();

    if (!response.ok || !data.narration) {
      statusText.textContent = "Couldn't generate your story.";
      hideNarrationLoadingState();
      return;
    }

    const focusedPlace =
      tier === "neighborhood" ? place : places.find((p) => p.placeId === data.focusedPlaceId) || choosePrimaryPlace(places);

    if (!focusedPlace) {
      statusText.textContent = "Couldn't generate your story.";
      hideNarrationLoadingState();
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

    locationName.textContent = focusedPlace.name;
    if (neighborhoodNameEl) neighborhoodNameEl.textContent = currentNeighborhoodName || "";

    // Pin for the focused place gets the pulsing "narrating now" ring —
    // upsert it first (covers pins we haven't drawn yet, e.g. the
    // neighborhood-orientation tier's place) then refresh every other pin
    // so any previous narrating-ring is cleared.
    narratingPlaceId = focusedPlace.placeId;
    upsertPlaceMarker(focusedPlace);
    refreshAllPlaceMarkers();

    const photoUrl = focusedPlace.photoReference
      ? `/api/photo?ref=${encodeURIComponent(focusedPlace.photoReference)}&maxwidth=800`
      : null;
    applyHomePhoto(photoUrl);

    startStory(focusedPlace.name, data.narration);
    updateMediaSessionMetadata(focusedPlace.name, currentNeighborhoodName, photoUrl);
    await speakNarration(data.narration);
  } catch (error) {
    statusText.textContent = "Couldn't generate your story.";
    hideTourLoadingOverlay();
  } finally {
    isNarrating = false;
    lastNarrationEndTime = Date.now();
    narratingPlaceId = null;
    refreshAllPlaceMarkers();
    hideNarrationLoadingState();
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
      body: JSON.stringify({ text, speed: selectedSpeed, voice: settings.voice, language: settings.language }),
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
        city: currentCity,
        country: currentCountry,
        weather: currentWeather,
        userStatedDirection,
        userStatedDestination,
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

    // Real-world testing found Sabri kept narrating a street the user had
    // already said they were leaving — this is the fix: a stated
    // destination/direction persists (see userStatedDirection/Destination
    // declarations above) and outweighs raw GPS proximity for the rest of
    // the session, not just this one reply.
    if (data.userStatedDestination || data.userStatedDirection) {
      userStatedDestination = data.userStatedDestination || null;
      userStatedDirection = data.userStatedDirection || null;
      console.log("[intent] user stated new direction/destination:", userStatedDirection, userStatedDestination);
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
