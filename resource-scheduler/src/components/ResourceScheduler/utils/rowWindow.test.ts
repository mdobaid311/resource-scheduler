import { describe, expect, it } from "vitest";
import { getRowWindow } from "./rowWindow";

// 40 rows of 60px. Row i spans y = 60i to 60i + 60 below the 56px header.
const rows = Array.from({ length: 40 }, () => 60);

describe("getRowWindow", () => {
  it("starts at the first row and ends where the viewport does", () => {
    // Visible area in row coordinates: -56 to 244, which touches rows 0 to 4.
    expect(getRowWindow(rows, 0, 300, 0, 56)).toEqual({ start: 0, end: 5 });
  });

  it("follows the scroll position", () => {
    // 544 to 844 touches rows 9 to 14.
    expect(getRowWindow(rows, 600, 300, 0, 56)).toEqual({ start: 9, end: 15 });
  });

  it("widens by the overscan on both sides", () => {
    expect(getRowWindow(rows, 600, 300, 120, 56)).toEqual({ start: 7, end: 17 });
  });

  it("stops at the last row", () => {
    expect(getRowWindow(rows, 2300, 300, 0, 56)).toEqual({ start: 37, end: 40 });
  });

  it("handles rows of different heights", () => {
    expect(getRowWindow([60, 120, 60, 180], 0, 100, 0, 0)).toEqual({ start: 0, end: 2 });
    expect(getRowWindow([60, 120, 60, 180], 200, 100, 0, 0)).toEqual({ start: 2, end: 4 });
  });

  it("returns an empty window for no rows", () => {
    expect(getRowWindow([], 0, 300, 0, 56)).toEqual({ start: 0, end: 0 });
  });

  it("returns an empty window when scrolled past the end", () => {
    expect(getRowWindow(rows, 100000, 300, 0, 56)).toEqual({ start: 40, end: 40 });
  });
});
