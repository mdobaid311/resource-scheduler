import { describe, expect, it } from "vitest";
import { type Resource, type SchedulerEvent, ViewType } from "../types";
import { GROUP_ROW_HEIGHT, withGroups } from "./groups";
import {
  getColumnRange,
  getColumns,
  getGridTemplateRows,
  getRowHeight,
  getRowHeights,
  getSelectedColumns,
  getTimePosition,
  layoutEvents,
} from "./layout";

const d = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const ev = (id: string, startDate: Date, endDate: Date): SchedulerEvent => ({ id, title: id, startDate, endDate });
const res = (id: string, events: SchedulerEvent[] = []): Resource => ({ id, name: id, events });

describe("layoutEvents", () => {
  const day = getColumns(d(10, 7), ViewType.Day);

  it("packs events into the first lane that is free", () => {
    const a = ev("a", d(10, 7, 9), d(10, 7, 11));
    const b = ev("b", d(10, 7, 10), d(10, 7, 12));
    const c = ev("c", d(10, 7, 11), d(10, 7, 12));
    const e = ev("e", d(10, 7, 12), d(10, 7, 13));
    const laid = layoutEvents([a, b, c, e], day, ViewType.Day);
    expect(laid.map((p) => [p.event.id, p.startPosition, p.span, p.lane])).toEqual([
      ["a", 9, 2, 0],
      ["b", 10, 2, 1], // overlaps a
      ["c", 11, 1, 0], // a has ended: lane 0 again
      ["e", 12, 1, 0],
    ]);
  });

  it("returns the events sorted by start and leaves the input alone", () => {
    const late = ev("late", d(10, 7, 15), d(10, 7, 16));
    const early = ev("early", d(10, 7, 8), d(10, 7, 9));
    const input = [late, early];
    const laid = layoutEvents(input, day, ViewType.Day);
    expect(laid.map((p) => p.event)).toEqual([early, late]);
    expect(input).toEqual([late, early]);
  });

  it("keeps the given order for events that start together", () => {
    const first = ev("first", d(10, 7, 9), d(10, 7, 10));
    const second = ev("second", d(10, 7, 9), d(10, 7, 10));
    expect(layoutEvents([first, second], day, ViewType.Day).map((p) => [p.event.id, p.lane])).toEqual([
      ["first", 0],
      ["second", 1],
    ]);
  });

  it("counts columns of days in the other views", () => {
    const week = getColumns(d(10, 7), ViewType.Week); // Sunday 4 to Saturday 10
    const trip = ev("trip", d(10, 5, 9), d(10, 7, 10));
    const [laid] = layoutEvents([trip], week, ViewType.Week);
    expect(laid).toMatchObject({ startPosition: 1, span: 3, lane: 0 });
  });

  it("returns nothing for no events", () => {
    expect(layoutEvents([], day, ViewType.Day)).toEqual([]);
  });
});

describe("row heights", () => {
  const day = getColumns(d(10, 7), ViewType.Day);
  const overlapping = res("a", [ev("1", d(10, 7, 9), d(10, 7, 11)), ev("2", d(10, 7, 10), d(10, 7, 12))]);

  it("gives an empty row one lane and the padding", () => {
    expect(getRowHeight(res("b"), day, ViewType.Day, { lane: 50 })).toBe(58);
  });

  it("adds a lane for every level of overlap", () => {
    expect(getRowHeight(overlapping, day, ViewType.Day, { lane: 50 })).toBe(108);
  });

  it("defaults to the comfortable lane (52 px)", () => {
    expect(getRowHeight(res("b"), day, ViewType.Day)).toBe(60);
  });

  it("is never less than minRowHeight", () => {
    expect(getRowHeight(res("b"), day, ViewType.Day, { lane: 38, minRowHeight: 60 })).toBe(60);
    expect(getRowHeight(overlapping, day, ViewType.Day, { lane: 50, minRowHeight: 60 })).toBe(108);
  });

  it("gives a group header its own height, whatever it holds", () => {
    const [header] = withGroups([{ ...res("a"), group: "Ward" }]);
    expect(getRowHeight(header, day, ViewType.Day, { lane: 50 })).toBe(GROUP_ROW_HEIGHT);
  });

  it("measures every row, in order", () => {
    expect(getRowHeights([overlapping, res("b")], day, ViewType.Day, { lane: 50 })).toEqual([108, 58]);
    expect(getRowHeights([], day, ViewType.Day)).toEqual([]);
  });

  it("writes the heights as grid rows under an auto header", () => {
    expect(getGridTemplateRows([108, 58])).toBe("auto 108px 58px");
  });
});

describe("getColumns", () => {
  it("is the slots of the day in the day view", () => {
    expect(getColumns(d(10, 7), ViewType.Day)).toHaveLength(24);
    const slots = getColumns(d(10, 7), ViewType.Day, { dayStartHour: 8, dayEndHour: 12, slotDuration: 30 });
    expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual(d(10, 7, 8));
    expect(slots[7]).toEqual(d(10, 7, 11, 30));
  });

  it("is the days of the period in the other views", () => {
    const week = getColumns(d(10, 7), ViewType.Week, { weekStartsOn: 1, hideWeekends: true });
    expect(week.map((day) => day.getDate())).toEqual([5, 6, 7, 8, 9]);
    expect(getColumns(d(10, 7), ViewType.Month)).toHaveLength(31);
    expect(getColumns(d(10, 7), ViewType.Year)).toHaveLength(365);
  });
});

describe("getColumnRange", () => {
  it("covers one slot in the day view", () => {
    expect(getColumnRange(d(10, 7, 9), ViewType.Day)).toEqual({ start: d(10, 7, 9), end: d(10, 7, 10) });
    expect(getColumnRange(d(10, 7, 9), ViewType.Day, 30)).toEqual({ start: d(10, 7, 9), end: d(10, 7, 9, 30) });
  });

  it("covers the whole calendar day in the other views", () => {
    expect(getColumnRange(d(10, 7, 13), ViewType.Week)).toEqual({ start: d(10, 7), end: d(10, 8) });
  });
});

describe("getTimePosition", () => {
  const range = { start: d(10, 7, 8), end: d(10, 7, 18) };

  it("is the percentage of the range that has passed", () => {
    expect(getTimePosition(d(10, 7, 13), range)).toBe(50);
    expect(getTimePosition(d(10, 7, 8), range)).toBe(0);
  });

  it("is null outside the range, the end being exclusive", () => {
    expect(getTimePosition(d(10, 7, 7, 59), range)).toBeNull();
    expect(getTimePosition(d(10, 7, 18), range)).toBeNull();
  });
});

describe("getSelectedColumns", () => {
  const day = getColumns(d(10, 7), ViewType.Day);
  const week = getColumns(d(10, 7), ViewType.Week);

  it("finds the columns between two slots, whichever way they were dragged", () => {
    expect(getSelectedColumns(day, d(10, 7, 10), d(10, 7, 8), ViewType.Day)).toEqual({ start: 8, end: 10 });
  });

  it("matches the exact slot in the day view", () => {
    expect(getSelectedColumns(day, d(10, 7, 10, 30), d(10, 7, 12), ViewType.Day)).toBeNull();
  });

  it("matches by calendar day in the other views", () => {
    expect(getSelectedColumns(week, d(10, 6, 15), d(10, 8, 1), ViewType.Week)).toEqual({ start: 2, end: 4 });
  });

  it("is null when a slot is not in view", () => {
    expect(getSelectedColumns(week, d(10, 6), d(10, 20), ViewType.Week)).toBeNull();
  });
});
