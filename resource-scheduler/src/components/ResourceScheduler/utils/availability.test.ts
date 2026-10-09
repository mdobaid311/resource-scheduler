import { describe, expect, it } from "vitest";
import { type BusinessHours, type Resource, ViewType } from "../types";
import {
  findAvailableSlots,
  isCellUnavailable,
  resolveBusinessHours,
  touchesUnavailable,
} from "./availability";

// October 2026: Wed the 7th, Sat the 10th, Sun the 11th.
const d = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute);
const res = (extra: Partial<Resource> = {}): Resource => ({
  id: "r",
  name: "R",
  events: [],
  ...extra,
});
const office: BusinessHours = {}; // the defaults: Monday to Friday, 9 to 17

describe("resolveBusinessHours", () => {
  it("defaults to Monday to Friday, 9 to 17", () => {
    expect(resolveBusinessHours({})).toEqual({
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 17,
    });
  });

  it("keeps what is given", () => {
    expect(resolveBusinessHours({ daysOfWeek: [0, 6], startHour: 6, endHour: 14 })).toEqual({
      daysOfWeek: [0, 6],
      startHour: 6,
      endHour: 14,
    });
  });
});

describe("isCellUnavailable in the day view", () => {
  const ctx = { businessHours: office, viewType: ViewType.Day, slotMinutes: 60 };
  const cell = (r: Resource, hour: number, day = 7, minute = 0) =>
    isCellUnavailable(r, d(day, hour, minute), ctx);

  it("shades slots outside business hours", () => {
    expect(cell(res(), 8)).toBe(true);
    expect(cell(res(), 9)).toBe(false);
    expect(cell(res(), 16)).toBe(false);
    expect(cell(res(), 17)).toBe(true);
  });

  it("shades non-working days", () => {
    expect(cell(res(), 10, 10)).toBe(true); // Saturday
  });

  it("shades nothing without business hours or unavailable ranges", () => {
    expect(isCellUnavailable(res(), d(10, 3), { viewType: ViewType.Day })).toBe(false);
  });

  it("lets a resource override the default hours", () => {
    const early = res({ businessHours: { startHour: 6, endHour: 14 } });
    expect(cell(early, 7)).toBe(false);
    expect(cell(early, 15)).toBe(true);
  });

  it("lets a resource opt out with businessHours: false", () => {
    expect(cell(res({ businessHours: false }), 3, 10)).toBe(false);
  });

  it("shades a slot that overlaps an unavailable range", () => {
    const lunch = res({ unavailable: [{ start: d(7, 12), end: d(7, 13) }] });
    expect(cell(lunch, 11)).toBe(false);
    expect(cell(lunch, 12)).toBe(true);
    expect(cell(lunch, 13)).toBe(false);
  });

  it("counts a partial overlap with half-hour slots", () => {
    const r = res({ unavailable: [{ start: d(7, 11, 30), end: d(7, 12, 30) }] });
    const half = { ...ctx, slotMinutes: 30 };
    expect(isCellUnavailable(r, d(7, 11, 0), half)).toBe(false);
    expect(isCellUnavailable(r, d(7, 11, 30), half)).toBe(true);
    expect(isCellUnavailable(r, d(7, 12, 0), half)).toBe(true);
    expect(isCellUnavailable(r, d(7, 12, 30), half)).toBe(false);
  });
});

describe("isCellUnavailable in date views", () => {
  const ctx = { businessHours: office, viewType: ViewType.Week };

  it("shades non-working days and ignores the hours", () => {
    expect(isCellUnavailable(res(), d(10), ctx)).toBe(true);
    expect(isCellUnavailable(res(), d(7), ctx)).toBe(false);
  });

  it("shades only the days an unavailable range covers completely", () => {
    const leave = res({ unavailable: [{ start: d(5), end: d(8) }] }); // Mon to Wed, whole days
    expect(isCellUnavailable(leave, d(6), ctx)).toBe(true);
    expect(isCellUnavailable(leave, d(8), ctx)).toBe(false);

    const dentist = res({ unavailable: [{ start: d(7, 9), end: d(7, 11) }] });
    expect(isCellUnavailable(dentist, d(7), ctx)).toBe(false);
  });
});

