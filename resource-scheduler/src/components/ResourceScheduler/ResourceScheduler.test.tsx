import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, type ResourceSchedulerHandle, ViewType } from "./types";

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

  describe("view controls", () => {
    const ann: Resource[] = [{ id: "r1", name: "Ann", events: [] }];
    // The system time is Wednesday 7 October 2026.
    const slotDays = () =>
      [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")].map((el) =>
        new Date(Number(el.dataset.rsSlot)).getDate()
      );

    it("starts the week on weekStartsOn", () => {
      render(
        <ResourceScheduler resources={ann} initialView={ViewType.Week} weekStartsOn={1} />
      );
      expect(slotDays()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    });

    it("leaves weekends out with hideWeekends", () => {
      render(
        <ResourceScheduler resources={ann} initialView={ViewType.Week} hideWeekends />
      );
      expect(slotDays()).toEqual([5, 6, 7, 8, 9]);
    });

    it("names the shown days in the title", () => {
      render(
        <ResourceScheduler
          resources={ann}
          initialView={ViewType.Week}
          weekStartsOn={1}
          hideWeekends
        />
      );
      expect(screen.getByText("Oct 5 – Oct 9, 2026")).toBeTruthy();
    });

    describe("onRangeChange", () => {
      it("reports the first range on mount, with an exclusive end", () => {
        const onRangeChange = vi.fn();
        render(
          <ResourceScheduler
            resources={ann}
            initialView={ViewType.Week}
            onRangeChange={onRangeChange}
          />
        );
        expect(onRangeChange).toHaveBeenCalledTimes(1);
        expect(onRangeChange).toHaveBeenCalledWith({
          start: new Date(2026, 9, 4),
          end: new Date(2026, 9, 11),
          view: ViewType.Week,
        });
      });

      it("reports again when the user navigates", () => {
        const onRangeChange = vi.fn();
        render(
          <ResourceScheduler
            resources={ann}
            initialView={ViewType.Week}
            onRangeChange={onRangeChange}
          />
        );
        fireEvent.click(screen.getByLabelText("Next period"));
        expect(onRangeChange).toHaveBeenCalledTimes(2);
        expect(onRangeChange).toHaveBeenLastCalledWith({
          start: new Date(2026, 9, 11),
          end: new Date(2026, 9, 18),
          view: ViewType.Week,
        });
      });

      it("does not report again when only the callback identity changes", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(
          <ResourceScheduler resources={ann} initialView={ViewType.Week} onRangeChange={first} />
        );
        rerender(
          <ResourceScheduler resources={ann} initialView={ViewType.Week} onRangeChange={second} />
        );
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();
      });
    });

    describe("ref handle", () => {
      const mount = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) => {
        const ref = createRef<ResourceSchedulerHandle>();
        render(
          <ResourceScheduler ref={ref} resources={ann} initialView={ViewType.Week} {...props} />
        );
        return ref;
      };

      it("goTo shows the date and tells onDateChange", () => {
        const onDateChange = vi.fn();
        const onRangeChange = vi.fn();
        const ref = mount({ onDateChange, onRangeChange });
        const target = new Date(2026, 10, 18);

        act(() => ref.current!.goTo(target));

        expect(onDateChange).toHaveBeenCalledWith(target);
        expect(onRangeChange).toHaveBeenLastCalledWith({
          start: new Date(2026, 10, 15),
          end: new Date(2026, 10, 22),
          view: ViewType.Week,
        });
      });

      it("setView switches the view and keeps the date", () => {
        const onViewChange = vi.fn();
        const ref = mount({ onViewChange });

        act(() => ref.current!.setView(ViewType.Month));

        expect(onViewChange).toHaveBeenCalledWith(ViewType.Month);
        expect(ref.current!.getVisibleRange()).toEqual({
          start: new Date(2026, 9, 1),
          end: new Date(2026, 10, 1),
        });
      });

      it("getVisibleRange returns what is on screen", () => {
        const ref = mount({ hideWeekends: true });
        expect(ref.current!.getVisibleRange()).toEqual({
          start: new Date(2026, 9, 5),
          end: new Date(2026, 9, 10),
        });
      });

      it("scrollToTime scrolls within the shown range", () => {
        const ref = mount();
        scrollTo.mockClear();

        act(() => ref.current!.scrollToTime(new Date(2026, 9, 9, 8)));

        // Friday is column 5: 5 * 140px + half a column (clientWidth is 0 in jsdom)
        expect(scrollTo).toHaveBeenCalledWith({ left: 770, behavior: "smooth" });
      });

      it("scrollToTime outside the range navigates there", () => {
        const onDateChange = vi.fn();
        const ref = mount({ onDateChange });
        const target = new Date(2026, 11, 2);

        act(() => ref.current!.scrollToTime(target));

        expect(onDateChange).toHaveBeenCalledWith(target);
      });
    });
  });

  describe("availability", () => {
    // Tuesday 10 March 2026, 6:00 to 20:00 in hour slots: index 3 is 9:00.
    const day = new Date(2026, 2, 10);
    const ann = (extra: Partial<Resource> = {}): Resource[] => [
      { id: "r1", name: "Ann", events: [], ...extra },
    ];
    const dayView = (
      resources: Resource[],
      props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}
    ) =>
      render(
        <ResourceScheduler
          resources={resources}
          initialDate={day}
          initialView={ViewType.Day}
          dayStartHour={6}
          dayEndHour={20}
          {...props}
        />
      );
    const slots = () => [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")];
    const shaded = () => slots().filter((el) => el.hasAttribute("data-rs-unavailable"));
    const selectSlots = (from: number, to: number) => {
      fireEvent.mouseDown(slots()[from]);
      fireEvent.mouseEnter(slots()[to]);
      fireEvent.mouseUp(window);
    };

    it("shades nothing by default", () => {
      dayView(ann());
      expect(shaded()).toHaveLength(0);
    });

    it("shades the hours outside businessHours", () => {
      dayView(ann(), { businessHours: {} });
      // 6, 7, 8 and 17, 18, 19 of 14 slots
      expect(shaded()).toHaveLength(6);
      expect(slots()[3].hasAttribute("data-rs-unavailable")).toBe(false);
    });

    it("names a shaded slot as unavailable for screen readers", () => {
      dayView(ann(), { businessHours: {} });
      expect(slots()[0].getAttribute("aria-label")).toBe(
        "Ann, Tuesday, March 10, 6:00 AM, unavailable"
      );
      expect(slots()[3].getAttribute("aria-label")).toBe("Ann, Tuesday, March 10, 9:00 AM");
    });

    it("shades a resource's own unavailable ranges", () => {
      dayView(
        ann({ unavailable: [{ start: new Date(2026, 2, 10, 12), end: new Date(2026, 2, 10, 13) }] })
      );
      expect(shaded()).toHaveLength(1);
      expect(Number(shaded()[0].dataset.rsSlot)).toBe(new Date(2026, 2, 10, 12).getTime());
    });

    it("lets a resource opt out of the shared hours", () => {
      dayView(ann({ businessHours: false }), { businessHours: {} });
      expect(shaded()).toHaveLength(0);
    });

    it("still lets the user select shaded slots by default", () => {
      const onSlotSelect = vi.fn();
      dayView(ann(), { businessHours: {}, onSlotSelect });
      selectSlots(0, 1); // 6:00 to 8:00, before opening
      expect(onSlotSelect).toHaveBeenCalledTimes(1);
    });

    it("rejects a selection that touches shaded slots with blockUnavailable", () => {
      const onSlotSelect = vi.fn();
      dayView(ann(), { businessHours: {}, blockUnavailable: true, onSlotSelect });

      selectSlots(0, 1); // 6:00 to 8:00
      selectSlots(2, 3); // 8:00 to 10:00 reaches into the shaded 8:00 slot
      expect(onSlotSelect).not.toHaveBeenCalled();

      selectSlots(3, 4); // 9:00 to 11:00
      expect(onSlotSelect).toHaveBeenCalledTimes(1);
    });

    it("still runs isValidDrop alongside blockUnavailable", () => {
      const onSlotSelect = vi.fn();
      const isValidDrop = vi.fn(() => false);
      dayView(ann(), { businessHours: {}, blockUnavailable: true, isValidDrop, onSlotSelect });

      selectSlots(3, 4);

      expect(isValidDrop).toHaveBeenCalled();
      expect(onSlotSelect).not.toHaveBeenCalled();
    });

    it("shades non-working days in the week view", () => {
      render(
        <ResourceScheduler
          resources={ann()}
          initialDate={day}
          initialView={ViewType.Week}
          businessHours={{}}
        />
      );
      // Sunday and Saturday of the 7 days shown
      expect(shaded()).toHaveLength(2);
    });
  });

  describe("now indicator", () => {
    // The clock reads Wednesday 7 October 2026, 12:00.
    const ann: Resource[] = [{ id: "r1", name: "Ann", events: [] }];
    const line = () => document.querySelector<HTMLElement>("[data-rs-now]");

    it("is off by default", () => {
      render(<ResourceScheduler resources={ann} initialView={ViewType.Day} />);
      expect(line()).toBeNull();
    });

    it("sits at the current time in today's day view", () => {
      render(<ResourceScheduler resources={ann} initialView={ViewType.Day} nowIndicator />);
      expect(line()!.style.left).toBe("50%");
    });

    it("measures against the visible hours", () => {
      render(
        <ResourceScheduler
          resources={ann}
          initialView={ViewType.Day}
          dayStartHour={8}
          dayEndHour={18}
          nowIndicator
        />
      );
      expect(line()!.style.left).toBe("40%");
    });

    it("is hidden when the day shown is not today", () => {
      render(
        <ResourceScheduler
          resources={ann}
          initialDate={new Date(2026, 9, 8)}
          initialView={ViewType.Day}
          nowIndicator
        />
      );
      expect(line()).toBeNull();
    });

    it("is hidden when now is outside the visible hours", () => {
      render(
        <ResourceScheduler
          resources={ann}
          initialView={ViewType.Day}
          dayStartHour={13}
          dayEndHour={18}
          nowIndicator
        />
      );
      expect(line()).toBeNull();
    });

    it("is hidden in the date views", () => {
      render(<ResourceScheduler resources={ann} initialView={ViewType.Week} nowIndicator />);
      expect(line()).toBeNull();
    });

    it("moves as the minutes pass", () => {
      vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
      vi.setSystemTime(new Date(2026, 9, 7, 12));
      render(<ResourceScheduler resources={ann} initialView={ViewType.Day} nowIndicator />);

      act(() => {
        // advancing the timers also advances the clock by that minute
        vi.setSystemTime(new Date(2026, 9, 7, 17, 59));
        vi.advanceTimersByTime(60_000);
      });

      expect(line()!.style.left).toBe("75%");
    });
  });
});
