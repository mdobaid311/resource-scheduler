import { describe, expect, it } from "vitest";
import type { Recurrence, SchedulerEvent } from "../types";
import { editOccurrence, expandRecurrence, splitRecurrence } from "./recurrence";

// byMonthDay, bySetPos and hourly. Run also with TZ=America/New_York: DST there
// began on 8 March 2026 and ends on 1 November 2026.
const d = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);
const series = (
  recurrence: Recurrence,
  start = d(2026, 10, 5, 9), // Monday 9:00 to 10:00
  extra: Partial<SchedulerEvent> = {}
): SchedulerEvent => ({
  id: "s",
  title: "Standup",
  startDate: start,
  endDate: new Date(start.getTime() + 3_600_000),
  recurrence,
  ...extra,
});
const ymd = (events: SchedulerEvent[]) =>
  events.map((e) => `${e.startDate.getFullYear()}-${e.startDate.getMonth() + 1}-${e.startDate.getDate()}`);
const expand = (e: SchedulerEvent, from: Date, to: Date) => expandRecurrence(e, from, to);

describe("byMonthDay", () => {
  it("repeats on several days of the month, from the first occurrence on", () => {
    const out = expand(series({ freq: "monthly", byMonthDay: [15, 1] }), d(2026, 10, 1), d(2027, 1, 1));
    expect(ymd(out)).toEqual(["2026-10-15", "2026-11-1", "2026-11-15", "2026-12-1", "2026-12-15"]);
    expect(out.every((e) => e.startDate.getHours() === 9)).toBe(true);
  });

  it("counts negative days from the end of the month, leap years included", () => {
    const rule: Recurrence = { freq: "monthly", byMonthDay: [-1] };
    const out = expand(series(rule, d(2027, 12, 31, 9)), d(2027, 12, 1), d(2028, 5, 1));
    expect(ymd(out)).toEqual(["2027-12-31", "2028-1-31", "2028-2-29", "2028-3-31", "2028-4-30"]);
    expect(ymd(expand(series(rule, d(2026, 12, 31, 9)), d(2027, 2, 1), d(2027, 3, 1)))).toEqual(["2027-2-28"]);
  });

  it("skips months that lack the day", () => {
    const out = expand(series({ freq: "monthly", byMonthDay: [31] }, d(2026, 10, 31, 9)), d(2026, 10, 1), d(2027, 4, 1));
    expect(ymd(out)).toEqual(["2026-10-31", "2026-12-31", "2027-1-31", "2027-3-31"]);
  });

  it("keeps every n months", () => {
    const out = expand(series({ freq: "monthly", interval: 3, byMonthDay: [1, -1] }), d(2026, 10, 1), d(2027, 8, 1));
    expect(ymd(out)).toEqual(["2026-10-31", "2027-1-1", "2027-1-31", "2027-4-1", "2027-4-30", "2027-7-1", "2027-7-31"]);
  });

  it("yearly falls on the days of the month the series starts in", () => {
    const out = expand(series({ freq: "yearly", byMonthDay: [1, -1] }, d(2027, 2, 1, 9)), d(2027, 1, 1), d(2029, 1, 1));
    expect(ymd(out)).toEqual(["2027-2-1", "2027-2-28", "2028-2-1", "2028-2-29"]);
  });

  it("ends a rule that can never match instead of looping", () => {
    const out = expand(series({ freq: "yearly", byMonthDay: [31] }, d(2026, 2, 3, 9)), d(2026, 1, 1), d(2040, 1, 1));
    expect(out).toEqual([]);
  });

  it("ignores days that are out of range", () => {
    const out = expand(series({ freq: "monthly", byMonthDay: [0, 40, -40, 20] }), d(2026, 10, 1), d(2026, 12, 1));
    expect(ymd(out)).toEqual(["2026-10-20", "2026-11-20"]);
  });
});

