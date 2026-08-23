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
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
// A pre-encoded HTTP Basic Auth credential (base64 of key:secret) from the
// Inworld Portal — used directly as-is in the Authorization header, never
// re-encoded. See speakWithInworld below.
const INWORLD_API_KEY = process.env.INWORLD_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
// Budget-alert config (see /api/cron/check-budget) — all optional, with
// sane defaults/graceful no-ops so this works out of the box without
// requiring the user to set anything up first.
const MONTHLY_API_BUDGET_USD = parseFloat(process.env.MONTHLY_API_BUDGET_USD) || 100;
const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL;

// Easy kill-switch for the camera "point and learn" feature — flip to false
// if App Store review ever raises an issue with it, without needing a
// separate deploy of removed code.
const CAMERA_ENABLED = true;

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
  "| INWORLD_API_KEY:", !!INWORLD_API_KEY,
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

// --- Centralized API spend tracking (see api_usage in supabase/schema.sql) ---
//
// Approximate, illustrative per-provider rates — not pulled from a live
// pricing API. Good enough for trend/budget tracking at this stage; revisit
// if/when exact accounting actually matters. Update these if a provider's
// published pricing changes materially.
const API_PRICING = {
  anthropic: { inputPerMTok: 3.0, outputPerMTok: 15.0 }, // Claude Sonnet, per million tokens
  openaiTts: { per1kChars: 0.015 }, // tts-1
  googleMaps: { perRequest: 0.017 }, // rough blended Places/Geocoding/Photo rate
  serper: { perRequest: 0.001 },
  openWeather: { perRequest: 0 }, // free tier at this app's volume
};

// Fire-and-forget, same non-blocking pattern as the client's logEvent() —
// usage tracking must never be able to slow down or break the actual
// user-facing request it's measuring.
function logApiUsage({ provider, endpoint, units, costUsd, userId, meta }) {
  if (!supabaseAdmin) return;
  supabaseAdmin
    .from("api_usage")
    .insert({
      provider,
      endpoint: endpoint || "unknown",
      units: typeof units === "number" ? units : null,
      cost_usd: typeof costUsd === "number" ? costUsd : 0,
      user_id: userId || null,
      meta: meta || {},
    })
    .then(({ error }) => {
      if (error) console.error("[supabase] api_usage insert failed:", error.message);
    })
    .catch((error) => {
      console.error("[api_usage] logging threw:", error.message);
    });
}

// Wraps anthropic.messages.create and openai.audio.speech.create ONCE here
// — every existing call site elsewhere in this file (narrate, ask,
// plan-tour, plan-tour-chat, get-persona, get-place-facts, infer-interests,
// identify, speak) is automatically tracked without scattering a logging
// call into each one. Call sites optionally pass a 3rd argument —
// { endpoint, userId } — purely for attribution; it's never sent to the
// real API, unlike the SDK's own 2nd `options` argument (request signal,
// headers, etc.), which passes through untouched.
// CRITICAL FIX (found during this session's self-review, not introduced
// today): this wrapper used to be `async function` that awaited the raw
// call and returned the resolved Message — which silently broke every
// STREAMED call in production since the day this shipped.
// anthropic.messages.create() doesn't return a plain Promise, it returns
// an APIPromise with extra chainable methods (.withResponse(), etc.), and
// the SDK's own .stream() implementation internally calls exactly
// `messages.create({...}).withResponse()` — awaiting and returning a plain
// resolved value throws that away, causing every /api/narrate and
// /api/ask call to fail with "messages.create(...).withResponse is not a
// function". Fixed by NOT awaiting here at all: call the raw method, get
// back the real APIPromise, attach tracking as a non-blocking .then() side
// effect, and return the original APIPromise completely unchanged so
// .stream()'s internal chaining keeps working. This function must stay a
// plain (non-async) function — marking it `async` would itself re-wrap the
// return value in a new plain Promise and silently reintroduce this exact
// bug again.
const rawAnthropicCreate = anthropic.messages.create.bind(anthropic.messages);
anthropic.messages.create = function trackedAnthropicCreate(params, options, usageMeta) {
  const result = rawAnthropicCreate(params, options);
  result
    .then((message) => {
      const inputTokens = message?.usage?.input_tokens || 0;
      const outputTokens = message?.usage?.output_tokens || 0;
      const costUsd =
        (inputTokens / 1e6) * API_PRICING.anthropic.inputPerMTok + (outputTokens / 1e6) * API_PRICING.anthropic.outputPerMTok;
      logApiUsage({
        provider: "anthropic",
        endpoint: usageMeta?.endpoint,
        units: inputTokens + outputTokens,
        costUsd,
        userId: usageMeta?.userId,
        meta: { inputTokens, outputTokens, model: params.model },
      });
    })
    .catch(() => {}); // a tracking-side failure must never surface as an unhandled rejection
  return result;
};

const rawOpenaiSpeechCreate = openai.audio.speech.create.bind(openai.audio.speech);
openai.audio.speech.create = async function trackedOpenaiSpeechCreate(params, options, usageMeta) {
  const result = await rawOpenaiSpeechCreate(params, options);
  const charCount = typeof params.input === "string" ? params.input.length : 0;
  const costUsd = (charCount / 1000) * API_PRICING.openaiTts.per1kChars;
  logApiUsage({
    provider: "openai_tts",
    endpoint: usageMeta?.endpoint,
    units: charCount,
    costUsd,
    userId: usageMeta?.userId,
    meta: { voice: params.voice, model: params.model },
  });
  return result;
};

// For the raw-fetch-based providers (no SDK client to wrap once) — Google
// Maps/Places, Serper, OpenWeatherMap. Thin wrapper around fetch() itself,
// called explicitly at each of those call sites (see fetchNearbySearch,
// /api/geocode, /api/photo, /api/search, fetchCurrentEventsContext,
// fetchHistoricalFactsSearch, fetchWeather) rather than monkey-patched,
// since there's no single shared client object for these the way there is
// for anthropic/openai.
async function trackedFetch(url, options, { provider, endpoint, userId } = {}) {
  const response = await fetch(url, options);
  const pricing = API_PRICING[provider];
  const costUsd = pricing ? pricing.perRequest : 0;
  logApiUsage({ provider: provider || "unknown", endpoint, units: 1, costUsd, userId, meta: {} });
  return response;
}

// --- TTS provider switch ---
// Single config point deciding which provider /api/speak actually calls —
// see speakWithOpenAI/speakWithInworld below, and TTS_PROVIDER's own
// comment for why Inworld is now the default. Flipping this back to
// "openai" (here, or via the env var) is the entire rollback path if
// Inworld has any real-world issues — the OpenAI code path below is
// untouched, not just left in place.
const TTS_PROVIDER = process.env.TTS_PROVIDER || "inworld";

// --- 3-pillar conversational guide system: proactive depth, relationship
// continuity, needs-aware routing ---
// All three default OFF. Each pillar's new code is called ALONGSIDE the
// existing onLocation -> checkForNarration -> narrateAndSpeak chain (see
// app.js), never inserted into those functions' internals — with all three
// flags off, the golden path is structurally unchanged. Permanent flags (not
// a temporary rollout switch to delete later), unlike CAMERA_ENABLED above:
// these gate genuinely optional behavior a deployment may want to tune or
// disable indefinitely, not a one-time migration.
const ENABLE_PROACTIVE_DEPTH = process.env.ENABLE_PROACTIVE_DEPTH === "true";
const ENABLE_RELATIONSHIP_CONTINUITY = process.env.ENABLE_RELATIONSHIP_CONTINUITY === "true";
const ENABLE_NEEDS_ROUTING = process.env.ENABLE_NEEDS_ROUTING === "true";

// Pillar 1 (proactive depth) tunables. app.js has no process.env access (it's
// browser code) — these are read here with defaults and injected into the
// page alongside the flags above (see renderIndexHtml), the same mechanism
// TTS_PROVIDER already uses to reach the client.
const DWELL_THRESHOLD_MINUTES = parseFloat(process.env.DWELL_THRESHOLD_MINUTES) || 2.5;
const PROACTIVE_CALLBACKS_PER_WALK = parseInt(process.env.PROACTIVE_CALLBACKS_PER_WALK, 10) || 2;
const PROACTIVE_INTERJECTIONS_PER_HOUR = parseInt(process.env.PROACTIVE_INTERJECTIONS_PER_HOUR, 10) || 3;
// How long after the user asks a question to suppress proactive
// interjections — avoids talking over/immediately after active Q&A.
const PROACTIVE_SUPPRESS_AFTER_QUESTION_MINUTES = parseFloat(process.env.PROACTIVE_SUPPRESS_AFTER_QUESTION_MINUTES) || 5;

// Pillar 3 (needs-aware routing) tunables.
const NEEDS_MEAL_TRIGGER_MINUTES = parseFloat(process.env.NEEDS_MEAL_TRIGGER_MINUTES) || 30;
const NEEDS_WEATHER_TEMP_THRESHOLD_C = parseFloat(process.env.NEEDS_WEATHER_TEMP_THRESHOLD_C) || 32;
const NEEDS_WEATHER_RAIN_PROB_THRESHOLD = parseFloat(process.env.NEEDS_WEATHER_RAIN_PROB_THRESHOLD) || 0.5;
const NEEDS_SUGGESTION_COOLDOWN_MINUTES = parseFloat(process.env.NEEDS_SUGGESTION_COOLDOWN_MINUTES) || 20;

// Default TTS identity — every /api/speak call is pinned to VOICE_CONFIG
// unless the request explicitly (and validly) asks for a different voice
// from the settings panel. `model` never varies; `voice` must be one of
// VALID_VOICES; `speed` falls back to VOICE_CONFIG.speed when omitted.
const VOICE_CONFIG = { voice: "onyx", speed: 1.0, model: "tts-1" };
const VALID_VOICES = ["onyx", "nova", "shimmer", "echo"];

// Per-language voice override — some voices simply handle non-English
// phonemes better than others. English has no entry here, so it always
// falls back to the user's own Settings preference (see resolveSpeakVoice).
const LANGUAGE_VOICE_MAP = {
  he: "shimmer",
  ar: "shimmer",
  es: "nova",
  fr: "nova",
  ru: "echo",
};

// Language correctness wins over the user's stored voice preference for
// non-English tours (an "Onyx" preference doesn't matter if Onyx mangles
// Hebrew) — English is the only language where the user's own choice applies.
// Only ever called from speakWithOpenAI — Inworld has its own resolver
// below, since its voice IDs share nothing with OpenAI's.
function resolveSpeakVoice(language, preferredVoice) {
  const languageVoice = LANGUAGE_VOICE_MAP[language];
  if (languageVoice) return languageVoice;
  return VALID_VOICES.includes(preferredVoice) ? preferredVoice : VOICE_CONFIG.voice;
}

// Real-world testing: the first narration greeted "Miriam" by name in a
// clearly male-sounding voice — the default voice was never tied to
// anything, gendered or otherwise. Rather than adding a voice-gender
// question at onboarding, the generated persona's NAME is matched to
// whichever voice is actually the default for the tour's language, so the
// first impression is at least internally consistent. The user can still
// override the voice entirely in Settings afterward — this only fixes the
// untouched default.
const VOICE_GENDER = { onyx: "male", echo: "male", nova: "female", shimmer: "female" };

// Inworld's voice catalog uses completely different voice IDs than
// OpenAI's — confirmed directly against Inworld's real /tts/v1/voices
// endpoint, not guessed. Hebrew and Arabic each only have 2 voices total on
// Inworld (one male, one female), so these aren't arbitrary picks. Unlike
// LANGUAGE_VOICE_MAP, English gets an explicit entry here too — there's no
// Inworld equivalent of VOICE_CONFIG.voice to fall back to, and the
// Settings panel's voice picker (Onyx/Nova/Shimmer/Echo) has no meaning
// for Inworld voice IDs, so every language uses this map's default
// unconditionally while Inworld is active — no per-user override, unlike
// the OpenAI path where English respects the user's Settings choice. See
// speakWithInworld below.
const INWORLD_LANGUAGE_VOICE_MAP = {
  en: "Graham", // "Profound, authoritative British male voice, perfect for historical documentaries... educational content"
  he: "Yael", // the only female Hebrew voice Inworld offers
  ar: "Nour", // the only female Arabic voice Inworld offers
  es: "Marta", // Castilian Spanish female, "ideal for education, narration, and business"
  fr: "Hélène", // the only female-coded voice among Inworld's 4 French options
  ru: "Nikolai", // "Deep, resonant male voice... clear, theatrical, and narrative quality"
};
const INWORLD_VOICE_GENDER = { Graham: "male", Yael: "female", Nour: "female", Marta: "female", Hélène: "female", Nikolai: "male" };

function resolveInworldVoice(language) {
  return INWORLD_LANGUAGE_VOICE_MAP[language] || INWORLD_LANGUAGE_VOICE_MAP.en;
}

// Provider-aware — used by persona generation (see /api/get-persona) to
// match a newly generated name's gender to whichever voice the user will
// ACTUALLY hear, not hardcoded to OpenAI's map regardless of TTS_PROVIDER.
function resolveDefaultVoiceForLanguage(language) {
  if (TTS_PROVIDER === "inworld") return resolveInworldVoice(language);
  return LANGUAGE_VOICE_MAP[language] || VOICE_CONFIG.voice;
}
function resolveDefaultVoiceGender(language) {
  const voice = resolveDefaultVoiceForLanguage(language);
  return (TTS_PROVIDER === "inworld" ? INWORLD_VOICE_GENDER[voice] : VOICE_GENDER[voice]) || "female";
}

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
  "bring people to life — the architect who broke every rule designing that " +
  "facade, the family who ran that same bakery for six generations, the " +
  "artist who painted that mural after a night she never talks about, the " +
  "event that changed this street forever. Your stories span everything a " +
  "place actually is — food, art, architecture, politics, daily life, " +
  "faith, nature — never defaulting to any one lens just because it's " +
  "familiar to you. You make the past feel present and the present feel " +
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

// Added right after Sabri's core identity — most people using this app are
// visiting somewhere unfamiliar, and Sabri's job is bigger than storytelling:
// it's active spatial/emotional orientation for someone who doesn't know the
// streets yet.
const TOURIST_ORIENTATION_GUIDANCE =
  "TOURIST ORIENTATION MISSION:\n" +
  "Most people using Sabri are visitors to an unfamiliar place. They do not " +
  "know the street names, the local context, or how to navigate. Your job " +
  "goes beyond telling stories — you actively orient them and help them " +
  "feel confident and excited in an unfamiliar environment.\n\n" +
  "Always include:\n" +
  "- Spatial orientation: cardinal directions and approximate distances " +
  '(\'About 200 meters to your north...\', \'Just around the corner to ' +
  "your left...')\n" +
  "- Environmental context: help them understand where they are in the " +
  "city ('You are in the oldest part of the city', 'This street runs from " +
  "the old market down to the waterfront', 'You have just crossed from the " +
  "modern city into the historic quarter')\n" +
  "- Visual anchors: tell them what to look for ('Look for the blue tiled " +
  "dome rising above the roofline', 'Notice how the street suddenly " +
  "narrows — that is where the Ottoman-era boundary was')\n" +
  "- Practical awareness woven naturally into stories ('This square comes " +
  "alive in the evenings', 'The market stalls you see around you have been " +
  "here in some form since the 12th century')\n" +
  "- Emotional orientation for first-timers ('First-time visitors often " +
  "feel a little overwhelmed here — that is part of the magic', 'Take a " +
  "moment to just look around before we continue')\n\n" +
  "You are their trusted companion in an unfamiliar place. Make them feel " +
  "held, oriented, and excited. Never assume they know where anything is.";

// Real-world testing: mid-conversation, Sabri casually claimed the user was
// near the shuk when they were actually a 10-minute walk away — despite the
// correct precise location being passed in the same request. The location
// fields are present, but nothing told the model those offhand spatial
// remarks are exactly as load-bearing as the main answer. Scoped to
// /api/ask specifically (a deep Q&A conversation is where a passing
// spatial aside is most likely to slip in unchecked; the main narration
// prompt is built fresh from current location every time already).
const LOCATION_GROUNDING_GUARDRAIL =
  "LOCATION GROUNDING: The location/neighborhood/nearby-places given above " +
  "is the ONLY location information you have — never state or imply a " +
  "different location, distance, or nearby landmark relationship than what " +
  "was actually given, even in a passing remark or aside unrelated to the " +
  "main question. If you don't have a specific fact (e.g. exactly which " +
  "market or landmark is nearby), don't guess a plausible-sounding one — " +
  "either omit the spatial detail or speak about it in general terms " +
  "instead of naming a specific place you're not actually given.";

// Real-world testing: asked directly whether it was safe to visit a
// specific area, Sabri's first answer was generic reassurance ("yes") and
// only gave genuinely useful, calibrated guidance when pressed with "are
// you sure?" — a real user who trusts the first answer never gets what
// they actually needed. This applies broadly (safety, cultural sensitivity,
// dress, or any other context-dependent factor), not just to one scenario,
// and to route/place suggestions Sabri makes unprompted, not just direct
// questions.
const SAFETY_GUIDANCE =
  "SAFETY AND CULTURAL SENSITIVITY: When a question touches personal " +
  "safety, cultural sensitivity, appropriate dress, or similar " +
  "context-dependent factors — or when you are the one suggesting the " +
  "user go somewhere where these factors are genuinely relevant — give the " +
  "same real, specific, locally-informed answer on the FIRST ask that a " +
  "knowledgeable local friend would give, not a reflexively reassuring " +
  "'yes it's fine' that only becomes honest under follow-up pressure. This " +
  "does not mean being alarmist or generically cautious about everything — " +
  "most places are simply fine, and treating them as risky when they " +
  "aren't is its own failure. It means: if there is something a visitor " +
  "genuinely would not know (time-of-day considerations, an area best " +
  "visited with a specific awareness, dress that would be more " +
  "appropriate, a neighborhood dynamic worth understanding), say so plainly " +
  "and specifically as part of the answer or the suggestion itself, not as " +
  "something the user has to know to ask about and then double-check.";

// Makes the very first narration of a session feel like meeting a person,
// not opening a guidebook. See buildFirstNarrationContext() for the
// per-request firstVisitToCity/timeOfDay values this references.
const GREETING_AND_CONTEXT_RULES =
  "GREETING AND CONTEXT RULES:\n" +
  "- For the very first narration of every session, begin with a warm " +
  "personal greeting. Use the user's name. If this is their first visit to " +
  "this city or country (indicated by firstVisitToCity: true in the " +
  "context), give 2-3 sentences of big picture orientation before diving " +
  "into place-specific content. If they are a returning visitor, " +
  "acknowledge it warmly and reference what they saw before.\n" +
  "- Weather and time of day are things to weave in naturally when they " +
  "genuinely add something, not a fixed beat you hit every single session. " +
  "Vary how you handle it: sometimes a quick, casual, half-sentence " +
  "mention in passing ('nice and sunny out, good day for this'); sometimes " +
  "a bit more color if the weather is actually notable or relevant to the " +
  "story; and sometimes skip it almost entirely and just say hello. A real " +
  "person doesn't give a little weather report every time they greet a " +
  "friend - don't make it feel like a template being filled in. Repeat " +
  "users especially should never feel like they're hearing the same " +
  "structural beat every session.\n" +
  "- Never start a narration by immediately describing a place. Always " +
  "ground the user first - in the moment, in the place, in the experience. " +
  "A great tour guide says hello before they start teaching.\n" +
  "- For subsequent narrations in the same session, you can dive straight " +
  "into the story - the greeting has been done. But always maintain " +
  "warmth and conversational presence.";

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

// Distinct from TRANSITION_GUIDANCE above (which shapes how a narration
// ENDS) — this is about not opening cold into pure content every single
// time, the way a real guide walking alongside someone naturally
// acknowledges the walk itself between stops.
const CONNECTIVE_NARRATION_GUIDANCE =
  "You are a warm, present tour guide walking alongside a real person, not " +
  "a narrator reading facts into a void. Use natural transitional language " +
  "when appropriate - acknowledge movement, anticipation, and the shared " +
  "experience of walking together. Vary this so it doesn't become a " +
  "repetitive verbal tic.";

// Explicit, opinionated rewrite target: real product use found narration
// reading like written prose (essay/article phrasing) rather than something
// a person would actually say. Applied to every endpoint whose output gets
// spoken aloud via TTS — /api/narrate, /api/ask, /api/onboarding-chat,
// /api/plan-tour's openingNote, /api/plan-tour-chat.
const SPOKEN_LANGUAGE_RULES =
  "SPOKEN LANGUAGE RULES - THIS IS BEING SPOKEN ALOUD, NOT READ:\n" +
  "- Write the way a real person actually talks, not the way an article is " +
  "written. Read every sentence out loud in your head before finalizing it " +
  "- if it sounds like something from a guidebook or Wikipedia, rewrite it.\n" +
  "- Use contractions always (it's, you're, that's, there's) - written " +
  "prose avoids these, speech doesn't.\n" +
  "- Keep sentences short. Break up any sentence with more than one " +
  "comma-clause into two or three shorter sentences. Real speech doesn't " +
  "nest subordinate clauses.\n" +
  "- Avoid semicolons, em-dashes used as literary devices, and any " +
  "punctuation-driven complex sentence structure - these are " +
  "written-language tells.\n" +
  "- Avoid formal transition words like 'however', 'furthermore', " +
  "'additionally', 'moreover' - use how people actually bridge thoughts " +
  "out loud: 'but', 'so', 'and here's the thing', 'now'.\n" +
  "- Avoid overly polished, adjective-stacked descriptions ('the " +
  "resplendent, centuries-old facade') - use plainer, punchier language a " +
  "friend would use ('this facade is centuries old and it still looks " +
  "incredible').\n" +
  "- It's okay to start a sentence with 'And' or 'But' - that's how people " +
  "actually talk.\n" +
  "- Include small verbal texture real guides use: a passing 'you know', " +
  "an aside, a rhetorical question to the listener, mild humor - this " +
  "should feel like a knowledgeable friend talking, not a script being " +
  "read.\n" +
  "- Vary sentence length and rhythm - a mix of short punchy sentences and " +
  "slightly longer ones, never a uniform paragraph-like cadence.";

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
  tourist_attraction: "tourist attraction",
  museum: "museum",
  art_gallery: "art gallery",
  park: "park",
  natural_feature: "natural feature",
  neighborhood: "neighborhood",
  locality: "neighborhood",
  sublocality: "neighborhood",
  place_of_worship: "place of worship",
  synagogue: "synagogue",
  church: "church",
  mosque: "mosque",
  hindu_temple: "temple",
  city_hall: "city hall",
  university: "university",
  library: "library",
  performing_arts_theater: "theater",
  movie_theater: "cinema",
  cemetery: "cemetery",
  stadium: "stadium",
  bakery: "bakery",
  cafe: "cafe",
  restaurant: "restaurant",
  bar: "bar",
  night_club: "nightclub",
  school: "school",
  supermarket: "supermarket",
  hospital: "hospital",
  premise: "premise",
  establishment: "establishment",
};

