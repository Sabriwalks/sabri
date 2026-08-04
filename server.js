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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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
function resolveSpeakVoice(language, preferredVoice) {
  const languageVoice = LANGUAGE_VOICE_MAP[language];
  if (languageVoice) return languageVoice;
  return VALID_VOICES.includes(preferredVoice) ? preferredVoice : VOICE_CONFIG.voice;
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

// Makes the very first narration of a session feel like meeting a person,
// not opening a guidebook. See buildFirstNarrationContext() for the
// per-request firstVisitToCity/timeOfDay values this references.
const GREETING_AND_CONTEXT_RULES =
  "GREETING AND CONTEXT RULES:\n" +
  "- For the very first narration of every session, begin with a warm " +
  "personal greeting. Use the user's name. Comment on the weather and time " +
  "of day naturally. If this is their first visit to this city or country " +
  "(indicated by firstVisitToCity: true in the context), give 2-3 sentences " +
  "of big picture orientation before diving into place-specific content. If " +
  "they are a returning visitor, acknowledge it warmly and reference what " +
  "they saw before.\n" +
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
// nearby result matches more than one of these. Places of worship are
// ranked near the top since they're consistently rich narration material
// in almost any city Sabri gets used in, not specific to any one place.
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

// Default 100kb limit is far too small for a base64-encoded camera frame
// (/api/identify) — everything else in this app sends small JSON bodies,
// so raising the ceiling here doesn't loosen anything that mattered before.
app.use(express.json({ limit: "8mb" }));

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
  form input { background: #1A2B3D; border: 1px solid #D4A853; border-radius: 8px; padding: 10px 14px; color: #FAF7F2; font-size: 14px; }
  form button { background: #D4A853; border: none; border-radius: 8px; padding: 10px 18px; font-weight: 700; margin-left: 8px; }
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

app.use(express.static(__dirname, { index: false }));

// The 4 tables this app depends on (see supabase/schema.sql).
const REQUIRED_TABLES = [
  "profiles",
  "walk_sessions",
  "visited_places",
  "user_questions",
  "guide_personas",
  "interaction_events",
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
  const { city, country, archetype } = req.body || {};
  if (!city || !archetype || !VALID_ARCHETYPES.includes(archetype)) {
    return res.status(400).json({ error: "A valid city and archetype are required." });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase is not configured on the server." });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("guide_personas")
      .select("*")
      .eq("city", city)
      .eq("archetype", archetype)
      .maybeSingle();

    if (existing) {
      return res.json({ persona: existing, cached: true });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    }

    const archetypeDef = GUIDE_ARCHETYPES[archetype];
    const userMessage =
      `You are creating a local tour guide persona for ${city}${country ? `, ${country}` : ""}. ` +
      `This guide's core personality and focus area is: ${archetypeDef.focus}. Their tone is ${archetypeDef.tone}.\n\n` +
      `Generate:\n` +
      `1) A first name that feels authentically local/fitting to this specific city and culture — not ` +
      `necessarily a literal local name if that would feel like a stereotype, use good judgment (e.g. an ` +
      `English-speaking expat-friendly name might be more natural in some contexts)\n` +
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
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const generated = textBlock ? JSON.parse(textBlock.text) : null;
    if (!generated) return res.status(502).json({ error: "Failed to generate a persona." });

    const row = {
      city,
      country: country || null,
      archetype,
      generated_name: generated.name,
      generated_bio: generated.bio,
      style_notes: generated.styleNotes,
    };

    // onConflict handles the (rare but real) race of two users requesting
    // the same brand-new city+archetype at almost the same moment — the
    // unique constraint on (city, archetype) means the second insert
    // becomes a no-op update instead of an error, and both requests end up
    // returning the same persona rather than two different generated names.
    const { data: inserted, error } = await supabaseAdmin
      .from("guide_personas")
      .upsert(row, { onConflict: "city,archetype" })
      .select()
      .single();

    if (error) return res.status(502).json({ error: "Failed to save the generated persona." });
    res.json({ persona: inserted, cached: false });
  } catch (error) {
    res.status(502).json({ error: "Failed to get a guide persona." });
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
    `unusual historical/cultural significance. ${focusLine} ${inferredLine}\n\nPlaces:\n${candidateLines}\n\n` +
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
    });

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

    const response = await fetch(url);
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
    };

    weatherCache.set(cacheKey, { weather, timestamp: Date.now() });
    res.json({ weather });
  } catch (error) {
    res.json({ weather: null });
  }
});

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
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
    });
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

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
    });
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
function buildPersonaGuidance(persona, isFirstNarrationOfSession, isCityChange) {
  if (!persona || !persona.generated_name) return null;
  const parts = [
    `You are narrating as ${persona.generated_name}, a local guide. ${persona.generated_bio} ` +
      `Speaking style: ${persona.style_notes}. Stay in character as this specific guide throughout ` +
      `the narration while still following all other narration rules.`,
  ];
  if (isFirstNarrationOfSession) {
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
  return parts.join("\n\n");
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
    const response = await fetch(url);
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
    `like a real person talking, not a written itinerary being read aloud.\n\n` +
    `Return ONLY valid JSON, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SABRI_SYSTEM_PROMPT + "\n\n" + buildUserProfileGuidance(userProfile),
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
    });

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
    buildWeatherGuidance(weather),
    buildUserStatedIntentGuidance(userStatedDirection, userStatedDestination),
    currentEventsGuidance,
    buildNearbyInterestGuidance(nearbyInterestPlace),
    buildPersonaGuidance(persona, isFirstNarrationOfSession, isCityChange),
    buildMoodGuidance(sessionMood),
    CONNECTIVE_NARRATION_GUIDANCE,
    TRANSITION_GUIDANCE,
    buildPronunciationGuidance(languageName),
    buildLanguageGuidance(languageName),
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
    city,
    country,
    weather,
    userStatedDirection,
    userStatedDestination,
    persona,
    sessionMood,
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
    buildSessionLogGuidance(sessionLog, userProfile?.name),
    buildCrossSessionVisitedGuidance(crossSessionVisitedPlaces),
    buildWeatherGuidance(weather),
    buildUserStatedIntentGuidance(userStatedDirection, userStatedDestination),
    buildPersonaGuidance(persona, false, false),
    buildMoodGuidance(sessionMood),
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
              userStatedDestination: { anyOf: [{ type: "string" }, { type: "null" }] },
              userStatedDirection: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["answer", "locationCorrection", "userStatedDestination", "userStatedDirection"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: question }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock
      ? JSON.parse(textBlock.text)
      : { answer: "", locationCorrection: null, userStatedDestination: null, userStatedDirection: null };
    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate a response." });
  }
});

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

app.post("/api/speak", async (req, res) => {
  const { text, speed, voice, language } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
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

const IDENTIFY_SYSTEM_PROMPT =
  "You are Sabri, a warm knowledgeable tour guide. The user has pointed " +
  "their camera at something and wants to know about it. Look at the image " +
  "carefully. Identify what it is (building, landmark, artwork, street " +
  "sign, food, etc.), then tell the story of what you see in Sabri's warm " +
  "conversational style. Keep it to 2-3 paragraphs. If you cannot identify " +
  "something specific, describe what you observe and offer interesting " +
  "context about that type of thing. Always end with something that makes " +
  "the user want to explore further.";

// "Point and learn" camera feature — see CAMERA_ENABLED above for the
// kill-switch. NOTE for the eventual Capacitor/App Store conversion: this
// currently receives a base64 frame captured via getUserMedia on the
// frontend; the native camera plugin should replace getUserMedia there for
// better performance/reliability, but this endpoint itself doesn't change.
app.post("/api/identify", async (req, res) => {
  if (!CAMERA_ENABLED) {
    return res.status(404).json({ error: "Camera feature is disabled." });
  }

  const { imageBase64, mediaType } = req.body || {};
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: IDENTIFY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: resolvedMediaType, data: rawBase64 } },
            { type: "text", text: "What am I looking at?" },
          ],
        },
      ],
    });

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
  "'People & community', 'Politics & society', 'Art & creativity', 'Nature & landscape', 'All of it')\n" +
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
  "excited to guide.";

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
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock
      ? JSON.parse(textBlock.text)
      : { reply: "Sorry, could you say that again?", isComplete: false, extractedProfile: {} };
    res.json(parsed);
  } catch (error) {
    res.status(502).json({ error: "Failed to continue the onboarding conversation." });
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

  if (error) return res.status(502).json({ error: "Failed to save question." });
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
    await supabaseAdmin.from("interaction_events").insert({
      user_id: userId,
      session_id: sessionId || null,
      event_type: eventType,
      event_data: eventData && typeof eventData === "object" ? eventData : {},
      city: city || null,
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
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
      `& community, Politics & society, Art & creativity, Nature & landscape — but feel free to use a more ` +
      `specific label if the behavior clearly suggests something not on that list.`;

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
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const parsed = textBlock ? JSON.parse(textBlock.text) : { inferredInterests: [] };

    await supabaseAdmin
      .from("profiles")
      .update({ inferred_interests: parsed.inferredInterests || [] })
      .eq("id", userId);

    res.json({ inferredInterests: parsed.inferredInterests || [] });
  } catch (error) {
    res.status(502).json({ error: "Failed to infer interests." });
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
    await Promise.all([
      supabaseAdmin.from("visited_places").delete().eq("user_id", userId),
      supabaseAdmin.from("walk_sessions").delete().eq("user_id", userId),
      supabaseAdmin.from("user_questions").delete().eq("user_id", userId),
      supabaseAdmin.from("interaction_events").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("id", userId),
    ]);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
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
