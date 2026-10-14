import { describe, expect, it } from "vitest";
import type { Recurrence, SchedulerEvent } from "../types";
import { expandRecurrence } from "./recurrence";
import { parseRRule, toRRule } from "./rrule";

const start = new Date(2026, 9, 5, 9); // Monday 5 October 2026, 9:00

describe("parseRRule", () => {
  it("reads the frequency, interval, count, with or without the prefix and in any case", () => {
    expect(parseRRule("FREQ=DAILY")).toEqual({ freq: "daily" });
    expect(parseRRule("RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5")).toEqual({ freq: "daily", interval: 2, count: 5 });
    expect(parseRRule("rrule:freq=weekly;byday=mo,we")).toEqual({ freq: "weekly", byWeekday: [1, 3] });
    expect(parseRRule("FREQ=HOURLY;INTERVAL=6")).toEqual({ freq: "hourly", interval: 6 });
    expect(parseRRule("FREQ=MONTHLY;INTERVAL=1")).toEqual({ freq: "monthly" });
    expect(parseRRule(" FREQ=YEARLY; ")).toEqual({ freq: "yearly" });
  });

  it("reads positions on a weekday as byWeekday and bySetPos", () => {
    expect(parseRRule("FREQ=MONTHLY;BYDAY=-1FR")).toEqual({ freq: "monthly", byWeekday: [5], bySetPos: [-1] });
    expect(parseRRule("FREQ=MONTHLY;BYDAY=2TU")).toEqual({ freq: "monthly", byWeekday: [2], bySetPos: [2] });
    expect(parseRRule("FREQ=MONTHLY;BYDAY=1FR,-1FR")).toEqual({ freq: "monthly", byWeekday: [5], bySetPos: [1, -1] });
    expect(parseRRule("FREQ=MONTHLY;BYDAY=+3MO")).toEqual({ freq: "monthly", byWeekday: [1], bySetPos: [3] });
    expect(parseRRule("FREQ=YEARLY;BYMONTH=10;BYDAY=-1FR", { start })).toEqual({ freq: "yearly", byWeekday: [5], bySetPos: [-1] });
  });

  it("reads plain weekdays with BYSETPOS and month days", () => {
    expect(parseRRule("FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1")).toEqual({
      freq: "monthly",
      byWeekday: [1, 2, 3, 4, 5],
      bySetPos: [-1],
    });
    expect(parseRRule("FREQ=MONTHLY;BYMONTHDAY=1,15,-1")).toEqual({ freq: "monthly", byMonthDay: [1, 15, -1] });
    expect(parseRRule("FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13")).toEqual({ freq: "monthly", byWeekday: [5], byMonthDay: [13] });
    expect(parseRRule("FREQ=MONTHLY;BYMONTHDAY=1,2,3;BYSETPOS=-1")).toEqual({
      freq: "monthly",
      byMonthDay: [1, 2, 3],
      bySetPos: [-1],
    });
  });

  it("reads UNTIL as a day, or for hourly the moment", () => {
    expect(parseRRule("FREQ=DAILY;UNTIL=20261231").until).toEqual(new Date(2026, 11, 31));
    expect(parseRRule("FREQ=DAILY;UNTIL=20261231T235959").until).toEqual(new Date(2026, 11, 31));
    const utc = new Date(Date.UTC(2026, 11, 31, 12));
    expect(parseRRule("FREQ=DAILY;UNTIL=20261231T120000Z").until).toEqual(new Date(utc.getFullYear(), utc.getMonth(), utc.getDate()));
    expect(parseRRule("FREQ=HOURLY;UNTIL=20261231T120000Z").until).toEqual(utc);
    expect(parseRRule("FREQ=HOURLY;UNTIL=20261231T120000").until).toEqual(new Date(2026, 11, 31, 12));
  });

  it("accepts WKST=MO, and other days when they change nothing", () => {
    expect(parseRRule("FREQ=WEEKLY;WKST=MO;INTERVAL=2;BYDAY=MO,WE")).toEqual({ freq: "weekly", interval: 2, byWeekday: [1, 3] });
    expect(parseRRule("FREQ=WEEKLY;WKST=SU;BYDAY=MO,WE")).toEqual({ freq: "weekly", byWeekday: [1, 3] });
    expect(parseRRule("FREQ=DAILY;WKST=SU;INTERVAL=2")).toEqual({ freq: "daily", interval: 2 });
  });

  it("throws a RangeError that names what it cannot show", () => {
    const cases: [string, string][] = [
      ["", "FREQ"],
      ["INTERVAL=2", "FREQ"],
      ["FREQ=MINUTELY", "MINUTELY"],
      ["FREQ=SECONDLY", "SECONDLY"],
      ["FREQ=DAILY;BYHOUR=9", "BYHOUR"],
      ["FREQ=YEARLY;BYYEARDAY=100", "BYYEARDAY"],
      ["FREQ=YEARLY;BYWEEKNO=20", "BYWEEKNO"],
      ["FREQ=DAILY;X-FOO=1", "X-FOO"],
      ["FREQ=DAILY;FREQ=DAILY", "twice"],
      ["FREQ=DAILY;INTERVAL=0", "INTERVAL"],
      ["FREQ=DAILY;INTERVAL=x", "INTERVAL"],
      ["FREQ=DAILY;COUNT=0", "COUNT"],
      ["FREQ=DAILY;UNTIL=soon", "UNTIL"],
      ["FREQ=DAILY;UNTIL=20261340", "UNTIL"],
      ["FREQ=DAILY;BYDAY=MO", "BYDAY"],
      ["FREQ=HOURLY;BYDAY=MO", "BYDAY"],
      ["FREQ=WEEKLY;BYDAY=1MO", "BYDAY"],
      ["FREQ=WEEKLY;BYDAY=XX", "BYDAY"],
      ["FREQ=MONTHLY;BYDAY=1MO,-1FR", "BYDAY"],
      ["FREQ=MONTHLY;BYDAY=MO,1TU", "BYDAY"],
      ["FREQ=MONTHLY;BYDAY=2TU;BYSETPOS=1", "BYDAY"],
      ["FREQ=MONTHLY;BYDAY=6TU", "BYDAY"],
      ["FREQ=MONTHLY;BYMONTHDAY=0", "BYMONTHDAY"],
      ["FREQ=MONTHLY;BYMONTHDAY=32", "BYMONTHDAY"],
      ["FREQ=MONTHLY;BYMONTHDAY=a", "BYMONTHDAY"],
      ["FREQ=WEEKLY;BYMONTHDAY=1", "BYMONTHDAY"],
      ["FREQ=DAILY;BYSETPOS=1", "BYSETPOS"],
      ["FREQ=MONTHLY;BYSETPOS=1", "BYSETPOS"],
      ["FREQ=MONTHLY;BYDAY=FR;BYSETPOS=0", "BYSETPOS"],
      ["FREQ=MONTHLY;BYMONTH=3", "BYMONTH"],
      ["FREQ=YEARLY;BYMONTH=3", "BYMONTH"],
      ["FREQ=YEARLY;BYMONTH=10,11", "BYMONTH"],
      ["FREQ=YEARLY;BYDAY=-1FR", "BYMONTH"],
      ["FREQ=YEARLY;BYMONTHDAY=5", "BYMONTH"],
      ["FREQ=WEEKLY;INTERVAL=2;WKST=SU;BYDAY=MO", "WKST"],
      ["FREQ=WEEKLY;WKST=XX", "WKST"],
      ["FREQ", "NAME=value"],
    ];
    for (const [rule, mentions] of cases) {
      expect(() => parseRRule(rule, { start }), rule).toThrow(RangeError);
      expect(() => parseRRule(rule, { start }), rule).toThrow(mentions);
    }
  });

  it("needs the start to check a yearly BYMONTH", () => {
    expect(() => parseRRule("FREQ=YEARLY;BYMONTH=10")).toThrow("start");
    expect(parseRRule("FREQ=YEARLY;BYMONTH=10", { start })).toEqual({ freq: "yearly" });
  });
});

