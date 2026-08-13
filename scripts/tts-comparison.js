// One-off voice-quality investigation — NOT wired into production, NOT
// imported by server.js/app.js. The biggest beta complaint so far is that
// narration sounds robotic, and Hebrew specifically sounds bad (heavy
// American accent) — a known limitation of OpenAI's tts-1/tts-1-hd voices,
// which are optimized for English. This generates real side-by-side audio
// samples across three options so native speakers can judge quality
// directly, instead of guessing from written descriptions:
//
//   1. OpenAI tts-1     (current production default)
//   2. OpenAI tts-1-hd
//   3. Google Cloud TTS (Neural2/WaveNet)
//
// ...for all 6 languages this app currently supports (see LANGUAGE_NAMES
// in server.js), using the exact same OpenAI voice production actually
// assigns per language (see LANGUAGE_VOICE_MAP in server.js) so the
// comparison is apples-to-apples with what users hear today.
//
// Usage: node scripts/tts-comparison.js
// Requires OPENAI_API_KEY in .env (already present for the main app) and
// GOOGLE_TTS_API_KEY (not yet — Google Cloud TTS samples are skipped with
// a clear note in the report until that's added). Output goes to
// tts-comparison-output/ at the repo root (gitignored).

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const OUTPUT_DIR = path.join(__dirname, "..", "tts-comparison-output");

// Mirrors LANGUAGE_VOICE_MAP in server.js exactly — English has no entry
// there (falls back to the user's Settings preference / VOICE_CONFIG.voice
// default, "onyx"), spelled out explicitly here for a direct comparison.
const OPENAI_VOICE_BY_LANGUAGE = {
  en: "onyx",
  he: "shimmer",
  ar: "shimmer",
  es: "nova",
  fr: "nova",
  ru: "echo",
};

// Closest available Neural2/WaveNet voice per language, matched to the
// same gender as the OpenAI voice above. Google's catalog doesn't offer
// Neural2 for every language yet (Hebrew, Arabic, and Russian are
// WaveNet-only as of this writing) — falls back to WaveNet where that's
// the best available tier, noted per-entry below. NOT verified against a
// live call — GOOGLE_TTS_API_KEY isn't available in this environment yet,
// so these voice names are my best knowledge of Google's current catalog,
// not confirmed correct. If a name has been renamed/deprecated on
// Google's side, the script's per-file error handling will surface that
// clearly the first time this actually runs against the real API, rather
// than silently producing nothing.
const GOOGLE_VOICE_BY_LANGUAGE = {
  en: { languageCode: "en-US", name: "en-US-Neural2-D", ssmlGender: "MALE" },
  he: { languageCode: "he-IL", name: "he-IL-Wavenet-C", ssmlGender: "FEMALE" }, // no Neural2 for Hebrew yet
  ar: { languageCode: "ar-XA", name: "ar-XA-Wavenet-A", ssmlGender: "FEMALE" }, // no Neural2 for Arabic yet
  es: { languageCode: "es-US", name: "es-US-Neural2-A", ssmlGender: "FEMALE" },
  fr: { languageCode: "fr-FR", name: "fr-FR-Neural2-A", ssmlGender: "FEMALE" },
  ru: { languageCode: "ru-RU", name: "ru-RU-Wavenet-D", ssmlGender: "MALE" }, // no Neural2 for Russian yet
};

