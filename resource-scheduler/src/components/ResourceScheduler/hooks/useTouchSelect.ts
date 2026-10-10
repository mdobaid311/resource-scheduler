// src/components/ResourceScheduler/hooks/useTouchSelect.ts
import { type RefObject, useEffect, useRef } from "react";

// Hold this long to start a selection; a finger that moves first is a scroll.
const HOLD_MS = 350;
const SLOP = 8;

export interface TouchSelectOptions {
  onStart: (slot: Date, resourceId: string) => void;
  onEnter: (slot: Date, resourceId: string) => void;
  /** The finger lifted: commit the selection. */
  onEnd: () => void;
  /** The browser took the gesture: drop the selection. */
  onCancel: () => void;
}

const slotOf = (el: Element | null | undefined) => {
  const cell = el?.closest<HTMLElement>("[data-rs-slot]");
  return cell
    ? { slot: new Date(Number(cell.dataset.rsSlot)), resourceId: cell.dataset.rsResource! }
    : null;
};

/**
 * Touch selection for the slot grid: press and hold on an empty slot, then drag
 * across more slots and lift. A quick swipe still scrolls the grid, and a tap
 * is left to the click the browser sends. Events and non-touch pointers are
 * ignored (events have their own drag, the mouse has its own selection).
 */
export const useTouchSelect = (
  gridRef: RefObject<HTMLElement | null>,
  options: TouchSelectOptions
) => {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let pointerId: number | null = null;
    let origin = { x: 0, y: 0 };
    let selecting = false;
    // After a selection the browser may still send mouse events for the touch; drop them.
    let swallow = false;

    const reset = () => {
      clearTimeout(timer);
      pointerId = null;
      selecting = false;
    };

    const down = (e: PointerEvent) => {
      const target = e.target as Element;
      if (e.pointerType !== "touch" || !e.isPrimary || target.closest("[data-rs-event]")) return;
      const start = slotOf(target);
      if (!start) return;
      reset();
      swallow = false;
      pointerId = e.pointerId;
      origin = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => {
        selecting = true;
        navigator.vibrate?.(10);
        latest.current.onStart(start.slot, start.resourceId);
      }, HOLD_MS);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (!selecting) {
        if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > SLOP) reset();
        return;
      }
      const over = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map(slotOf)
        .find(Boolean);
      if (over) latest.current.onEnter(over.slot, over.resourceId);
    };

    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const was = selecting;
      reset();
      if (!was) return;
      swallow = true;
      if (e.type === "pointerup") latest.current.onEnd();
      else latest.current.onCancel();
    };

    // Must be non-passive to stop the page scrolling under a selecting finger.
    const block = (e: Event) => {
      if ((selecting || (swallow && e.type === "touchend")) && e.cancelable) e.preventDefault();
    };

    grid.addEventListener("pointerdown", down);
    grid.addEventListener("pointermove", move);
    grid.addEventListener("pointerup", end);
    grid.addEventListener("pointercancel", end);
    grid.addEventListener("touchmove", block, { passive: false });
    grid.addEventListener("touchend", block, { passive: false });
    grid.addEventListener("contextmenu", block);
    return () => {
      reset();
      grid.removeEventListener("pointerdown", down);
      grid.removeEventListener("pointermove", move);
      grid.removeEventListener("pointerup", end);
      grid.removeEventListener("pointercancel", end);
      grid.removeEventListener("touchmove", block);
      grid.removeEventListener("touchend", block);
      grid.removeEventListener("contextmenu", block);
    };
  }, [gridRef]);
};
