import { describe, expect, it } from "vitest";
import { ViewType } from "../types";
import { flipHorizontal, moveCursor, stepPlacement, type StepContext } from "./keyboard";

const d = (day: number, hour = 0, minute = 0) => new Date(2026, 2, day, hour, minute);

describe("flipHorizontal", () => {
  it("swaps left and right when the layout is right-to-left", () => {
    expect(flipHorizontal("ArrowLeft", true)).toBe("ArrowRight");
    expect(flipHorizontal("ArrowRight", true)).toBe("ArrowLeft");
  });

  it("leaves everything else, and left-to-right layouts, alone", () => {
    expect(flipHorizontal("ArrowLeft", false)).toBe("ArrowLeft");
    expect(flipHorizontal("ArrowUp", true)).toBe("ArrowUp");
    expect(flipHorizontal("Home", true)).toBe("Home");
  });
});

describe("moveCursor", () => {
  const at = (row: number, col: number) => ({ row, col });

  it("moves one cell with the arrow keys", () => {
    expect(moveCursor(at(1, 1), "ArrowRight", 3, 4)).toEqual(at(1, 2));
    expect(moveCursor(at(1, 1), "ArrowLeft", 3, 4)).toEqual(at(1, 0));
    expect(moveCursor(at(1, 1), "ArrowDown", 3, 4)).toEqual(at(2, 1));
    expect(moveCursor(at(1, 1), "ArrowUp", 3, 4)).toEqual(at(0, 1));
  });

  it("stays inside the grid", () => {
    expect(moveCursor(at(0, 0), "ArrowLeft", 3, 4)).toEqual(at(0, 0));
    expect(moveCursor(at(0, 0), "ArrowUp", 3, 4)).toEqual(at(0, 0));
    expect(moveCursor(at(2, 3), "ArrowRight", 3, 4)).toEqual(at(2, 3));
    expect(moveCursor(at(2, 3), "ArrowDown", 3, 4)).toEqual(at(2, 3));
  });

  it("jumps to the ends of the row with Home and End", () => {
    expect(moveCursor(at(1, 2), "Home", 3, 4)).toEqual(at(1, 0));
    expect(moveCursor(at(1, 1), "End", 3, 4)).toEqual(at(1, 3));
  });

  it("ignores other keys", () => {
    expect(moveCursor(at(1, 1), "a", 3, 4)).toBeNull();
    expect(moveCursor(at(1, 1), "Enter", 3, 4)).toBeNull();
  });
});

describe("stepPlacement", () => {
  const week: StepContext = {
    viewType: ViewType.Week,
    slotMinutes: 60,
    resourceIds: ["r1", "r2", "r3"],
    range: { start: d(8), end: d(15) }, // Sun 8th to Sun 15th, end exclusive
  };
  const dayView: StepContext = {
    viewType: ViewType.Day,
    slotMinutes: 30,
    resourceIds: ["r1", "r2"],
    range: { start: d(10, 8), end: d(10, 18) },
  };
  const placement = (resourceId: string, start: Date, end: Date) => ({ resourceId, start, end });

  it("moves by whole days in date views, keeping the time of day", () => {
    const p = placement("r1", d(10, 9, 30), d(10, 11));
    expect(stepPlacement(p, { cols: 1 }, week)).toEqual(placement("r1", d(11, 9, 30), d(11, 11)));
    expect(stepPlacement(p, { cols: -2 }, week)).toEqual(placement("r1", d(8, 9, 30), d(8, 11)));
  });

  it("moves by one slot in day view", () => {
    const p = placement("r1", d(10, 9), d(10, 10));
    expect(stepPlacement(p, { cols: 1 }, dayView)).toEqual(placement("r1", d(10, 9, 30), d(10, 10, 30)));
  });

  it("moves between resources", () => {
    const p = placement("r1", d(10, 9), d(10, 10));
    expect(stepPlacement(p, { rows: 1 }, week)).toEqual(placement("r2", d(10, 9), d(10, 10)));
    expect(stepPlacement(p, { rows: -1 }, week)).toBeNull();
  });

  it("refuses to leave the visible range", () => {
    expect(stepPlacement(placement("r1", d(8, 9), d(8, 10)), { cols: -1 }, week)).toBeNull();
    expect(stepPlacement(placement("r1", d(14, 9), d(14, 10)), { cols: 1 }, week)).toBeNull();
    expect(stepPlacement(placement("r1", d(10, 17), d(10, 18)), { cols: 1 }, dayView)).toBeNull();
  });

  it("resizes the end by one slot and keeps the start", () => {
    const p = placement("r1", d(10, 9), d(10, 10));
    expect(stepPlacement(p, { resizeEnd: 1 }, dayView)).toEqual(placement("r1", d(10, 9), d(10, 10, 30)));
    expect(stepPlacement(p, { resizeEnd: -1 }, dayView)).toEqual(placement("r1", d(10, 9), d(10, 9, 30)));
  });

  it("refuses to shrink an event to nothing", () => {
    const p = placement("r1", d(10, 9), d(10, 9, 30));
    expect(stepPlacement(p, { resizeEnd: -1 }, dayView)).toBeNull();
  });

  it("refuses to grow past the visible range", () => {
    const p = placement("r1", d(10, 17), d(10, 18));
    expect(stepPlacement(p, { resizeEnd: 1 }, dayView)).toBeNull();
  });
});
