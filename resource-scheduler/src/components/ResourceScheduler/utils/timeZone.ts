// src/components/ResourceScheduler/utils/timeZone.ts

// Offsets are cached per quarter hour: zones change their offset on a quarter
// hour, so every instant in one gets the same answer from one Intl call.
const QUARTER = 900_000;
const DAY = 86_400_000;

interface Zone {
  format: Intl.DateTimeFormat;
  offsets: Map<number, number>;
}
const zones = new Map<string, Zone | null>();

const zoneOf = (timeZone: string) => {
  let zone = zones.get(timeZone);
  if (zone === undefined) {
    try {
      zone = {
        format: new Intl.DateTimeFormat("en-US", {
          timeZone,
          hourCycle: "h23",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        }),
        offsets: new Map(),
      };
    } catch {
      zone = null; // not a time zone the browser knows
    }
    zones.set(timeZone, zone);
  }
  return zone;
};

/** Whether the browser knows `timeZone` as an IANA name such as `Europe/Paris`. */
export const isValidTimeZone = (timeZone: string): boolean => zoneOf(timeZone) !== null;

// How far the zone is ahead of UTC at that instant, in milliseconds.
const offsetAt = (zone: Zone, ms: number) => {
  const quarter = Math.floor(ms / QUARTER);
  let offset = zone.offsets.get(quarter);
  if (offset === undefined) {
    const start = quarter * QUARTER;
    const part = Object.fromEntries(zone.format.formatToParts(start).map((p) => [p.type, Number(p.value)]));
    offset = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) - start;
    zone.offsets.set(quarter, offset);
  }
  return offset;
};

/**
 * The instant (milliseconds since 1970) at which a clock in `timeZone` shows
 * `wall`, given as the milliseconds a UTC clock would show for the same date
 * and time. `undefined` for a zone the browser does not know.
 *
 * Around a clock change a wall-clock time can happen twice (the first one is
 * taken) or not at all (the offset from before the change is used), as RFC 5545
 * says.
 */
export const wallToInstant = (wall: number, timeZone: string): number | undefined => {
  const zone = zoneOf(timeZone);
  if (!zone) return undefined;
  // The offsets a day either side are the only candidates; keep those that
  // turn out to be the offset in force at the instant they give.
  const before = offsetAt(zone, wall - DAY);
  const fits = [before, offsetAt(zone, wall + DAY)].filter((o) => offsetAt(zone, wall - o) === o);
  return wall - (fits.length ? Math.max(...fits) : before);
};

/**
 * The wall-clock time in `timeZone` at `date`, as a Date whose local fields
 * (`getHours()` and so on) show that time. Format it with date-fns as usual.
 * Not an instant: convert back with `zonedToUtc` before storing it. A zone the
 * browser does not know leaves the instant as it is.
 */
export const utcToZoned = (date: Date, timeZone: string): Date => {
  const zone = zoneOf(timeZone);
  if (!zone) return new Date(date.getTime());
  const wall = new Date(date.getTime() + offsetAt(zone, date.getTime()));
  return new Date(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds()
  );
};

/** The instant at which a clock in `timeZone` shows the local fields of `date`. The inverse of `utcToZoned`. */
export const zonedToUtc = (date: Date, timeZone: string): Date => {
  const wall = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  return new Date(wallToInstant(wall, timeZone) ?? date.getTime());
};
