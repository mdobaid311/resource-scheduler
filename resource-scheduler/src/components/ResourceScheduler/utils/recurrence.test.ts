import { describe, expect, it } from "vitest";
import type { SchedulerEvent } from "../types";
import { editOccurrence, expandEvents, expandRecurrence, splitRecurrence } from "./recurrence";

// October 2026: Mon 5th, Wed 7th, Fri 9th. DST in the US ends on Sun 1 November.
const d = (month: number, day: number, hour = 0, year = 2026) =>
  new Date(year, month - 1, day, hour);
const series = (
  recurrence: SchedulerEvent["recurrence"],
  extra: Partial<SchedulerEvent> = {}
): SchedulerEvent => ({
  id: "s",
  title: "Standup",
  startDate: d(10, 5, 9), // Monday 9:00 to 10:00
  endDate: d(10, 5, 10),
  recurrence,
  ...extra,
});
const days = (events: SchedulerEvent[]) =>
  events.map((e) => `${e.startDate.getMonth() + 1}/${e.startDate.getDate()}`);

describe("expandRecurrence", () => {
  it("repeats daily, with the same time of day and length", () => {
    const out = expandRecurrence(series({ freq: "daily" }), d(10, 6), d(10, 9));
    expect(days(out)).toEqual(["10/6", "10/7", "10/8"]);
    expect(out[0].startDate).toEqual(d(10, 6, 9));
    expect(out[0].endDate).toEqual(d(10, 6, 10));
  });

  it("gives each occurrence its own id and points back to the series", () => {
    const [first] = expandRecurrence(series({ freq: "daily" }), d(10, 6), d(10, 7));
    expect(first.id).toBe("s::2026-10-06");
    expect(first.seriesId).toBe("s");
    expect(first.recurrence).toBeUndefined();
    expect(first.title).toBe("Standup");
  });

  it("honours interval", () => {
    const out = expandRecurrence(series({ freq: "daily", interval: 2 }), d(10, 5), d(10, 11));
    expect(days(out)).toEqual(["10/5", "10/7", "10/9"]);
  });

  it("repeats weekly on the weekday of the first occurrence", () => {
    const out = expandRecurrence(series({ freq: "weekly" }), d(10, 5), d(10, 26));
    expect(days(out)).toEqual(["10/5", "10/12", "10/19"]);
  });

  it("repeats weekly on several weekdays", () => {
    const out = expandRecurrence(
      series({ freq: "weekly", byWeekday: [1, 3, 5] }),
      d(10, 5),
      d(10, 13)
    );
    expect(days(out)).toEqual(["10/5", "10/7", "10/9", "10/12"]);
  });

  it("does not produce days before the first occurrence", () => {
    const out = expandRecurrence(
      series({ freq: "weekly", byWeekday: [1, 3, 5] }, { startDate: d(10, 7, 9), endDate: d(10, 7, 10) }),
      d(10, 1),
      d(10, 13)
    );
    expect(days(out)).toEqual(["10/7", "10/9", "10/12"]);
  });

  it("honours a weekly interval", () => {
    const out = expandRecurrence(series({ freq: "weekly", interval: 2 }), d(10, 1), d(11, 10));
    expect(days(out)).toEqual(["10/5", "10/19", "11/2"]);
  });

  it("repeats monthly on the same day, skipping months that lack it", () => {
    const jan31 = { startDate: d(1, 31, 9), endDate: d(1, 31, 10) };
    const out = expandRecurrence(series({ freq: "monthly" }, jan31), d(1, 1), d(7, 1));
    expect(days(out)).toEqual(["1/31", "3/31", "5/31"]);
  });

  it("repeats yearly, skipping years without the date", () => {
    const leap = { startDate: d(2, 29, 9, 2028), endDate: d(2, 29, 10, 2028) };
    const out = expandRecurrence(series({ freq: "yearly" }, leap), d(1, 1, 0, 2028), d(1, 1, 0, 2037));
    expect(out.map((e) => e.startDate.getFullYear())).toEqual([2028, 2032, 2036]);
  });

  it("ends on the until date, counted by calendar day", () => {
    const out = expandRecurrence(series({ freq: "daily", until: d(10, 7) }), d(10, 1), d(10, 20));
    expect(days(out)).toEqual(["10/5", "10/6", "10/7"]);
  });

  it("stops after count occurrences, counting from the first", () => {
    const rule = series({ freq: "daily", count: 3 });
    expect(days(expandRecurrence(rule, d(10, 1), d(10, 20)))).toEqual(["10/5", "10/6", "10/7"]);
    expect(days(expandRecurrence(rule, d(10, 7), d(10, 20)))).toEqual(["10/7"]);
  });

  it("skips exceptions without shifting the count", () => {
    const out = expandRecurrence(
      series({ freq: "daily", count: 3, exceptions: [d(10, 6, 15)] }),
      d(10, 1),
      d(10, 20)
    );
    expect(days(out)).toEqual(["10/5", "10/7"]);
  });

  it("keeps the length of a multi-day event", () => {
    const out = expandRecurrence(
      series({ freq: "weekly" }, { startDate: d(10, 9, 9), endDate: d(10, 12, 17) }), // Fri 9:00 to Mon 17:00
      d(10, 16),
      d(10, 24)
    );
    expect(out[0].startDate).toEqual(d(10, 16, 9));
    expect(out[0].endDate).toEqual(d(10, 19, 17));
  });

  it("includes an occurrence that began before the window and is still running", () => {
    const out = expandRecurrence(
      series({ freq: "weekly" }, { startDate: d(10, 5, 9), endDate: d(10, 7, 17) }),
      d(10, 6),
      d(10, 8)
    );
    expect(days(out)).toEqual(["10/5"]);
  });

  it("keeps the wall-clock time across a daylight saving change", () => {
    const out = expandRecurrence(series({ freq: "daily" }), d(10, 28), d(11, 5));
    expect(out).toHaveLength(8);
    expect(out.every((e) => e.startDate.getHours() === 9 && e.endDate.getHours() === 10)).toBe(true);
  });

  it("returns nothing when the series starts after the window", () => {
    expect(expandRecurrence(series({ freq: "daily" }), d(9, 1), d(9, 30))).toEqual([]);
  });

  it("returns a plain event when it overlaps the window, nothing otherwise", () => {
    const plain = series(undefined);
    expect(expandRecurrence(plain, d(10, 5), d(10, 6))).toEqual([plain]);
    expect(expandRecurrence(plain, d(10, 6), d(10, 7))).toEqual([]);
  });
});

