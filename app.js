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
let currentPlaceId = null;

let audioContext = null;
let currentAudioSource = null;

const DEFAULT_USER_PROFILE = {
  interests: ["history", "culture", "local stories"],
  pace: "walking",
  language: "en",
};

const SIGNIFICANT_MOVE_METERS = 15;
const NEARBY_RADIUS_METERS = 30;

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
  hasActivePlace = false;

  locationName.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  statusText.textContent = "Location found. Finding nearby places...";

  reverseGeocode(latitude, longitude);
  findNearbyPlace(latitude, longitude);
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

    // A specific nearby place (set by findNearbyPlace) is more precise than
    // a general area name, so don't clobber it if one's already showing.
    if (response.ok && data.locationName && !hasActivePlace) {
      locationName.textContent = data.locationName;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    // Leave the coordinates fallback in place if geocoding fails.
  }
}

async function findNearbyPlace(latitude, longitude) {
  if (placeAbortController) {
    placeAbortController.abort();
  }
  placeAbortController = new AbortController();

  try {
    const response = await fetch(
      `/api/places?lat=${latitude}&lng=${longitude}&radius=${NEARBY_RADIUS_METERS}`,
      { signal: placeAbortController.signal }
    );
    const data = await response.json();

    if (!response.ok || !data.place) {
      statusText.textContent = "Exploring the area...";
      return;
    }

    hasActivePlace = true;
    const typeLabel = PLACE_TYPE_LABELS[data.place.primaryType] || data.place.primaryType;
    locationName.textContent = `${data.place.name} - ${typeLabel}`;

    // Never interrupt an in-flight narration, and never re-narrate a place
    // we've already told the story of — only a genuinely new place, once
    // the previous narration has finished, triggers a new one.
    if (isNarrating || data.place.placeId === currentPlaceId) {
      return;
    }

    statusText.textContent = "Generating your story...";
    generateNarration(data.place);
  } catch (error) {
    if (error.name === "AbortError") return;
    statusText.textContent = "Couldn't check nearby places.";
  }
}

async function generateNarration(place) {
  isNarrating = true;

  try {
    const response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place, userProfile: DEFAULT_USER_PROFILE }),
    });
    const data = await response.json();

    if (!response.ok || !data.narration) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    currentPlaceId = place.placeId;
    startStory(place.name, data.narration);
    speakNarration(data.narration);
  } catch (error) {
    statusText.textContent = "Couldn't generate your story.";
  } finally {
    isNarrating = false;
  }
}

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
    source.onended = () => {
      statusText.textContent = "Move to discover more...";
      pause();
    };

    currentAudioSource = source;
    source.start();
    statusText.textContent = "Playing...";
    play();
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
