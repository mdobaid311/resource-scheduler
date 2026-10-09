// src/components/ResourceScheduler/hooks/useEventDrag.ts
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { SchedulerEvent, Resource, ResourceSchedulerProps, ViewType } from "../types";
import { getDropRange } from "../utils/dateUtils";

// Pixels the pointer must travel before a press becomes a drag, so plain
// clicks still open the event popover.
const DRAG_THRESHOLD = 4;

export interface DropTarget {
  resourceId: string;
  slot: number;
}

export interface ActiveDrag {
  eventId: string;
  target: DropTarget | null;
}

export interface EventDragApi {
  activeDrag: ActiveDrag | null;
  startEventDrag: (
    e: React.PointerEvent<HTMLElement>,
    event: SchedulerEvent,
    resource: Resource
  ) => void;
  wasDragged: () => boolean;
}

// Provided by TimelineGrid; EventItem and EmptySlotItem read it. Null when
// those components are used on their own, in which case dragging is off.
export const SchedulerDragContext = createContext<EventDragApi | null>(null);

const findTarget = (x: number, y: number): DropTarget | null => {
  const cell = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-rs-slot]");
  return cell?.dataset.rsResource && cell.dataset.rsSlot
    ? { resourceId: cell.dataset.rsResource, slot: Number(cell.dataset.rsSlot) }
    : null;
};

/**
 * Pointer-events based drag & drop for moving events between slots/resources.
 * Works for mouse, pen and touch and never touches a host app's DnD setup.
 * Slot cells opt in with `data-rs-slot` (ms timestamp) and `data-rs-resource`.
 */
export const useEventDrag = (
  viewType: ViewType,
  onEventDrop?: ResourceSchedulerProps["onEventDrop"]
): EventDragApi => {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const didDrag = useRef(false);
  const stop = useRef<(() => void) | null>(null);
  const latest = useRef({ viewType, onEventDrop });

  useEffect(() => {
    latest.current = { viewType, onEventDrop };
  });
  useEffect(() => () => stop.current?.(), []);

  const startEventDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>, event: SchedulerEvent, resource: Resource) => {
      if (e.button !== 0 || !e.isPrimary) return;
      stop.current?.();

      const el = e.currentTarget;
      const { pointerId, clientX: startX, clientY: startY } = e;
      let moved = false;
      let target: DropTarget | null = null;
      didDrag.current = false;

      const finish = (commit: boolean) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        stop.current = null;
        el.style.transform = "";
        el.style.pointerEvents = "";
        el.style.zIndex = "";
        setActiveDrag(null);

        if (commit && moved && target) {
          const { viewType, onEventDrop } = latest.current;
          const { start, end } = getDropRange(
            event,
            new Date(target.slot),
            viewType
          );
          onEventDrop?.(event, resource.id, target.resourceId, start, end);
        }
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let first = false;
        if (!moved) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          moved = first = true;
          didDrag.current = true;
          // Let elementFromPoint see the cells underneath the dragged event.
          el.style.pointerEvents = "none";
          el.style.zIndex = "50";
        }
        el.style.transform = `translate(${dx}px, ${dy}px)`;

        const next = findTarget(ev.clientX, ev.clientY);
        if (
          first ||
          next?.resourceId !== target?.resourceId ||
          next?.slot !== target?.slot
        ) {
          target = next;
          setActiveDrag({ eventId: event.id, target });
        }
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) finish(true);
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId === pointerId) finish(false);
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") finish(false);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
      stop.current = () => finish(false);
    },
    []
  );

  const wasDragged = useCallback(() => didDrag.current, []);

  return { activeDrag, startEventDrag, wasDragged };
};