describe("expandEvents", () => {
  it("expands recurring events and passes the others through untouched", () => {
    const plain: SchedulerEvent = {
      id: "p",
      title: "One-off",
      startDate: d(12, 1, 9),
      endDate: d(12, 1, 10),
    };
    const out = expandEvents([series({ freq: "daily" }), plain], d(10, 5), d(10, 7));
    expect(out.map((e) => e.id)).toEqual(["s::2026-10-05", "s::2026-10-06", "p"]);
    expect(out[2]).toBe(plain);
  });

  it("returns the same array when nothing recurs", () => {
    const plain = [series(undefined)];
    expect(expandEvents(plain, d(10, 5), d(10, 6))).toBe(plain);
  });
});

describe("splitRecurrence", () => {
  const all = (e: SchedulerEvent | null) =>
    e ? days(expandRecurrence(e, d(1, 1), d(12, 31))) : [];

  it("ends the original the day before and starts the new series at the occurrence", () => {
    const { before, after } = splitRecurrence(
      series({ freq: "weekly" }),
      d(10, 19, 15), // any time on the day
      { title: "Planning", startDate: d(10, 19, 14), endDate: d(10, 19, 15) }
    );
    expect(before?.recurrence?.until).toEqual(d(10, 18));
    expect(before?.id).toBe("s");
    expect(after.id).toBe("s::from-2026-10-19");
    expect(after.title).toBe("Planning");
    expect(after.startDate).toEqual(d(10, 19, 14));
    const out = expandRecurrence(after, d(10, 1), d(11, 10));
    expect(days(out)).toEqual(["10/19", "10/26", "11/2", "11/9"]);
    expect(out[0].startDate).toEqual(d(10, 19, 14));
    // Together they cover the old series once, with no gap or overlap.
    const whole = days(expandRecurrence(series({ freq: "weekly" }), d(10, 1), d(11, 10)));
    expect([...days(expandRecurrence(before!, d(10, 1), d(11, 10))), ...days(out)]).toEqual(whole);
  });

  it("keeps the time of day and length when no dates are edited", () => {
    const { after } = splitRecurrence(series({ freq: "daily" }), d(10, 7), { title: "x" });
    expect(after.startDate).toEqual(d(10, 7, 9));
    expect(after.endDate).toEqual(d(10, 7, 10));
  });

  it("uses edits.id and edits.recurrence when given", () => {
    const { after } = splitRecurrence(series({ freq: "weekly", count: 9 }), d(10, 12), {
      id: "new",
      recurrence: { freq: "daily", count: 2 },
    });
    expect(after.id).toBe("new");
    expect(all(after)).toEqual(["10/12", "10/13"]);
  });

  it("drops count from the original and gives the rest to the new series", () => {
    const { before, after } = splitRecurrence(series({ freq: "weekly", count: 5 }), d(10, 19));
    expect(before?.recurrence?.count).toBeUndefined();
    expect(all(before)).toEqual(["10/5", "10/12"]);
    expect(after.recurrence?.count).toBe(3);
    expect(all(after)).toEqual(["10/19", "10/26", "11/2"]);
  });

  it("counts exceptions before the split towards the count", () => {
    const rule = { freq: "weekly" as const, count: 4, exceptions: [d(10, 12)] };
    const { before, after } = splitRecurrence(series(rule), d(10, 19));
    expect(all(before)).toEqual(["10/5"]);
    expect(before?.recurrence?.exceptions).toEqual([d(10, 12)]);
    expect(after.recurrence?.count).toBe(2);
    expect(all(after)).toEqual(["10/19", "10/26"]);
  });

  it("keeps until on the new series and carries over later exceptions only", () => {
    const rule = { freq: "daily" as const, until: d(10, 12), exceptions: [d(10, 6), d(10, 10)] };
    const { before, after } = splitRecurrence(series(rule), d(10, 8));
    expect(before?.recurrence?.until).toEqual(d(10, 7));
    expect(before?.recurrence?.exceptions).toEqual([d(10, 6)]);
    expect(all(before)).toEqual(["10/5", "10/7"]);
    expect(after.recurrence?.until).toEqual(d(10, 12));
    expect(after.recurrence?.exceptions).toEqual([d(10, 10)]);
    expect(all(after)).toEqual(["10/8", "10/9", "10/11", "10/12"]);
  });

  it("returns no original when the first occurrence is split", () => {
    const { before, after } = splitRecurrence(series({ freq: "weekly", count: 3 }), d(10, 5), {
      title: "All",
    });
    expect(before).toBeNull();
    expect(all(after)).toEqual(["10/5", "10/12", "10/19"]);
  });

  it("keeps the wall-clock time across a daylight saving change", () => {
    const { before, after } = splitRecurrence(series({ freq: "daily" }), d(11, 1));
    expect(before?.recurrence?.until).toEqual(d(10, 31)); // midnight, the day before
    const out = expandRecurrence(after, d(11, 1), d(11, 4));
    expect(out.map((e) => e.startDate.getHours())).toEqual([9, 9, 9]);
    expect(days(out)).toEqual(["11/1", "11/2", "11/3"]);
  });

  it("works on multi-day events", () => {
    const e = series({ freq: "weekly" }, { endDate: d(10, 6, 10) }); // 25 hours
    const { after } = splitRecurrence(e, d(10, 12));
    expect(after.startDate).toEqual(d(10, 12, 9));
    expect(after.endDate).toEqual(d(10, 13, 10));
  });

  it("does not change its input", () => {
    const e = series({ freq: "weekly", count: 4, exceptions: [d(10, 19)] });
    const copy = structuredClone(e);
    splitRecurrence(e, d(10, 12));
    expect(e).toEqual(copy);
  });

  it("throws for an event that does not recur or a date that is not an occurrence", () => {
    expect(() => splitRecurrence(series(undefined), d(10, 5))).toThrow(RangeError);
    expect(() => splitRecurrence(series({ freq: "weekly" }), d(10, 6))).toThrow(RangeError);
    expect(() => splitRecurrence(series({ freq: "weekly" }), d(9, 28))).toThrow(RangeError); // before the start
    expect(() => splitRecurrence(series({ freq: "weekly", count: 2 }), d(10, 19))).toThrow(RangeError);
    expect(() => splitRecurrence(series({ freq: "weekly", until: d(10, 12) }), d(10, 19))).toThrow(RangeError);
    expect(() => splitRecurrence(series({ freq: "weekly", exceptions: [d(10, 12)] }), d(10, 12))).toThrow(RangeError);
  });
});