// Ordered by how "interesting" a place type is; lower index wins when a
// nearby result matches more than one of these. Deliberately led with
// broad, universally tourist-relevant categories (attractions, museums,
// art, nature) rather than any one specific category — real-world testing
// in Nachlaot, Jerusalem found narration/pins skewing heavily toward
// synagogues specifically, traced back to this list previously ranking
// synagogue/church/mosque ABOVE tourist_attraction and museum. Religious
// sites are still here (place_of_worship and its specific
// synagogue/church/mosque/hindu_temple variants), just grouped together at
// a middling priority alongside other specific culturally-significant
// categories, not leading the whole list.
const ALLOWED_PLACE_TYPES = [
  "tourist_attraction",
  "museum",
  "art_gallery",
  "park",
  "natural_feature",
  "neighborhood",
  "place_of_worship",
  "synagogue",
  "church",
  "mosque",
  "hindu_temple",
  "city_hall",
  "university",
  "library",
  "performing_arts_theater",
  "movie_theater",
  "cemetery",
  "stadium",
  "bakery",
  "cafe",
  "restaurant",
  "bar",
  "night_club",
  "school",
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

// Default 100kb limit is far too small for a base64-encoded camera frame
// (/api/identify) — everything else in this app sends small JSON bodies,
// so raising the ceiling here doesn't loosen anything that mattered before.
app.use(express.json({ limit: "8mb" }));
// Only used by the admin dashboard's plain HTML <form> status-toggle
// (application/x-www-form-urlencoded) — every other endpoint in this app
// is JSON.
app.use(express.urlencoded({ extended: false }));

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

  // Real bug this fixes: Settings kept showing the OpenAI voice picker
  // (Onyx/Nova/Shimmer/Echo) after the Inworld TTS switch, even though
  // Inworld ignores that preference entirely and picks its own voice per
  // language — a stale, actively misleading UI. TTS_PROVIDER and the
  // Inworld voice map are non-secret (no key material, just which
  // provider/voice names are active) — safe to inject the same way
  // SUPABASE_URL/ANON_KEY are. See applyActiveVoiceProviderUI in app.js.
  const envScript =
    "<script>\n" +
    `  window.SUPABASE_URL = ${JSON.stringify(safeUrl)};\n` +
    `  window.SUPABASE_ANON_KEY = ${JSON.stringify(safeAnonKey)};\n` +
    `  window.TTS_PROVIDER = ${JSON.stringify(TTS_PROVIDER)};\n` +
    `  window.INWORLD_LANGUAGE_VOICE_MAP = ${JSON.stringify(INWORLD_LANGUAGE_VOICE_MAP)};\n` +
    // 3-pillar system flags + tunables — see their declarations above for
    // why these are real env vars read here rather than hardcoded, and why
    // app.js (browser code, no process.env) needs them injected this way.
    `  window.ENABLE_PROACTIVE_DEPTH = ${JSON.stringify(ENABLE_PROACTIVE_DEPTH)};\n` +
    `  window.ENABLE_RELATIONSHIP_CONTINUITY = ${JSON.stringify(ENABLE_RELATIONSHIP_CONTINUITY)};\n` +
    `  window.ENABLE_NEEDS_ROUTING = ${JSON.stringify(ENABLE_NEEDS_ROUTING)};\n` +
    `  window.DWELL_THRESHOLD_MINUTES = ${JSON.stringify(DWELL_THRESHOLD_MINUTES)};\n` +
    `  window.PROACTIVE_CALLBACKS_PER_WALK = ${JSON.stringify(PROACTIVE_CALLBACKS_PER_WALK)};\n` +
    `  window.PROACTIVE_INTERJECTIONS_PER_HOUR = ${JSON.stringify(PROACTIVE_INTERJECTIONS_PER_HOUR)};\n` +
    `  window.PROACTIVE_SUPPRESS_AFTER_QUESTION_MINUTES = ${JSON.stringify(PROACTIVE_SUPPRESS_AFTER_QUESTION_MINUTES)};\n` +
    `  window.NEEDS_MEAL_TRIGGER_MINUTES = ${JSON.stringify(NEEDS_MEAL_TRIGGER_MINUTES)};\n` +
    `  window.NEEDS_WEATHER_TEMP_THRESHOLD_C = ${JSON.stringify(NEEDS_WEATHER_TEMP_THRESHOLD_C)};\n` +
    `  window.NEEDS_WEATHER_RAIN_PROB_THRESHOLD = ${JSON.stringify(NEEDS_WEATHER_RAIN_PROB_THRESHOLD)};\n` +
    `  window.NEEDS_SUGGESTION_COOLDOWN_MINUTES = ${JSON.stringify(NEEDS_SUGGESTION_COOLDOWN_MINUTES)};\n` +
    "</script>";

  // Unlike the Places/Geocoding/Photo proxies elsewhere in this file, the
  // Maps JavaScript API fundamentally requires its key in client-side script
  // src (the browser loads map tiles directly from Google) — this is
  // standard practice, not a leak, as long as the key is restricted to
  // this site's HTTP referrers in the Google Cloud Console.
  // libraries=places powers the tour planner's start/end location
  // autocomplete inputs (google.maps.places.Autocomplete — see app.js).
  const mapsScript = GOOGLE_MAPS_API_KEY
    ? `<script src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&loading=async&libraries=places" async defer></script>`
    : "";

  return html
    .replace("<!--SUPABASE_ENV-->", envScript)
    .replace("<!--GOOGLE_MAPS_SCRIPT-->", mapsScript);
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

// No cookie-parser dependency — just enough manual parsing to read the
// admin session cookie back. res.cookie() for SETTING cookies is native to
// Express and needs no middleware.
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) return acc;
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

const ADMIN_SESSION_COOKIE = "sabri_admin_session";
const ADMIN_SESSION_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function renderAdminShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sabri Admin</title>
<style>
  body { background: #0F1B2D; color: #D4A853; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #B8A898; font-size: 12px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .card { background: #1A2B3D; border-radius: 12px; padding: 16px; }
  .card .label { font-size: 11px; color: #B8A898; text-transform: uppercase; letter-spacing: 0.05em; }
  .card .value { font-family: "SF Mono", Consolas, monospace; font-size: 26px; color: #FAF7F2; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(212,168,83,0.15); font-family: "SF Mono", Consolas, monospace; }
  th { color: #B8A898; font-weight: 600; text-transform: uppercase; font-size: 10px; }
  td { color: #FAF7F2; }
  form input, form select { background: #1A2B3D; border: 1px solid #D4A853; border-radius: 8px; padding: 10px 14px; color: #FAF7F2; font-size: 14px; }
  form button { background: #D4A853; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 700; margin-left: 8px; cursor: pointer; }
  td form { margin: 0; }
  td form select { padding: 4px 6px; font-size: 12px; }
  td form button { padding: 4px 10px; font-size: 12px; margin-left: 0; }
  .note { font-size: 11px; color: #B8A898; margin-top: 8px; }
  a { color: #D4A853; }
</style>
</head>
${bodyHtml}
</html>`;
}

function renderAdminLogin(error) {
  return renderAdminShell(`
<body>
  <h1>Sabri Admin</h1>
  ${error ? `<p class="sub" style="color:#C4622D;">${escapeHtml(error)}</p>` : ""}
  <form method="GET" action="/admin">
    <input type="password" name="password" placeholder="Password" autofocus />
    <button type="submit">Enter</button>
  </form>
</body>`);
}

async function renderAdminDashboard() {
  const [
    profilesCount,
    totalWalksCount,
    recentSessionsResult,
    allSessionsForStatsResult,
    feedbackResult,
    apiUsageDailyResult,
    canonicalNarrationsResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("walk_sessions").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("walk_sessions")
      .select("city, neighborhood, total_narrations, questions_asked, started_at")
      .order("started_at", { ascending: false })
      .limit(10),
    // supabase-js has no SUM/COUNT DISTINCT aggregate helpers without a raw
    // SQL RPC, so pull a bounded set of rows and aggregate in memory — fine
    // for an internal dashboard, not meant to scale past a few thousand rows.
    supabaseAdmin
      .from("walk_sessions")
      .select("user_id, city, total_narrations, started_at")
      .order("started_at", { ascending: false })
      .limit(2000),
    // No pagination — beta-week volume is expected to stay well under 100.
    supabaseAdmin.from("feedback_reports").select("*").order("created_at", { ascending: false }).limit(100),
    // api_usage_daily (see supabase/schema.sql) — last 14 days is plenty for
    // an at-a-glance trend; real per-request tracking, not the rough
    // per-narration estimate the "Est. cost (recent)" card above still uses
    // (that one covers usage from before this tracking existed).
    supabaseAdmin.from("api_usage_daily").select("*").order("day", { ascending: false }).limit(14 * 6),
    // Newest first so freshly-promoted places needing review surface at the
    // top, not buried under old approved/rejected history.
    supabaseAdmin.from("canonical_narrations").select("*").order("generated_at", { ascending: false }).limit(50),
  ]);

  const allSessions = allSessionsForStatsResult.data || [];
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeUsersToday = new Set(
    allSessions.filter((s) => new Date(s.started_at).getTime() >= oneDayAgo).map((s) => s.user_id)
  ).size;
  const totalNarrations = allSessions.reduce((sum, s) => sum + (s.total_narrations || 0), 0);

  const cityCounts = new Map();
  for (const s of allSessions) {
    if (!s.city) continue;
    cityCounts.set(s.city, (cityCounts.get(s.city) || 0) + 1);
  }
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const claudeCost = totalNarrations * 0.003;
  const ttsCost = totalNarrations * 0.01;
  const placesCost = totalNarrations * 0.002;
  const totalCost = claudeCost + ttsCost + placesCost;

  const recentRows = (recentSessionsResult.data || [])
    .map(
      (s) => `<tr>
        <td>${escapeHtml(s.city || "—")}</td>
        <td>${escapeHtml(s.neighborhood || "—")}</td>
        <td>${s.total_narrations ?? 0}</td>
        <td>${s.questions_asked ?? 0}</td>
        <td>${escapeHtml(new Date(s.started_at).toLocaleString())}</td>
      </tr>`
    )
    .join("");

  const cityRows = topCities
    .map(([city, count]) => `<tr><td>${escapeHtml(city)}</td><td>${count}</td></tr>`)
    .join("");

  // Real per-provider spend from api_usage_daily (see supabase/schema.sql)
  // — month-to-date total plus a per-provider breakdown over the loaded
  // window, both computed here since the view itself is already grouped by
  // day+provider, not further rolled up.
  const apiUsageDaily = apiUsageDailyResult.data || [];
  const now = new Date();
  const monthStartStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const monthToDateUsd = apiUsageDaily
    .filter((row) => row.day && row.day.slice(0, 10) >= monthStartStr)
    .reduce((sum, row) => sum + (row.total_cost_usd || 0), 0);
  const providerTotals = new Map();
  for (const row of apiUsageDaily) {
    providerTotals.set(row.provider, (providerTotals.get(row.provider) || 0) + (row.total_cost_usd || 0));
  }
  const providerRows = [...providerTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([provider, cost]) => `<tr><td>${escapeHtml(provider)}</td><td>$${cost.toFixed(2)}</td></tr>`)
    .join("");

  // The feedback-screenshots bucket is private (see supabase/schema.sql) —
  // a stored screenshot_url is a Storage PATH, not a usable URL on its own,
  // so each one needs a fresh signed URL to actually be viewable here.
  // 1 hour is comfortably longer than a single admin review session; these
  // regenerate on every dashboard load anyway (which itself happens at
  // least every 60s via the auto-refresh).
  const feedbackReports = feedbackResult.data || [];
  const screenshotPaths = feedbackReports.filter((r) => r.screenshot_url).map((r) => r.screenshot_url);
  const signedUrlByPath = new Map();
  if (screenshotPaths.length > 0) {
    try {
      const { data: signedUrlsData } = await supabaseAdmin.storage
        .from("feedback-screenshots")
        .createSignedUrls(screenshotPaths, 3600);
      for (const entry of signedUrlsData || []) {
        if (entry.path && entry.signedUrl) signedUrlByPath.set(entry.path, entry.signedUrl);
      }
    } catch (error) {
      console.log("[debug] admin dashboard: failed to sign feedback screenshot URLs:", error?.message || error);
    }
  }

  const feedbackRows = feedbackReports
    .map((r) => {
      const signedUrl = r.screenshot_url ? signedUrlByPath.get(r.screenshot_url) : null;
      const screenshotCell = signedUrl
        ? `<a href="${escapeHtml(signedUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(signedUrl)}" alt="Screenshot" style="max-width:72px; max-height:72px; border-radius:6px; display:block;" /></a>`
        : "—";
      const contextEntries = Object.entries(r.app_context || {});
      const contextCell = contextEntries.length
        ? contextEntries.map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`).join("<br/>")
        : "—";
      return `<tr>
        <td style="white-space:nowrap;">${escapeHtml(new Date(r.created_at).toLocaleString())}</td>
        <td style="max-width:260px; white-space:normal;">${escapeHtml(r.message)}</td>
        <td>${screenshotCell}</td>
        <td style="max-width:200px; white-space:normal; font-size:11px;">${contextCell}</td>
        <td>
          <form method="POST" action="/admin/feedback/${escapeHtml(r.id)}/status" style="display:flex; gap:6px; align-items:center;">
            <select name="status">
              <option value="new" ${r.status === "new" ? "selected" : ""}>new</option>
              <option value="reviewed" ${r.status === "reviewed" ? "selected" : ""}>reviewed</option>
              <option value="resolved" ${r.status === "resolved" ? "selected" : ""}>resolved</option>
            </select>
            <button type="submit">Save</button>
          </form>
        </td>
      </tr>`;
    })
    .join("");

  // Popular-place narration review queue — see canonical_narrations in
  // supabase/schema.sql. Full text is collapsed by default (<details>) so
  // a table full of paragraph-length narrations stays scannable; pending
  // rows are what actually need attention, approved/rejected are just
  // recent history.
  const canonicalNarrations = canonicalNarrationsResult.data || [];
  const canonicalRows = canonicalNarrations
    .map((r) => {
      return `<tr>
        <td style="white-space:nowrap;">${escapeHtml(r.place_name)}${r.city ? `<br/><span style="color:#B8A898; font-size:11px;">${escapeHtml(r.city)}</span>` : ""}</td>
        <td style="max-width:360px; white-space:normal;">
          <details>
            <summary style="cursor:pointer; color:#D4A853;">${escapeHtml(r.narration_text.slice(0, 80))}${r.narration_text.length > 80 ? "…" : ""}</summary>
            <p style="white-space:pre-wrap; margin-top:8px;">${escapeHtml(r.narration_text)}</p>
          </details>
        </td>
        <td style="white-space:nowrap;">${escapeHtml(new Date(r.generated_at).toLocaleString())}</td>
        <td>
          <form method="POST" action="/admin/canonical-narrations/${escapeHtml(r.id)}/status" style="display:flex; gap:6px; align-items:center;">
            <select name="status">
              <option value="pending" ${r.status === "pending" ? "selected" : ""}>pending</option>
              <option value="approved" ${r.status === "approved" ? "selected" : ""}>approved</option>
              <option value="rejected" ${r.status === "rejected" ? "selected" : ""}>rejected</option>
            </select>
            <button type="submit">Save</button>
          </form>
        </td>
      </tr>`;
    })
    .join("");

  return renderAdminShell(`
<body>
  <meta http-equiv="refresh" content="60">
  <h1>Sabri Admin</h1>
  <p class="sub">Auto-refreshes every 60 seconds — last loaded ${new Date().toLocaleTimeString()}</p>

  <div class="grid">
    <div class="card"><div class="label">Registered users</div><div class="value">${profilesCount.count ?? 0}</div></div>
    <div class="card"><div class="label">Active today</div><div class="value">${activeUsersToday}</div></div>
    <div class="card"><div class="label">Total walks</div><div class="value">${totalWalksCount.count ?? 0}</div></div>
    <div class="card"><div class="label">Total narrations</div><div class="value">${totalNarrations}</div></div>
    <div class="card"><div class="label">Est. cost (recent)</div><div class="value">$${totalCost.toFixed(2)}</div></div>
  </div>

  <h1 style="font-size:15px;">Last 10 walk sessions</h1>
  <table>
    <tr><th>City</th><th>Neighborhood</th><th>Narrations</th><th>Questions</th><th>Started</th></tr>
    ${recentRows || "<tr><td colspan='5'>No sessions yet.</td></tr>"}
  </table>

  <h1 style="font-size:15px;">Top cities by walk count</h1>
  <table>
    <tr><th>City</th><th>Walks</th></tr>
    ${cityRows || "<tr><td colspan='2'>No data yet.</td></tr>"}
  </table>

  <p class="note">Estimated costs are approximations based on average usage (Claude narrations × $0.003, OpenAI TTS × $0.010, Google Places × $0.002 per narration), computed over the last ${allSessions.length} sessions.</p>

  <h1 style="font-size:15px;">API spend (real, tracked per-request)</h1>
  <div class="grid">
    <div class="card"><div class="label">Month to date</div><div class="value">$${monthToDateUsd.toFixed(2)}</div></div>
    <div class="card"><div class="label">Monthly budget</div><div class="value">$${MONTHLY_API_BUDGET_USD.toFixed(2)}</div></div>
  </div>
  <table>
    <tr><th>Provider</th><th>Cost (last ${apiUsageDaily.length ? Math.min(14, new Set(apiUsageDaily.map((r) => r.day)).size) : 0} days)</th></tr>
    ${providerRows || "<tr><td colspan='2'>No tracked API usage yet.</td></tr>"}
  </table>
  <p class="note">Real per-request tracking from api_usage (see supabase/schema.sql) — distinct from the rough estimate above, which is a fixed per-narration multiplier covering usage from before this tracking existed. A daily cron (/api/cron/check-budget) alerts if month-to-date spend exceeds or is trending to exceed the budget above.</p>

  <h1 style="font-size:15px;">Feedback reports (${feedbackReports.length} most recent)</h1>
  <table>
    <tr><th>Reported</th><th>Message</th><th>Screenshot</th><th>Context</th><th>Status</th></tr>
    ${feedbackRows || "<tr><td colspan='5'>No feedback reports yet.</td></tr>"}
  </table>

  <h1 style="font-size:15px;">Popular-place narration review queue (${canonicalNarrations.filter((r) => r.status === "pending").length} pending)</h1>
  <table>
    <tr><th>Place</th><th>Narration (click to expand)</th><th>Generated</th><th>Status</th></tr>
    ${canonicalRows || "<tr><td colspan='4'>No places have crossed the popularity threshold yet.</td></tr>"}
  </table>
  <p class="note">A place is only eligible once ${POPULARITY_THRESHOLD_USERS}+ distinct users have been narrated it within a rolling ${POPULARITY_WINDOW_DAYS} days. Only "approved" rows are ever served — nothing reaches real users automatically.</p>
</body>`);
}

app.get("/admin", async (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.type("html").send(renderAdminLogin("ADMIN_PASSWORD is not configured on the server."));
  }
  if (!supabaseAdmin) {
    return res.type("html").send(renderAdminLogin("Supabase is not configured on the server."));
  }

  const cookies = parseCookies(req);
  const providedPassword = req.query.password;
  const cookieValid = cookies[ADMIN_SESSION_COOKIE] === ADMIN_PASSWORD;
  const passwordValid = providedPassword === ADMIN_PASSWORD;

  if (!cookieValid && !passwordValid) {
    return res.type("html").send(renderAdminLogin(providedPassword ? "Incorrect password." : null));
  }

  if (passwordValid && !cookieValid) {
    res.cookie(ADMIN_SESSION_COOKIE, ADMIN_PASSWORD, {
      maxAge: ADMIN_SESSION_MS,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  try {
    const html = await renderAdminDashboard();
    res.type("html").send(html);
  } catch (error) {
    res.status(502).type("html").send(renderAdminShell(`<body><p>Failed to load dashboard data.</p></body>`));
  }
});

// Backs the status <select>/Save form in the feedback reports table above.
// Same cookie-only auth as /admin itself — no separate API key, this is
// only ever reachable from the admin dashboard's own HTML.
app.post("/admin/feedback/:id/status", async (req, res) => {
  const cookies = parseCookies(req);
  if (!ADMIN_PASSWORD || cookies[ADMIN_SESSION_COOKIE] !== ADMIN_PASSWORD) {
    return res.status(401).type("html").send(renderAdminLogin("Session expired — please log in again."));
  }
  if (!supabaseAdmin) {
    return res.status(500).type("html").send(renderAdminLogin("Supabase is not configured on the server."));
  }

  const { status } = req.body || {};
  if (!["new", "reviewed", "resolved"].includes(status)) {
    return res.status(400).send("Invalid status.");
  }

  const { error } = await supabaseAdmin.from("feedback_reports").update({ status }).eq("id", req.params.id);
  if (error) console.error("[supabase] feedback_reports status update failed:", error.message);
  res.redirect(303, "/admin");
});

// Backs the review queue's status <select>/Save form above — the one
// manual gate before a canonical narration can ever be served to a real
// user (see getApprovedCanonicalNarration). Same cookie-only auth pattern
// as every other /admin/* route.
app.post("/admin/canonical-narrations/:id/status", async (req, res) => {
  const cookies = parseCookies(req);
  if (!ADMIN_PASSWORD || cookies[ADMIN_SESSION_COOKIE] !== ADMIN_PASSWORD) {
    return res.status(401).type("html").send(renderAdminLogin("Session expired — please log in again."));
  }
  if (!supabaseAdmin) {
    return res.status(500).type("html").send(renderAdminLogin("Supabase is not configured on the server."));
  }

  const { status } = req.body || {};
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).send("Invalid status.");
  }

  const { error } = await supabaseAdmin
    .from("canonical_narrations")
    .update({ status, reviewed_at: status === "pending" ? null : new Date().toISOString() })
    .eq("id", req.params.id);
  if (error) console.error("[supabase] canonical_narrations status update failed:", error.message);
  res.redirect(303, "/admin");
});

const PRIVACY_EFFECTIVE_DATE = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

app.get("/privacy", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sabri — Privacy Policy</title>
<style>
  body { background: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 17px; margin-top: 32px; color: #0F1B2D; }
  p, li { font-size: 15px; color: #333; }
  .meta { color: #777; font-size: 13px; margin-bottom: 32px; }
  a { color: #C4622D; }
</style>
</head>
<body>
  <h1>Sabri Privacy Policy</h1>
  <p class="meta">Effective date: ${PRIVACY_EFFECTIVE_DATE}</p>

  <p>Sabri is a personal AI-powered audio tour guide. This page explains what information we collect, how we use it, and how you can control it.</p>

  <h2>What we collect</h2>
  <ul>
    <li>Your GPS location, only while the app is actively open and in use</li>
    <li>Your name and preferences from onboarding (interests, companions, language, tour depth, and your preferred guide style)</li>
    <li>Places you have visited during tours, so Sabri doesn't repeat itself</li>
    <li>Questions you ask Sabri during a tour</li>
    <li>
      Behavioral interaction data — what you tap, listen to, skip, and how you move during a tour. This includes
      things like which map pins you tap versus ignore, whether you listen to a narration in full or skip it,
      how far you walk, whether you stray from a planned route, and how you use features like the camera
      identification tool. We use this to understand, in aggregate, what actually engages you — not just what
      you told us at signup.
    </li>
  </ul>

  <h2>How we use it</h2>
  <ul>
    <li>To personalize your tour experience to your interests and preferences</li>
    <li>To remember places you've already visited so we never repeat a narration</li>
    <li>
      To infer additional interests from your behavior (separate from what you explicitly stated), which we use
      to subtly adjust — never to override — the places and stories Sabri prioritizes for you
    </li>
    <li>To improve Sabri over time and understand how the product is actually used</li>
  </ul>

  <h2>What we do not do</h2>
  <ul>
    <li>We do not sell your data</li>
    <li>We do not share your data with advertisers</li>
    <li>We do not store your precise location history beyond your current session</li>
  </ul>

  <h2>Data storage</h2>
  <p>Your data is stored with Supabase, hosted in Zurich, Switzerland — a GDPR-compliant jurisdiction.</p>

  <h2>Data retention</h2>
  <p>Your profile and visit history are stored until you delete your account.</p>

  <h2>How to delete your data</h2>
  <p>You can delete your account and all associated data at any time from Settings → Delete my account, or by contacting <a href="mailto:hello@getsabri.com">hello@getsabri.com</a>.</p>

  <h2>Your rights (GDPR)</h2>
  <p>If you are located in the EU/EEA, you have the right to access, correct, and delete your personal data at any time.</p>

  <h2>Contact</h2>
  <p>Questions about this policy? Reach us at <a href="mailto:hello@getsabri.com">hello@getsabri.com</a>.</p>

  <h2>Governing law</h2>
  <p>This policy is currently maintained independently and will be updated to reflect the governing jurisdiction upon incorporation.</p>
</body>
</html>`);
});

// Fixed, not dynamically computed like PRIVACY_EFFECTIVE_DATE above — an
// "Effective Date" on a Terms of Service should reflect when the terms
// actually took effect, not whenever the server last happened to restart.
const TERMS_EFFECTIVE_DATE = "August 10, 2026";

app.get("/terms", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sabri — Terms of Service</title>
<style>
  body { background: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 17px; margin-top: 32px; color: #0F1B2D; }
  p, li { font-size: 15px; color: #333; }
  .meta { color: #777; font-size: 13px; margin-bottom: 32px; }
  a { color: #C4622D; }
</style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="meta">Effective Date: ${TERMS_EFFECTIVE_DATE}</p>

  <p>Welcome to Sabri. These Terms of Service ("Terms") govern your access to and use of the Sabri mobile and web application (the "App" or "Service"), operated by [YOUR LEGAL ENTITY NAME — insert once incorporated] ("Sabri," "we," "us," or "our"). By creating an account or using Sabri, you agree to these Terms. If you do not agree, please do not use the Service.</p>

  <h2>1. Description of Service</h2>
  <p>Sabri is an AI-powered, location-aware audio tour guide application that provides personalized narration, guidance, and information about your surroundings based on your GPS location, stated interests, and interactions with the app. Sabri uses third-party services including Google Maps, Google Places, OpenAI, and Anthropic's Claude to generate and deliver this experience.</p>

  <h2>2. Eligibility</h2>
  <p>You must be at least 13 years old (or the minimum age of digital consent in your country) to use Sabri. By using the Service, you represent that you meet this requirement.</p>

  <h2>3. Your Account</h2>
  <ul>
    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
    <li>You are responsible for all activity that occurs under your account.</li>
    <li>You may sign in using Google Sign-In or other supported authentication methods.</li>
    <li>You may delete your account at any time via the Settings panel in the app.</li>
  </ul>

  <h2>4. Location Data and Permissions</h2>
  <p>Sabri's core functionality depends on access to your device's location services. By enabling location access, you consent to Sabri collecting and using your real-time and historical location data to provide narration, guidance, and personalized recommendations, as described in our <a href="https://getsabri.com/privacy">Privacy Policy</a>.</p>
  <p>You may disable location access at any time through your device settings, but doing so will prevent Sabri's core features from functioning.</p>

  <h2>5. User Conduct</h2>
  <p>You agree not to:</p>
  <ul>
    <li>Use Sabri for any unlawful purpose or in violation of any applicable law.</li>
    <li>Attempt to reverse-engineer, decompile, or extract the underlying source code of the App.</li>
    <li>Interfere with or disrupt the Service, its servers, or networks.</li>
    <li>Use automated systems (bots, scrapers) to access the Service without our prior written permission.</li>
    <li>Misrepresent your identity or impersonate any person or entity.</li>
    <li>Use the Service to harass, harm, or endanger yourself or others, including relying on Sabri's guidance in situations involving personal safety risk.</li>
  </ul>

  <h2>6. Safety While Using Sabri</h2>
  <p>Sabri is designed to be used while walking outdoors. You are solely responsible for your own safety, including remaining aware of traffic, terrain, weather conditions, and your surroundings while using the app. Do not rely solely on audio narration or in-app guidance in place of your own judgment, particularly when crossing streets, navigating uneven terrain, or in low-visibility conditions. Sabri is not a substitute for official safety, navigation, or emergency guidance.</p>

  <h2>7. AI-Generated Content</h2>
  <p>Narration, historical information, recommendations, and other content within Sabri are generated using artificial intelligence (including Anthropic's Claude and OpenAI's text-to-speech models). While we strive for accuracy, AI-generated content may occasionally contain errors, outdated information, or inaccuracies. Sabri's narration is intended for entertainment and general informational purposes only and should not be relied upon as a definitive historical, cultural, safety, or factual authority. Please verify any critical information independently.</p>

  <h2>8. Third-Party Services</h2>
  <p>Sabri integrates with third-party services, including but not limited to Google Maps, Google Places, Google Sign-In, OpenWeatherMap, and web search providers. Your use of these integrations is also subject to the respective third party's terms of service and privacy policy. We are not responsible for the availability, accuracy, or content of these third-party services.</p>

  <h2>9. Subscriptions and Payments</h2>
  <p>[TO BE COMPLETED once monetization/Stripe integration is live — insert pricing, billing cycle, refund policy, and cancellation terms here before launch of any paid tier.]</p>

  <h2>10. Intellectual Property</h2>
  <p>The Sabri name, logo, app design, and underlying software are the property of [YOUR LEGAL ENTITY NAME] and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.</p>

  <h2>11. User Content</h2>
  <p>If you submit questions, feedback, or other input to Sabri (including via voice), you grant us a non-exclusive, worldwide, royalty-free license to use that input to operate, improve, and personalize the Service for you and, in aggregated or anonymized form, to improve Sabri generally.</p>

  <h2>12. Disclaimer of Warranties</h2>
  <p>Sabri is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.</p>

  <h2>13. Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, [YOUR LEGAL ENTITY NAME] shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, use, or goodwill, arising out of or related to your use of Sabri, including any injury or harm sustained while using the app outdoors.</p>

  <h2>14. Termination</h2>
  <p>We reserve the right to suspend or terminate your access to Sabri at any time, with or without notice, for conduct that we believe violates these Terms or is otherwise harmful to other users, us, or third parties.</p>

  <h2>15. Changes to These Terms</h2>
  <p>We may update these Terms from time to time. If we make material changes, we will notify you through the app or via email. Continued use of Sabri after changes take effect constitutes acceptance of the revised Terms.</p>

  <h2>16. Governing Law</h2>
  <p>[TO BE COMPLETED once incorporated — typically the state/country of incorporation, e.g. "These Terms are governed by the laws of the State of Delaware, without regard to its conflict of law provisions."]</p>

  <h2>17. Contact Us</h2>
  <p>If you have questions about these Terms, please contact us at [YOUR SUPPORT EMAIL].</p>

  <p>This document is a starting template and has not been reviewed by an attorney. Before launch — particularly before accepting payments or scaling to production users — have these Terms reviewed by a qualified lawyer, especially sections 9 (Subscriptions), 13 (Limitation of Liability), and 16 (Governing Law).</p>
</body>
</html>`);
});

app.use(express.static(__dirname, { index: false }));

// The tables this app depends on (see supabase/schema.sql).
const REQUIRED_TABLES = [
  "profiles",
  "walk_sessions",
  "visited_places",
  "user_questions",
  "guide_personas",
  "interaction_events",
  "feedback_reports",
  "place_facts",
  "user_persona_introductions",
  "api_usage",
  "canonical_narrations",
];

// supabase-js has no API for running arbitrary DDL, so this can't actually
// create missing tables — only verify whether supabase/schema.sql has
// already been applied (via the Supabase SQL editor or `supabase db push`)
// and report which tables, if any, are still missing.
async function checkDbSetup() {
  if (!supabaseAdmin) {
    return { ok: false, configured: false, missingTables: REQUIRED_TABLES };
  }

  const missingTables = [];
  // "missingTables" is a misnomer carried over from before this logged
  // anything — a table showing up here can also mean it exists but the
  // configured key can't read it (wrong key, stale/rotated key, missing
  // grants), which reads identically to "doesn't exist" from a plain
  // count query. tableErrors captures the real reason for each.
  const tableErrors = {};
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabaseAdmin.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (error) {
      missingTables.push(table);
      tableErrors[table] = error.message;
      console.error(`[supabase] setup check failed for "${table}":`, error.message);
    }
  }

  return { ok: missingTables.length === 0, configured: true, missingTables, tableErrors };
}

app.post("/api/setup-db", async (req, res) => {
  const status = await checkDbSetup();
  res.json(status);
});

// Best-effort email via Resend's REST API — no-op if not configured (no
// existing email infrastructure in this app, and setting one up isn't part
// of "keep this simple"). Alerting still works without it: the console.error
// below is always written regardless, visible in Vercel's function logs,
// and get-budget-status still surfaces the same over-budget state in the
// admin dashboard. Configure RESEND_API_KEY + ADMIN_ALERT_EMAIL later to
// upgrade to real email with no code changes needed.
async function sendBudgetAlertEmail(subject, text) {
  if (!RESEND_API_KEY || !ADMIN_ALERT_EMAIL) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Sabri Budget Alerts <onboarding@resend.dev>",
        to: [ADMIN_ALERT_EMAIL],
        subject,
        text,
      }),
    });
  } catch (error) {
    console.error("[budget-alert] failed to send email:", error.message);
  }
}

// Daily budget check (see vercel.json's crons array — runs once a day).
// Deliberately simple: month-to-date total spend vs MONTHLY_API_BUDGET_USD,
// plus a basic "trending over" projection (today's daily average × 30) so
// an alert can fire before the actual threshold is crossed, not just after.
app.get("/api/cron/check-budget", async (req, res) => {
  // Vercel Cron sends this header automatically when CRON_SECRET is set in
  // the project's env vars — without it configured, this endpoint is open
  // (same as every other GET endpoint here), which is fine for now but
  // worth locking down before this matters more.
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const dayOfMonth = now.getUTCDate();

    const { data, error } = await supabaseAdmin
      .from("api_usage")
      .select("cost_usd")
      .gte("created_at", monthStart.toISOString());
    if (error) {
      console.error("[supabase] api_usage select failed (budget check):", error.message);
      return res.status(502).json({ error: "Failed to check budget." });
    }

    const monthToDateUsd = (data || []).reduce((sum, row) => sum + (row.cost_usd || 0), 0);
    const dailyAverageUsd = dayOfMonth > 0 ? monthToDateUsd / dayOfMonth : 0;
    const projectedMonthUsd = dailyAverageUsd * 30;
    const isOverBudget = monthToDateUsd >= MONTHLY_API_BUDGET_USD;
    const isTrendingOver = !isOverBudget && projectedMonthUsd >= MONTHLY_API_BUDGET_USD;

    if (isOverBudget || isTrendingOver) {
      const message = isOverBudget
        ? `Sabri API spend is OVER budget: $${monthToDateUsd.toFixed(2)} spent this month, budget is $${MONTHLY_API_BUDGET_USD.toFixed(2)}.`
        : `Sabri API spend is TRENDING over budget: $${monthToDateUsd.toFixed(2)} spent so far, projected to reach $${projectedMonthUsd.toFixed(2)} this month against a $${MONTHLY_API_BUDGET_USD.toFixed(2)} budget.`;
      console.error(`[budget-alert] ${message}`);
      await sendBudgetAlertEmail(isOverBudget ? "Sabri: API budget exceeded" : "Sabri: API spend trending over budget", message);
    }

    res.json({ monthToDateUsd, projectedMonthUsd, budgetUsd: MONTHLY_API_BUDGET_USD, isOverBudget, isTrendingOver });
  } catch (error) {
    console.error("[budget-alert] check threw:", error.message);
    res.status(502).json({ error: "Failed to check budget." });
  }
});

