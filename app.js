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
      body: JSON.stringify({ place, tier, userProfile: DEFAULT_USER_PROFILE }),
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
      body: JSON.stringify({ text, speed: selectedSpeed }),
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
