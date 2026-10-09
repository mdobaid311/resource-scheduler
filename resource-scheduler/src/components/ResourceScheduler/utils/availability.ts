// src/components/ResourceScheduler/utils/availability.ts
import { addDays, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { type BusinessHours, type Resource, ViewType } from "../types";
import { rangesOverlap } from "./placement";

export const resolveBusinessHours = ({
  daysOfWeek = [1, 2, 3, 4, 5],
  startHour = 9,
  endHour = 17,
}: BusinessHours = {}) => ({ daysOfWeek, startHour, endHour });

export interface AvailabilityContext {
  /** The grid-wide default; a resource's own `businessHours` wins. */
  businessHours?: BusinessHours;
  viewType: ViewType;
  /** Day view slot length. Default 60. */
  slotMinutes?: number;
}

type Availability = Pick<Resource, "businessHours" | "unavailable">;

/**
 * Whether the cell starting at `cell` is shaded for this resource: a slot in
 * the day view, a whole day in the other views. The hours only apply to the
 * day view; date views check the working days and unavailable ranges that
 * cover the whole day.
 */
export const isCellUnavailable = (
  resource: Availability,
  cell: Date,
  { businessHours, viewType, slotMinutes = 60 }: AvailabilityContext
): boolean => {
  const hours =
    resource.businessHours === undefined
      ? businessHours
      : resource.businessHours || undefined;
  const isDay = viewType === ViewType.Day;

  if (hours) {
    const { daysOfWeek, startHour, endHour } = resolveBusinessHours(hours);
    if (!daysOfWeek.includes(cell.getDay())) return true;
    if (isDay) {
      const minutes = cell.getHours() * 60 + cell.getMinutes();
      if (minutes < startHour * 60 || minutes >= endHour * 60) return true;
    }
  }

  const from = isDay ? cell : startOfDay(cell);
  const to = isDay ? addMinutes(cell, slotMinutes) : addDays(from, 1);
  return (resource.unavailable ?? []).some((range) =>
    isDay
      ? rangesOverlap(from, to, range.start, range.end)
      : range.start <= from && range.end >= to
  );
};

/** Whether placing an event on `range` would touch a shaded cell. */
export const touchesUnavailable = (
  resource: Availability,
  { start, end }: { start: Date; end: Date },
  context: AvailabilityContext
): boolean => {
  const isDay = context.viewType === ViewType.Day;
  const step = context.slotMinutes ?? 60;
  const day = startOfDay(start);
  let cell = isDay
    ? addMinutes(day, Math.floor(differenceInMinutes(start, day) / step) * step)
    : day;
  // do/while: a zero-length range still occupies the cell it is in.
  do {
    if (isCellUnavailable(resource, cell, context)) return true;
    cell = isDay ? addMinutes(cell, step) : addDays(cell, 1);
  } while (cell < end);
  return false;
};
