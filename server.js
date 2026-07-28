const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Readable } = require("stream");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 8080;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Runs at module load time (not inside the require.main guard below) since
// on Vercel this file is imported as a serverless function and app.listen()
// never executes — that startup block only ever runs for local `node
// server.js`. This is the only place a Vercel deployment log will ever show
// whether the required env vars actually made it into the function's
// environment.
console.log(
  "[env check] GOOGLE_MAPS_API_KEY:", !!GOOGLE_MAPS_API_KEY,
  "| ANTHROPIC_API_KEY:", !!ANTHROPIC_API_KEY,
  "| OPENAI_API_KEY:", !!OPENAI_API_KEY,
  "| SUPABASE_URL:", !!SUPABASE_URL,
  "| SUPABASE_ANON_KEY:", !!SUPABASE_ANON_KEY,
  "| SUPABASE_SERVICE_KEY:", !!SUPABASE_SERVICE_KEY
);
console.log(
  "[env check] all env var names present (values hidden):",
  Object.keys(process.env).sort().join(", ")
);

// Server-side client only — always uses the service role key, which
// bypasses Row Level Security, so it must never be sent to the frontend.
// The frontend gets its own client using the anon key (injected via
// renderIndexHtml below), which IS safe to expose and is constrained by the
// RLS policies in supabase/schema.sql.
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

// Default TTS identity — every /api/speak call is pinned to VOICE_CONFIG
// unless the request explicitly (and validly) asks for a different voice
// from the settings panel. `model` never varies; `voice` must be one of
// VALID_VOICES; `speed` falls back to VOICE_CONFIG.speed when omitted.
const VOICE_CONFIG = { voice: "onyx", speed: 1.0, model: "tts-1" };
const VALID_VOICES = ["onyx", "nova", "shimmer"];

const HEBREW_PRONUNCIATION_GUIDE = {
  Nachlaot: "Nakh-lah-OHT",
  Shuk: "SHOOK",
  "Machane Yehuda": "Mah-khah-NEH Yeh-HOO-dah",
  Shabbat: "Shah-BAHT",
  Kotel: "KOH-tel",
  Knesset: "KNESS-et",
  Mamilla: "Mah-MILL-ah",
  Jaffa: "YAH-fah",
  Tzahal: "Tsah-HAHL",
  Rehavia: "Reh-hah-VEE-ah",
  Talpiot: "Tahl-pee-OHT",
  Katamon: "Kah-tah-MOHN",
  Beit: "BAYT",
  "Ein Kerem": "AYN Keh-REM",
  "Yemin Moshe": "Yeh-MEEN Moh-SHEH",
};

const PRONUNCIATION_GUIDE_TEXT = Object.entries(HEBREW_PRONUNCIATION_GUIDE)
  .map(([word, phonetic]) => `${word} = "${phonetic}"`)
  .join("\n");

// Only relevant when the narration itself is in English (or another
// non-Hebrew/Arabic language) — the point is spelling Hebrew place names
// phonetically so an English-reading TTS voice pronounces them correctly.
// If the narration is already being written natively in Hebrew or Arabic,
// there's nothing to transliterate; the words are already correctly
// spelled in their own script.
function buildPronunciationGuidance(languageName) {
  if (languageName === "Hebrew" || languageName === "Arabic") return null;

  return (
    "When you write Hebrew or Israeli place names, spell them phonetically for " +
    "English text-to-speech so they are pronounced correctly. Use the " +
    "pronunciation guide provided.\n\n" +
    `Pronunciation guide:\n${PRONUNCIATION_GUIDE_TEXT}`
  );
}

