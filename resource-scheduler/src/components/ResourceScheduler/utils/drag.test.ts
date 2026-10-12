import { describe, expect, it } from "vitest";
import { type SchedulerEvent, ViewType } from "../types";
import { getMovePlacement, getResizePlacement, isSamePlacement } from "./drag";

const d = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const event = (startDate: Date, endDate: Date): SchedulerEvent => ({ id: "e", title: "e", startDate, endDate });

describe("getMovePlacement", () => {
  it("lands on the slot under the pointer in the day view, keeping the length", () => {
    const e = event(d(10, 7, 9, 30), d(10, 7, 11));
    expect(getMovePlacement(e, { resourceId: "b", slot: d(10, 7, 14) }, ViewType.Day)).toEqual({
      resourceId: "b",
      start: d(10, 7, 14),
      end: d(10, 7, 15, 30),
    });
  });

  it("keeps the time of day when dropped on a day", () => {
    const e = event(d(10, 5, 9, 30), d(10, 5, 11));
    expect(getMovePlacement(e, { resourceId: "a", slot: d(10, 8) }, ViewType.Week)).toEqual({
      resourceId: "a",
      start: d(10, 8, 9, 30),
      end: d(10, 8, 11),
    });
  });

  it("does not touch the event or the slot", () => {
    const e = event(d(10, 5, 9), d(10, 5, 10));
    const slot = d(10, 8);
    getMovePlacement(e, { resourceId: "a", slot }, ViewType.Week);
    expect(e.startDate).toEqual(d(10, 5, 9));
    expect(slot).toEqual(d(10, 8));
  });
});

describe("getResizePlacement", () => {
  const e = event(d(10, 7, 9), d(10, 7, 11));
  const on = (slot: Date, resourceId = "a") => ({ resourceId, slot });

  it("drags the end to include the slot under the pointer (day view)", () => {
    expect(getResizePlacement(e, "a", "end", on(d(10, 7, 13)), ViewType.Day)).toEqual({
      resourceId: "a",
      start: d(10, 7, 9),
      end: d(10, 7, 14),
    });
  });

  it("drags the start to the slot", () => {
    expect(getResizePlacement(e, "a", "start", on(d(10, 7, 8)), ViewType.Day)).toEqual({
      resourceId: "a",
      start: d(10, 7, 8),
      end: d(10, 7, 11),
    });
  });

  it("snaps to the slot length", () => {
    expect(getResizePlacement(e, "a", "end", on(d(10, 7, 12, 30)), ViewType.Day, 30)).toMatchObject({
      end: d(10, 7, 13),
    });
  });

  it("moves whole days and keeps the time of day in the other views", () => {
    const trip = event(d(10, 5, 9), d(10, 6, 17));
    expect(getResizePlacement(trip, "a", "end", on(d(10, 8)), ViewType.Week)).toEqual({
      resourceId: "a",
      start: d(10, 5, 9),
      end: d(10, 8, 17),
    });
  });

  it("is null when the edge would cross the other one", () => {
    expect(getResizePlacement(e, "a", "end", on(d(10, 7, 8)), ViewType.Day)).toBeNull();
    expect(getResizePlacement(e, "a", "start", on(d(10, 7, 11)), ViewType.Day)).toBeNull();
  });

  it("stays on the event's own resource", () => {
    expect(getResizePlacement(e, "a", "end", on(d(10, 7, 13), "b"), ViewType.Day)).toBeNull();
  });
});

describe("isSamePlacement", () => {
  const placement = { resourceId: "a", start: d(10, 7, 9), end: d(10, 7, 10) };

  it("compares by value, not by Date instance", () => {
    expect(isSamePlacement(placement, { resourceId: "a", start: d(10, 7, 9), end: d(10, 7, 10) })).toBe(true);
  });

  it("notices a different resource or time", () => {
    expect(isSamePlacement(placement, { ...placement, resourceId: "b" })).toBe(false);
    expect(isSamePlacement(placement, { ...placement, start: d(10, 7, 8) })).toBe(false);
    expect(isSamePlacement(placement, { ...placement, end: d(10, 7, 11) })).toBe(false);
  });

  it("treats two missing placements as the same, and one missing as different", () => {
    expect(isSamePlacement(null, null)).toBe(true);
    expect(isSamePlacement(placement, null)).toBe(false);
    expect(isSamePlacement(null, placement)).toBe(false);
  });
});
