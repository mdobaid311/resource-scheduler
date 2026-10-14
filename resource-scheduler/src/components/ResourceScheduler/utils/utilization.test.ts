import { describe, expect, it } from "vitest";
import type { BusinessHours, Resource, SchedulerEvent } from "../types";
import { columnUtilization, getUtilization, utilizationTone } from "./utilization";
import { expandEvents } from "./recurrence";

// October 2026: Sun the 4th, Mon the 5th, Wed the 7th, Sun the 11th.
const d = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute);
const event = (id: string, start: Date, end: Date): SchedulerEvent => ({
  id,
  title: id,
  startDate: start,
  endDate: end,
});
const res = (extra: Partial<Resource> = {}): Resource => ({
  id: "r",
  name: "R",
  events: [],
  ...extra,
});
const office: BusinessHours = {}; // the defaults: Monday to Friday, 9 to 17
const week = { start: d(5), end: d(12) }; // Monday to Sunday
const wednesday = { start: d(7), end: d(8) };

describe("getUtilization", () => {
  it("counts every hour as available when there are no business hours", () => {
    const r = res({ events: [event("a", d(7, 9), d(7, 11))] });
    expect(getUtilization(r, wednesday)).toEqual({
      bookedMinutes: 120,
      availableMinutes: 1440,
      ratio: 120 / 1440,
    });
  });

  it("counts only business hours as available", () => {
    const r = res({ events: [event("a", d(7, 9), d(7, 13))] });
    expect(getUtilization(r, wednesday, { businessHours: office })).toEqual({
      bookedMinutes: 240,
      availableMinutes: 480,
      ratio: 0.5,
    });
  });

  it("skips non-working days", () => {
    expect(getUtilization(res(), week, { businessHours: office }).availableMinutes).toBe(
      5 * 480
    );
  });

  it("lets a resource's own hours win, and false means always open", () => {
    const early = res({ businessHours: { daysOfWeek: [3], startHour: 6, endHour: 10 } });
    expect(getUtilization(early, week, { businessHours: office }).availableMinutes).toBe(240);

    const always = res({ businessHours: false });
    expect(getUtilization(always, wednesday, { businessHours: office }).availableMinutes).toBe(
      1440
    );
  });

  it("subtracts unavailable time", () => {
    const leave = res({ unavailable: [{ start: d(6), end: d(7) }] }); // all of Tuesday
    expect(getUtilization(leave, week, { businessHours: office }).availableMinutes).toBe(
      4 * 480
    );
  });

  it("subtracts overlapping unavailable ranges once", () => {
    const r = res({
      unavailable: [
        { start: d(7, 9), end: d(7, 12) },
        { start: d(7, 11), end: d(7, 13) },
      ],
    });
    expect(getUtilization(r, wednesday, { businessHours: office }).availableMinutes).toBe(
      480 - 240
    );
  });

  it("ignores unavailable time that falls outside business hours", () => {
    const r = res({ unavailable: [{ start: d(7, 18), end: d(7, 22) }] });
    expect(getUtilization(r, wednesday, { businessHours: office }).availableMinutes).toBe(480);
  });

  it("multiplies available time by capacity", () => {
    const r = res({ capacity: 3 });
    expect(getUtilization(r, wednesday, { businessHours: office }).availableMinutes).toBe(
      3 * 480
    );
  });

  it("has no ratio when nothing is available", () => {
    const sunday = { start: d(11), end: d(12) };
    expect(getUtilization(res(), sunday, { businessHours: office })).toEqual({
      bookedMinutes: 0,
      availableMinutes: 0,
      ratio: null,
    });
    expect(getUtilization(res({ capacity: 0 }), wednesday).ratio).toBeNull();
  });

  it("clips events to the range", () => {
    // Sunday 22:00 to Tuesday 02:00: Monday and the first 2 h of Tuesday are in the week.
    const r = res({ events: [event("a", d(4, 22), d(6, 2))] });
    expect(getUtilization(r, week).bookedMinutes).toBe((24 + 2) * 60);
  });

  it("counts only the time inside working hours", () => {
    const r = res({
      events: [
        event("evening", d(7, 18), d(7, 20)), // closed
        event("shift", d(5, 9), d(7, 17)), // Monday 9:00 to Wednesday 17:00: three working days
      ],
    });
    expect(getUtilization(r, week, { businessHours: office }).bookedMinutes).toBe(3 * 480);
  });

  it("counts nothing booked on a day nothing is available", () => {
    const r = res({ events: [event("a", d(11, 10), d(11, 12))] });
    const u = getUtilization(r, { start: d(11), end: d(12) }, { businessHours: office });
    expect(u.bookedMinutes).toBe(0);
    expect(u.ratio).toBeNull();
  });

  it("does not count event time during time off", () => {
    const r = res({
      events: [event("a", d(7, 9), d(7, 17))],
      unavailable: [{ start: d(7, 12), end: d(7, 13) }],
    });
    expect(getUtilization(r, wednesday, { businessHours: office })).toEqual({
      bookedMinutes: 420,
      availableMinutes: 420,
      ratio: 1,
    });
  });

  it("adds overlapping events up, so a double booking passes 100%", () => {
    const r = res({
      events: [event("a", d(7, 9), d(7, 17)), event("b", d(7, 12), d(7, 14))],
    });
    const u = getUtilization(r, wednesday, { businessHours: office });
    expect(u.bookedMinutes).toBe(600);
    expect(u.ratio).toBe(600 / 480);
  });

  it("lets capacity absorb simultaneous bookings", () => {
    const r = res({
      capacity: 2,
      events: [event("a", d(7, 9), d(7, 17)), event("b", d(7, 9), d(7, 17))],
    });
    expect(getUtilization(r, wednesday, { businessHours: office }).ratio).toBe(1);
  });

  it("expands recurring events inside the range", () => {
    const r = res({
      events: [
        {
          ...event("standup", d(5, 9), d(5, 10)),
          recurrence: { freq: "weekly", byWeekday: [1, 3, 5] },
        },
      ],
    });
    expect(getUtilization(r, week, { businessHours: office }).bookedMinutes).toBe(3 * 60);
  });

  it("measures a partial day, as the day view shows with dayStartHour and dayEndHour", () => {
    const morning = { start: d(7, 8), end: d(7, 12) };
    const r = res({ events: [event("a", d(7, 9), d(7, 10))] });
    expect(getUtilization(r, morning, { businessHours: office })).toEqual({
      bookedMinutes: 60,
      availableMinutes: 180,
      ratio: 60 / 180,
    });
  });

  it("treats an empty range as nothing", () => {
    const r = res({ events: [event("a", d(7, 9), d(7, 10))] });
    expect(getUtilization(r, { start: d(7), end: d(7) })).toEqual({
      bookedMinutes: 0,
      availableMinutes: 0,
      ratio: null,
    });
  });
});