describe("toRRule", () => {
  const rule = (r: Recurrence, options = {}) => toRRule(r, { start, ...options });

  it("writes the frequency, interval and count", () => {
    expect(rule({ freq: "daily" })).toBe("FREQ=DAILY");
    expect(rule({ freq: "hourly", interval: 4, count: 6 })).toBe("FREQ=HOURLY;INTERVAL=4;COUNT=6");
    expect(rule({ freq: "weekly", interval: 2, byWeekday: [1, 3, 3], count: 5 })).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5");
    expect(rule({ freq: "daily", interval: 1 })).toBe("FREQ=DAILY");
  });

  it("writes the last Friday as -1FR, and several positions or weekdays with BYSETPOS", () => {
    expect(rule({ freq: "monthly", byWeekday: [5], bySetPos: [-1] })).toBe("FREQ=MONTHLY;BYDAY=-1FR");
    expect(rule({ freq: "monthly", byWeekday: [2], bySetPos: [1, 3] })).toBe("FREQ=MONTHLY;BYDAY=1TU,3TU");
    expect(rule({ freq: "monthly", byWeekday: [1, 2, 3, 4, 5], bySetPos: [-1] })).toBe(
      "FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1"
    );
    expect(rule({ freq: "monthly", byWeekday: [5], byMonthDay: [13] })).toBe("FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13");
    expect(rule({ freq: "monthly", byWeekday: [5], bySetPos: [9] })).toBe("FREQ=MONTHLY;BYDAY=FR;BYSETPOS=9");
    expect(rule({ freq: "monthly", byMonthDay: [1, -1] })).toBe("FREQ=MONTHLY;BYMONTHDAY=1,-1");
  });

  it("writes BYMONTH from the start for a yearly rule that needs it", () => {
    expect(rule({ freq: "yearly", byWeekday: [5], bySetPos: [-1] })).toBe("FREQ=YEARLY;BYMONTH=10;BYDAY=-1FR");
    expect(rule({ freq: "yearly", byMonthDay: [1] })).toBe("FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=1");
    expect(toRRule({ freq: "yearly" })).toBe("FREQ=YEARLY");
    expect(() => toRRule({ freq: "yearly", byMonthDay: [1] })).toThrow("start");
  });

  it("leaves out what the frequency ignores", () => {
    expect(rule({ freq: "daily", byWeekday: [1], byMonthDay: [1], bySetPos: [1] })).toBe("FREQ=DAILY");
    expect(rule({ freq: "hourly", byWeekday: [1] })).toBe("FREQ=HOURLY");
    expect(rule({ freq: "weekly", byWeekday: [1], byMonthDay: [1], bySetPos: [1] })).toBe("FREQ=WEEKLY;BYDAY=MO");
    expect(rule({ freq: "monthly", exceptions: [start] })).toBe("FREQ=MONTHLY");
  });

  it("writes UNTIL as a date, the end of the day in UTC, or for hourly the moment", () => {
    const until = new Date(2026, 11, 31, 8);
    const utc = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    expect(rule({ freq: "daily", until }, { allDay: true })).toBe("FREQ=DAILY;UNTIL=20261231");
    expect(rule({ freq: "daily", until })).toBe(`FREQ=DAILY;UNTIL=${utc(new Date(2026, 11, 31, 23, 59, 59, 999))}`);
    expect(rule({ freq: "hourly", until })).toBe(`FREQ=HOURLY;UNTIL=${utc(until)}`);
  });

  it("throws a RangeError for what it cannot write", () => {
    expect(() => toRRule({ freq: "secondly" as Recurrence["freq"] })).toThrow(RangeError);
    expect(() => toRRule({ freq: "weekly", byWeekday: [7] })).toThrow("byWeekday");
    expect(() => toRRule({ freq: "monthly", byMonthDay: [0] })).toThrow("byMonthDay");
    expect(() => toRRule({ freq: "monthly", byMonthDay: [32] })).toThrow("byMonthDay");
    expect(() => toRRule({ freq: "monthly", byWeekday: [1], bySetPos: [0] })).toThrow("bySetPos");
    expect(() => toRRule({ freq: "monthly", bySetPos: [1] })).toThrow("bySetPos");
    expect(() => toRRule({ freq: "daily", count: 0 })).toThrow("count");
    expect(() => toRRule({ freq: "daily", count: 1.5 })).toThrow("count");
  });
});

