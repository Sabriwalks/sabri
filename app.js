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
let narrateAbortController = null;
let hasActivePlace = false;

const DEFAULT_USER_PROFILE = {
  interests: ["history", "culture", "local stories"],
  pace: "walking",
  language: "en",
};

const SIGNIFICANT_MOVE_METERS = 15;
// Temporarily widened for testing outside dense tourist areas.
const NEARBY_RADIUS_METERS = 150;

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

startBtn.addEventListener("click", startTour);
playBtn.addEventListener("click", play);
pauseBtn.addEventListener("click", pause);

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
    statusText.textContent = "Generating your story...";

    generateNarration(data.place);
  } catch (error) {
    if (error.name === "AbortError") return;
    statusText.textContent = "Couldn't check nearby places.";
  }
}

async function generateNarration(place) {
  if (narrateAbortController) {
    narrateAbortController.abort();
  }
  narrateAbortController = new AbortController();

  try {
    const response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place, userProfile: DEFAULT_USER_PROFILE }),
      signal: narrateAbortController.signal,
    });
    const data = await response.json();

    if (!response.ok || !data.narration) {
      statusText.textContent = "Couldn't generate your story.";
      return;
    }

    statusText.textContent = "Playing your story...";
    startStory(place.name, data.narration);
  } catch (error) {
    if (error.name === "AbortError") return;
    statusText.textContent = "Couldn't generate your story.";
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