// The soul of the product — Sabri's full identity.
const SABRI_SYSTEM_PROMPT =
  "You are Sabri — the greatest tour guide who has ever lived, and this is your home.\n\n" +
  "You grew up in these streets. You know every stone, every family, every story " +
  "that never made it into a guidebook. You have been giving tours of this " +
  "neighborhood your entire life — not because it is your job, but because you " +
  "are genuinely, deeply in love with this place and cannot imagine anything " +
  "better than sharing that love with someone who is willing to listen.\n\n" +
  "You are warm. You are funny when the moment calls for it. You are serious " +
  "when the history demands it. You notice things other guides walk past. You " +
  "know which stories make people stop walking because they are too captivated " +
  "to move, and you tell those stories first.\n\n" +
  "You are the friend everyone wishes they had in every city they have ever " +
  "visited — the one who grew up there, knows the real version, and treats " +
  "every visitor like they deserve the insider experience that no tourist ever " +
  "gets.\n\n" +
  "You do not give lectures. You tell stories. You do not recite facts. You " +
  "bring people to life — the rabbi who built that synagogue, the family who " +
  "lived in that courtyard for six generations, the event that changed this " +
  "street forever. You make the past feel present and the present feel " +
  "historic.\n\n" +
  "You are deeply curious about the people you are guiding. You speak to them " +
  "like an intelligent adult who has their own history, their own context, " +
  "their own reason for being here. You never talk down. You never " +
  "over-explain. You trust them to keep up and you reward that trust with " +
  "stories that go deeper than any guidebook ever would.\n\n" +
  "You are sensitive to who you are talking to. A child gets wonder and magic. " +
  "A scholar gets depth and nuance. A first-time visitor gets orientation and " +
  "excitement. A local gets the story they never knew about their own " +
  "neighborhood. You read the room even through a pair of AirPods.\n\n" +
  "You care about this place. Not just its history — its present, its people, " +
  "its future. You notice what is changing and what has stayed the same. You " +
  "have opinions. You share them when they are earned. You are not a Wikipedia " +
  "article with a voice. You are Sabri.\n\n" +
  "Your narrations are alive. They breathe. They have rhythm and pace. Some " +
  "sentences are long and immersive, pulling the listener deeper. Some are " +
  "short. Punchy. Like this. You vary your cadence the way a great " +
  "storyteller does — because you are one.\n\n" +
  "You never use stage directions. You never describe what you are doing. You " +
  "never say 'picture this' or 'imagine if' — you just make them see it. You " +
  "never break character. You are always Sabri, always here, always walking " +
  "beside them.\n\n" +
  "Above all — you make people fall in love with wherever they are. That is " +
  "your gift. That is your purpose. That is what Sabri does.";

// Every narration must end with two things: a closing thought on the
// current place, and a forward-looking transition that makes the walk feel
// continuous rather than a series of disconnected stops.
const TRANSITION_GUIDANCE =
  "End every narration with a natural transition that does one of the " +
  "following based on what is actually nearby according to the location " +
  "context you have been given:\n" +
  '- Directional: Reference a real nearby place and point toward it: "Keep ' +
  'heading north — we are approaching [nearby place name] and I have a ' +
  'story for you when we get there"\n' +
  "- Observational: Point out something specific to notice right now: " +
  '"Before you move on, look up at the roofline above you"\n' +
  "- Connective: Connect to something from earlier in the walk if relevant: " +
  '"This neighborhood actually has a deep connection to what we saw at ' +
  '[earlier place]"\n' +
  "- Anticipatory: Build excitement for what is coming without naming it: " +
  '"The next few minutes of walking are going to surprise you"\n\n' +
  "Never make the ending feel like a conclusion. The walk never ends — it " +
  "only continues.";

const TIER_GUIDANCE = {
  neighborhood:
    "For this narration, you are giving a warm welcome to a neighborhood or " +
    "area, not a single site. Paint broad strokes: who lives here, what the " +
    "character and rhythm of the streets feel like, what kind of place this " +
    "is.",
  specific:
    "For this narration, you are zoomed in on one exact place. Go deep: rich " +
    "detail, human stories, and history specific to this location. You will " +
    "be given the nearest points of interest along with their distance and " +
    "whether each is in front of, to the side of, or behind the user based " +
    "on the direction they're facing. Use this to intelligently determine " +
    "what the user is most likely looking at or experiencing right now — " +
    "prioritize places that are in front of the user over places that are " +
    "merely closest. Center your narration on that one place.",
};

const DEPTH_GUIDANCE = {
  surface: "Keep this narration brief: 1-2 paragraphs, key facts only, keep it moving.",
  standard: "Keep this narration to 3-4 paragraphs with stories and context.",
  deep: "Give this narration real depth: 5-6 paragraphs of full history, connections, and deep dives.",
};

