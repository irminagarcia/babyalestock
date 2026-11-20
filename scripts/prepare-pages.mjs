/**
 * Adapt OpenNext Workers output for Cloudflare Pages Advanced Mode.
 * Pages expects `_worker.js` in the deploy directory (not Workers `main`).
 *
 * Layout after this script (deploy root = `.open-next`):
 *   _worker.js, _routes.json, static assets at root, plus OpenNext server chunks.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const openNext = path.join(root, ".open-next");
const workerSrc = path.join(openNext, "worker.js");
const workerDest = path.join(openNext, "_worker.js");
const assetsDir = path.join(openNext, "assets");

if (!fs.existsSync(workerSrc)) {
  console.error(
    "prepare-pages: missing .open-next/worker.js — run opennextjs-cloudflare build first",
  );
  process.exit(1);
}

fs.copyFileSync(workerSrc, workerDest);
console.log("prepare-pages: wrote .open-next/_worker.js");

/** Copy static assets to deploy root so Pages can serve them directly. */
function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (fs.existsSync(assetsDir)) {
  for (const name of fs.readdirSync(assetsDir)) {
    copyRecursive(path.join(assetsDir, name), path.join(openNext, name));
  }
  console.log("prepare-pages: copied assets/ → .open-next/");
}

const routesPath = path.join(openNext, "_routes.json");
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/brand/*",
    "/favicon.ico",
    "/_headers",
    "/*.ico",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.webp",
    "/*.svg",
    "/*.txt",
  ],
};
fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2) + "\n");
console.log("prepare-pages: wrote .open-next/_routes.json");
console.log(
  "prepare-pages: ready for: npx wrangler pages deploy .open-next --project-name=babyalestock --branch=main",
);
