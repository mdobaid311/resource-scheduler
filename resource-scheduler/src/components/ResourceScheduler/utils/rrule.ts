// src/components/ResourceScheduler/utils/rrule.ts
import { endOfDay, format, startOfDay } from "date-fns";
import type { Recurrence } from "../types";

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const FREQUENCIES: Record<string, Recurrence["freq"]> = {
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};
const KNOWN = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYSETPOS", "BYMONTH", "WKST"]);

// iCalendar date formats, shared with the .ics writer.
export const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
export const dateOnly = (d: Date) => format(d, "yyyyMMdd");

export interface RRuleOptions {
  /**
   * The first occurrence (`DTSTART`). A yearly rule repeats in the month it
   * starts in, so `parseRRule` checks `BYMONTH` against it and `toRRule` writes it.
   */
  start?: Date;
}

const numbers = (key: string, text: string, limit: number) => {
  const values = text.split(",").map((v) => (/^[+-]?\d+$/.test(v) ? Number(v) : NaN));
  if (values.some((n) => n === 0 || !(Math.abs(n) <= limit))) {
    throw new RangeError(`${key}=${text} must be whole numbers from 1 to ${limit}, or negative to count from the end`);
  }
  return [...new Set(values)];
};

// UNTIL is a date, a UTC moment (Z) or a floating one.
const parseUntil = (value: string) => {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (m) {
    const [y, mo, d, h, mi, s] = m.slice(1, 7).map((n) => (n === undefined ? 0 : Number(n)));
    const date = m[7] ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : new Date(y, mo - 1, d, h, mi, s);
    const [gy, gmo, gd, gh] = m[7]
      ? [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()]
      : [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()];
    if (gy === y && gmo === mo - 1 && gd === d && gh === h) return date;
  }
  throw new RangeError(`UNTIL=${value} is not a date`);
};

/**
 * Reads the value of an iCalendar `RRULE` (`FREQ=MONTHLY;BYDAY=-1FR`, with or
 * without the `RRULE:` prefix) as a `Recurrence`.
 *
 * Supported: `FREQ` (hourly to yearly), `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`
 * (plain weekdays, or for monthly and yearly one weekday with positions such
 * as `-1FR`, which become `byWeekday` and `bySetPos`), `BYMONTHDAY`, `BYSETPOS`,
 * `BYMONTH` (yearly, in the month `start` is in) and `WKST=MO`. `UNTIL` is a
 * calendar day, except for hourly where it is the moment (a floating one in
 * local time). Anything else throws a `RangeError` that names the part, rather
 * than being left out and changing what the rule means: other frequencies, a
 * `BYMONTH` that is not the start month, `BYYEARDAY`, `BYWEEKNO`, `BYHOUR`,
 * different positions for different weekdays, a yearly rule without `BYMONTH`
 * that has `BYDAY` or `BYMONTHDAY`, a `BYDAY` on a daily rule, and so on.
 * `EXDATE` and `DTSTART` are not part of the rule; see `icsToEvents`.
 */
