// Records docs/public/hero.gif and docs/public/og.png from the built docs.
//
//   npm run build
//   npm run preview -- --port 4399      (leave running, or set DOCS_URL)
//   npm run record
//
// It drives your installed Chrome with real mouse input, a fixed clock and a
// seeded Math.random, so re-running gives the same picture. Set CHROME_PATH if
// Chrome is somewhere unusual.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import gifenc from "gifenc"; // CommonJS: no named ESM exports
import pngjs from "pngjs";
import { chromium } from "playwright-core";

const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../public");
const BASE = (process.env.DOCS_URL ?? "http://localhost:4399").replace(/\/$/, "");
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable.");

// A Wednesday, so "today" sits mid-week.
const NOW = new Date("2026-10-07T10:30:00");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function open(route, viewport) {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: 1 })).newPage();
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => {
    let seed = 7;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  });
  await page.goto(BASE + route);
  await page.waitForSelector("[data-rs-slot]");
  await page.waitForTimeout(500);
  return page;
}

// --- Social card -------------------------------------------------------------
{
  const page = await open("/og/", { width: 1200, height: 630 });
  await page.screenshot({ path: path.join(publicDir, "og.png") });
  await page.context().close();
  console.log("wrote public/og.png");
}

// --- Hero GIF ----------------------------------------------------------------
const page = await open("/hero/", { width: 880, height: 440 });

// A visible cursor, since screenshots do not include the real one.
await page.evaluate(() => {
  const cursor = document.createElement("div");
  cursor.style.cssText =
    "position:fixed;left:0;top:0;width:22px;height:22px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px)";
  cursor.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L10 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cursor);
  window.addEventListener(
    "mousemove",
    (e) => (cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`),
    true
  );
});

const clip = await page.evaluate(() => {
  const r = document.querySelector(".rs-root").getBoundingClientRect();
  return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height) };
});

const slot = (resourceId, dayOfWeek) =>
  page.evaluate(
    ([rid, dow]) => {
      const el = [...document.querySelectorAll("[data-rs-slot]")].find(
        (c) => c.dataset.rsResource === rid && new Date(Number(c.dataset.rsSlot)).getDay() === dow
      );
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    [resourceId, dayOfWeek]
  );

const card = (title) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("[data-rs-event]")].find((e) => e.textContent.startsWith(t));
    if (!el) throw new Error(`No event starting with "${t}"`);
    const r = el.getBoundingClientRect();
    return { right: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }, title);

const frames = [];
const grab = async (delay) => {
  frames.push({ png: PNG.sync.read(await page.screenshot({ clip, type: "png" })), delay });
};
let at = { x: 0, y: 0 };
const glide = async (to, steps = 8, delay = 60) => {
  const from = at;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await grab(delay);
  }
  at = to;
};
const drag = async (from, to, { steps = 10, hold = 0 } = {}) => {
  await glide(from, 7);
  await grab(250);
  await page.mouse.down();
  await glide(to, steps);
  if (hold) await grab(hold);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await grab(700);
};

at = { x: clip.x + clip.width - 40, y: clip.y + 40 };
await page.mouse.move(at.x, at.y);
await grab(500);

// 1. Create: drag across two free days on Chen's row.
await drag(await slot("chen", 5), await slot("chen", 6), { steps: 6 });

// 2. Move: Ann's design review to Dana, on another day.
{
  const from = await card("Design review");
  await drag({ x: from.cx, y: from.cy }, await slot("dana", 3), { steps: 12 });
}

// 3. Conflict: Standup over Bob's API work (red), then somewhere free.
{
  const from = await card("Standup");
  await glide({ x: from.cx, y: from.cy }, 7);
  await grab(250);
  await page.mouse.down();
  await glide(await slot("bob", 1), 10);
  await grab(1100); // the red footprint
  await glide(await slot("dana", 4), 8);
  await grab(300);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await grab(700);
}

// 4. Resize: stretch Launch sync from Friday into Saturday.
{
  const from = await card("Launch sync");
  const handle = { x: from.right - 4, y: from.cy };
  await drag(handle, await slot("dana", 6), { steps: 6 });
}

await grab(1400);

// --- Encode ------------------------------------------------------------------
// Merge identical neighbours, then one shared palette for the whole animation.
const unique = [];
for (const f of frames) {
  const last = unique[unique.length - 1];
  if (last && Buffer.compare(last.png.data, f.png.data) === 0) last.delay += f.delay;
  else unique.push({ ...f });
}

const stride = 16; // sample every 4th pixel of every 3rd frame for the palette
const sample = [];
unique.forEach((f, i) => {
  if (i % 3) return;
  for (let p = 0; p < f.png.data.length; p += stride) sample.push(...f.png.data.subarray(p, p + 4));
});
const palette = quantize(new Uint8Array(sample), 128);

const { width, height } = unique[0].png;
const gif = GIFEncoder();
unique.forEach((f, i) => {
  gif.writeFrame(applyPalette(f.png.data, palette), width, height, {
    palette: i === 0 ? palette : undefined,
    delay: f.delay,
  });
});
gif.finish();
fs.writeFileSync(path.join(publicDir, "hero.gif"), gif.bytes());

const kb = Math.round(fs.statSync(path.join(publicDir, "hero.gif")).size / 1024);
console.log(`wrote public/hero.gif: ${unique.length} frames (of ${frames.length}), ${width}x${height}, ${kb} KB`);
await browser.close();
