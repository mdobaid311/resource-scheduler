import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Resource, ViewType } from "./types";

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

const at = (day: number, hour: number) => new Date(2026, 9, day, hour);
const event = (id: string, start: Date, end: Date) => ({ id, title: id, startDate: start, endDate: end });
const team = (): Resource[] => [
  { id: "ann", name: "Ann", events: [event("a1", at(7, 9), at(7, 11))] },
  { id: "bob", name: "Bob", events: [event("b1", at(7, 10), at(7, 12))] },
];

const view = (props: Partial<React.ComponentProps<typeof ResourceScheduler>> = {}) =>
  render(
    <ResourceScheduler
      resources={team()}
      initialDate={at(7, 12)}
      initialView={ViewType.Day}
      dayStartHour={8}
      dayEndHour={18}
      businessHours={{}} // Monday to Friday, 9 to 17
      showColumnUtilization
      {...props}
    />
  );
const strip = () => screen.queryByRole("group", { name: "Utilization" });
const meters = () => within(strip()!).getAllByRole("meter");
const percents = () => meters().map((m) => m.getAttribute("aria-valuenow"));
const texts = () => meters().map((m) => m.textContent);

describe("showColumnUtilization", () => {
  it("is off by default", () => {
    view({ showColumnUtilization: undefined });
    expect(strip()).toBeNull();
    expect(screen.queryByText("Utilization")).toBeNull();
  });

  it("shows how much of everyone's available time is booked in each column", () => {
    view();
    // 10 hourly columns from 8:00. Nobody is available at 8:00; at 9:00 Ann is booked, Bob is not (1 of 2 hours).
    expect(meters()).toHaveLength(10);
    expect(texts().slice(0, 5)).toEqual(["–", "50%", "100%", "50%", "0%"]);
    expect(percents().slice(0, 5)).toEqual(["0", "50", "100", "50", "0"]);
  });

  it("names each column and reads out the hours", () => {
    view();
    expect(meters()[1].getAttribute("aria-label")).toBe("Wednesday, October 7, 9:00 AM, 1 of 2 hours booked");
    expect(meters()[0].getAttribute("aria-label")).toBe("Wednesday, October 7, 8:00 AM, 0 of 0 hours booked");
  });

  it("labels the row in the resource column", () => {
    view();
    expect(screen.getAllByText("Utilization").length).toBeGreaterThan(0);
  });

  it("measures per day in the week view", () => {
    view({ initialView: ViewType.Week });
    // Sunday to Saturday. Wednesday: 4 hours booked of 16 (two people, 9 to 17).
    expect(meters()).toHaveLength(7);
    expect(percents()).toEqual(["0", "0", "0", "25", "0", "0", "0"]);
    expect(meters()[3].getAttribute("aria-label")).toBe("Wednesday, October 7, 2026, 4 of 16 hours booked");
    // Weekends have nothing available.
    expect(texts()[0]).toBe("–");
  });

  it("counts resources in a collapsed group", () => {
    view({
      resources: team().map((r) => ({ ...r, group: "Team" })),
      collapsedGroups: ["Team"],
    });
    expect(screen.queryByText("Ann")).toBeNull();
    expect(percents().slice(0, 5)).toEqual(["0", "50", "100", "50", "0"]);
  });

  it("stops the bar at 100% and turns it red when overbooked", () => {
    view({
      resources: [{ id: "ann", name: "Ann", events: [event("a1", at(7, 9), at(7, 10)), event("a2", at(7, 9), at(7, 10))] }],
    });
    const nine = meters()[1];
    expect(nine.textContent).toBe("200%");
    expect(nine.getAttribute("aria-valuenow")).toBe("100");
    expect(nine.querySelector(".bg-ocrs-destructive")).not.toBeNull();
  });

  it("uses the capacity of a resource", () => {
    view({
      resources: [{ id: "room", name: "Room", capacity: 4, events: [event("a1", at(7, 9), at(7, 10)), event("a2", at(7, 9), at(7, 10))] }],
    });
    expect(meters()[1].textContent).toBe("50%");
  });

  it("works without showUtilization, and alongside it", () => {
    view({ showUtilization: true });
    expect(screen.getAllByRole("meter").length).toBeGreaterThan(meters().length);
    expect(percents()[2]).toBe("100");
  });

  it("follows the zone of timeZone", () => {
    // 00:00 to 01:00 UTC is 09:00 to 10:00 in Tokyo, inside its business hours.
    view({
      timeZone: "Asia/Tokyo",
      initialDate: new Date("2026-10-07T03:00:00Z"),
      resources: [{ id: "ann", name: "Ann", events: [{ id: "a1", title: "a1", startDate: new Date("2026-10-07T00:00:00Z"), endDate: new Date("2026-10-07T01:00:00Z") }] }],
    });
    expect(percents().slice(0, 3)).toEqual(["0", "100", "0"]);
  });
});
