const startBtn = document.getElementById("start-btn");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const playerCard = document.getElementById("player-card");
const placeName = document.getElementById("place-name");
const placeDescription = document.getElementById("place-description");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");

let watchId = null;

startBtn.addEventListener("click", startTour);
playBtn.addEventListener("click", play);
pauseBtn.addEventListener("click", pause);

function startTour() {
  if (!("geolocation" in navigator)) {
    statusText.textContent = "Geolocation isn't supported on this device.";
    return;
  }

  statusText.textContent = "Locating you...";
  watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
  });
}

function onLocation(position) {
  const { latitude, longitude } = position.coords;
  statusText.textContent = `Location found (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Finding nearby places...`;
  // TODO: call Google Maps Places API to find nearby points of interest,
  // then call the Anthropic API to generate a narration, then call
  // startStory(title, description) once the narration is ready to play.
}

function onLocationError(error) {
  statusText.textContent = `Couldn't get your location: ${error.message}`;
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
