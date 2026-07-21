const startBtn = document.getElementById("start-btn");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const locationName = document.getElementById("location-name");
const pulseEl = document.getElementById("pulse");
const playerCard = document.getElementById("player-card");
const drawerHandle = document.getElementById("drawer-handle");
const drawerClose = document.getElementById("drawer-close");
const placePhoto = document.getElementById("place-photo");
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
const askSubtitle = document.getElementById("ask-subtitle");
const settingsBtn = document.getElementById("settings-btn");
const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
const voiceCards = document.querySelectorAll(".voice-card");
const depthPills = document.querySelectorAll(".depth-pill");
const languageSelect = document.getElementById("language-select");

let watchId = null;
let lastPosition = null;
let placeAbortController = null;
let geocodeAbortController = null;
let speakAbortController = null;
let hasActivePlace = false;
let isNarrating = false;

let currentAudioObjectUrl = null;
let selectedSpeed = 1;
let currentNeighborhoodName = null;

// GPS stabilization: don't act on the raw first fix, which can be noisy.
// Show a fast, provisional welcome immediately, but wait for a few
// consecutive readings to agree before starting real orientation.
let recentPositions = [];
let gpsStabilized = false;
let hasShownFastWelcome = false;
const GPS_STABILIZATION_METERS = 20;
const GPS_STABILIZATION_READINGS = 3;

// Three-tier location state. orientationCenter/isOriented track whether
// we've given the user a neighborhood orientation for their current area;
// narratedPlaceIds ensures nothing (neighborhood or specific) is ever
// narrated twice in a session.
let orientationCenter = null;
let isOriented = false;
const narratedPlaceIds = new Set();

// Short-term memory: the last 3 places narrated (plus any question asked
// about each), sent to /api/ask so Sabri has context of the walk so far.
const sessionHistory = [];

// Pacing: once a narration finishes, wait for both a time and a distance
// threshold before the next one can start, so narrations never jumble
// together while walking at a normal pace.
let lastNarrationEndTime = 0;
let lastNarrationPosition = null;
const NARRATION_COOLDOWN_MS = 10000;
const NARRATION_COOLDOWN_METERS = 10;

const DEFAULT_USER_PROFILE = {
  interests: ["history", "culture", "local stories"],
  pace: "walking",
  language: "en",
};

const SIGNIFICANT_MOVE_METERS = 15;
const ORIENTATION_RADIUS_METERS = 100;
const SPECIFIC_RADIUS_METERS = 15;

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
// "Install" button wired to the native prompt (the old behavior, just
// presented through this banner instead of a standalone pill button).

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
      if (!isListening) startListening();
    });
  } catch (error) {
    // Unsupported action type — non-fatal.
  }
}

function unlockAudio() {
  try {
    const playPromise = audioPlayer.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    audioPlayer.pause();
  } catch (error) {
    // Some browsers throw synchronously when there's no src yet — harmless.
  }
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
  gpsStabilized = false;
  hasShownFastWelcome = false;
  lastPosition = null;
  pulseEl.classList.remove("is-locked");
  micBtn.classList.add("is-available");

  statusText.textContent = "Finding your location...";
  watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 20000,
  });
}

function onLocation(position) {
  const { latitude, longitude } = position.coords;
  const current = { latitude, longitude };

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
  checkForNarration(latitude, longitude);
}

function isGpsStable(positions) {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (distanceInMeters(positions[i], positions[j]) > GPS_STABILIZATION_METERS) return false;
    }
  }
  return true;
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

// Entry point for the three-tier flow: never interrupt a playing narration,
// respect the pacing cooldown, then decide whether we need a fresh
// neighborhood orientation (STEP 1) or can zoom into something specific
// (STEP 2).
async function checkForNarration(latitude, longitude) {
  if (isNarrating) return;

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

  await runSpecificZoomIn(latitude, longitude);
}

// STEP 1 - orient the user to the neighborhood they've just arrived in.
// Sorted by actual distance (not prominence) so we never grab a famous but
// far-away neighborhood over the one the user is actually standing in.
async function runNeighborhoodOrientation(latitude, longitude) {
  statusText.textContent = "Getting your bearings...";

  const place = await fetchNearbyPlace(latitude, longitude, NEIGHBORHOOD_PLACE_TYPES, {
    strategy: "nearest",
  });
  isOriented = true;

  if (!place || narratedPlaceIds.has(place.placeId)) {
    statusText.textContent = "Keep walking, discovering...";
    return;
  }

  await narrateAndSpeak(place, "neighborhood", { latitude, longitude });
}

