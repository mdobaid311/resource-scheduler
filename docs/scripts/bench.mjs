// Measures the real component at several sizes, with and without row
// virtualization, in your installed Chrome against the built docs.
//
//   npm run build
//   npm run preview -- --port 4399      (leave running, or set DOCS_URL)
//   npm run bench                       (sizes and events per row are optional)
//   npm run bench -- 10,100,500 5
//
// What it measures, per size (median of 3 page loads):
//   first grid      from navigation start until the first cell is in the DOM
//   next week       a click on "Next period" until two animation frames later
//   drag per move   main-thread time per pointer move while carrying an event
// The data is generated with a fixed seed (src/components/demos/BenchDemo.tsx),
// so runs compare. Timings depend on the machine; compare rows, not machines.
import fs from "node:fs";
import { chromium } from "playwright-core";

const BASE = (process.env.DOCS_URL ?? "http://localhost:4399").replace(/\/$/, "");
const SIZES = (process.argv[2] ?? "10,100,300,1000").split(",").map(Number);
const EVENTS = Number(process.argv[3] ?? 5);
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable.");

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const url = (n, virtualize) =>
  `${BASE}/bench/?rows=${n}&events=${EVENTS}${virtualize ? "" : "&virtualize=false"}`;

async function measure(n, virtualize) {
  const firstGrid = [];
  const rerender = [];
  const perMove = [];
  let nodes = 0;

  for (let run = 0; run < 3; run++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      window.__t = {};
      new MutationObserver(() => {
        if (!window.__t.grid && document.querySelector('[role="grid"] [data-rs-slot]')) {
          window.__t.grid = performance.now();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(url(n, virtualize));
    await page.waitForSelector('[role="grid"] [data-rs-slot]');
    await page.waitForTimeout(400);
    firstGrid.push(await page.evaluate(() => window.__t.grid));
    nodes = await page.evaluate(() => document.querySelectorAll("*").length);

    const times = [];
    for (let i = 0; i < 3; i++) {
      times.push(
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              const t0 = performance.now();
              document.querySelector('[aria-label="Next period"]').click();
              requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
            })
        )
      );
      await page.waitForTimeout(150);
    }
    rerender.push(median(times));

    await page.goto(url(n, virtualize));
    await page.waitForSelector("[data-rs-event]");
    await page.waitForTimeout(400);
    const box = await page.locator("[data-rs-event]").first().boundingBox();
    if (box) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      const busy = async () =>
        (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "TaskDuration").value;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 4, y + 4, { steps: 2 });
      const before = await busy();
      const steps = 40;
      await page.mouse.move(x + 220, y + 90, { steps });
      perMove.push(((await busy()) - before) * 1000 / steps);
      await page.mouse.up();
    }
    await page.close();
  }

  return {
    resources: n,
    events: n * EVENTS,
    virtualized: virtualize ? "on" : "off",
    "DOM nodes": nodes,
    "first grid (ms)": Math.round(median(firstGrid)),
    "next week (ms)": Math.round(median(rerender)),
    "drag per move (ms)": Number(median(perMove).toFixed(1)),
  };
}

const rows = [];
for (const n of SIZES) {
  rows.push(await measure(n, false));
  rows.push(await measure(n, true));
}
console.table(rows);
await browser.close();