describe("bySetPos with byWeekday", () => {
  const range = [d(2026, 10, 1), d(2027, 1, 1)] as const;

  it("the last Friday of the month", () => {
    const out = expand(series({ freq: "monthly", byWeekday: [5], bySetPos: [-1] }), ...range);
    expect(ymd(out)).toEqual(["2026-10-30", "2026-11-27", "2026-12-25"]);
  });

  it("the second Tuesday of the month", () => {
    const out = expand(series({ freq: "monthly", byWeekday: [2], bySetPos: [2] }), ...range);
    expect(ymd(out)).toEqual(["2026-10-13", "2026-11-10", "2026-12-8"]);
  });

  it("starts at the first match on or after the first day", () => {
    const out = expand(series({ freq: "monthly", byWeekday: [2], bySetPos: [2] }, d(2026, 10, 20, 9)), ...range);
    expect(ymd(out)).toEqual(["2026-11-10", "2026-12-8"]);
  });

  it("the last weekday of the month, and the first and last Monday together", () => {
    const weekday = expand(series({ freq: "monthly", byWeekday: [1, 2, 3, 4, 5], bySetPos: [-1] }), ...range);
    expect(ymd(weekday)).toEqual(["2026-10-30", "2026-11-30", "2026-12-31"]);
    const both = expand(series({ freq: "monthly", byWeekday: [1], bySetPos: [-1, 1] }), ...range);
    expect(ymd(both)).toEqual(["2026-10-5", "2026-10-26", "2026-11-2", "2026-11-30", "2026-12-7", "2026-12-28"]);
  });

  it("skips a month without that position (there is no fifth Friday)", () => {
    const out = expand(series({ freq: "monthly", byWeekday: [5], bySetPos: [5] }), d(2026, 10, 1), d(2027, 3, 1));
    expect(ymd(out)).toEqual(["2026-10-30", "2027-1-29"]);
  });

  it("works every n months and yearly (in the start month)", () => {
    const every = expand(series({ freq: "monthly", interval: 2, byWeekday: [5], bySetPos: [-1] }), d(2026, 10, 1), d(2027, 3, 1));
    expect(ymd(every)).toEqual(["2026-10-30", "2026-12-25", "2027-2-26"]);
    const yearly = expand(series({ freq: "yearly", byWeekday: [5], bySetPos: [-1] }), d(2026, 10, 1), d(2029, 1, 1));
    expect(ymd(yearly)).toEqual(["2026-10-30", "2027-10-29", "2028-10-27"]);
  });

  it("combines with byMonthDay: Friday the 13th", () => {
    const out = expand(series({ freq: "monthly", byWeekday: [5], byMonthDay: [13] }), d(2026, 10, 1), d(2028, 1, 1));
    expect(ymd(out)).toEqual(["2026-11-13", "2027-8-13"]);
  });

  it("keeps the wall-clock time across a daylight saving change", () => {
    const rule: Recurrence = { freq: "monthly", byWeekday: [0], bySetPos: [1] }; // first Sunday
    const out = expand(series(rule, d(2026, 10, 1, 9)), d(2026, 10, 1), d(2026, 12, 1));
    expect(ymd(out)).toEqual(["2026-10-4", "2026-11-1"]);
    expect(out.every((e) => e.startDate.getHours() === 9 && e.endDate.getHours() === 10)).toBe(true);
  });
});

describe("count, until and exceptions", () => {
  const lastFriday: Recurrence = { freq: "monthly", byWeekday: [5], bySetPos: [-1] };

  it("count includes skipped occurrences", () => {
    const out = expand(series({ ...lastFriday, count: 3, exceptions: [d(2026, 11, 27)] }), d(2026, 1, 1), d(2028, 1, 1));
    expect(ymd(out)).toEqual(["2026-10-30", "2026-12-25"]);
  });

  it("until is inclusive and ignores the time", () => {
    const out = expand(series({ ...lastFriday, until: d(2026, 11, 27, 3) }), d(2026, 1, 1), d(2028, 1, 1));
    expect(ymd(out)).toEqual(["2026-10-30", "2026-11-27"]);
  });

  it("applies to byMonthDay", () => {
    const rule: Recurrence = { freq: "monthly", byMonthDay: [1, 15], count: 4, exceptions: [d(2026, 11, 1)] };
    expect(ymd(expand(series(rule), d(2026, 1, 1), d(2028, 1, 1)))).toEqual(["2026-10-15", "2026-11-15", "2026-12-1"]);
  });
});

