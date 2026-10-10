// src/components/ResourceScheduler/utils/exportEvents.ts
import { endOfDay, format, startOfDay } from "date-fns";
import type { Recurrence, ResourceInput, SchedulerEvent } from "../types";

export interface ExportOptions {
  /** Your resources, to turn an event's `resourceId` into a name. */
  resources?: ResourceInput[];
}

const idsOf = (event: SchedulerEvent) =>
  [...new Set([event.resourceId, ...(event.resourceIds ?? [])])].filter(
    (id): id is string => id !== undefined
  );

const nameOf = (id: string, resources?: ResourceInput[]) =>
  resources?.find((r) => r.id === id)?.name ?? id;

// --- iCalendar (RFC 5545) -----------------------------------------------------

const encoder = new TextEncoder();
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
const dateOnly = (d: Date) => format(d, "yyyyMMdd");
const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");

// Lines are at most 75 bytes; a longer one continues on the next line after a space.
const fold = (line: string) => {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > 75) {
      out.push(current);
      current = " ";
      bytes = 1;
    }
    current += ch;
    bytes += n;
  }
  out.push(current);
  return out.join("\r\n");
};

// Whole local days, which iCalendar writes as dates rather than moments.
const isAllDay = (e: SchedulerEvent) =>
  e.endDate > e.startDate &&
  startOfDay(e.startDate).getTime() === e.startDate.getTime() &&
  startOfDay(e.endDate).getTime() === e.endDate.getTime();

const rrule = (r: Recurrence, allDay: boolean) => {
  const parts = [`FREQ=${r.freq.toUpperCase()}`];
  if (r.interval && r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.freq === "weekly" && r.byWeekday?.length) parts.push(`BYDAY=${r.byWeekday.map((d) => DAYS[d]).join(",")}`);
  if (r.until) parts.push(`UNTIL=${allDay ? dateOnly(r.until) : stamp(endOfDay(r.until))}`);
  if (r.count !== undefined) parts.push(`COUNT=${r.count}`);
  return `RRULE:${parts.join(";")}`;
};

/**
 * The events as an iCalendar file (`.ics`) that Google Calendar, Outlook and
 * Apple Calendar import. Timed events are written in UTC, whole local days as
 * all-day events, and a `recurrence` as `RRULE` with its `exceptions` as
 * `EXDATE`. Pass `resources` to write each event's resource name as its
 * `LOCATION` (right for rooms; for people leave it out).
 */
export const eventsToICS = (
  events: SchedulerEvent[],
  { resources, now = new Date(), name }: ExportOptions & { now?: Date; name?: string } = {}
): string => {
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//resource-scheduler//EN", "CALSCALE:GREGORIAN"];
  if (name) out.push(`X-WR-CALNAME:${escapeText(name)}`);

  for (const e of events) {
    const allDay = isAllDay(e);
    const place = idsOf(e).map((id) => escapeText(nameOf(id, resources)));
    out.push(
      "BEGIN:VEVENT",
      `UID:${e.id.replace(/[\r\n]+/g, " ")}@resource-scheduler`,
      `DTSTAMP:${stamp(now)}`,
      allDay ? `DTSTART;VALUE=DATE:${dateOnly(e.startDate)}` : `DTSTART:${stamp(e.startDate)}`,
      allDay ? `DTEND;VALUE=DATE:${dateOnly(e.endDate)}` : `DTEND:${stamp(e.endDate)}`,
      `SUMMARY:${escapeText(e.title)}`
    );
    if (e.description) out.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (resources && place.length) out.push(`LOCATION:${place.join("\\, ")}`);
    if (e.recurrence) {
      out.push(rrule(e.recurrence, allDay));
      const skipped = e.recurrence.exceptions ?? [];
      if (skipped.length) {
        // Each exception is the occurrence's start on that day.
        const at = (d: Date) =>
          new Date(d.getFullYear(), d.getMonth(), d.getDate(), e.startDate.getHours(), e.startDate.getMinutes(), e.startDate.getSeconds());
        out.push(
          allDay
            ? `EXDATE;VALUE=DATE:${skipped.map(dateOnly).join(",")}`
            : `EXDATE:${skipped.map((d) => stamp(at(d))).join(",")}`
        );
      }
    }
    out.push("END:VEVENT");
  }

  out.push("END:VCALENDAR");
  return out.map(fold).join("\r\n") + "\r\n";
};

// --- CSV (RFC 4180) -----------------------------------------------------------

// A cell a spreadsheet would run as a formula gets a leading quote, so a hostile
// event title cannot do anything when someone opens the export.
const cell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * The events as CSV for a spreadsheet: `id,title,resource,start,end,description`
 * with local dates (`2026-10-07 09:00`), one row per resource of an event. A
 * recurring event is one row (its first occurrence): expand it first with
 * `expandEvents` for a row per occurrence. Cells that start with `=`, `+`, `-`
 * or `@` are prefixed with a quote so they are not run as formulas.
 */
export const eventsToCSV = (events: SchedulerEvent[], { resources }: ExportOptions = {}): string => {
  const when = (d: Date) => format(d, "yyyy-MM-dd HH:mm");
  const rows = [["id", "title", "resource", "start", "end", "description"]];
  for (const e of events) {
    const ids = idsOf(e);
    for (const id of ids.length ? ids : [undefined]) {
      rows.push([
        e.id,
        e.title,
        id === undefined ? "" : nameOf(id, resources),
        when(e.startDate),
        when(e.endDate),
        e.description ?? "",
      ]);
    }
  }
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
};
