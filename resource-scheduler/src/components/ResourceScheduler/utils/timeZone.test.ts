import { describe, expect, it } from "vitest";
import { isValidTimeZone, utcToZoned, wallToInstant, zonedToUtc } from "./timeZone";

const iso = (ms: number | undefined) => new Date(ms as number).toISOString();
// A wall-clock time as the number of milliseconds a UTC clock would show.
const wall = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi);

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Eastern Standard Time")).toBe(false);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("wallToInstant", () => {
  it("applies the offset in force at that wall-clock time", () => {
    expect(iso(wallToInstant(wall(2026, 10, 7, 9), "America/New_York"))).toBe("2026-10-07T13:00:00.000Z");
    expect(iso(wallToInstant(wall(2026, 12, 7, 9), "America/New_York"))).toBe("2026-12-07T14:00:00.000Z");
    expect(iso(wallToInstant(wall(2026, 10, 7, 9), "Asia/Kolkata"))).toBe("2026-10-07T03:30:00.000Z");
    expect(iso(wallToInstant(wall(2026, 10, 7, 9), "Asia/Kathmandu"))).toBe("2026-10-07T03:15:00.000Z");
  });

  it("uses the offset from before a clock change for a time that is skipped", () => {
    expect(iso(wallToInstant(wall(2026, 3, 8, 2, 30), "America/New_York"))).toBe("2026-03-08T07:30:00.000Z");
    expect(iso(wallToInstant(wall(2026, 10, 4, 2, 30), "Australia/Sydney"))).toBe("2026-10-03T16:30:00.000Z");
  });

  it("takes the first of a time that happens twice", () => {
    expect(iso(wallToInstant(wall(2026, 11, 1, 1, 30), "America/New_York"))).toBe("2026-11-01T05:30:00.000Z");
    expect(iso(wallToInstant(wall(2026, 4, 5, 2, 30), "Australia/Sydney"))).toBe("2026-04-04T15:30:00.000Z");
  });

  it("leaves the hours either side of a clock change alone", () => {
    expect(iso(wallToInstant(wall(2026, 3, 8, 1, 30), "America/New_York"))).toBe("2026-03-08T06:30:00.000Z");
    expect(iso(wallToInstant(wall(2026, 3, 8, 3, 30), "America/New_York"))).toBe("2026-03-08T07:30:00.000Z");
  });

  it("returns undefined for a zone it does not know", () => {
    expect(wallToInstant(wall(2026, 10, 7, 9), "Mars/Olympus")).toBeUndefined();
  });
});

describe("utcToZoned and zonedToUtc", () => {
  // Local fields of the result are the wall-clock time in the zone, whatever zone this machine is in.
  const fields = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

  it("moves an instant to the wall-clock time of the zone", () => {
    expect(fields(utcToZoned(new Date("2026-07-07T12:00:00Z"), "America/New_York"))).toEqual([2026, 7, 7, 8, 0]);
    expect(fields(utcToZoned(new Date("2026-12-07T12:00:00Z"), "America/New_York"))).toEqual([2026, 12, 7, 7, 0]);
    expect(fields(utcToZoned(new Date("2026-07-07T12:00:00Z"), "Asia/Tokyo"))).toEqual([2026, 7, 7, 21, 0]);
    expect(fields(utcToZoned(new Date("2026-07-07T20:00:00Z"), "Asia/Tokyo"))).toEqual([2026, 7, 8, 5, 0]);
    expect(fields(utcToZoned(new Date("2026-07-07T12:00:00Z"), "Asia/Kolkata"))).toEqual([2026, 7, 7, 17, 30]);
  });

  it("keeps seconds and milliseconds", () => {
    const zoned = utcToZoned(new Date("2026-07-07T12:00:05.123Z"), "Asia/Tokyo");
    expect([zoned.getSeconds(), zoned.getMilliseconds()]).toEqual([5, 123]);
    expect(zonedToUtc(zoned, "Asia/Tokyo").toISOString()).toBe("2026-07-07T12:00:05.123Z");
  });

  it("goes back to the instant it came from", () => {
    // Midday in January and July: no clock change on this machine or in the zone gets in the way.
    for (const zone of ["America/New_York", "Europe/London", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney", "America/Sao_Paulo", "Pacific/Auckland"]) {
      for (const at of ["2026-01-15T12:00:00Z", "2026-07-15T12:00:00Z", "2026-07-15T23:45:00Z"]) {
        const instant = new Date(at);
        expect(zonedToUtc(utcToZoned(instant, zone), zone).getTime(), `${zone} ${at}`).toBe(instant.getTime());
      }
    }
  });

  it("returns a copy of the same instant for a zone it does not know", () => {
    const date = new Date("2026-07-07T12:00:00Z");
    expect(utcToZoned(date, "Mars/Olympus").getTime()).toBe(date.getTime());
    expect(zonedToUtc(date, "Mars/Olympus").getTime()).toBe(date.getTime());
    expect(utcToZoned(date, "Mars/Olympus")).not.toBe(date);
  });

  it("converts many dates quickly", () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    const t = performance.now();
    for (let i = 0; i < 100_000; i++) zonedToUtc(utcToZoned(new Date(start + i * 7 * 60_000), "America/New_York"), "America/New_York");
    expect(performance.now() - t).toBeLessThan(2000);
  });
});
