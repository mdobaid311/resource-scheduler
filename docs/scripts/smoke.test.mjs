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
// What a demo log says before anything happens (every demo these tests open has a caption).
const IDLE_LOG = "What you do shows up here.";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});
after(() => browser?.close());

// A fresh page on a docs route, scrolled to its first demo. Console errors are
// collected so a test can assert there were none.
async function open(route, { touch = false, fromStart = true, ready = "[data-rs-slot]", viewport = { width: 1280, height: 1100 } } = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: touch,
  });
  // Vercel Analytics script only exists on Vercel; stub it so its 404 is not a console error.
  await context.route("**/_vercel/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
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

    // The sample has three events; the yearly "day 100" rule cannot be shown, so it is imported once.
    assert.equal(await frame.locator(".demo-log").textContent(), "3 events imported");
    assert.equal(await frame.locator("[data-rs-event]").count(), 3);
    assert.match(await frame.getByLabel("Import warnings").textContent(), /retro@example\.com.*BYYEARDAY/);

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

// Chrome writes the page count into the page tree as "/Count n".
const pdfPages = (pdf) => Math.max(...[...pdf.toString("latin1").matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1])));

describe("printing", () => {
  const rows = (page) => page.evaluate(() => document.querySelectorAll('.rs-grid [role="row"]').length);

  it("draws every row for paper, without the controls, fitted to the page width, and goes back", async () => {
    const { page, context, errors } = await open("/guides/printing/");
    assert.ok((await rows(page)) < 24, "the demo draws only a window on screen");
    assert.equal(await page.locator(".rs-toolbar button").first().isVisible(), true);

    await page.emulateMedia({ media: "print" });
    await page.waitForFunction(() => document.querySelectorAll('.rs-grid [role="row"]').length === 24);
    const paper = await page.evaluate(() => {
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      return {
        // Rendered or not: the view buttons sit in a group that is hidden as a whole.
        controls: [...document.querySelectorAll(".rs-toolbar button, .rs-toolbar [role=combobox]")].map((el) => el.checkVisibility()),
        title: document.querySelector(".rs-toolbar").innerText,
        scroll: style(".rs-scroll").overflowX,
        header: style(".rs-header").position,
        resources: style(".rs-resources").position,
        columns: style(".rs-grid").gridTemplateColumns.split(" ").length,
        right: document.querySelector(".rs-grid").getBoundingClientRect().right,
        page: document.documentElement.clientWidth,
      };
    });
    assert.ok(paper.controls.length >= 4 && paper.controls.every((visible) => !visible), "arrows, Today and the view switch are gone");
    assert.match(paper.title, /Oct 4 – Oct 10, 2026/); // the title stays
    assert.equal(paper.scroll, "visible");
    assert.equal(paper.header, "static");
    assert.equal(paper.resources, "static");
    assert.equal(paper.columns, 7);
    assert.ok(paper.right <= paper.page, "the columns fit the page width");

    await page.emulateMedia({ media: "screen" });
    await page.waitForFunction(() => document.querySelectorAll('.rs-grid [role="row"]').length < 24);
    assert.equal(await page.locator(".rs-toolbar button").first().isVisible(), true);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("prints every page of a board of 300 resources, not the window", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.clock.setFixedTime(NOW);
    await page.goto(`${BASE}/bench/?rows=300&events=5`);
    await page.waitForSelector("[data-rs-slot]");
    await page.waitForTimeout(600);
    assert.ok((await rows(page)) < 40, "a window on screen");

    // page.pdf prints like Ctrl+P: beforeprint, print layout, afterprint. Printing only the window gave 1 page.
    const pdf = await page.pdf({ landscape: true, format: "A4" });
    assert.ok(pdfPages(pdf) > 20, `300 rows are many pages, got ${pdfPages(pdf)}`);
    await page.waitForFunction(() => document.querySelectorAll('.rs-grid [role="row"]').length < 40);
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
    assert.equal(await demo.getByRole("status").textContent(), "Standup, Ann Lee: 9:00 AM – 9:30 AM");
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
    assert.equal(await demo.getByRole("status").textContent(), 'Moved "Design review" to Chen Wu, 11:00 AM – 1:00 PM');
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
    assert.equal(await demo.getByRole("status").textContent(), 'Resized "User tests", 10:00 AM – 3:00 PM');
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

describe("reorder", () => {
  // The second demo on the resource groups page: three groups, Annex folded, onGroupReorder and
  // onResourceReorder applied with reorderGroup and moveResource.
  const openReorder = async ({ touch = false } = {}) => {
    const opened = await open("/guides/resource-groups/", { touch });
    const frame = opened.page.locator(".demo-frame").nth(1);
    await frame.scrollIntoViewIfNeeded();
    await opened.page.waitForTimeout(300);
    return { ...opened, frame };
  };
  const header = (frame, name) => frame.getByRole("button", { name: new RegExp(`^${name}, \\d resource`) });
  const room = (frame, name) => frame.locator("[data-rs-row]").filter({ hasText: new RegExp(`^${name}$`) }).first();
  const grip = (row) => row.locator("[data-rs-handle]");
  const rows = async (frame) =>
    (
      await frame
        .locator("[data-rs-row]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")?.split(",")[0] ?? el.textContent.trim()))
    ).join("|");
  const dropLine = (frame) => frame.locator("[data-rs-drop-line]");
  const demoLog = (frame) => frame.locator(".demo-log").textContent();
  const announced = (frame) => frame.locator(".rs-root > [role=status]").textContent();
  const START = "Floor 1|Atlas|Borealis|Floor 2|Cirrus|Delta|Annex";

  it("drags a group, with its rooms, before another", async () => {
    const { page, context, frame, errors } = await openReorder();
    assert.equal(await rows(frame), START);

    const from = await centerOf(grip(header(frame, "Floor 2")));
    const top = await header(frame, "Floor 1").boundingBox();
    await mouseDrag(page, from, { x: top.x + 100, y: top.y + 6 }, { release: false });
    assert.equal(await dropLine(frame).count(), 1, "a line shows where it will land");
    await page.mouse.up();
    await page.waitForTimeout(200);

    assert.equal(await rows(frame), "Floor 2|Cirrus|Delta|Floor 1|Atlas|Borealis|Annex");
    assert.equal(await demoLog(frame), 'Moved "Floor 2" before "Floor 1"');
    assert.equal(await dropLine(frame).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("drops a room on a group header, and before another room", async () => {
    const { page, context, frame, errors } = await openReorder();

    await mouseDrag(page, await centerOf(grip(room(frame, "Cirrus"))), await centerOf(header(frame, "Floor 1")));
    assert.equal(await rows(frame), "Floor 1|Atlas|Borealis|Cirrus|Floor 2|Delta|Annex");
    assert.equal(await demoLog(frame), 'Moved Cirrus to the end of "Floor 1"');

    const atlas = await room(frame, "Atlas").boundingBox();
    await mouseDrag(page, await centerOf(grip(room(frame, "Delta"))), { x: atlas.x + 90, y: atlas.y + 6 });
    assert.equal(await rows(frame), "Floor 1|Delta|Atlas|Borealis|Cirrus|Annex"); // Floor 2 had only Delta
    assert.equal(await demoLog(frame), 'Moved Delta before Atlas of "Floor 1"');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("moves a folded group with its rooms, and Escape cancels a drag", async () => {
    const { page, context, frame } = await openReorder();
    const from = await centerOf(grip(header(frame, "Annex")));
    const top = await header(frame, "Floor 1").boundingBox();

    await mouseDrag(page, from, { x: top.x + 100, y: top.y + 6 }, { release: false });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.equal(await rows(frame), START);
    assert.equal(await dropLine(frame).count(), 0);

    await mouseDrag(page, from, { x: top.x + 100, y: top.y + 6 });
    assert.equal(await rows(frame), `Annex|Floor 1|Atlas|Borealis|Floor 2|Cirrus|Delta`);
    await header(frame, "Annex").click();
    assert.equal(await rows(frame), "Annex|Echo|Foxtrot|Floor 1|Atlas|Borealis|Floor 2|Cirrus|Delta");
    await context.close();
  });

  it("does not fold a group when its grip is clicked", async () => {
    const { page, context, frame } = await openReorder();
    const { x, y } = await centerOf(grip(header(frame, "Floor 1")));
    await page.mouse.click(x, y);
    assert.equal(await header(frame, "Floor 1").getAttribute("aria-expanded"), "true");
    assert.equal(await rows(frame), START);
    await context.close();
  });

  it("moves a group or a room with Alt+Arrow, says so, and keeps the focus", async () => {
    const { page, context, frame, errors } = await openReorder();

    await header(frame, "Floor 2").focus();
    await page.keyboard.press("Alt+ArrowUp");
    await page.waitForTimeout(150);
    assert.equal(await rows(frame), "Floor 2|Cirrus|Delta|Floor 1|Atlas|Borealis|Annex");
    assert.equal(await announced(frame), "Floor 2 moved to position 1 of 3.");
    assert.ok(await header(frame, "Floor 2").evaluate((el) => el === document.activeElement));

    await room(frame, "Borealis").focus();
    await page.keyboard.press("Alt+ArrowUp");
    await page.keyboard.press("Alt+ArrowUp"); // past the top of Floor 1: into the end of Floor 2
    await page.waitForTimeout(150);
    assert.equal(await rows(frame), "Floor 2|Cirrus|Delta|Borealis|Floor 1|Atlas|Annex");
    assert.equal(await announced(frame), "Borealis moved to Floor 2, position 3 of 3.");
    assert.ok(await room(frame, "Borealis").evaluate((el) => el === document.activeElement));

    await header(frame, "Floor 2").focus();
    await page.keyboard.press("Alt+ArrowUp"); // already first
    assert.equal(await announced(frame), "Can't go any further.");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("drags a group from its grip with touch", async () => {
    const { page, context, frame, errors } = await openReorder({ touch: true });
    const cdp = await context.newCDPSession(page);
    const send = (type, p) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    const from = await centerOf(grip(header(frame, "Annex")));
    const top = await header(frame, "Floor 1").boundingBox();

    await send("touchStart", from);
    for (let i = 1; i <= 12; i++) await send("touchMove", { x: from.x, y: from.y + ((top.y + 6 - from.y) * i) / 12 });
    assert.equal(await dropLine(frame).count(), 1);
    await send("touchEnd");
    await page.waitForTimeout(250);

    assert.equal(await rows(frame), "Annex|Floor 1|Atlas|Borealis|Floor 2|Cirrus|Delta");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("scrolls the column while a drag is held near its edge", async () => {
    const { page, context, frame } = await openReorder();
    await header(frame, "Annex").click(); // unfolded, the list is taller than the demo
    const scroller = frame.locator(".overflow-x-auto").first();
    const before = await scroller.evaluate((el) => el.scrollTop);
    const box = await scroller.boundingBox();

    await mouseDrag(page, await centerOf(grip(room(frame, "Atlas"))), { x: box.x + 60, y: box.y + box.height - 8 }, { release: false });
    await page.waitForTimeout(600);
    const after = await scroller.evaluate((el) => el.scrollTop);
    await page.mouse.up();

    assert.ok(after > before, `scrollTop went from ${before} to ${after}`);
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

describe("room booking tutorial", () => {
  it("books free time through its own form and refuses booked time", async () => {
    const { page, context, errors } = await open("/tutorials/react-room-booking-calendar/");
    const eventCount = () => page.locator("[data-rs-event]").count();
    const before = await eventCount();

    // Atlas is booked 9:00 to 10:30 today: selecting there opens no form.
    await mouseDrag(page, await centerOf(await cell(page, "atlas", 9)), await centerOf(await cell(page, "atlas", 10)));
    assert.equal(await page.locator(".demo-form").count(), 0);

    // Free time on Borealis opens the form; submitting books it.
    await mouseDrag(page, await centerOf(await cell(page, "borealis", 13)), await centerOf(await cell(page, "borealis", 13, 30)));
    await page.waitForSelector(".demo-form");
    await page.locator(".demo-form").getByLabel("Title").fill("Design review");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), 'Booked "Design review"');
    assert.equal(await eventCount(), before + 1);

    // The new booking blocks the same time for the next person.
    await mouseDrag(page, await centerOf(await cell(page, "borealis", 13)), await centerOf(await cell(page, "borealis", 13, 30)));
    assert.equal(await page.locator(".demo-form").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("shift planner tutorial", () => {
  it("refuses cover past the weekly hours cap and allows it within", async () => {
    const { page, context, errors } = await open("/tutorials/react-shift-planner/");
    // The week view: a cell is a person's day. Today is Wednesday 7 October, so Monday is the 5th.
    const day = async (rid, date) => {
      const h = await page.evaluateHandle(
        ([r, d]) =>
          [...document.querySelectorAll("[data-rs-slot]")].find(
            (el) => el.dataset.rsResource === r && new Date(Number(el.dataset.rsSlot)).getDate() === d
          ),
        [rid, date]
      );
      return h.asElement();
    };
    const home = () => page.locator(".rs-root .overflow-x-auto").first().evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    const drag = async (shiftId, rid, date) => {
      await home();
      await mouseDrag(page, await centerOf(event(page, shiftId)), await centerOf(await day(rid, date)));
    };
    const cyFriday = "cy-early::2026-10-09";
    assert.match(await label(page, cyFriday), /Cy Ortiz/);

    // Ann already works 32 hours that week: a fifth shift is refused and nothing moves.
    await drag(cyFriday, "ann", 9);
    assert.match(await label(page, cyFriday), /Cy Ortiz/);

    // Dee has no shifts and works Tuesdays: she covers Ann for that day only, which frees 8 hours.
    await drag("ann-early::2026-10-06", "dee", 6);
    assert.equal(await log(page), "Moved Early to Dee Park");
    assert.equal(await event(page, "ann-early::2026-10-06").count(), 0);
    assert.match(await label(page, "ann-early::2026-10-07"), /Ann Lee/); // the rest of the series stays

    // The same drop is now allowed: Ann is at 24 hours.
    await drag(cyFriday, "ann", 9);
    assert.equal(await log(page), "Moved Early to Ann Lee");
    assert.equal(await event(page, cyFriday).count(), 0); // now a one-off shift on Ann's row

    // The form applies the same cap to a new shift: Ann is full again, and Tuesday is free in her row.
    await home();
    const free = await centerOf(await day("ann", 6));
    await page.mouse.click(free.x, free.y);
    await page.waitForSelector(".demo-form");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), "Ann Lee would pass 32 hours this week");
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("clinic appointment board tutorial", () => {
  it("refuses a visit with no gap, books through the form, and books the next free visit", async () => {
    const { page, context, errors } = await open("/tutorials/react-clinic-appointment-board/");
    const tap = async (target) => {
      const c = await centerOf(target);
      await page.mouse.click(c.x, c.y);
    };
    // Grab a visit by its left edge and drop that edge on a slot, so the slot under the pointer is the new start.
    const leftEdge = async (target) => {
      await target.scrollIntoViewIfNeeded();
      const b = await target.boundingBox();
      return { x: b.x + 3, y: b.y + b.height / 2 };
    };
    const tanaka = "v5"; // Dr Brown, 9:00 to 9:30
    assert.match(await label(page, tanaka), /Dr Brown/);

    // Singh (Nurse Cho) ends at 9:30, so a visit at 9:30 has no gap: refused, nothing moves.
    await mouseDrag(page, await leftEdge(event(page, tanaka)), await leftEdge(await cell(page, "cho", 9, 30)));
    assert.match(await label(page, tanaka), /Dr Brown/);

    // 9:45 leaves the 15 minute gap: allowed.
    await mouseDrag(page, await leftEdge(event(page, tanaka)), await leftEdge(await cell(page, "cho", 9, 45)));
    assert.equal(await log(page), "Moved Tanaka to Nurse Cho at 9:45 AM");
    assert.match(await label(page, tanaka), /Nurse Cho/);

    // Lunch is shaded and cannot be selected: no form.
    await tap(await cell(page, "ahmed", 12));
    assert.equal(await page.locator(".demo-form").count(), 0);

    // 8:00 is a free slot, but a 30 minute visit there would touch Patel's gap: the form says so.
    await tap(await cell(page, "ahmed", 8));
    await page.waitForSelector(".demo-form");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), "8:00 AM to 8:30 AM does not fit for Dr Ahmed");

    // 14:00 is free: book with the form.
    await page.click('.demo-form button[type="button"]');
    await tap(await cell(page, "ahmed", 14));
    await page.waitForSelector(".demo-form");
    await page.fill('.demo-form input[aria-label="Patient"]', "Garcia");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), "Booked Garcia with Dr Ahmed at 2:00 PM");

    // It is 10:30: Dr Brown is the first clinician free from now on.
    await page.click(".demo-controls button");
    await page.waitForTimeout(250);
    assert.equal(await log(page), "Booked Walk-in with Dr Brown at 10:30 AM");
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("equipment rental tutorial", () => {
  it("refuses a full pool and a service day, rents through the form, and finds free days", async () => {
    const { page, context, errors } = await open("/tutorials/react-equipment-rental-calendar/");
    // The week view: a cell is an item's day. Today is Wednesday 7 October, so Monday is the 5th.
    const day = async (rid, date) => {
      const h = await page.evaluateHandle(
        ([r, d]) =>
          [...document.querySelectorAll("[data-rs-slot]")].find(
            (el) => el.dataset.rsResource === r && new Date(Number(el.dataset.rsSlot)).getDate() === d
          ),
        [rid, date]
      );
      return h.asElement();
    };
    const home = () => page.locator(".rs-root .overflow-x-auto").first().evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
    const drag = async (rentalId, rid, date) => {
      await home();
      await mouseDrag(page, await centerOf(event(page, rentalId)), await centerOf(await day(rid, date)));
    };
    const delivery = "r8"; // the van, Thursday
    assert.match(await label(page, delivery), /Van/);

    // Tuesday: all three projectors are out, so a fourth booking is refused and nothing moves.
    await drag(delivery, "projector", 6);
    assert.match(await label(page, delivery), /Van/);

    // Wednesday is the PA system's service day: refused too.
    await drag(delivery, "pa", 7);
    assert.match(await label(page, delivery), /Van/);

    // Monday on the projectors has room (one of three out): allowed.
    await drag(delivery, "projector", 5);
    assert.equal(await log(page), "Moved Delivery to Projector (3 units)");
    assert.match(await label(page, delivery), /Projector/);

    // A service day cannot be selected: no form.
    await home();
    let free = await centerOf(await day("pa", 7));
    await page.mouse.click(free.x, free.y);
    assert.equal(await page.locator(".demo-form").count(), 0);

    // A free day can: rent the van on Wednesday through the form.
    free = await centerOf(await day("van", 7));
    await page.mouse.click(free.x, free.y);
    await page.waitForSelector(".demo-form");
    await page.fill('.demo-form input[aria-label="Customer"]', "Garcia");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), "Rented Van");
    assert.equal(await page.locator(".demo-form").count(), 0);

    // Three free days for the PA system: Wednesday is serviced and the wedding runs from Friday, so the 12th.
    await page.selectOption('select[aria-label="Days"]', "3");
    await page.selectOption('select[aria-label="Item"]', "pa");
    await page.click(".demo-controls button");
    await page.waitForTimeout(250);
    assert.match(await log(page), /^PA system is free for 3 days from .*12/);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("Next.js and Prisma tutorial", () => {
  it("books free time through its form and refuses booked time", async () => {
    const { page, context, errors } = await open("/tutorials/react-room-booking-nextjs-prisma/");
    const eventCount = () => page.locator("[data-rs-event]").count();
    const before = await eventCount();

    // Atlas is booked 9:00 to 10:30 today: selecting there opens no form.
    await mouseDrag(page, await centerOf(await cell(page, "atlas", 9)), await centerOf(await cell(page, "atlas", 10)));
    assert.equal(await page.locator(".demo-form").count(), 0);

    // Free time on Borealis opens the form; submitting books it.
    await mouseDrag(page, await centerOf(await cell(page, "borealis", 13)), await centerOf(await cell(page, "borealis", 13, 30)));
    await page.waitForSelector(".demo-form");
    await page.locator(".demo-form").getByLabel("Title").fill("Standup");
    await page.click('.demo-form button[type="submit"]');
    await page.waitForTimeout(250);
    assert.equal(await log(page), 'Booked "Standup"');
    assert.equal(await eventCount(), before + 1);

    // The new booking blocks the same time for the next person.
    await mouseDrag(page, await centerOf(await cell(page, "borealis", 13)), await centerOf(await cell(page, "borealis", 13, 30)));
    assert.equal(await page.locator(".demo-form").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("tutorial", () => {
  it("moves a booking to another row and refuses an overlap", async () => {
    const { page, context, errors } = await open("/tutorials/free-react-resource-timeline/");
    const slot = async (rid, day) => {
      const h = await page.evaluateHandle(
        ([r, d]) =>
          [...document.querySelectorAll("[data-rs-slot]")].find(
            (el) => el.dataset.rsResource === r && new Date(Number(el.dataset.rsSlot)).getDate() === d
          ),
        [rid, day]
      );
      return h.asElement();
    };
    assert.equal(await page.locator("[data-rs-event]").count(), 4);

    // Monday 5 October on Bob is taken by "API work": refused, nothing moves.
    await mouseDrag(page, await centerOf(event(page, "1")), await centerOf(await slot("bob", 5)));
    assert.match(await label(page, "1"), /Ann Lee/);

    // Chen is free on Monday.
    await mouseDrag(page, await centerOf(event(page, "1")), await centerOf(await slot("chen", 5)));
    assert.equal(await log(page), 'Moved "Standup"');
    assert.match(await label(page, "1"), /Chen Wu/);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("showcase", () => {
  const heading = (page) => page.locator("main h1").textContent();
  const headingIs = (page, text) =>
    page.waitForFunction((t) => document.querySelector("main h1")?.textContent === t, text);

  it("follows the address: a hash link and Back switch the demo", async () => {
    const { page, context, errors } = await open("/showcase/#room-booking", { fromStart: false });
    assert.equal(await heading(page), "Room booking");

    await page.evaluate(() => (location.hash = "conflict-control"));
    await headingIs(page, "Conflict control");
    await page.goBack();
    await headingIs(page, "Room booking");

    // Picking from the sidebar adds a history entry, so Back returns to the demo before it.
    await page.getByRole("tab", { name: "Week view" }).click();
    await headingIs(page, "Week view");
    await page.goBack();
    await headingIs(page, "Room booking");
    assert.deepEqual(errors, []);
    await context.close();
  });

  it("picks a demo from a grouped list on a phone, with a way back to the docs", async () => {
    const { page, context, errors } = await open("/showcase/#room-booking", {
      fromStart: false,
      viewport: { width: 375, height: 812 },
    });
    assert.equal(await page.getByRole("tablist").isVisible(), false);
    assert.equal(await page.getByRole("link", { name: "Docs", exact: true }).isVisible(), true);

    const picker = page.getByRole("combobox", { name: "Demo" });
    assert.equal(await picker.locator("optgroup").count(), 6);
    await picker.selectOption("utilization");
    await headingIs(page, "Utilization");
    assert.match(page.url(), /#utilization$/);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
