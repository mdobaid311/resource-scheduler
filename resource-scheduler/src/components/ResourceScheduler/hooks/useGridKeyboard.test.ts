import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { type GridKeyboardOptions, useGridKeyboard } from "./useGridKeyboard";

const slot = (row: number, col: number) => ({
  resourceId: `r${row + 1}`,
  date: new Date(2026, 2, 10, 8 + col),
});

const grid = document.createElement("div");
const child = document.createElement("button");

const key = (k: string, extra: Partial<React.KeyboardEvent> = {}) =>
  ({
    key: k,
    shiftKey: false,
    target: grid,
    currentTarget: grid,
    preventDefault: vi.fn(),
    ...extra,
  }) as unknown as React.KeyboardEvent<HTMLElement>;

let onSelect: Mock<GridKeyboardOptions["onSelect"]>;
let announce: Mock<(message: string) => void>;

const setup = (initialCol = 1) => {
  const hook = renderHook(() =>
    useGridKeyboard({
      rowCount: 3,
      colCount: 5,
      initialCol,
      idPrefix: "g",
      slotAt: slot,
      onSelect,
      announce,
    })
  );
  const press = (k: string, extra?: Partial<React.KeyboardEvent>) => {
    const e = key(k, extra);
    act(() => hook.result.current.gridProps.onKeyDown(e));
    return e;
  };
  const focus = () =>
    act(() => hook.result.current.gridProps.onFocus({ target: grid, currentTarget: grid } as unknown as React.FocusEvent<HTMLElement>));
  return { ...hook, press, focus };
};

beforeEach(() => {
  onSelect = vi.fn<GridKeyboardOptions["onSelect"]>();
  announce = vi.fn<(message: string) => void>();
});

describe("useGridKeyboard", () => {
  it("starts on the first row at the initial column when the grid gets focus", () => {
    const { result, focus } = setup(2);
    expect(result.current.cursor).toBeNull();

    focus();

    expect(result.current.cursor).toEqual({ row: 0, col: 2 });
    expect(result.current.activeId).toBe("g-r0-c2");
  });

  it("moves with the arrow keys and prevents page scrolling", () => {
    const { result, focus, press } = setup(1);
    focus();

    const e = press("ArrowRight");
    press("ArrowDown");

    expect(e.preventDefault).toHaveBeenCalled();
    expect(result.current.cursor).toEqual({ row: 1, col: 2 });
  });

  it("selects the slot under the cursor on Enter", () => {
    const { focus, press } = setup(1);
    focus();
    press("ArrowDown");

    press("Enter");

    expect(onSelect).toHaveBeenCalledWith("r2", slot(1, 1).date, slot(1, 1).date);
  });

  it("selects with Space too", () => {
    const { focus, press } = setup(0);
    focus();
    press(" ");
    expect(onSelect).toHaveBeenCalledWith("r1", slot(0, 0).date, slot(0, 0).date);
  });

  it("extends a range with Shift+Arrow and selects it on Enter", () => {
    const { result, focus, press } = setup(1);
    focus();

    press("ArrowRight", { shiftKey: true });
    press("ArrowRight", { shiftKey: true });
    expect(result.current.selection).toEqual({ row: 0, from: 1, to: 3 });
    press("Enter");

    expect(onSelect).toHaveBeenCalledWith("r1", slot(0, 1).date, slot(0, 3).date);
    expect(result.current.selection).toBeNull();
  });

  it("extends backwards too", () => {
    const { focus, press } = setup(3);
    focus();
    press("ArrowLeft", { shiftKey: true });
    press("Enter");
    expect(onSelect).toHaveBeenCalledWith("r1", slot(0, 2).date, slot(0, 3).date);
  });

  it("drops the range on Escape without selecting", () => {
    const { result, focus, press } = setup(1);
    focus();
    press("ArrowRight", { shiftKey: true });

    press("Escape");

    expect(result.current.selection).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not extend a range vertically", () => {
    const { result, focus, press } = setup(1);
    focus();
    press("ArrowDown", { shiftKey: true });
    expect(result.current.selection).toBeNull();
    expect(result.current.cursor).toEqual({ row: 1, col: 1 });
  });

  it("ignores keys that come from elements inside the grid", () => {
    const { result, focus, press } = setup(1);
    focus();

    const e = press("ArrowRight", { target: child } as Partial<React.KeyboardEvent>);

    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(result.current.cursor).toEqual({ row: 0, col: 1 });
  });

  it("hides the cursor on blur and restores it on focus", () => {
    const { result, focus, press } = setup(1);
    focus();
    press("ArrowRight");

    act(() => result.current.gridProps.onBlur({ target: grid, currentTarget: grid } as unknown as React.FocusEvent<HTMLElement>));
    expect(result.current.cursor).toBeNull();
    expect(result.current.activeId).toBeUndefined();

    focus();
    expect(result.current.cursor).toEqual({ row: 0, col: 2 });
  });

  it("announces the selected range", () => {
    const { focus, press } = setup(1);
    focus();
    press("ArrowRight", { shiftKey: true });
    expect(announce).toHaveBeenLastCalledWith(expect.stringContaining("Selecting"));
    press("Enter");
    expect(announce).toHaveBeenLastCalledWith(expect.stringContaining("Selected"));
  });
});