const LANGUAGE_NAMES = {
  en: "English",
  he: "Hebrew",
  ar: "Arabic",
  es: "Spanish",
  fr: "French",
  ru: "Russian",
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

// Neighborhood-tier distance ceilings — a neighborhood name is only useful if
// it's actually nearby. 150m is the target; 300m ("about a 2 minute walk") is
// the absolute max before we'd rather show nothing than the wrong area.
const NEIGHBORHOOD_PRIMARY_MAX_METERS = 150;
const NEIGHBORHOOD_FALLBACK_MAX_METERS = 300;

// Default search radius for /api/context's 5-nearest-places lookup.
const CONTEXT_RADIUS_METERS = 50;
const CONTEXT_PLACE_LIMIT = 5;

app.use(express.json());

// A real Supabase project URL or anon/publishable key never contains a
// newline or another env var's name — if either does, something is
// misconfigured in the Vercel dashboard (e.g. a whole .env file's contents
// pasted into a single env var field) and that value must NEVER be
// forwarded to client-side code, since it could be hiding
// SUPABASE_SERVICE_KEY, which must never reach the browser.
function looksCorrupted(value) {
  return (
    typeof value === "string" &&
    (value.includes("\n") || value.includes("SERVICE_KEY") || value.includes("SUPABASE_URL="))
  );
}

// Injects the Supabase URL + anon key into a small inline <script> block so
// the frontend can create its own client without hardcoding secrets into
// app.js/index.html — the anon key is safe client-side (it's constrained by
// the RLS policies in supabase/schema.sql), unlike the service role key
// above, which never leaves this file.
function renderIndexHtml() {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  let safeUrl = SUPABASE_URL || "";
  let safeAnonKey = SUPABASE_ANON_KEY || "";
  if (looksCorrupted(safeUrl) || looksCorrupted(safeAnonKey)) {
    console.error(
      "[SECURITY] SUPABASE_URL or SUPABASE_ANON_KEY looks corrupted (contains a newline or " +
        "another env var's name) — refusing to inject it into the client-side page. Check the " +
        "Vercel dashboard: each env var must hold only its own single value, never the " +
        "contents of a .env file. SUPABASE_SERVICE_KEY must NEVER be exposed to the frontend."
    );
    safeUrl = "";
    safeAnonKey = "";
  }

  const envScript =
    "<script>\n" +
    `  window.SUPABASE_URL = ${JSON.stringify(safeUrl)};\n` +
    `  window.SUPABASE_ANON_KEY = ${JSON.stringify(safeAnonKey)};\n` +
    "</script>";
  return html.replace("<!--SUPABASE_ENV-->", envScript);
}

// /auth/callback is where Google sends the user back after sign-in. It's
// not a real static file — Supabase's client-side SDK reads the auth tokens
// out of the URL itself once this same single-page app loads, so serving
// index.html here is all the server needs to do.
app.get(["/", "/index.html", "/auth/callback"], (req, res) => {
  if (req.path === "/auth/callback") {
    console.log("auth callback route hit");
  }
  res.type("html").send(renderIndexHtml());
});

app.use(express.static(__dirname, { index: false }));

// The 4 tables this app depends on (see supabase/schema.sql).
const REQUIRED_TABLES = ["profiles", "walk_sessions", "visited_places", "user_questions"];

// supabase-js has no API for running arbitrary DDL, so this can't actually
// create missing tables — only verify whether supabase/schema.sql has
// already been applied (via the Supabase SQL editor or `supabase db push`)
// and report which tables, if any, are still missing.
async function checkDbSetup() {
  if (!supabaseAdmin) {
    return { ok: false, configured: false, missingTables: REQUIRED_TABLES };
  }

  const missingTables = [];
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabaseAdmin.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (error) missingTables.push(table);
  }

  return { ok: missingTables.length === 0, configured: true, missingTables };
}

app.post("/api/setup-db", async (req, res) => {
  const status = await checkDbSetup();
  res.json(status);
});

app.get("/api/places", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 30;
  const requestedTypes = req.query.types
    ? req.query.types.split(",").map((type) => type.trim()).filter(Boolean)
    : null;
  const strategy = req.query.strategy === "nearest" ? "nearest" : "prominence";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  try {
    if (strategy === "nearest") {
      // Google's Nearby Search caps out at 20 prominence-ranked results —
      // asking with one wide radius can push the truly closest match out
      // of the top 20 in favor of a more "prominent" but farther one. So
      // this has to be two separate staged requests, not one wide fetch
      // sorted after the fact: try the tight 150m radius first, and only
      // widen to 300m if that comes up empty.
      const primaryResults = await fetchNearbySearch(lat, lng, NEIGHBORHOOD_PRIMARY_MAX_METERS);
      let place = pickNearestPlace(primaryResults, requestedTypes, lat, lng, NEIGHBORHOOD_PRIMARY_MAX_METERS);

      if (!place) {
        const fallbackResults = await fetchNearbySearch(lat, lng, NEIGHBORHOOD_FALLBACK_MAX_METERS);
        place = pickNearestPlace(fallbackResults, requestedTypes, lat, lng, NEIGHBORHOOD_FALLBACK_MAX_METERS);
      }

      return res.json({ place });
    }

    const results = await fetchNearbySearch(lat, lng, radius);
    res.json({ place: pickMostInterestingPlace(results, requestedTypes) });
  } catch (error) {
    res.status(502).json({ error: "Failed to reach Google Places API." });
  }
});

