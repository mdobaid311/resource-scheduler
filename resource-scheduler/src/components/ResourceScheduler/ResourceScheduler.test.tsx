import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { de } from "date-fns/locale";
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

  describe("flat events prop", () => {
    // The clock reads Wednesday 7 October 2026; the week view shows Oct 4 to 10.
    const rows: Resource[] = [
      { id: "r1", name: "Ann", events: [] },
      { id: "r2", name: "Bob", events: [] },
    ];
    const flat = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      title: id,
      startDate: new Date(2026, 9, 7, 9),
      endDate: new Date(2026, 9, 7, 10),
      ...extra,
    });
    const rowOf = (id: string) =>
      [...document.querySelectorAll<HTMLElement>(`[data-rs-event="${id}"]`)].map((el) =>
        el.closest('[role="row"]')?.getAttribute("aria-rowindex")
      );
    const week = (props: Partial<React.ComponentProps<typeof ResourceScheduler>>) =>
      render(<ResourceScheduler resources={rows} initialView={ViewType.Week} {...props} />);

    it("draws an event under the resource named by resourceId", () => {
      week({ events: [flat("e1", { resourceId: "r2" })] });
      expect(rowOf("e1")).toEqual(["2"]);
    });

    it("draws an event under every resource in resourceIds", () => {
      week({ events: [flat("e1", { resourceIds: ["r1", "r2"] })] });
      expect(rowOf("e1")).toEqual(["1", "2"]);
    });

    it("shows flat events next to the ones on the resources", () => {
      const own = flat("own");
      week({
        resources: [{ ...rows[0], events: [own] }, rows[1]],
        events: [flat("e1", { resourceId: "r1" })],
      });
      expect(rowOf("own")).toEqual(["1"]);
      expect(rowOf("e1")).toEqual(["1"]);
    });

    it("applies the overlap rules to flat events", () => {
      const onSlotSelect = vi.fn();
      week({
        events: [flat("e1", { resourceId: "r2" })],
        eventOverlap: false,
        onSlotSelect,
      });
      const bobCells = [...document.querySelectorAll<HTMLElement>('[data-rs-resource="r2"]')];
      const click = (cell: HTMLElement) => {
        fireEvent.mouseDown(cell);
        fireEvent.mouseUp(window);
      };

      click(bobCells[3]); // Wednesday, where e1 is
      expect(onSlotSelect).not.toHaveBeenCalled();

      click(bobCells[4]); // Thursday, free
      expect(onSlotSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("i18n", () => {
    // The clock reads Wednesday 7 October 2026.
    const rows: Resource[] = [{ id: "r1", name: "Ann", events: [] }];
    const german = {
      resources: "Ressourcen",
      today: "Heute",
      previousPeriod: "Vorheriger Zeitraum",
      nextPeriod: "Nächster Zeitraum",
      gridName: "Ressourcenplan",
      allDay: "Ganztägig",
      unavailable: "nicht verfügbar",
      views: { month: "Monat", week: "Woche" },
      viewTitle: (name: string) => `Ansicht ${name}`,
      help: () => "Pfeiltasten bewegen den Cursor.",
      announce: {
        pickedUp: (title: string) => `${title} aufgenommen.`,
      },
    };
    const slotDays = () =>
      [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")].map((el) =>
        new Date(Number(el.dataset.rsSlot)).getDate()
      );

    it("translates the toolbar, the resource header and the view names", () => {
      render(
        <ResourceScheduler
          resources={rows}
          initialView={ViewType.Month}
          locale={de}
          labels={german}
        />
      );
      // The period title is the first line of the toolbar's live region.
      expect(document.querySelector('[aria-live="polite"] span')?.textContent).toBe(
        "Oktober 2026"
      );
      expect(screen.getByText("Ressourcen")).toBeTruthy();
      expect(screen.getByLabelText("Heute")).toBeTruthy();
      expect(screen.getByLabelText("Nächster Zeitraum")).toBeTruthy();
      expect(screen.getByText("Ansicht Monat")).toBeTruthy();
    });

    it("starts the week where the locale does, unless weekStartsOn says otherwise", () => {
      render(<ResourceScheduler resources={rows} initialView={ViewType.Week} locale={de} />);
      expect(slotDays()).toEqual([5, 6, 7, 8, 9, 10, 11]); // German weeks start on Monday
      cleanup();
      render(
        <ResourceScheduler
          resources={rows}
          initialView={ViewType.Week}
          locale={de}
          weekStartsOn={0}
        />
      );
      expect(slotDays()).toEqual([4, 5, 6, 7, 8, 9, 10]);
    });

    it("writes slot names for screen readers in the locale", () => {
      render(
        <ResourceScheduler
          resources={rows}
          initialView={ViewType.Week}
          locale={de}
          labels={german}
          businessHours={{}}
        />
      );
      const cells = [...document.querySelectorAll<HTMLElement>("[data-rs-slot]")];
      expect(cells[2].getAttribute("aria-label")).toBe("Ann, Mittwoch, 7. Oktober 2026");
      expect(cells[5].getAttribute("aria-label")).toBe("Ann, Samstag, 10. Oktober 2026, nicht verfügbar");
    });

    it("shows 24-hour column headers with hour12={false}, 12-hour by default", () => {
      render(<ResourceScheduler resources={rows} initialView={ViewType.Day} hour12={false} />);
      expect(screen.getByText("09:00")).toBeTruthy();
      cleanup();
      render(<ResourceScheduler resources={rows} initialView={ViewType.Day} />);
      expect(screen.getByText("9AM")).toBeTruthy();
    });

    it("names the grid from the labels, and ariaLabel still wins", () => {
      render(<ResourceScheduler resources={rows} labels={german} />);
      expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("Ressourcenplan");
      cleanup();
      render(<ResourceScheduler resources={rows} labels={german} ariaLabel="Mein Plan" />);
      expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("Mein Plan");
    });

    it("translates the keyboard help and the announcements", () => {
      const event = {
        id: "e",
        title: "Termin",
        startDate: new Date(2026, 9, 7, 9),
        endDate: new Date(2026, 9, 7, 10),
      };
      render(
        <ResourceScheduler
          resources={[{ ...rows[0], events: [event] }]}
          initialView={ViewType.Week}
          labels={german}
        />
      );
      expect(document.body.textContent).toContain("Pfeiltasten bewegen den Cursor.");

      fireEvent.keyDown(document.querySelector('[data-rs-event="e"]')!, { key: " " });
      expect(screen.getByRole("status").textContent).toBe("Termin aufgenommen.");
    });

    it("translates the all-day label on event cards", () => {
      const holiday = {
        id: "h",
        title: "Feiertag",
        startDate: new Date(2026, 9, 7),
        endDate: new Date(2026, 9, 8),
      };
      render(
        <ResourceScheduler
          resources={[{ ...rows[0], events: [holiday] }]}
          initialView={ViewType.Week}
          labels={german}
        />
      );
      expect(screen.getByText("Ganztägig")).toBeTruthy();
    });
  });

  describe("right-to-left", () => {
    // The clock reads Wednesday 7 October 2026.
    const standup = {
      id: "e",
      title: "Standup",
      startDate: new Date(2026, 9, 7, 9),
      endDate: new Date(2026, 9, 7, 10),
    };
    const rows: Resource[] = [{ id: "r1", name: "Ann", events: [standup] }];
    const week = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
      render(<ResourceScheduler resources={rows} initialView={ViewType.Week} {...props} />);
    const root = () => document.querySelector<HTMLElement>(".rs-root")!;

    it("sets the document direction on the scheduler", () => {
      week();
      expect(root().getAttribute("dir")).toBe("ltr");
      cleanup();
      week({ dir: "rtl" });
      expect(root().getAttribute("dir")).toBe("rtl");
    });

    it("moves a carried event the way the arrows point: left is later in a right-to-left layout", () => {
      const carryLeft = (dir: "ltr" | "rtl") => {
        const onEventDrop = vi.fn();
        week({ dir, onEventDrop });
        const event = document.querySelector('[data-rs-event="e"]')!;
        fireEvent.keyDown(event, { key: " " });
        fireEvent.keyDown(event, { key: "ArrowLeft" });
        fireEvent.keyDown(event, { key: " " });
        cleanup();
        return onEventDrop.mock.calls[0][3] as Date;
      };
      expect(carryLeft("ltr")).toEqual(new Date(2026, 9, 6, 9)); // Tuesday
      expect(carryLeft("rtl")).toEqual(new Date(2026, 9, 8, 9)); // Thursday
    });

    it("moves the slot cursor the way the arrows point too", () => {
      const columnAfterRight = (dir: "ltr" | "rtl") => {
        week({ dir });
        const grid = screen.getByRole("grid");
        fireEvent.focus(grid); // starts on today, column 3
        fireEvent.keyDown(grid, { key: "ArrowRight" });
        const id = grid.getAttribute("aria-activedescendant")!;
        cleanup();
        return Number(id.split("-c")[1]);
      };
      expect(columnAfterRight("ltr")).toBe(4);
      expect(columnAfterRight("rtl")).toBe(2);
    });

    it("draws the now line from the right edge", () => {
      render(
        <ResourceScheduler resources={rows} initialView={ViewType.Day} dir="rtl" nowIndicator />
      );
      const line = document.querySelector<HTMLElement>("[data-rs-now]")!;
      expect(line.style.right).toBe("50%");
      expect(line.style.left).toBe("");
    });

    it("mirrors the previous and next arrows", () => {
      week({ dir: "rtl" });
      const icon = (label: string) =>
        screen.getByLabelText(label).querySelector("svg")!.getAttribute("class");
      expect(icon("Previous period")).toContain("rotate-180");
      expect(icon("Next period")).toContain("rotate-180");
      cleanup();
      week();
      expect(icon("Previous period")).not.toContain("rotate-180");
    });
  });

  describe("recurring events", () => {
    // The clock reads Wednesday 7 October 2026; the week view shows Oct 4 to 10.
    const standup = {
      id: "s",
      title: "Standup",
      startDate: new Date(2026, 9, 5, 9), // Monday
      endDate: new Date(2026, 9, 5, 10),
      recurrence: { freq: "daily" as const },
    };
    const rows: Resource[] = [{ id: "r1", name: "Ann", events: [standup] }];
    const week = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
      render(<ResourceScheduler resources={rows} initialView={ViewType.Week} {...props} />);
    const occurrences = () =>
      [...document.querySelectorAll<HTMLElement>("[data-rs-event]")].map((el) => el.dataset.rsEvent);

    it("draws one event per occurrence inside the visible range", () => {
      week();
      expect(occurrences()).toEqual([
        "s::2026-10-05",
        "s::2026-10-06",
        "s::2026-10-07",
        "s::2026-10-08",
        "s::2026-10-09",
        "s::2026-10-10",
      ]);
    });

    it("draws the occurrences of the week you navigate to", () => {
      week();
      fireEvent.click(screen.getByLabelText("Next period"));
      expect(occurrences()).toHaveLength(7);
      expect(occurrences()[0]).toBe("s::2026-10-11");
    });

    it("applies the overlap rules to occurrences", () => {
      const onSlotSelect = vi.fn();
      week({ eventOverlap: false, onSlotSelect });
      const cells = [...document.querySelectorAll<HTMLElement>('[data-rs-resource="r1"]')];
      const click = (cell: HTMLElement) => {
        fireEvent.mouseDown(cell);
        fireEvent.mouseUp(window);
      };

      click(cells[3]); // Wednesday: an occurrence is there
      expect(onSlotSelect).not.toHaveBeenCalled();

      click(cells[0]); // Sunday: before the series starts
      expect(onSlotSelect).toHaveBeenCalledTimes(1);
    });

    it("hands an occurrence, with its seriesId, to the handlers", () => {
      const onEventDrop = vi.fn();
      week({ onEventDrop });
      const event = document.querySelector('[data-rs-event="s::2026-10-07"]')!;

      fireEvent.keyDown(event, { key: " " }); // pick up
      fireEvent.keyDown(event, { key: "ArrowRight" });
      fireEvent.keyDown(event, { key: " " }); // drop

      expect(onEventDrop).toHaveBeenCalledTimes(1);
      const [moved, from, to, start] = onEventDrop.mock.calls[0];
      expect(moved.id).toBe("s::2026-10-07");
      expect(moved.seriesId).toBe("s");
      expect([from, to]).toEqual(["r1", "r1"]);
      expect(start).toEqual(new Date(2026, 9, 8, 9));
    });
  });

  describe("row virtualization", () => {
    // Rows without events are 60px tall; the scroller is 300px high.
    const many = (n: number): Resource[] =>
      Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `Resource ${i}`, events: [] }));
    const rowIndexes = () =>
      [...document.querySelectorAll<HTMLElement>('[role="row"]')].map((el) =>
        Number(el.getAttribute("aria-rowindex"))
      );
    const scroller = () => document.querySelector<HTMLElement>(".overflow-x-auto")!;
    const scrollGridTo = (top: number) => {
      Object.defineProperty(scroller(), "scrollTop", { configurable: true, value: top });
      fireEvent.scroll(scroller());
    };
    const week = (resources: Resource[], virtualize?: boolean) =>
      render(
        <ResourceScheduler resources={resources} initialView={ViewType.Week} virtualize={virtualize} />
      );

    const original = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");
    beforeEach(() => {
      Object.defineProperty(Element.prototype, "clientHeight", {
        configurable: true,
        get: () => 300,
      });
    });
    afterEach(() => {
      if (original) Object.defineProperty(Element.prototype, "clientHeight", original);
    });

    it("renders only the rows near the viewport once there are many resources", () => {
      week(many(150));
      const rows = rowIndexes();
      expect(rows.length).toBeGreaterThan(3);
      expect(rows.length).toBeLessThan(40);
      expect(rows[0]).toBe(1);
      expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("150");
    });

    it("renders every row for a short list", () => {
      week(many(50));
      expect(rowIndexes()).toHaveLength(50);
    });

    it("can be switched off or forced on", () => {
      week(many(150), false);
      expect(rowIndexes()).toHaveLength(150);
      cleanup();
      week(many(20), true);
      expect(rowIndexes().length).toBeLessThan(20);
    });

    it("moves the window as the user scrolls, in the grid and the resource column", () => {
      week(many(150));
      expect(screen.queryByText("Resource 0")).not.toBeNull();

      scrollGridTo(3000); // rows from about index 49 are in view

      const rows = rowIndexes();
      expect(rows).toContain(50);
      expect(rows).not.toContain(1);
      expect(screen.queryByText("Resource 49")).not.toBeNull();
      expect(screen.queryByText("Resource 0")).toBeNull();
    });

    it("keeps the resource column as tall as all the rows together", () => {
      week(many(150));
      scrollGridTo(3000);
      const column = screen.getByText("Resources").parentElement!.parentElement!;
      const heights = [...column.children]
        .map((el) => parseFloat((el as HTMLElement).style.height))
        .filter((h) => !Number.isNaN(h));
      expect(heights.reduce((a, b) => a + b, 0)).toBe(150 * 60);
    });

    it("scrolls the target of a keyboard-carried event into view", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const resources = many(150);
      resources[0].events = [
        {
          id: "e",
          title: "E",
          startDate: new Date(2026, 9, 7, 9),
          endDate: new Date(2026, 9, 7, 10),
        },
      ];
      week(resources);
      const event = document.querySelector('[data-rs-event="e"]')!;

      fireEvent.keyDown(event, { key: " " }); // pick up
      scrollIntoView.mockClear();
      fireEvent.keyDown(event, { key: "ArrowDown" });

      const { contexts } = scrollIntoView.mock;
      const target = contexts[contexts.length - 1] as HTMLElement;
      expect(target.dataset.rsResource).toBe("r1");
      expect(target.hasAttribute("data-rs-footprint")).toBe(true);
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    it("brings focus back to a carried event whose row has scrolled away", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const resources = many(150);
      resources[0].events = [
        {
          id: "e",
          title: "E",
          startDate: new Date(2026, 9, 7, 9),
          endDate: new Date(2026, 9, 7, 10),
        },
      ];
      week(resources);
      const event = document.querySelector<HTMLElement>('[data-rs-event="e"]')!;
      event.focus();

      fireEvent.keyDown(event, { key: " " }); // pick up
      scrollGridTo(3000); // the grid followed the carried event far down
      scrollIntoView.mockClear();
      fireEvent.keyDown(event, { key: "Escape" }); // cancel

      const back = document.querySelector<HTMLElement>('[data-rs-event="e"]');
      expect(back).not.toBeNull();
      expect(document.activeElement).toBe(back);
      expect(scrollIntoView.mock.contexts).toContain(back);
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    it("keeps the row holding the keyboard cursor mounted", () => {
      week(many(150));
      const grid = screen.getByRole("grid");
      fireEvent.focus(grid);
      for (let i = 0; i < 60; i++) fireEvent.keyDown(grid, { key: "ArrowDown" });

      expect(rowIndexes()).toContain(61);
      const active = grid.getAttribute("aria-activedescendant");
      expect(document.getElementById(active!)).not.toBeNull();
    });
  });

  describe("classNames", () => {
    const day = new Date(2026, 2, 10);
    const resources: Resource[] = [
      {
        id: "a",
        name: "Ann",
        group: "Team",
        events: [
          { id: "e", title: "E", startDate: new Date(2026, 2, 10, 9), endDate: new Date(2026, 2, 10, 10) },
        ],
      },
    ];
    const show = (classNames?: React.ComponentProps<typeof ResourceScheduler>["classNames"]) =>
      render(
        <ResourceScheduler
          resources={resources}
          initialDate={day}
          initialView={ViewType.Day}
          dayStartHour={9}
          dayEndHour={11}
          classNames={classNames}
        />
      );

    it("adds your classes to each part", () => {
      show({
        root: "c-root",
        toolbar: "c-toolbar",
        dateHeader: "c-date",
        resourceCell: "c-res",
        groupHeader: "c-group",
        slot: "c-slot",
        event: "c-event",
      });
      expect(document.querySelector(".rs-root")!.classList.contains("c-root")).toBe(true);
      expect(document.querySelectorAll(".c-toolbar")).toHaveLength(1);
      expect(document.querySelectorAll(".c-date").length).toBeGreaterThanOrEqual(2);
      expect(document.querySelectorAll(".c-slot")).toHaveLength(
        document.querySelectorAll("[data-rs-slot]").length
      );
      expect(document.querySelector(".c-event")!.hasAttribute("data-rs-event")).toBe(true);
      expect(document.querySelector(".c-group")).toBe(screen.getByRole("button", { name: "Team, 1 resource" }));
      expect(document.querySelector(".c-res")!.textContent).toContain("Ann");
    });

    it("lets your class win over a conflicting default", () => {
      show({ event: "rounded-none" });
      const card = document.querySelector("[data-rs-event]")!;
      expect(card.classList.contains("rounded-none")).toBe(true);
      expect(card.classList.contains("rounded")).toBe(false);
    });

    it("changes nothing without it", () => {
      // useId makes different ids on each render; compare everything else.
      const strip = (html: string) =>
        html.replace(/\s(id|for|aria-describedby|aria-activedescendant|aria-controls)="[^"]*"/g, "");
      const plain = show();
      const before = strip(plain.container.innerHTML);
      plain.unmount();
      const empty = show({});
      expect(strip(empty.container.innerHTML)).toBe(before);
    });
  });

  describe("resource groups", () => {
    const day = new Date(2026, 2, 10);
    // Laid out as: header A, Ann, Cy, header B, Bob, Di.
    const people: Resource[] = [
      { id: "ann", name: "Ann", events: [], group: "Ward A" },
      { id: "bob", name: "Bob", events: [], group: "Ward B" },
      { id: "cy", name: "Cy", events: [], group: "Ward A" },
      { id: "di", name: "Di", events: [] },
    ];
    const show = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
      render(
        <ResourceScheduler
          resources={people}
          initialDate={day}
          initialView={ViewType.Day}
          dayStartHour={9}
          dayEndHour={11}
          {...props}
        />
      );
    const cells = (id: string) => document.querySelectorAll<HTMLElement>(`[data-rs-resource="${id}"]`);
    const toggle = (name: string, count: number) =>
      screen.getByRole("button", { name: `${name}, ${count} resource${count === 1 ? "" : "s"}` });
    const activeLabel = () =>
      document
        .getElementById(screen.getByRole("grid").getAttribute("aria-activedescendant")!)
        ?.getAttribute("aria-label");

    it("adds no group rows when no resource has a group", () => {
      render(<ResourceScheduler resources={[{ id: "a", name: "A", events: [] }]} initialDate={day} />);
      // (the view selector is a combobox button, which also has aria-expanded)
      expect(document.querySelectorAll("button[aria-expanded]:not([role=combobox])")).toHaveLength(0);
    });

    it("puts a header before each group and lists its members under it", () => {
      show();
      expect(toggle("Ward A", 2).getAttribute("aria-expanded")).toBe("true");
      expect(toggle("Ward B", 1)).toBeTruthy();
      // Grid rows: the date header is row 1, so Ann is row 3 under the Ward A header on row 2.
      const row = (id: string) => cells(id)[0].style.gridRow;
      expect([row("ann"), row("cy"), row("bob"), row("di")]).toEqual(["3", "4", "6", "7"]);
      expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("6");
    });

    it("collapses and expands a group from its header", () => {
      show();
      fireEvent.click(toggle("Ward A", 2));
      expect(cells("ann")).toHaveLength(0);
      expect(cells("cy")).toHaveLength(0);
      expect(cells("bob").length).toBeGreaterThan(0);
      expect(toggle("Ward A", 2).getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(toggle("Ward A", 2));
      expect(cells("ann").length).toBeGreaterThan(0);
      expect(toggle("Ward A", 2).getAttribute("aria-expanded")).toBe("true");
    });

    it("starts collapsed with defaultCollapsedGroups", () => {
      show({ defaultCollapsedGroups: ["Ward B"] });
      expect(cells("bob")).toHaveLength(0);
      expect(cells("ann").length).toBeGreaterThan(0);
    });

    it("lets you control the collapsed groups", () => {
      const onChange = vi.fn();
      const { rerender } = show({ collapsedGroups: [], onCollapsedGroupsChange: onChange });
      fireEvent.click(toggle("Ward A", 2));
      expect(onChange).toHaveBeenCalledWith(["Ward A"]);
      expect(cells("ann").length).toBeGreaterThan(0); // nothing changes until you pass it back

      rerender(
        <ResourceScheduler
          resources={people}
          initialDate={day}
          initialView={ViewType.Day}
          dayStartHour={9}
          dayEndHour={11}
          collapsedGroups={["Ward A"]}
          onCollapsedGroupsChange={onChange}
        />
      );
      expect(cells("ann")).toHaveLength(0);
    });

    it("moves the keyboard cursor between resources and over the headers", () => {
      show();
      const grid = screen.getByRole("grid");
      fireEvent.focus(grid);
      expect(activeLabel()).toMatch(/^Ann,/);
      fireEvent.keyDown(grid, { key: "ArrowDown" });
      expect(activeLabel()).toMatch(/^Cy,/);
      fireEvent.keyDown(grid, { key: "ArrowDown" }); // not the Ward B header
      expect(activeLabel()).toMatch(/^Bob,/);
      fireEvent.keyDown(grid, { key: "ArrowDown" });
      expect(activeLabel()).toMatch(/^Di,/);
    });

    it("selects slots of the right resource under a group", () => {
      const onSlotSelect = vi.fn();
      show({ onSlotSelect });
      const bob = cells("bob");
      fireEvent.mouseDown(bob[0]);
      fireEvent.mouseEnter(bob[1]);
      fireEvent.mouseUp(window);
      expect(onSlotSelect).toHaveBeenCalledWith({
        resourceId: "bob",
        start: new Date(2026, 2, 10, 9),
        end: new Date(2026, 2, 10, 11), // two one-hour slots
      });
    });

    describe("nested", () => {
      const nested: Resource[] = [
        { id: "ann", name: "Ann", events: [], group: ["Main", "Floor 1"] },
        { id: "bob", name: "Bob", events: [], group: ["Main", "Floor 2"] },
        { id: "cy", name: "Cy", events: [], group: "Annex" },
      ];
      const showNested = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
        render(
          <ResourceScheduler
            resources={nested}
            initialDate={day}
            initialView={ViewType.Day}
            dayStartHour={9}
            dayEndHour={11}
            {...props}
          />
        );

      it("puts a header at each level and keeps the rows aligned", () => {
        showNested();
        expect(toggle("Main", 2)).toBeTruthy();
        expect(toggle("Floor 1", 1)).toBeTruthy();
        expect(toggle("Floor 2", 1)).toBeTruthy();
        expect(toggle("Annex", 1)).toBeTruthy();
        // Rows: Main, Floor 1, Ann, Floor 2, Bob, Annex, Cy; the date header is row 1.
        const row = (id: string) => cells(id)[0].style.gridRow;
        expect([row("ann"), row("bob"), row("cy")]).toEqual(["4", "6", "8"]);
        expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("7");
      });

      it("collapses a parent with its nested headers and resources", () => {
        showNested();
        fireEvent.click(toggle("Main", 2));
        expect(screen.queryByRole("button", { name: "Floor 1, 1 resource" })).toBeNull();
        expect(cells("ann")).toHaveLength(0);
        expect(cells("bob")).toHaveLength(0);
        expect(cells("cy").length).toBeGreaterThan(0);

        fireEvent.click(toggle("Main", 2));
        expect(cells("ann").length).toBeGreaterThan(0);
        expect(toggle("Floor 1", 1)).toBeTruthy();
      });

      it("reports a nested group by its path", () => {
        const onChange = vi.fn();
        showNested({ collapsedGroups: [], onCollapsedGroupsChange: onChange });
        fireEvent.click(toggle("Floor 1", 1));
        expect(onChange).toHaveBeenCalledWith(["Main / Floor 1"]);
      });

      it("starts with a nested group collapsed", () => {
        showNested({ defaultCollapsedGroups: ["Main / Floor 2"] });
        expect(cells("bob")).toHaveLength(0);
        expect(cells("ann").length).toBeGreaterThan(0);
      });

      it("indents a nested header further than its parent", () => {
        showNested();
        expect(toggle("Main", 2).getAttribute("style") ?? "").not.toContain("padding-inline-start");
        expect(toggle("Floor 1", 1).getAttribute("style") ?? "").toContain("padding-inline-start: 28px");
      });
    });

    it("shows utilization as a meter on resources and as a total on headers", () => {
      show({ showUtilization: true });
      expect(screen.getAllByRole("meter")).toHaveLength(4); // the resources
      // A header adds up what is below it (two resources of 2 hours each) and says so aloud.
      const header = screen.getByRole("button", { name: "Ward A, 2 resources, 0 of 4 hours booked" });
      expect(header.textContent).toContain("0%");
    });

    it("keeps a folded group's total on its header", () => {
      show({ showUtilization: true, defaultCollapsedGroups: ["Ward A"] });
      expect(cells("ann")).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Ward A, 2 resources, 0 of 4 hours booked" })).toBeTruthy();
    });

    it("shows no totals on headers without showUtilization", () => {
      show();
      expect(toggle("Ward A", 2).textContent).not.toContain("%");
    });

    it("has no detectable accessibility violations", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const { container } = show({ showUtilization: true });
      const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
      ).toEqual([]);
    });
  });

  describe("utilization", () => {
    // The system time is Wednesday 7 October 2026.
    const at = (hour: number) => new Date(2026, 9, 7, hour);
    const ann = (extra: Partial<Resource> = {}): Resource[] => [
      {
        id: "r1",
        name: "Ann",
        events: [{ id: "e", title: "E", startDate: at(9), endDate: at(13) }],
        ...extra,
      },
    ];
    // Business hours {} are Monday to Friday, 9 to 17: 40 hours in the week.
    const show = (
      resources: Resource[],
      props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}
    ) =>
      render(
        <ResourceScheduler
          resources={resources}
          initialView={ViewType.Week}
          businessHours={{}}
          showUtilization
          {...props}
        />
      );

    it("draws nothing unless showUtilization is set", () => {
      render(
        <ResourceScheduler resources={ann()} initialView={ViewType.Week} businessHours={{}} />
      );
      expect(screen.queryByRole("meter")).toBeNull();
    });

    it("shows booked against available time for the visible range", () => {
      show(ann());
      const meter = screen.getByRole("meter", { name: "4 of 40 hours booked" });
      expect(meter.getAttribute("aria-valuenow")).toBe("10");
      expect(meter.textContent).toBe("10%");
    });

    it("rounds half up: 23 of 40 hours is 58%, not 57%", () => {
      const day = (d: number, to: number) => ({
        id: `e${d}`,
        title: "E",
        startDate: new Date(2026, 9, d, 9),
        endDate: new Date(2026, 9, d, to),
      });
      show(ann({ events: [day(5, 17), day(6, 17), day(7, 16)] }));
      expect(screen.getByRole("meter", { name: "23 of 40 hours booked" }).textContent).toBe("58%");
    });

    it("follows the view: a day is measured on its own", () => {
      show(ann(), { initialView: ViewType.Day });
      expect(screen.getByRole("meter", { name: "4 of 8 hours booked" }).textContent).toBe("50%");
    });

    it("goes past 100% when overbooked, with a full red bar", () => {
      const double = [
        { id: "a", title: "A", startDate: at(9), endDate: at(17) },
        { id: "b", title: "B", startDate: at(9), endDate: at(17) },
      ];
      show(ann({ events: double }), { initialView: ViewType.Day });
      const meter = screen.getByRole("meter", { name: "16 of 8 hours booked" });
      expect(meter.textContent).toBe("200%");
      expect(meter.getAttribute("aria-valuenow")).toBe("100");
      expect(meter.querySelector(".bg-ocrs-destructive")).not.toBeNull();
    });

    it("multiplies the available time by capacity", () => {
      show(ann({ capacity: 2 }));
      expect(screen.getByRole("meter", { name: "4 of 80 hours booked" }).textContent).toBe("5%");
    });

    it("counts flat events, resource hours and time off", () => {
      const resource: Resource = {
        id: "r1",
        name: "Ann",
        events: [],
        businessHours: { startHour: 8, endHour: 12 },
        unavailable: [{ start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) }], // Monday
      };
      show([resource], {
        events: [{ id: "f", title: "F", resourceId: "r1", startDate: at(8), endDate: at(10) }],
      });
      // 4 working days of 4 hours, 2 of them booked.
      expect(screen.getByRole("meter", { name: "2 of 16 hours booked" }).textContent).toBe("13%");
    });

    it("shows a dash when nothing is available", () => {
      show(ann({ events: [] }), { businessHours: { daysOfWeek: [] } });
      const meter = screen.getByRole("meter", { name: "0 of 0 hours booked" });
      expect(meter.textContent).toBe("–");
    });

    it("uses your labels", () => {
      show(ann(), {
        labels: { utilization: (booked, available) => `${booked} von ${available} Stunden` },
      });
      expect(screen.getByRole("meter", { name: "4 von 40 Stunden" })).toBeTruthy();
    });

    it("has no detectable accessibility violations", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const { container } = show(ann());
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      });
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
      ).toEqual([]);
    });
  });
});
