// src/components/ResourceScheduler/utils/importEvents.ts
import { format, startOfDay } from "date-fns";
import type { ResourceInput, SchedulerEvent } from "../types";
import { parseRRule } from "./rrule";
import { wallToInstant } from "./timeZone";

export interface ImportOptions {
  /**
   * Your resources. An event whose `LOCATION` is the name of a resource (or a
   * list of names) is given that resource, as `eventsToICS` writes it.
   */
  resources?: ResourceInput[];
  /**
   * The resource for events whose location matches none, for example the row
   * of the person whose calendar this is. Events without a resource are not
   * drawn.
   */
  resourceId?: string;
  /** Called, once per message, for each thing that could not be read exactly. */
  onWarning?: (message: string) => void;
}

type Warn = (message: string) => void;
interface Line {
  name: string;
  params: Record<string, string>;
  value: string;
}

// --- Lines ----------------------------------------------------------------------

const splitOutsideQuotes = (text: string, separator: string) => {
  const parts: string[] = [];
  let quoted = false;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    else if (text[i] === separator && !quoted) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts;
};

// `NAME;PARAM=value;PARAM="quoted: value":content`
const parseLine = (raw: string): Line | undefined => {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < raw.length && colon < 0; i++) {
    if (raw[i] === '"') quoted = !quoted;
    else if (raw[i] === ":" && !quoted) colon = i;
  }
  if (colon < 1) return undefined;
  const [name, ...rest] = splitOutsideQuotes(raw.slice(0, colon), ";");
  const params: Record<string, string> = {};
  for (const param of rest) {
    const eq = param.indexOf("=");
    if (eq > 0) params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: raw.slice(colon + 1) };
};

const unescapeText = (text: string) =>
  text.replace(/\\([\\;,nN])/g, (_, char: string) => (char === "n" || char === "N" ? "\n" : char));

// The properties of each VEVENT. Anything nested in one (an alarm) and anything
// outside one (time zone definitions, tasks) is left out.
const readEvents = (text: string) => {
  const events: Line[][] = [];
  let current: Line[] | undefined;
  let depth = 0;
  // A line that starts with a space or tab continues the one before it.
  for (const raw of text.replace(/^\uFEFF/, "").replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "").split("\n")) {
    const line = parseLine(raw);
    if (!line) continue;
    const kind = line.value.trim().toUpperCase();
    if (!current) {
      if (line.name === "BEGIN" && kind === "VEVENT") {
        current = [];
        depth = 0;
      }
    } else if (line.name === "BEGIN") depth++;
    else if (line.name === "END") {
      if (depth > 0) depth--;
      else if (kind === "VEVENT") {
        events.push(current);
        current = undefined;
      }
    } else if (depth === 0) current.push(line);
  }
  return events;
};

// --- Dates ----------------------------------------------------------------------

const DATE_VALUE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/i;

// A date (`20261007`) is a whole local day. A date-time is UTC with a `Z`, in the
// zone named by `TZID`, or else floating: the same wall-clock time wherever it is read.
const parseDate = (value: string, params: Record<string, string>, warn: Warn) => {
  const match = DATE_VALUE.exec(value.trim());
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = [match[1], match[2], match[3], match[4] ?? "0", match[5] ?? "0", match[6] ?? "0"].map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return undefined;
  }

  if (match[4] === undefined) return { date: new Date(year, month - 1, day), allDay: true };
  if (match[7]) return { date: check, allDay: false };

  const timeZone = params.TZID;
  if (timeZone) {
    const instant = wallToInstant(wall, timeZone);
    if (instant !== undefined) return { date: new Date(instant), allDay: false };
    warn(`Unknown time zone "${timeZone}": its times were read as local time.`);
  }
  return { date: new Date(year, month - 1, day, hour, minute, second), allDay: false };
};