// Returns the nearest few places (default 5) with distance, compass bearing,
// and — when a heading is supplied — whether each one is roughly in front
// of, to the side of, or behind the user. This lets Claude reason about
// what the user is actually facing rather than just what's closest.
app.get("/api/context", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || CONTEXT_RADIUS_METERS;
  const headingRaw = req.query.heading;
  const heading = headingRaw !== undefined && headingRaw !== "" && !Number.isNaN(parseFloat(headingRaw))
    ? parseFloat(headingRaw)
    : null;
  const requestedTypes = req.query.types
    ? req.query.types.split(",").map((type) => type.trim()).filter(Boolean)
    : null;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  try {
    const results = await fetchNearbySearch(lat, lng, radius);
    const places = pickNearestPlaces(results, requestedTypes, lat, lng, heading, CONTEXT_PLACE_LIMIT);
    res.json({ places, heading });
  } catch (error) {
    res.status(502).json({ error: "Failed to reach Google Places API." });
  }
});

async function fetchNearbySearch(lat, lng, radius) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const googleResponse = await fetch(url);
  const data = await googleResponse.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.results || [];
}

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

app.get("/api/photo", async (req, res) => {
  const photoReference = req.query.ref;
  const maxwidth = parseFloat(req.query.maxwidth) || 800;

  if (!photoReference) {
    return res.status(400).json({ error: "ref query param is required." });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", String(maxwidth));
  url.searchParams.set("photo_reference", photoReference);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const googleResponse = await fetch(url);

    if (!googleResponse.ok || !googleResponse.body) {
      return res.status(502).json({ error: "Failed to fetch place photo." });
    }

    res.setHeader("Content-Type", googleResponse.headers.get("content-type") || "image/jpeg");
    Readable.fromWeb(googleResponse.body).pipe(res);
  } catch (error) {
    res.status(502).json({ error: "Failed to fetch place photo." });
  }
});

app.post("/api/narrate", async (req, res) => {
  const {
    tier,
    place,
    places,
    heading,
    directionOfTravel,
    depth,
    language,
    userProfile,
    sessionLog,
    correctionContext,
    crossSessionVisitedPlaces,
    returningUserContext,
    isFirstNarrationOfSession,
  } = req.body || {};
  const resolvedTier = tier === "neighborhood" ? "neighborhood" : "specific";

  if (resolvedTier === "neighborhood") {
    if (!place || !place.name || !place.primaryType) {
      return res.status(400).json({ error: "A place with name and primaryType is required for the neighborhood tier." });
    }
  } else if (!Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: "A non-empty places array is required for the specific tier." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  const resolvedDepth = DEPTH_GUIDANCE[depth] ? depth : "standard";
  const languageName = LANGUAGE_NAMES[language];

  const systemPromptParts = [
    SABRI_SYSTEM_PROMPT,
    buildUserProfileGuidance(userProfile),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    isFirstNarrationOfSession ? buildReturningUserGuidance(returningUserContext, userProfile?.name) : null,
    buildCrossSessionVisitedGuidance(crossSessionVisitedPlaces),
    TRANSITION_GUIDANCE,
    buildPronunciationGuidance(languageName),
    TIER_GUIDANCE[resolvedTier],
    DEPTH_GUIDANCE[resolvedDepth],
  ].filter(Boolean);

  if (languageName && languageName !== "English") {
    systemPromptParts.push(
      `Narrate entirely in ${languageName}. Every word of the narration must be in ${languageName}, not English.`
    );
  }
  if (correctionContext) {
    systemPromptParts.push(
      `IMPORTANT LOCATION CORRECTION: The user has told you their actual ` +
        `location is: "${correctionContext}". Trust this over any GPS-based ` +
        `place names until they say otherwise.`
    );
  }

  const systemPrompt = systemPromptParts.join("\n\n");

  try {
    if (resolvedTier === "neighborhood") {
      const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
      const vicinity = place.vicinity || "the area";

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `I am standing near ${place.name}, a ${typeLabel} in ${vicinity}. Tell me about this place in your signature style.`,
          },
        ],
      });

      const narration = message.content.find((block) => block.type === "text")?.text || "";
      return res.json({ narration, focusedPlaceId: place.placeId || null });
    }

    // Specific tier: multi-place + heading reasoning, with structured output
    // so we know exactly which place Claude actually centered the story on.
    const userMessage = buildSpecificUserMessage(places, heading, directionOfTravel);
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              narration: { type: "string" },
              focusedPlaceId: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["narration", "focusedPlaceId"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { narration: "", focusedPlaceId: null };
    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate narration." });
  }
});