export const parseRRule = (text: string, { start }: RRuleOptions = {}): Recurrence => {
  const parts = new Map<string, string>();
  for (const part of text.trim().replace(/^RRULE:/i, "").split(";")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 1) throw new RangeError(`"${part}" is not NAME=value`);
    const key = part.slice(0, eq).toUpperCase();
    if (!KNOWN.has(key)) throw new RangeError(`${key} is not supported`);
    if (parts.has(key)) throw new RangeError(`${key} appears twice`);
    parts.set(key, part.slice(eq + 1).toUpperCase());
  }

  const name = parts.get("FREQ");
  const freq = name === undefined ? undefined : FREQUENCIES[name];
  if (!freq) throw new RangeError(name === undefined ? "FREQ is missing" : `FREQ=${name} is not supported`);
  const wide = freq === "monthly" || freq === "yearly";
  const [byDay, monthDay, setPos, month] = ["BYDAY", "BYMONTHDAY", "BYSETPOS", "BYMONTH"].map((k) => parts.get(k));

  const positive = (key: string) => {
    const value = parts.get(key);
    if (value === undefined) return undefined;
    if (!/^[1-9]\d*$/.test(value)) throw new RangeError(`${key}=${value} must be a whole number above 0`);
    return Number(value);
  };
  const interval = positive("INTERVAL");
  const count = positive("COUNT");
  const untilText = parts.get("UNTIL");

  // A yearly rule repeats in one month, which the scheduler takes from the start.
  if (month !== undefined) {
    if (freq !== "yearly") throw new RangeError(`BYMONTH=${month} is only supported with FREQ=YEARLY`);
    if (!start) throw new RangeError(`BYMONTH=${month} needs the start date to check it against`);
    if (month !== String(start.getMonth() + 1)) {
      throw new RangeError(`BYMONTH=${month}: a yearly series repeats in the month it starts in (${start.getMonth() + 1})`);
    }
  } else if (freq === "yearly" && (byDay !== undefined || monthDay !== undefined || setPos !== undefined)) {
    throw new RangeError("a yearly rule with BYDAY, BYMONTHDAY or BYSETPOS needs BYMONTH");
  }

  let byWeekday: number[] | undefined;
  let bySetPos: number[] | undefined;
  if (byDay !== undefined) {
    if (freq === "hourly" || freq === "daily") throw new RangeError(`BYDAY=${byDay} is not supported with FREQ=${name}`);
    const tokens = byDay.split(",").map((t) => /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(t));
    if (tokens.some((t) => !t)) throw new RangeError(`BYDAY=${byDay} is not a list of weekdays`);
    const found = tokens as RegExpExecArray[];
    byWeekday = [...new Set(found.map((t) => DAYS.indexOf(t[2])))];
    const positions = found.filter((t) => t[1] !== undefined).map((t) => Number(t[1]));
    if (positions.length) {
      if (!wide) throw new RangeError(`BYDAY=${byDay}: a position needs FREQ=MONTHLY or FREQ=YEARLY`);
      if (positions.length !== found.length || byWeekday.length > 1 || setPos !== undefined) {
        throw new RangeError(`BYDAY=${byDay} cannot be shown: use one weekday with its positions, or plain weekdays with BYSETPOS`);
      }
      if (positions.some((p) => p === 0 || Math.abs(p) > 5)) throw new RangeError(`BYDAY=${byDay} has a position out of range`);
      bySetPos = [...new Set(positions)];
    }
  }

  let byMonthDay: number[] | undefined;
  if (monthDay !== undefined) {
    if (!wide) throw new RangeError(`BYMONTHDAY=${monthDay} is only supported with FREQ=MONTHLY or FREQ=YEARLY`);
    byMonthDay = numbers("BYMONTHDAY", monthDay, 31);
  }
  if (setPos !== undefined) {
    if (!wide) throw new RangeError(`BYSETPOS=${setPos} is only supported with FREQ=MONTHLY or FREQ=YEARLY`);
    if (!byWeekday && !byMonthDay) throw new RangeError("BYSETPOS needs BYDAY or BYMONTHDAY");
    bySetPos = numbers("BYSETPOS", setPos, 366);
  }

  // The scheduler's weeks start on Monday, which only matters for every n weeks on chosen days.
  const weekStart = parts.get("WKST");
  if (weekStart !== undefined) {
    if (!DAYS.includes(weekStart)) throw new RangeError(`WKST=${weekStart} is not a weekday`);
    if (weekStart !== "MO" && freq === "weekly" && (interval ?? 1) > 1 && byWeekday) {
      throw new RangeError(`WKST=${weekStart} changes which weeks BYDAY falls in; the scheduler's weeks start on Monday`);
    }
  }

  let until: Date | undefined;
  if (untilText !== undefined) {
    const date = parseUntil(untilText);
    until = freq === "hourly" ? date : startOfDay(date);
  }

  return {
    freq,
    ...(interval && interval > 1 ? { interval } : {}),
    ...(byWeekday ? { byWeekday } : {}),
    ...(byMonthDay ? { byMonthDay } : {}),
    ...(bySetPos ? { bySetPos } : {}),
    ...(until ? { until } : {}),
    ...(count ? { count } : {}),
  };
};

