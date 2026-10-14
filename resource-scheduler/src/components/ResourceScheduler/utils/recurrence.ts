// src/components/ResourceScheduler/utils/recurrence.ts
import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { Recurrence, SchedulerEvent } from "../types";
import { rangesOverlap } from "./placement";

// Stops a series with no end from looping forever on an absurd window.
const MAX_OCCURRENCES = 200_000;
// Gives up on a monthly or yearly rule that never matches, such as 31 February.
const MAX_PERIODS = 100_000;
const HOUR = 3_600_000;

const isHourly = (rule: Recurrence) => rule.freq === "hourly";

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

// The clock reading of a Date as milliseconds in UTC, which a clock change of
// the machine cannot move, and back to a Date with that reading.
const toWall = (d: Date) =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
const fromWall = (ms: number) => {
  const u = new Date(ms);
  return new Date(
    u.getUTCFullYear(),
    u.getUTCMonth(),
    u.getUTCDate(),
    u.getUTCHours(),
    u.getUTCMinutes(),
    u.getUTCSeconds(),
    u.getUTCMilliseconds()
  );
};

// The days of one month that a monthly or yearly rule picks, in order:
// `byMonthDay` and `byWeekday` narrow the month, then `bySetPos` picks from what is left.
// With neither, it is the day of the month the series starts on (none when the month is shorter).
const monthDays = (year: number, month: number, rule: Recurrence, date: number): number[] => {
  const length = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const dates = rule.byMonthDay?.length ? rule.byMonthDay.map((d) => (d < 0 ? length + 1 + d : d)) : null;
  const weekdays = rule.byWeekday?.length ? rule.byWeekday : null;

  const days: number[] = [];
  if (!dates && !weekdays) {
    if (date <= length) days.push(date);
  } else {
    for (let d = 1; d <= length; d++) {
      if (dates && !dates.includes(d)) continue;
      if (weekdays && !weekdays.includes((firstWeekday + d - 1) % 7)) continue;
      days.push(d);
    }
  }
  if (!rule.bySetPos?.length) return days;
  const picked = rule.bySetPos.map((p) => (p > 0 ? p - 1 : days.length + p));
  return [...new Set(picked)]
    .filter((i) => i >= 0 && i < days.length)
    .sort((a, b) => a - b)
    .map((i) => days[i]);
};

// The occurrences of a series, in order, from the first one: the days for daily
// to yearly (months and years that lack the date, such as 31 February or
// 29 February, are skipped, as in iCalendar), the starting instants for hourly.
// `skipTo` lets an hourly series jump close to a window instead of counting up to it.
function* occurrenceDays(first: Date, rule: Recurrence, skipTo?: Date): Generator<Date> {
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const firstDay = startOfDay(first);
  const year = firstDay.getFullYear();
  const month = firstDay.getMonth();
  const date = firstDay.getDate();

  if (rule.freq === "hourly") {
    // Steps of the clock, like every other frequency: "every 4 hours" from 08:00
    // is 08:00, 12:00, 16:00 on every day, also on a day the clocks change (the
    // scheduler works on wall-clock Dates, so this is the clock of its time zone).
    // A reading the machine's clock skips (02:30 when the clocks go forward) is
    // not an occurrence, as in iCalendar, and is not counted.
    const step = interval * HOUR;
    const w0 = toWall(first);
    for (let i = skipTo ? Math.max(0, Math.floor((toWall(skipTo) - w0) / step)) : 0; ; i++) {
      const day = fromWall(w0 + i * step);
      if (toWall(day) === w0 + i * step) yield day;
    }
  } else if (rule.freq === "daily") {
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
  } else {
    // Monthly and yearly differ only in how the month is reached.
    for (let i = 0; i < MAX_PERIODS; i++) {
      const period =
        rule.freq === "monthly" ? new Date(year, month + i * interval, 1) : new Date(year + i * interval, month, 1);
      for (const d of monthDays(period.getFullYear(), period.getMonth(), rule, date)) {
        const day = new Date(period.getFullYear(), period.getMonth(), d);
        if (day >= firstDay) yield day;
      }
    }
  }
}

// An occurrence is a day, or for an hourly series an instant.
const startAt = (event: SchedulerEvent, rule: Recurrence, day: Date) =>
  isHourly(rule) ? day : atDay(day, event.startDate);

const endAt = (event: SchedulerEvent, rule: Recurrence, day: Date) =>
  isHourly(rule)
    ? fromWall(toWall(day) + (toWall(event.endDate) - toWall(event.startDate)))
    : atDay(addDays(day, differenceInCalendarDays(event.endDate, event.startDate)), event.endDate);

const isSkipped = (rule: Recurrence, day: Date) =>
  rule.exceptions?.some((skipped) => (isHourly(rule) ? skipped.getTime() === day.getTime() : isSameDay(skipped, day))) ??
  false;