function buildSpecificUserMessage(places, heading, directionOfTravel) {
  const compassWord = headingToCompassWord(heading);
  const facingParts = [];
  if (compassWord) facingParts.push(`facing ${compassWord}`);
  if (directionOfTravel) facingParts.push(`walking ${directionOfTravel}`);
  const facingLine = facingParts.length
    ? `I am standing here, ${facingParts.join(", ")}.`
    : `I am standing here (my facing direction isn't available right now).`;

  const placeLines = places
    .map((place, index) => {
      const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
      const positionPhrase = place.relativePosition && place.relativePosition !== "unknown" ? `, ${place.relativePosition} me` : "";
      return `${index + 1}. ${place.name} (id: ${place.placeId}) — a ${typeLabel}, ${place.distanceMeters}m away${positionPhrase}`;
    })
    .join("\n");

  return (
    `${facingLine} Here are the nearest points of interest:\n${placeLines}\n\n` +
    `Based on this, determine what I am most likely looking at or experiencing ` +
    `right now, and tell me about it in your signature style. In focusedPlaceId, ` +
    `return the exact id of the place your narration centers on, copied exactly ` +
    `from the list above, or null if none of them fit.`
  );
}

app.post("/api/ask", async (req, res) => {
  const {
    question,
    currentPlace,
    neighborhood,
    heading,
    directionOfTravel,
    nearbyPlaces,
    sessionLog,
    userProfile,
    correctionContext,
    crossSessionVisitedPlaces,
    language,
  } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: "question is required." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  const place = currentPlace || "an unfamiliar spot";
  const area = neighborhood || "this part of town";
  const languageName = LANGUAGE_NAMES[language];

  const systemPromptParts = [
    `You are Sabri, a warm knowledgeable personal tour guide. The user is ` +
      `currently near ${place} in ${area}. Answer their question ` +
      `conversationally, as if talking to them face to face. Keep answers to ` +
      `2-3 paragraphs maximum - they are walking and listening, not reading. ` +
      `Stay in character as Sabri at all times.`,
    buildUserProfileGuidance(userProfile),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    buildCrossSessionVisitedGuidance(crossSessionVisitedPlaces),
  ].filter(Boolean);

  const compassWord = headingToCompassWord(heading);
  const facingParts = [];
  if (compassWord) facingParts.push(`facing ${compassWord}`);
  if (directionOfTravel) facingParts.push(`walking ${directionOfTravel}`);
  if (facingParts.length) {
    systemPromptParts.push(`The user is currently ${facingParts.join(", ")}.`);
  }

  if (Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0) {
    const lines = nearbyPlaces
      .map((place, index) => {
        const positionPhrase = place.relativePosition && place.relativePosition !== "unknown" ? `, ${place.relativePosition} them` : "";
        return `${index + 1}. ${place.name} — ${place.distanceMeters}m away${positionPhrase}`;
      })
      .join("\n");
    systemPromptParts.push(`Nearby points of interest right now:\n${lines}`);
  }

  if (correctionContext) {
    systemPromptParts.push(
      `IMPORTANT LOCATION CORRECTION: The user has told you their actual ` +
        `location is: "${correctionContext}". Trust this over GPS-based assumptions.`
    );
  }

  systemPromptParts.push(
    `If the user's question or statement indicates you have misunderstood or ` +
      `mislabeled their location (for example, they say something like "I'm not ` +
      `in the Armenian Quarter, I'm outside the walls"), extract a short ` +
      `description of their corrected location into locationCorrection. ` +
      `Otherwise set locationCorrection to null.`
  );

  if (languageName && languageName !== "English") {
    systemPromptParts.push(
      `Answer entirely in ${languageName}. Every word of your answer must be in ${languageName}, not English.`
    );
  }

  const pronunciationGuidance = buildPronunciationGuidance(languageName);
  if (pronunciationGuidance) systemPromptParts.push(pronunciationGuidance);

  const systemPrompt = systemPromptParts.join("\n\n");

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              locationCorrection: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["answer", "locationCorrection"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: question }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { answer: "", locationCorrection: null };
    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate a response." });
  }
});