describe("round trip", () => {
  const rules: Recurrence[] = [
    { freq: "hourly", interval: 3, count: 10 },
    { freq: "daily" },
    { freq: "daily", interval: 2, count: 4 },
    { freq: "weekly", byWeekday: [1, 3, 5] },
    { freq: "weekly", interval: 2, byWeekday: [0, 6] },
    { freq: "monthly" },
    { freq: "monthly", byMonthDay: [1, 15, -1] },
    { freq: "monthly", interval: 2, byMonthDay: [-2] },
    { freq: "monthly", byWeekday: [5], bySetPos: [-1] },
    { freq: "monthly", byWeekday: [2], bySetPos: [2], count: 6 },
    { freq: "monthly", byWeekday: [1, 2, 3, 4, 5], bySetPos: [-1] },
    { freq: "monthly", byWeekday: [5], byMonthDay: [13] },
    { freq: "monthly", byWeekday: [0], bySetPos: [1, -1] },
    { freq: "yearly" },
    { freq: "yearly", byWeekday: [5], bySetPos: [-1] },
    { freq: "yearly", byMonthDay: [1, -1] },
  ];

  it("gives back the rule", () => {
    for (const rule of rules) expect(parseRRule(toRRule(rule, { start }), { start }), JSON.stringify(rule)).toEqual(rule);
  });

  it("gives back the same occurrences, until and exceptions included", () => {
    const from = new Date(2026, 9, 1);
    const to = new Date(2028, 11, 1);
    for (const rule of rules) {
      for (const extra of [{}, { until: new Date(2027, 5, 30), exceptions: [new Date(2026, 10, 9)] }]) {
        const original: SchedulerEvent = {
          id: "s",
          title: "T",
          startDate: start,
          endDate: new Date(start.getTime() + 3_600_000),
          recurrence: { ...rule, ...extra },
        };
        const back = { ...original, recurrence: { ...parseRRule(toRRule(original.recurrence!, { start }), { start }), exceptions: extra.exceptions } };
        const times = (e: SchedulerEvent) => expandRecurrence(e, from, to).map((o) => o.startDate.getTime());
        expect(times(back), JSON.stringify(original.recurrence)).toEqual(times(original));
      }
    }
  });
});
