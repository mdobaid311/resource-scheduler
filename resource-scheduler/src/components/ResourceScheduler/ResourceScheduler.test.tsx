import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { Resource, ViewType } from "./types";

const scrollTo = vi.fn();

beforeEach(() => {
  // jsdom has no layout engine: stub what the component asks the browser for.
  Element.prototype.scrollTo = scrollTo;
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
  vi.setSystemTime(new Date(2026, 9, 7, 12)); // a Wednesday
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  scrollTo.mockClear();
});

describe("ResourceScheduler", () => {
  it("scrolls to the displayed date, not to today", () => {
    render(
      <ResourceScheduler
        resources={[]}
        initialDate={new Date(2024, 2, 16)} // a Saturday: column 6 of its week
        initialView={ViewType.Week}
      />
    );

    // 6 columns * 140px + half a column, clientWidth is 0 in jsdom
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 910, behavior: "smooth" });
  });

  it("scrolls the element that actually overflows horizontally", () => {
    render(<ResourceScheduler resources={[]} initialView={ViewType.Week} />);

    const { contexts } = scrollTo.mock;
    const scroller = contexts[contexts.length - 1] as HTMLElement;
    expect(scroller.className).toContain("overflow-x-auto");
  });

  it("applies resourceColumnWidth to the resource column", () => {
    render(
      <ResourceScheduler
        resources={[]}
        initialView={ViewType.Week}
        resourceColumnWidth="300px"
      />
    );

    const column = screen.getByText("Resources").parentElement!.parentElement!;
    expect(column.style.width).toBe("300px");
  });

  describe("day view slots", () => {
    const ann = (events: Resource["events"] = []): Resource[] => [
      { id: "r1", name: "Ann", events },
    ];
    const day = new Date(2026, 2, 10);
    const slots = () => document.querySelectorAll<HTMLElement>("[data-rs-slot]");
    const selectSlots = (from: number, to: number) => {
      fireEvent.mouseDown(slots()[from]);
      fireEvent.mouseEnter(slots()[to]);
      fireEvent.mouseUp(window);
    };

    it("renders one slot per step inside the visible hours", () => {
      render(
        <ResourceScheduler
          resources={ann()}
          initialDate={day}
          initialView={ViewType.Day}
          slotDuration={30}
          dayStartHour={9}
          dayEndHour={12}
        />
      );

      expect(slots()).toHaveLength(6);
      expect(Number(slots()[0].dataset.rsSlot)).toBe(new Date(2026, 2, 10, 9).getTime());
      expect(Number(slots()[1].dataset.rsSlot)).toBe(new Date(2026, 2, 10, 9, 30).getTime());
    });

    it("reports the selected range through onSlotSelect instead of creating an event", () => {
      const onSlotSelect = vi.fn();
      const onEventCreate = vi.fn();
      render(
        <ResourceScheduler
          resources={ann()}
          initialDate={day}
          initialView={ViewType.Day}
          slotDuration={30}
          dayStartHour={9}
          dayEndHour={12}
          onSlotSelect={onSlotSelect}
          onEventCreate={onEventCreate}
        />
      );

      selectSlots(0, 1);

      expect(onSlotSelect).toHaveBeenCalledWith({
        resourceId: "r1",
        start: new Date(2026, 2, 10, 9),
        end: new Date(2026, 2, 10, 10),
      });
      expect(onEventCreate).not.toHaveBeenCalled();
    });

    it("does not report a selection that the overlap rules reject", () => {
      const onSlotSelect = vi.fn();
      const busy = {
        id: "busy",
        title: "Busy",
        startDate: new Date(2026, 2, 10, 9, 30),
        endDate: new Date(2026, 2, 10, 10),
      };
      render(
        <ResourceScheduler
          resources={ann([busy])}
          initialDate={day}
          initialView={ViewType.Day}
          slotDuration={30}
          dayStartHour={9}
          dayEndHour={12}
          eventOverlap={false}
          onSlotSelect={onSlotSelect}
        />
      );

      selectSlots(0, 1); // 9:00-10:00 overlaps the 9:30 event
      expect(onSlotSelect).not.toHaveBeenCalled();

      selectSlots(2, 3); // 10:00-11:00 is free
      expect(onSlotSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    const tuesday = new Date(2026, 2, 10);
    const standup = {
      id: "standup",
      title: "Standup",
      startDate: new Date(2026, 2, 10, 9),
      endDate: new Date(2026, 2, 10, 10),
    };
    const team = (): Resource[] => [
      { id: "r1", name: "Ann", events: [standup] },
      { id: "r2", name: "Bob", events: [] },
    ];
    const week = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
      render(
        <ResourceScheduler
          resources={team()}
          initialDate={tuesday}
          initialView={ViewType.Week}
          {...props}
        />
      );
    const grid = () => screen.getByRole("grid");
    const eventButton = () => screen.getByRole("button", { name: /Standup/ });
    const press = (el: Element, key: string, init: KeyboardEventInit = {}) =>
      fireEvent.keyDown(el, { key, ...init });
    const focusGrid = () => act(() => grid().focus());

    it("exposes the timeline as a labelled grid of named cells", () => {
      week();
      expect(grid().getAttribute("aria-label")).toBe("Resource schedule");
      expect(
        screen.getByRole("gridcell", { name: "Ann, Tuesday, March 10, 2026" })
      ).toBeTruthy();
      expect(grid().getAttribute("aria-rowcount")).toBe("2");
      expect(grid().getAttribute("aria-colcount")).toBe("7");
    });

    it("names the toolbar controls", () => {
      week();
      for (const name of ["Previous period", "Next period", "Today"])
        expect(screen.getByRole("button", { name })).toBeTruthy();
    });

    it("moves a cursor through the slots with the arrow keys", () => {
      week();
      focusGrid();
      const cell = (name: string) =>
        screen.getByRole("gridcell", { name }).getAttribute("id");

      press(grid(), "Home");
      expect(grid().getAttribute("aria-activedescendant")).toBe(
        cell("Ann, Sunday, March 8, 2026")
      );
      press(grid(), "ArrowRight");
      press(grid(), "ArrowDown");
      expect(grid().getAttribute("aria-activedescendant")).toBe(
        cell("Bob, Monday, March 9, 2026")
      );
    });

    it("scrolls the cursor cell into view as it moves", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      week();
      focusGrid();

      press(grid(), "ArrowRight");

      const active = document.getElementById(grid().getAttribute("aria-activedescendant")!);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
      const { contexts } = scrollIntoView.mock;
      expect(contexts[contexts.length - 1]).toBe(active);
    });

    it("selects the slot under the cursor and reports it through onSlotSelect", () => {
      const onSlotSelect = vi.fn();
      week({ onSlotSelect });
      focusGrid();

      press(grid(), "Home");
      press(grid(), "ArrowRight", { shiftKey: true });
      press(grid(), "ArrowRight", { shiftKey: true });
      press(grid(), "Enter");

      expect(onSlotSelect).toHaveBeenCalledWith({
        resourceId: "r1",
        start: new Date(2026, 2, 8),
        end: new Date(2026, 2, 11),
      });
    });

    it("opens an event's details with Enter", () => {
      week();
      act(() => eventButton().focus());
      press(eventButton(), "Enter");
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("picks an event up, moves it with the arrows and drops it", () => {
      const onEventDrop = vi.fn();
      week({ onEventDrop });
      act(() => eventButton().focus());

      press(eventButton(), " ");
      expect(screen.getByRole("status").textContent).toContain("Picked up Standup");
      press(eventButton(), "ArrowRight");
      press(eventButton(), "ArrowDown");
      expect(screen.getByRole("status").textContent).toContain("Bob");
      press(eventButton(), " ");

      expect(onEventDrop).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup" }),
        "r1",
        "r2",
        new Date(2026, 2, 11, 9),
        new Date(2026, 2, 11, 10)
      );
    });

    it("cancels a pick-up with Escape", () => {
      const onEventDrop = vi.fn();
      week({ onEventDrop });
      act(() => eventButton().focus());

      press(eventButton(), " ");
      press(eventButton(), "ArrowRight");
      press(eventButton(), "Escape");
      press(eventButton(), " "); // picks up again instead of dropping

      expect(onEventDrop).not.toHaveBeenCalled();
      expect(screen.getByRole("status").textContent).toContain("Picked up Standup");
    });

    it("resizes the end with Shift+Arrow when resizing is enabled", () => {
      const onEventResize = vi.fn();
      week({ onEventResize });
      act(() => eventButton().focus());

      press(eventButton(), " ");
      press(eventButton(), "ArrowRight", { shiftKey: true });
      press(eventButton(), " ");

      expect(onEventResize).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup" }),
        "r1",
        new Date(2026, 2, 10, 9),
        new Date(2026, 2, 11, 10)
      );
    });

    it("blocks a keyboard move that the overlap rules reject", () => {
      const onEventDrop = vi.fn();
      const resources: Resource[] = [
        {
          id: "r1",
          name: "Ann",
          events: [
            standup,
            { id: "other", title: "Other", startDate: new Date(2026, 2, 11, 9), endDate: new Date(2026, 2, 11, 10) },
          ],
        },
      ];
      week({ resources, onEventDrop, eventOverlap: false });
      act(() => eventButton().focus());

      press(eventButton(), " ");
      press(eventButton(), "ArrowRight");
      expect(screen.getByRole("status").textContent).toContain("Not allowed");
      press(eventButton(), " ");

      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it("has no detectable accessibility violations", async () => {
      // axe probes canvas support; jsdom has none and would log a warning.
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const { container } = week({ onEventResize: vi.fn() });
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } }, // jsdom has no layout/colours
      });
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
      ).toEqual([]);
    });
  });
});
