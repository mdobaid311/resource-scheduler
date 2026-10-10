// Smoke test: drives the built docs in a real Chrome with real mouse, keyboard
// and touch input, and checks the interactions people actually use.
//
//   npm run build
//   npm run preview -- --port 4399      (leave running, or set DOCS_URL)
//   npm run smoke
//
// Uses the installed Chrome (set CHROME_PATH if it is somewhere unusual) and a
// fixed clock, so "today" is Wednesday 7 October 2026 in every run. The demos
// keep their data in React state, so each test opens a fresh page.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, describe, it } from "node:test";
import { chromium } from "playwright-core";

const BASE = (process.env.DOCS_URL ?? "http://localhost:4399").replace(/\/$/, "");
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable.");

const NOW = new Date("2026-10-07T10:30:00");
const IDLE_LOG = "Try it: drag, resize or click.";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});
after(() => browser?.close());

// A fresh page on a docs route, scrolled to its first demo. Console errors are
// collected so a test can assert there were none.
async function open(route, { touch = false, fromStart = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
    hasTouch: touch,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.clock.setFixedTime(NOW);
  await page.goto(BASE + route);
  await page.waitForSelector("[data-rs-slot]");
  await page.locator(".demo-frame").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600); // the grid scrolls itself to "now" first
  if (fromStart) {
    // Measure from the left edge, so scrolling a target into view cannot move the thing being dragged.
    await page.locator(".rs-root .overflow-x-auto").first().evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    await page.waitForTimeout(100);
  }
  return { page, context, errors };
}

const log = (page) => page.locator(".demo-log").first().textContent();
const event = (page, id) => page.locator(`[data-rs-event="${id}"]`);
const label = (page, id) => event(page, id).getAttribute("aria-label");

// The cell of `resourceId` starting at `hour:minute` today (day view).
const cell = async (page, resourceId, hour, minute = 0) => {
  const handle = await page.evaluateHandle(
    ([rid, h, m]) =>
      [...document.querySelectorAll("[data-rs-slot]")].find((el) => {
        const d = new Date(Number(el.dataset.rsSlot));
        return el.dataset.rsResource === rid && d.getHours() === h && d.getMinutes() === m;
      }),
    [resourceId, hour, minute]
  );
  return handle.asElement();
};

// Works for a locator and for an element handle: both scroll and measure.
const centerOf = async (target) => {
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const mouseDrag = async (page, from, to, { release = true } = {}) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  if (release) await page.mouse.up();
  await page.waitForTimeout(250);
};

const CONFLICTS = "/guides/conflict-control/"; // day view, eventOverlap={false}, create/move/resize on
const KEYBOARD = "/guides/keyboard-and-accessibility/";

