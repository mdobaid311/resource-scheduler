import { describe, expect, it } from "vitest";
import { type SchedulerEvent, ViewType } from "../types";
import {
  getDatesInView,
  getEventSpan,
  getEventStartPosition,
  getVisibleEvents,
  getVisibleRange,
} from "./dateUtils";

const d = (month: number, day: number, hour = 0) =>
  new Date(2026, month - 1, day, hour);
const ev = (id: string, startDate: Date, endDate: Date): SchedulerEvent => ({
  id,
  title: id,
  startDate,
  endDate,
});
const days = (dates: Date[]) => dates.map((x) => x.getDate());

// October 2026: the 7th is a Wednesday, the 3rd and 4th are the weekend.
describe("weekStartsOn", () => {
  it("defaults to Sunday", () => {
    expect(days(getDatesInView(d(10, 7), ViewType.Week))).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("starts the week on the chosen day", () => {
    expect(days(getDatesInView(d(10, 7), ViewType.Week, { weekStartsOn: 1 }))).toEqual([
      5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it("keeps the displayed date inside its week when it is the first day", () => {
    expect(days(getDatesInView(d(10, 4), ViewType.Week, { weekStartsOn: 1 }))).toEqual([
      28, 29, 30, 1, 2, 3, 4,
    ]);
  });
});

describe("hideWeekends", () => {
  it("drops Saturday and Sunday from the week", () => {
    expect(days(getDatesInView(d(10, 7), ViewType.Week, { hideWeekends: true }))).toEqual([
      5, 6, 7, 8, 9,
    ]);
  });

  it("drops them from the month", () => {
    const month = getDatesInView(d(10, 7), ViewType.Month, { hideWeekends: true });
    expect(month).toHaveLength(22);
    expect(month.every((x) => x.getDay() !== 0 && x.getDay() !== 6)).toBe(true);
  });

  it("leaves the day view alone, even on a weekend", () => {
    expect(days(getDatesInView(d(10, 3), ViewType.Day, { hideWeekends: true }))).toEqual([3]);
  });

  describe("event layout over the remaining columns", () => {
    const month = getDatesInView(d(10, 7), ViewType.Month, { hideWeekends: true });
    // Columns: Oct 1, 2, 5, 6, ...
    const pos = (e: SchedulerEvent) => getEventStartPosition(e, month, ViewType.Month);
    const span = (e: SchedulerEvent) => getEventSpan(e, month, ViewType.Month);

    it("closes the gap an event spans over a weekend", () => {
      const e = ev("a", d(10, 2, 9), d(10, 5, 17)); // Friday to Monday
      expect(pos(e)).toBe(1);
      expect(span(e)).toBe(2);
    });

    it("starts a weekend event on the next visible day", () => {
      const e = ev("b", d(10, 3, 9), d(10, 6, 17)); // Saturday to Tuesday
      expect(pos(e)).toBe(2);
      expect(span(e)).toBe(2);
    });

    it("ends a weekend-ending event on the last visible day before it", () => {
      const e = ev("c", d(10, 1, 9), d(10, 4, 17)); // Thursday to Sunday
      expect(pos(e)).toBe(0);
      expect(span(e)).toBe(2);
    });
  });

  it("does not show an event that only exists on hidden days", () => {
    const weekend = ev("w", d(10, 3, 9), d(10, 4, 17));
    const friday = ev("f", d(10, 2, 9), d(10, 2, 17));
    const shown = getVisibleEvents([weekend, friday], d(10, 7), ViewType.Week, undefined, {
      hideWeekends: true,
    });
    expect(shown.map((e) => e.id)).toEqual([]);
    const shownMonth = getVisibleEvents([weekend, friday], d(10, 7), ViewType.Month, undefined, {
      hideWeekends: true,
    });
    expect(shownMonth.map((e) => e.id)).toEqual(["f"]);
  });
});

describe("getVisibleRange", () => {
  it("covers the visible hours in the day view", () => {
    expect(
      getVisibleRange(d(10, 7), ViewType.Day, { dayStartHour: 9, dayEndHour: 17 })
    ).toEqual({ start: d(10, 7, 9), end: d(10, 7, 17) });
  });

  it("covers the whole day by default", () => {
    expect(getVisibleRange(d(10, 7, 13), ViewType.Day)).toEqual({
      start: d(10, 7),
      end: d(10, 8),
    });
  });

  it("ends the week at the start of the next one (end is exclusive)", () => {
    expect(getVisibleRange(d(10, 7), ViewType.Week)).toEqual({
      start: d(10, 4),
      end: d(10, 11),
    });
  });

  it("follows weekStartsOn and hideWeekends", () => {
    expect(getVisibleRange(d(10, 7), ViewType.Week, { weekStartsOn: 1 })).toEqual({
      start: d(10, 5),
      end: d(10, 12),
    });
    expect(getVisibleRange(d(10, 7), ViewType.Week, { hideWeekends: true })).toEqual({
      start: d(10, 5),
      end: d(10, 10),
    });
  });

  it("covers the month", () => {
    expect(getVisibleRange(d(10, 7), ViewType.Month)).toEqual({
      start: d(10, 1),
      end: d(11, 1),
    });
  });
});