// Pillar 3 (ENABLE_NEEDS_ROUTING) — daily cleanup of tour_detour_cache rows
// older than ~1 day (see schema.sql for why a daily cron sweep was chosen
// over a TTL/pg_cron extension: this is the one background-job mechanism
// this codebase already has, via vercel.json's crons array, same pattern
// as check-budget just above).
app.get("/api/cron/cleanup-detour-cache", async (req, res) => {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabaseAdmin
      .from("tour_detour_cache")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) {
      console.error("[supabase] tour_detour_cache cleanup failed:", error.message);
      return res.status(502).json({ error: "Failed to clean up detour cache." });
    }
    res.json({ deleted: count || 0 });
  } catch (error) {
    console.error("[debug] cleanup-detour-cache threw:", error.message || error);
    res.status(502).json({ error: "Failed to clean up detour cache." });
  }
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

  const googleResponse = await trackedFetch(url, undefined, { provider: "googleMaps", endpoint: "places-nearby-search" });
  const data = await googleResponse.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.results || [];
}

// --- Pillar 3: needs-aware proactive routing (ENABLE_NEEDS_ROUTING) ---
const MEAL_PLACE_TYPES = ["restaurant", "cafe", "bakery", "meal_takeaway", "bar"];
const MEAL_SEARCH_RADIUS_METERS = 800; // wider than narration's radii — worth a short walk for a meal

// Ranks nearby food places by proximity + rating + price-level fit +
// dietary-restriction/preference keyword match. Uses the SAME
// fetchNearbySearch/toPlaceResponse helpers /api/places and /api/context
// already use (not a parallel Places integration), so priceLevel/rating are
// real Google data, never guessed. preferenceText (optional) is the user's
// free-text answer to the post-confirmation clarifying question — a soft
// scoring boost, not a hard filter, since it's unstructured spoken/typed
// text, not a controlled field.
app.get("/api/find-meal-options", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const dietaryRestrictions = req.query.dietary
    ? req.query.dietary.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const preferenceText = (req.query.preferenceText || "").toLowerCase();

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }
  if (!ENABLE_NEEDS_ROUTING) {
    return res.status(403).json({ error: "Needs routing is disabled on this server." });
  }
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  try {
    const results = await fetchNearbySearch(lat, lng, MEAL_SEARCH_RADIUS_METERS);
    const candidates = results
      .filter((r) => r.geometry?.location && (r.types || []).some((t) => MEAL_PLACE_TYPES.includes(t)))
      .map((r) => {
        const primaryType = MEAL_PLACE_TYPES.find((t) => (r.types || []).includes(t));
        const distance = distanceMeters(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
        return { ...toPlaceResponse(r, primaryType), distanceMeters: Math.round(distance) };
      });

    const scored = candidates.map((place) => {
      let score = 0;
      score += (1 - Math.min(place.distanceMeters, MEAL_SEARCH_RADIUS_METERS) / MEAL_SEARCH_RADIUS_METERS) * 40;
      if (typeof place.rating === "number") score += (place.rating / 5) * 30;
      if (typeof place.priceLevel === "number") {
        const wantsUpscale = /date|nice|sit.?down|upscale/.test(preferenceText);
        score += wantsUpscale ? place.priceLevel * 5 : (4 - place.priceLevel) * 5;
      }
      // Dietary fit is a heuristic (Google's Places API has no structured
      // dietary-accommodation field), so this only ever boosts a score,
      // never filters a place out — a real match could still exist even if
      // it doesn't happen to say so in its name/types.
      const haystack = `${place.name} ${(place.types || []).join(" ")}`.toLowerCase();
      dietaryRestrictions.forEach((restriction) => {
        if (haystack.includes(restriction)) score += 15;
      });
      if (preferenceText) {
        const words = preferenceText.split(/\s+/).filter((w) => w.length > 3);
        if (words.some((w) => haystack.includes(w))) score += 10;
      }
      return { ...place, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    res.json({ options: scored.slice(0, 5).map(({ _score, ...place }) => place) });
  } catch (error) {
    console.log("[debug] /api/find-meal-options failed:", error?.message || error);
    res.status(502).json({ error: "Failed to find meal options." });
  }
});

// Weather-detour candidates — shade/park for the heat trigger, a nearby
// cafe (indoor, waitable) for the rain trigger. Simpler than
// /api/find-meal-options (no dietary/price scoring needed here) — ranked
// by proximity + rating only.
const SHADE_PLACE_TYPES = ["park", "natural_feature"];
const SHELTER_PLACE_TYPES = ["cafe"];
const REFUGE_SEARCH_RADIUS_METERS = 600;

app.get("/api/find-nearby-refuge", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const kind = req.query.kind === "shelter" ? "shelter" : "shade";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }
  if (!ENABLE_NEEDS_ROUTING) {
    return res.status(403).json({ error: "Needs routing is disabled on this server." });
  }
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  try {
    const types = kind === "shelter" ? SHELTER_PLACE_TYPES : SHADE_PLACE_TYPES;
    const results = await fetchNearbySearch(lat, lng, REFUGE_SEARCH_RADIUS_METERS);
    const candidates = results
      .filter((r) => r.geometry?.location && (r.types || []).some((t) => types.includes(t)))
      .map((r) => {
        const primaryType = types.find((t) => (r.types || []).includes(t));
        const distance = distanceMeters(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
        return { ...toPlaceResponse(r, primaryType), distanceMeters: Math.round(distance) };
      })
      .sort((a, b) => {
        const scoreA = a.distanceMeters - (a.rating || 0) * 100;
        const scoreB = b.distanceMeters - (b.rating || 0) * 100;
        return scoreA - scoreB;
      });

    res.json({ options: candidates.slice(0, 5) });
  } catch (error) {
    console.log("[debug] /api/find-nearby-refuge failed:", error?.message || error);
    res.status(502).json({ error: "Failed to find nearby refuge." });
  }
});

// Generates the spoken suggestion itself — phrased as a genuine question
// the walker can say yes or no to, per spec never a statement that assumes
// consent. Reuses streamSentencesSSE, same as Pillar 1's
// /api/narrate-proactive and /api/narrate/api/ask above.
app.post("/api/needs-suggestion", async (req, res) => {
  const { category, place, weather, language, persona, userId } = req.body || {};

  if (!ENABLE_NEEDS_ROUTING) {
    return res.status(403).json({ error: "Needs routing is disabled on this server." });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }
  if (!["meal", "weather_shade", "weather_shelter"].includes(category)) {
    return res.status(400).json({ error: "category must be meal, weather_shade, or weather_shelter." });
  }

  const languageName = LANGUAGE_NAMES[language];
  const systemPromptParts = [
    `You are Sabri, a warm knowledgeable personal tour guide. You are about to offer the walker a genuine, ` +
      `entirely optional suggestion — phrase it as a real QUESTION they can say yes or no to, never a ` +
      `statement that assumes they want it or that you're already doing it. Keep it to one short sentence, ` +
      `in your own natural voice.`,
    buildPersonaGuidance(persona, false, false),
    SPOKEN_LANGUAGE_RULES,
  ].filter(Boolean);
  const languageGuidance = buildLanguageGuidance(languageName);
  if (languageGuidance) systemPromptParts.push(languageGuidance);
  const genderConsistencyGuidance = buildGenderConsistencyGuidance(languageName, language);
  if (genderConsistencyGuidance) systemPromptParts.push(genderConsistencyGuidance);

  let userMessage;
  if (category === "meal") {
    userMessage =
      `You've been walking together for a while and it's coming up on a natural time to eat. Ask, as ` +
      `forward planning tied to the actual time of day (NOT "are you hungry?" — frame it around noticing ` +
      `it's coming up on lunchtime/dinnertime), whether they'd like you to find a well-rated spot nearby` +
      `${place?.name ? ` — you're currently near ${place.name}` : ""}.`;
  } else if (category === "weather_shade") {
    userMessage =
      `It's quite hot right now${typeof weather?.temperatureC === "number" ? ` (${weather.temperatureC}°C)` : ""}. ` +
      `Ask if they'd like to route toward some shade or a nearby park to cool off for a bit.`;
  } else {
    userMessage =
      `Rain looks likely soon. Ask if they'd like to head toward some shelter nearby before it starts, ` +
      `timed ahead of the rain rather than waiting until it's already falling.`;
  }

  streamSentencesSSE(res, {
    system: systemPromptParts.join("\n\n"),
    userMessage,
    maxTokens: 128,
    usageMeta: { endpoint: "needs-suggestion", userId },
  });
});

// Same 4 labels app.js's MEAL_CLARIFY_OPTIONS pills use (kept as an
// independently-declared array on each side, matching how e.g.
// LANGUAGE_NAMES-style lists already work in this codebase — client and
// server don't share a module system, so duplication here is the existing
// convention, not a new one).
const MEAL_CLARIFY_LABELS = ["Quick bite", "Sit-down meal", "Local favorite", "Date spot"];

// Voice-first consent for Pillar 3 (ENABLE_NEEDS_ROUTING). Interprets a
// spoken transcript as either a yes/no/unclear intent (stage: "confirm")
// or a food-type preference (stage: "clarify"). No dedicated lightweight
// intent-classifier already existed in this codebase to reuse as-is, so
// this reuses the same structured-JSON-output Claude pattern
// /api/infer-interests and /api/extract-region-memory already use, rather
// than inventing a new one. "unclear" is a real, first-class outcome (not
// squeezed into yes/no) — per spec, an ambiguous answer must fall back to
// the buttons, never guess.
app.post("/api/interpret-needs-response", async (req, res) => {
  const { transcript, stage, userId } = req.body || {};

  if (!ENABLE_NEEDS_ROUTING) {
    return res.status(403).json({ error: "Needs routing is disabled on this server." });
  }
  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "transcript is required." });
  }
  if (stage !== "confirm" && stage !== "clarify") {
    return res.status(400).json({ error: 'stage must be "confirm" or "clarify".' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  try {
    if (stage === "confirm") {
      const message = await anthropic.messages.create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 64,
          system:
            "You are classifying a spoken reply to a yes/no question as exactly one of yes, no, or unclear. " +
            "Casual phrasing counts (\"yeah\", \"sure, why not\", \"nah I'm good\", \"maybe later\" -> unclear). " +
            "Return only what's asked for.",
          output_config: {
            format: {
              type: "json_schema",
              schema: {
                type: "object",
                properties: { intent: { type: "string", enum: ["yes", "no", "unclear"] } },
                required: ["intent"],
                additionalProperties: false,
              },
            },
          },
          messages: [{ role: "user", content: `The reply was: "${transcript}"` }],
        },
        undefined,
        { endpoint: "interpret-needs-response", userId }
      );
      const textBlock = message.content.find((block) => block.type === "text");
      const parsed = textBlock ? JSON.parse(textBlock.text) : { intent: "unclear" };
      return res.json({ intent: ["yes", "no", "unclear"].includes(parsed.intent) ? parsed.intent : "unclear" });
    }

    // stage === "clarify"
    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 128,
        system:
          `You are extracting a food preference from a spoken reply to "What are you in the mood for?" Map ` +
          `it onto zero or more of these labels when they clearly fit: ${MEAL_CLARIFY_LABELS.join(", ")}. Also ` +
          `return a short clean rewrite of what they said (preferenceText), suitable for searching nearby ` +
          `restaurants — e.g. "something quick and casual" or "a nice place for a date". If the reply is ` +
          `inaudible, empty, or doesn't express any food preference at all, set unclear to true.`,
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                matchedLabels: { type: "array", items: { type: "string" } },
                preferenceText: { type: "string" },
                unclear: { type: "boolean" },
              },
              required: ["matchedLabels", "preferenceText", "unclear"],
              additionalProperties: false,
            },
          },
        },
        messages: [{ role: "user", content: `The reply was: "${transcript}"` }],
      },
      undefined,
      { endpoint: "interpret-needs-response", userId }
    );
    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { matchedLabels: [], preferenceText: transcript, unclear: false };
    res.json({
      matchedLabels: Array.isArray(parsed.matchedLabels) ? parsed.matchedLabels.filter((l) => MEAL_CLARIFY_LABELS.includes(l)) : [],
      preferenceText: parsed.preferenceText || transcript,
      unclear: !!parsed.unclear,
    });
  } catch (error) {
    console.log("[debug] /api/interpret-needs-response failed:", error?.message || error);
    res.status(502).json({ error: "Failed to interpret response." });
  }
});

