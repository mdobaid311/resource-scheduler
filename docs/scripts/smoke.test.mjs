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
async function open(route, { touch = false, fromStart = true, ready = "[data-rs-slot]" } = {}) {
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
  await page.waitForSelector(ready);
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

describe("suggest", () => {
  it("ranks the crew for a job, re-ranks after booking, and only accepts drops the same call allows", async () => {
    const { page, context, errors } = await open("/guides/availability/");
    const frame = page.locator(".demo-frame").nth(1);
    await frame.scrollIntoViewIfNeeded();
    const ranking = () => frame.getByRole("list", { name: "Suggestions" }).getByRole("listitem").allTextContents();
    const names = async () => (await ranking()).map((r) => r.split(",")[0]);

    // A one hour job, soonest first: Ann and Cy are free at 7, the van crew has a seat from 9, Ben from 2 PM.
    assert.deepEqual(await ranking(), [
      "Ann Lee, 7:00 AM to 8:00 AM, 33% booked",
      "Cy Ortiz, 7:00 AM to 8:00 AM, 39% booked",
      "Van crew (2), 9:00 AM to 10:00 AM, 25% booked",
      "Ben Ruiz, 2:00 PM to 3:00 PM, 31% booked",
    ]);

    // The same job ranked by how booked each is, and the other way round.
    await frame.getByLabel("Rank by").selectOption("least-booked");
    assert.deepEqual(await names(), ["Van crew (2)", "Ben Ruiz", "Ann Lee", "Cy Ortiz"]);
    await frame.getByLabel("Rank by").selectOption("most-booked");
    assert.deepEqual(await names(), ["Cy Ortiz", "Ann Lee", "Ben Ruiz", "Van crew (2)"]);

    // Three hours: Ann has no gap that long, so she drops out of the list.
    await frame.getByLabel("Job").selectOption("check");
    await frame.getByLabel("Rank by").selectOption("earliest");
    assert.deepEqual(await ranking(), [
      "Van crew (2), 9:00 AM to 12:00 PM, 25% booked",
      "Ben Ruiz, 2:00 PM to 5:00 PM, 31% booked",
      "Cy Ortiz, 4:00 PM to 7:00 PM, 39% booked",
    ]);

    // Book the one hour job: Ann wins the tie with Cy by resource order, and the list moves on.
    await frame.getByLabel("Job").selectOption("thermostat");
    await frame.getByRole("button", { name: "Book the top pick" }).click();
    assert.equal(await frame.locator(".demo-log").textContent(), 'Booked "Thermostat" with Ann Lee at 7:00 AM');
    assert.match(await label(page, "new-8"), /Thermostat.*Ann Lee.*7:00 AM/s);
    assert.deepEqual(await ranking(), [
      "Cy Ortiz, 7:00 AM to 8:00 AM, 39% booked",
      "Van crew (2), 9:00 AM to 10:00 AM, 25% booked",
      "Ann Lee, 10:30 AM to 11:30 AM, 47% booked",
      "Ben Ruiz, 2:00 PM to 3:00 PM, 31% booked",
    ]);

    // Ben's 1 PM job may not go to Cy, who is in training, but may go to Ann.
    const before = await label(page, "j4");
    await event(page, "j4").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown"); // Ben to Cy
    await page.keyboard.press("Space");
    await page.keyboard.press("Escape");
    assert.equal(await label(page, "j4"), before);

    await event(page, "j4").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp"); // Ben to Ann
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    assert.match(await label(page, "j4"), /Ann Lee.*1:00 PM/s);
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

describe("headless", () => {
  it("draws a timeline from the headless functions alone: header, lanes, recurrence and navigation", async () => {
    const { page, context, errors } = await open("/guides/build-your-own-ui/", {
      fromStart: false,
      ready: '[data-demo="headless"]',
    });
    const demo = page.locator('[data-demo="headless"]');
    const title = demo.locator("[data-demo-title]");
    const tile = (id) => demo.locator(`[data-demo-event="${id}"]`);

    // No class of the component, no stylesheet of the package: inline styles only.
    assert.equal(await demo.locator("[class]").count(), 0);
    assert.equal(await page.locator('[data-demo="headless"] .rs-root').count(), 0);

    // The week (Monday first) with the series expanded, one occurrence a weekday.
    assert.equal(await title.textContent(), "Oct 5 – Oct 11, 2026");
    assert.equal(await demo.locator('[data-demo-event^="stand::"]').count(), 5);
    assert.equal(await demo.locator("[data-demo-event]").count(), 14);

    // On Monday the standup overlaps the other event of the row, so they sit in different lanes.
    const [a, b] = await Promise.all([tile("a1").boundingBox(), tile("stand::2026-10-05").boundingBox()]);
    assert.ok(a.y + a.height <= b.y || b.y + b.height <= a.y, "overlapping events share a lane");
    assert.equal(a.x, b.x); // the same first column

    // Next week: the single events are gone, the series goes on.
    await demo.getByRole("button", { name: "Next period" }).click();
    assert.equal(await title.textContent(), "Oct 12 – Oct 18, 2026");
    assert.equal(await tile("a1").count(), 0);
    assert.equal(await tile("stand::2026-10-14").count(), 1);
    await demo.getByRole("button", { name: "Today" }).click();
    assert.equal(await title.textContent(), "Oct 5 – Oct 11, 2026");

    // Clicking an event reads it out; the day view shows the visible hours of one day.
    await tile("stand::2026-10-07").click();
    assert.equal(await demo.getByRole("status").textContent(), "Standup, Ann Lee: 9:00 AM - 9:30 AM");
    await demo.getByRole("button", { name: "Day", exact: true }).click();
    assert.equal(await title.textContent(), "October 7, 2026");
    assert.ok(await demo.getByText("9AM", { exact: true }).isVisible());
    assert.equal(await tile("a1").count(), 0); // Monday's event is not on Wednesday
    assert.equal(await tile("a3").count(), 1); // the three-day event is
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("custom timeline", () => {
  // The demo under "Drag, resize and create": useSchedulerState plus pointer handling written in the demo.
  const openCustom = async () => {
    const opened = await open("/guides/build-your-own-ui/", { fromStart: false, ready: '[data-demo="custom"]' });
    const demo = opened.page.locator('[data-demo="custom"]');
    const tile = (id) => demo.locator(`[data-demo-event="${id}"]`);
    const cellOf = (resource, column) => demo.locator(`[data-resource="${resource}"][data-slot]`).nth(column); // 0 = Monday
    // Where a tile sits inside the demo: the page scrolls while dragging, so viewport coordinates would not do.
    const top = async (id) => (await tile(id).boundingBox()).y - (await demo.boundingBox()).y;
    return { ...opened, demo, tile, cellOf, top };
  };

  it("moves an event to another resource and keeps its time of day", async () => {
    const { page, context, errors, demo, tile, cellOf, top } = await openCustom();
    const before = await top("a2");
    await mouseDrag(page, await centerOf(tile("a2")), await centerOf(cellOf("chen", 2)));
    assert.equal(await demo.getByRole("status").textContent(), 'Moved "Design review" to Chen Wu, 11:00 AM - 1:00 PM');
    assert.ok((await top("a2")) > before, "the event is now in a lower row");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("refuses a move that would double book, and leaves the event where it was", async () => {
    const { page, context, errors, demo, tile, cellOf, top } = await openCustom();
    const before = await top("d1");
    // Dana's Monday roadmap onto Bob's Tuesday, which his three-day API work covers.
    await mouseDrag(page, await centerOf(tile("d1")), await centerOf(cellOf("bob", 1)), { release: false });
    await page.waitForTimeout(100);
    // The footprint is red while the pointer is over it.
    const tinted = await cellOf("bob", 1).evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.match(tinted, /rgba\(239, 68, 68/);
    await page.mouse.up();
    await page.waitForTimeout(250);
    assert.equal(await demo.getByRole("status").textContent(), "Not allowed: that overlaps another event");
    assert.equal(await top("d1"), before);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("resizes an event from its edge", async () => {
    const { page, context, errors, demo, tile, cellOf } = await openCustom();
    const before = await tile("c1").boundingBox();
    await mouseDrag(page, await centerOf(tile("c1").locator('[data-demo-resize="end"]')), await centerOf(cellOf("chen", 2)));
    assert.equal(await demo.getByRole("status").textContent(), 'Resized "User tests", 10:00 AM - 3:00 PM');
    const after = await tile("c1").boundingBox();
    assert.ok(after.width > before.width * 1.7, "it now spans two days");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("creates an event by dragging across free cells", async () => {
    const { page, context, errors, demo, cellOf } = await openCustom();
    await mouseDrag(page, await centerOf(cellOf("dana", 1)), await centerOf(cellOf("dana", 2)));
    assert.equal(await demo.getByRole("status").textContent(), 'Created "New event" for Dana Fox, All day');
    assert.equal(await demo.locator('[data-demo-event^="new-"]').count(), 1);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("navigates and changes the view through the hook", async () => {
    const { context, errors, demo, tile } = await openCustom();
    const title = demo.locator("[data-demo-title]");
    assert.equal(await title.textContent(), "Oct 5 – Oct 11, 2026");
    await demo.getByRole("button", { name: "Next period" }).click();
    assert.equal(await title.textContent(), "Oct 12 – Oct 18, 2026");
    assert.equal(await tile("a1").count(), 0);
    await demo.getByRole("button", { name: "Today" }).click();
    assert.equal(await tile("a1").count(), 1);
    await demo.getByRole("button", { name: "Month", exact: true }).click();
    assert.equal(await title.textContent(), "October 2026");
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
