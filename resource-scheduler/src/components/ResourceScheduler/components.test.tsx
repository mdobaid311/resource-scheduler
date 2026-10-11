import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { de } from "date-fns/locale";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, type SchedulerComponents, ViewType } from "./types";

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
  vi.setSystemTime(new Date(2026, 9, 7, 12)); // a Wednesday
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const standup = { id: "standup", title: "Standup", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) };
const team = (): Resource[] => [
  { id: "ann", name: "Ann", role: "Designer", events: [standup] },
  { id: "bob", name: "Bob", events: [] },
];
const view = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
  render(
    <ResourceScheduler
      resources={team()}
      initialDate={new Date(2026, 9, 7)}
      initialView={ViewType.Day}
      dayStartHour={8}
      dayEndHour={12}
      {...props}
    />
  );
const eventButton = () => screen.getByRole("button", { name: /Standup/ });
const press = (el: Element, key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(el, { key, ...init });

describe("components", () => {
  describe("Event", () => {
    const Event: SchedulerComponents["Event"] = ({ event, resource }) => (
      <span data-testid="card">
        {event.title} for {resource?.name}
      </span>
    );

    it("replaces the content of the card and keeps the card itself", () => {
      const onEventResize = vi.fn();
      view({ components: { Event }, onEventResize });
      const card = eventButton();
      expect(within(card).getByTestId("card").textContent).toBe("Standup for Ann");
      // Still the keyboard-reachable, draggable, resizable card.
      expect(card.getAttribute("data-rs-event")).toBe("standup");
      expect(card.getAttribute("aria-label")).toContain("9:00 AM to 10:00 AM");
      expect(card.querySelectorAll("[data-rs-resize]")).toHaveLength(2);
      // The default text of the card is gone.
      expect(within(card).queryByText("9:00 AM - 10:00 AM")).toBeNull();
    });

    it("can use hooks, and keeps its state when the scheduler re-renders", () => {
      const Counter: SchedulerComponents["Event"] = () => {
        const [count, setCount] = useState(0);
        return (
          <button type="button" data-testid="count" onClick={(e) => { e.stopPropagation(); setCount(count + 1); }}>
            {count}
          </button>
        );
      };
      const { rerender } = view({ components: { Event: Counter } });
      fireEvent.click(screen.getByTestId("count"));
      expect(screen.getByTestId("count").textContent).toBe("1");

      rerender(
        <ResourceScheduler
          resources={team()}
          initialDate={new Date(2026, 9, 7)}
          initialView={ViewType.Day}
          dayStartHour={8}
          dayEndHour={12}
          components={{ Event: Counter }} // a new object with the same component
        />
      );
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    it("opens the popover from the card with Enter", () => {
      view({ components: { Event } });
      act(() => eventButton().focus());
      press(eventButton(), "Enter");
      expect(screen.getByRole("dialog").textContent).toContain("Standup");
    });

    it("wins over renderTimeSlot", () => {
      view({ components: { Event }, renderTimeSlot: () => <span data-testid="old">old</span> });
      expect(screen.queryByTestId("old")).toBeNull();
      expect(screen.getByTestId("card")).toBeTruthy();
    });

    it("gets wall-clock Dates with timeZone, like render props", () => {
      const Hours: SchedulerComponents["Event"] = ({ event }) => <span data-testid="hours">{event.startDate.getHours()}</span>;
      view({
        components: { Event: Hours },
        timeZone: "Asia/Tokyo",
        initialDate: new Date("2026-10-07T03:00:00Z"),
        resources: [{ id: "ann", name: "Ann", events: [{ ...standup, startDate: new Date("2026-10-07T00:00:00Z"), endDate: new Date("2026-10-07T01:00:00Z") }] }],
      });
      expect(screen.getByTestId("hours").textContent).toBe("9");
    });
  });

  describe("EventPopover", () => {
    it("replaces the details, and closes through `close`", () => {
      const EventPopover: SchedulerComponents["EventPopover"] = ({ event, resource, close }) => (
        <div>
          <p data-testid="details">
            {event.title} with {resource.name}
          </p>
          <button type="button" onClick={close}>
            Done
          </button>
        </div>
      );
      view({ components: { EventPopover } });
      act(() => eventButton().focus());
      press(eventButton(), "Enter");
      expect(screen.getByTestId("details").textContent).toBe("Standup with Ann");
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(screen.queryByTestId("details")).toBeNull();
    });

    it("wins over renderEventPopover", () => {
      view({
        components: { EventPopover: () => <p>new</p> },
        renderEventPopover: () => <p>old</p>,
      });
      act(() => eventButton().focus());
      press(eventButton(), "Enter");
      expect(screen.queryByText("old")).toBeNull();
      expect(screen.getByText("new")).toBeTruthy();
    });
  });

  describe("ResourceHeader", () => {
    it("replaces the name in each resource cell", () => {
      const ResourceHeader: SchedulerComponents["ResourceHeader"] = ({ resource }) => (
        <span data-testid="who">
          {resource.name.toUpperCase()} ({resource.role ?? "no role"})
        </span>
      );
      view({ components: { ResourceHeader } });
      expect(screen.getAllByTestId("who").map((el) => el.textContent)).toEqual(["ANN (Designer)", "BOB (no role)"]);
      expect(screen.queryByText("Ann")).toBeNull();
    });

    it("does not touch group headers", () => {
      view({
        resources: team().map((r) => ({ ...r, group: "Design" })),
        components: { ResourceHeader: ({ resource }) => <span data-testid="who">{resource.name}</span> },
      });
      expect(screen.getAllByTestId("who")).toHaveLength(2);
      expect(screen.getByRole("button", { name: /Design, 2 resources/ })).toBeTruthy();
    });
  });

  describe("DateHeader", () => {
    it("replaces the content of each column header", () => {
      const DateHeader: SchedulerComponents["DateHeader"] = ({ date, view }) => (
        <span data-testid="column">
          {view}:{date.getHours()}
        </span>
      );
      view({ components: { DateHeader } });
      expect(screen.getAllByTestId("column").map((el) => el.textContent)).toEqual(["day:8", "day:9", "day:10", "day:11"]);
    });

    it("gets days in the week view", () => {
      view({
        initialView: ViewType.Week,
        components: { DateHeader: ({ date }) => <span data-testid="column">{date.getDate()}</span> },
      });
      expect(screen.getAllByTestId("column").map((el) => el.textContent)).toEqual(["4", "5", "6", "7", "8", "9", "10"]);
    });
  });

  describe("EmptyCell", () => {
    it("draws in every empty slot with its date and resource", () => {
      const EmptyCell: SchedulerComponents["EmptyCell"] = ({ date, resource }) => (
        <i data-testid="cell">
          {resource.id}@{date.getHours()}
        </i>
      );
      view({ components: { EmptyCell } });
      const cells = screen.getAllByTestId("cell").map((el) => el.textContent);
      expect(cells).toHaveLength(8); // 4 hours for each of 2 resources
      expect(cells).toContain("ann@8");
      expect(cells).toContain("bob@11");
    });
  });

  describe("Toolbar", () => {
    const Toolbar: SchedulerComponents["Toolbar"] = ({ title, viewTitle, views, viewType, currentDate, onNavigate, onViewChange, onGoToToday, labels }) => (
      <div data-testid="toolbar">
        <span data-testid="title">{title}</span>
        <span data-testid="view-title">{viewTitle}</span>
        <span data-testid="date">{currentDate.getDate()}</span>
        <button onClick={() => onNavigate("prev")}>back</button>
        <button onClick={() => onNavigate("next")}>forward</button>
        <button onClick={onGoToToday}>{labels.today}</button>
        {views.map((v) => (
          <button key={v} aria-pressed={v === viewType} onClick={() => onViewChange(v)}>
            {labels.views[v]}
          </button>
        ))}
      </div>
    );

    it("replaces the toolbar and gets the title and the choices", () => {
      view({ components: { Toolbar } });
      expect(screen.queryByRole("button", { name: "Previous period" })).toBeNull();
      expect(screen.getByTestId("title").textContent).toBe("October 7, 2026");
      expect(screen.getByTestId("view-title").textContent).toBe("Day View");
      expect(screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent)).toEqual(["Day"]);
    });

    it("moves the scheduler through its callbacks", () => {
      const onDateChange = vi.fn();
      const onViewChange = vi.fn();
      view({ components: { Toolbar }, onDateChange, onViewChange });
      fireEvent.click(screen.getByText("forward"));
      expect(screen.getByTestId("date").textContent).toBe("8");
      expect(onDateChange).toHaveBeenLastCalledWith(new Date(2026, 9, 8));
      fireEvent.click(screen.getByText("back"));
      fireEvent.click(screen.getByText("back"));
      expect(screen.getByTestId("date").textContent).toBe("6");

      fireEvent.click(screen.getByText("Week"));
      expect(onViewChange).toHaveBeenCalledWith("week");
      expect(screen.getByTestId("view-title").textContent).toBe("Week View");
      fireEvent.click(screen.getByText("Today"));
      expect(screen.getByTestId("date").textContent).toBe("7");
    });

    it("lists only the available views, and respects the locale", () => {
      view({ components: { Toolbar }, availableViews: [ViewType.Day, ViewType.Month], locale: de, labels: { today: "Heute" } });
      expect(screen.getAllByRole("button").map((b) => b.textContent)).toContain("Heute");
      expect(screen.queryByText("Week")).toBeNull();
      expect(screen.getByTestId("title").textContent).toBe("7. Oktober 2026");
    });

    it("gets instants through the handlers with timeZone", () => {
      const onDateChange = vi.fn();
      view({
        components: { Toolbar },
        timeZone: "Asia/Tokyo",
        initialDate: new Date("2026-10-07T03:00:00Z"),
        onDateChange,
      });
      fireEvent.click(screen.getByText("forward"));
      expect(onDateChange).toHaveBeenCalledWith(new Date("2026-10-08T03:00:00Z"));
    });
  });

  it("changes nothing without it", () => {
    view();
    expect(screen.getByRole("button", { name: "Previous period" })).toBeTruthy();
    expect(screen.getByText("Ann")).toBeTruthy();
    expect(within(eventButton()).getByText("9:00 AM - 10:00 AM")).toBeTruthy();
  });
});
