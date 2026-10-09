import { describe, expect, it, vi } from "vitest";
import type { Resource, SchedulerEvent } from "../types";
import { isPlacementAllowed, rangesOverlap } from "./placement";

const d = (day: number, hour = 0) => new Date(2026, 2, day, hour);
const ev = (id: string, start: Date, end: Date): SchedulerEvent => ({
  id,
  title: id,
  startDate: start,
  endDate: end,
});

const standup = ev("standup", d(10, 9), d(10, 10));
const review = ev("review", d(10, 14), d(10, 15));
const resources: Resource[] = [
  { id: "r1", name: "Ann", events: [standup, review] },
  { id: "r2", name: "Bob", events: [] },
];

const moving = ev("moving", d(10, 11), d(10, 12));
const at = (resourceId: string, start: Date, end: Date) => ({
  resourceId,
  start,
  end,
});

describe("rangesOverlap", () => {
  it("is true when ranges share time", () => {
    expect(rangesOverlap(d(10, 9), d(10, 11), d(10, 10), d(10, 12))).toBe(true);
  });

  it("treats end times as exclusive: touching ranges do not overlap", () => {
    expect(rangesOverlap(d(10, 9), d(10, 10), d(10, 10), d(10, 11))).toBe(false);
  });

  it("treats a zero-length event as a point inside a range", () => {
    expect(rangesOverlap(d(10, 9), d(10, 9), d(10, 8), d(10, 10))).toBe(true);
    expect(rangesOverlap(d(10, 9), d(10, 9), d(10, 10), d(10, 11))).toBe(false);
  });
});

describe("isPlacementAllowed", () => {
  it("allows anything when no rules are set", () => {
    const p = at("r1", d(10, 9), d(10, 10));
    expect(isPlacementAllowed(moving, p, resources, {})).toBe(true);
  });

  it("blocks overlapping events on the same resource when eventOverlap is false", () => {
    const p = at("r1", d(10, 9), d(10, 11));
    expect(
      isPlacementAllowed(moving, p, resources, { eventOverlap: false })
    ).toBe(false);
  });

  it("allows the same time on another resource", () => {
    const p = at("r2", d(10, 9), d(10, 11));
    expect(
      isPlacementAllowed(moving, p, resources, { eventOverlap: false })
    ).toBe(true);
  });

  it("allows ranges that only touch an existing event", () => {
    const p = at("r1", d(10, 10), d(10, 11));
    expect(
      isPlacementAllowed(moving, p, resources, { eventOverlap: false })
    ).toBe(true);
  });

  it("ignores the event being moved or resized", () => {
    const p = at("r1", d(10, 9), d(10, 11));
    expect(
      isPlacementAllowed(standup, p, resources, { eventOverlap: false })
    ).toBe(true);
  });

  it("asks an eventOverlap function about each overlapping pair", () => {
    const eventOverlap = vi.fn((_moving: SchedulerEvent, other: SchedulerEvent) =>
      other.id === "standup"
    );
    const onStandup = at("r1", d(10, 9), d(10, 10));
    const onReview = at("r1", d(10, 14), d(10, 15));

    expect(isPlacementAllowed(moving, onStandup, resources, { eventOverlap })).toBe(true);
    expect(eventOverlap).toHaveBeenCalledWith(moving, standup);
    expect(isPlacementAllowed(moving, onReview, resources, { eventOverlap })).toBe(false);
  });

  it("lets isValidDrop veto a placement", () => {
    const isValidDrop = vi.fn(() => false);
    const p = at("r2", d(10, 9), d(10, 10));

    expect(isPlacementAllowed(moving, p, resources, { isValidDrop })).toBe(false);
    expect(isValidDrop).toHaveBeenCalledWith(moving, p);
  });

  it("does not call isValidDrop when overlap already blocks the placement", () => {
    const isValidDrop = vi.fn(() => true);
    const p = at("r1", d(10, 9), d(10, 11));

    isPlacementAllowed(moving, p, resources, { eventOverlap: false, isValidDrop });
    expect(isValidDrop).not.toHaveBeenCalled();
  });

  it("treats an unknown resource as empty", () => {
    const p = at("missing", d(10, 9), d(10, 10));
    expect(
      isPlacementAllowed(moving, p, resources, { eventOverlap: false })
    ).toBe(true);
  });
});