// A slow reference that walks the columns one minute at a time and shares no code
// with columnUtilization except expandEvents.
const reference = (resources: Resource[], column: { start: Date; end: Date }, shared?: BusinessHours) => {
  let booked = 0;
  let available = 0;
  for (const r of resources) {
    const hours = r.businessHours === undefined ? shared : r.businessHours || undefined;
    const days = hours?.daysOfWeek ?? [1, 2, 3, 4, 5];
    const from = hours?.startHour ?? 9;
    const to = hours?.endHour ?? 17;
    const events = expandEvents(r.events, column.start, column.end);
    for (let t = column.start.getTime(); t < column.end.getTime(); t += 60_000) {
      const at = new Date(t);
      if (hours && !(days.includes(at.getDay()) && at.getHours() >= from && at.getHours() < to)) continue;
      if ((r.unavailable ?? []).some((u) => t >= u.start.getTime() && t < u.end.getTime())) continue;
      available += r.capacity ?? 1;
      booked += events.filter((e) => t >= e.startDate.getTime() && t < e.endDate.getTime()).length;
    }
  }
  return { bookedMinutes: booked, availableMinutes: available };
};

describe("columnUtilization", () => {
  const ann = res({
    id: "ann",
    capacity: 2,
    unavailable: [{ start: d(6, 12), end: d(6, 14) }],
    events: [
      event("a1", d(7, 9), d(7, 13)),
      event("a2", d(7, 11), d(7, 15)), // overlaps a1
      { ...event("a3", d(5, 9), d(5, 10)), recurrence: { freq: "daily", count: 4 } },
    ],
  });
  const bob = res({
    id: "bob",
    businessHours: { startHour: 8, endHour: 12, daysOfWeek: [3, 4] },
    events: [event("b1", d(7, 7), d(7, 10)), event("b2", d(7, 16), d(8, 10))],
  });
  const cat = res({ id: "cat", businessHours: false, events: [event("c1", d(10, 22), d(11, 3))] });
  const all = [ann, bob, cat];

  const days = Array.from({ length: 7 }, (_, i) => ({ start: d(5 + i), end: d(6 + i) }));
  const halfHours = Array.from({ length: 8 }, (_, i) => ({
    start: d(7, 8, i * 30),
    end: d(7, 8, i * 30 + 30),
  }));
  const someDays = [days[0], days[2], days[4]]; // columns need not touch, as with hideWeekends

  for (const [name, columns, shared] of [
    ["day columns with office hours", days, office],
    ["day columns with every hour available", days, undefined],
    ["half-hour columns", halfHours, office],
    ["columns that do not touch", someDays, office],
  ] as const) {
    it(`adds up every resource per column: ${name}`, () => {
      const got = columnUtilization(all, [...columns], { businessHours: shared });
      expect(got).toHaveLength(columns.length);
      columns.forEach((column, i) => {
        const expected = reference(all, column, shared);
        expect(got[i].bookedMinutes, `booked, column ${i}`).toBe(expected.bookedMinutes);
        expect(got[i].availableMinutes, `available, column ${i}`).toBe(expected.availableMinutes);
        expect(got[i].ratio).toBe(
          expected.availableMinutes > 0 ? expected.bookedMinutes / expected.availableMinutes : null
        );
      });
    });
  }

  it("gives a column nothing is available in a null ratio", () => {
    const [saturday] = columnUtilization([ann, bob], [{ start: d(10), end: d(11) }], { businessHours: office });
    expect(saturday).toEqual({ bookedMinutes: 0, availableMinutes: 0, ratio: null });
  });

  it("returns no columns for no columns, and empty columns for no resources", () => {
    expect(columnUtilization(all, [])).toEqual([]);
    expect(columnUtilization([], days.slice(0, 2))).toEqual([
      { bookedMinutes: 0, availableMinutes: 0, ratio: null },
      { bookedMinutes: 0, availableMinutes: 0, ratio: null },
    ]);
  });

  it("agrees with getUtilization over one column", () => {
    for (const r of all) {
      expect(columnUtilization([r], [week], { businessHours: office })[0]).toEqual(
        getUtilization(r, week, { businessHours: office })
      );
    }
  });
});

describe("utilizationTone", () => {
  it("is normal below 90%, high from 90% to 100%, over above 100%", () => {
    expect(utilizationTone(null)).toBe("normal");
    expect(utilizationTone(0)).toBe("normal");
    expect(utilizationTone(89)).toBe("normal");
    expect(utilizationTone(90)).toBe("high");
    expect(utilizationTone(100)).toBe("high");
    expect(utilizationTone(101)).toBe("over");
  });
});
