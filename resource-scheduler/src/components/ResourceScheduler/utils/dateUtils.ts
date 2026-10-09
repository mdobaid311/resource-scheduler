// src/components/ResourceScheduler/utils/dateUtils.ts
import {
  addDays,
  addHours,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachHourOfInterval,
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
  startOfHour,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { SchedulerEvent, ViewType } from "../types";

export const getTimeSlots = (currentDate: Date, viewType: ViewType): Date[] => {
  if (viewType !== ViewType.Day) return [];
  return eachHourOfInterval({
    start: startOfDay(currentDate),
    end: endOfDay(currentDate),
  });
};

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

// Day view clamps to the day of `datesInView[0]` (hourly slots), other views
// clamp to the first/last day. Returns column index and column count.
const getEventColumns = (
  event: SchedulerEvent,
  datesInView: Date[],
  viewType: ViewType
): { position: number; span: number } => {
  const first = startOfDay(datesInView[0]);

  if (viewType === ViewType.Day) {
    const start = max([event.startDate, first]);
    const last = min([lastInstant(event), endOfDay(first)]);
    const position = start.getHours();
    return { position, span: Math.max(1, last.getHours() - position + 1) };
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
  viewType: ViewType
): SchedulerEvent[] => {
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
  viewType: ViewType
): { start: Date; end: Date } => {
  const [first, last] = a <= b ? [a, b] : [b, a];
  return viewType === ViewType.Day
    ? { start: first, end: addHours(startOfHour(last), 1) }
    : { start: first, end: addDays(startOfDay(last), 1) };
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
