// src/components/ResourceScheduler/utils/drag.ts
// Where a dragged event lands. The pointer handling is yours (or the
// component's); these turn "the slot under the pointer" into a placement.
import type { SchedulerEvent, ViewType } from "../types";
import { getDropRange, getResizeRange } from "./dateUtils";
import type { Placement } from "./placement";

/** The slot under the pointer: its resource row and the Date of its column. */
export interface DragTarget {
  resourceId: string;
  slot: Date;
}

/**
 * Where `event` lands when it is moved and dropped on `target`: that resource,
 * keeping the event's length. The day view puts the start on the slot; the
 * other views keep the event's time of day.
 */
export const getMovePlacement = (
  event: SchedulerEvent,
  target: DragTarget,
  viewType: ViewType
): Placement => ({
  resourceId: target.resourceId,
  ...getDropRange(event, target.slot, viewType),
});

/**
 * The placement after dragging one `edge` of `event` (which is on
 * `resourceId`) to `target`; the slot under the pointer is always included.
 * `null` when the pointer is on another resource's row, or the edge would
 * cross the opposite one. See `getResizeRange` for how the edge snaps.
 */
export const getResizePlacement = (
  event: SchedulerEvent,
  resourceId: string,
  edge: "start" | "end",
  target: DragTarget,
  viewType: ViewType,
  slotMinutes = 60
): Placement | null => {
  // Resizing stays on the event's own resource row.
  if (target.resourceId !== resourceId) return null;
  const range = getResizeRange(event, edge, target.slot, viewType, slotMinutes);
  return range && { resourceId, ...range };
};

/** Whether two placements are the same resource and the same times. Two `null`s are the same. */
export const isSamePlacement = (a: Placement | null, b: Placement | null): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.resourceId === b.resourceId &&
    a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime());
