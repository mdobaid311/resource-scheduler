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

describe("column virtualization", () => {
  it("draws only the columns near the viewport in the year view, and follows the scroll and the keyboard", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.clock.setFixedTime(NOW);
    await page.goto(BASE + "/bench/?rows=30&events=6&view=year");
    await page.waitForSelector("[data-rs-event]");

    const grid = page.locator('[role="grid"]');
    const scroller = page.locator(".rs-root .overflow-x-auto");
    const cells = () => page.locator('[data-rs-resource="r0"][data-rs-slot]');
    assert.equal(await grid.getAttribute("aria-colcount"), "365");

    // The grid scrolls to today first; the window follows it: a few dozen of 365 columns per row.
    await page.waitForFunction(() => document.querySelector(".rs-root .overflow-x-auto").scrollLeft > 30000);
    const count = await cells().count();
    assert.ok(count > 10 && count < 60, `columns per row: ${count}`);
    const widthBefore = await scroller.evaluate((el) => el.scrollWidth);

    // Jump to the end of the year: its cells are drawn, and the scrollbar still spans the whole year.
    await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await page.waitForSelector('[data-rs-slot][aria-colindex="365"]');
    assert.equal(await scroller.evaluate((el) => el.scrollWidth), widthBefore);
    assert.equal(await page.locator('[data-rs-slot][aria-colindex="1"]').count(), 0);

    // Keyboard: Home goes back to the first column, End to the last, and the cursor cell is always there.
    await grid.focus();
    await page.keyboard.press("Home");
    await page.waitForSelector('[data-rs-slot][aria-colindex="1"]');
    // The cursor cell is mounted at once; the end of the year goes when the scroll has moved the window.
    await page.waitForFunction(() => !document.querySelector('[data-rs-slot][aria-colindex="365"]'));
    await page.keyboard.press("End");
    await page.waitForSelector('[data-rs-slot][aria-colindex="365"]');
    const active = await grid.getAttribute("aria-activedescendant");
    assert.equal(await page.locator(`[id="${active}"]`).getAttribute("aria-colindex"), "365");

    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("components", () => {
  it("draws the parts you replaced and keeps the behaviour of the card", async () => {
    const { page, context, errors } = await open("/guides/components/");
    const frame = page.locator(".demo-frame").first();

    // A resource header and an event card of our own.
    assert.ok(await frame.getByText("AL", { exact: true }).isVisible());
    assert.equal(await frame.locator('[data-rs-event="a2"] strong').textContent(), "Design review");
    assert.equal(await frame.locator('[data-rs-event="a2"]').textContent(), "Design review2h");

    // The card still drags to another resource.
    const wednesday = page.locator('[data-rs-resource="bob"][data-rs-slot]').nth(3);
    await mouseDrag(page, await centerOf(event(page, "a2")), await centerOf(wednesday));
    assert.equal(await log(page), 'Moved "Design review"');
    assert.match(await label(page, "a2"), /Bob Ruiz/);

    // A popover with its own state, closed through `close`.
    await event(page, "d1").focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Mark done" }).click();
    assert.ok(await dialog.getByRole("button", { name: "Done ✓" }).isVisible());
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole("dialog").count(), 0);

    // A toolbar of our own, driving the scheduler.
    assert.ok(await frame.getByText("Oct 4 – Oct 10, 2026").isVisible());
    await frame.getByRole("button", { name: "Next period" }).click();
    assert.ok(await frame.getByText("Oct 11 – Oct 17, 2026").isVisible());
    await frame.getByRole("button", { name: "Day", exact: true }).click();
    assert.ok(await frame.getByText("Day View").isVisible());
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("column utilization", () => {
  it("adds up every resource per column, lined up with the grid", async () => {
    const { page, context, errors } = await open("/guides/utilization/");
    await page.getByLabel("Show column totals").check();
    const meters = page.getByRole("group", { name: "Utilization" }).getByRole("meter");
    assert.equal(await meters.count(), 7);

    // Monday: 46 hours available (Ann, Bob, Chen 8 each, Dana 6, the lab 2 x 8) and 44 booked.
    const monday = meters.nth(1);
    assert.match(await monday.getAttribute("aria-label"), /Monday, October 5, 2026, 44 of 46 hours booked$/);
    assert.equal(await monday.textContent(), "96%");
    assert.equal(await meters.nth(0).textContent(), "–"); // nothing is available on Sunday

    // The cell sits under the same column as the grid's Monday slots.
    const slot = await page.locator('[data-rs-resource="chen"][data-rs-slot]').nth(1).boundingBox();
    const cell = await monday.boundingBox();
    assert.ok(Math.abs(slot.x - cell.x) < 1.5 && Math.abs(slot.width - cell.width) < 1.5, `${JSON.stringify([slot, cell])}`);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("import", () => {
  it("reads a calendar file into the board and says what it could not show", async () => {
    const { page, context, errors } = await open("/guides/export/");
    const frame = page.locator(".demo-frame").nth(1);
    await frame.scrollIntoViewIfNeeded();

    // The sample has three events; the monthly "second Tuesday" rule cannot be shown, so it is imported once.
    assert.equal(await frame.locator(".demo-log").textContent(), "3 events imported");
    assert.equal(await frame.locator("[data-rs-event]").count(), 3);
    assert.match(await frame.getByLabel("Import warnings").textContent(), /retro@example\.com.*BYDAY=2TU/);

    // Edit the file and import again: a floating 3 PM event in the room named by LOCATION.
    await frame.getByLabel("Calendar file").fill(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:custom",
        "SUMMARY:Imported demo",
        "DTSTART:20261007T150000",
        "DTEND:20261007T160000",
        "LOCATION:Atlas (8 seats)",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n")
    );
    await frame.getByRole("button", { name: "Import" }).click();

    assert.equal(await frame.locator(".demo-log").textContent(), "1 event imported");
    const cards = frame.locator("[data-rs-event]");
    assert.equal(await cards.count(), 1);
    const text = await cards.first().getAttribute("aria-label");
    assert.match(text, /Imported demo/);
    assert.match(text, /Atlas/);
    assert.match(text, /3:00 PM/);
    assert.equal(await frame.getByLabel("Import warnings").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("time zones", () => {
  it("shows the same events in the zone you pick and reports the instant to store", async () => {
    const { page, context, errors } = await open("/guides/time-zones/");

    // Sprint planning is at 08:00 UTC: 5:00 PM in Tokyo (where the demo starts), 4:00 AM in New York.
    assert.match(await label(page, "t1"), /5:00 PM to 6:30 PM/);
    await page.getByLabel("Time zone").selectOption("America/New_York");
    assert.match(await label(page, "t1"), /4:00 AM to 5:30 AM/);

    // Move it one slot later with the keyboard: what is reported is the instant, 09:00 UTC.
    await event(page, "t1").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    assert.match(await log(page), /^Moved "Sprint planning": store \d{4}-\d{2}-\d{2}T09:00:00\.000Z$/);
    assert.match(await label(page, "t1"), /5:00 AM to 6:30 AM/);
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

  it("moves the start edge of a picked-up event with Shift+Alt+Arrow", async () => {
    const { page, context, errors } = await open(KEYBOARD);
    assert.match(await label(page, "a1"), /9:00 AM to 9:30 AM/);
    await event(page, "a1").focus();

    await page.keyboard.press("Space");
    await page.keyboard.press("Shift+Alt+ArrowLeft"); // start half an hour earlier
    await page.keyboard.press("Shift+Alt+ArrowLeft");
    await page.keyboard.press("Shift+ArrowRight"); // end half an hour later
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);

    assert.equal(await log(page), 'Resized "Standup"');
    assert.match(await label(page, "a1"), /8:00 AM to 10:00 AM/);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("pages with Page Down and Page Up, keeps the cursor, announces it and does not scroll the page", async () => {
    const { page, context, errors } = await open(KEYBOARD);
    const frame = page.locator(".demo-frame").first();
    const title = () => frame.locator("[aria-live=polite] span").first().textContent();
    const grid = frame.getByRole("grid");
    const activeLabel = () =>
      grid.evaluate((el) => document.getElementById(el.getAttribute("aria-activedescendant")).getAttribute("aria-label"));
    await grid.focus();
    await page.keyboard.press("ArrowRight");
    const before = await activeLabel();
    const scrollY = await page.evaluate(() => window.scrollY);
    assert.equal(await title(), "October 7, 2026");

    await page.keyboard.press("PageDown");
    await page.waitForTimeout(300);

    assert.equal(await title(), "October 8, 2026");
    assert.equal(await activeLabel(), before.replace("Wednesday, October 7", "Thursday, October 8"));
    assert.equal(await frame.getByRole("status").first().textContent(), `Moved to ${await activeLabel()}.`);
    assert.equal(await page.evaluate(() => window.scrollY), scrollY, "the page did not scroll");

    await page.keyboard.press("PageUp");
    await page.waitForTimeout(300);
    assert.equal(await title(), "October 7, 2026");
    assert.equal(await activeLabel(), before);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("keeps the cursor cell in view when paging to a shorter month", async () => {
    const { page, context, errors } = await open("/guides/loading-and-control/", { fromStart: false });
    const frame = page.locator(".demo-frame").first();
    await frame.getByRole("button", { name: "setView(Month)" }).click();
    await page.waitForTimeout(500);
    const grid = frame.getByRole("grid");
    await grid.focus();
    const cursor = () =>
      grid.evaluate((el) => {
        const cell = document.getElementById(el.getAttribute("aria-activedescendant"));
        const box = cell.getBoundingClientRect();
        const scroller = document.querySelector(".rs-root .overflow-x-auto").getBoundingClientRect();
        return { label: cell.getAttribute("aria-label"), inView: box.left >= scroller.left - 1 && box.right <= scroller.right + 1 };
      });

    await page.keyboard.press("End"); // October 31st
    assert.match((await cursor()).label, /Saturday, October 31/);

    await page.keyboard.press("PageDown"); // November has 30 days
    await page.waitForTimeout(500);
    const november = await cursor();
    assert.match(november.label, /Monday, November 30/);
    assert.ok(november.inView, "the cursor cell is on screen");
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

  it("holds and drags across empty slots to create an event", async () => {
    const { page, context, errors } = await open(CONFLICTS, { touch: true });
    const before = await page.locator("[data-rs-event]").count();
    const from = await centerOf(await cell(page, "chen", 9));
    const to = await centerOf(await cell(page, "chen", 10));

    const cdp = await context.newCDPSession(page);
    const send = (type, p) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await send("touchStart", from);
    await page.waitForTimeout(500); // the hold that starts a selection
    for (let i = 1; i <= 10; i++) {
      await send("touchMove", { x: from.x + ((to.x - from.x) * i) / 10, y: from.y });
    }
    await send("touchEnd");
    await page.waitForTimeout(250);

    assert.equal(await log(page), "Created");
    assert.equal(await page.locator("[data-rs-event]").count(), before + 1);
    assert.match(
      await page.locator('[data-rs-event][aria-label^="New Event, Chen Wu"]').getAttribute("aria-label"),
      /9:00 AM to 10:30 AM/
    );
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("leaves a quick swipe across empty slots to the browser, which scrolls", async () => {
    const { page, context } = await open(CONFLICTS, { touch: true });
    const before = await page.locator("[data-rs-event]").count();
    const from = await centerOf(await cell(page, "chen", 9));

    const cdp = await context.newCDPSession(page);
    const send = (type, p) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await send("touchStart", from);
    for (let i = 1; i <= 6; i++) await send("touchMove", { x: from.x + i * 12, y: from.y });
    await send("touchEnd");
    await page.waitForTimeout(500);

    assert.equal(await log(page), IDLE_LOG);
    assert.equal(await page.locator("[data-rs-event]").count(), before);
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