// Weaves the onboarding profile into the prompt so every narration/answer
// feels made for this specific person.
function buildUserProfileGuidance(profile) {
  if (!profile || typeof profile !== "object") return null;
  const { name, reason, interests, companions, depth } = profile;
  const hasAnything = name || reason || (Array.isArray(interests) && interests.length) || companions;
  if (!hasAnything) return null;

  const lines = ["The person you are guiding right now:"];
  if (name) lines.push(`- Name: ${name}`);
  if (reason) lines.push(`- Here as: ${reason}`);
  if (Array.isArray(interests) && interests.length) lines.push(`- Interested in: ${interests.join(", ")}`);
  if (companions) lines.push(`- Exploring with: ${companions}`);
  if (depth) lines.push(`- Depth preference: ${depth}`);

  const addressee = name || "them";
  lines.push("");
  lines.push(
    `Speak directly to ${addressee}. Make every story relevant to what they ` +
      `care about. If they are here on a spiritual journey, lean into the ` +
      `spiritual significance. If they love hidden stories, give them the ones ` +
      `nobody else knows. If they are with family, make it accessible and ` +
      `wonder-filled. If they are a solo explorer, go deeper and more personal. ` +
      `This person deserves the experience that feels made exactly for them.`
  );

  return lines.join("\n");
}

// Keeps Claude from repeating itself and lets it reference earlier stops —
// each entry can be a narration or a question/answer pair (see app.js's
// sessionLog, which tags every entry with `type`).
function buildSessionLogGuidance(sessionLog, name) {
  const addressee = name || "this person";

  if (!Array.isArray(sessionLog) || sessionLog.length === 0) {
    return `Your walk with ${addressee} so far:\nThis is the very beginning of the walk.`;
  }

  const now = Date.now();
  const entries = sessionLog
    .slice(-5)
    .map((entry) => {
      const timestamp = entry.timestamp ? new Date(entry.timestamp).getTime() : NaN;
      const minutesAgo = Number.isFinite(timestamp) ? Math.max(0, Math.round((now - timestamp) / 60000)) : null;
      const timeLabel =
        minutesAgo === null ? "earlier" : minutesAgo === 0 ? "just now" : `${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`;
      const place = entry.placeName || "somewhere nearby";
      const summary = entry.summary || (entry.type === "question" ? "a question was asked" : "a story was shared");
      return `- [${timeLabel}] near ${place}: ${summary}`;
    })
    .join("\n");

  return (
    `Your walk with ${addressee} so far:\n${entries}\n\n` +
    `Use this context naturally:\n` +
    `- Never repeat information already covered\n` +
    `- Reference earlier stops when genuinely relevant: "As I mentioned back ` +
    `at the Ades Synagogue..." or "This connects to what we saw earlier..."\n` +
    `- Build a narrative arc across the walk — each stop should feel like ` +
    `the next chapter, not a fresh start\n` +
    `- If the user is returning to an area they passed earlier, acknowledge ` +
    `it: "We are looping back toward..."\n` +
    `- Track themes that are emerging in what interests this person based ` +
    `on their questions and engagement`
  );
}

// Only added to the very first narration of a session (see app.js's
// isFirstNarrationOfSession) — earlier walks/places fetched from Supabase
// for a logged-in user, so Sabri treats them as a returning guest rather
// than a first-time visitor.
function buildReturningUserGuidance(returningUserContext, name) {
  if (!returningUserContext || typeof returningUserContext !== "object") return null;
  const { recentSessions, recentPlaces } = returningUserContext;
  const hasSessions = Array.isArray(recentSessions) && recentSessions.length > 0;
  const hasPlaces = Array.isArray(recentPlaces) && recentPlaces.length > 0;
  if (!hasSessions && !hasPlaces) return null;

  const addressee = name || "This person";
  const walkList = hasSessions
    ? recentSessions
        .map((session) => [session.neighborhood, session.city].filter(Boolean).join(", "))
        .filter(Boolean)
        .join("; ")
    : "no recorded neighborhoods";
  const placeList = hasPlaces
    ? recentPlaces
        .map((place) => place.place_name || place.placeName)
        .filter(Boolean)
        .join(", ")
    : "nothing yet";

  return (
    `${addressee} has used Sabri before. Their previous walks: ${walkList}. ` +
    `Places they have already heard about: ${placeList}. Build on this ` +
    `history — reference past visits naturally if relevant, never repeat ` +
    `what they already know, and treat them as someone returning to deepen ` +
    `their knowledge rather than a first-time visitor.`
  );
}