// --- Guided Tour detour-and-resume cache (see tour_detour_cache in
// schema.sql, and /api/cron/cleanup-detour-cache above for cleanup). Saved
// the moment a detour is confirmed, read back to reconnect to the next
// planned stop afterward — persisted (not just kept in the client's
// in-memory plannedTour state) specifically so a reload mid-detour (the
// same class of risk as the Sign-In Saga: in-flight state lost to a reload)
// doesn't strand the user's guided tour.
app.post("/api/save-tour-detour", async (req, res) => {
  const { sessionId, userId, remainingStops, detourReason } = req.body || {};
  if (!ENABLE_NEEDS_ROUTING) return res.json({ success: false });
  if (!sessionId || !Array.isArray(remainingStops)) {
    return res.status(400).json({ error: "sessionId and remainingStops are required." });
  }
  if (!supabaseAdmin) return res.json({ success: false });

  try {
    const { error } = await supabaseAdmin.from("tour_detour_cache").upsert(
      {
        session_id: sessionId,
        user_id: userId || null,
        remaining_stops: remainingStops,
        detour_reason: detourReason || null,
      },
      { onConflict: "session_id" }
    );
    if (error) {
      console.error("[supabase] tour_detour_cache upsert failed:", error.message);
      return res.json({ success: false });
    }
    res.json({ success: true });
  } catch (error) {
    console.log("[debug] /api/save-tour-detour failed:", error?.message || error);
    res.json({ success: false });
  }
});

app.get("/api/get-tour-detour", async (req, res) => {
  const { sessionId } = req.query;
  if (!ENABLE_NEEDS_ROUTING) return res.json({ remainingStops: null });
  if (!sessionId) return res.status(400).json({ error: "sessionId query param is required." });
  if (!supabaseAdmin) return res.json({ remainingStops: null });

  try {
    const { data, error } = await supabaseAdmin
      .from("tour_detour_cache")
      .select("remaining_stops, detour_reason")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) {
      console.error("[supabase] tour_detour_cache select failed:", error.message);
      return res.json({ remainingStops: null });
    }
    res.json({ remainingStops: data?.remaining_stops || null, detourReason: data?.detour_reason || null });
  } catch (error) {
    res.json({ remainingStops: null });
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
    const googleResponse = await trackedFetch(url, undefined, { provider: "googleMaps", endpoint: "geocode" });
    const data = await googleResponse.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(502).json({ error: `Google Geocoding API error: ${data.status}` });
    }

    const results = data.results || [];
    res.json({
      locationName: extractLocationName(results),
      ...extractLocationComponents(results),
    });
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
    const googleResponse = await trackedFetch(url, undefined, { provider: "googleMaps", endpoint: "photo" });

    if (!googleResponse.ok || !googleResponse.body) {
      return res.status(502).json({ error: "Failed to fetch place photo." });
    }

    res.setHeader("Content-Type", googleResponse.headers.get("content-type") || "image/jpeg");
    Readable.fromWeb(googleResponse.body).pipe(res);
  } catch (error) {
    res.status(502).json({ error: "Failed to fetch place photo." });
  }
});

// NOTE: there used to be a separate /api/interest-places endpoint here,
// with its own crude interest-label -> Google-Places-type mapping (e.g.
// "Hidden stories" -> point_of_interest) and no relevance filtering at all.
// That's exactly what let hotels and other noise through — point_of_interest
// is an extremely broad type Google attaches to nearly every commercial
// establishment, including hotels, with nothing downstream to filter it
// back out. Removed and consolidated into /api/map-pins below, whose Claude
// relevance pass already weighs the user's stated + inferred interests
// directly — a strictly better signal than a hardcoded type list. See
// loadInterestPlaces() in app.js, which now calls /api/map-pins and treats
// relevanceTier === "high" results as the interest-matched set.

// --- Guide personas ---
// 4 fixed archetypes whose personality/focus never change (worldwide) —
// only their generated_name/generated_bio/style_notes vary, per city, via
// Claude + a guide_personas cache row (see /api/get-persona below). This is
// deliberately NOT hardcoded per-city: the first user ever to request a
// given (city, archetype) pair triggers one Claude call; every user after
// that for the same city+archetype gets an instant Supabase read.
const GUIDE_ARCHETYPES = {
  historian: {
    label: "The Historian",
    description: "Architecture and history buff — loves explaining why a place looks the way it does.",
    focus: "architecture, history, why does this place look the way it does",
    tone: "precise, warm-scholarly, approachable rather than dry",
  },
  local_friend: {
    label: "The Local Friend",
    description: "Food and street life expert — shows you where locals actually go.",
    focus: "food, street life, hidden neighborhood gems",
    tone: 'casual, conspiratorial, "let me show you where locals actually go"',
  },
  storyteller: {
    label: "The Storyteller",
    description: "Folklore and legend teller — the human drama behind every place.",
    focus: "folklore, legends, human drama behind places",
    tone: "narrative pacing, builds anticipation and suspense",
  },
  wanderer: {
    label: "The Wanderer",
    description: "Nature and off-the-beaten-path explorer — always finding a new route.",
    focus: "nature, off-the-beaten-path routes, physical exploration",
    tone: "energetic, adventurous, encouraging",
  },
};
const VALID_ARCHETYPES = Object.keys(GUIDE_ARCHETYPES);

app.get("/api/guide-archetypes", (req, res) => {
  res.json({
    archetypes: Object.entries(GUIDE_ARCHETYPES).map(([id, def]) => ({
      id,
      label: def.label,
      description: def.description,
    })),
  });
});

app.post("/api/get-persona", async (req, res) => {
  const { city, country, archetype, language } = req.body || {};
  if (!city || !archetype || !VALID_ARCHETYPES.includes(archetype)) {
    return res.status(400).json({ error: "A valid city and archetype are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  const resolvedLanguage = language || "en";

  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("guide_personas")
      .select("*")
      .eq("city", city)
      .eq("archetype", archetype)
      .eq("language", resolvedLanguage)
      .maybeSingle();

    // Doesn't abort the request — worst case a cache-lookup failure means
    // regenerating (and re-paying for) a persona that already exists, not
    // data loss. Still worth knowing about if it's happening on every call.
    if (lookupError) console.error("[supabase] guide_personas select failed:", lookupError.message);

    if (existing) {
      return res.json({ persona: existing, cached: true });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    }

    const archetypeDef = GUIDE_ARCHETYPES[archetype];
    // The persona's name has to match whichever voice will actually be
    // speaking it by default — a "Miriam" narrated in a deep male voice was
    // the real bug this fixes. Not a hard rule about the CITY's own culture
    // (a male name is just as "authentically local" as a female one
    // anywhere) — purely about matching the generated name to the gender of
    // the TTS voice this language defaults to.
    const defaultVoiceGender = resolveDefaultVoiceGender(resolvedLanguage);
    const userMessage =
      `You are creating a local tour guide persona for ${city}${country ? `, ${country}` : ""}. ` +
      `This guide's core personality and focus area is: ${archetypeDef.focus}. Their tone is ${archetypeDef.tone}.\n\n` +
      `Generate:\n` +
      `1) A first name that feels authentically local/fitting to this specific city and culture — not ` +
      `necessarily a literal local name if that would feel like a stereotype, use good judgment (e.g. an ` +
      `English-speaking expat-friendly name might be more natural in some contexts). The name must read as ` +
      `${defaultVoiceGender} — this guide will be voiced by a ${defaultVoiceGender}-sounding text-to-speech ` +
      `voice by default, and the name needs to match that.\n` +
      `2) A 2-3 sentence bio establishing who they are and why they know this city\n` +
      `3) 2-3 sentences of style notes on how they specifically speak, phrases they might use, their vibe\n\n` +
      `Return as JSON: { name, bio, styleNotes }`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are creating a fictional local tour guide persona. Return only what's asked for.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              bio: { type: "string" },
              styleNotes: { type: "string" },
            },
            required: ["name", "bio", "styleNotes"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "get-persona" });

    const textBlock = message.content.find((block) => block.type === "text");
    const generated = textBlock ? JSON.parse(textBlock.text) : null;
    if (!generated) return res.status(502).json({ error: "Failed to generate a persona." });

    const row = {
      city,
      country: country || null,
      archetype,
      language: resolvedLanguage,
      generated_name: generated.name,
      generated_bio: generated.bio,
      style_notes: generated.styleNotes,
    };

    // onConflict handles the (rare but real) race of two users requesting
    // the same brand-new city+archetype+language at almost the same moment
    // — the unique constraint means the second insert becomes a no-op
    // update instead of an error, and both requests end up returning the
    // same persona rather than two different generated names.
    const { data: inserted, error } = await supabaseAdmin
      .from("guide_personas")
      .upsert(row, { onConflict: "city,archetype,language" })
      .select()
      .single();

    if (error) {
      console.error("[supabase] guide_personas upsert failed:", error.message || error);
      return res.status(502).json({ error: "Failed to save the generated persona." });
    }
    res.json({ persona: inserted, cached: false });
  } catch (error) {
    res.status(502).json({ error: "Failed to get a guide persona." });
  }
});