// STEP 2 - once oriented and still within range, look for something
// specific worth stopping for.
async function runSpecificZoomIn(latitude, longitude) {
  const place = await fetchNearbyPlace(latitude, longitude, SPECIFIC_PLACE_TYPES, { radius: SPECIFIC_RADIUS_METERS });

  if (!place || narratedPlaceIds.has(place.placeId)) {
    // STEP 3 - nothing new nearby; keep watching as the user walks.
    statusText.textContent = "Keep walking, discovering...";
    return;
  }

  await narrateAndSpeak(place, "specific", { latitude, longitude });
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

async function narrateAndSpeak(place, tier, triggerPosition) {
  isNarrating = true;
  lastNarrationPosition = triggerPosition;
  statusText.textContent = tier === "neighborhood" ? "Getting your bearings..." : "Generating your story...";

  try {
    const response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place,
        tier,
        depth: settings.depth,
        language: settings.language,
        userProfile: DEFAULT_USER_PROFILE,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.narration) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    narratedPlaceIds.add(place.placeId);
    hasActivePlace = true;
    if (tier === "neighborhood") {
      currentNeighborhoodName = place.name;
    }
    recordHistory(place, data.narration);

    const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
    locationName.textContent = `${place.name} - ${typeLabel}`;

    const photoUrl = place.photoReference
      ? `/api/photo?ref=${encodeURIComponent(place.photoReference)}&maxwidth=800`
      : null;
    applyPlacePhoto(photoUrl);

    startStory(place.name, data.narration);
    updateMediaSessionMetadata(place.name, currentNeighborhoodName, photoUrl);
    await speakNarration(data.narration);
  } catch (error) {
    statusText.textContent = "Couldn't generate your story.";
  } finally {
    isNarrating = false;
    lastNarrationEndTime = Date.now();
  }
}

// Keeps the last 3 places narrated (+ any question asked about each) as
// simple short-term memory, passed to /api/ask for conversational context.
function recordHistory(place, narrationText) {
  sessionHistory.push({ place: place.name, summary: summarizeForHistory(narrationText) });
  if (sessionHistory.length > 3) {
    sessionHistory.shift();
  }
}

function summarizeForHistory(text) {
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] || text;
  return firstSentence.length > 160 ? `${firstSentence.slice(0, 157)}...` : firstSentence;
}

function applyPlacePhoto(url) {
  // Clearing the inline style falls back to the CSS gradient placeholder.
  placePhoto.style.backgroundImage = url ? `url("${url}")` : "";
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

// Resolves once playback has genuinely finished (or failed) — awaiting this
// is what keeps isNarrating true for the whole time audio is playing, not
// just while it's being generated. Playback goes through the real HTML5
// <audio> element (not the Web Audio API) because that's what iOS Safari
// allows to keep playing with the screen locked, and what Media Session
// needs to attach lock-screen/AirPods controls to.
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
  } catch (error) {
    if (error.name === "AbortError") return;
    // Audio didn't play — make sure the story is still readable front and
    // center rather than leaving the user with nothing.
    statusText.textContent = "Audio unavailable — read your story below.";
    placeDescription.classList.add("story-description--fallback");
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
}

function play() {
  playBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
}

function pause() {
  pauseBtn.classList.add("hidden");
  playBtn.classList.remove("hidden");
}

// --- Tap to talk: speech-to-text + conversational Q&A ---

const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null;
let isListening = false;
let wasPlayingBeforeAsk = false;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
} else {
  micBtn.classList.add("hidden");
}

micBtn.addEventListener("click", () => {
  if (isListening) return;
  startListening();
});

function startListening() {
  if (!recognition || isNarrating || isListening) return;

  isNarrating = true; // block the tour pipeline from firing while we converse
  isListening = true;
  micBtn.classList.add("is-listening");
  askSubtitle.textContent = "";
  askSubtitle.classList.remove("hidden");
  statusText.textContent = "Listening...";

  wasPlayingBeforeAsk = !audioPlayer.paused;
  if (wasPlayingBeforeAsk) {
    audioPlayer.pause();
  }

  recognition.lang = SPEECH_RECOGNITION_LANGS[settings.language] || "en-US";

  let finalTranscript = "";
  const stopTimeout = setTimeout(() => {
    try {
      recognition.stop();
    } catch (error) {
      // Already stopped — harmless.
    }
  }, 10000);

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }
    askSubtitle.textContent = finalTranscript || interim;
  };

  recognition.onend = () => {
    clearTimeout(stopTimeout);
    isListening = false;
    micBtn.classList.remove("is-listening");

    const question = finalTranscript.trim();
    if (question) {
      statusText.textContent = "Sabri is thinking...";
      askSabri(question);
    } else {
      askSubtitle.classList.add("hidden");
      isNarrating = false;
      if (wasPlayingBeforeAsk) {
        audioPlayer.play().catch(() => {});
      } else {
        statusText.textContent = "Keep walking, discovering...";
      }
    }
  };

  recognition.onerror = () => {
    clearTimeout(stopTimeout);
    isListening = false;
    isNarrating = false;
    micBtn.classList.remove("is-listening");
    askSubtitle.classList.add("hidden");
    statusText.textContent = "Didn't catch that — tap the mic to try again.";
  };

  try {
    recognition.start();
  } catch (error) {
    isListening = false;
    isNarrating = false;
    micBtn.classList.remove("is-listening");
  }
}

async function askSabri(question) {
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        currentPlace: placeName.textContent !== "—" ? placeName.textContent : null,
        neighborhood: currentNeighborhoodName,
        sessionHistory,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.answer) {
      statusText.textContent = "Sabri couldn't answer that.";
      askSubtitle.classList.add("hidden");
      finishAsking();
      return;
    }

    if (sessionHistory.length > 0) {
      sessionHistory[sessionHistory.length - 1].question = question;
    }

    askSubtitle.classList.add("hidden");
    placeName.textContent = "Sabri";
    placeDescription.textContent = data.answer;
    placeDescription.classList.remove("story-description--fallback");
    playerCard.classList.remove("hidden");
    playerCard.classList.add("is-open");

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
    finishAsking();
  }
}

function finishAsking() {
  // Let the background tour pipeline resume checking location now that the
  // conversation has wrapped up.
  isNarrating = false;
}
