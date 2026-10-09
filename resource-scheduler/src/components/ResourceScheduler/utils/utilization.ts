// src/components/ResourceScheduler/utils/utilization.ts
import { addDays, setHours, startOfDay } from "date-fns";
import type { BusinessHours, Resource, VisibleRange } from "../types";
import { resolveBusinessHours } from "./availability";
import { expandEvents } from "./recurrence";

export interface Utilization {
  /** Minutes of events inside the available time. Overlapping events add up. */
  bookedMinutes: number;
  /** Minutes the resource can take bookings: open time minus `unavailable`, times `capacity`. */
  availableMinutes: number;
  /** `bookedMinutes / availableMinutes`: 0.5 is 50%, above 1 is overbooked. `null` when nothing is available. */
  ratio: number | null;
}

const MINUTE = 60_000;

// How much of [a, b] falls inside [from, to].
const overlap = (a: number, b: number, from: number, to: number) =>
  Math.max(0, Math.min(b, to) - Math.max(a, from));

/**
 * How much of a resource's available time is booked within `range` (`end`
 * exclusive). Available time is the working time (the resource's own
 * `businessHours`, else the ones passed in, else every hour) minus its
 * `unavailable` ranges, times `capacity` (default 1). Booked time is the part
 * of the events (recurring ones expanded) that falls inside the available
 * time, so nights and time off count on neither side. Events that overlap
 * each other add up, so a resource with more bookings at once than its
 * capacity goes over 100%.
 */
export const getUtilization = (
  resource: Resource,
  { start, end }: VisibleRange,
  { businessHours }: { businessHours?: BusinessHours } = {}
): Utilization => {
  const from = start.getTime();
  const to = end.getTime();
  const hours =
    resource.businessHours === undefined ? businessHours : resource.businessHours || undefined;
  const open = hours && resolveBusinessHours(hours);

  // Time off sorted and merged, so overlapping ranges are cut out once.
  const off = (resource.unavailable ?? [])
    .map((range): [number, number] => [range.start.getTime(), range.end.getTime()])
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((merged, [a, b]) => {
      const last = merged[merged.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
      return merged;
    }, []);

  // When the resource can be booked: working hours minus time off, as sorted spans.
  const spans: [number, number][] = [];
  let available = 0;
  for (let day = startOfDay(start); day.getTime() < to; day = addDays(day, 1)) {
    if (open && !open.daysOfWeek.includes(day.getDay())) continue;
    let a = Math.max(from, (open ? setHours(day, open.startHour) : day).getTime());
    const b = Math.min(to, (open ? setHours(day, open.endHour) : addDays(day, 1)).getTime());
    for (const [x, y] of off) {
      if (y <= a || x >= b) continue;
      if (x > a) spans.push([a, x]);
      a = Math.max(a, y);
    }
    if (a < b) spans.push([a, b]);
  }
  for (const [a, b] of spans) available += b - a;

  let booked = 0;
  for (const { startDate, endDate } of expandEvents(resource.events, start, end)) {
    const a = startDate.getTime();
    const b = endDate.getTime();
    // Binary search for the first span that ends after the event starts.
    let i = 0;
    for (let hi = spans.length; i < hi; ) {
      const mid = (i + hi) >> 1;
      if (spans[mid][1] <= a) i = mid + 1;
      else hi = mid;
    }
    for (; i < spans.length && spans[i][0] < b; i++) {
      booked += overlap(a, b, spans[i][0], spans[i][1]);
    }
  }

  const availableMinutes = (available * Math.max(0, resource.capacity ?? 1)) / MINUTE;
  const bookedMinutes = booked / MINUTE;
  return {
    bookedMinutes,
    availableMinutes,
    ratio: availableMinutes > 0 ? bookedMinutes / availableMinutes : null,
  };
};
