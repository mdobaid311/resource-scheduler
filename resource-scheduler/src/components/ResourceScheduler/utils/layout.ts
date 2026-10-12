// src/components/ResourceScheduler/utils/layout.ts
// Where things go on the grid: columns, lanes, row heights. No React, so a custom
// UI (or another framework) can draw the same grid the component draws.
import { addDays, addMinutes, isSameDay, startOfDay } from "date-fns";
import { type Resource, type SchedulerEvent, ViewType } from "../types";
import {
  getDatesInView,
  getEventSpan,
  getEventStartPosition,
  getTimeSlots,
  type SlotOptions,
  type ViewOptions,
} from "./dateUtils";
import { GROUP_ROW_HEIGHT, isGroupRow } from "./groups";

export type Density = "comfortable" | "compact";

/** Height in px of one lane of events, and of the event card inside it. */
export const LANES = {
  comfortable: { lane: 52, card: 48 },
  compact: { lane: 38, card: 34 },
} as const;

/** Space in px below the lanes of a row. */
export const ROW_PADDING = 8;

/** A row with a utilization bar is never shorter than this: the name and the bar need it. */
export const UTILIZATION_ROW_HEIGHT = 60;

/** Height in px of the row under the grid with each column's utilization. */
export const COLUMN_UTILIZATION_HEIGHT = 44;

/** An event placed on the grid of one resource's row. */
export interface EventPosition {
  event: SchedulerEvent;
  /** How many columns it covers. */
  span: number;
  /** Index of the first column it covers. */
  startPosition: number;
  /** 0 for the first line of events in the row, 1 for the line below it, and so on. */
  lane: number;
}

/**
 * Places events on the columns of a grid (see `getColumns`): where each starts,
 * how many columns it covers, and in which lane. Events are sorted by start,
 * then put in the first lane whose last event has ended, so overlapping events
 * stack and a free lane is reused. Returns a new array; `events` is not changed.
 */
export const layoutEvents = (
  events: SchedulerEvent[],
  columns: Date[],
  viewType: ViewType
): EventPosition[] => {
  const sorted = [...events]
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((event) => ({
      event,
      span: getEventSpan(event, columns, viewType),
      startPosition: getEventStartPosition(event, columns, viewType),
    }));

  // First-fit lane packing. Events are sorted by start, so a lane only
  // needs to remember where its last event ends.
  const laneEnds: number[] = [];
  return sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => item.startPosition >= end);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.startPosition + item.span;
    return { ...item, lane };
  });
};

export interface RowHeightOptions {
  /** Height of one lane of events, in px. Default 52, the comfortable density (`LANES`). */
  lane?: number;
  /** The least a row may be, in px. Default 0. */
  minRowHeight?: number;
}

/**
 * The height of a resource's row in px: one lane for each level of overlap
 * (at least one) plus the padding, never less than `minRowHeight`. A group
 * header (`withGroups`) has a fixed height.
 */
export const getRowHeight = (
  row: Resource,
  columns: Date[],
  viewType: ViewType,
  { lane = LANES.comfortable.lane, minRowHeight = 0 }: RowHeightOptions = {}
): number => {
  if (isGroupRow(row)) return GROUP_ROW_HEIGHT;
  const positions = layoutEvents(row.events, columns, viewType);
  const lanes = positions.length > 0 ? Math.max(...positions.map((pos) => pos.lane)) + 1 : 1;
  return Math.max(lanes * lane + ROW_PADDING, minRowHeight);
};

/** `getRowHeight` for every row, in order. */
export const getRowHeights = (
  rows: Resource[],
  columns: Date[],
  viewType: ViewType,
  options?: RowHeightOptions
): number[] => rows.map((row) => getRowHeight(row, columns, viewType, options));

/** The `grid-template-rows` of a grid with a header (auto) above rows of these heights. */
export const getGridTemplateRows = (heights: number[]): string =>
  `auto ${heights.map((height) => `${height}px`).join(" ")}`;

/**
 * The columns of the grid: the slots of the day in the day view, the days of
 * the period in the others. Everything else on this page counts in columns.
 */
export const getColumns = (
  currentDate: Date,
  viewType: ViewType,
  options: SlotOptions & ViewOptions = {}
): Date[] =>
  viewType === ViewType.Day
    ? getTimeSlots(currentDate, viewType, options)
    : getDatesInView(currentDate, viewType, options);

/**
 * The time one column covers (`end` exclusive): a slot of `slotMinutes` in the
 * day view, the calendar day of the column in the others.
 */
export const getColumnRange = (
  column: Date,
  viewType: ViewType,
  slotMinutes = 60
): { start: Date; end: Date } =>
  viewType === ViewType.Day
    ? { start: column, end: addMinutes(column, slotMinutes) }
    : { start: startOfDay(column), end: addDays(startOfDay(column), 1) };

/**
 * How far `date` is into `range`, as a percentage (0 at the start), for
 * drawing a "now" line. `null` when it is outside; the end is exclusive.
 */
export const getTimePosition = (
  date: Date,
  range: { start: Date; end: Date }
): number | null =>
  date >= range.start && date < range.end
    ? ((date.getTime() - range.start.getTime()) * 100) / (range.end.getTime() - range.start.getTime())
    : null;

/**
 * The first and last column (indices, both included) between two slots, in
 * whichever order they were dragged. The day view matches the exact slot; the
 * others match by calendar day. `null` when either is not one of the columns.
 */
export const getSelectedColumns = (
  columns: Date[],
  from: Date,
  to: Date,
  viewType: ViewType
): { start: number; end: number } | null => {
  const indexOf = (date: Date) =>
    columns.findIndex((column) =>
      viewType === ViewType.Day ? column.getTime() === date.getTime() : isSameDay(column, date)
    );
  const a = indexOf(from);
  const b = indexOf(to);
  if (a === -1 || b === -1) return null;
  return { start: Math.min(a, b), end: Math.max(a, b) };
};
