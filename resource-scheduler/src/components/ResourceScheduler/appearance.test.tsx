import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, ViewType } from "./types";

// The look: toolbar, header, tiles, grid and resource column. The clock reads
// Wednesday 7 October 2026, noon.
beforeEach(() => {
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
});

const at = (date: number, hour = 0, minute = 0) => new Date(2026, 9, date, hour, minute);
const wednesday = at(7);
const team = (events: Resource["events"] = [], extra: Partial<Resource> = {}): Resource[] => [
  { id: "ann", name: "Ann Lee", events, ...extra },
];
const slots = () => [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")];
const header = () => document.querySelector<HTMLElement>(".rs-header")!;
const grid = () => screen.getByRole("grid");

describe("toolbar", () => {
  it("switches views with a row of buttons, the current one pressed", () => {
    const onViewChange = vi.fn();
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} onViewChange={onViewChange} />);
    const views = screen.getByRole("group", { name: "View" });
    const buttons = within(views).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Day", "Week", "Month", "Quarter", "Year"]);
    expect(within(views).getByRole("button", { pressed: true }).textContent).toBe("Week");

    fireEvent.click(within(views).getByRole("button", { name: "Month" }));
    expect(onViewChange).toHaveBeenCalledWith(ViewType.Month);
    expect(within(views).getByRole("button", { pressed: true }).textContent).toBe("Month");
    expect(document.querySelector("[aria-live] span")!.textContent).toBe("October 2026");
  });

  it("lists only the available views, and none without allowViewChange", () => {
    render(
      <ResourceScheduler
        resources={team()}
        initialDate={wednesday}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
      />
    );
    const views = screen.getByRole("group", { name: "View" });
    expect(within(views).getAllByRole("button").map((b) => b.textContent)).toEqual(["Week", "Month"]);
    cleanup();
    render(<ResourceScheduler resources={team()} initialDate={wednesday} allowViewChange={false} />);
    expect(screen.queryByRole("group", { name: "View" })).toBeNull();
  });

  it("keeps the view name for screen readers only, next to the title", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    const viewName = screen.getByText("Week View");
    expect(viewName.className).toContain("sr-only");
    expect(viewName.closest("[aria-live]")).toBe(screen.getByText("Oct 4 – Oct 10, 2026").closest("[aria-live]"));
  });
});

describe("header", () => {
  it("marks today with the theme's primary, not a fixed blue", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    const today = [...header().children].find((cell) => cell.textContent?.startsWith("Wed"))!;
    expect(today.className).toContain("bg-ocrs-blue-50");
    expect(today.innerHTML).toContain("text-ocrs-primary-text");
    expect(today.innerHTML).toContain("bg-ocrs-primary");
    expect(header().innerHTML).not.toMatch(/text-blue-\d/);
  });

  it("puts the month on the date line, so a cell has two lines at most", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    const sunday = header().children[0]; // the first column: en-US weeks start on Sunday
    expect(sunday.textContent).toBe("Sun4 OctOctober 2026"); // weekday, date with month, hover label
    const lines = sunday.querySelector(".group")!.children;
    expect(lines).toHaveLength(3); // weekday, date line, the hover label (absolutely placed)
    expect(lines[2].className).toContain("absolute");
  });

  it("does not mark every column of the day view as today", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Day} />);
    expect(header().innerHTML).not.toContain("bg-ocrs-blue-50");
    expect(slots().some((slot) => slot.hasAttribute("aria-current"))).toBe(false);
    // Whole hours are labelled in bold, the slots between them are quieter.
    const labels = [...header().querySelectorAll("span")];
    expect(labels[0].textContent).toBe("12AM");
    expect(labels[0].className).toContain("font-semibold");
  });

  it("still marks today in the week view", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    expect(slots().filter((slot) => slot.getAttribute("aria-current") === "date")).toHaveLength(1);
  });
});

describe("grid", () => {
  it("lets columns stretch to fill, never below their width", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    expect(header().style.gridTemplateColumns).toBe("repeat(7, minmax(140px, 1fr))");
    expect(grid().style.gridTemplateColumns).toBe("repeat(7, minmax(140px, 1fr))");
  });

  it("runs the column lines to the bottom with a filler row nobody can reach", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    expect(grid().style.gridTemplateRows).toMatch(/ minmax\(0(px)?, 1fr\)$/);
    const fillers = [...grid().children].filter((el) => el.getAttribute("aria-hidden") === "true" && !el.hasAttribute("data-rs-now"));
    expect(fillers).toHaveLength(7);
    for (const filler of fillers) {
      expect(filler.className).toContain("rs-no-print");
      expect((filler as HTMLElement).style.gridRow).toBe("3"); // after the one resource row (rows start at 2)
    }
  });

  it("does not select page text while dragging", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    expect(grid().className).toContain("select-none");
  });

  it("tints a selection with the primary, so it shows on today's column too", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} onSlotSelect={() => {}} />);
    fireEvent.mouseDown(slots()[2]); // Tuesday
    fireEvent.mouseEnter(slots()[3]); // Wednesday, today
    expect(slots()[2].className).toContain("bg-ocrs-primary/15");
    expect(slots()[3].className).toContain("bg-ocrs-primary/15");
    expect(slots()[3].className).not.toContain("bg-ocrs-blue-50");
    fireEvent.mouseUp(window);
  });

  it("hatches unavailable time", () => {
    render(
      <ResourceScheduler
        resources={team([], { unavailable: [{ start: at(6), end: at(7) }] })}
        initialDate={wednesday}
        initialView={ViewType.Week}
      />
    );
    const tuesday = slots()[2];
    expect(tuesday.hasAttribute("data-rs-unavailable")).toBe(true);
    expect(tuesday.className).toContain("ocrs-hatch");
  });

  it("shows the keyboard cursor only while the grid has keyboard focus", () => {
    render(<ResourceScheduler resources={team()} initialDate={wednesday} initialView={ViewType.Week} />);
    fireEvent.focus(grid());
    fireEvent.keyDown(grid(), { key: "ArrowRight" });
    const active = document.getElementById(grid().getAttribute("aria-activedescendant")!)!;
    expect(active.className).toContain("group-focus-visible/grid:ring-2");
    expect(active.className).not.toMatch(/(^| )ring-2/);
  });
});