const check = (name: string, values: number[] | undefined, ok: (n: number) => boolean) => {
  if (values?.some((n) => !Number.isInteger(n) || !ok(n))) {
    throw new RangeError(`${name} has a value out of range: ${values.join(",")}`);
  }
};

/**
 * A `Recurrence` as the value of an iCalendar `RRULE` (`FREQ=MONTHLY;BYDAY=-1FR`;
 * add `RRULE:` for a line of an `.ics` file). `exceptions` are not part of the
 * rule (`EXDATE` carries them). Parts the frequency ignores are left out, so the
 * calendar reads the same series. One weekday with `bySetPos` is written as
 * positions on the weekday (`-1FR`), which more calendars understand than
 * `BYSETPOS`. A yearly rule that has weekdays or month days needs `start`, for
 * `BYMONTH`. `allDay` writes `UNTIL` as a date, otherwise it is the end of that
 * day in UTC (hourly: the moment). Throws a `RangeError` for what cannot be
 * written: an unknown `freq`, values out of range, `bySetPos` with no
 * `byWeekday` or `byMonthDay`.
 */
export const toRRule = (
  rule: Recurrence,
  { start, allDay = false }: RRuleOptions & { allDay?: boolean } = {}
): string => {
  if (!Object.values(FREQUENCIES).includes(rule.freq)) throw new RangeError(`freq "${rule.freq}" is not supported`);
  check("byWeekday", rule.byWeekday, (n) => n >= 0 && n <= 6);
  check("byMonthDay", rule.byMonthDay, (n) => n !== 0 && Math.abs(n) <= 31);
  check("bySetPos", rule.bySetPos, (n) => n !== 0 && Math.abs(n) <= 366);
  if (rule.count !== undefined && !(Number.isInteger(rule.count) && rule.count >= 1)) {
    throw new RangeError(`count must be a whole number above 0, not ${rule.count}`);
  }

  const wide = rule.freq === "monthly" || rule.freq === "yearly";
  const weekdays =
    rule.byWeekday?.length && rule.freq !== "hourly" && rule.freq !== "daily" ? [...new Set(rule.byWeekday)] : undefined;
  const monthDays = wide && rule.byMonthDay?.length ? rule.byMonthDay : undefined;
  const positions = wide && rule.bySetPos?.length ? rule.bySetPos : undefined;
  if (positions && !weekdays && !monthDays) throw new RangeError("bySetPos needs byWeekday or byMonthDay");
  const ordinal = !!positions && weekdays?.length === 1 && !monthDays && positions.every((p) => Math.abs(p) <= 5);

  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  const interval = Math.floor(rule.interval ?? 1);
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (rule.freq === "yearly" && (weekdays || monthDays)) {
    if (!start) throw new RangeError("a yearly rule with weekdays or month days needs `start`, for BYMONTH");
    parts.push(`BYMONTH=${start.getMonth() + 1}`);
  }
  if (weekdays) {
    parts.push(`BYDAY=${(ordinal ? positions.map((p) => `${p}${DAYS[weekdays[0]]}`) : weekdays.map((d) => DAYS[d])).join(",")}`);
  }
  if (monthDays) parts.push(`BYMONTHDAY=${monthDays.join(",")}`);
  if (positions && !ordinal) parts.push(`BYSETPOS=${positions.join(",")}`);
  if (rule.until) {
    parts.push(`UNTIL=${rule.freq === "hourly" ? stamp(rule.until) : allDay ? dateOnly(rule.until) : stamp(endOfDay(rule.until))}`);
  }
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  return parts.join(";");
};
