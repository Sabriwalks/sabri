const startBtn = document.getElementById("start-btn");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const locationName = document.getElementById("location-name");
const playerCard = document.getElementById("player-card");
const placeName = document.getElementById("place-name");
const placeDescription = document.getElementById("place-description");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");

let watchId = null;
let lastPosition = null;
let placeAbortController = null;
let geocodeAbortController = null;
let speakAbortController = null;
let hasActivePlace = false;
let isNarrating = false;

let audioContext = null;
let currentAudioSource = null;

// Three-tier location state. orientationCenter/isOriented track whether
// we've given the user a neighborhood orientation for their current 100m
// "cell"; narratedPlaceIds ensures nothing (neighborhood or specific) is
// ever narrated twice in a session.
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
  // iOS Safari only allows creating/resuming an AudioContext from directly
  // inside a user gesture handler. Unlocking it here (once) means every
  // later location-triggered narration can reuse and resume this same
  // context without a fresh tap.
  unlockAudioContext();
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
playerCard.addEventListener("click", togglePlayback);

function unlockAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
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

  statusText.textContent = "Finding your location...";
  watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 20000,
  });
}

function onLocation(position) {
  const { latitude, longitude } = position.coords;

  if (lastPosition && distanceInMeters(lastPosition, { latitude, longitude }) < SIGNIFICANT_MOVE_METERS) {
    return;
  }
  lastPosition = { latitude, longitude };

  if (!hasActivePlace) {
    locationName.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  }

  reverseGeocode(latitude, longitude);
  checkForNarration(latitude, longitude);
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
async function runNeighborhoodOrientation(latitude, longitude) {
  statusText.textContent = "Getting your bearings...";

  const place = await fetchNearbyPlace(latitude, longitude, ORIENTATION_RADIUS_METERS, NEIGHBORHOOD_PLACE_TYPES);
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
  const place = await fetchNearbyPlace(latitude, longitude, SPECIFIC_RADIUS_METERS, SPECIFIC_PLACE_TYPES);

  if (!place || narratedPlaceIds.has(place.placeId)) {
    // STEP 3 - nothing new nearby; keep watching as the user walks.
    statusText.textContent = "Keep walking, discovering...";
    return;
  }

  await narrateAndSpeak(place, "specific", { latitude, longitude });
}

async function fetchNearbyPlace(latitude, longitude, radius, types) {
  if (placeAbortController) {
    placeAbortController.abort();
  }
  placeAbortController = new AbortController();

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
      radius: String(radius),
      types: types.join(","),
    });
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
    const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
    locationName.textContent = `${place.name} - ${typeLabel}`;

    startStory(place.name, data.narration);
    await speakNarration(data.narration);
  } catch (error) {
    statusText.textContent = "Couldn't generate your story.";
  } finally {
    isNarrating = false;
    lastNarrationEndTime = Date.now();
  }
}

// Resolves once playback has genuinely finished (or failed) — awaiting this
// is what keeps isNarrating true for the whole time audio is playing, not
// just while it's being generated.
async function speakNarration(text) {
  if (speakAbortController) {
    speakAbortController.abort();
  }
  speakAbortController = new AbortController();

  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: speakAbortController.signal,
    });

    if (!response.ok) {
      statusText.textContent = "Couldn't load audio for your story.";
      return;
    }

    const arrayBuffer = await response.arrayBuffer();

    // The AudioContext is created and unlocked once, on the Start Tour tap
    // (a direct user gesture) — iOS Safari refuses to play audio through a
    // context that was created or first resumed outside of one. If it's
    // missing here, that gesture never happened, so fall back to text.
    if (!audioContext) {
      throw new Error("AudioContext was never unlocked by a user gesture.");
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    if (currentAudioSource) {
      currentAudioSource.onended = null;
      currentAudioSource.stop();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    currentAudioSource = source;

    statusText.textContent = "Playing...";
    play();

    await new Promise((resolve) => {
      source.onended = () => {
        statusText.textContent = "Move to discover more...";
        pause();
        resolve();
      };
      source.start();
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
  if (!audioContext || !currentAudioSource) return;

  if (audioContext.state === "running") {
    audioContext.suspend();
    pause();
    statusText.textContent = "Paused";
  } else if (audioContext.state === "suspended") {
    audioContext.resume();
    play();
    statusText.textContent = "Playing...";
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
  play();
}

function play() {
  playBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
}

function pause() {
  pauseBtn.classList.add("hidden");
  playBtn.classList.remove("hidden");
}