const addDuration = (start: Date, allDay: boolean, value: string) => {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value.trim());
  if (!match) return undefined;
  const [weeks, days, hours, minutes, seconds] = match.slice(1).map((n) => Number(n ?? 0));
  const day = weeks * 7 + days;
  if (allDay && !hours && !minutes && !seconds) {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
  }
  return new Date(start.getTime() + (((day * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000);
};

// --- Events ---------------------------------------------------------------------

/**
 * Reads the events of an iCalendar file (`.ics`, as exported by Google Calendar,
 * Outlook, Apple Calendar or `eventsToICS`) into scheduler events.
 *
 * - Times in UTC, in a `TZID` zone (IANA names, such as `Europe/Paris`) or
 *   floating become moments; dates become whole local days. A zone that is not
 *   an IANA name (Outlook's "Eastern Standard Time") is read as local time.
 * - An event without an end lasts an hour, or a day when it has a date only.
 * - `RRULE` and `EXDATE` become `recurrence`: hourly to yearly rules, with
 *   `BYDAY` (also "the last Friday"), `BYMONTHDAY` and `BYSETPOS` (what
 *   `parseRRule` reads). A rule that cannot be shown as one (a `BYMONTH` that is
 *   not the start month, `BYYEARDAY`, minutely, ...) is imported as a single
 *   event, with a warning that names the part.
 * - A changed occurrence (`RECURRENCE-ID`) becomes its own event and its day
 *   is skipped in the series. Cancelled events and occurrences are left out.
 * - Alarms, tasks and everything else are ignored.
 *
 * `LOCATION` is matched with the names in `resources`. Pass `onWarning` to hear
 * about what was skipped or approximated.
 */
export const icsToEvents = (
  text: string,
  { resources, resourceId, onWarning }: ImportOptions = {}
): SchedulerEvent[] => {
  const told = new Set<string>();
  const warn: Warn = (message) => {
    if (!told.has(message)) {
      told.add(message);
      onWarning?.(message);
    }
  };

  const byName = new Map<string, string>();
  for (const resource of resources ?? []) {
    const name = resource.name.trim().toLowerCase();
    if (!byName.has(name)) byName.set(name, resource.id);
  }
  const resourcesOf = (location: string | undefined) => {
    const place = location?.trim().toLowerCase() ?? "";
    const whole = byName.get(place);
    const ids = whole !== undefined ? [whole] : place.split(/,\s*/).map((name) => byName.get(name));
    return [...new Set(ids.filter((id): id is string => id !== undefined))];
  };

  const used = new Set<string>();
  const unique = (id: string) => {
    let candidate = id;
    for (let n = 2; used.has(candidate); n++) candidate = `${id}-${n}`;
    used.add(candidate);
    return candidate;
  };

  const build = (props: Line[], uid: string, id: string): SchedulerEvent | undefined => {
    const get = (name: string) => props.find((line) => line.name === name);
    const dtstart = get("DTSTART");
    const start = dtstart && parseDate(dtstart.value, dtstart.params, warn);
    if (!start) {
      warn(`Event ${uid} was skipped: it has no readable DTSTART.`);
      return undefined;
    }

    const dtend = get("DTEND");
    const duration = get("DURATION");
    let end = dtend
      ? parseDate(dtend.value, dtend.params, warn)?.date
      : duration && addDuration(start.date, start.allDay, duration.value);
    if (end && end < start.date) {
      warn(`Event ${uid} was skipped: it ends before it starts.`);
      return undefined;
    }
    if (!end || end.getTime() === start.date.getTime()) {
      end = start.allDay
        ? new Date(start.date.getFullYear(), start.date.getMonth(), start.date.getDate() + 1)
        : new Date(start.date.getTime() + 3_600_000);
    }

    const event: SchedulerEvent = {
      id,
      title: unescapeText(get("SUMMARY")?.value ?? ""),
      startDate: start.date,
      endDate: end,
    };
    const description = get("DESCRIPTION");
    if (description?.value) event.description = unescapeText(description.value);

    const ids = resourcesOf(unescapeText(get("LOCATION")?.value ?? ""));
    if (!ids.length && resourceId !== undefined) ids.push(resourceId);
    if (ids.length) event.resourceId = ids[0];
    if (ids.length > 1) event.resourceIds = ids;

    const rrule = get("RRULE");
    if (rrule) {
      let rule: ReturnType<typeof parseRRule> | undefined;
      try {
        rule = parseRRule(rrule.value, { start: start.date });
      } catch (error) {
        warn(`Event ${uid} repeats in a way the scheduler cannot show (${(error as Error).message}): it was imported once.`);
      }
      if (rule) {
        // A skipped day, or for an hourly series the exact moment.
        const hourly = rule.freq === "hourly";
        const skipped = props
          .filter((line) => line.name === "EXDATE")
          .flatMap((line) => line.value.split(",").map((v) => parseDate(v, line.params, warn)))
          .flatMap((day) => (day ? [hourly ? day.date : startOfDay(day.date)] : []));
        if (skipped.length) rule.exceptions = skipped;
        event.recurrence = rule;
      }
    }
    if (get("RDATE")) warn(`Event ${uid} has extra dates (RDATE), which were ignored.`);
    return event;
  };

  const events: SchedulerEvent[] = [];
  const series = new Map<string, SchedulerEvent>();
  const changed: { props: Line[]; uid: string; day: Date | undefined }[] = [];

  readEvents(text).forEach((props, index) => {
    const get = (name: string) => props.find((line) => line.name === name);
    const uid = get("UID")?.value.trim() ?? "";
    const label = uid || `#${index + 1}`;
    const recurrenceId = get("RECURRENCE-ID");
    if (recurrenceId) {
      const day = parseDate(recurrenceId.value, recurrenceId.params, warn);
      changed.push({ props, uid, day: day?.date });
      return;
    }
    if (get("STATUS")?.value.trim().toUpperCase() === "CANCELLED") return;
    const event = build(props, label, unique(uid.replace(/@resource-scheduler$/, "") || `event-${index + 1}`));
    if (!event) return;
    events.push(event);
    if (uid) series.set(uid, event);
  });

  for (const { props, uid, day } of changed) {
    const master = series.get(uid);
    const hourly = master?.recurrence?.freq === "hourly";
    const skipped = day && (hourly ? day : startOfDay(day));
    if (skipped && master?.recurrence) master.recurrence.exceptions = [...(master.recurrence.exceptions ?? []), skipped];
    if (props.find((line) => line.name === "STATUS")?.value.trim().toUpperCase() === "CANCELLED") continue;
    const base = master?.id ?? (uid.replace(/@resource-scheduler$/, "") || "event");
    const event = build(props, uid || "(no UID)", unique(skipped ? `${base}#${format(skipped, hourly ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd")}` : base));
    if (event) events.push(event);
  }

  return events;
};