// Checks AND marks in one round trip — see user_persona_introductions in
// supabase/schema.sql. Not perfectly race-safe against two truly
// simultaneous requests for the same user+city+archetype (same tolerance
// as guide_personas' onConflict race above), but that's a harmless
// worst-case of one duplicate introduction, not worth the complexity of a
// stricter atomic check for how rarely this fires. Guests (no userId)
// never call this at all — see app.js, which handles that case entirely
// client-side via localStorage.
app.post("/api/check-persona-introduction", async (req, res) => {
  const { userId, city, archetype, language } = req.body || {};
  if (!userId || !city || !archetype) {
    return res.status(400).json({ error: "userId, city, and archetype are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }
  const resolvedLanguage = language || "en";

  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("user_persona_introductions")
      .select("id")
      .eq("user_id", userId)
      .eq("city", city)
      .eq("archetype", archetype)
      .eq("language", resolvedLanguage)
      .maybeSingle();
    if (lookupError) {
      console.error("[supabase] user_persona_introductions select failed:", lookupError.message);
      return res.json({ isFirstMeeting: false });
    }
    if (existing) return res.json({ isFirstMeeting: false });

    const { error: insertError } = await supabaseAdmin
      .from("user_persona_introductions")
      .insert({ user_id: userId, city, archetype, language: resolvedLanguage });
    if (insertError) {
      console.error("[supabase] user_persona_introductions insert failed:", insertError.message);
      // Fail safe toward "don't force an introduction" rather than risk
      // repeating one every narration if this table is having problems.
      return res.json({ isFirstMeeting: false });
    }

    res.json({ isFirstMeeting: true });
  } catch (error) {
    res.json({ isFirstMeeting: false });
  }
});

// A quick, targeted web search for grounding place_facts generation in
// something more reliable than Claude's raw parametric memory — the same
// underlying risk (a specific date/style stated with full confidence but
// no real source) is what produced three different construction dates in
// one real conversation. Best-effort: returns null with no API key or no
// useful result, and place-facts generation still proceeds (just leaning
// more on the "hedge if uncertain" instruction below instead).
async function fetchHistoricalFactsSearch(placeName, city, country) {
  if (!SERPER_API_KEY || !placeName) return null;
  try {
    const query = [placeName, city, country, "history built architecture"].filter(Boolean).join(" ");
    const response = await trackedFetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      },
      { provider: "serper", endpoint: "place-facts-search" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const snippets = (data.organic || [])
      .slice(0, 3)
      .map((item) => item.snippet)
      .filter(Boolean);
    return snippets.length > 0 ? snippets.join("\n") : null;
  } catch (error) {
    return null;
  }
}

// Shared factual cache for deep Q&A about one place — see place_facts in
// supabase/schema.sql for the full rationale. Called from app.js's
// ensurePlaceFacts() the moment a place is narrated (fire-and-forget, well
// before a user's first follow-up question in practice), and the result is
// passed back into every subsequent /api/ask call for that place so Claude
// grounds its answer in the same cached facts instead of regenerating
// historical claims from scratch each time.
app.post("/api/get-place-facts", async (req, res) => {
  const { placeId, placeName, city, country } = req.body || {};
  if (!placeId || !placeName) {
    return res.status(400).json({ error: "placeId and placeName are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("place_facts")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle();
    if (lookupError) console.error("[supabase] place_facts select failed:", lookupError.message);

    if (existing) {
      return res.json({
        facts: {
          constructionPeriod: existing.construction_period,
          architecturalStyle: existing.architectural_style,
          notableHistory: existing.notable_history,
        },
        cached: true,
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    }

    const searchContext = await fetchHistoricalFactsSearch(placeName, city, country);

    const userMessage =
      `Establish the core historical/architectural facts for "${placeName}"` +
      `${city ? ` in ${city}` : ""}${country ? `, ${country}` : ""}, so a tour guide can state them ` +
      `consistently across an entire conversation rather than re-deriving them each time.\n\n` +
      (searchContext
        ? `Web search results for reference (may be incomplete or off-topic — use judgment):\n${searchContext}\n\n`
        : "") +
      `Provide:\n` +
      `1) constructionPeriod — when it was built. If you are not confident of an exact ` +
      `year, use an appropriately hedged period instead of inventing false precision ` +
      `(e.g. "likely late Ottoman period, 19th century" rather than a specific year you're ` +
      `not sure of) — a consistent, honestly-hedged answer is far better than a confident ` +
      `but potentially wrong one.\n` +
      `2) architecturalStyle — the style(s), similarly hedged if uncertain.\n` +
      `3) notableHistory — 1-2 sentences of the most notable, well-established history. ` +
      `If genuinely nothing substantive is known, say so plainly rather than inventing detail.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system:
        "You are establishing factual reference material for a tour guide app. Precision and " +
        "honesty about uncertainty matter far more than sounding confident — a specific wrong " +
        "date stated confidently is a worse outcome than an honestly hedged period.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              constructionPeriod: { type: "string" },
              architecturalStyle: { type: "string" },
              notableHistory: { type: "string" },
            },
            required: ["constructionPeriod", "architecturalStyle", "notableHistory"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "get-place-facts" });

    const textBlock = message.content.find((block) => block.type === "text");
    const generated = textBlock ? JSON.parse(textBlock.text) : null;
    if (!generated) return res.status(502).json({ error: "Failed to establish place facts." });

    const row = {
      place_id: placeId,
      place_name: placeName,
      city: city || null,
      construction_period: generated.constructionPeriod,
      architectural_style: generated.architecturalStyle,
      notable_history: generated.notableHistory,
    };

    // onConflict handles two users triggering this for the same brand-new
    // place at almost the same moment — same race-safety reasoning as
    // guide_personas above.
    const { data: inserted, error } = await supabaseAdmin
      .from("place_facts")
      .upsert(row, { onConflict: "place_id" })
      .select()
      .single();

    if (error) {
      console.error("[supabase] place_facts upsert failed:", error.message || error);
      return res.status(502).json({ error: "Failed to save place facts." });
    }
    res.json({
      facts: {
        constructionPeriod: inserted.construction_period,
        architecturalStyle: inserted.architectural_style,
        notableHistory: inserted.notable_history,
      },
      cached: false,
    });
  } catch (error) {
    res.status(502).json({ error: "Failed to get place facts." });
  }
});

// --- Map pins: relevance-filtered nearby places ---
// Separate from /api/context (which stays tight-radius/heading-based on
// purpose — that's what runSpecificZoomIn uses to reason about "what's
// directly in front of the user right now" for narration, and shouldn't be
// touched). This is specifically for what shows up as a pin on the map:
// wider coverage, filtered through both a cheap Places-type exclusion list
// and a Claude relevance pass so every pin has actually earned its place.

// Categories that are almost never what a tour guide would point out,
// filtered out before anything reaches Claude — cheaper and more reliable
// than hoping the relevance prompt catches every generic business.
const EXCLUDED_PLACE_TYPES = [
  "real_estate_agency",
  "electronics_store",
  "car_repair",
  "car_dealer",
  "car_rental",
  "car_wash",
  "gas_station",
  "insurance_agency",
  "lawyer",
  "accounting",
  "bank",
  "atm",
  "finance",
  "laundry",
  "storage",
  "moving_company",
  "locksmith",
  "plumber",
  "electrician",
  "painter",
  "roofing_contractor",
  "general_contractor",
  "corporate_office",
  "warehouse",
  "travel_agency",
  "dentist",
  "doctor",
  "physiotherapist",
  "veterinary_care",
  "gym",
  "hair_care",
  "beauty_salon",
  "car_parts_store",
  "pest_control",
  // Hotels/hostels were the specific noise reported in real testing —
  // "lodging" is Google's actual Places type for these (there's no
  // separate "hotel" type in the classic Places API this app uses). A
  // genuinely notable historic hotel would need some OTHER qualifying
  // type (e.g. tourist_attraction) to survive this filter and reach
  // Claude's relevance pass — that's the intended behavior, same as every
  // other category on this list.
  "lodging",
];

// Grid/radial search pattern: a center point plus a ring of points around
// it, each with its own Nearby Search call. This exists because Google's
// Nearby Search caps out at ~20 results per call *regardless of radius* —
// one call with a huge radius still only sees the 20 closest results, which
// isn't enough coverage for "something interesting in every direction" when
// the map is zoomed out. A ring of overlapping searches gives real coverage
// instead.
const PIN_GRID_RING_BEARINGS = [0, 60, 120, 180, 240, 300];
const PIN_GRID_RING_DISTANCE_METERS = 350;
const PIN_SEARCH_RADIUS_METERS = 400;

function offsetLatLng(lat, lng, bearingDeg, distanceMeters) {
  const earthRadius = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const angularDistance = distanceMeters / earthRadius;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

// Session-length cache of relevance-scored results per rough grid cell
// (~110m at the equator) + interests/focus combination — re-panning over
// the same area shouldn't repeatedly hit Claude for the same verdict.
const MAP_PINS_CACHE_MS = 30 * 60 * 1000;
const mapPinsCache = new Map();

function mapPinsCacheKey(lat, lng, interests, specificFocus) {
  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const interestKey = [...interests].sort().join(",");
  return `${roundedLat},${roundedLng}|${interestKey}|${specificFocus || ""}`;
}

// Second-pass relevance filter: given a broader candidate pool (already
// past the type-exclusion list), asks Claude which of these a knowledgeable
// local guide would actually point out to THIS user, tagged by tier. If
// nothing here is genuinely relevant, this can and should come back empty —
// no filler pins just to have something to show.
async function scorePlaceRelevance(results, interests, specificFocus, inferredInterests) {
  if (!ANTHROPIC_API_KEY || results.length === 0) return [];

  const candidateLines = results
    .slice(0, 50)
    .map((result, index) => {
      const types = (result.types || []).slice(0, 5).join(", ");
      const reviews = result.user_ratings_total ? `${result.user_ratings_total} reviews` : "no review data";
      return `${index + 1}. placeId: ${result.place_id} | name: ${result.name} | types: ${types} | rating: ${
        result.rating ?? "n/a"
      } (${reviews})`;
    })
    .join("\n");

  const interestList = interests.length > 0 ? interests.join(", ") : "general sightseeing";
  const focusLine = specificFocus ? `Specific focus right now: ${specificFocus}.` : "";
  // Behavior-derived, secondary — a soft tie-breaker, never as strong a
  // signal as what the user actually stated.
  const inferredLine =
    Array.isArray(inferredInterests) && inferredInterests.length > 0
      ? `Their actual behavior also mildly suggests interest in: ${inferredInterests.join(
          ", "
        )} — let this nudge borderline calls, not override stated interests.`
      : "";

  const userMessage =
    `Given this user's interests (${interestList}), filter this list of nearby places to only ` +
    `those a knowledgeable local guide would actually point out to this specific user. Exclude ` +
    `generic businesses (repair shops, offices, agencies, banks, clinics, etc.) unless they have ` +
    `unusual historical/cultural significance. Also exclude short-term vacation rentals, private ` +
    `apartment listings (Airbnb-style), guesthouses, and B&Bs even if their Places type doesn't ` +
    `clearly mark them as lodging — these are accommodations, not points of interest, no matter ` +
    `how the name reads. Relevance must be driven entirely by this specific user's stated (and, ` +
    `more softly, inferred) interests above — do not treat any single category (religious sites, ` +
    `historical sites, or anything else) as inherently high relevance regardless of what this ` +
    `user actually cares about; a place is only high relevance here because it matches what THIS ` +
    `user is into. ${focusLine} ${inferredLine}\n\nPlaces:\n${candidateLines}\n\n` +
    `Return only placeIds worth showing as a map pin, each tagged with a relevance tier: high, ` +
    `medium, or low. If nothing here is genuinely worth showing, return an empty list — do not ` +
    `include filler places just to have something to show.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You are Sabri, a discerning local tour guide deciding which nearby places are worth showing on a map.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              relevantPlaces: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    placeId: { type: "string" },
                    relevanceTier: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["placeId", "relevanceTier"],
                  additionalProperties: false,
                },
              },
            },
            required: ["relevantPlaces"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "map-pins-relevance" });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { relevantPlaces: [] };
    const tierByPlaceId = new Map((parsed.relevantPlaces || []).map((p) => [p.placeId, p.relevanceTier]));

    return results
      .filter((result) => tierByPlaceId.has(result.place_id))
      .map((result) => {
        const primaryType = result.types?.find((type) => ALLOWED_PLACE_TYPES.includes(type)) || result.types?.[0] || null;
        return {
          ...toPlaceResponse(result, primaryType),
          relevanceTier: tierByPlaceId.get(result.place_id),
        };
      });
  } catch (error) {
    console.log("[debug] scorePlaceRelevance failed:", error?.message || error);
    return [];
  }
}

app.get("/api/map-pins", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const interests = req.query.interests ? req.query.interests.split("|").filter(Boolean) : [];
  const inferredInterests = req.query.inferredInterests ? req.query.inferredInterests.split("|").filter(Boolean) : [];
  const specificFocus = req.query.specificFocus || "";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
  }

  const cacheKey = mapPinsCacheKey(lat, lng, interests, specificFocus);
  const cached = mapPinsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MAP_PINS_CACHE_MS) {
    return res.json({ places: cached.places, cached: true });
  }

  try {
    const centers = [
      { lat, lng },
      ...PIN_GRID_RING_BEARINGS.map((bearing) => offsetLatLng(lat, lng, bearing, PIN_GRID_RING_DISTANCE_METERS)),
    ];
    const resultBatches = await Promise.all(
      centers.map((center) => fetchNearbySearch(center.lat, center.lng, PIN_SEARCH_RADIUS_METERS).catch(() => []))
    );

    const seen = new Map();
    for (const batch of resultBatches) {
      for (const result of batch) {
        if (!result.place_id || seen.has(result.place_id)) continue;
        seen.set(result.place_id, result);
      }
    }

    // Cheap first-pass filter — exclude generic business categories outright
    // before spending a Claude call scoring them.
    const filtered = [...seen.values()].filter(
      (result) => !(result.types || []).some((type) => EXCLUDED_PLACE_TYPES.includes(type))
    );

    if (filtered.length === 0) {
      mapPinsCache.set(cacheKey, { places: [], timestamp: Date.now() });
      return res.json({ places: [] });
    }

    const scoredPlaces = await scorePlaceRelevance(filtered, interests, specificFocus, inferredInterests);
    mapPinsCache.set(cacheKey, { places: scoredPlaces, timestamp: Date.now() });
    res.json({ places: scoredPlaces });
  } catch (error) {
    res.status(502).json({ error: "Failed to load map pins." });
  }
});

// In-memory cache, 30 minutes per rounded lat/lng — avoids burning through
// OpenWeatherMap's free-tier daily call limit when the same small area gets
// checked repeatedly during a walk.
const WEATHER_CACHE_MS = 30 * 60 * 1000;
const weatherCache = new Map();

app.get("/api/weather", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  // Gracefully degrades: no key configured just means no weather context,
  // never a broken app.
  if (!OPENWEATHER_API_KEY) {
    return res.json({ weather: null });
  }

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_MS) {
    return res.json({ weather: cached.weather });
  }

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("units", "metric");
    url.searchParams.set("appid", OPENWEATHER_API_KEY);

    const response = await trackedFetch(url, undefined, { provider: "openWeather", endpoint: "weather" });
    if (!response.ok) {
      return res.json({ weather: null });
    }
    const data = await response.json();

    const celsius = data.main?.temp;
    const weather = {
      temperatureC: typeof celsius === "number" ? Math.round(celsius) : null,
      temperatureF: typeof celsius === "number" ? Math.round((celsius * 9) / 5 + 32) : null,
      conditions: data.weather?.[0]?.main || null,
      description: data.weather?.[0]?.description || null,
      feelsLikeC: typeof data.main?.feels_like === "number" ? Math.round(data.main.feels_like) : null,
      humidity: data.main?.humidity ?? null,
      windSpeed: data.wind?.speed ?? null,
      // Pillar 3 (ENABLE_NEEDS_ROUTING) weather trigger — only fetched when
      // that pillar is actually on, to avoid burning extra free-tier calls
      // for deployments not using it. OpenWeatherMap's free tier has no UV
      // index endpoint anymore (deprecated in favor of the paid One Call
      // API), so the heat trigger uses temperatureC alone — see
      // checkNeedsAndMaybeSuggest in app.js.
      rainProbabilitySoon: ENABLE_NEEDS_ROUTING ? await fetchRainProbabilitySoon(lat, lng) : null,
    };

    weatherCache.set(cacheKey, { weather, timestamp: Date.now() });
    res.json({ weather });
  } catch (error) {
    res.json({ weather: null });
  }
});

// Pillar 3 (ENABLE_NEEDS_ROUTING) rain-shelter trigger — max probability of
// precipitation (0-1) across the next few 3-hour forecast blocks, using the
// free-tier /forecast endpoint (distinct from /weather above, which only
// covers right now). Fails soft to null like every other weather path here.
async function fetchRainProbabilitySoon(lat, lng) {
  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("appid", OPENWEATHER_API_KEY);
    url.searchParams.set("cnt", "3"); // next ~9 hours — "timed ahead of rain" needs near-term blocks, not next week

    const response = await trackedFetch(url, undefined, { provider: "openWeather", endpoint: "forecast" });
    if (!response.ok) return null;
    const data = await response.json();
    const probabilities = (data.list || []).map((block) => (typeof block.pop === "number" ? block.pop : 0));
    return probabilities.length ? Math.max(...probabilities) : null;
  } catch (error) {
    return null;
  }
}

// Weaves current weather into the prompt only when it adds something —
// Claude decides when it's worth mentioning, this just makes the facts
// available.
function buildWeatherGuidance(weather) {
  if (!weather || typeof weather !== "object" || weather.temperatureC === null) return null;
  const parts = [`${weather.temperatureC}°C (${weather.temperatureF}°F)`];
  if (weather.conditions) parts.push(weather.conditions);
  if (weather.description) parts.push(weather.description);

  return (
    `Current conditions: ${parts.join(", ")}. Weave this in naturally when ` +
    `it genuinely adds something (e.g. "it's a beautiful sunny afternoon — ` +
    `perfect timing to see this courtyard in the golden light", or "given ` +
    `the heat today, you might appreciate that this building was designed ` +
    `to stay cool") — not every narration needs weather mentioned, only ` +
    `when it's actually relevant.`
  );
}

// Real-time web search (Serper/Google) so Claude can mention temporary
// exhibitions, current happenings, or anything time-sensitive about a
// specific place — degrades gracefully (returns []) with no API key.
app.post("/api/search", async (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required." });
  if (!SERPER_API_KEY) return res.json({ results: [] });

  try {
    const response = await trackedFetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      },
      { provider: "serper", endpoint: "search" }
    );
    if (!response.ok) return res.json({ results: [] });

    const data = await response.json();
    const results = (data.organic || []).slice(0, 3).map((item) => ({
      title: item.title || null,
      snippet: item.snippet || null,
      link: item.link || null,
    }));
    res.json({ results });
  } catch (error) {
    res.json({ results: [] });
  }
});

async function fetchCurrentEventsContext(placeName, city) {
  if (!SERPER_API_KEY || !placeName) return null;
  try {
    const now = new Date();
    const monthYear = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const query = [placeName, city, monthYear].filter(Boolean).join(" ");

    const response = await trackedFetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      },
      { provider: "serper", endpoint: "current-events-search" }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const topSnippet = data.organic?.[0]?.snippet;
    if (!topSnippet) return null;

    return (
      `Current information found via web search: "${topSnippet}"\n\n` +
      `If this contains anything about current events, exhibitions, or ` +
      `happenings relevant to this place, weave it in naturally (e.g. ` +
      `"there happens to be a temporary exhibition here right now that's ` +
      `worth checking out"). If it's not relevant or doesn't add anything, ` +
      `ignore it entirely — never force it in.`
    );
  } catch (error) {
    return null;
  }
}

// Interest-matched place 100-300m away — Sabri proactively mentions it at
// the END of the current narration (see TRANSITION_GUIDANCE for the general
// pattern this feeds into). The client computes distance/direction; this
// just turns that into an instruction.
function buildNearbyInterestGuidance(nearbyInterestPlace) {
  if (!nearbyInterestPlace || !nearbyInterestPlace.name) return null;
  const { name, distanceMeters, direction } = nearbyInterestPlace;
  const directionPhrase = direction ? `to your ${direction}` : "nearby";

  return (
    `There is a place this person will likely find fascinating about ` +
    `${Math.round(distanceMeters)} meters ${directionPhrase}: ${name}. Since ` +
    `it's not close enough to visit right now, proactively mention it at ` +
    `the very end of this narration, after your usual transition — ` +
    `something like "About ${Math.round(distanceMeters)} meters to your ` +
    `${direction || "path ahead"} there is something I think you'll find ` +
    `fascinating — keep walking and I'll tell you about it when you get ` +
    `closer." Do not describe what it actually is yet — just build ` +
    `anticipation.`
  );
}

// "You are currently in [neighborhood], [city], [country]" — always built
// from real reverse-geocoded GPS data passed up by the client, never a
// hardcoded default. Guides Claude explicitly rather than relying on it to
// infer location context from place names alone.
function buildLocationGuidance(neighborhood, city, country) {
  const parts = [neighborhood, city, country].filter(Boolean);
  if (parts.length === 0) return null;
  return `You are currently in ${parts.join(", ")}. Guide accordingly.`;
}

// Cached, shared-across-users facts for the specific place being asked
// about right now (see place_facts in supabase/schema.sql and
// /api/get-place-facts) — the fix for three different construction dates
// showing up across one real conversation. Framed as authoritative and
// already-stated so Claude treats these as settled, not as claims to
// re-derive or second-guess this turn.
function buildPlaceFactsGuidance(placeFacts, placeName) {
  if (!placeFacts || typeof placeFacts !== "object") return null;
  const { constructionPeriod, architecturalStyle, notableHistory } = placeFacts;
  if (!constructionPeriod && !architecturalStyle && !notableHistory) return null;

  const lines = [`Established facts about ${placeName || "this place"} — treat these as settled, already-stated facts:`];
  if (constructionPeriod) lines.push(`- Built: ${constructionPeriod}`);
  if (architecturalStyle) lines.push(`- Architectural style: ${architecturalStyle}`);
  if (notableHistory) lines.push(`- Notable history: ${notableHistory}`);
  lines.push(
    "Stay consistent with these exact facts for the rest of this conversation — do not state a " +
      "different date, style, or history than what's given here, even if your own general knowledge " +
      "would suggest something slightly different."
  );
  return lines.join("\n");
}

// The accumulating Q&A for the CURRENT place specifically, distinct from
// buildSessionLogGuidance's whole-walk summary (which truncates each entry
// to ~150 characters and only keeps the last 5 across the entire walk —
// nowhere near enough to reliably remember exactly what was said two
// questions ago about the one place someone is drilling into right now).
// This is what actually prevents contradicting yourself mid-conversation,
// even before place_facts has anything cached for a brand-new place.
function buildPlaceConversationGuidance(history, placeName) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const lines = history.map((turn, index) => `${index + 1}. Asked: "${turn.question}"\n   You answered: "${turn.answer}"`);
  return (
    `Earlier in THIS conversation, still about ${placeName || "this place"}, you already said:\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `Stay fully consistent with what you already said above — do not contradict any fact, date, or ` +
    `claim from these earlier answers.`
  );
}

// Fed by /api/ask's userStatedDestination/userStatedDirection extraction
// (see the JSON schema there) — real-world testing showed Sabri kept
// narrating a street the user had already told it they were leaving, so
// this makes a spoken stated intent outrank raw GPS/distance-based
// candidate ranking rather than being forgotten after one conversational
// reply. app.js persists these client-side for the rest of the session.
function buildUserStatedIntentGuidance(userStatedDirection, userStatedDestination) {
  if (!userStatedDirection && !userStatedDestination) return null;
  const details = [];
  if (userStatedDestination) details.push(`heading toward: "${userStatedDestination}"`);
  if (userStatedDirection) details.push(`stated direction: ${userStatedDirection}`);
  return (
    `The user recently told you where they're headed next (${details.join(", ")}). ` +
    `Weight this stated intent over raw GPS-inferred proximity when deciding what ` +
    `to focus this narration on — if any of the candidate places match or relate ` +
    `to where they said they're going, strongly prefer that one even if it isn't ` +
    `the closest. Orient the narration toward where they're headed, not where ` +
    `they're walking away from.`
  );
}

// Persona is resolved client-side once per session (see app.js's
// ensurePersonaForCity) and passed on every /api/narrate call rather than
// looked up here — keeps this endpoint from needing its own Supabase round
// trip on every single narration.
function buildPersonaGuidance(persona, isFirstNarrationOfSession, isCityChange, isFirstPersonaMeeting) {
  if (!persona || !persona.generated_name) return null;
  const parts = [
    `You are narrating as ${persona.generated_name}, a local guide. ${persona.generated_bio} ` +
      `Speaking style: ${persona.style_notes}. Stay in character as this specific guide throughout ` +
      `the narration while still following all other narration rules.`,
  ];
  // isFirstPersonaMeeting takes priority over the lighter session-scoped
  // branches below — a real self-introduction already covers "mention your
  // name," and this only fires once ever per user+city+archetype (see
  // user_persona_introductions), not every session, so it needs to be a
  // genuine moment, not routine.
  if (isFirstPersonaMeeting) {
    parts.push(
      `IMPORTANT: This person has never met you before, in this city or any other — this is your very ` +
        `first time narrating for them as ${persona.generated_name}. Before diving into the ` +
        `place itself, take a real moment to properly introduce yourself the way an actual human local ` +
        `guide would on meeting a new client for the first time: who you are, your background and how ` +
        `you came to know this specific city so well, and a bit of what makes you the right person to ` +
        `show them around here — grounded in ${persona.generated_bio} and your own style, not generic. ` +
        `This should feel like meeting a real person, not reciting a bio. Keep it warm and natural, a ` +
        `handful of sentences, not a monologue — then transition naturally into the actual narration. ` +
        `This is a one-time moment; don't repeat this level of self-introduction in future narrations ` +
        `with this person in this city.`
    );
  } else if (isFirstNarrationOfSession) {
    parts.push(
      `Since this is the first narration of the session, introduce yourself by name naturally as ` +
        `part of the warm greeting — not as a separate announcement, just weave "I'm ` +
        `${persona.generated_name}" into how you say hello.`
    );
  } else if (isCityChange) {
    parts.push(
      `IMPORTANT: The user has just arrived in a new city, so you (${persona.generated_name}) are a ` +
        `different guide than whoever was narrating before in the previous city — introduce yourself ` +
        `naturally as part of this narration with a brief, warm handoff acknowledging the change. ` +
        `Never silently swap names with no acknowledgment — that would feel broken, not intentional.`
    );
  }
  return parts.join(" ");
}

const MOOD_DESCRIPTIONS = {
  relaxed:
    "Relaxed — take it slow, not in a rush. Give longer, more leisurely narration with more atmospheric detail.",
  curious:
    "Curious — wants to know everything. Give deeper historical/factual detail, more willing to go on tangents.",
  quick: "Quick — give the highlights. Shorter, punchier narration, fewer but higher-impact facts.",
  adventurous:
    "Adventurous — wants to be surprised, taken off the path. More willing to suggest unusual detours and lesser-known spots.",
};

function buildMoodGuidance(sessionMood) {
  const description = MOOD_DESCRIPTIONS[sessionMood];
  if (!description) return null;
  return (
    `The user's mood for this session is: ${description} Adjust your narration length, pacing, and ` +
    `level of detail to match this mood throughout the session.`
  );
}

// /api/ask specifically — a real guide doesn't just answer and stop, they
// stay present in the conversation.
const CONVERSATIONAL_PRESENCE_GUIDANCE =
  "You don't have to just answer and stop. When it's genuinely natural, you can ask " +
  "a clarifying or follow-up question back - for example 'Are you asking about the " +
  "building itself, or more the history behind it?' or 'Want me to go deeper on " +
  "that, or should we keep moving?' Use this when the question is ambiguous, or " +
  "when there's a natural next thread worth offering - not on every single answer. " +
  "This should read as genuine conversational presence, someone actually listening " +
  "and engaged, not a scripted habit.";

// Wander mode only — a guided tour already has its own directed rhythm
// (arrive at a planned stop, get narrated, walk to the next one), so
// inserting "want to keep wandering?" style check-ins there would just be
// noise. In Wander mode, the narration cooldown (10s + 10m between
// narrations, enforced client-side) already naturally spaces these out, so
// "occasionally" here really can mean occasionally rather than needing its
// own separate throttle.
function buildProactiveCheckInGuidance(isGuidedTour) {
  if (isGuidedTour) return null;
  return (
    "A real tour guide checks in sometimes, not just narrates one-directionally. " +
    "Very occasionally - genuinely rare, not most narrations, more like once in a " +
    "while - you can end a narration with a light, casual engagement prompt instead " +
    "of (or in addition to) the usual transition, something like 'Curious to hear " +
    "more about that, or ready to keep wandering?' or 'Want me to go deeper, or " +
    "should we keep moving?' Keep it short and low-key, never mechanical, and never " +
    "do this two narrations in a row - it should feel like a genuine moment of " +
    "checking in, not a scripted tic inserted after every stop."
  );
}

// Only relevant on the first narration of a session (see
// GREETING_AND_CONTEXT_RULES) — tells Claude whether this is genuinely the
// user's first time in this city (from Supabase visited_places history, see
// app.js) and what time of day it is, so the opening greeting can reference
// both correctly instead of guessing.
function buildFirstNarrationContext(isFirstNarrationOfSession, firstVisitToCity, timeOfDay) {
  if (!isFirstNarrationOfSession) return null;
  const parts = [
    "This is the first narration of the session.",
    `firstVisitToCity: ${firstVisitToCity ? "true" : "false"}.`,
  ];
  if (timeOfDay) parts.push(`Time of day: ${timeOfDay}.`);
  return parts.join(" ");
}

// Shared by /api/narrate and /api/ask — non-English languages need more than
// "translate this"; Hebrew in particular sounds stilted/transliterated if
// Claude isn't told explicitly to write native, spoken Hebrew.
function buildLanguageGuidance(languageName) {
  if (!languageName || languageName === "English") return null;
  const parts = [
    `Narrate entirely and naturally in ${languageName}. Write as a native ` +
      "speaker would speak, not as a translation. Use natural idioms, " +
      "rhythm, and expression of that language. Do not mix languages " +
      "unless it is genuinely natural to do so.",
  ];
  if (languageName === "Hebrew") {
    parts.push(
      "When narrating in Hebrew, write naturally flowing Hebrew as a " +
        "native Israeli would speak it. Avoid mixing in English words " +
        "unless they are genuinely used in everyday Israeli Hebrew. Use " +
        "natural Israeli speech patterns and rhythm. Do not transliterate " +
        "- write in actual Hebrew characters when narrating in Hebrew."
    );
  }
  if (languageName === "Arabic") {
    // Real finding from testing, not a guess: with no dialect steer at all,
    // "write as a native speaker would speak" alone was enough to make
    // narration drift into Egyptian colloquial Arabic unprompted — genuinely
    // fine for an Egyptian audience, but this app doesn't target one
    // specific Arabic-speaking country. Modern Standard Arabic is understood
    // broadly across every Arabic-speaking region regardless of the TTS
    // voice's own accent (unconfirmed — Inworld doesn't document which
    // dialect "Nour" is tuned for), so it's the safer default for a
    // general-audience app even without that confirmation. This is a
    // judgment call, not a proven-correct answer — worth revisiting once
    // the voice's actual accent can be confirmed by ear.
    parts.push(
      "When narrating in Arabic, write in Modern Standard Arabic (فصحى) " +
        "rather than a regional colloquial dialect (Egyptian, Gulf, " +
        "Levantine, etc.) — this app has a broad Arabic-speaking audience, " +
        "not one specific country's dialect, and MSA is understood " +
        "everywhere. Still write naturally and warmly, not stiffly formal " +
        "— MSA can absolutely sound like a real person talking, not a " +
        "news broadcast."
    );
  }
  return parts.join("\n\n");
}

// Real, confirmed bug (native-speaker feedback, not guesswork): Hebrew
// verbs/adjectives conjugate by grammatical gender, and narration was
// mixing masculine and feminine forms within a single response — both for
// the guide's own self-reference and for how it addresses the listener.
// This is a genuine grammar error, not an accent/pronunciation issue, so
// no TTS engine can fix it — it has to be fixed in the generated text.
// Same underlying grammatical category (gendered verb/adjective
// conjugation) genuinely applies to Arabic and Russian too, not just
// Hebrew, so the same fix is applied there. French/Spanish only get the
// lighter self-reference-only version, since their 2nd-person address
// ("tu"/"vous", "tú"/"usted") doesn't conjugate by the LISTENER's gender
// the way Hebrew/Arabic "you" verb forms do — see the per-language
// comments below for why each is scoped the way it is.
//
// selfGender reuses resolveDefaultVoiceGender(language) — the exact same
// function persona generation already uses to pick a name that matches
// whichever voice will actually speak the narration (see /api/get-persona)
// — rather than storing a separate gender field, since it's already a
// deterministic function of (language, TTS_PROVIDER) and this way can
// never drift out of sync with the persona-name logic or a future
// provider switch.
//
// The listener-facing default (masculine, when addressing "you" in
// Hebrew/Arabic) is a real product/language decision, not a purely
// technical one — Hebrew and Arabic have no gender-neutral second person
// the way English does, and this app has no signal at all about the
// listener's gender (onboarding never asks). Masculine is used here
// because it's the standard default for unspecified-gender formal address
// in both languages — this is a genuine judgment call, not a proven-
// correct answer, and asking the user's gender at onboarding (not
// currently done) is the only way to do better than a fixed default.
function buildGenderConsistencyGuidance(languageName, language) {
  const selfGenderWord = resolveDefaultVoiceGender(language) === "male" ? "masculine" : "feminine";

  if (languageName === "Hebrew" || languageName === "Arabic") {
    return (
      `GRAMMATICAL GENDER CONSISTENCY (${languageName}): ${languageName} verbs and adjectives conjugate by ` +
        `grammatical gender — using both masculine and feminine forms within one response is a real ` +
        `grammar error, not a style choice. Two separate things must EACH stay internally consistent ` +
        `throughout this entire response, never switching mid-response (they do not have to match each ` +
        `other, just each be consistent on its own):\n` +
        `1) When referring to YOURSELF (the guide) — "I think", "I'm happy to show you" etc. — always use ` +
        `${selfGenderWord} grammatical forms, consistently.\n` +
        `2) When addressing the LISTENER directly ("you") — imperative verbs, "you'll see", etc. — ` +
        `${languageName} has no gender-neutral default the way English does. Default to masculine ` +
        `grammatical forms throughout, consistently, unless something in the conversation clearly ` +
        `indicates otherwise.`
    );
  }

  if (languageName === "Russian") {
    return (
      `GRAMMATICAL GENDER CONSISTENCY (Russian): Russian past-tense verbs conjugate by grammatical gender ` +
        `(e.g. "я думал" vs "я думала") — mixing both within one response referring to the same speaker is ` +
        `a real grammar error. When referring to YOURSELF (the guide) in the past tense, use consistent ` +
        `${selfGenderWord === "masculine" ? "masculine" : "feminine"} verb forms throughout this entire ` +
        `response, never switching mid-response.`
    );
  }

  if (languageName === "French" || languageName === "Spanish") {
    return (
      `GRAMMATICAL GENDER AGREEMENT (${languageName}): adjectives and certain past participles describing ` +
        `YOURSELF (the guide) agree in grammatical gender. Stay consistent with ${selfGenderWord} forms ` +
        `throughout this entire response whenever you describe yourself, never switching mid-response.`
    );
  }

  return null;
}

// Resolves a Claude-generated searchQuery (e.g. "Trevi Fountain Rome") into
// a real Google Place with coordinates/placeId, biased toward the tour's
// starting area so ambiguous queries ("the old market") resolve to the
// right city. Uses the classic Find Place From Text endpoint — same family
// of API as the rest of server.js's Places calls (fetchNearbySearch etc.).
async function findPlaceForQuery(query, biasLat, biasLng) {
  if (!query || !GOOGLE_MAPS_API_KEY) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  // Note: "vicinity" is valid on Nearby Search results (see
  // fetchNearbySearch) but NOT on Find Place From Text — requesting it here
  // causes an INVALID_REQUEST for every single query.
  url.searchParams.set("fields", "place_id,name,geometry,types,photos,rating,formatted_address");
  if (typeof biasLat === "number" && typeof biasLng === "number") {
    url.searchParams.set("locationbias", `circle:20000@${biasLat},${biasLng}`);
  }
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const response = await trackedFetch(url, undefined, { provider: "googleMaps", endpoint: "find-place-from-text" });
    const data = await response.json();
    if (data.status !== "OK" || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.log(`[debug] findPlaceForQuery("${query}") status=${data.status} error=${data.error_message || "none"}`);
      return null;
    }

    const result = data.candidates[0];
    const primaryType = result.types?.find((type) => ALLOWED_PLACE_TYPES.includes(type)) || result.types?.[0] || null;
    return toPlaceResponse(result, primaryType);
  } catch (error) {
    return null;
  }
}

app.post("/api/plan-tour", async (req, res) => {
  const { startLocation, endLocation, duration, maxDistance, interests, specificFocus, userProfile, currentCity } =
    req.body || {};

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }
  if (!startLocation || typeof startLocation.lat !== "number" || typeof startLocation.lng !== "number") {
    return res.status(400).json({ error: "A valid startLocation with lat/lng is required." });
  }

  const interestList = Array.isArray(interests) && interests.length > 0 ? interests.join(", ") : "a bit of everything";
  const startDescription = startLocation.name || "their current location";
  const endDescription = endLocation && endLocation.name ? endLocation.name : "back at the starting point";

  const userMessage =
    `You are Sabri planning a walking tour. The user is in ${currentCity || "an unfamiliar city"}. ` +
    `They have ${duration || "a couple of hours"} and want to walk a maximum of ${maxDistance || "a few kilometers"}. ` +
    `They are interested in ${interestList}` +
    (specificFocus ? `, with specific focus on ${specificFocus}` : "") +
    `. Starting at ${startDescription}, ending ${endDescription}.\n\n` +
    `Generate a tour plan as JSON with this structure: { tourTitle: string, ` +
    `tourDescription: string (2-3 sentences overview), estimatedDuration: string, ` +
    `estimatedDistance: string, stops: [ { stopNumber: integer, placeName: string, ` +
    `placeType: string, searchQuery: string (a search query precise enough for a ` +
    `Google Places lookup — include the place name and city), whyThisStop: string ` +
    `(1 sentence - why this fits their interests), estimatedTimeHere: string } ], ` +
    `openingNote: string }. Plan between 3 and 8 stops depending on the available ` +
    `time, in a sensible walking order from the start point to the end point.\n\n` +
    `Write the openingNote as if a warm, knowledgeable local tour guide is speaking ` +
    `directly to the group before they start walking. Include: where they're ` +
    `currently standing (starting street/landmark), which direction/street they'll ` +
    `head first, where the tour will end, a one-sentence overview of the tour's ` +
    `theme, and 2-3 specific highlights to build anticipation for. This should feel ` +
    `like a real person talking, not a written itinerary being read aloud. The ` +
    `openingNote specifically gets spoken aloud via text-to-speech, so it must ` +
    `follow these rules:\n\n${SPOKEN_LANGUAGE_RULES}\n\n` +
    `(tourTitle/tourDescription/whyThisStop are only ever displayed as text, not ` +
    `spoken, so they can stay a bit more written/polished.)\n\n` +
    `Return ONLY valid JSON, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [SABRI_SYSTEM_PROMPT, buildUserProfileGuidance(userProfile), SAFETY_GUIDANCE].filter(Boolean).join("\n\n"),
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              tourTitle: { type: "string" },
              tourDescription: { type: "string" },
              estimatedDuration: { type: "string" },
              estimatedDistance: { type: "string" },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stopNumber: { type: "integer" },
                    placeName: { type: "string" },
                    placeType: { type: "string" },
                    searchQuery: { type: "string" },
                    whyThisStop: { type: "string" },
                    estimatedTimeHere: { type: "string" },
                  },
                  required: ["stopNumber", "placeName", "placeType", "searchQuery", "whyThisStop", "estimatedTimeHere"],
                  additionalProperties: false,
                },
              },
              openingNote: { type: "string" },
            },
            required: ["tourTitle", "tourDescription", "estimatedDuration", "estimatedDistance", "stops", "openingNote"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "plan-tour" });

    const textBlock = message.content.find((block) => block.type === "text");
    const plan = textBlock ? JSON.parse(textBlock.text) : null;
    if (!plan) return res.status(502).json({ error: "Failed to generate a tour plan." });
    console.log(`[debug] /api/plan-tour: Claude proposed ${plan.stops?.length || 0} stops`);

    // Resolve each Claude-invented stop against a real Google Place so the
    // client has coordinates/placeId to drop a pin on and narrate from.
    const resolvedStops = await Promise.all(
      (plan.stops || [])
        .sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0))
        .map(async (stop) => {
          const place = await findPlaceForQuery(stop.searchQuery, startLocation.lat, startLocation.lng);
          console.log(`[debug] /api/plan-tour: "${stop.searchQuery}" ->`, place ? place.name : "NOT FOUND");
          return { ...stop, place };
        })
    );

    res.json({ ...plan, stops: resolvedStops.filter((stop) => stop.place) });
  } catch (error) {
    res.status(502).json({ error: "Failed to generate a tour plan." });
  }
});

// Streams a Claude response as Server-Sent Events, splitting into
// sentence-sized chunks as they arrive so the client can start
// synthesizing/playing TTS for the first sentence while the rest of the
// narration is still being generated — this is what actually cuts
// perceived AND real latency, not just a better-disguised spinner.
//
// Non-narration metadata (focusedPlaceId, location corrections, etc.) is
// threaded through via a "[[MARKER:...]]" line in the model's own
// plain-text output rather than structured JSON output — incrementally
// parsing a streaming JSON string for TTS-able prose is fragile (have to
// track string-escaping state character by character); a marker is simple
// and robust to split across arbitrary chunk boundaries, which is exactly
// what this function's marker-detection logic handles below.
//
// markerPosition matters: "leading" (marker is the model's first line,
// before any narration prose) fires a "marker" SSE event as soon as it's
// resolved, well before the narration itself finishes streaming — used by
// /api/narrate's specific tier so the client can set up focusedPlace UI
// (pin highlight, place name, photo) immediately rather than waiting for
// the whole response. "trailing" (marker is the model's last line, after
// the narration) is simpler and used by /api/ask, where the extracted
// fields (location correction etc.) aren't needed until after the answer
// has already fully played anyway.
async function streamSentencesSSE(
  res,
  { system, userMessage, maxTokens = 2048, markerPrefix = null, markerPosition = "trailing", usageMeta = null }
) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const sendEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let fullText = "";
  let totalFlushedChars = 0;
  let markerContent = null;
  let markerResolved = !markerPrefix || markerPosition !== "leading";
  // Once a leading marker resolves, narration text starts partway through
  // fullText — everything before this index is marker, not prose.
  let narrationStartIndex = 0;
  const MIN_SENTENCE_CHARS = 12;
  const SENTENCE_END_REGEX = /[.!?](?:\s|$)/;

  // Recomputed from the full accumulated text + a flushed-chars cursor on
  // every delta, rather than reasoning about individual chunk boundaries —
  // that's what makes marker detection correct even when the marker text
  // itself is split arbitrarily across two or more stream chunks (a real
  // failure mode with naive per-chunk substring checks).
  const flush = (force) => {
    if (!markerResolved) {
      // Still waiting for the leading marker's closing "]]" — don't flush
      // any narration text yet, we don't know where it actually starts.
      const closeIndex = fullText.indexOf("]]");
      if (closeIndex === -1) return;
      const escapedPrefix = markerPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = fullText.match(new RegExp(`${escapedPrefix}:(.*?)\\]\\]`, "s"));
      markerContent = match ? match[1].trim() : null;
      narrationStartIndex = closeIndex + 2;
      markerResolved = true;
      sendEvent({ type: "marker", markerContent });
    }

    const trailingMarkerIndex =
      markerPrefix && markerPosition === "trailing" ? fullText.indexOf(markerPrefix, narrationStartIndex) : -1;
    const visibleText =
      trailingMarkerIndex === -1 ? fullText.slice(narrationStartIndex) : fullText.slice(narrationStartIndex, trailingMarkerIndex);
    // Once a trailing marker has started, no more real narration text is
    // coming — safe to force-flush whatever's left even if it's short.
    const effectiveForce = force || trailingMarkerIndex !== -1;
    let buffer = visibleText.slice(totalFlushedChars);

    while (true) {
      const match = buffer.match(SENTENCE_END_REGEX);
      if (!match) break;
      let endIndex = match.index + 1;
      let candidate = buffer.slice(0, endIndex).trim();

      // A short leading sentence ("So." "Test!" — common with the spoken-
      // language style) must merge FORWARD into the next one rather than
      // block the whole buffer — matching from position 0 every time would
      // otherwise keep re-finding the same short candidate on every
      // subsequent delta and never flush anything until the stream ends.
      while (candidate.length < MIN_SENTENCE_CHARS && !effectiveForce) {
        const nextMatch = buffer.slice(endIndex).match(SENTENCE_END_REGEX);
        if (!nextMatch) return; // not enough text yet to know how this merges — wait for more
        endIndex += nextMatch.index + 1;
        candidate = buffer.slice(0, endIndex).trim();
      }

      if (candidate) sendEvent({ type: "sentence", text: candidate });
      buffer = buffer.slice(endIndex).trimStart();
      totalFlushedChars = visibleText.length - buffer.length;
    }
    if (effectiveForce && buffer.trim()) {
      sendEvent({ type: "sentence", text: buffer.trim() });
      totalFlushedChars = visibleText.length;
    }
  };

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    stream.on("text", (delta) => {
      fullText += delta;
      flush(false);
    });

    const finalMessage = await stream.finalMessage();
    flush(true);

    // Not routed through the anthropic.messages.create wrapper above —
    // .stream() is a different SDK method with its own usage reporting
    // (only available once finalMessage() resolves), so this is handled
    // directly here instead, the one shared place both /api/narrate and
    // /api/ask's streaming actually flows through.
    const inputTokens = finalMessage?.usage?.input_tokens || 0;
    const outputTokens = finalMessage?.usage?.output_tokens || 0;
    const costUsd =
      (inputTokens / 1e6) * API_PRICING.anthropic.inputPerMTok + (outputTokens / 1e6) * API_PRICING.anthropic.outputPerMTok;
    logApiUsage({
      provider: "anthropic",
      endpoint: usageMeta?.endpoint,
      units: inputTokens + outputTokens,
      costUsd,
      userId: usageMeta?.userId,
      meta: { inputTokens, outputTokens, model: "claude-sonnet-4-6", streamed: true },
    });

    if (markerPrefix && markerPosition === "trailing" && markerContent === null) {
      const escapedPrefix = markerPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = fullText.match(new RegExp(`${escapedPrefix}:(.*?)\\]\\]`, "s"));
      if (match) markerContent = match[1].trim();
    }
    const trailingMarkerIndex =
      markerPrefix && markerPosition === "trailing" ? fullText.indexOf(markerPrefix, narrationStartIndex) : -1;
    const visibleFullText = (
      trailingMarkerIndex === -1 ? fullText.slice(narrationStartIndex) : fullText.slice(narrationStartIndex, trailingMarkerIndex)
    ).trim();

    sendEvent({ type: "done", markerContent, fullText: visibleFullText });
    res.end();
  } catch (error) {
    console.log("[debug] streamSentencesSSE failed:", error?.message || error);
    sendEvent({ type: "error" });
    res.end();
  }
}

// --- Popular-place narration caching (canonical_narrations) ---
//
// A curated, quality-gated cache of full narration content for places
// that have proven genuinely popular — distinct from place_facts (a
// handful of structured Q&A-grounding facts) and from a raw popularity
// cache (nothing is ever served to a real user without a human approving
// it first). Scoped to the neighborhood tier only for now: that's the tier
// where the place is already known upfront (the specific tier picks its
// focused place DURING generation, via focusedPlaceId — there's no place
// to check a cache for before that call happens), and it's also where a
// popular, high-traffic landmark's FIRST narration to a new arrival
// happens, which is exactly the highest-value place to get right.
//
// Flow, all inside the neighborhood tier below:
// 1. getApprovedCanonicalNarration(placeId) — if an approved row exists,
//    skip straight to the cheap personalization wrapper instead of a full
//    fresh generation.
// 2. Otherwise, proceed with the normal fresh generation exactly as
//    before, AND fire-and-forget maybePromoteToReviewQueue() — checks
//    whether this place has just crossed the popularity threshold and, if
//    so and nothing's already pending/approved for it, generates a
//    careful canonical narration and drops it in the admin review queue.
//    Never blocks or slows down the current user's own narration.
const POPULARITY_THRESHOLD_USERS = 7; // distinct visitors in the rolling window before a place is even considered
const POPULARITY_WINDOW_DAYS = 30;

async function checkPlacePopularity(placeId) {
  if (!supabaseAdmin || !placeId) return 0;
  try {
    const windowStart = new Date(Date.now() - POPULARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("interaction_events")
      .select("user_id")
      .eq("event_type", "narration_started")
      .gte("created_at", windowStart)
      .contains("event_data", { placeId });
    if (error) {
      console.error("[supabase] interaction_events popularity check failed:", error.message);
      return 0;
    }
    // Deduped by user, not raw narration count — the same person narrating
    // the same place five times shouldn't count as five toward this.
    return new Set((data || []).map((row) => row.user_id).filter(Boolean)).size;
  } catch (error) {
    return 0;
  }
}

async function getApprovedCanonicalNarration(placeId) {
  if (!supabaseAdmin || !placeId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("canonical_narrations")
      .select("narration_text")
      .eq("place_id", placeId)
      .eq("status", "approved")
      .maybeSingle();
    if (error) {
      console.error("[supabase] canonical_narrations select failed:", error.message);
      return null;
    }
    return data?.narration_text || null;
  } catch (error) {
    return null;
  }
}

// A careful, deliberately non-personalized narration meant to be reused —
// same "hedge rather than invent false precision" bar as place_facts'
// generation, since this gets reviewed once and then served to many
// people. No user profile, session log, weather, or mood woven in here —
// that's the personalization wrapper's job at serve time (see
// streamPersonalizedFromCanonical), this only needs to nail the
// substantive content: facts, structure, historical framing.
async function generateCanonicalNarration(place, city, country) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
    const vicinity = place.vicinity || "the area";
    const systemPrompt = [
      SABRI_SYSTEM_PROMPT,
      TOURIST_ORIENTATION_GUIDANCE,
      TIER_GUIDANCE.neighborhood,
      DEPTH_GUIDANCE.standard,
      SAFETY_GUIDANCE,
      SPOKEN_LANGUAGE_RULES,
      "This narration will be reused for many different listeners, reviewed once by a human before that " +
        "happens — write it as a strong, well-considered default: warm and in Sabri's voice, but without any " +
        "greeting, name, weather, or mood-specific framing, since those get layered on separately per listener. " +
        "Where you're not fully certain of a specific date or claim, hedge honestly rather than stating false " +
        "precision — this version needs to hold up across many people hearing it, not just sound confident once.",
    ].join("\n\n");
    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `I am standing near ${place.name}, a ${typeLabel} in ${vicinity}${city ? `, ${city}` : ""}${country ? `, ${country}` : ""}. Tell me about this place in your signature style.`,
          },
        ],
      },
      undefined,
      { endpoint: "canonical-narration-generation" }
    );
    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text.trim() : null;
  } catch (error) {
    console.error("[canonical-narration] generation failed:", error.message || error);
    return null;
  }
}

// Fire-and-forget — never awaited by the request it's called from, so it
// can never add latency to any real user's narration.
async function maybePromoteToReviewQueue(place, city, country) {
  if (!supabaseAdmin || !place?.placeId) return;
  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("canonical_narrations")
      .select("id")
      .eq("place_id", place.placeId)
      .maybeSingle();
    if (lookupError) {
      console.error("[supabase] canonical_narrations existence check failed:", lookupError.message);
      return;
    }
    if (existing) return; // already pending review, approved, or rejected — don't regenerate

    const distinctUsers = await checkPlacePopularity(place.placeId);
    if (distinctUsers < POPULARITY_THRESHOLD_USERS) return;

    const canonicalText = await generateCanonicalNarration(place, city, country);
    if (!canonicalText) return;

    const { error: insertError } = await supabaseAdmin.from("canonical_narrations").insert({
      place_id: place.placeId,
      place_name: place.name,
      city: city || null,
      country: country || null,
      narration_text: canonicalText,
      status: "pending",
    });
    if (insertError) {
      console.error("[supabase] canonical_narrations insert failed:", insertError.message);
    } else {
      console.log(`[canonical-narration] "${place.name}" crossed the popularity threshold — queued for review`);
    }
  } catch (error) {
    console.error("[canonical-narration] promotion check threw:", error.message || error);
  }
}

// The cheap serve-time step: takes the approved canonical content and
// layers in the CURRENT listener's live context — name, weather, mood, and
// recent conversation continuity — without re-deriving the substance. Kept
// deliberately tight/scoped (no TOURIST_ORIENTATION_GUIDANCE, no
// TIER/DEPTH guidance re-litigating structure) so this call is meaningfully
// cheaper than the full generation it's replacing; logged under a distinct
// endpoint tag specifically so the real savings are measurable, not assumed.
function streamPersonalizedFromCanonical(res, { canonicalText, place, userProfile, weather, sessionMood, sessionLog, persona, userId }) {
  const systemPrompt = [
    "You are Sabri, a warm knowledgeable personal tour guide. Your job right now is ONLY to personalize the " +
      "following pre-written narration for THIS specific listener — do not rewrite the substance, facts, or " +
      "structure, just adapt the greeting, tone, and framing to fit them naturally, the way the same tour " +
      "guide would subtly tailor their delivery for a new group without changing the tour itself.",
    buildUserProfileGuidance(userProfile),
    buildWeatherGuidance(weather),
    buildMoodGuidance(sessionMood),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    buildPersonaGuidance(persona, false, false, false),
    SPOKEN_LANGUAGE_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");

  const userMessage =
    `Here is the pre-written narration content for ${place.name}:\n\n${canonicalText}\n\n` +
    `Adapt this for the current listener now — weave in their name/context naturally if you have it, ` +
    `open with a greeting only if this is the start of their walk, and otherwise keep the substance exactly ` +
    `as given above.`;

  return streamSentencesSSE(res, {
    system: systemPrompt,
    userMessage,
    usageMeta: { endpoint: "narrate-cached-wrapper", userId },
  });
}

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
    neighborhood,
    city,
    country,
    weather,
    nearbyInterestPlace,
    firstVisitToCity,
    timeOfDay,
    userStatedDirection,
    userStatedDestination,
    persona,
    isCityChange,
    sessionMood,
    isGuidedTour,
    isFirstPersonaMeeting,
    userId,
    regionMemory,
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

  // Popular-place cache check — neighborhood tier only, see the comment
  // above checkPlacePopularity for why. Cache hit: skip straight to the
  // cheap personalization wrapper. Cache miss: proceed exactly as before,
  // and fire off (without awaiting) a check for whether this place just
  // crossed the popularity threshold for the review queue.
  if (resolvedTier === "neighborhood") {
    const canonicalText = await getApprovedCanonicalNarration(place.placeId);
    if (canonicalText) {
      return streamPersonalizedFromCanonical(res, {
        canonicalText,
        place,
        userProfile,
        weather,
        sessionMood,
        sessionLog,
        persona,
        userId,
      });
    }
    maybePromoteToReviewQueue(place, city, country);
  }

  const resolvedDepth = DEPTH_GUIDANCE[depth] ? depth : "standard";
  const languageName = LANGUAGE_NAMES[language];

  // Current-events web search only makes sense once zoomed in on an actual
  // place, not the broad neighborhood-orientation tier — and only for the
  // most likely candidate, since the search has to run before Claude tells
  // us which place it actually centers the story on.
  let currentEventsGuidance = null;
  if (resolvedTier === "specific") {
    const likelyPlace = places.find((p) => p.relativePosition === "in front of") || places[0];
    currentEventsGuidance = await fetchCurrentEventsContext(likelyPlace?.name, city);
  }

  const systemPromptParts = [
    SABRI_SYSTEM_PROMPT,
    TOURIST_ORIENTATION_GUIDANCE,
    GREETING_AND_CONTEXT_RULES,
    buildFirstNarrationContext(isFirstNarrationOfSession, firstVisitToCity, timeOfDay),
    buildUserProfileGuidance(userProfile),
    buildLocationGuidance(neighborhood, city, country),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    isFirstNarrationOfSession ? buildReturningUserGuidance(returningUserContext, userProfile?.name) : null,
    buildCrossSessionVisitedGuidance(crossSessionVisitedPlaces),
    ENABLE_RELATIONSHIP_CONTINUITY ? buildRegionMemoryGuidance(regionMemory, userProfile?.name) : null,
    buildWeatherGuidance(weather),
    buildUserStatedIntentGuidance(userStatedDirection, userStatedDestination),
    currentEventsGuidance,
    buildNearbyInterestGuidance(nearbyInterestPlace),
    buildPersonaGuidance(persona, isFirstNarrationOfSession, isCityChange, isFirstPersonaMeeting),
    buildMoodGuidance(sessionMood),
    CONNECTIVE_NARRATION_GUIDANCE,
    buildProactiveCheckInGuidance(isGuidedTour),
    TRANSITION_GUIDANCE,
    SAFETY_GUIDANCE,
    SPOKEN_LANGUAGE_RULES,
    buildPronunciationGuidance(languageName),
    buildLanguageGuidance(languageName),
    buildGenderConsistencyGuidance(languageName, language),
    TIER_GUIDANCE[resolvedTier],
    DEPTH_GUIDANCE[resolvedDepth],
  ].filter(Boolean);

  if (correctionContext) {
    systemPromptParts.push(
      `IMPORTANT LOCATION CORRECTION: The user has told you their actual ` +
        `location is: "${correctionContext}". Trust this over any GPS-based ` +
        `place names until they say otherwise.`
    );
  }

  const systemPrompt = systemPromptParts.join("\n\n");

  if (resolvedTier === "neighborhood") {
    const typeLabel = PLACE_TYPE_LABELS[place.primaryType] || place.primaryType;
    const vicinity = place.vicinity || "the area";
    // No focus marker needed — the client already knows to use `place`
    // directly for this tier (see narrateAndSpeak in app.js), it never
    // reads focusedPlaceId back for the neighborhood case.
    return streamSentencesSSE(res, {
      system: systemPrompt,
      userMessage: `I am standing near ${place.name}, a ${typeLabel} in ${vicinity}. Tell me about this place in your signature style.`,
      usageMeta: { endpoint: "narrate", userId },
    });
  }

  // Specific tier: multi-place + heading reasoning. Used to use structured
  // JSON output so we'd know exactly which place Claude actually centered
  // the story on — now streamed as plain text with a LEADING
  // "[[FOCUS:placeId]]" marker instead (see streamSentencesSSE), since
  // incrementally parsing streaming JSON for TTS-able prose is fragile. It
  // has to be leading, not trailing, here specifically: the client needs
  // focusedPlaceId immediately to set up UI (pin highlight, place name,
  // photo) rather than waiting for the whole narration to finish streaming.
  const userMessage =
    `Before anything else, on the very first line of your reply, write exactly: [[FOCUS:placeId]] where ` +
    `placeId is the placeId (from the list below) of the place you're about to center your narration on, or ` +
    `[[FOCUS:NONE]] if none fit. Never mention this marker or its format anywhere else in your reply. Then, ` +
    `starting on the next line, give your narration.\n\n` +
    buildSpecificUserMessage(places, heading, directionOfTravel);

  streamSentencesSSE(res, {
    system: systemPrompt,
    userMessage,
    markerPrefix: "[[FOCUS",
    markerPosition: "leading",
    usageMeta: { endpoint: "narrate", userId },
  });
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
    `right now, and tell me about it in your signature style. When more than one ` +
    `candidate is plausible, prefer the more historically/culturally significant ` +
    `place (a landmark, historic site, or notable complex) over a small nearby ` +
    `business just because it happens to be a few meters closer — being inside ` +
    `or right next to something genuinely significant should win over a slightly ` +
    `nearer cafe or shop. In focusedPlaceId, return the exact id of the place ` +
    `your narration centers on, copied exactly from the list above, or null if ` +
    `none of them fit.`
  );
}

