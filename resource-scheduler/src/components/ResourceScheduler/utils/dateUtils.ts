// src/components/ResourceScheduler/utils/dateUtils.ts
import {
  addDays,
  addMinutes,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  isAfter,
  isSameDay,
  max,
  min,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { SchedulerEvent, ViewType } from "../types";

/** Day view slot axis. Date-based views always use whole days. */
export interface SlotOptions {
  /** Minutes per slot. Default 60. */
  slotDuration?: number;
  /** First visible hour, 0-23. Default 0. */
  dayStartHour?: number;
  /** Hour the visible range ends (exclusive), 1-24. Default 24. */
  dayEndHour?: number;
}

/** Sanitises user options; anything invalid falls back to the defaults. */
export const resolveSlotOptions = ({
  slotDuration,
  dayStartHour,
  dayEndHour,
}: SlotOptions = {}) => {
  const slotMinutes =
    Number.isInteger(slotDuration) && slotDuration! >= 1 && slotDuration! <= 1440
      ? slotDuration!
      : 60;
  const hoursOk =
    Number.isInteger(dayStartHour) &&
    Number.isInteger(dayEndHour) &&
    dayStartHour! >= 0 &&
    dayEndHour! <= 24 &&
    dayStartHour! < dayEndHour!;
  return {
    slotMinutes,
    dayStartHour: hoursOk ? dayStartHour! : 0,
    dayEndHour: hoursOk ? dayEndHour! : 24,
  };
};

export const getTimeSlots = (
  currentDate: Date,
  viewType: ViewType,
  options?: SlotOptions
): Date[] => {
  if (viewType !== ViewType.Day) return [];
  const { slotMinutes, dayStartHour, dayEndHour } = resolveSlotOptions(options);
  const count = Math.ceil(((dayEndHour - dayStartHour) * 60) / slotMinutes);
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const d = currentDate.getDate();
  // Built from wall-clock minutes so slot labels stay stable across DST days.
  return Array.from(
    { length: count },
    (_, i) => new Date(y, m, d, 0, dayStartHour * 60 + i * slotMinutes)
  );
};

// Wall-clock minutes of `date` counted from midnight of `day` (may exceed 1440).
const wallMinutes = (date: Date, day: Date): number =>
  differenceInCalendarDays(date, day) * 1440 +
  date.getHours() * 60 +
  date.getMinutes() +
  date.getSeconds() / 60 +
  date.getMilliseconds() / 60000;

export const getDatesInView = (
  currentDate: Date,
  viewType: ViewType
): Date[] => {
  switch (viewType) {
    case ViewType.Day:
      return [currentDate];
    case ViewType.Week:
      return eachDayOfInterval({
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      });
    case ViewType.Month:
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      });
    case ViewType.Quarter:
      return eachDayOfInterval({
        start: startOfQuarter(currentDate),
        end: endOfQuarter(currentDate),
      });
    case ViewType.Year:
      return eachDayOfInterval({
        start: startOfYear(currentDate),
        end: endOfYear(currentDate),
      });
    default:
      return eachDayOfInterval({
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      });
  }
};

export const navigateDate = (
  currentDate: Date,
  viewType: ViewType,
  direction: "prev" | "next"
): Date => {
  switch (viewType) {
    case ViewType.Day:
      return addDays(currentDate, direction === "prev" ? -1 : 1);
    case ViewType.Week:
      return addWeeks(currentDate, direction === "prev" ? -1 : 1);
    case ViewType.Month:
      return addMonths(currentDate, direction === "prev" ? -1 : 1);
    case ViewType.Quarter:
      return addQuarters(currentDate, direction === "prev" ? -1 : 1);
    case ViewType.Year:
      return addYears(currentDate, direction === "prev" ? -1 : 1);
    default:
      return currentDate;
  }
};

// The last instant an event occupies. End times are exclusive, so an event
// ending exactly at midnight does not touch the next day.
const lastInstant = (event: SchedulerEvent): Date =>
  isAfter(event.endDate, event.startDate)
    ? new Date(event.endDate.getTime() - 1)
    : event.startDate;

// Day view clamps to the slots in `datesInView` (slot size and visible range
// are inferred from them), other views clamp to the first/last day.
// Returns column index and column count.
const getEventColumns = (
  event: SchedulerEvent,
  datesInView: Date[],
  viewType: ViewType
): { position: number; span: number } => {
  const first = startOfDay(datesInView[0]);

  if (viewType === ViewType.Day) {
    // ponytail: a single slot is assumed to be 60 min; only matters for odd
    // configs like one 2h slot, add a slotMinutes param if that appears.
    const slotMinutes =
      datesInView.length > 1
        ? wallMinutes(datesInView[1], first) - wallMinutes(datesInView[0], first)
        : 60;
    const rangeStart = wallMinutes(datesInView[0], first);
    const rangeEnd = rangeStart + datesInView.length * slotMinutes;
    const from = Math.max(wallMinutes(event.startDate, first), rangeStart);
    const to = Math.min(wallMinutes(lastInstant(event), first), rangeEnd - 0.001);
    const position = Math.min(
      Math.floor((from - rangeStart) / slotMinutes),
      datesInView.length - 1
    );
    const lastIndex = Math.floor((to - rangeStart) / slotMinutes);
    return { position, span: Math.max(1, lastIndex - position + 1) };
  }

  const lastDay = startOfDay(datesInView[datesInView.length - 1]);
  const startDay = max([startOfDay(event.startDate), first]);
  const endDay = min([startOfDay(lastInstant(event)), lastDay]);
  return {
    position: Math.min(
      Math.max(differenceInCalendarDays(startDay, first), 0),
      datesInView.length - 1
    ),
    span: Math.max(1, differenceInCalendarDays(endDay, startDay) + 1),
  };
};

