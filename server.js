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

const PRONUNCIATION_GUIDANCE =
  "When you write Hebrew or Israeli place names, spell them phonetically for " +
  "English text-to-speech so they are pronounced correctly. Use the " +
  "pronunciation guide provided.\n\n" +
  `Pronunciation guide:\n${PRONUNCIATION_GUIDE_TEXT}`;

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

// Every narration should leave the listener feeling led forward, never
// concluded — a real guide is always mid-walk, not wrapping up a lecture.
const CONTINUITY_GUIDANCE =
  "Always end every narration with a natural guiding sentence that makes the " +
  "user feel led and cared for. This should feel like a real guide walking " +
  "beside them. Examples of the feeling to convey:\n" +
  '- Directional: "Keep heading north along this street and let the ' +
  'neighborhood unfold around you"\n' +
  '- Anticipatory: "As you continue walking you will start to notice the ' +
  'architecture changing — we are approaching something special"\n' +
  '- Observational: "Before you move on, look up at the roofline above you ' +
  '— those water towers have been there since the British Mandate period"\n' +
  '- Connective: "This street connects to one of the most storied corners ' +
  'in the whole neighborhood — keep walking and I will tell you about it ' +
  'when you arrive"\n\n' +
  "Never make this ending feel like a conclusion. It should always feel like " +
  "a continuation. The tour never ends — it just moves forward.";

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
app.use(express.static(__dirname));

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
  const { tier, place, places, heading, depth, language, userProfile, sessionLog, correctionContext } = req.body || {};
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
    buildSessionLogGuidance(sessionLog),
    CONTINUITY_GUIDANCE,
    PRONUNCIATION_GUIDANCE,
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
    const userMessage = buildSpecificUserMessage(places, heading);
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

function buildSpecificUserMessage(places, heading) {
  const compassWord = headingToCompassWord(heading);
  const facingLine = compassWord
    ? `I am standing here, facing ${compassWord}.`
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
  const { question, currentPlace, neighborhood, heading, nearbyPlaces, sessionLog, userProfile, correctionContext } =
    req.body || {};

  if (!question) {
    return res.status(400).json({ error: "question is required." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  const place = currentPlace || "an unfamiliar spot";
  const area = neighborhood || "this part of town";

  const systemPromptParts = [
    `You are Sabri, a warm knowledgeable personal tour guide. The user is ` +
      `currently near ${place} in ${area}. Answer their question ` +
      `conversationally, as if talking to them face to face. Keep answers to ` +
      `2-3 paragraphs maximum - they are walking and listening, not reading. ` +
      `Stay in character as Sabri at all times.`,
    buildUserProfileGuidance(userProfile),
    buildSessionLogGuidance(sessionLog),
  ].filter(Boolean);

  const compassWord = headingToCompassWord(heading);
  if (compassWord) {
    systemPromptParts.push(`The user is currently facing ${compassWord}.`);
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
  systemPromptParts.push(PRONUNCIATION_GUIDANCE);

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

// Keeps Claude from repeating itself and lets it reference earlier stops.
function buildSessionLogGuidance(sessionLog) {
  if (!Array.isArray(sessionLog) || sessionLog.length === 0) return null;

  const entries = sessionLog
    .slice(-5)
    .map((entry, index) => {
      const lines = [`${index + 1}. ${entry.placeName || "somewhere nearby"}: ${entry.summary || "a story was shared"}`];
      if (Array.isArray(entry.questionsAsked) && entry.questionsAsked.length) {
        lines.push(`   Questions asked: ${entry.questionsAsked.join(" / ")}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  return (
    `So far on this walk you have told them about:\n${entries}\n\n` +
    `Do not repeat information already covered. Build on what came before. ` +
    `Reference earlier stops naturally when relevant - "As we saw back at..." ` +
    `or "This connects to what I mentioned earlier about...".`
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
  app.listen(PORT, () => {
    console.log(`Sabri server running at http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
