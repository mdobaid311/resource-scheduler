import { describe, expect, it } from "vitest";
import { SchedulerEvent, ViewType } from "../types";
import {
  formatEventTime,
  formatRangeLabel,
  formatSlotLabel,
  getDatesInView,
  getDropRange,
  getEventSpan,
  getEventStartPosition,
  getResizeRange,
  getSelectionBounds,
  isSlotInRange,
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

describe("getResizeRange", () => {
  const timed = ev(d(3, 10, 9, 30), d(3, 10, 11));

  it("snaps the start edge to the hour slot in day view", () => {
    expect(getResizeRange(timed, "start", d(3, 10, 8), ViewType.Day)).toEqual({
      start: d(3, 10, 8),
      end: d(3, 10, 11),
    });
  });

  it("includes the whole slot under the end edge in day view", () => {
    expect(getResizeRange(timed, "end", d(3, 10, 13), ViewType.Day)).toEqual({
      start: d(3, 10, 9, 30),
      end: d(3, 10, 14),
    });
  });

  it("rejects an edge dragged past the opposite edge", () => {
    expect(getResizeRange(timed, "start", d(3, 10, 11), ViewType.Day)).toBeNull();
    expect(getResizeRange(timed, "end", d(3, 10, 8), ViewType.Day)).toBeNull();
  });

  it("moves whole days and keeps the time of day in date views", () => {
    const e = ev(d(3, 10, 14, 30), d(3, 10, 16));
    expect(getResizeRange(e, "end", d(3, 12), ViewType.Week)).toEqual({
      start: d(3, 10, 14, 30),
      end: d(3, 12, 16),
    });
    expect(getResizeRange(e, "start", d(3, 8), ViewType.Week)).toEqual({
      start: d(3, 8, 14, 30),
      end: d(3, 10, 16),
    });
  });

  it("keeps all-day events midnight-aligned and includes the dragged day", () => {
    const allDay = ev(d(3, 10), d(3, 11));
    expect(getResizeRange(allDay, "end", d(3, 12), ViewType.Month)).toEqual({
      start: d(3, 10),
      end: d(3, 13),
    });
  });

  it("rejects a date-view resize that inverts the event", () => {
    const e = ev(d(3, 10, 14, 30), d(3, 10, 16));
    expect(getResizeRange(e, "start", d(3, 12), ViewType.Week)).toBeNull();
  });
});

describe("isSlotInRange", () => {
  const range = { start: d(3, 10, 9, 30), end: d(3, 10, 11) };

  it("matches every hour slot the range touches in day view", () => {
    const hours = [8, 9, 10, 11].map((h) => isSlotInRange(d(3, 10, h), range, ViewType.Day));
    expect(hours).toEqual([false, true, true, false]);
  });

  it("matches every day the range touches in date views", () => {
    const r = { start: d(3, 10, 14, 30), end: d(3, 12, 16) };
    const days = [9, 10, 11, 12, 13].map((day) => isSlotInRange(d(3, day), r, ViewType.Week));
    expect(days).toEqual([false, true, true, true, false]);
  });

  it("excludes the day a range ends on exactly at midnight", () => {
    const r = { start: d(3, 10), end: d(3, 12) };
    expect(isSlotInRange(d(3, 12), r, ViewType.Week)).toBe(false);
  });
});

describe("slot options", () => {
  it("defaults to 24 hourly slots", () => {
    expect(getTimeSlots(d(3, 10), ViewType.Day)).toHaveLength(24);
  });

  it("builds slots of the configured duration between the visible hours", () => {
    const slots = getTimeSlots(d(3, 10), ViewType.Day, {
      slotDuration: 30,
      dayStartHour: 9,
      dayEndHour: 11,
    });
    expect(slots).toEqual([
      d(3, 10, 9),
      d(3, 10, 9, 30),
      d(3, 10, 10),
      d(3, 10, 10, 30),
    ]);
  });

  it("falls back to defaults for invalid options", () => {
    const slots = getTimeSlots(d(3, 10), ViewType.Day, {
      slotDuration: 0,
      dayStartHour: 20,
      dayEndHour: 10,
    });
    expect(slots).toHaveLength(24);
  });
});

describe("day view layout with custom slots", () => {
  const options = { slotDuration: 30, dayStartHour: 8, dayEndHour: 18 };
  const slots = getTimeSlots(d(3, 10), ViewType.Day, options);
  const pos = (e: SchedulerEvent) => getEventStartPosition(e, slots, ViewType.Day);
  const span = (e: SchedulerEvent) => getEventSpan(e, slots, ViewType.Day);

  it("positions events by slot, counting from the first visible hour", () => {
    const e = ev(d(3, 10, 9, 15), d(3, 10, 10, 20));
    expect(pos(e)).toBe(2); // 9:00-9:30 is the third slot after 8:00
    expect(span(e)).toBe(3); // 9:00, 9:30, 10:00
  });

  it("clamps an event that starts before the visible hours", () => {
    const e = ev(d(3, 10, 7), d(3, 10, 9));
    expect(pos(e)).toBe(0);
    expect(span(e)).toBe(2);
  });

  it("clamps an event that ends after the visible hours", () => {
    const e = ev(d(3, 10, 17), d(3, 10, 20));
    expect(pos(e)).toBe(18);
    expect(span(e)).toBe(2);
  });
});

describe("getVisibleEvents with visible hours", () => {
  const options = { dayStartHour: 8, dayEndHour: 18 };
  const early = ev(d(3, 10, 5), d(3, 10, 7));
  const crossing = ev(d(3, 10, 7), d(3, 10, 9));
  const inside = ev(d(3, 10, 9), d(3, 10, 10));
  const late = ev(d(3, 10, 19), d(3, 10, 20));

  it("hides day-view events entirely outside the visible hours", () => {
    expect(
      getVisibleEvents([early, crossing, inside, late], d(3, 10, 12), ViewType.Day, options)
    ).toEqual([crossing, inside]);
  });

  it("ignores visible hours in date views", () => {
    expect(getVisibleEvents([early, late], d(3, 10), ViewType.Week, options)).toEqual([early, late]);
  });
});

describe("slot-minute aware helpers", () => {
  it("makes a selection end one slot after the last slot", () => {
    expect(getSelectionBounds(d(3, 10, 9), d(3, 10, 9, 30), ViewType.Day, 30)).toEqual({
      start: d(3, 10, 9),
      end: d(3, 10, 10),
    });
  });

  it("resizes the end edge to the end of the slot under the pointer", () => {
    const e = ev(d(3, 10, 9), d(3, 10, 10));
    expect(getResizeRange(e, "end", d(3, 10, 13, 30), ViewType.Day, 30)).toEqual({
      start: d(3, 10, 9),
      end: d(3, 10, 14),
    });
  });

  it("matches slots by their own duration", () => {
    const range = { start: d(3, 10, 9, 30), end: d(3, 10, 10) };
    const hits = [9, 9.5, 10].map((h) =>
      isSlotInRange(d(3, 10, Math.floor(h), (h % 1) * 60), range, ViewType.Day, 30)
    );
    expect(hits).toEqual([false, true, false]);
  });
});

describe("screen reader labels", () => {
  it("labels a day view slot with its date and time", () => {
    expect(formatSlotLabel(d(3, 10, 9, 30), ViewType.Day)).toBe("Tuesday, March 10, 9:30 AM");
  });

  it("labels a date view slot with the full date", () => {
    expect(formatSlotLabel(d(3, 10), ViewType.Week)).toBe("Tuesday, March 10, 2026");
  });

  it("labels a same-day time range", () => {
    expect(formatRangeLabel(d(3, 10, 9), d(3, 10, 10, 30), ViewType.Day)).toBe(
      "Tuesday, March 10, 9:00 AM to 10:30 AM"
    );
  });

  it("labels a time range that crosses midnight", () => {
    expect(formatRangeLabel(d(3, 10, 22), d(3, 11, 1), ViewType.Day)).toBe(
      "Tuesday, March 10, 10:00 PM to Wednesday, March 11, 1:00 AM"
    );
  });

  it("labels date view ranges by inclusive days", () => {
    expect(formatRangeLabel(d(3, 10), d(3, 11), ViewType.Week)).toBe("Tuesday, March 10, 2026");
    expect(formatRangeLabel(d(3, 10), d(3, 13), ViewType.Week)).toBe(
      "Tuesday, March 10 to Thursday, March 12, 2026"
    );
  });
});
