import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