export const getEventSpan = (
  event: SchedulerEvent,
  datesInView: Date[],
  viewType: ViewType
): number => getEventColumns(event, datesInView, viewType).span;

export const getEventStartPosition = (
  event: SchedulerEvent,
  datesInView: Date[],
  viewType: ViewType
): number => getEventColumns(event, datesInView, viewType).position;

export const getVisibleEvents = (
  events: SchedulerEvent[],
  currentDate: Date,
  viewType: ViewType,
  slotOptions?: SlotOptions
): SchedulerEvent[] => {
  if (viewType === ViewType.Day) {
    // Only the visible hours count, so events outside them are not drawn.
    const { dayStartHour, dayEndHour } = resolveSlotOptions(slotOptions);
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    const from = new Date(y, m, d, dayStartHour);
    const to = new Date(y, m, d, dayEndHour);
    return events.filter(
      (event) => event.startDate < to && lastInstant(event) >= from
    );
  }
  const dates = getDatesInView(currentDate, viewType);
  const rangeStart = startOfDay(dates[0]);
  const rangeEnd = endOfDay(dates[dates.length - 1]);
  return events.filter(
    (event) =>
      event.startDate <= rangeEnd && lastInstant(event) >= rangeStart
  );
};

// Where a dragged event lands when dropped on `slot`. Day view slots are
// hours so the slot start wins; date columns keep the event's time of day.
export const getDropRange = (
  event: SchedulerEvent,
  slot: Date,
  viewType: ViewType
): { start: Date; end: Date } => {
  const duration = event.endDate.getTime() - event.startDate.getTime();
  const start =
    viewType === ViewType.Day
      ? new Date(slot)
      : new Date(
          slot.getFullYear(),
          slot.getMonth(),
          slot.getDate(),
          event.startDate.getHours(),
          event.startDate.getMinutes(),
          event.startDate.getSeconds(),
          event.startDate.getMilliseconds()
        );
  return { start, end: new Date(start.getTime() + duration) };
};

// Range covered by a drag-selection from slot `a` to slot `b`, including the
// last slot, whichever direction the user dragged.
export const getSelectionBounds = (
  a: Date,
  b: Date,
  viewType: ViewType,
  slotMinutes = 60
): { start: Date; end: Date } => {
  const [first, last] = a <= b ? [a, b] : [b, a];
  return viewType === ViewType.Day
    ? { start: first, end: addMinutes(last, slotMinutes) }
    : { start: first, end: addDays(startOfDay(last), 1) };
};

// New range when `edge` of `event` is dragged onto `slot`; the slot under the
// pointer is always included. Day view snaps to slots; date views move whole
// days and keep the time of day (an all-day event stays midnight-aligned).
// Returns null when the edge would cross the opposite edge.
export const getResizeRange = (
  event: SchedulerEvent,
  edge: "start" | "end",
  slot: Date,
  viewType: ViewType,
  slotMinutes = 60
): { start: Date; end: Date } | null => {
  const { startDate, endDate } = event;
  const onSlotDay = (time: Date) =>
    new Date(
      slot.getFullYear(),
      slot.getMonth(),
      slot.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      time.getMilliseconds()
    );
  const endsAtMidnight = startOfDay(endDate).getTime() === endDate.getTime();

  const start =
    edge === "start"
      ? viewType === ViewType.Day
        ? slot
        : onSlotDay(startDate)
      : startDate;
  const end =
    edge === "end"
      ? viewType === ViewType.Day
        ? addMinutes(slot, slotMinutes)
        : endsAtMidnight
        ? addDays(startOfDay(slot), 1)
        : onSlotDay(endDate)
      : endDate;

  return start < end ? { start, end } : null;
};

// Whether the slot (day view) or day (other views) starting at `slot` is
// touched by `range`. Used to draw the footprint of a drag or resize.
export const isSlotInRange = (
  slot: Date,
  range: { start: Date; end: Date },
  viewType: ViewType,
  slotMinutes = 60
): boolean => {
  const slotEnd =
    viewType === ViewType.Day
      ? addMinutes(slot, slotMinutes)
      : addDays(slot, 1);
  return slot < range.end && slotEnd > range.start;
};

// Labels read out by screen readers.
export const formatSlotLabel = (slot: Date, viewType: ViewType): string =>
  format(
    slot,
    viewType === ViewType.Day ? "EEEE, MMMM d, h:mm a" : "EEEE, MMMM d, yyyy"
  );

// End times are exclusive; date views name the last day the range touches.
export const formatRangeLabel = (
  start: Date,
  end: Date,
  viewType: ViewType
): string => {
  if (viewType === ViewType.Day) {
    return isSameDay(start, end) || end.getTime() === startOfDay(end).getTime()
      ? `${format(start, "EEEE, MMMM d, h:mm a")} to ${format(end, "h:mm a")}`
      : `${format(start, "EEEE, MMMM d, h:mm a")} to ${format(
          end,
          "EEEE, MMMM d, h:mm a"
        )}`;
  }
  const lastDay = new Date(Math.max(start.getTime(), end.getTime() - 1));
  return isSameDay(start, lastDay)
    ? format(start, "EEEE, MMMM d, yyyy")
    : `${format(start, "EEEE, MMMM d")} to ${format(lastDay, "EEEE, MMMM d, yyyy")}`;
};

// "9:30 AM - 11:00 AM", or "All day" for events that start and end at midnight.
export const formatEventTime = (event: SchedulerEvent): string => {
  const atMidnight = (d: Date) => startOfDay(d).getTime() === d.getTime();
  return atMidnight(event.startDate) && atMidnight(event.endDate)
    ? "All day"
    : `${format(event.startDate, "h:mm a")} - ${format(
        event.endDate,
        "h:mm a"
      )}`;
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};