describe("hourly", () => {
  const rule: Recurrence = { freq: "hourly", interval: 4 };
  const hours = (events: SchedulerEvent[]) => events.map((e) => e.startDate.getHours());

  it("repeats every n hours from the start, with the same length", () => {
    const out = expand(series(rule), d(2026, 10, 5), d(2026, 10, 6));
    expect(hours(out)).toEqual([9, 13, 17, 21]);
    expect(out.every((e) => e.endDate.getTime() - e.startDate.getTime() === 3_600_000)).toBe(true);
  });

  it("gives each occurrence an id with the time, and a seriesId", () => {
    const out = expand(series(rule), d(2026, 10, 5), d(2026, 10, 5, 12));
    expect(out[0].id).toMatch(/^s::2026-10-05T09:00[+-]\d\d:\d\d$/);
    expect(out[0].seriesId).toBe("s");
    expect(out[0].recurrence).toBeUndefined();
  });

  it("stays on its own phase when the window is far from the start", () => {
    const start = d(2020, 1, 1, 9);
    const out = expand(series({ freq: "hourly", interval: 5 }, start), d(2026, 10, 5), d(2026, 10, 6));
    expect(out.length).toBeGreaterThanOrEqual(4);
    for (const e of out) expect((e.startDate.getTime() - start.getTime()) % (5 * 3_600_000)).toBe(0);
    expect(out[0].startDate.getTime()).toBeGreaterThanOrEqual(d(2026, 10, 5).getTime() - 3_600_000);
  });

  it("includes an occurrence that began before the window and still runs", () => {
    const long = series({ freq: "hourly", interval: 2 }, d(2026, 10, 5, 9), { endDate: d(2026, 10, 5, 12) });
    expect(hours(expand(long, d(2026, 10, 5, 12, 0), d(2026, 10, 5, 12, 30)))).toEqual([11]);
  });

  it("count, until (the last moment) and exceptions (the exact start)", () => {
    const base = series({ freq: "hourly", interval: 2 }, d(2026, 10, 5, 9));
    const wide: [Date, Date] = [d(2026, 10, 1), d(2026, 10, 9)];
    expect(hours(expand({ ...base, recurrence: { freq: "hourly", interval: 2, count: 3 } }, ...wide))).toEqual([9, 11, 13]);
    expect(hours(expand({ ...base, recurrence: { freq: "hourly", interval: 2, until: d(2026, 10, 5, 13) } }, ...wide))).toEqual([
      9, 11, 13,
    ]);
    const skipped: Recurrence = { freq: "hourly", interval: 2, count: 3, exceptions: [d(2026, 10, 5, 11)] };
    expect(hours(expand({ ...base, recurrence: skipped }, ...wide))).toEqual([9, 13]);
    // A time that is not an occurrence's start skips nothing.
    const other: Recurrence = { freq: "hourly", interval: 2, count: 2, exceptions: [d(2026, 10, 5, 10)] };
    expect(hours(expand({ ...base, recurrence: other }, ...wide))).toEqual([9, 11]);
  });

  it("counts elapsed time across a daylight saving change", () => {
    for (const [from, to] of [
      [d(2026, 3, 7, 12), d(2026, 3, 9, 12)],
      [d(2026, 10, 31, 12), d(2026, 11, 2, 12)],
    ]) {
      const out = expand(series({ freq: "hourly", interval: 2 }, new Date(from.getTime() - 3 * 3_600_000)), from, to);
      const gaps = out.slice(1).map((e, i) => e.startDate.getTime() - out[i].startDate.getTime());
      expect(new Set(gaps)).toEqual(new Set([2 * 3_600_000]));
      expect(out.every((e) => e.endDate.getTime() - e.startDate.getTime() === 3_600_000)).toBe(true);
    }
  });

  it("ignores weekday and month rules", () => {
    const out = expand(series({ freq: "hourly", interval: 12, byWeekday: [3], byMonthDay: [1] }), d(2026, 10, 5), d(2026, 10, 7));
    expect(hours(out)).toEqual([9, 21, 9, 21]);
  });
});

