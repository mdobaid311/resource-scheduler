// src/components/ResourceScheduler/utils/recurrence.ts
import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { Recurrence, SchedulerEvent } from "../types";
import { rangesOverlap } from "./placement";

// Stops a series with no end from looping forever on an absurd window.
const MAX_OCCURRENCES = 200_000;

// The wall-clock time of `time` on another day, so 9:00 stays 9:00 across a
// daylight saving change.
const atDay = (day: Date, time: Date) =>
  new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  );

// The days a series falls on, in order, from the first one. Months and years
// that lack the date (31 February, 29 February) are skipped, as in iCalendar.
function* occurrenceDays(first: Date, rule: Recurrence): Generator<Date> {
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const firstDay = startOfDay(first);
  const year = firstDay.getFullYear();
  const month = firstDay.getMonth();
  const date = firstDay.getDate();

  if (rule.freq === "daily") {
    for (let i = 0; ; i++) yield addDays(firstDay, i * interval);
  } else if (rule.freq === "weekly") {
    // Weeks start on Monday, as in iCalendar; days run Monday first.
    const weekdays = [...new Set(rule.byWeekday?.length ? rule.byWeekday : [firstDay.getDay()])].sort(
      (a, b) => ((a + 6) % 7) - ((b + 6) % 7)
    );
    const firstWeek = startOfWeek(firstDay, { weekStartsOn: 1 });
    for (let week = 0; ; week++) {
      for (const weekday of weekdays) {
        const day = addDays(firstWeek, week * interval * 7 + ((weekday + 6) % 7));
        if (day >= firstDay) yield day;
      }
    }
  } else if (rule.freq === "monthly") {
    for (let i = 0; ; i++) {
      const day = new Date(year, month + i * interval, date);
      if (day.getDate() === date) yield day;
    }
  } else {
    for (let i = 0; ; i++) {
      const day = new Date(year + i * interval, month, date);
      if (day.getMonth() === month) yield day;
    }
  }
}

/**
 * The occurrences of `event` that touch `from` to `to` (end exclusive). An
 * event without a `recurrence` comes back as is, or not at all when it is
 * outside the window. Each occurrence gets the id `<id>::<yyyy-MM-dd>` and a
 * `seriesId`, keeps the time of day and the length, and has no `recurrence`.
 */
export const expandRecurrence = (
  event: SchedulerEvent,
  from: Date,
  to: Date
): SchedulerEvent[] => {
  const rule = event.recurrence;
  if (!rule) {
    return rangesOverlap(event.startDate, event.endDate, from, to) ? [event] : [];
  }

  const spanDays = differenceInCalendarDays(event.endDate, event.startDate);
  const lastDay = rule.until ? startOfDay(rule.until) : null;
  const found: SchedulerEvent[] = [];
  let generated = 0;

  for (const day of occurrenceDays(event.startDate, rule)) {
    if (lastDay && day > lastDay) break;
    if (rule.count !== undefined && generated >= rule.count) break;
    if (++generated > MAX_OCCURRENCES) break;

    const start = atDay(day, event.startDate);
    if (start >= to) break; // later ones start even later
    if (rule.exceptions?.some((skipped) => isSameDay(skipped, day))) continue;
    const end = atDay(addDays(day, spanDays), event.endDate);
    if (!rangesOverlap(start, end, from, to)) continue;

    found.push({
      ...event,
      id: `${event.id}::${format(day, "yyyy-MM-dd")}`,
      startDate: start,
      endDate: end,
      recurrence: undefined,
      seriesId: event.id,
    });
  }
  return found;
};

/**
 * Expands the recurring events in a list and passes the others through as
 * they are, without filtering them by the window. Returns `events` itself
 * when nothing recurs.
 */
export const expandEvents = (
  events: SchedulerEvent[],
  from: Date,
  to: Date
): SchedulerEvent[] =>
  events.some((e) => e.recurrence)
    ? events.flatMap((e) => (e.recurrence ? expandRecurrence(e, from, to) : [e]))
    : events;

