import { describe, expect, it } from "vitest";
import { SchedulerEvent, ViewType } from "../types";
import {
  formatEventTime,
  getDatesInView,
  getDropRange,
  getEventSpan,
  getEventStartPosition,
  getSelectionBounds,
  getTimeSlots,
  getVisibleEvents,
} from "./dateUtils";

const d = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);
const ev = (startDate: Date, endDate: Date): SchedulerEvent => ({
  id: "e",
  title: "t",
  startDate,
  endDate,
});

describe("day view layout", () => {
  const slots = getTimeSlots(d(3, 10), ViewType.Day);
  const pos = (e: SchedulerEvent) => getEventStartPosition(e, slots, ViewType.Day);
  const span = (e: SchedulerEvent) => getEventSpan(e, slots, ViewType.Day);

  it("starts at the hour column of the start time", () => {
    expect(pos(ev(d(3, 10, 9, 30), d(3, 10, 10, 15)))).toBe(9);
  });

  it("spans every hour column the event touches", () => {
    expect(span(ev(d(3, 10, 9, 30), d(3, 10, 10, 15)))).toBe(2);
    expect(span(ev(d(3, 10, 9), d(3, 10, 10)))).toBe(1);
  });

  it("clamps an event that began on the previous day to column 0", () => {
    const e = ev(d(3, 9, 22), d(3, 10, 2));
    expect(pos(e)).toBe(0);
    expect(span(e)).toBe(2);
  });

  it("clamps an event that runs past midnight to the end of the day", () => {
    const e = ev(d(3, 10, 22), d(3, 11, 3));
    expect(pos(e)).toBe(22);
    expect(span(e)).toBe(2);
  });
});

describe("multi-day view layout", () => {
  const days = getDatesInView(d(3, 10), ViewType.Month);
  const span = (e: SchedulerEvent) => getEventSpan(e, days, ViewType.Month);

  it("does not occupy the next day when ending exactly at midnight", () => {
    expect(span(ev(d(3, 10), d(3, 11)))).toBe(1);
  });

  it("counts calendar days, not 24h blocks", () => {
    expect(span(ev(d(3, 10, 23), d(3, 11, 1)))).toBe(2);
  });

  it("clamps an event that began before the view", () => {
    const e = ev(d(2, 25), d(3, 3, 12));
    expect(getEventStartPosition(e, days, ViewType.Month)).toBe(0);
    expect(span(e)).toBe(3);
  });
});

describe("getVisibleEvents", () => {
  it("keeps events on the last day of a month view", () => {
    const e = ev(d(3, 31, 15), d(3, 31, 16));
    expect(getVisibleEvents([e], d(3, 10), ViewType.Month)).toEqual([e]);
  });

  it("keeps all events of the displayed day regardless of the current time", () => {
    const morning = ev(d(3, 10, 9), d(3, 10, 10));
    const nextDay = ev(d(3, 11, 9), d(3, 11, 10));
    expect(
      getVisibleEvents([morning, nextDay], d(3, 10, 15), ViewType.Day)
    ).toEqual([morning]);
  });

  it("keeps events that overlap the range edges and drops outside ones", () => {
    const before = ev(d(2, 20), d(2, 28));
    const crossing = ev(d(2, 28), d(3, 2));
    expect(
      getVisibleEvents([before, crossing], d(3, 10), ViewType.Month)
    ).toEqual([crossing]);
  });
});

describe("getDropRange", () => {
  it("keeps the time of day when dropped on a date column", () => {
    const r = getDropRange(
      ev(d(3, 10, 14, 30), d(3, 10, 16)),
      d(3, 12),
      ViewType.Week
    );
    expect(r).toEqual({ start: d(3, 12, 14, 30), end: d(3, 12, 16) });
  });

  it("keeps the duration of a multi-day event", () => {
    const r = getDropRange(
      ev(d(3, 10, 14), d(3, 12, 10)),
      d(3, 20),
      ViewType.Month
    );
    expect(r).toEqual({ start: d(3, 20, 14), end: d(3, 22, 10) });
  });

  it("uses the hour slot start in day view", () => {
    const r = getDropRange(
      ev(d(3, 10, 14, 30), d(3, 10, 16)),
      d(3, 10, 9),
      ViewType.Day
    );
    expect(r).toEqual({ start: d(3, 10, 9), end: d(3, 10, 10, 30) });
  });
});

describe("getSelectionBounds", () => {
  it("makes a single-slot selection one hour long in day view", () => {
    expect(getSelectionBounds(d(3, 10, 9), d(3, 10, 9), ViewType.Day)).toEqual({
      start: d(3, 10, 9),
      end: d(3, 10, 10),
    });
  });

  it("includes the last selected slot regardless of drag direction", () => {
    expect(getSelectionBounds(d(3, 10, 11), d(3, 10, 9), ViewType.Day)).toEqual({
      start: d(3, 10, 9),
      end: d(3, 10, 12),
    });
  });

  it("covers whole days in week view", () => {
    expect(getSelectionBounds(d(3, 10), d(3, 12), ViewType.Week)).toEqual({
      start: d(3, 10),
      end: d(3, 13),
    });
  });
});

describe("formatEventTime", () => {
  it("shows the time range of a timed event", () => {
    expect(formatEventTime(ev(d(3, 10, 9, 30), d(3, 10, 11)))).toBe(
      "9:30 AM - 11:00 AM"
    );
  });

  it("labels events spanning whole days as All day", () => {
    expect(formatEventTime(ev(d(3, 10), d(3, 13)))).toBe("All day");
  });
});
