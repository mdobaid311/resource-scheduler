import { describe, expect, it } from "vitest";
import { getColumnWindow, parsePx } from "./columnWindow";

describe("getColumnWindow", () => {
  it("covers the viewport from the first column", () => {
    // 1000 px of 140 px columns: 7.14 columns, so 8 are at least partly in view.
    expect(getColumnWindow(365, 140, 0, 1000, 0)).toEqual({ start: 0, end: 8 });
  });

  it("adds overscan on both sides", () => {
    expect(getColumnWindow(365, 140, 1400, 1000, 140)).toEqual({ start: 9, end: 19 });
  });

  it("starts at 0 and ends at the count, not outside", () => {
    expect(getColumnWindow(365, 140, 0, 1000, 700)).toEqual({ start: 0, end: 13 });
    // (50600 - 700) / 140 = 356.4
    expect(getColumnWindow(365, 140, 365 * 140 - 500, 1000, 700)).toEqual({ start: 356, end: 365 });
    expect(getColumnWindow(10, 140, 0, 100_000, 0)).toEqual({ start: 0, end: 10 });
  });

  it("is empty when scrolled past the end", () => {
    expect(getColumnWindow(10, 140, 50_000, 1000, 0)).toEqual({ start: 10, end: 10 });
  });

  it("includes a column that is only partly in view", () => {
    // The viewport starts 1 px into column 2 and ends 1 px into column 10.
    expect(getColumnWindow(365, 100, 201, 800, 0)).toEqual({ start: 2, end: 11 });
  });

  it("covers every column when it cannot tell", () => {
    expect(getColumnWindow(365, 0, 0, 1000, 0)).toEqual({ start: 0, end: 365 });
    expect(getColumnWindow(365, Number.NaN, 0, 1000, 0)).toEqual({ start: 0, end: 365 });
    expect(getColumnWindow(365, 140, 0, 0, 0)).toEqual({ start: 0, end: 365 });
    expect(getColumnWindow(365, 140, Number.NaN, 1000, 0)).toEqual({ start: 0, end: 365 });
  });

  it("has nothing to show for no columns", () => {
    expect(getColumnWindow(0, 140, 0, 1000, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("parsePx", () => {
  it("reads a width in pixels", () => {
    expect(parsePx("140px")).toBe(140);
    expect(parsePx(" 90.5px ")).toBe(90.5);
  });

  it("gives undefined for any other unit, since only pixels can be measured without the DOM", () => {
    for (const width of ["10rem", "20%", "auto", "", "140", "calc(100px + 2px)", undefined]) {
      expect(parsePx(width)).toBeUndefined();
    }
  });
});