describe("event tiles", () => {
  const tile = (id: string) => document.querySelector<HTMLElement>(`[data-rs-event="${id}"]`)!;

  it("are a solid tint of the event colour, or of the primary without one", () => {
    render(
      <ResourceScheduler
        resources={team([
          { id: "a", title: "Standup", startDate: at(7, 9), endDate: at(7, 10), color: "#10b981" },
          { id: "b", title: "Review", startDate: at(8, 9), endDate: at(8, 10) },
        ])}
        initialDate={wednesday}
        initialView={ViewType.Week}
      />
    );
    expect(tile("a").style.getPropertyValue("--rs-event-color")).toBe("#10b981");
    expect(tile("a").getAttribute("style")).toContain("color-mix(in srgb, #10b981 13%, var(--rs-surface))");
    expect(tile("b").style.getPropertyValue("--rs-event-color")).toBe("var(--rs-primary)");
    expect(within(tile("a")).getByText("9:00 AM – 10:00 AM")).toBeTruthy();
  });

  it("show the dates of a booking over several whole days instead of All day", () => {
    render(
      <ResourceScheduler
        resources={team([
          { id: "trip", title: "Trip", startDate: at(5), endDate: at(8) },
          { id: "holiday", title: "Holiday", startDate: at(9), endDate: at(10) },
        ])}
        initialDate={wednesday}
        initialView={ViewType.Week}
      />
    );
    expect(within(tile("trip")).getByText("Oct 5 – Oct 7")).toBeTruthy();
    expect(within(tile("holiday")).getByText("All day")).toBeTruthy();
  });

  it("drop the time line when the tile is too narrow, but keep it in the accessible name", () => {
    render(
      <ResourceScheduler
        resources={team([{ id: "a", title: "1:1", startDate: at(7, 9), endDate: at(7, 10) }])}
        initialDate={wednesday}
        initialView={ViewType.Week}
      />
    );
    expect(tile("a").className).toContain("@container");
    expect(within(tile("a")).getByText("9:00 AM – 10:00 AM").className).toContain("@max-[5.5rem]:hidden");
    expect(tile("a").getAttribute("aria-label")).toContain("1:1");
  });

  it("open a popover with the colour, description and the full range of a multi-day event", () => {
    render(
      <ResourceScheduler
        resources={team([
          {
            id: "a",
            title: "Offsite",
            description: "Bring a laptop",
            startDate: at(6, 9),
            endDate: at(8, 17),
            color: "#8b5cf6",
          },
        ])}
        initialDate={wednesday}
        initialView={ViewType.Week}
      />
    );
    fireEvent.click(tile("a"));
    const popover = document.querySelector<HTMLElement>('[data-slot="popover-content"]')!;
    expect(within(popover).getByText("Bring a laptop")).toBeTruthy();
    expect(within(popover).getByText("Oct 6, 2026 9:00 AM – Oct 8, 2026 5:00 PM")).toBeTruthy();
    expect(popover.innerHTML).toContain("background-color: rgb(139, 92, 246)");
  });
});

describe("resource column", () => {
  it("shows the role under the name", () => {
    render(<ResourceScheduler resources={team([], { role: "Frontend" })} initialDate={wednesday} initialView={ViewType.Week} />);
    const name = screen.getByText("Ann Lee");
    const role = screen.getByText("Frontend");
    expect(role.parentElement).toBe(name.parentElement);
    expect(role.className).toContain("text-ocrs-muted-foreground");
  });

  it("turns a utilization bar amber from 90% and red above 100%", () => {
    // Wednesday from 9 to 17 is 8 available hours; overlapping bookings count twice.
    const work = (id: string, from: number, to: number) => ({ id, title: "Work", startDate: at(7, from), endDate: at(7, to) });
    const bar = (events: Resource["events"]) => {
      render(
        <ResourceScheduler
          resources={team(events)}
          initialDate={wednesday}
          initialView={ViewType.Day}
          businessHours={{ daysOfWeek: [3], startHour: 9, endHour: 17 }}
          showUtilization
        />
      );
      const fill = screen.getByRole("meter").firstElementChild!.firstElementChild!; // track, then fill
      const className = fill.className;
      cleanup();
      return className;
    };
    expect(bar([work("a", 9, 13)])).toContain("bg-ocrs-primary"); // 50%
    expect(bar([work("a", 9, 17)])).toContain("bg-ocrs-warning"); // 100%
    expect(bar([work("a", 9, 17), work("b", 9, 11)])).toContain("bg-ocrs-destructive"); // 125%
  });
});
