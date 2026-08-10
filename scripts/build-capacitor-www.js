// Copies only the client-side assets Capacitor's native shell needs into
// www/ (gitignored, regenerated every time). This app has no bundler/build
// step — index.html, app.js, style.css, etc. sit at the repo root alongside
// server.js and .env, which must NEVER end up inside the native app bundle.
// Run before `npx cap sync` (or `npx cap copy`) whenever a client file
// changes. See CAPACITOR_NOTES.md for the full native-conversion context.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WWW = path.join(ROOT, "www");

const FILES_TO_COPY = [
  "index.html",
  "app.js",
  "style.css",
  "manifest.json",
  "service-worker.js",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png",
  "favicon.ico",
];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

for (const file of FILES_TO_COPY) {
  const src = path.join(ROOT, file);
  if (!fs.existsSync(src)) {
    console.warn(`[build-capacitor-www] skipping missing file: ${file}`);
    continue;
  }
  fs.copyFileSync(src, path.join(WWW, file));
}

console.log(`[build-capacitor-www] copied ${FILES_TO_COPY.length} client asset(s) into www/`);