// --- Pillar 1: proactive mid-walk depth (ENABLE_PROACTIVE_DEPTH) ---
// A new, self-contained endpoint — NOT a change to /api/narrate. Called by
// app.js's dwell-timer and callback logic (see maybeOfferDwellDepth /
// maybeOfferProactiveCallback in app.js), which run alongside
// checkForNarration/narrateAndSpeak, not inside them. Reuses the same
// system-prompt-builder + streamSentencesSSE machinery as /api/narrate and
// /api/ask so this gets the same gapless sentence-by-sentence TTS streaming
// "for free" rather than inventing a parallel response shape.
app.post("/api/narrate-proactive", async (req, res) => {
  const { type, place, callbackTopic, sessionLog, userProfile, language, persona, city, country, userId } =
    req.body || {};

  if (!ENABLE_PROACTIVE_DEPTH) {
    return res.status(403).json({ error: "Proactive depth is disabled on this server." });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }
  if (type !== "dwell" && type !== "callback") {
    return res.status(400).json({ error: 'type must be "dwell" or "callback".' });
  }
  if (type === "callback" && !callbackTopic) {
    return res.status(400).json({ error: "callbackTopic is required for type \"callback\"." });
  }

  const languageName = LANGUAGE_NAMES[language];

  const systemPromptParts = [
    `You are Sabri, a warm knowledgeable personal tour guide, currently offering a brief, unprompted extra ` +
      `bit of commentary to someone who has paused during their walk — they have NOT asked a question, this ` +
      `is proactive, not a reply to anything.`,
    buildUserProfileGuidance(userProfile),
    buildLocationGuidance(null, city, country),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    buildPersonaGuidance(persona, false, false),
    SAFETY_GUIDANCE,
    SPOKEN_LANGUAGE_RULES,
  ].filter(Boolean);

  const languageGuidance = buildLanguageGuidance(languageName);
  if (languageGuidance) systemPromptParts.push(languageGuidance);
  const pronunciationGuidance = buildPronunciationGuidance(languageName);
  if (pronunciationGuidance) systemPromptParts.push(pronunciationGuidance);
  const genderConsistencyGuidance = buildGenderConsistencyGuidance(languageName, language);
  if (genderConsistencyGuidance) systemPromptParts.push(genderConsistencyGuidance);

  const userMessage =
    type === "dwell"
      ? `The user has paused near ${place?.name || "where they are"} for a little while without asking ` +
        `anything — offer one short, genuinely additional piece of commentary about this spot (something you ` +
        `haven't already told them), as if you noticed them lingering and had one more thing worth sharing. ` +
        `Keep it to 1-2 sentences — this is a small aside, not a new narration. Do not ask if they want to ` +
        `know more or invite a response; just offer it naturally and let the moment be theirs to sit in.`
      : `Earlier on this walk, this came up: "${callbackTopic}". Weave in one short, natural, unprompted ` +
        `callback to it now — connect it to something relevant nearby if you can, or just circle back to it ` +
        `because it's genuinely worth revisiting. Keep it to 1-2 sentences. Do not ask a question or wait for ` +
        `a reply — this is a passing remark, not the start of a conversation.`;

  streamSentencesSSE(res, {
    system: systemPromptParts.join("\n\n"),
    userMessage,
    maxTokens: 256,
    usageMeta: { endpoint: "narrate-proactive", userId },
  });
});

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
    city,
    country,
    weather,
    userStatedDirection,
    userStatedDestination,
    persona,
    sessionMood,
    placeFacts,
    placeConversationHistory,
    userId,
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
    TOURIST_ORIENTATION_GUIDANCE,
    buildUserProfileGuidance(userProfile),
    buildLocationGuidance(neighborhood, city, country),
    LOCATION_GROUNDING_GUARDRAIL,
    buildPlaceFactsGuidance(placeFacts, place),
    buildPlaceConversationGuidance(placeConversationHistory, place),
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    buildCrossSessionVisitedGuidance(crossSessionVisitedPlaces),
    buildWeatherGuidance(weather),
    buildUserStatedIntentGuidance(userStatedDirection, userStatedDestination),
    buildPersonaGuidance(persona, false, false),
    buildMoodGuidance(sessionMood),
    CONVERSATIONAL_PRESENCE_GUIDANCE,
    SAFETY_GUIDANCE,
    SPOKEN_LANGUAGE_RULES,
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
      `Otherwise set locationCorrection to null.\n\n` +
      `Separately, if the user's question or statement reveals where they are ` +
      `heading or intend to go next (for example, "I'm heading toward the old ` +
      `market now", "we're walking back to my neighborhood", "let's go check ` +
      `out the waterfront") — extract a short plain description of that stated ` +
      `destination into userStatedDestination (e.g. "the old market", "their ` +
      `neighborhood", "the waterfront"), and if a cardinal direction is stated ` +
      `or can be reasonably inferred, extract it into userStatedDirection as ` +
      `exactly one of: north, northeast, east, southeast, south, southwest, ` +
      `west, northwest. Otherwise set both to null. This is separate from ` +
      `locationCorrection — a stated destination is about where they're GOING, ` +
      `not a correction of where they currently ARE.`
  );

  const languageGuidance = buildLanguageGuidance(languageName);
  if (languageGuidance) systemPromptParts.push(languageGuidance);

  const pronunciationGuidance = buildPronunciationGuidance(languageName);
  if (pronunciationGuidance) systemPromptParts.push(pronunciationGuidance);

  const genderConsistencyGuidance = buildGenderConsistencyGuidance(languageName, language);
  if (genderConsistencyGuidance) systemPromptParts.push(genderConsistencyGuidance);

  // Used to use structured JSON output for the answer + 3 extracted fields
  // (locationCorrection, userStatedDestination, userStatedDirection) — now
  // streamed as plain text with a trailing "[[META:{...}]]" JSON marker
  // instead (see streamSentencesSSE), so the client can start playing TTS
  // on the first sentence of the answer instead of waiting for the whole
  // response plus the extraction fields to finish generating.
  const questionWithMetaInstruction =
    question +
    "\n\n(After your spoken answer, on its own final line, write exactly: " +
    '[[META:{"locationCorrection":...,"userStatedDestination":...,"userStatedDirection":...}]] ' +
    "— a single-line JSON object with those three fields (each string or null, per the rules above). " +
    "Never mention this marker anywhere else in your answer.)";

  const systemPrompt = systemPromptParts.join("\n\n");

  streamSentencesSSE(res, {
    system: systemPrompt,
    userMessage: questionWithMetaInstruction,
    maxTokens: 1024,
    markerPrefix: "[[META",
    usageMeta: { endpoint: "ask", userId },
  });
});

