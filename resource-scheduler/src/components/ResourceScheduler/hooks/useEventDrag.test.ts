import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Resource, SchedulerEvent, ViewType } from "../types";
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
const pointerDown = {
  button: 0,
  isPrimary: true,
  pointerId: 1,
  clientX: 10,
  clientY: 10,
} as unknown as React.PointerEvent<HTMLElement>;

type Api = { current: ReturnType<typeof useEventDrag> };
const down = (result: Api) =>
  act(() =>
    result.current.startEventDrag(
      { ...pointerDown, currentTarget: el } as React.PointerEvent<HTMLElement>,
      event,
      from
    )
  );
const downResize = (result: Api, edge: "start" | "end") =>
  act(() =>
    result.current.startEventResize(
      { ...pointerDown, currentTarget: el } as React.PointerEvent<HTMLElement>,
      event,
      from,
      edge
    )
  );
const move = (x: number) => act(() => void window.dispatchEvent(pointer("pointermove", x, 10)));
const up = (x: number) => act(() => void window.dispatchEvent(pointer("pointerup", x, 10)));

const overCell = (resourceId: string, slot: Date) => {
  cell = document.createElement("div");
  cell.dataset.rsResource = resourceId;
  cell.dataset.rsSlot = String(slot.getTime());
  document.body.append(cell);
};

beforeEach(() => {
  el = document.createElement("div");
  document.body.append(el);
  overCell("r2", d(3, 12));
  // The dragged element and other events sit above the cells.
  document.elementsFromPoint = vi.fn(() => (cell ? [el, cell] : [el]));
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useEventDrag: move", () => {
  it("drops onto another resource and date, keeping the time of day", () => {
    const onEventDrop = vi.fn();
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop })
    );

    down(result);
    move(60);
    up(60);

    expect(onEventDrop).toHaveBeenCalledWith(
      event,
      "r1",
      "r2",
      d(3, 12, 14, 30),
      d(3, 12, 16)
    );
  });

  it("treats a tiny movement as a click, not a drag", () => {
    const onEventDrop = vi.fn();
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop })
    );

    down(result);
    move(12);
    up(12);

    expect(onEventDrop).not.toHaveBeenCalled();
    expect(result.current.wasDragged()).toBe(false);
  });

  it("reports a real drag so the trailing click can be ignored", () => {
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop: vi.fn() })
    );

    down(result);
    move(60);
    up(60);

    expect(result.current.wasDragged()).toBe(true);
  });

  it("follows the pointer and lets the pointer reach cells underneath", () => {
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop: vi.fn() })
    );

    down(result);
    move(60);
    expect(el.style.transform).toBe("translate(50px, 0px)");
    expect(el.style.pointerEvents).toBe("none");

    up(60);
    expect(el.style.transform).toBe("");
    expect(el.style.pointerEvents).toBe("");
  });

  it("exposes the footprint under the pointer while dragging", () => {
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop: vi.fn() })
    );

    down(result);
    move(60);

    expect(result.current.activeDrag).toEqual({
      eventId: "e1",
      mode: "move",
      placement: { resourceId: "r2", start: d(3, 12, 14, 30), end: d(3, 12, 16) },
      allowed: true,
    });
    up(60);
    expect(result.current.activeDrag).toBeNull();
  });

  it("cancels on Escape", () => {
    const onEventDrop = vi.fn();
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop })
    );

    down(result);
    move(60);
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    up(60);

    expect(onEventDrop).not.toHaveBeenCalled();
    expect(el.style.transform).toBe("");
  });

  it("ignores drops outside any slot", () => {
    const onEventDrop = vi.fn();
    cell = null;
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop })
    );

    down(result);
    move(60);
    up(60);

    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it("finds the slot underneath other events", () => {
    const onEventDrop = vi.fn();
    const otherEvent = document.createElement("div");
    document.elementsFromPoint = vi.fn(() => [otherEvent, el, cell!]);
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop })
    );

    down(result);
    move(60);
    up(60);

    expect(onEventDrop).toHaveBeenCalledTimes(1);
  });

  it("rejects a drop that checkPlacement disallows and flags it while dragging", () => {
    const onEventDrop = vi.fn();
    const checkPlacement = vi.fn(() => false);
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventDrop, checkPlacement })
    );

    down(result);
    move(60);
    expect(result.current.activeDrag?.allowed).toBe(false);
    up(60);

    expect(checkPlacement).toHaveBeenCalledWith(event, {
      resourceId: "r2",
      start: d(3, 12, 14, 30),
      end: d(3, 12, 16),
    });
    expect(onEventDrop).not.toHaveBeenCalled();
  });
});

