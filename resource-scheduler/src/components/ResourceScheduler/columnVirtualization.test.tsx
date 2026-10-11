import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, ViewType } from "./types";

// jsdom has no layout: give every element a 1000 px wide viewport. Column
// widths are the defaults (140 px), so the first window is columns 0 to 13:
// ceil((0 + 320 px step + 1000 px + 640 px overscan) / 140) = 14.
let width = 1000;
const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");

beforeEach(() => {
  width = 1000;
  Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get: () => width });
  Element.prototype.scrollTo = vi.fn();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (clientWidth) Object.defineProperty(Element.prototype, "clientWidth", clientWidth);
});

const day = (month: number, date: number, hour = 9) => new Date(2026, month, date, hour);
const team = (): Resource[] => [
  {
    id: "ann",
    name: "Ann",
    events: [
      { id: "jan", title: "January", startDate: day(0, 5), endDate: day(0, 6) }, // column 4
      { id: "jun", title: "June", startDate: day(5, 10), endDate: day(5, 11) }, // column 160
      { id: "dec", title: "December", startDate: day(11, 20), endDate: day(11, 21) }, // column 353
    ],
  },
  { id: "bob", name: "Bob", events: [] },
];
const year = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
  render(<ResourceScheduler resources={team()} initialDate={new Date(2026, 9, 7)} initialView={ViewType.Year} {...props} />);
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

const slots = (resource: string) => [...document.querySelectorAll<HTMLElement>(`[data-rs-resource="${resource}"][data-rs-slot]`)];
// Cells and headers are placed with an explicit grid column (1-based).
const columnOf = (el: HTMLElement) => Number(el.style.gridColumnStart || el.style.gridColumn) - 1;
const columns = (resource: string) => slots(resource).map(columnOf);
const scroller = () => document.querySelector<HTMLElement>(".overflow-x-auto")!;
const scrollTo = (left: number) => {
  scroller().scrollLeft = left;
  fireEvent.scroll(scroller());
};
const events = () => [...document.querySelectorAll<HTMLElement>("[data-rs-event]")].map((e) => e.dataset.rsEvent);
const press = (el: Element, key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(el, { key, ...init });

describe("virtualizeColumns", () => {
  it("renders only the columns near the viewport in the year view", () => {
    year();
    expect(screen.getByRole("grid").getAttribute("aria-colcount")).toBe("365");
    expect(columns("ann")).toEqual(range(0, 14));
    expect(columns("bob")).toEqual(range(0, 14));
  });

  it("renders only the matching column headers, at their own column", () => {
    year();
    const headers = [...document.querySelectorAll<HTMLElement>("div.grid.sticky.top-0 > div")];
    expect(headers.map(columnOf)).toEqual(range(0, 14));
  });

  it("draws the events that fall in the window and leaves the others out", () => {
    year();
    expect(events()).toEqual(["jan"]);
  });

  it("follows the scroll position", () => {
    year();
    scrollTo(30 * 140);
    // 4200 px rounds down to a 320 px step (4160): (4160 - 640) / 140 = 25 to (4160 + 1320 + 640) / 140 = 44.
    expect(columns("ann")).toEqual(range(25, 44));

    scrollTo(160 * 140); // June
    expect(events()).toEqual(["jun"]);
    scrollTo(345 * 140); // December
    expect(events()).toEqual(["dec"]);
  });

  it("keeps the window for a small scroll, and moves it every step", () => {
    year();
    const first = slots("ann")[0];
    scrollTo(100);
    expect(slots("ann")[0]).toBe(first); // the same node: nothing re-rendered
    scrollTo(2000);
    expect(columns("ann")[0]).toBe(9); // (1920 - 640) / 140
  });

  it("measures from the right edge in a right-to-left layout, where scrollLeft is negative", () => {
    year({ dir: "rtl" });
    expect(columns("ann")).toEqual(range(0, 14));
    scrollTo(-30 * 140);
    expect(columns("ann")).toEqual(range(25, 44));
  });

  it("uses the width of the viewport", () => {
    width = 2000;
    year();
    expect(columns("ann")).toEqual(range(0, 22)); // ceil((320 + 2000 + 640) / 140)
  });

  it("is off in views with few columns, and can be forced on or off", () => {
    year({ initialView: ViewType.Week });
    expect(slots("ann")).toHaveLength(7);
    cleanup();

    year({ virtualizeColumns: false });
    expect(slots("ann")).toHaveLength(365);
    cleanup();

    year({ initialView: ViewType.Month, virtualizeColumns: true });
    expect(screen.getByRole("grid").getAttribute("aria-colcount")).toBe("31");
    expect(columns("ann")).toEqual(range(0, 14));
  });

  it("draws every column when it cannot measure: no width, or a width that is not in px", () => {
    width = 0;
    year();
    expect(slots("ann")).toHaveLength(365);
    cleanup();

    width = 1000;
    year({ dateColumnWidth: "10rem" });
    expect(slots("ann")).toHaveLength(365);
  });

  it("keeps the keyboard cursor cell, even when the cursor jumps far away", () => {
    year();
    const grid = screen.getByRole("grid");
    act(() => grid.focus());
    press(grid, "End"); // the last column
    const cell = document.getElementById(grid.getAttribute("aria-activedescendant")!)!;
    expect(cell).toBeTruthy();
    expect(columnOf(cell)).toBe(364);
    expect(cell.getAttribute("aria-colindex")).toBe("365");

    press(grid, "Home");
    expect(columnOf(document.getElementById(grid.getAttribute("aria-activedescendant")!)!)).toBe(0);
  });

  it("keeps an event that is picked up mounted while it travels far from the window", () => {
    const onEventDrop = vi.fn();
    year({ onEventDrop });
    const card = document.querySelector<HTMLElement>('[data-rs-event="jan"]')!;
    act(() => card.focus());
    press(card, " ");
    for (let i = 0; i < 40; i++) press(card, "ArrowRight"); // 40 days on, well outside columns 0 to 13
    expect(events()).toContain("jan");
    press(card, " ");
    expect(onEventDrop).toHaveBeenCalledWith(expect.objectContaining({ id: "jan" }), "ann", "ann", day(1, 14), day(1, 15));
  });

  it("windows the totals row too, and keeps its cells in their columns", () => {
    year({ showColumnUtilization: true });
    const meters = [...document.querySelectorAll<HTMLElement>('[role="group"] [role="meter"]')];
    expect(meters.map(columnOf)).toEqual(range(0, 14));
  });

  it("selects slots by dragging, as before", () => {
    const onSlotSelect = vi.fn();
    year({ onSlotSelect });
    const cells = slots("ann");
    fireEvent.mouseDown(cells[2]);
    fireEvent.mouseEnter(cells[4]);
    fireEvent.mouseUp(window);
    expect(onSlotSelect).toHaveBeenCalledWith({ resourceId: "ann", start: new Date(2026, 0, 3), end: new Date(2026, 0, 6) });
  });
});