// --- Pillar 2: relationship continuity (ENABLE_RELATIONSHIP_CONTINUITY) ---
// Turns a user's region_memory rows (see schema.sql) into guidance so
// Sabri can reference things this specific person told it earlier in this
// city — general narration, not just direct follow-up answers — but only
// when genuinely relevant, never fabricated. Mirrors buildSessionLogGuidance
// immediately below in shape/tone (both turn a list of past-tense facts
// into "use this when it fits, don't force it" guidance).
function buildRegionMemoryGuidance(entries, name) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const addressee = name || "this person";
  const lines = entries.slice(0, 8).map((entry) => `- ${entry.memory_text || entry}`);
  return (
    `Things ${addressee} has told you or shown you earlier in this city (from a previous walk or earlier ` +
      `today):\n${lines.join("\n")}\n\nReference one of these naturally in your narration ONLY when it is ` +
      `genuinely relevant to what you're describing right now (e.g. they mentioned loving street art and ` +
      `you're passing a mural, or they said they're vegetarian and the story touches on a local food ` +
      `tradition). Never force a reference in, never fabricate or embellish beyond what's listed here, and ` +
      `it's completely fine to not mention any of this if nothing fits.`
  );
}

// Weaves the onboarding profile into the prompt so every narration/answer
// feels made for this specific person.
function buildUserProfileGuidance(profile) {
  if (!profile || typeof profile !== "object") return null;
  const { name, reason, interests, companions, depth, inferredInterests } = profile;
  const hasAnything = name || reason || (Array.isArray(interests) && interests.length) || companions;
  if (!hasAnything) return null;

  const lines = ["The person you are guiding right now:"];
  if (name) lines.push(`- Name: ${name}`);
  if (reason) lines.push(`- Here as: ${reason}`);
  if (Array.isArray(interests) && interests.length) lines.push(`- Interested in: ${interests.join(", ")}`);
  if (companions) lines.push(`- Exploring with: ${companions}`);
  if (depth) lines.push(`- Depth preference: ${depth}`);
  // Behavior-derived, not stated — a soft secondary signal, never treated as
  // equal to what they actually told us at onboarding.
  if (Array.isArray(inferredInterests) && inferredInterests.length) {
    lines.push(
      `- Their actual behavior (what they linger on, tap, and ask about) also suggests interest in: ` +
        `${inferredInterests.join(", ")} — weave this in occasionally when genuinely relevant, but don't ` +
        `treat it as a stated preference the way the interests above are.`
    );
  }

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

// Unchanged from before the Inworld work — same request shape, same
// OpenAI call, same normalization call. Wrapped into its own function
// purely so /api/speak can route to it, not modified otherwise. This is
// the entire rollback path if Inworld has real-world issues: flip
// TTS_PROVIDER back to "openai" and every call goes through this exact,
// already-proven code again.
async function speakWithOpenAI({ text, speed, voice, language }) {
  if (!OPENAI_API_KEY) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured on the server."), { statusCode: 500 });
  }

  // Model never varies. Voice is resolved per-language first (see
  // LANGUAGE_VOICE_MAP — some voices simply pronounce non-English phonemes
  // better), falling back to the settings panel's voice preference for
  // English. Speed is clamped to OpenAI's valid range and falls back to
  // VOICE_CONFIG.speed when not provided.
  const resolvedVoice = resolveSpeakVoice(language, voice);
  const requestedSpeed = typeof speed === "number" && Number.isFinite(speed) ? speed : VOICE_CONFIG.speed;
  const resolvedSpeed = Math.min(4.0, Math.max(0.25, requestedSpeed));
  // OpenAI TTS rejects input over 4096 characters outright — deep-depth
  // narrations combined with the user profile/session log context can
  // exceed that, so clamp rather than let the whole request fail.
  const resolvedText = text.length > 4096 ? text.slice(0, 4096) : text;

  // response_format: "wav" (not the default mp3) specifically so the
  // per-clip loudness normalization below can operate on raw PCM samples
  // directly — see normalizeWavPeak's comment for why this fixes the real
  // inter-clip volume inconsistency reported over AirPods without touching
  // timing/cadence at all. Trade-off, stated plainly: WAV is uncompressed,
  // so each clip is a larger download than the mp3 this replaced —
  // acceptable for single-sentence clips, but a real cost if narrations
  // move to much longer per-request audio later.
  const speech = await openai.audio.speech.create(
    {
      model: VOICE_CONFIG.model,
      voice: resolvedVoice,
      input: resolvedText,
      speed: resolvedSpeed,
      response_format: "wav",
    },
    undefined,
    { endpoint: "speak" }
  );

  const arrayBuffer = await speech.arrayBuffer();
  return normalizeWavPeak(Buffer.from(arrayBuffer));
}

