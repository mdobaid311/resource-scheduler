import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTouchSelect } from "./useTouchSelect";

const SLOT_A = new Date(2026, 9, 7, 9).getTime();
const SLOT_B = new Date(2026, 9, 7, 10).getTime();

let grid: HTMLDivElement;
let cellA: HTMLElement;
let cellB: HTMLElement;
let card: HTMLElement;
let under: HTMLElement[]; // what elementsFromPoint returns (jsdom has no layout)

const options = () => ({
  onStart: vi.fn(),
  onEnter: vi.fn(),
  onEnd: vi.fn(),
  onCancel: vi.fn(),
});

const mount = (o = options()) => {
  renderHook(() => useTouchSelect({ current: grid }, o));
  return o;
};

// Pointer events with the fields the hook reads (jsdom's PointerEvent has none of them).
const pointer = (
  type: string,
  target: EventTarget,
  init: { x?: number; y?: number; pointerType?: string; id?: number } = {}
) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, {
    pointerType: init.pointerType ?? "touch",
    pointerId: init.id ?? 1,
    isPrimary: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
  });
  target.dispatchEvent(e);
  return e;
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  grid = document.createElement("div");
  grid.innerHTML = `
    <div id="a" data-rs-slot="${SLOT_A}" data-rs-resource="r1"></div>
    <div id="b" data-rs-slot="${SLOT_B}" data-rs-resource="r1"></div>
    <div data-rs-event="e1"><span id="card"></span></div>`;
  document.body.append(grid);
  cellA = grid.querySelector("#a")!;
  cellB = grid.querySelector("#b")!;
  card = grid.querySelector("#card")!;
  under = [cellB];
  document.elementsFromPoint = () => under;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTouchSelect", () => {
  it("starts a selection when a touch is held on a slot", () => {
    const o = mount();
    pointer("pointerdown", cellA);
    vi.advanceTimersByTime(200);
    expect(o.onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(o.onStart).toHaveBeenCalledWith(new Date(SLOT_A), "r1");
  });

  it("does nothing for a tap that ends before the delay", () => {
    const o = mount();
    pointer("pointerdown", cellA);
    pointer("pointerup", cellA);
    vi.advanceTimersByTime(1000);
    expect(o.onStart).not.toHaveBeenCalled();
    expect(o.onEnd).not.toHaveBeenCalled();
  });

  it("leaves a moving finger to the browser, which scrolls", () => {
    const o = mount();
    pointer("pointerdown", cellA, { x: 10, y: 10 });
    pointer("pointermove", cellA, { x: 40, y: 10 });
    vi.advanceTimersByTime(1000);
    expect(o.onStart).not.toHaveBeenCalled();
  });

  it("extends the selection over the slot under the finger", () => {
    const o = mount();
    pointer("pointerdown", cellA, { x: 10, y: 10 });
    vi.advanceTimersByTime(400);
    pointer("pointermove", cellA, { x: 90, y: 10 });
    expect(o.onEnter).toHaveBeenCalledWith(new Date(SLOT_B), "r1");
  });

  it("commits on release", () => {
    const o = mount();
    pointer("pointerdown", cellA);
    vi.advanceTimersByTime(400);
    pointer("pointerup", cellA);
    expect(o.onEnd).toHaveBeenCalledTimes(1);
    expect(o.onCancel).not.toHaveBeenCalled();
  });

  it("cancels when the browser takes the gesture", () => {
    const o = mount();
    pointer("pointerdown", cellA);
    vi.advanceTimersByTime(400);
    pointer("pointercancel", cellA);
    expect(o.onCancel).toHaveBeenCalledTimes(1);
    expect(o.onEnd).not.toHaveBeenCalled();
  });

  it("stops the page from scrolling only while a selection is in progress", () => {
    mount();
    const early = new Event("touchmove", { bubbles: true, cancelable: true });
    pointer("pointerdown", cellA);
    grid.dispatchEvent(early);
    expect(early.defaultPrevented).toBe(false);

    vi.advanceTimersByTime(400);
    const during = new Event("touchmove", { bubbles: true, cancelable: true });
    grid.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);

    const menu = new Event("contextmenu", { bubbles: true, cancelable: true });
    grid.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
  });

  it("drops the mouse events a browser may still send after a selection", () => {
    mount();
    pointer("pointerdown", cellA);
    vi.advanceTimersByTime(400);
    pointer("pointerup", cellA);
    const touchend = new Event("touchend", { bubbles: true, cancelable: true });
    grid.dispatchEvent(touchend);
    expect(touchend.defaultPrevented).toBe(true);
  });

  it("ignores the mouse and pen, and presses on an event card", () => {
    const o = mount();
    pointer("pointerdown", cellA, { pointerType: "mouse" });
    pointer("pointerdown", cellA, { pointerType: "pen", id: 2 });
    pointer("pointerdown", card, { id: 3 });
    vi.advanceTimersByTime(1000);
    expect(o.onStart).not.toHaveBeenCalled();
  });
});
