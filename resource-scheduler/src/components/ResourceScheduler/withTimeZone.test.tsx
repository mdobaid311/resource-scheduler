import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, type ResourceSchedulerHandle, ViewType } from "./types";

// Every time here is an instant (with a Z), so the tests mean the same on any machine.
// 12:00 UTC is 21:00 in Tokyo (UTC+9) and 08:00 in New York (EDT, UTC-4) on 7 October 2026.
const NOW = "2026-10-07T12:00:00Z";
const at = (iso: string) => new Date(iso);

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
  vi.setSystemTime(at(NOW));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const standup = {
  id: "standup",
  title: "Standup",
  startDate: at("2026-10-07T00:00:00Z"), // 09:00 in Tokyo
  endDate: at("2026-10-07T01:00:00Z"),
};
const team = (extra: Partial<Resource> = {}): Resource[] => [
  { id: "r1", name: "Ann", events: [standup], ...extra },
  { id: "r2", name: "Bob", events: [] },
];
const view = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
  render(
    <ResourceScheduler
      resources={team()}
      initialDate={at("2026-10-07T03:00:00Z")} // midday on 7 October in Tokyo
      initialView={ViewType.Day}
      timeZone="Asia/Tokyo"
      {...props}
    />
  );
const eventButton = () => screen.getByRole("button", { name: /Standup/ });
const slots = () => [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")];
const press = (el: Element, key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(el, { key, ...init });
const nowLeft = () => parseFloat(document.querySelector<HTMLElement>("[data-rs-now]")!.style.left);

describe("timeZone", () => {
  describe("what is drawn", () => {
    it("shows an event at its wall-clock time in the zone", () => {
      view();
      const label = eventButton().getAttribute("aria-label")!;
      expect(label).toContain("Wednesday, October 7");
      expect(label).toContain("9:00 AM to 10:00 AM");
    });

    it("shows the same event at another wall-clock time, and on another day, in another zone", () => {
      view({ timeZone: "America/New_York", initialDate: at("2026-10-06T16:00:00Z") });
      const label = eventButton().getAttribute("aria-label")!;
      expect(label).toContain("Tuesday, October 6");
      expect(label).toContain("8:00 PM to 9:00 PM");
    });

    it("puts an event on the day it falls on in the zone, not on the machine's day", () => {
      const late = { ...standup, startDate: at("2026-10-07T20:00:00Z"), endDate: at("2026-10-07T21:00:00Z") }; // 05:00 on the 8th in Tokyo
      const resources = team({ events: [late] });
      view({ resources });
      expect(screen.queryByRole("button", { name: /Standup/ })).toBeNull();
      cleanup();
      view({ resources, initialDate: at("2026-10-08T03:00:00Z") });
      expect(eventButton().getAttribute("aria-label")).toContain("5:00 AM to 6:00 AM");
    });

    it("draws flat events too", () => {
      view({ resources: [{ id: "r1", name: "Ann" }], events: [{ ...standup, resourceId: "r1" }] });
      expect(eventButton().getAttribute("aria-label")).toContain("9:00 AM to 10:00 AM");
    });

    it("measures business hours on the wall clock of the zone", () => {
      view({ businessHours: { startHour: 9, endHour: 17 }, dayStartHour: 6, dayEndHour: 20 });
      const named = (hour: string) => slots().find((el) => el.getAttribute("aria-label")!.includes(` ${hour}`))!;
      expect(named("8:00 AM").getAttribute("aria-label")).toContain("unavailable");
      expect(named("9:00 AM").getAttribute("aria-label")).not.toContain("unavailable");
    });

    it("shades an unavailable range given as instants", () => {
      view({
        resources: team({ unavailable: [{ start: at("2026-10-07T03:00:00Z"), end: at("2026-10-07T04:00:00Z") }] }), // 12:00 to 13:00 in Tokyo
        dayStartHour: 6,
        dayEndHour: 20,
      });
      const shaded = slots().filter((el) => el.hasAttribute("data-rs-unavailable"));
      expect(shaded).toHaveLength(1);
      expect(shaded[0].getAttribute("aria-label")).toContain("12:00 PM");
    });

    it("draws the now line at the current time in the zone", () => {
      view({ nowIndicator: true, initialDate: undefined });
      expect(nowLeft()).toBeCloseTo(87.5, 3); // 21:00 of 24 hours
      cleanup();
      view({ nowIndicator: true, initialDate: undefined, timeZone: "America/New_York" });
      expect(nowLeft()).toBeCloseTo(33.333, 2); // 08:00
    });

    it("starts on today in the zone", () => {
      view({ initialDate: undefined, timeZone: "Pacific/Auckland" }); // 01:00 on the 8th there
      expect(screen.getByText(/October 8, 2026/)).toBeTruthy();
    });
  });

  describe("what you receive", () => {
    it("reports a drag-selection as instants", () => {
      const onSlotSelect = vi.fn();
      view({ onSlotSelect, slotDuration: 30, dayStartHour: 9, dayEndHour: 12 });
      fireEvent.mouseDown(slots()[0]);
      fireEvent.mouseEnter(slots()[1]);
      fireEvent.mouseUp(window);
      expect(onSlotSelect).toHaveBeenCalledWith({
        resourceId: "r1",
        start: at("2026-10-07T00:00:00Z"),
        end: at("2026-10-07T01:00:00Z"),
      });
    });

    it("hands a created event to onEventCreate with instants", () => {
      const onEventCreate = vi.fn();
      view({ onEventCreate, slotDuration: 30, dayStartHour: 9, dayEndHour: 12 });
      fireEvent.mouseDown(slots()[1]); // 09:30 in Tokyo
      fireEvent.mouseEnter(slots()[1]);
      fireEvent.mouseUp(window);
      expect(onEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: at("2026-10-07T00:30:00Z"), endDate: at("2026-10-07T01:00:00Z") }),
        "r1"
      );
    });

    it("reports a move as instants, with the event you gave it", () => {
      const onEventDrop = vi.fn();
      view({ onEventDrop, initialView: ViewType.Week });
      act(() => eventButton().focus());
      press(eventButton(), " ");
      press(eventButton(), "ArrowRight");
      press(eventButton(), "ArrowDown");
      press(eventButton(), " ");
      expect(onEventDrop).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup", startDate: at("2026-10-07T00:00:00Z"), endDate: at("2026-10-07T01:00:00Z") }),
        "r1",
        "r2",
        at("2026-10-08T00:00:00Z"),
        at("2026-10-08T01:00:00Z")
      );
    });

    it("reports a resize as instants", () => {
      const onEventResize = vi.fn();
      view({ onEventResize, initialView: ViewType.Week });
      act(() => eventButton().focus());
      press(eventButton(), " ");
      press(eventButton(), "ArrowRight", { shiftKey: true });
      press(eventButton(), " ");
      expect(onEventResize).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup" }),
        "r1",
        at("2026-10-07T00:00:00Z"),
        at("2026-10-08T01:00:00Z")
      );
    });

    it("gives isValidDrop instants", () => {
      const isValidDrop = vi.fn(() => true);
      view({ isValidDrop, initialView: ViewType.Week });
      act(() => eventButton().focus());
      press(eventButton(), " ");
      press(eventButton(), "ArrowRight");
      press(eventButton(), " ");
      expect(isValidDrop).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup", startDate: at("2026-10-07T00:00:00Z") }),
        { resourceId: "r1", start: at("2026-10-08T00:00:00Z"), end: at("2026-10-08T01:00:00Z") }
      );
    });

    it("gives eventOverlap instants", () => {
      const eventOverlap = vi.fn(() => true);
      const other = { id: "other", title: "Other", startDate: at("2026-10-08T00:30:00Z"), endDate: at("2026-10-08T01:30:00Z") };
      view({ eventOverlap, resources: [{ id: "r1", name: "Ann", events: [standup, other] }], initialView: ViewType.Week });
      act(() => eventButton().focus());
      press(eventButton(), " ");
      press(eventButton(), "ArrowRight");
      press(eventButton(), " ");
      expect(eventOverlap).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup", startDate: at("2026-10-07T00:00:00Z") }),
        expect.objectContaining({ id: "other", startDate: at("2026-10-08T00:30:00Z") })
      );
    });

    it("gives onEventClick the event with instants", () => {
      const onEventClick = vi.fn();
      view({ onEventClick });
      fireEvent.click(slots()[9]); // the 09:00 cell of Ann, where the event starts
      expect(onEventClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "standup", startDate: at("2026-10-07T00:00:00Z"), endDate: at("2026-10-07T01:00:00Z") }),
        expect.objectContaining({ id: "r1" })
      );
    });

    it("reports the visible range and the date as instants", () => {
      const onRangeChange = vi.fn();
      const onDateChange = vi.fn();
      view({ onRangeChange, onDateChange });
      expect(onRangeChange).toHaveBeenCalledWith({
        start: at("2026-10-06T15:00:00Z"), // midnight on the 7th in Tokyo
        end: at("2026-10-07T15:00:00Z"),
        view: "day",
      });
      fireEvent.click(screen.getByRole("button", { name: "Next period" }));
      expect(onDateChange).toHaveBeenCalledWith(at("2026-10-08T03:00:00Z"));
    });

    it("moves to today in the zone with the Today button", () => {
      const onDateChange = vi.fn();
      view({ onDateChange, initialDate: at("2026-10-01T03:00:00Z") });
      fireEvent.click(screen.getByRole("button", { name: "Today" }));
      expect(onDateChange).toHaveBeenCalledWith(at(NOW));
    });
  });

  describe("render props", () => {
    it("get dates as wall-clock Dates, so they format as usual", () => {
      const renderEventPopover = vi.fn(() => <p>popover</p>);
      view({ renderEventPopover });
      act(() => eventButton().focus());
      press(eventButton(), "Enter");
      const [event] = renderEventPopover.mock.calls[0] as unknown as [{ startDate: Date; endDate: Date }];
      expect([event.startDate.getDate(), event.startDate.getHours(), event.endDate.getHours()]).toEqual([7, 9, 10]);
    });
  });

  describe("the ref", () => {
    it("takes and returns instants", () => {
      const ref = createRef<ResourceSchedulerHandle>();
      const onDateChange = vi.fn();
      render(
        <ResourceScheduler
          ref={ref}
          resources={team()}
          initialDate={at("2026-10-07T03:00:00Z")}
          initialView={ViewType.Day}
          timeZone="Asia/Tokyo"
          onDateChange={onDateChange}
        />
      );
      expect(ref.current!.getVisibleRange()).toEqual({
        start: at("2026-10-06T15:00:00Z"),
        end: at("2026-10-07T15:00:00Z"),
      });

      act(() => ref.current!.goTo(at("2026-10-09T03:00:00Z")));
      expect(onDateChange).toHaveBeenCalledWith(at("2026-10-09T03:00:00Z"));
      expect(ref.current!.getVisibleRange().start).toEqual(at("2026-10-08T15:00:00Z"));
    });
  });

  describe("an unknown zone", () => {
    it("warns and shows local time instead of crashing", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <ResourceScheduler
          resources={[{ id: "r1", name: "Ann", events: [{ id: "e", title: "Standup", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) }] }]}
          initialDate={new Date(2026, 9, 7)}
          initialView={ViewType.Day}
          timeZone="Eastern Standard Time"
        />
      );
      expect(eventButton().getAttribute("aria-label")).toContain("9:00 AM to 10:00 AM");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Eastern Standard Time"));
    });
  });
});
