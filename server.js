const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Ordered by how "interesting" a place type is; lower index wins when a
// nearby result matches more than one of these. Synagogue/church/mosque are
// ranked near the top since this app is built for touring Israel/Jerusalem.
const ALLOWED_PLACE_TYPES = [
  "synagogue",
  "church",
  "mosque",
  "tourist_attraction",
  "place_of_worship",
  "museum",
  "park",
  "natural_feature",
  "cemetery",
  "stadium",
  "neighborhood",
  "library",
  "school",
  "bakery",
  "cafe",
  "restaurant",
  "supermarket",
  "hospital",
  "premise",
  "establishment",
];

app.use(express.static(__dirname));

app.get("/api/places", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 30;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const googleResponse = await fetch(url);
    const data = await googleResponse.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(502).json({ error: `Google Places API error: ${data.status}` });
    }

    res.json({ place: pickMostInterestingPlace(data.results || []) });
  } catch (error) {
    res.status(502).json({ error: "Failed to reach Google Places API." });
  }
});

app.get("/api/geocode", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const googleResponse = await fetch(url);
    const data = await googleResponse.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(502).json({ error: `Google Geocoding API error: ${data.status}` });
    }

    res.json({ locationName: extractLocationName(data.results || []) });
  } catch (error) {
    res.status(502).json({ error: "Failed to reach Google Geocoding API." });
  }
});

function extractLocationName(results) {
  const componentByType = {};

  for (const result of results) {
    for (const component of result.address_components || []) {
      for (const type of component.types) {
        if (!componentByType[type]) {
          componentByType[type] = component.long_name;
        }
      }
    }
  }

  const neighborhood = componentByType.neighborhood || componentByType.sublocality;
  const locality = componentByType.locality || componentByType.postal_town;
  const adminArea = componentByType.administrative_area_level_1;

  if (neighborhood && locality) return `${neighborhood}, ${locality}`;
  if (locality) return locality;
  if (neighborhood) return neighborhood;
  if (adminArea) return adminArea;
  return results[0]?.formatted_address || null;
}

function pickMostInterestingPlace(results) {
  let best = null;
  let bestPriority = Infinity;

  for (const result of results) {
    const priority = ALLOWED_PLACE_TYPES.findIndex((type) => result.types?.includes(type));
    if (priority === -1) continue;
    if (priority < bestPriority) {
      bestPriority = priority;
      best = result;
    }
  }

  if (!best) return null;

  return {
    name: best.name,
    vicinity: best.vicinity || null,
    types: best.types || [],
    primaryType: ALLOWED_PLACE_TYPES[bestPriority],
    rating: best.rating ?? null,
    placeId: best.place_id,
  };
}

// Vercel imports this file and calls the exported Express app directly as
// a serverless function, so only start a listening server for local dev.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sabri server running at http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