describe("mouse", () => {
  it("drags across free slots to create an event", async () => {
    const { page, context, errors } = await open(CONFLICTS);
    const before = await page.locator("[data-rs-event]").count();

    await mouseDrag(page, await centerOf(await cell(page, "chen", 9)), await centerOf(await cell(page, "chen", 9, 30)));

    assert.equal(await log(page), "Created");
    assert.equal(await page.locator("[data-rs-event]").count(), before + 1);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("moves an event to another resource", async () => {
    const { page, context, errors } = await open(CONFLICTS);
    assert.match(await label(page, "a1"), /Ann Lee/);

    await mouseDrag(page, await centerOf(event(page, "a1")), await centerOf(await cell(page, "chen", 8)));

    assert.equal(await log(page), 'Moved "Standup"');
    const moved = await label(page, "a1");
    assert.match(moved, /Chen Wu/);
    assert.match(moved, /8:00 AM/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("resizes an event from its edge", async () => {
    const { page, context, errors } = await open(CONFLICTS);
    const before = await label(page, "a1");

    const handle = event(page, "a1").locator('[data-rs-resize="end"]');
    await mouseDrag(page, await centerOf(handle), await centerOf(await cell(page, "ann", 10)));

    assert.equal(await log(page), 'Resized "Standup"');
    assert.notEqual(await label(page, "a1"), before);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("shows a red footprint over a busy slot and refuses the drop", async () => {
    const { page, context } = await open(CONFLICTS);
    const before = await label(page, "a1");

    // Bob's deep work runs 10:00 to 12:00; the standup may not land on it.
    await mouseDrag(page, await centerOf(event(page, "a1")), await centerOf(await cell(page, "bob", 10, 30)), {
      release: false,
    });
    const footprint = page.locator("[data-rs-footprint]").first();
    assert.ok((await footprint.getAttribute("class")).includes("outline-ocrs-destructive"), "footprint is red");
    await page.mouse.up();
    await page.waitForTimeout(250);

    assert.equal(await log(page), IDLE_LOG);
    assert.equal(await label(page, "a1"), before);
    await context.close();
  });

  it("measures utilization and keeps it current", async () => {
    const { page, context, errors } = await open("/guides/utilization/", { fromStart: false });
    const meters = () =>
      page.$$eval("[role=meter]", (els) => els.map((el) => `${el.getAttribute("aria-label")} ${el.textContent}`));

    const start = await meters();
    assert.equal(start.length, 5);
    assert.ok(start.includes("44 of 40 hours booked 110%"), `Bob is overbooked: ${start}`);

    // Chen's Wednesday prototype onto Thursday, when she is out: time off counts on neither side.
    const thursday = page.locator('[data-rs-resource="chen"][data-rs-slot]').nth(4);
    await mouseDrag(page, await centerOf(event(page, "c3")), await centerOf(thursday));
    assert.ok((await meters()).includes("13 of 24 hours booked 54%"));
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("keyboard", () => {
  it("picks an event up, moves it to another resource and drops it", async () => {
    const { page, context, errors } = await open(KEYBOARD);
    await event(page, "a1").focus();

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown"); // Ann to Bob
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);

    assert.equal(await log(page), 'Moved "Standup"');
    assert.match(await label(page, "a1"), /Bob Ruiz/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("cancels a pick-up with Escape", async () => {
    const { page, context } = await open(KEYBOARD);
    const before = await label(page, "a1");
    await event(page, "a1").focus();

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");

    assert.equal(await label(page, "a1"), before);
    assert.equal(await log(page), IDLE_LOG);
    await context.close();
  });
});

describe("touch", () => {
  // Real touch events through the DevTools protocol: a drag that would pan the
  // page must reach the scheduler as pointer events instead.
  const touchDrag = async (context, page, from, to) => {
    const cdp = await context.newCDPSession(page);
    const send = (type, p) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await send("touchStart", from);
    for (let i = 1; i <= 12; i++) {
      await send("touchMove", { x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 });
    }
    await send("touchEnd");
    await page.waitForTimeout(250);
  };

  it("drags an event to another resource", async () => {
    const { page, context, errors } = await open(CONFLICTS, { touch: true });

    await touchDrag(context, page, await centerOf(event(page, "a1")), await centerOf(await cell(page, "chen", 8)));

    assert.equal(await log(page), 'Moved "Standup"');
    assert.match(await label(page, "a1"), /Chen Wu/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("resizes an event from its edge", async () => {
    const { page, context } = await open(CONFLICTS, { touch: true });
    const before = await label(page, "a1");

    const handle = event(page, "a1").locator('[data-rs-resize="end"]');
    await touchDrag(context, page, await centerOf(handle), await centerOf(await cell(page, "ann", 10)));

    assert.equal(await log(page), 'Resized "Standup"');
    assert.notEqual(await label(page, "a1"), before);
    await context.close();
  });

  it("taps an empty slot to create an event", async () => {
    const { page, context } = await open(CONFLICTS, { touch: true });
    const { x, y } = await centerOf(await cell(page, "chen", 9));

    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(250);

    assert.equal(await log(page), "Created");
    await context.close();
  });
});