describe("touchesUnavailable", () => {
  const day = { businessHours: office, viewType: ViewType.Day, slotMinutes: 60 };
  const touches = (start: Date, end: Date, r = res()) =>
    touchesUnavailable(r, { start, end }, day);

  it("allows a range inside business hours", () => {
    expect(touches(d(7, 9), d(7, 10))).toBe(false);
    expect(touches(d(7, 16), d(7, 17))).toBe(false); // ends exactly at closing
  });

  it("rejects a range that reaches into a shaded slot", () => {
    expect(touches(d(7, 8, 30), d(7, 10))).toBe(true);
    expect(touches(d(7, 16, 30), d(7, 17, 30))).toBe(true);
  });

  it("rejects a range that crosses an unavailable range", () => {
    const lunch = res({ unavailable: [{ start: d(7, 12), end: d(7, 13) }] });
    expect(touches(d(7, 11), d(7, 14), lunch)).toBe(true);
    expect(touches(d(7, 13), d(7, 15), lunch)).toBe(false);
  });

  it("checks whole days in date views, so a weekend-spanning event is rejected", () => {
    const week = { businessHours: office, viewType: ViewType.Week };
    expect(touchesUnavailable(res(), { start: d(7), end: d(9) }, week)).toBe(false);
    expect(touchesUnavailable(res(), { start: d(9), end: d(12) }, week)).toBe(true); // Fri to Sun
  });

  it("treats a zero-length range as the one cell it is in", () => {
    expect(touches(d(7, 8), d(7, 8))).toBe(true);
    expect(touches(d(7, 9), d(7, 9))).toBe(false);
  });
});

describe("findAvailableSlots", () => {
  const busy = (startHour: number, endHour: number, day = 7) => ({
    id: `b${startHour}`,
    title: "Busy",
    startDate: d(day, startHour),
    endDate: d(day, endHour),
  });
  const hours = (slots: { start: Date }[]) => slots.map((s) => s.start.getHours());
  // Wednesday 7 October, 8:00 to 12:00, one hour at a time, office hours.
  const morning = {
    from: d(7, 8),
    to: d(7, 12),
    duration: 60,
    step: 60,
    businessHours: office,
  };

  it("lists the free slots inside business hours", () => {
    expect(hours(findAvailableSlots(res(), morning))).toEqual([9, 10, 11]);
  });

  it("skips what the resource is already doing", () => {
    expect(hours(findAvailableSlots(res({ events: [busy(10, 11)] }), morning))).toEqual([9, 11]);
  });

  it("skips unavailable ranges", () => {
    const lunch = res({ unavailable: [{ start: d(7, 12), end: d(7, 13) }] });
    expect(
      hours(findAvailableSlots(lunch, { ...morning, from: d(7, 9), to: d(7, 15) }))
    ).toEqual([9, 10, 11, 13, 14]);
  });

  it("offers a start every step, so options can overlap", () => {
    const slots = findAvailableSlots(res(), { ...morning, step: 30, to: d(7, 11) });
    expect(slots.map((s) => [s.start.getHours(), s.start.getMinutes()])).toEqual([
      [9, 0],
      [9, 30],
      [10, 0],
    ]);
    expect(slots[0].end).toEqual(d(7, 10));
  });

  it("starts on the step grid and keeps every slot inside the window", () => {
    const slots = findAvailableSlots(res(), {
      from: d(7, 9, 10),
      to: d(7, 10, 30),
      duration: 60,
      step: 30,
      businessHours: office,
    });
    expect(slots.map((s) => [s.start.getHours(), s.start.getMinutes()])).toEqual([[9, 30]]);
  });

  it("does not run past closing time", () => {
    const slots = findAvailableSlots(res(), {
      from: d(7, 15),
      to: d(7, 19),
      duration: 90,
      step: 30,
      businessHours: office,
    });
    expect(slots.map((s) => [s.start.getHours(), s.start.getMinutes()])).toEqual([
      [15, 0],
      [15, 30],
    ]);
  });

  it("skips non-working days", () => {
    // Friday 9th at 16:00 to Monday 12th at 10:00
    const slots = findAvailableSlots(res(), {
      from: d(9, 16),
      to: d(12, 10),
      duration: 60,
      step: 60,
      businessHours: office,
    });
    expect(slots.map((s) => [s.start.getDate(), s.start.getHours()])).toEqual([
      [9, 16],
      [12, 9],
    ]);
  });

  it("lets a resource override the hours", () => {
    const night = res({ businessHours: false });
    expect(
      hours(findAvailableSlots(night, { ...morning, from: d(7, 2), to: d(7, 5) }))
    ).toEqual([2, 3, 4]);
  });

  it("without business hours only events and unavailable time count", () => {
    const slots = findAvailableSlots(res({ events: [busy(9, 10)] }), {
      from: d(7, 8),
      to: d(7, 11),
      duration: 60,
      step: 60,
    });
    expect(hours(slots)).toEqual([8, 10]);
  });

  it("finds a time when everyone is free", () => {
    const ann = res({ id: "a", events: [busy(9, 10)] });
    const bob = res({ id: "b", events: [busy(11, 12)] });
    expect(hours(findAvailableSlots([ann, bob], morning))).toEqual([10]);
  });

  it("stops at the limit", () => {
    expect(hours(findAvailableSlots(res(), { ...morning, limit: 2 }))).toEqual([9, 10]);
  });

  it("returns nothing for an impossible request", () => {
    expect(findAvailableSlots(res(), { ...morning, duration: 0 })).toEqual([]);
    expect(findAvailableSlots(res(), { ...morning, step: 0 })).toEqual([]);
    expect(findAvailableSlots(res(), { ...morning, from: d(7, 12), to: d(7, 8) })).toEqual([]);
  });
});
