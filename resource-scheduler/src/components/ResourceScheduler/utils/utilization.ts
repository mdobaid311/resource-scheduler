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
 * When `resource` can be booked between `from` and `to` (ms): its working
 * time (its own `businessHours`, else the shared ones, else every hour) minus
 * its `unavailable` ranges, as sorted spans that do not touch.
 */
const availableSpans = (resource: Resource, from: number, to: number, shared?: BusinessHours) => {
  const hours = resource.businessHours === undefined ? shared : resource.businessHours || undefined;
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

  const spans: [number, number][] = [];
  for (let day = startOfDay(new Date(from)); day.getTime() < to; day = addDays(day, 1)) {
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
  return spans;
};

// Calls `add(i, ms)` with how much of [a, b] falls inside each column it touches.
// `columns` are sorted and do not overlap.
const spread = (a: number, b: number, columns: [number, number][], add: (i: number, ms: number) => void) => {
  // Binary search for the first column that ends after a.
  let i = 0;
  for (let hi = columns.length; i < hi; ) {
    const mid = (i + hi) >> 1;
    if (columns[mid][1] <= a) i = mid + 1;
    else hi = mid;
  }
  for (; i < columns.length && columns[i][0] < b; i++) add(i, overlap(a, b, columns[i][0], columns[i][1]));
};

/**
 * Utilization of all `resources` together, one entry per column. A column is a
 * range (`end` exclusive); columns must be in order and not overlap, but need
 * not touch. Each resource counts as in `getUtilization`: available time is the
 * working time (its own `businessHours`, else the ones passed in, else every
 * hour) minus its `unavailable` ranges, times its `capacity`; booked time is
 * the part of its events (recurring ones expanded) inside the available time,
 * and overlapping events add up. `ratio` is `null` for a column where nothing
 * is available.
 */
export const columnUtilization = (
  resources: Resource[],
  columns: VisibleRange[],
  { businessHours }: { businessHours?: BusinessHours } = {}
): Utilization[] => {
  if (!columns.length) return [];
  const cells = columns.map(({ start, end }): [number, number] => [start.getTime(), end.getTime()]);
  const from = cells[0][0];
  const to = cells[cells.length - 1][1];
  const booked = cells.map(() => 0);
  const available = cells.map(() => 0);

  for (const resource of resources) {
    const spans = availableSpans(resource, from, to, businessHours);

    const open = cells.map(() => 0);
    for (const [a, b] of spans) spread(a, b, cells, (i, ms) => (open[i] += ms));
    const capacity = Math.max(0, resource.capacity ?? 1);
    open.forEach((ms, i) => (available[i] += ms * capacity));

    for (const { startDate, endDate } of expandEvents(resource.events, columns[0].start, columns[columns.length - 1].end)) {
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
        spread(Math.max(a, spans[i][0]), Math.min(b, spans[i][1]), cells, (c, ms) => (booked[c] += ms));
      }
    }
  }

  return cells.map((_, i) => {
    const availableMinutes = available[i] / MINUTE;
    const bookedMinutes = booked[i] / MINUTE;
    return { bookedMinutes, availableMinutes, ratio: availableMinutes > 0 ? bookedMinutes / availableMinutes : null };
  });
};

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
  range: VisibleRange,
  options: { businessHours?: BusinessHours } = {}
): Utilization => columnUtilization([resource], [range], options)[0];