describe("split and edit with the new rules", () => {
  const all = (...events: (SchedulerEvent | null)[]) =>
    events
      .flatMap((e) => (e ? expand(e, d(2026, 1, 1), d(2030, 1, 1)) : []))
      .map((e) => e.startDate.getTime())
      .sort((a, b) => a - b);

  it("splits a last-Friday series at an occurrence: before and after add up to the original", () => {
    const event = series({ freq: "monthly", byWeekday: [5], bySetPos: [-1], count: 6, exceptions: [d(2027, 1, 29)] });
    const { before, after } = splitRecurrence(event, d(2026, 12, 25, 14), { title: "Later" });
    expect(before?.recurrence?.until).toEqual(d(2026, 12, 24));
    expect(before?.recurrence?.count).toBeUndefined();
    expect(after.id).toBe("s::from-2026-12-25");
    expect(after.recurrence?.count).toBe(4);
    expect(after.recurrence?.bySetPos).toEqual([-1]);
    expect(after.startDate).toEqual(d(2026, 12, 25, 9));
    expect(all(before, after)).toEqual(all(event));
  });

  it("splits by month day, and rejects a day the rule does not pick", () => {
    const event = series({ freq: "monthly", byMonthDay: [1, -1] });
    const { before, after } = splitRecurrence(event, d(2026, 11, 1));
    expect(all(before, after)).toEqual(all(event));
    expect(() => splitRecurrence(event, d(2026, 11, 2))).toThrow(RangeError);
  });

  it("splits an hourly series at an exact start", () => {
    const event = series({ freq: "hourly", interval: 3, count: 8, exceptions: [d(2026, 10, 5, 12), d(2026, 10, 6, 6)] });
    const { before, after } = splitRecurrence(event, d(2026, 10, 5, 18));
    expect(before?.recurrence?.until).toEqual(new Date(d(2026, 10, 5, 18).getTime() - 1));
    expect(before?.recurrence?.exceptions).toEqual([d(2026, 10, 5, 12)]);
    expect(after.id).toMatch(/^s::from-2026-10-05T18:00[+-]\d\d:\d\d$/);
    expect(after.recurrence?.count).toBe(5);
    expect(after.recurrence?.exceptions).toEqual([d(2026, 10, 6, 6)]);
    expect(all(before, after)).toEqual(all(event));
    expect(splitRecurrence(event, d(2026, 10, 5, 9)).before).toBeNull();
    expect(() => splitRecurrence(event, d(2026, 10, 5, 10))).toThrow(RangeError);
  });

  it("edits one occurrence of an hourly series", () => {
    const event = series({ freq: "hourly", interval: 3 });
    const { series: kept, changed } = editOccurrence(event, d(2026, 10, 5, 12), { title: "Moved" });
    expect(kept.recurrence?.exceptions).toEqual([d(2026, 10, 5, 12)]);
    expect(changed.id).toMatch(/^s::edit-2026-10-05T12:00[+-]\d\d:\d\d$/);
    expect(changed.startDate).toEqual(d(2026, 10, 5, 12));
    expect(changed.endDate).toEqual(d(2026, 10, 5, 13));
    expect(changed.recurrence).toBeUndefined();
    expect(expand(kept, d(2026, 10, 5), d(2026, 10, 6)).map((e) => e.startDate.getHours())).toEqual([9, 15, 18, 21]);
  });

  it("edits one occurrence of a monthly rule", () => {
    const event = series({ freq: "monthly", byWeekday: [2], bySetPos: [2] });
    const { series: kept, changed } = editOccurrence(event, d(2026, 11, 10));
    expect(changed.id).toBe("s::edit-2026-11-10");
    expect(ymd(expand(kept, d(2026, 10, 1), d(2027, 1, 1)))).toEqual(["2026-10-13", "2026-12-8"]);
  });
});