describe("editOccurrence", () => {
  it("adds an exception to the series and returns a one-off event", () => {
    const { series: s, changed } = editOccurrence(series({ freq: "weekly" }), d(10, 12, 20), {
      title: "Moved",
      startDate: d(10, 12, 14),
      endDate: d(10, 12, 15),
    });
    expect(s.recurrence?.exceptions).toEqual([d(10, 12)]);
    expect(days(expandRecurrence(s, d(10, 5), d(10, 20)))).toEqual(["10/5", "10/19"]);
    expect(changed.id).toBe("s::edit-2026-10-12");
    expect(changed.seriesId).toBe("s");
    expect(changed.recurrence).toBeUndefined();
    expect(changed.title).toBe("Moved");
    expect(changed.startDate).toEqual(d(10, 12, 14));
  });

  it("keeps the time of day by default, keeps count and earlier exceptions", () => {
    const e = series({ freq: "daily", count: 3, exceptions: [d(10, 6)] });
    const { series: s, changed } = editOccurrence(e, d(10, 7), { id: "one" });
    expect(s.recurrence?.count).toBe(3);
    expect(s.recurrence?.exceptions).toEqual([d(10, 6), d(10, 7)]);
    expect(changed.id).toBe("one");
    expect(changed.startDate).toEqual(d(10, 7, 9));
    expect(changed.endDate).toEqual(d(10, 7, 10));
  });

  it("does not change its input and throws for a date that is not an occurrence", () => {
    const e = series({ freq: "weekly", exceptions: [d(10, 19)] });
    const copy = structuredClone(e);
    editOccurrence(e, d(10, 12));
    expect(e).toEqual(copy);
    expect(() => editOccurrence(e, d(10, 19))).toThrow(RangeError);
    expect(() => editOccurrence(e, d(10, 13))).toThrow(RangeError);
  });
});