// The day of `occurrence` in the series and how many occurrences come before
// it (exceptions count). Throws when it is not an occurrence of the event.
const locate = (event: SchedulerEvent, occurrence: Date) => {
  const rule = event.recurrence;
  if (!rule) throw new RangeError("The event does not recur");
  const target = startOfDay(occurrence);
  const lastDay = rule.until ? startOfDay(rule.until) : null;
  let before = 0;
  for (const day of occurrenceDays(event.startDate, rule)) {
    if (day > target || (lastDay && day > lastDay)) break;
    if (rule.count !== undefined && before >= rule.count) break;
    if (isSameDay(day, target)) {
      if (rule.exceptions?.some((skipped) => isSameDay(skipped, day))) break;
      return { rule, day, before };
    }
    if (++before > MAX_OCCURRENCES) break;
  }
  throw new RangeError("The date is not an occurrence of the event");
};

// What `edits` leave of the occurrence on `day`: the same time of day and length.
const occurrenceOn = (event: SchedulerEvent, day: Date, edits: Partial<SchedulerEvent>) => ({
  startDate: atDay(day, event.startDate),
  endDate: atDay(addDays(day, differenceInCalendarDays(event.endDate, event.startDate)), event.endDate),
  ...edits,
});

const isoDay = (day: Date) => format(day, "yyyy-MM-dd");

/**
 * "Edit this and following": splits a recurring `event` at `occurrence` (any
 * time on that day; it must be an occurrence). `before` is the original
 * series ended the day before through `until` (its `count` is dropped), or
 * `null` when `occurrence` is the first one and nothing is left of it, so
 * remove the original. `after` is a new series that starts at the occurrence
 * with `edits` applied. It gets the id `<id>::from-<yyyy-MM-dd>` (or
 * `edits.id`), the rest of the `count`, and the exceptions from the split on.
 * Pass `edits.recurrence` to change the rule too, and both dates to move it.
 */
export const splitRecurrence = (
  event: SchedulerEvent,
  occurrence: Date,
  edits: Partial<SchedulerEvent> = {}
): { before: SchedulerEvent | null; after: SchedulerEvent } => {
  const { rule, day, before } = locate(event, occurrence);
  const { count, exceptions, ...kept } = rule;
  const later = exceptions?.filter((skipped) => startOfDay(skipped) >= day);
  const earlier = exceptions?.filter((skipped) => startOfDay(skipped) < day);
  return {
    before: before
      ? {
          ...event,
          recurrence: {
            ...kept,
            until: addDays(day, -1),
            ...(earlier?.length ? { exceptions: earlier } : {}),
          },
        }
      : null,
    after: {
      ...event,
      ...occurrenceOn(event, day, edits),
      id: edits.id ?? `${event.id}::from-${isoDay(day)}`,
      recurrence: edits.recurrence ?? {
        ...kept,
        ...(count !== undefined ? { count: count - before } : {}),
        ...(later?.length ? { exceptions: later } : {}),
      },
    },
  };
};

/**
 * "Edit this occurrence only": `series` is the event with `occurrence` added
 * to its exceptions, and `changed` is a one-off event for that day with
 * `edits` applied. It gets the id `<id>::edit-<yyyy-MM-dd>` (or `edits.id`)
 * and a `seriesId`. The occurrence must exist, as for `splitRecurrence`.
 */
export const editOccurrence = (
  event: SchedulerEvent,
  occurrence: Date,
  edits: Partial<SchedulerEvent> = {}
): { series: SchedulerEvent; changed: SchedulerEvent } => {
  const { rule, day } = locate(event, occurrence);
  return {
    series: { ...event, recurrence: { ...rule, exceptions: [...(rule.exceptions ?? []), day] } },
    changed: {
      ...event,
      ...occurrenceOn(event, day, edits),
      id: edits.id ?? `${event.id}::edit-${isoDay(day)}`,
      recurrence: edits.recurrence,
      seriesId: event.id,
    },
  };
};