const pastUntil = (rule: Recurrence, day: Date) =>
  rule.until !== undefined && day > (isHourly(rule) ? rule.until : startOfDay(rule.until));

// `exception` is before the occurrence `day`, by day (by instant for hourly).
const isBefore = (rule: Recurrence, exception: Date, day: Date) =>
  (isHourly(rule) ? exception : startOfDay(exception)) < day;

const idPart = (rule: Recurrence, day: Date) =>
  format(day, isHourly(rule) ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd");

/**
 * The occurrences of `event` that touch `from` to `to` (end exclusive). An
 * event without a `recurrence` comes back as is, or not at all when it is
 * outside the window. Each occurrence gets the id `<id>::<yyyy-MM-dd>` (hourly:
 * `<id>::<yyyy-MM-dd>T<HH:mm>`) and a `seriesId`, keeps the time of
 * day and the length, and has no `recurrence`.
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

  const found: SchedulerEvent[] = [];
  let generated = 0;
  // Without a count nothing depends on the occurrences before the window.
  const skipTo =
    isHourly(rule) && rule.count === undefined
      ? fromWall(toWall(from) - (toWall(event.endDate) - toWall(event.startDate)))
      : undefined;

  for (const day of occurrenceDays(event.startDate, rule, skipTo)) {
    if (pastUntil(rule, day)) break;
    if (rule.count !== undefined && generated >= rule.count) break;
    if (++generated > MAX_OCCURRENCES) break;

    const start = startAt(event, rule, day);
    if (start >= to) break; // later ones start even later
    if (isSkipped(rule, day)) continue;
    const end = endAt(event, rule, day);
    if (!rangesOverlap(start, end, from, to)) continue;

    found.push({
      ...event,
      id: `${event.id}::${idPart(rule, day)}`,
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

// The occurrence at `occurrence` (its day; for hourly its start) in the series
// and how many occurrences come before it (exceptions count). Throws when it is
// not an occurrence of the event.
const locate = (event: SchedulerEvent, occurrence: Date) => {
  const rule = event.recurrence;
  if (!rule) throw new RangeError("The event does not recur");
  const hourly = isHourly(rule);
  const target = hourly ? occurrence : startOfDay(occurrence);
  let before = 0;
  for (const day of occurrenceDays(event.startDate, rule)) {
    if (day > target || pastUntil(rule, day)) break;
    if (rule.count !== undefined && before >= rule.count) break;
    if (hourly ? day.getTime() === target.getTime() : isSameDay(day, target)) {
      if (isSkipped(rule, day)) break;
      return { rule, day, before };
    }
    if (++before > MAX_OCCURRENCES) break;
  }
  throw new RangeError("The date is not an occurrence of the event");
};

// What `edits` leave of the occurrence on `day`: the same time of day and length.
const occurrenceOn = (event: SchedulerEvent, rule: Recurrence, day: Date, edits: Partial<SchedulerEvent>) => ({
  startDate: startAt(event, rule, day),
  endDate: endAt(event, rule, day),
  ...edits,
});

/**
 * "Edit this and following": splits a recurring `event` at `occurrence` (any
 * time on that day; for an hourly series its exact start). It must be an
 * occurrence. `before` is the original series ended before it through `until`
 * (its `count` is dropped), or `null` when `occurrence` is the first one and
 * nothing is left of it, so remove the original. `after` is a new series that
 * starts at the occurrence with `edits` applied. It gets the id
 * `<id>::from-<yyyy-MM-dd>` (or `edits.id`), the rest of the `count`, and the
 * exceptions from the split on. Pass `edits.recurrence` to change the rule
 * too, and both dates to move it.
 */
export const splitRecurrence = (
  event: SchedulerEvent,
  occurrence: Date,
  edits: Partial<SchedulerEvent> = {}
): { before: SchedulerEvent | null; after: SchedulerEvent } => {
  const { rule, day, before } = locate(event, occurrence);
  const { count, exceptions, ...kept } = rule;
  const later = exceptions?.filter((skipped) => !isBefore(rule, skipped, day));
  const earlier = exceptions?.filter((skipped) => isBefore(rule, skipped, day));
  return {
    before: before
      ? {
          ...event,
          recurrence: {
            ...kept,
            until: isHourly(rule) ? new Date(day.getTime() - 1) : addDays(day, -1),
            ...(earlier?.length ? { exceptions: earlier } : {}),
          },
        }
      : null,
    after: {
      ...event,
      ...occurrenceOn(event, rule, day, edits),
      id: edits.id ?? `${event.id}::from-${idPart(rule, day)}`,
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
      ...occurrenceOn(event, rule, day, edits),
      id: edits.id ?? `${event.id}::edit-${idPart(rule, day)}`,
      recurrence: edits.recurrence,
      seriesId: event.id,
    },
  };
};