// Confirmed directly against Inworld's real API (not guessed from docs):
// POST https://api.inworld.ai/tts/v1/voice, Authorization: Basic
// <INWORLD_API_KEY> (the key from the Inworld Portal is already the
// base64(key:secret) Basic Auth credential — used as-is, never re-encoded).
// Response is {audioContent: base64, usage: {...}} — audioContent decodes
// straight to a standard 44-byte-header WAV file when audioConfig.
// audioEncoding: "LINEAR16" is requested (defaults to MP3 otherwise, per a
// live test) — requesting WAV directly like this was the cleanest option,
// no conversion step needed for normalizeWavPeak to work on Inworld's
// output exactly the same way it does on OpenAI's.
//
// Voice/model: inworld-tts-1.5-max (their top-quality model, per real-world
// side-by-side testing not meaningfully slower than OpenAI's tts-1 for a
// single-sentence request — see the self-review notes in the commit this
// shipped in). Voice IDs come from INWORLD_LANGUAGE_VOICE_MAP, confirmed
// against Inworld's live /tts/v1/voices catalog for all 6 languages Sabri
// supports — no per-user Settings override for now (see
// INWORLD_LANGUAGE_VOICE_MAP's own comment for why), and no speed/rate
// control wired up — Inworld's request schema wasn't found to expose an
// equivalent parameter, so this uses each voice's natural pace rather than
// guess at an unverified field name.
async function speakWithInworld({ text, language }) {
  if (!INWORLD_API_KEY) {
    throw Object.assign(new Error("INWORLD_API_KEY is not configured on the server."), { statusCode: 500 });
  }

  const voiceId = resolveInworldVoice(language);
  // Same 4096-char safety clamp as the OpenAI path — Inworld's own limit
  // wasn't confirmed, but there's no reason a single narration sentence
  // should ever approach this regardless of provider.
  const resolvedText = text.length > 4096 ? text.slice(0, 4096) : text;

  const response = await fetch("https://api.inworld.ai/tts/v1/voice", {
    method: "POST",
    headers: {
      Authorization: `Basic ${INWORLD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: resolvedText,
      voiceId,
      modelId: "inworld-tts-1.5-max",
      audioConfig: { audioEncoding: "LINEAR16" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw Object.assign(new Error(`Inworld TTS API error ${response.status}: ${errorText.slice(0, 300)}`), {
      statusCode: 502,
    });
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw Object.assign(new Error("Inworld TTS response had no audioContent."), { statusCode: 502 });
  }

  logApiUsage({
    provider: "inworld",
    endpoint: "speak",
    units: data.usage?.processedCharactersCount ?? resolvedText.length,
    costUsd: 0, // no confirmed Inworld pricing to compute this against yet — tracked as a real request either way
    meta: { voiceId, modelId: data.usage?.modelId || "inworld-tts-1.5-max" },
  });

  return normalizeWavPeak(Buffer.from(data.audioContent, "base64"));
}

app.post("/api/speak", async (req, res) => {
  const { text, speed, voice, language } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  try {
    const normalized =
      TTS_PROVIDER === "inworld"
        ? await speakWithInworld({ text, speed, voice, language })
        : await speakWithOpenAI({ text, speed, voice, language });

    res.setHeader("Content-Type", "audio/wav");
    res.send(normalized);
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.statusCode === 500 ? error.message : "Failed to generate speech." });
  }
});

// Real-world testing over AirPods: volume audibly dipped up and down
// between TTS clips, since each sentence is an independently generated
// clip from OpenAI with no consistency enforced between them. Fixed with
// pure peak normalization on the raw PCM samples — a linear amplitude
// scale, sample-for-sample, at the exact same sample count and rate as the
// original. This can only ever change loudness, never cadence/pacing/
// timing (there is no way for a per-sample linear scale to shift where a
// sample falls in time), and unlike dynamic-range compression it doesn't
// reshape the waveform beyond a uniform multiply, so it shouldn't
// introduce anything that reads as robotic. Deliberately conservative
// (clamped gain range, skips clips already close to target) — erring
// toward leaving a clip's natural sound alone over aggressively flattening
// everything to identical loudness.
const WAV_TARGET_PEAK = 29200; // ~-1dBFS of 16-bit PCM's 32767 ceiling — a little headroom, not full-scale
const WAV_MIN_GAIN = 0.3;
const WAV_MAX_GAIN = 3.0;

function normalizeWavPeak(buffer) {
  try {
    // Standard 44-byte canonical WAV header (RIFF/WAVE/fmt /data in that
    // fixed order) — exactly what OpenAI's TTS API returns. Not attempting
    // to handle arbitrary/extended WAV chunk layouts here.
    if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
      return buffer; // not the shape expected — play it unmodified rather than risk corrupting it
    }
    const bitsPerSample = buffer.readUInt16LE(34);
    if (bitsPerSample !== 16) return buffer; // only handling the common 16-bit case OpenAI actually returns

    const dataStart = 44;
    // NOT trusting the data chunk's declared size field here — OpenAI's TTS
    // API streams this response without knowing the final length upfront,
    // so it writes 0xFFFFFFFF (max uint32, a "size unknown" placeholder)
    // rather than a real byte count. Using the buffer's actual length
    // instead is what the real data is bounded by regardless of what the
    // header claims — confirmed live: trusting the header field here
    // produced an out-of-range read and silently no-opped normalization
    // every time via the catch below, without ever actually applying it.
    const dataLength = buffer.length - dataStart;
    const sampleCount = Math.floor(dataLength / 2);

    let peak = 0;
    for (let i = 0; i < sampleCount; i++) {
      const sample = Math.abs(buffer.readInt16LE(dataStart + i * 2));
      if (sample > peak) peak = sample;
    }
    if (peak === 0) return buffer; // silence — nothing to normalize

    const gain = Math.min(WAV_MAX_GAIN, Math.max(WAV_MIN_GAIN, WAV_TARGET_PEAK / peak));
    if (Math.abs(gain - 1) < 0.02) return buffer; // already close enough — skip the write pass

    const output = Buffer.from(buffer); // copy — never mutate the buffer passed in
    for (let i = 0; i < sampleCount; i++) {
      const offset = dataStart + i * 2;
      const scaled = Math.round(output.readInt16LE(offset) * gain);
      const clamped = Math.max(-32768, Math.min(32767, scaled));
      output.writeInt16LE(clamped, offset);
    }
    return output;
  } catch (error) {
    return buffer; // any parsing surprise — fail safe to the original, unmodified clip
  }
}

const IDENTIFY_SYSTEM_PROMPT =
  "You are Sabri, a warm knowledgeable tour guide. The user has pointed " +
  "their camera at something and wants to know about it. Look at the image " +
  "carefully. Identify what it is (building, landmark, artwork, street " +
  "sign, food, etc.), then tell the story of what you see in Sabri's warm " +
  "conversational style. Keep it to 2-3 paragraphs. If you cannot identify " +
  "something specific, describe what you observe and offer interesting " +
  "context about that type of thing. Always end with something that makes " +
  "the user want to explore further.\n\n" +
  SPOKEN_LANGUAGE_RULES;

// "Point and learn" camera feature — see CAMERA_ENABLED above for the
// kill-switch. NOTE for the eventual Capacitor/App Store conversion: this
// currently receives a base64 frame captured via getUserMedia on the
// frontend; the native camera plugin should replace getUserMedia there for
// better performance/reliability, but this endpoint itself doesn't change.
app.post("/api/identify", async (req, res) => {
  if (!CAMERA_ENABLED) {
    return res.status(404).json({ error: "Camera feature is disabled." });
  }

  const { imageBase64, mediaType, language } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required." });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  const resolvedMediaType = ["image/jpeg", "image/png", "image/webp"].includes(mediaType)
    ? mediaType
    : "image/jpeg";
  // Data URIs (data:image/jpeg;base64,....) come through from <canvas>.toDataURL
  // — strip the prefix if present so we only send the raw base64 payload.
  const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",").pop() : imageBase64;

  // Same per-user language preference narration/ask already respect — a
  // non-English speaker pointing the camera at something should get the
  // answer in their language too, not always English.
  const languageGuidance = buildLanguageGuidance(LANGUAGE_NAMES[language]);
  const systemPrompt = languageGuidance ? `${IDENTIFY_SYSTEM_PROMPT}\n\n${languageGuidance}` : IDENTIFY_SYSTEM_PROMPT;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: resolvedMediaType, data: rawBase64 } },
            { type: "text", text: "What am I looking at?" },
          ],
        },
      ],
    }, undefined, { endpoint: "identify" });

    const narration = message.content.find((block) => block.type === "text")?.text || "";
    res.json({ narration });
  } catch (error) {
    console.error("[debug] /api/identify failed:", error?.message || error);
    res.status(502).json({ error: "Failed to identify image." });
  }
});

// --- Conversational onboarding ("Talk to Sabri") ---
// Stateless: the client sends the full conversation history each turn (see
// app.js's onboardingChatHistory) rather than the server tracking a session,
// keeping this consistent with every other endpoint in this file.
const ONBOARDING_CHAT_SYSTEM_PROMPT =
  "You are Sabri, conducting a warm, natural onboarding conversation with a new user before their " +
  "first tour — not filling out a form. Your goal is to naturally gather these profile fields through " +
  "conversation:\n" +
  "- name (what to call them)\n" +
  "- language (which language they want tours narrated in — map to exactly one of: en, he, ar, es, fr, ru)\n" +
  "- interests (what they love learning about when they travel — map loosely to one or more of: 'Deep " +
  "history', 'Faith & spirituality', 'Hidden stories', 'Architecture & beauty', 'Food & living culture', " +
  "'People & community', 'Politics & society', 'Art & creativity', 'Nature & landscape', 'Markets & " +
  "nightlife', 'All of it')\n" +
  "- depth (how much detail they want — map to exactly one of: surface, standard, deep)\n" +
  "- voice (a guide voice preference — map to exactly one of: onyx (deep & warm), nova (clear & bright), " +
  "shimmer (soft & gentle), echo (rich & rounded); if they have no strong preference, don't press hard on " +
  "this, a sensible default is fine)\n\n" +
  "Keep this SHORT — aim to gather everything in 3-5 user turns, not a long interview. Ask about multiple " +
  "things at once when it feels natural (e.g. name + interests together) rather than one field per " +
  "question. If the user seems stuck or unsure how to answer, offer gentle examples in your reply rather " +
  "than just repeating the question. Once you have enough to proceed — name and at least one interest are " +
  "the real minimum; use sensible defaults (language: en, depth: standard, voice: onyx) for anything the " +
  "user didn't state an opinion on — set isComplete to true.\n\n" +
  "Always respond in character as Sabri, warm and conversational, as if speaking aloud to someone you're " +
  "excited to guide.\n\n" +
  SPOKEN_LANGUAGE_RULES;

app.post("/api/onboarding-chat", async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "A non-empty messages array is required." });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: ONBOARDING_CHAT_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              isComplete: { type: "boolean" },
              extractedProfile: {
                type: "object",
                properties: {
                  name: { anyOf: [{ type: "string" }, { type: "null" }] },
                  language: { anyOf: [{ type: "string" }, { type: "null" }] },
                  interests: { type: "array", items: { type: "string" } },
                  depth: { anyOf: [{ type: "string" }, { type: "null" }] },
                  voice: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
                required: ["name", "language", "interests", "depth", "voice"],
                additionalProperties: false,
              },
            },
            required: ["reply", "isComplete", "extractedProfile"],
            additionalProperties: false,
          },
        },
      },
      messages: messages.map((entry) => ({
        role: entry.role === "assistant" ? "assistant" : "user",
        content: String(entry.content || ""),
      })),
    }, undefined, { endpoint: "onboarding-chat" });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock
      ? JSON.parse(textBlock.text)
      : { reply: "Sorry, could you say that again?", isComplete: false, extractedProfile: {} };
    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to continue the onboarding conversation." });
  }
});

// Conversational alternative to the tour planner's step-by-step form —
// "Just tell Sabri what you want" from the planner's step 0. Same
// stateless pattern as /api/onboarding-chat (client resends full history
// each turn); once isComplete, the client hands extractedTourParams
// straight to the existing generatePlannedTour()/plan-tour pipeline, so
// this endpoint's only job is gathering the same fields the step-by-step
// form gathers, nothing about the actual tour generation itself.
const PLAN_TOUR_CHAT_SYSTEM_PROMPT =
  "You are Sabri, helping a user describe the walking tour they want through natural conversation instead of " +
  "filling out a form. Your goal is to naturally gather:\n" +
  "- startLocationName (where they want to begin, as plain text — a place name/address/landmark, or the " +
  "literal string 'current location' if they say 'here'/'my location'/'where I am now'. Never invent " +
  "coordinates yourself — a real geocoding lookup resolves this text server-side.)\n" +
  "- endLocationName (optional — where they want to end, as plain text, if different from the start; null if " +
  "they just want to loop back to the start)\n" +
  "- duration (map loosely to one of: '30-60 minutes', '1-2 hours', '2-4 hours', 'half day' — or use their " +
  "own stated time if more specific)\n" +
  "- maxDistance (map loosely to one of: 'under 1km (easy)', '1-3km (moderate)', '3-5km (active)')\n" +
  "- interests (what they want the tour to focus on — map loosely to one or more of: 'Deep history', 'Faith " +
  "& spirituality', 'Hidden stories', 'Architecture & beauty', 'Food & living culture', 'People & community', " +
  "'Politics & society', 'Art & creativity', 'Nature & landscape', 'Markets & nightlife', 'All of it')\n" +
  "- specificFocus (any specific must-see requests, e.g. 'Roman ruins' or 'a specific bakery' — null if none)\n\n" +
  "Keep this SHORT — aim to gather everything in 2-4 user turns. Ask about multiple things at once when " +
  "natural (e.g. duration + interests together) rather than one field per question. The real minimum to " +
  "proceed is a startLocationName and SOME sense of duration or distance — use sensible defaults ('1-2 " +
  "hours', '1-3km (moderate)', interests: ['All of it']) for anything they don't state an opinion on. Once " +
  "you have enough, set isComplete to true.\n\n" +
  "Always respond in character as Sabri, warm and conversational, as if speaking aloud to someone you're " +
  "excited to guide.\n\n" +
  SPOKEN_LANGUAGE_RULES;

app.post("/api/plan-tour-chat", async (req, res) => {
  const { messages, currentCity, currentLocation } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "A non-empty messages array is required." });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  const contextLine =
    `Context: the user is currently in/near ${currentCity || "an unfamiliar city"}` +
    (currentLocation && typeof currentLocation.latitude === "number"
      ? `, at approximately lat ${currentLocation.latitude}, lng ${currentLocation.longitude} if they want to start "here" or "my current location".`
      : ".");

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: PLAN_TOUR_CHAT_SYSTEM_PROMPT + "\n\n" + contextLine,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              isComplete: { type: "boolean" },
              extractedTourParams: {
                type: "object",
                properties: {
                  startLocationName: { anyOf: [{ type: "string" }, { type: "null" }] },
                  endLocationName: { anyOf: [{ type: "string" }, { type: "null" }] },
                  duration: { anyOf: [{ type: "string" }, { type: "null" }] },
                  maxDistance: { anyOf: [{ type: "string" }, { type: "null" }] },
                  interests: { type: "array", items: { type: "string" } },
                  specificFocus: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
                required: [
                  "startLocationName",
                  "endLocationName",
                  "duration",
                  "maxDistance",
                  "interests",
                  "specificFocus",
                ],
                additionalProperties: false,
              },
            },
            required: ["reply", "isComplete", "extractedTourParams"],
            additionalProperties: false,
          },
        },
      },
      messages: messages.map((entry) => ({
        role: entry.role === "assistant" ? "assistant" : "user",
        content: String(entry.content || ""),
      })),
    }, undefined, { endpoint: "plan-tour-chat" });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock
      ? JSON.parse(textBlock.text)
      : { reply: "Sorry, could you say that again?", isComplete: false, extractedTourParams: {} };

    // Resolve Claude's plain-text location names into real coordinates via
    // an actual Places lookup — never trust an LLM to invent lat/lng itself.
    if (parsed.isComplete && parsed.extractedTourParams) {
      const biasLat = currentLocation?.latitude;
      const biasLng = currentLocation?.longitude;
      const resolveLocation = async (name) => {
        if (!name) return null;
        if (/current location|here|where i am/i.test(name) && typeof biasLat === "number") {
          return { lat: biasLat, lng: biasLng, name: currentCity || "Current location" };
        }
        const place = await findPlaceForQuery(name, biasLat, biasLng);
        if (!place || typeof place.latitude !== "number") return null;
        return { lat: place.latitude, lng: place.longitude, name: place.name };
      };

      const [resolvedStart, resolvedEnd] = await Promise.all([
        resolveLocation(parsed.extractedTourParams.startLocationName),
        resolveLocation(parsed.extractedTourParams.endLocationName),
      ]);
      parsed.extractedTourParams.startLocation = resolvedStart;
      parsed.extractedTourParams.endLocation = resolvedEnd;

      if (!resolvedStart) {
        // Couldn't geocode it — don't hand a broken tour off to /api/plan-tour.
        // Ask again instead of silently failing.
        parsed.isComplete = false;
        parsed.reply =
          "Hmm, I couldn't quite place that starting point — could you name a specific street, landmark, or " +
          "say 'my current location'?";
      }
    }

    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to continue the tour planning conversation." });
  }
});

// --- Auth / Supabase-backed history endpoints ---
// All of these use supabaseAdmin (the service-role client), which bypasses
// RLS — that's fine here because these routes are the trusted server side
// of the app, not a path a browser talks to directly with its own key.

app.post("/api/auth/save-profile", async (req, res) => {
  const { userId, profile, onboardingComplete } = req.body || {};
  if (!userId || !profile) {
    return res.status(400).json({ error: "userId and profile are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  const row = {
    id: userId,
    name: profile.name || null,
    reason: profile.reason || null,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    dietary_restrictions: Array.isArray(profile.dietaryRestrictions) ? profile.dietaryRestrictions : [],
    companions: profile.companions || null,
    depth: profile.depth || null,
    home_city: profile.homeCity || null,
    language: profile.language || null,
    voice: profile.voice || null,
    preferred_archetype: profile.preferredArchetype || "local_friend",
    updated_at: new Date().toISOString(),
  };
  // Only set onboarding_complete when explicitly told to — a mid-session
  // "Edit Preferences" save shouldn't accidentally flip it back to
  // undefined/false for an already-onboarded user.
  if (typeof onboardingComplete === "boolean") {
    row.onboarding_complete = onboardingComplete;
  }

  const { error } = await supabaseAdmin.from("profiles").upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[supabase] profiles upsert failed:", error.message || error);
    return res.status(502).json({ error: "Failed to save profile." });
  }
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

  if (error) {
    console.error("[supabase] visited_places insert failed:", error.message || error);
    return res.status(502).json({ error: "Failed to save visit." });
  }
  res.json({ success: true });
});

// Every voice question asked via tap-to-talk (see askSabri in app.js) —
// previously nothing wrote to this table despite it existing in the schema.
app.post("/api/auth/save-question", async (req, res) => {
  const { userId, placeId, question, answerSummary } = req.body || {};
  if (!userId || !question) {
    return res.status(400).json({ error: "userId and question are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  const { error } = await supabaseAdmin.from("user_questions").insert({
    user_id: userId,
    place_id: placeId || null,
    question: String(question).slice(0, 500),
    answer_summary: answerSummary ? String(answerSummary).slice(0, 200) : null,
  });

  if (error) {
    console.error("[supabase] user_questions insert failed:", error.message || error);
    return res.status(502).json({ error: "Failed to save question." });
  }
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

    // None of these throw on a PostgREST-level error (bad key, missing
    // grants, RLS) — only on a genuine network failure, caught below. Log
    // each explicitly so a returning user silently looking brand-new (empty
    // profile/history) is diagnosable instead of indistinguishable from
    // "this really is a new user."
    if (placesResult.error) console.error("[supabase] visited_places select failed:", placesResult.error.message);
    if (sessionsResult.error) console.error("[supabase] walk_sessions select failed:", sessionsResult.error.message);
    if (profileResult.error) console.error("[supabase] profiles select failed:", profileResult.error.message);

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

  if (error) {
    console.error("[supabase] walk_sessions insert failed:", error.message || error);
    return res.status(502).json({ error: "Failed to save session." });
  }
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

// The full list of event types app.js logs (see interaction_events schema
// and each call site) — kept here as documentation/a single source of
// truth, not enforced strictly server-side (an unrecognized type is still
// logged, just flagged, so a client-side typo never silently drops data).
const LOGGED_EVENT_TYPES = [
  "narration_started",
  "narration_completed",
  "narration_skipped",
  "pin_tapped",
  "pin_ignored_within_view",
  "route_deviation",
  "voice_question_asked",
  "persona_selected",
  "mood_selected",
  "tour_completed",
  "tour_abandoned",
  "camera_identify_used",
  "session_duration",
  "onboarding_path_chosen",
  "feedback_submitted",
  "time_to_first_audio",
  "tour_start_latency",
  // 3-pillar system (ENABLE_PROACTIVE_DEPTH / ENABLE_RELATIONSHIP_CONTINUITY
  // / ENABLE_NEEDS_ROUTING) — see app.js for where each of these fires.
  "proactive_interjection_delivered",
  "proactive_interjection_failed",
  "region_memory_referenced",
  "needs_suggestion_offered",
  "needs_suggestion_accepted",
  "needs_suggestion_declined",
  "needs_detour_started",
  "needs_detour_resumed",
];

// Fire-and-forget from the client (app.js's logEvent) — never something the
// UX waits on, so this fails soft: always 200s back quickly, logs server
// errors instead of surfacing them, and doesn't validate event_data shape
// strictly (each event_type has its own informal shape, see app.js).
app.post("/api/log-event", async (req, res) => {
  const { userId, sessionId, eventType, eventData, city } = req.body || {};
  if (!userId || !eventType) {
    return res.status(400).json({ error: "userId and eventType are required." });
  }
  if (!supabaseAdmin) {
    return res.json({ success: false });
  }
  if (!LOGGED_EVENT_TYPES.includes(eventType)) {
    console.log(`[debug] /api/log-event: unrecognized event_type "${eventType}" — logging anyway`);
  }

  try {
    // supabase-js only throws on a genuine network failure — a rejected
    // insert (bad key, missing grants, RLS) comes back as {error} without
    // throwing, so it has to be checked explicitly or this silently reports
    // success on every failure (this was the actual prior behavior; see
    // CAPACITOR_NOTES.md-adjacent incident writeup for how that went
    // unnoticed).
    const { error } = await supabaseAdmin.from("interaction_events").insert({
      user_id: userId,
      session_id: sessionId || null,
      event_type: eventType,
      event_data: eventData && typeof eventData === "object" ? eventData : {},
      city: city || null,
    });
    if (error) {
      console.error("[supabase] interaction_events insert failed:", error.message || error);
      return res.json({ success: false });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[supabase] interaction_events insert threw:", error.message || error);
    res.json({ success: false });
  }
});

// Settings > Report a Problem. Deliberately does NOT require sign-in
// (userId is optional/nullable throughout) — a lot of real bugs surface
// before someone's ever finished onboarding, and requiring an account
// would just mean fewer testers bother reporting anything. The screenshot,
// if present, arrives as a data URI (same convention /api/identify already
// uses for the camera feature) and gets uploaded to the private
// feedback-screenshots Storage bucket BEFORE the report row is inserted —
// if the upload fails, the whole request fails rather than silently saving
// a report with a broken screenshot reference.
app.post("/api/feedback", async (req, res) => {
  const { message, screenshotBase64, screenshotMediaType, userId, appContext } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "A message is required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  let screenshotPath = null;
  if (screenshotBase64) {
    const resolvedMediaType = ["image/jpeg", "image/png", "image/webp"].includes(screenshotMediaType)
      ? screenshotMediaType
      : "image/jpeg";
    const extension = resolvedMediaType.split("/")[1];
    // Data URIs (data:image/jpeg;base64,....) come through from a
    // <canvas>/<input type="file"> read — strip the prefix if present so
    // we only upload the raw bytes.
    const rawBase64 = screenshotBase64.includes(",") ? screenshotBase64.split(",").pop() : screenshotBase64;
    const buffer = Buffer.from(rawBase64, "base64");

    // Matches the feedback-screenshots bucket's own file_size_limit (see
    // supabase/schema.sql) — checked here too so an oversized upload fails
    // clearly instead of the bucket silently rejecting it mid-request.
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Screenshot is too large (5MB max)." });
    }

    const path = `${userId || "anonymous"}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("feedback-screenshots")
        .upload(path, buffer, { contentType: resolvedMediaType });
      if (uploadError) throw uploadError;
      screenshotPath = path;
    } catch (error) {
      console.log("[debug] feedback screenshot upload failed:", error?.message || error);
      return res.status(502).json({ error: "Failed to upload screenshot — please try again." });
    }
  }

  try {
    const { error } = await supabaseAdmin.from("feedback_reports").insert({
      user_id: userId || null,
      message: message.trim(),
      screenshot_url: screenshotPath,
      app_context: appContext && typeof appContext === "object" ? appContext : {},
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.log("[debug] /api/feedback insert failed:", error?.message || error);
    res.status(502).json({ error: "Failed to save your report — please try again." });
  }
});

// Implicit interest inference — reviews a user's actual behavior
// (interaction_events) against their stated onboarding interests and
// produces a separate inferred_interests field, used to subtly WEIGHT (not
// override) pin relevance and narration focus alongside stated interests.
// Triggered client-side after every few sessions (see app.js's
// maybeTriggerInterestInference) rather than a real cron job, since this
// app has no background worker infrastructure — functionally equivalent
// either way, just client-triggered instead of time-triggered.
app.post("/api/infer-interests", async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });

  try {
    const [profileResult, eventsResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("interests").eq("id", userId).maybeSingle(),
      supabaseAdmin
        .from("interaction_events")
        .select("event_type, event_data, city, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const statedInterests = profileResult.data?.interests || [];
    const events = eventsResult.data || [];
    if (events.length < 10) {
      // Not enough signal yet to infer anything meaningful.
      return res.json({ inferredInterests: [], skipped: true });
    }

    const eventSummary = events
      .map((e) => `${e.event_type}: ${JSON.stringify(e.event_data).slice(0, 150)}`)
      .join("\n");

    const userMessage =
      `Given this user's stated interests (${statedInterests.join(", ") || "none stated"}) and their ` +
      `actual behavior over their recent sessions below, what additional or different interests does ` +
      `their behavior suggest? Look at what they actually tap, listen to fully vs skip, and ask about — ` +
      `not just what they said at onboarding.\n\nRecent behavior:\n${eventSummary}\n\n` +
      `Return a short list (3-6 items) of interest labels, ideally from this set when they fit: Deep ` +
      `history, Faith & spirituality, Hidden stories, Architecture & beauty, Food & living culture, People ` +
      `& community, Politics & society, Art & creativity, Nature & landscape, Markets & nightlife — but ` +
      `feel free to use a more specific label if the behavior clearly suggests something not on that list.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are analyzing user behavior to infer travel interests. Return only what's asked for.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { inferredInterests: { type: "array", items: { type: "string" } } },
            required: ["inferredInterests"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "infer-interests", userId });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { inferredInterests: [] };

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ inferred_interests: parsed.inferredInterests || [] })
      .eq("id", userId);
    if (updateError) console.error("[supabase] profiles.inferred_interests update failed:", updateError.message);

    res.json({ inferredInterests: parsed.inferredInterests || [] });
  } catch (error) {
    console.error("[supabase] inferInterestsForUser threw:", error.message || error);
    res.status(502).json({ error: "Failed to infer interests." });
  }
});

// --- Pillar 2: relationship continuity (ENABLE_RELATIONSHIP_CONTINUITY) ---
// Read side — fetched once per city by app.js's ensureRegionMemoryForCity
// (called alongside ensurePersonaForCity, itself already called at the top
// of narrateAndSpeak), not on every narration request.
app.get("/api/get-region-memory", async (req, res) => {
  const { userId, city } = req.query;
  if (!ENABLE_RELATIONSHIP_CONTINUITY) return res.json({ entries: [] });
  if (!userId || !city) return res.status(400).json({ error: "userId and city query params are required." });
  if (!supabaseAdmin) return res.json({ entries: [] });

  try {
    const { data, error } = await supabaseAdmin
      .from("region_memory")
      .select("memory_text, source_type, created_at")
      .eq("user_id", userId)
      .eq("region_key", city)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      console.error("[supabase] region_memory select failed:", error.message);
      return res.json({ entries: [] });
    }
    res.json({ entries: data || [] });
  } catch (error) {
    console.log("[debug] /api/get-region-memory failed:", error?.message || error);
    res.json({ entries: [] });
  }
});

// Write side — extracts 1-3 short natural-language facts from a user's
// recent conversation/event history for the given city and appends them to
// region_memory. Triggered on the same every-3rd-session cadence as
// /api/infer-interests (see maybeTriggerRegionMemoryExtraction in app.js,
// called alongside maybeTriggerInterestInference, not a change to it) — a
// new endpoint, not a rewrite of infer-interests, since the two produce
// different kinds of data (interest labels vs. free-text remembered facts)
// even though the trigger cadence and Claude-extraction shape are the same.
app.post("/api/extract-region-memory", async (req, res) => {
  const { userId, city } = req.body || {};
  if (!ENABLE_RELATIONSHIP_CONTINUITY) return res.json({ saved: [], skipped: true });
  if (!userId || !city) return res.status(400).json({ error: "userId and city are required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });

  try {
    // user_questions (see schema.sql) has no city column — only place_id —
    // so it can't be reliably filtered to just this city without an extra
    // join this codebase doesn't otherwise do. interaction_events DOES have
    // a city column already (used elsewhere, e.g. infer-interests-style
    // queries), so that's the only source used here, to avoid the real risk
    // of pulling in a fact from a different city and mis-tagging it.
    const [eventsResult, existingResult] = await Promise.all([
      supabaseAdmin
        .from("interaction_events")
        .select("event_type, event_data, city, created_at")
        .eq("user_id", userId)
        .eq("city", city)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("region_memory").select("memory_text").eq("user_id", userId).eq("region_key", city),
    ]);

    const events = eventsResult.data || [];
    if (events.length < 8) {
      // Not enough signal yet in this city to extract anything meaningful.
      return res.json({ saved: [], skipped: true });
    }

    const alreadyKnown = (existingResult.data || []).map((row) => row.memory_text);
    const historySummary = events.map((e) => `${e.event_type}: ${JSON.stringify(e.event_data).slice(0, 150)}`).join("\n");

    const userMessage =
      `Below is a user's recent questions and behavior while visiting ${city}. Extract up to 3 short, ` +
      `concrete, first-hand facts worth remembering about THIS PERSON specifically — a stated preference, a ` +
      `reaction, or an answer they gave — that a good local guide could naturally reference later in this ` +
      `same city (e.g. "mentioned they're vegetarian", "loved the street art near the old market", "said ` +
      `they're traveling with their kids"). Only extract things clearly grounded in what's below — never ` +
      `invent or infer beyond it. Skip anything already known` +
      `${alreadyKnown.length ? ` (already known: ${alreadyKnown.join("; ")})` : ""}. If nothing new and ` +
      `concrete stands out, return an empty list.\n\nRecent activity in ${city}:\n${historySummary}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are extracting short, concrete, first-hand facts about a specific person from their own activity. Return only what's asked for.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              memories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    sourceType: { type: "string", enum: ["stated_preference", "reaction", "answer"] },
                  },
                  required: ["text", "sourceType"],
                  additionalProperties: false,
                },
              },
            },
            required: ["memories"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: userMessage }],
    }, undefined, { endpoint: "extract-region-memory", userId });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { memories: [] };
    const memories = (parsed.memories || []).slice(0, 3);

    if (memories.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("region_memory").insert(
        memories.map((m) => ({
          user_id: userId,
          region_key: city,
          memory_text: m.text,
          source_type: m.sourceType || null,
        }))
      );
      if (insertError) console.error("[supabase] region_memory insert failed:", insertError.message);
    }

    res.json({ saved: memories });
  } catch (error) {
    console.error("[debug] /api/extract-region-memory failed:", error.message || error);
    res.status(502).json({ error: "Failed to extract region memory." });
  }
});

// Permanently deletes a user's profile, walk history, and auth account.
// Irreversible — the frontend requires an explicit confirmation tap before
// ever calling this (see settings' "Delete my account").
app.delete("/api/auth/delete-account", async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase is not configured on the server." });

  try {
    // Mostly defensive — profiles.id references auth.users with `on delete
    // cascade`, and every other table here references profiles the same
    // way, so deleteUser() below cascades through all of them regardless.
    // Still checked explicitly so a partial failure here is visible rather
    // than assumed-fine.
    const deleteResults = await Promise.all([
      supabaseAdmin.from("visited_places").delete().eq("user_id", userId),
      supabaseAdmin.from("walk_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("user_questions").delete().eq("user_id", userId),
      supabaseAdmin.from("interaction_events").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ]);
    const deleteTables = ["visited_places", "walk_sessions", "user_questions", "interaction_events", "profiles"];
    deleteResults.forEach((result, i) => {
      if (result.error) console.error(`[supabase] ${deleteTables[i]} delete failed:`, result.error.message);
    });

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("[supabase] auth.admin.deleteUser failed:", authDeleteError.message);
      return res.status(502).json({ error: "Failed to delete account." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[supabase] delete-account threw:", error.message || error);
    res.status(502).json({ error: "Failed to delete account." });
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

// Structured neighborhood/city/country — used to fill in the
// "You are currently in [neighborhood], [city], [country]" line sent with
// every narration/ask call, and the returning-user/session-save city
// fields. Never hardcoded to any specific place — always derived from
// whatever GPS reverse geocoding actually returns.
function extractLocationComponents(results) {
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

  return {
    neighborhood: componentByType.neighborhood || componentByType.sublocality || null,
    city: componentByType.locality || componentByType.postal_town || componentByType.administrative_area_level_2 || null,
    country: componentByType.country || null,
  };
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
// Real-world testing: standing inside a historically significant complex,
// narration picked a coffee roaster 10m away instead — this ranked the
// candidate pool by raw distance alone, so a slightly-closer small business
// can crowd out a more significant place from the top `limit` results
// entirely. SIGNIFICANCE_WEIGHT_METERS reuses ALLOWED_PLACE_TYPES' existing
// "how interesting is this type" ordering (see its comment) as a distance
// offset when ranking: a tourist_attraction/museum/etc. can outweigh being
// somewhat farther away than a cafe/restaurant, but everything here is
// already within CONTEXT_RADIUS_METERS by construction, so this only
// re-ranks candidates that are genuinely close to each other — a landmark
// meaningfully outside the search radius was never a candidate to begin
// with.
const SIGNIFICANCE_WEIGHT_METERS = 4;

function pickNearestPlaces(results, allowedTypes, lat, lng, heading, limit) {
  const types = allowedTypes && allowedTypes.length ? allowedTypes : ALLOWED_PLACE_TYPES;

  return results
    .filter((result) => result.geometry?.location && result.types?.some((type) => types.includes(type)))
    .map((result) => {
      const distance = distanceMeters(lat, lng, result.geometry.location.lat, result.geometry.location.lng);
      const bearing = bearingDegrees(lat, lng, result.geometry.location.lat, result.geometry.location.lng);
      const primaryType = types.find((type) => result.types?.includes(type)) || result.types?.[0];
      const typeRank = types.indexOf(primaryType);
      const significanceBonusMeters = (typeRank === -1 ? 0 : types.length - typeRank) * SIGNIFICANCE_WEIGHT_METERS;

      return {
        ...toPlaceResponse(result, primaryType),
        distanceMeters: Math.round(distance),
        bearingDegrees: Math.round(bearing),
        relativePosition: relativePositionFromHeading(heading, bearing),
        _rankingScore: distance - significanceBonusMeters,
      };
    })
    .sort((a, b) => a._rankingScore - b._rankingScore)
    .slice(0, limit)
    .map(({ _rankingScore, ...place }) => place);
}

function toPlaceResponse(result, primaryType) {
  return {
    name: result.name,
    vicinity: result.vicinity || null,
    types: result.types || [],
    primaryType,
    rating: result.rating ?? null,
    // 0 (free/very cheap) to 4 ($$$$) per Google's Nearby Search response —
    // returned automatically when Google has it, no extra request needed.
    // Used by Pillar 3's food ranking (ENABLE_NEEDS_ROUTING) — real data,
    // not guessed.
    priceLevel: typeof result.price_level === "number" ? result.price_level : null,
    placeId: result.place_id,
    photoReference: result.photos?.[0]?.photo_reference || null,
    // Was missing entirely before — every place response silently had no
    // coordinates, which meant upsertPlaceMarker's lat/lng guard (app.js)
    // rejected every single place and no map pin ever rendered.
    latitude: result.geometry?.location?.lat ?? null,
    longitude: result.geometry?.location?.lng ?? null,
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