describe("useEventDrag: resize", () => {
  beforeEach(() => {
    document.body.removeChild(cell!);
    overCell("r1", d(3, 12));
  });

  it("only offers resizing when onEventResize is provided", () => {
    const { result: without } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week })
    );
    const { result: withHandler } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize: vi.fn() })
    );

    expect(without.current.canResize).toBe(false);
    expect(withHandler.current.canResize).toBe(true);
  });

  it("resizes the end edge to the dragged day", () => {
    const onEventResize = vi.fn();
    const onEventDrop = vi.fn();
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize, onEventDrop })
    );

    downResize(result, "end");
    move(60);
    expect(result.current.activeDrag?.mode).toBe("resize");
    up(60);

    expect(onEventResize).toHaveBeenCalledWith(
      event,
      "r1",
      d(3, 10, 14, 30),
      d(3, 12, 16)
    );
    expect(onEventDrop).not.toHaveBeenCalled();
    expect(el.style.transform).toBe("");
  });

  it("resizes the start edge", () => {
    const onEventResize = vi.fn();
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize })
    );
    document.body.removeChild(cell!);
    overCell("r1", d(3, 8));

    downResize(result, "start");
    move(60);
    up(60);

    expect(onEventResize).toHaveBeenCalledWith(
      event,
      "r1",
      d(3, 8, 14, 30),
      d(3, 10, 16)
    );
  });

  it("resizes by the configured slot length in day view", () => {
    const onEventResize = vi.fn();
    document.body.removeChild(cell!);
    overCell("r1", d(3, 10, 17, 30));
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Day, slotMinutes: 30, onEventResize })
    );

    downResize(result, "end");
    move(60);
    up(60);

    expect(onEventResize).toHaveBeenCalledWith(
      event,
      "r1",
      d(3, 10, 14, 30),
      d(3, 10, 18)
    );
    expect(result.current.slotMinutes).toBe(30);
  });

  it("ignores slots of another resource", () => {
    const onEventResize = vi.fn();
    document.body.removeChild(cell!);
    overCell("r2", d(3, 12));
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize })
    );

    downResize(result, "end");
    move(60);
    up(60);

    expect(onEventResize).not.toHaveBeenCalled();
  });

  it("ignores a resize that would invert the event", () => {
    const onEventResize = vi.fn();
    document.body.removeChild(cell!);
    overCell("r1", d(3, 8)); // end edge dragged before the start
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize })
    );

    downResize(result, "end");
    move(60);
    up(60);

    expect(onEventResize).not.toHaveBeenCalled();
  });

  it("rejects a resize that checkPlacement disallows", () => {
    const onEventResize = vi.fn();
    const checkPlacement = vi.fn(() => false);
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize, checkPlacement })
    );

    downResize(result, "end");
    move(60);
    expect(result.current.activeDrag?.allowed).toBe(false);
    up(60);

    expect(checkPlacement).toHaveBeenCalledWith(event, {
      resourceId: "r1",
      start: d(3, 10, 14, 30),
      end: d(3, 12, 16),
    });
    expect(onEventResize).not.toHaveBeenCalled();
  });

  it("reports a real resize so the trailing click can be ignored", () => {
    const { result } = renderHook(() =>
      useEventDrag({ viewType: ViewType.Week, onEventResize: vi.fn() })
    );

    downResize(result, "end");
    move(60);
    up(60);

    expect(result.current.wasDragged()).toBe(true);
  });
});
