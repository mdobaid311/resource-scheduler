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

export interface FindSlotsOptions {
  /** The search window. `to` is exclusive: a slot must end by then. */
  from: Date;
  to: Date;
  /** Length of the slot you need, in minutes. */
  duration: number;
  /** Candidates start on multiples of this many minutes. Default 30. */
  step?: number;
  /** The shared hours; a resource's own `businessHours` wins. */
  businessHours?: BusinessHours;
  /** Stop after this many. Default: all of them. */
  limit?: number;
}

/**
 * Free slots of `duration` minutes inside the window, earliest first. A slot
 * is free when it overlaps none of the resource's events, touches no
 * unavailable time and stays inside business hours. Pass several resources
 * to find a time when all of them are free. Candidates start every `step`
 * minutes, so neighbouring results can overlap each other.
 */
export const findAvailableSlots = (
  resources: Resource | Resource[],
  { from, to, duration, step = 30, businessHours, limit = Infinity }: FindSlotsOptions
): { start: Date; end: Date }[] => {
  const found: { start: Date; end: Date }[] = [];
  if (!(duration > 0) || !(step > 0) || !(limit > 0) || from >= to) return found;

  const list = Array.isArray(resources) ? resources : [resources];
  const context = { businessHours, viewType: ViewType.Day, slotMinutes: step };
  const free = (resource: Resource, start: Date, end: Date) =>
    !resource.events.some((e) => rangesOverlap(start, end, e.startDate, e.endDate)) &&
    !touchesUnavailable(resource, { start, end }, context);

  // The first start on the step grid (counted from midnight) at or after `from`.
  const day = startOfDay(from);
  let start = addMinutes(day, Math.ceil(differenceInMinutes(from, day) / step) * step);
  if (start < from) start = addMinutes(start, step);

  for (; found.length < limit; start = addMinutes(start, step)) {
    const end = addMinutes(start, duration);
    if (end > to) break;
    if (list.every((resource) => free(resource, start, end))) found.push({ start, end });
  }
  return found;
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
