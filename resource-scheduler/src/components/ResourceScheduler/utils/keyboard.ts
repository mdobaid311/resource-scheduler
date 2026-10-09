// src/components/ResourceScheduler/utils/keyboard.ts
import { addDays, addMinutes } from "date-fns";
import { ViewType } from "../types";
import { Placement } from "./placement";

export interface Cursor {
  row: number;
  col: number;
}

/** New cursor for a navigation key, clamped to the grid; null for other keys. */
export const moveCursor = (
  cursor: Cursor,
  key: string,
  rows: number,
  cols: number
): Cursor | null => {
  const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max - 1);
  switch (key) {
    case "ArrowLeft":
      return { row: cursor.row, col: clamp(cursor.col - 1, cols) };
    case "ArrowRight":
      return { row: cursor.row, col: clamp(cursor.col + 1, cols) };
    case "ArrowUp":
      return { row: clamp(cursor.row - 1, rows), col: cursor.col };
    case "ArrowDown":
      return { row: clamp(cursor.row + 1, rows), col: cursor.col };
    case "Home":
      return { row: cursor.row, col: 0 };
    case "End":
      return { row: cursor.row, col: cols - 1 };
    default:
      return null;
  }
};

export interface StepContext {
  viewType: ViewType;
  /** Minutes per slot in day view. */
  slotMinutes: number;
  /** Resource ids in display order. */
  resourceIds: string[];
  /** Visible time range, end exclusive. Events may not leave it. */
  range: { start: Date; end: Date };
}

export interface Step {
  /** Slots (day view) or days (other views) to move horizontally. */
  cols?: number;
  /** Resource rows to move vertically. */
  rows?: number;
  /** Slots/days to add to the end (negative shrinks). */
  resizeEnd?: number;
}

/**
 * Keyboard equivalent of a drag step: the new placement after moving or
 * resizing `placement` by one `step`, or null when the step would leave the
 * visible range or the resource list, or leave the event with no length.
 */
export const stepPlacement = (
  placement: Placement,
  { cols = 0, rows = 0, resizeEnd = 0 }: Step,
  { viewType, slotMinutes, resourceIds, range }: StepContext
): Placement | null => {
  const shift = (date: Date, n: number) =>
    viewType === ViewType.Day ? addMinutes(date, n * slotMinutes) : addDays(date, n);

  const index = resourceIds.indexOf(placement.resourceId) + rows;
  if (index < 0 || index >= resourceIds.length) return null;

  const start = shift(placement.start, cols);
  const end = shift(shift(placement.end, cols), resizeEnd);
  if (end <= start || start < range.start || end > range.end) return null;

  return { resourceId: resourceIds[index], start, end };
};
