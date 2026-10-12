import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, ViewType } from "./types";

// jsdom has no layout and no printing. A 300 px high, 1000 px wide scroller
// gives the row and column windows something to measure, and a media query
// list for `print` that the tests can flip stands in for the browser.
let printMatches = false;
const printListeners = new Set<() => void>();
const clientHeight = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");
const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");

beforeEach(() => {
  printMatches = false;
  printListeners.clear();
  Object.defineProperty(Element.prototype, "clientHeight", { configurable: true, get: () => 300 });
  Object.defineProperty(Element.prototype, "clientWidth", { configurable: true, get: () => 1000 });
  Element.prototype.scrollTo = vi.fn();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === "print" ? printMatches : false;
    },
    media: query,
    addListener: (listener: () => void) => query === "print" && printListeners.add(listener),
    removeListener: (listener: () => void) => printListeners.delete(listener),
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 12)); // a Wednesday
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (clientHeight) Object.defineProperty(Element.prototype, "clientHeight", clientHeight);
  if (clientWidth) Object.defineProperty(Element.prototype, "clientWidth", clientWidth);
});

const many = (n: number): Resource[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `Resource ${i}`, events: [] }));
const rowCount = () => document.querySelectorAll('[role="row"]').length;
const cellsOf = (id: string) => document.querySelectorAll(`[data-rs-resource="${id}"][data-rs-slot]`).length;

// What the browser does around a print: `beforeprint`, the print layout, `afterprint`.
const beforePrint = () => act(() => void window.dispatchEvent(new Event("beforeprint")));
const afterPrint = () => act(() => void window.dispatchEvent(new Event("afterprint")));
const emulatePrint = (on: boolean) =>
  act(() => {
    printMatches = on;
    printListeners.forEach((listener) => listener());
  });

describe("virtualization while printing", () => {
  const week = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
    render(<ResourceScheduler resources={many(150)} initialView={ViewType.Week} {...props} />);

  it("draws every row between beforeprint and afterprint, then goes back to the window", () => {
    week();
    expect(rowCount()).toBeLessThan(40);

    beforePrint();
    expect(rowCount()).toBe(150);
    expect(screen.getByText("Resource 149")).toBeTruthy(); // the resource column too

    afterPrint();
    expect(rowCount()).toBeLessThan(40);
    expect(screen.queryByText("Resource 149")).toBeNull();
  });

  it("draws every row while the print media query matches (print preview, emulated media)", () => {
    week();
    emulatePrint(true);
    expect(rowCount()).toBe(150);
    emulatePrint(false);
    expect(rowCount()).toBeLessThan(40);
  });

  it("overrides virtualize={true} too: a printout of a window is a blank page", () => {
    week({ resources: many(20), virtualize: true });
    expect(rowCount()).toBeLessThan(20);
    beforePrint();
    expect(rowCount()).toBe(20);
    afterPrint();
    expect(rowCount()).toBeLessThan(20);
  });

  it("draws every column of the year view while printing", () => {
    const team: Resource[] = [{ id: "ann", name: "Ann", events: [] }];
    render(<ResourceScheduler resources={team} initialDate={new Date(2026, 9, 7)} initialView={ViewType.Year} />);
    expect(cellsOf("ann")).toBe(14);

    beforePrint();
    expect(cellsOf("ann")).toBe(365);
    expect(document.querySelectorAll(".rs-header > *")).toHaveLength(365);

    afterPrint();
    expect(cellsOf("ann")).toBe(14);
  });

  it("draws the events outside the window too, in rows and in columns", () => {
    const event = (id: string, month: number, day: number) => ({
      id,
      title: id,
      startDate: new Date(2026, month, day, 9),
      endDate: new Date(2026, month, day + 1, 9),
    });
    const lastRow = { ...many(1)[0], id: "last", name: "Last", events: [event("far-row", 9, 7)] };
    week({ resources: [...many(150), lastRow] });
    expect(document.querySelector('[data-rs-event="far-row"]')).toBeNull(); // below the row window
    beforePrint();
    expect(document.querySelector('[data-rs-event="far-row"]')).not.toBeNull();
    cleanup();

    const ann: Resource = { id: "ann", name: "Ann", events: [event("far-column", 11, 20)] };
    render(<ResourceScheduler resources={[ann]} initialDate={new Date(2026, 9, 7)} initialView={ViewType.Year} />);
    expect(document.querySelector('[data-rs-event="far-column"]')).toBeNull(); // right of the column window
    beforePrint();
    expect(document.querySelector('[data-rs-event="far-column"]')).not.toBeNull();
  });

  it("changes nothing for a short list", () => {
    week({ resources: many(5) });
    beforePrint();
    expect(rowCount()).toBe(5);
    afterPrint();
    expect(rowCount()).toBe(5);
  });

  it("stops listening when it unmounts", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = week();
    const added = add.mock.calls.filter(([type]) => type === "beforeprint" || type === "afterprint");
    expect(added.map(([type]) => type).sort()).toEqual(["afterprint", "beforeprint"]);
    unmount();
    for (const [type, listener] of added) expect(remove).toHaveBeenCalledWith(type, listener);
    expect(printListeners.size).toBe(0);
    add.mockRestore();
    remove.mockRestore();
  });
});