// A short, natural tour-guide narration segment — similar length/style to
// a real Sabri narration, not a generic test string. English written
// first, the other 5 are natural (not literal) translations of the same
// content/warmth, done by hand for this test — not run through a
// translation API, so worth a native speaker's eye on phrasing too, not
// just the audio itself.
const CONTENT = {
  en: "Look up — see the way the afternoon light catches those old stone arches? People have been walking this exact street for over a thousand years. Let's follow it down toward the market, and I'll tell you about the family who's run that spice stall on the corner since your great-grandparents' generation.",
  he: "תראו למעלה — איך שאור אחר הצהריים נוגע בקשתות האבן העתיקות האלה? אנשים הולכים ברחוב הזה כבר יותר מאלף שנה. בואו נלך בעקבותיו לכיוון השוק, ואספר לכם על המשפחה שמנהלת את דוכן התבלינים בפינה מדור הסבא-רבא שלכם.",
  es: "Miren hacia arriba: ¿ven cómo la luz de la tarde ilumina esos viejos arcos de piedra? La gente ha caminado por esta misma calle durante más de mil años. Sigámosla hasta el mercado, y les contaré la historia de la familia que lleva generaciones, desde la de sus bisabuelos, con ese puesto de especias en la esquina.",
  fr: "Levez les yeux — vous voyez comme la lumière de l'après-midi effleure ces vieilles arches en pierre ? Les gens marchent dans cette même rue depuis plus de mille ans. Suivons-la jusqu'au marché, et je vous raconterai l'histoire de la famille qui tient cet étal d'épices au coin de la rue depuis la génération de vos arrière-grands-parents.",
  ru: "Посмотрите наверх — видите, как послеполуденный свет касается этих старых каменных арок? Люди ходят по этой самой улице уже больше тысячи лет. Пойдёмте дальше, к рынку, и я расскажу вам историю семьи, которая держит эту лавку со специями на углу ещё со времён ваших прапрабабушек и прапрадедушек.",
  ar: "انظروا إلى الأعلى — هل ترون كيف يلامس ضوء بعد الظهر تلك الأقواس الحجرية القديمة؟ الناس يمشون في هذا الشارع نفسه منذ أكثر من ألف عام. لنتابع السير نحو السوق، وسأحكي لكم قصة العائلة التي تدير ذلك الدكان للتوابل في الزاوية منذ زمن أجدادكم الكبار.",
};

async function generateOpenAI(client, model, text, voice, outPath) {
  const speech = await client.audio.speech.create({ model, voice, input: text });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
}

async function generateGoogle(text, voiceConfig, apiKey, outPath) {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: voiceConfig,
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  if (!data.audioContent) throw new Error("Response had no audioContent");
  fs.writeFileSync(outPath, Buffer.from(data.audioContent, "base64"));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
  const languages = Object.keys(CONTENT);
  const results = [];

  for (const lang of languages) {
    const text = CONTENT[lang];
    const openaiVoice = OPENAI_VOICE_BY_LANGUAGE[lang];

    for (const model of ["tts-1", "tts-1-hd"]) {
      const fileSuffix = model === "tts-1" ? "tts1" : "tts1hd";
      const outPath = path.join(OUTPUT_DIR, `${lang}-${fileSuffix}.mp3`);
      try {
        if (!openaiClient) throw new Error("OPENAI_API_KEY not set");
        await generateOpenAI(openaiClient, model, text, openaiVoice, outPath);
        results.push({ lang, provider: model, voice: openaiVoice, status: "ok", file: path.basename(outPath) });
      } catch (error) {
        results.push({ lang, provider: model, voice: openaiVoice, status: "FAILED", error: error.message });
      }
    }

    const googleVoice = GOOGLE_VOICE_BY_LANGUAGE[lang];
    const googleOutPath = path.join(OUTPUT_DIR, `${lang}-google.mp3`);
    try {
      if (!GOOGLE_TTS_API_KEY) throw new Error("GOOGLE_TTS_API_KEY not set — add it to .env once generated, then re-run");
      await generateGoogle(text, googleVoice, GOOGLE_TTS_API_KEY, googleOutPath);
      results.push({ lang, provider: "google", voice: googleVoice.name, status: "ok", file: path.basename(googleOutPath) });
    } catch (error) {
      results.push({ lang, provider: "google", voice: googleVoice.name, status: "FAILED", error: error.message });
    }
  }

  console.log("\n=== TTS comparison generation report ===\n");
  for (const lang of languages) {
    console.log(`-- ${lang} --`);
    for (const r of results.filter((r) => r.lang === lang)) {
      if (r.status === "ok") {
        console.log(`  ${r.provider} (${r.voice}): OK -> ${r.file}`);
      } else {
        console.log(`  ${r.provider} (${r.voice}): FAILED -- ${r.error}`);
      }
    }
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  console.log(`\n${okCount}/${results.length} files generated successfully.`);
  console.log(`Output folder: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
