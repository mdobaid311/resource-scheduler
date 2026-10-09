// src/components/ResourceScheduler/hooks/useEventDrag.ts
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { Resource, ResourceSchedulerProps, SchedulerEvent, ViewType } from "../types";
import { getDropRange, getResizeRange } from "../utils/dateUtils";
import { Placement } from "../utils/placement";

// Pixels the pointer must travel before a press becomes a drag, so plain
// clicks still open the event popover.
const DRAG_THRESHOLD = 4;

export type DragMode = "move" | "resize";
export type ResizeEdge = "start" | "end";

export interface ActiveDrag {
  eventId: string;
  mode: DragMode;
  /** Where the event would land right now; null when the pointer is not over a valid slot. */
  placement: Placement | null;
  /** False when `placement` is null or rejected by the placement rules. */
  allowed: boolean;
}

export interface EventDragApi {
  activeDrag: ActiveDrag | null;
  viewType: ViewType;
  slotMinutes: number;
  canResize: boolean;
  startEventDrag: (
    e: React.PointerEvent<HTMLElement>,
    event: SchedulerEvent,
    resource: Resource
  ) => void;
  startEventResize: (
    e: React.PointerEvent<HTMLElement>,
    event: SchedulerEvent,
    resource: Resource,
    edge: ResizeEdge
  ) => void;
  wasDragged: () => boolean;
}

export interface EventDragOptions {
  viewType: ViewType;
  /** Minutes per slot in day view. Default 60. */
  slotMinutes?: number;
  onEventDrop?: ResourceSchedulerProps["onEventDrop"];
  /** Providing this turns the resize handles on. */
  onEventResize?: ResourceSchedulerProps["onEventResize"];
  checkPlacement?: (event: SchedulerEvent, placement: Placement) => boolean;
}

// Provided by TimelineGrid; EventItem and EmptySlotItem read it. Null when
// those components are used on their own, in which case dragging is off.
export const SchedulerDragContext = createContext<EventDragApi | null>(null);

interface SlotTarget {
  resourceId: string;
  slot: number;
}

// elementsFromPoint (not elementFromPoint) so cells stay reachable underneath
// events that are layered on top of them.
const findTarget = (x: number, y: number): SlotTarget | null => {
  const cell = document
    .elementsFromPoint(x, y)
    .find(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el.dataset.rsSlot !== undefined &&
        el.dataset.rsResource !== undefined
    );
  return cell
    ? { resourceId: cell.dataset.rsResource!, slot: Number(cell.dataset.rsSlot) }
    : null;
};

const samePlacement = (a: Placement | null, b: Placement | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.resourceId === b.resourceId &&
    a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime());

/**
 * Pointer-events based drag & drop for moving and resizing events. Works for
 * mouse, pen and touch and never touches a host app's DnD setup.
 * Slot cells opt in with `data-rs-slot` (ms timestamp) and `data-rs-resource`.
 */
export const useEventDrag = (options: EventDragOptions): EventDragApi => {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const didDrag = useRef(false);
  const stop = useRef<(() => void) | null>(null);
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });
  useEffect(() => () => stop.current?.(), []);

  const track = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      event: SchedulerEvent,
      resource: Resource,
      mode: DragMode,
      edge?: ResizeEdge
    ) => {
      if (e.button !== 0 || !e.isPrimary) return;
      stop.current?.();

      const el = e.currentTarget;
      const { pointerId, clientX: startX, clientY: startY } = e;
      let moved = false;
      let current: ActiveDrag | null = null;
      didDrag.current = false;

      const resolve = (target: SlotTarget | null): Placement | null => {
        if (!target) return null;
        const slot = new Date(target.slot);
        const { viewType, slotMinutes = 60 } = latest.current;
        if (mode === "move") {
          const { start, end } = getDropRange(event, slot, viewType);
          return { resourceId: target.resourceId, start, end };
        }
        // Resizing stays on the event's own resource row.
        if (target.resourceId !== resource.id) return null;
        const range = getResizeRange(event, edge!, slot, viewType, slotMinutes);
        return range && { resourceId: resource.id, ...range };
      };

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

        const { placement, allowed } = current ?? {};
        if (commit && moved && placement && allowed) {
          const { onEventDrop, onEventResize } = latest.current;
          if (mode === "move")
            onEventDrop?.(event, resource.id, placement.resourceId, placement.start, placement.end);
          else onEventResize?.(event, resource.id, placement.start, placement.end);
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
          if (mode === "move") {
            // Keep the dragged card out of the way of hover and hit-testing.
            el.style.pointerEvents = "none";
            el.style.zIndex = "50";
          }
        }
        if (mode === "move") el.style.transform = `translate(${dx}px, ${dy}px)`;

        const placement = resolve(findTarget(ev.clientX, ev.clientY));
        const allowed =
          !!placement &&
          (latest.current.checkPlacement?.(event, placement) ?? true);

        if (
          first ||
          !current ||
          current.allowed !== allowed ||
          !samePlacement(current.placement, placement)
        ) {
          current = { eventId: event.id, mode, placement, allowed };
          setActiveDrag(current);
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

  const startEventDrag = useCallback<EventDragApi["startEventDrag"]>(
    (e, event, resource) => track(e, event, resource, "move"),
    [track]
  );
  const startEventResize = useCallback<EventDragApi["startEventResize"]>(
    (e, event, resource, edge) => track(e, event, resource, "resize", edge),
    [track]
  );
  const wasDragged = useCallback(() => didDrag.current, []);

  return {
    activeDrag,
    viewType: options.viewType,
    slotMinutes: options.slotMinutes ?? 60,
    canResize: !!options.onEventResize,
    startEventDrag,
    startEventResize,
    wasDragged,
  };
};