// Sent on every call (not just the first) for a logged-in user, so Claude
// never re-narrates a place from a previous session even if it somehow
// still ended up in the candidate list.
function buildCrossSessionVisitedGuidance(placeNames) {
  if (!Array.isArray(placeNames) || placeNames.length === 0) return null;
  const list = placeNames.slice(0, 5).join(", ");
  return (
    `This person has previously visited: ${list}. Do not repeat these ` +
    `places or their stories. Build on what they already know.`
  );
}

app.post("/api/speak", async (req, res) => {
  const { text, speed, voice } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
  }

  // Model never varies. Voice must be one of VALID_VOICES (the settings
  // panel's three options) or it falls back to VOICE_CONFIG.voice — never
  // an arbitrary/unvalidated value. Speed is clamped to OpenAI's valid
  // range and falls back to VOICE_CONFIG.speed when not provided.
  const resolvedVoice = VALID_VOICES.includes(voice) ? voice : VOICE_CONFIG.voice;
  const requestedSpeed = typeof speed === "number" && Number.isFinite(speed) ? speed : VOICE_CONFIG.speed;
  const resolvedSpeed = Math.min(4.0, Math.max(0.25, requestedSpeed));
  // OpenAI TTS rejects input over 4096 characters outright — deep-depth
  // narrations combined with the user profile/session log context can
  // exceed that, so clamp rather than let the whole request fail.
  const resolvedText = text.length > 4096 ? text.slice(0, 4096) : text;

  try {
    const speech = await openai.audio.speech.create({
      model: VOICE_CONFIG.model,
      voice: resolvedVoice,
      input: resolvedText,
      speed: resolvedSpeed,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    Readable.fromWeb(speech.body).pipe(res);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate speech." });
  }
});

// --- Auth / Supabase-backed history endpoints ---
// All of these use supabaseAdmin (the service-role client), which bypasses
// RLS — that's fine here because these routes are the trusted server side
// of the app, not a path a browser talks to directly with its own key.

app.post("/api/auth/save-profile", async (req, res) => {
  const { userId, profile } = req.body || {};
  if (!userId || !profile) {
    return res.status(400).json({ error: "userId and profile are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      name: profile.name || null,
      reason: profile.reason || null,
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      companions: profile.companions || null,
      depth: profile.depth || null,
      home_city: profile.homeCity || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return res.status(502).json({ error: "Failed to save profile." });
  res.json({ success: true });
});

app.post("/api/auth/save-visit", async (req, res) => {
  const { userId, placeId, placeName, neighborhood, city, narrationSummary } = req.body || {};
  if (!userId || !placeId) {
    return res.status(400).json({ error: "userId and placeId are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  const { error } = await supabaseAdmin.from("visited_places").insert({
    user_id: userId,
    place_id: placeId,
    place_name: placeName || null,
    neighborhood: neighborhood || null,
    city: city || null,
    narration_summary: narrationSummary ? String(narrationSummary).slice(0, 200) : null,
  });

  if (error) return res.status(502).json({ error: "Failed to save visit." });
  res.json({ success: true });
});

app.get("/api/auth/user-history", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId query param is required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });

  try {
    const [placesResult, sessionsResult, profileResult] = await Promise.all([
      supabaseAdmin
        .from("visited_places")
        .select("*")
        .eq("user_id", userId)
        .order("visited_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("walk_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(3),
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    res.json({
      profile: profileResult.data || null,
      recentPlaces: placesResult.data || [],
      recentSessions: sessionsResult.data || [],
    });
  } catch (error) {
    res.status(502).json({ error: "Failed to load user history." });
  }
});

app.post("/api/auth/save-session", async (req, res) => {
  const { userId, neighborhood, city, placesVisited, totalNarrations, questionsAsked } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });

  const { error } = await supabaseAdmin.from("walk_sessions").insert({
    user_id: userId,
    ended_at: new Date().toISOString(),
    neighborhood: neighborhood || null,
    city: city || null,
    places_visited: Array.isArray(placesVisited) ? placesVisited : [],
    total_narrations: Number.isFinite(totalNarrations) ? totalNarrations : 0,
    questions_asked: Number.isFinite(questionsAsked) ? questionsAsked : 0,
  });

  if (error) return res.status(502).json({ error: "Failed to save session." });
  res.json({ success: true });
});

app.get("/api/auth/visited-place-ids", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId query param is required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });

  const { data, error } = await supabaseAdmin.from("visited_places").select("place_id").eq("user_id", userId);
  if (error) return res.status(502).json({ error: "Failed to load visited place ids." });

  res.json({ placeIds: [...new Set((data || []).map((row) => row.place_id))] });
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

  return toPlaceResponse(best, types[bestPriority]);
}

// Distance-first pick for the neighborhood tier: never mind how "prominent"
// a place is — the closest matching result wins, and it's rejected outright
// if even the closest one is further than a ~2 minute walk away.
function pickNearestPlace(results, allowedTypes, lat, lng, maxDistanceMeters) {
  const types = allowedTypes && allowedTypes.length ? allowedTypes : ALLOWED_PLACE_TYPES;

  const candidates = results
    .filter((result) => result.geometry?.location && result.types?.some((type) => types.includes(type)))
    .map((result) => ({
      result,
      distance: distanceMeters(lat, lng, result.geometry.location.lat, result.geometry.location.lng),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (candidates.length === 0) return null;

  const nearest = candidates[0];
  if (nearest.distance > maxDistanceMeters) return null;

  const primaryType = types.find((type) => nearest.result.types?.includes(type)) || nearest.result.types?.[0];
  return toPlaceResponse(nearest.result, primaryType);
}

// Returns up to `limit` nearest matching places, each annotated with
// distance, compass bearing, and — when heading is known — whether it's
// roughly in front of, to the side of, or behind the user.
function pickNearestPlaces(results, allowedTypes, lat, lng, heading, limit) {
  const types = allowedTypes && allowedTypes.length ? allowedTypes : ALLOWED_PLACE_TYPES;

  return results
    .filter((result) => result.geometry?.location && result.types?.some((type) => types.includes(type)))
    .map((result) => {
      const distance = distanceMeters(lat, lng, result.geometry.location.lat, result.geometry.location.lng);
      const bearing = bearingDegrees(lat, lng, result.geometry.location.lat, result.geometry.location.lng);
      const primaryType = types.find((type) => result.types?.includes(type)) || result.types?.[0];

      return {
        ...toPlaceResponse(result, primaryType),
        distanceMeters: Math.round(distance),
        bearingDegrees: Math.round(bearing),
        relativePosition: relativePositionFromHeading(heading, bearing),
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

function toPlaceResponse(result, primaryType) {
  return {
    name: result.name,
    vicinity: result.vicinity || null,
    types: result.types || [],
    primaryType,
    rating: result.rating ?? null,
    placeId: result.place_id,
    photoReference: result.photos?.[0]?.photo_reference || null,
  };
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

// Compass bearing (0-360, 0 = north) from point 1 to point 2.
function bearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function headingToCompassWord(heading) {
  if (heading === null || heading === undefined || Number.isNaN(heading)) return null;
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const index = ((Math.round(heading / 45) % 8) + 8) % 8;
  return directions[index];
}

// Within 45 degrees of the heading = in front; 45-135 = to the side;
// beyond that = behind. "unknown" when we have no heading to compare to.
function relativePositionFromHeading(heading, bearing) {
  if (heading === null || heading === undefined || Number.isNaN(heading)) return "unknown";
  let diff = Math.abs(heading - bearing) % 360;
  if (diff > 180) diff = 360 - diff;
  if (diff <= 45) return "in front of";
  if (diff <= 135) return "to the side of";
  return "behind";
}

// Vercel imports this file and calls the exported Express app directly as
// a serverless function, so only start a listening server for local dev.
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Sabri server running at http://127.0.0.1:${PORT}`);
    const status = await checkDbSetup();
    if (!status.configured) {
      console.log(
        "Supabase is not configured (missing SUPABASE_URL/SUPABASE_SERVICE_KEY) — auth/history features are disabled."
      );
    } else if (!status.ok) {
      console.log(
        `Supabase tables missing: ${status.missingTables.join(", ")}. Run supabase/schema.sql in the Supabase SQL editor to create them.`
      );
    }
  });
}

module.exports = app;
