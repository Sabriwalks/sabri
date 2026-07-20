const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Readable } = require("stream");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 8080;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const SABRI_SYSTEM_PROMPT =
  "You are Sabri, a warm, knowledgeable, and engaging personal tour guide. " +
  "You are like that one brilliant friend who knows everything about everywhere. " +
  "You tell stories, not facts. You bring places to life with history, culture, " +
  "human stories, and local flavor. You are never dry or encyclopedic. You speak " +
  "conversationally, with warmth and occasional humor. You keep each narration to " +
  "3-4 paragraphs - enough to be rich but short enough to hold attention while " +
  "walking. You always end with something that makes the listener want to look " +
  "around and notice something specific. Never include stage directions, action " +
  "descriptions, or text in asterisks like *takes a deep breath* or *pauses*. " +
  "Never describe what you are doing - just do it. You are speaking directly to " +
  "the listener, not writing a script. Write only the words that will be spoken " +
  "out loud.";

const TIER_GUIDANCE = {
  neighborhood:
    "For this narration, you are giving a warm welcome to a neighborhood or " +
    "area, not a single site. Paint broad strokes: who lives here, what the " +
    "character and rhythm of the streets feel like, what kind of place this " +
    "is. End with something like \"as you walk you might notice...\" to point " +
    "the listener toward small details worth noticing as they explore on foot.",
  specific:
    "For this narration, you are zoomed in on one exact place. Go deep: rich " +
    "detail, human stories, and history specific to this location.",
};

const PLACE_TYPE_LABELS = {
  synagogue: "synagogue",
  church: "church",
  mosque: "mosque",
  tourist_attraction: "tourist attraction",
  place_of_worship: "place of worship",
  museum: "museum",
  park: "park",
  natural_feature: "natural feature",
  cemetery: "cemetery",
  stadium: "stadium",
  neighborhood: "neighborhood",
  locality: "neighborhood",
  sublocality: "neighborhood",
  library: "library",
  school: "school",
  bakery: "bakery",
  cafe: "cafe",
  restaurant: "restaurant",
  supermarket: "supermarket",
  hospital: "hospital",
  premise: "premise",
  establishment: "establishment",
};

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

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/places", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 30;
  const requestedTypes = req.query.types
    ? req.query.types.split(",").map((type) => type.trim()).filter(Boolean)
    : null;

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

    res.json({ place: pickMostInterestingPlace(data.results || [], requestedTypes) });
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

app.post("/api/narrate", async (req, res) => {
  const { place, tier, userProfile } = req.body || {};

  if (!place || !place.name || !place.primaryType) {
    return res.status(400).json({ error: "A place with name and primaryType is required." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  // userProfile is accepted for future personalization (interests, pace,
  // language, etc.) but isn't folded into the prompt yet.
  void userProfile;

  const resolvedTier = tier === "neighborhood" ? "neighborhood" : "specific";
  const systemPrompt = `${SABRI_SYSTEM_PROMPT}\n\n${TIER_GUIDANCE[resolvedTier]}`;
  const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
  const vicinity = place.vicinity || "the area";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `I am standing near ${place.name}, a ${typeLabel} in ${vicinity}. Tell me about this place in your signature style.`,
        },
      ],
    });

    const narration = message.content.find((block) => block.type === "text")?.text || "";
    res.json({ narration });
  } catch (error) {
    res.status(502).json({ error: "Failed to generate narration." });
  }
});

app.post("/api/speak", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
  }

  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    Readable.fromWeb(speech.body).pipe(res);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate speech." });
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

function pickMostInterestingPlace(results, allowedTypes) {
  const types = allowedTypes && allowedTypes.length ? allowedTypes : ALLOWED_PLACE_TYPES;
  let best = null;
  let bestPriority = Infinity;

  for (const result of results) {
    const priority = types.findIndex((type) => result.types?.includes(type));
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
    primaryType: types[bestPriority],
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