// The print rules live in tokens.css, the file the npm stylesheet and the
// shadcn registry are both built from. These tests keep the markup and the
// rules in step: a rule aimed at a hook the component no longer renders would
// silently stop working.
const tokens = fs
  .readFileSync(path.join(__dirname, "../../styles/tokens.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const printBlock = (() => {
  const start = tokens.indexOf("@media print");
  if (start < 0) return "";
  let depth = 0;
  for (let i = tokens.indexOf("{", start); i < tokens.length; i++) {
    if (tokens[i] === "{") depth++;
    if (tokens[i] === "}" && --depth === 0) return tokens.slice(start, i + 1);
  }
  return "";
})();
const noComments = printBlock;

describe("print stylesheet", () => {
  it("is one @media print block scoped to the scheduler's own classes", () => {
    expect(noComments).toMatch(/^@media print\s*\{/);
    const selectors = [...noComments.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim()).slice(1);
    expect(selectors.length).toBeGreaterThan(5);
    // No bare element, `body` or `*` rule that could restyle the host's page.
    // The one exception reaches the scheduler's direct parent, on purpose.
    for (const selector of selectors.flatMap((s) => s.split(","))) {
      if (selector.trim() === ":has(> .rs-root)") continue;
      expect(selector.trim(), selector).toMatch(/^\.rs-/);
    }
  });

  it("releases the box around the scheduler, and only that one", () => {
    expect(noComments).toMatch(/:has\(> \.rs-root\)\s*\{[^}]*height:\s*auto\s*!important[^}]*overflow:\s*visible\s*!important/);
  });

  it("prints colors exactly, so event colors and shaded cells survive", () => {
    expect(noComments).toMatch(/print-color-adjust:\s*exact/);
    expect(noComments).toMatch(/-webkit-print-color-adjust:\s*exact/);
  });

  it("expands the scroll box and drops sticky positioning", () => {
    expect(noComments).toMatch(/\.rs-scroll[^{]*\{[^}]*overflow:\s*visible/);
    expect(noComments).toMatch(/\.rs-root\s*\{[^}]*height:\s*auto/);
    expect(noComments).toMatch(/\.rs-resources[^{]*\{[^}]*position:\s*static/);
    expect(noComments).toMatch(/\.rs-header[^{]*\{[^}]*position:\s*static/);
    expect(noComments).toMatch(/\.rs-toolbar[^{]*\{[^}]*position:\s*static/);
  });

  it("hides what is not for paper and fits the columns to the page", () => {
    expect(noComments).toMatch(/\.rs-no-print[^{]*\{[^}]*display:\s*none\s*!important/);
    expect(noComments).toMatch(/grid-template-columns:\s*repeat\(var\(--rs-cols\),\s*minmax\(0,\s*1fr\)\)\s*!important/);
  });

  it("keeps a cell on one page", () => {
    expect(noComments).toMatch(/break-inside:\s*avoid/);
  });

  it("only names classes the component renders", () => {
    const onEvent = vi.fn();
    render(
      <ResourceScheduler
        resources={[
          {
            id: "ann",
            name: "Ann",
            events: [{ id: "e", title: "E", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) }],
          },
        ]}
        showColumnUtilization
        nowIndicator
        onEventResize={onEvent}
        initialDate={new Date(2026, 9, 7)}
      />
    );
    // Open the event's popover, a portal outside the scheduler's own tree.
    fireEvent.click(document.querySelector('[data-rs-event="e"]')!);

    const named = new Set([...noComments.matchAll(/\.(rs-[a-z-]+)/g)].map((m) => m[1]));
    expect(named.size).toBeGreaterThan(5);
    for (const name of named) {
      expect(document.querySelector(`.${name}`), `.${name} is in the print rules but not rendered`).not.toBeNull();
    }
  });
});

describe("print hooks in the markup", () => {
  it("marks the controls, the title stays", () => {
    render(<ResourceScheduler resources={many(2)} initialDate={new Date(2026, 9, 7)} />);
    const toolbar = document.querySelector(".rs-toolbar")!;
    const hidden = [...toolbar.querySelectorAll(".rs-no-print")];
    // Previous, next, Today and the view select.
    expect(hidden.map((el) => el.getAttribute("aria-label"))).toEqual(
      expect.arrayContaining(["Previous period", "Next period", "Today", "View"])
    );
    expect(hidden).toHaveLength(4);
    const title = screen.getByText("October 7, 2026");
    expect(title.closest(".rs-no-print")).toBeNull();
  });

  it("gives the page the number of columns to fit", () => {
    const { container, rerender } = render(
      <ResourceScheduler resources={many(2)} initialDate={new Date(2026, 9, 7)} initialView={ViewType.Week} />
    );
    const root = container.querySelector<HTMLElement>(".rs-root")!;
    expect(root.style.getPropertyValue("--rs-cols")).toBe("7");
    rerender(<ResourceScheduler resources={many(2)} initialDate={new Date(2026, 9, 7)} initialView={ViewType.Week} hideWeekends />);
    expect(container.querySelector<HTMLElement>(".rs-root")!.style.getPropertyValue("--rs-cols")).toBe("5");
  });

  it("marks the scroll box, resource column, header, grid and totals", () => {
    render(<ResourceScheduler resources={many(2)} showColumnUtilization initialDate={new Date(2026, 9, 7)} />);
    const root = document.querySelector(".rs-root")!;
    for (const hook of ["rs-scroll", "rs-resources", "rs-timeline", "rs-header", "rs-grid", "rs-totals", "rs-totals-label"]) {
      expect(root.querySelectorAll(`.${hook}`), hook).toHaveLength(1);
    }
    expect(root.querySelector(".rs-grid")!.getAttribute("role")).toBe("grid");
  });

  it("marks drag affordances, the now line and the popover as not for paper", () => {
    render(
      <ResourceScheduler
        resources={[
          {
            id: "ann",
            name: "Ann",
            events: [{ id: "e", title: "E", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) }],
          },
        ]}
        nowIndicator
        onEventResize={() => {}}
        initialDate={new Date(2026, 9, 7)}
      />
    );
    expect(document.querySelector("[data-rs-now]")!.classList.contains("rs-no-print")).toBe(true);
    for (const handle of document.querySelectorAll("[data-rs-resize]")) {
      expect(handle.classList.contains("rs-no-print")).toBe(true);
    }
    fireEvent.click(document.querySelector('[data-rs-event="e"]')!);
    expect(document.querySelector('[data-slot="popover-content"]')!.classList.contains("rs-no-print")).toBe(true);
  });

  it("keeps a class you add on the toolbar", () => {
    render(<ResourceScheduler resources={many(1)} classNames={{ toolbar: "my-bar" }} />);
    const toolbar = document.querySelector(".my-bar")!;
    expect(toolbar.classList.contains("rs-toolbar")).toBe(true);
  });
});
