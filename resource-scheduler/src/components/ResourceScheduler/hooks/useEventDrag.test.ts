import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulerEvent, Resource, ViewType } from "../types";
import { useEventDrag } from "./useEventDrag";

const d = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);

const event: SchedulerEvent = {
  id: "e1",
  title: "Standup",
  startDate: d(3, 10, 14, 30),
  endDate: d(3, 10, 16),
};
const from: Resource = { id: "r1", name: "Ann", events: [event] };

let el: HTMLElement;
let cell: HTMLElement | null;

const pointer = (type: string, x: number, y: number) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y });
  Object.assign(e, { pointerId: 1 });
  return e;
};
const down = (result: { current: ReturnType<typeof useEventDrag> }) =>
  act(() =>
    result.current.startEventDrag(
      {
        button: 0,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        currentTarget: el,
      } as unknown as React.PointerEvent<HTMLElement>,
      event,
      from
    )
  );
const move = (x: number) => act(() => void window.dispatchEvent(pointer("pointermove", x, 10)));
const up = (x: number) => act(() => void window.dispatchEvent(pointer("pointerup", x, 10)));

beforeEach(() => {
  el = document.createElement("div");
  cell = document.createElement("div");
  cell.dataset.rsResource = "r2";
  cell.dataset.rsSlot = String(d(3, 12).getTime());
  document.body.append(el, cell);
  document.elementFromPoint = vi.fn(() => cell);
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useEventDrag", () => {
  it("drops onto another resource and date, keeping the time of day", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useEventDrag(ViewType.Week, onDrop));

    down(result);
    move(60);
    up(60);

    expect(onDrop).toHaveBeenCalledWith(
      event,
      "r1",
      "r2",
      d(3, 12, 14, 30),
      d(3, 12, 16)
    );
  });

  it("treats a tiny movement as a click, not a drag", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useEventDrag(ViewType.Week, onDrop));

    down(result);
    move(12);
    up(12);

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.wasDragged()).toBe(false);
  });

  it("reports a real drag so the trailing click can be ignored", () => {
    const { result } = renderHook(() => useEventDrag(ViewType.Week, vi.fn()));

    down(result);
    move(60);
    up(60);

    expect(result.current.wasDragged()).toBe(true);
  });

  it("follows the pointer and lets the pointer reach cells underneath", () => {
    const { result } = renderHook(() => useEventDrag(ViewType.Week, vi.fn()));

    down(result);
    move(60);
    expect(el.style.transform).toBe("translate(50px, 0px)");
    expect(el.style.pointerEvents).toBe("none");

    up(60);
    expect(el.style.transform).toBe("");
    expect(el.style.pointerEvents).toBe("");
  });

  it("highlights the cell under the pointer while dragging", () => {
    const { result } = renderHook(() => useEventDrag(ViewType.Week, vi.fn()));

    down(result);
    move(60);

    expect(result.current.activeDrag).toEqual({
      eventId: "e1",
      target: { resourceId: "r2", slot: d(3, 12).getTime() },
    });
    up(60);
    expect(result.current.activeDrag).toBeNull();
  });

  it("cancels on Escape", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useEventDrag(ViewType.Week, onDrop));

    down(result);
    move(60);
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    up(60);

    expect(onDrop).not.toHaveBeenCalled();
    expect(el.style.transform).toBe("");
  });

  it("ignores drops outside any slot", () => {
    const onDrop = vi.fn();
    cell = null;
    const { result } = renderHook(() => useEventDrag(ViewType.Week, onDrop));

    down(result);
    move(60);
    up(60);

    expect(onDrop).not.toHaveBeenCalled();
  });
});
