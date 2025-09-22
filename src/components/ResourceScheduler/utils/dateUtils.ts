// src/components/ResourceScheduler/utils/dateUtils.ts
import { ViewType } from "@/types/scheduler.enum";
import { Event } from "@/types/scheduler.type";
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";

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

export const getEventSpan = (
  event: Event,
  datesInView: Date[],
  viewType: ViewType
): number => {
  if (viewType === ViewType.Day) {
    return Math.max(
      1,
      Math.min(differenceInHours(event.endDate, event.startDate), 24)
    );
  } else {
    const viewStart = datesInView[0];
    const viewEnd = datesInView[datesInView.length - 1];

    const effectiveStart = isBefore(event.startDate, viewStart)
      ? viewStart
      : event.startDate;

    const effectiveEnd = isAfter(event.endDate, viewEnd)
      ? viewEnd
      : event.endDate;

    return Math.max(1, differenceInDays(effectiveEnd, effectiveStart) + 1);
  }
};

export const getEventStartPosition = (
  event: Event,
  datesInView: Date[],
  viewType: ViewType
): number => {
  if (viewType === ViewType.Day) {
    return event.startDate.getHours();
  } else {
    const startIdx = datesInView.findIndex(
      (d) =>
        isSameDay(d, event.startDate) ||
        (isBefore(event.startDate, d) && isAfter(event.endDate, d))
    );

    return isBefore(event.startDate, datesInView[0]) ? 0 : startIdx;
  }
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};
