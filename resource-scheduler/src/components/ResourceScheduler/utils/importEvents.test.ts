import { startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import type { ResourceInput, SchedulerEvent } from "../types";
import { eventsToICS } from "./exportEvents";
import { icsToEvents } from "./importEvents";

const CRLF = "\r\n";
const calendar = (...body: string[]) => ["BEGIN:VCALENDAR", "VERSION:2.0", ...body, "END:VCALENDAR", ""].join(CRLF);
const vevent = (...props: string[]) =>
  [
    "BEGIN:VEVENT",
    ...(props.some((p) => p.startsWith("UID")) ? [] : ["UID:u1"]),
    ...(props.some((p) => p.startsWith("SUMMARY")) ? [] : ["SUMMARY:Standup"]),
    ...props,
    "END:VEVENT",
  ].join(CRLF);
const read = (...props: string[]) => {
  const warnings: string[] = [];
  const events = icsToEvents(calendar(vevent(...props)), { onWarning: (w) => warnings.push(w) });
  return { events, event: events[0], warnings };
};

describe("icsToEvents: dates", () => {
  it("reads UTC date-times", () => {
    const { event } = read("DTSTART:20261007T090000Z", "DTEND:20261007T103000Z");
    expect(event.startDate).toEqual(new Date(Date.UTC(2026, 9, 7, 9)));
    expect(event.endDate).toEqual(new Date(Date.UTC(2026, 9, 7, 10, 30)));
  });

  it("reads floating date-times as local time", () => {
    const { event } = read("DTSTART:20261007T090000", "DTEND:20261007T100000");
    expect(event.startDate).toEqual(new Date(2026, 9, 7, 9));
    expect(event.endDate).toEqual(new Date(2026, 9, 7, 10));
  });

  it("reads a TZID in summer and winter time", () => {
    const summer = read("DTSTART;TZID=America/New_York:20261007T090000", "DTEND;TZID=America/New_York:20261007T100000");
    expect(summer.event.startDate).toEqual(new Date(Date.UTC(2026, 9, 7, 13)));
    const winter = read("DTSTART;TZID=America/New_York:20261207T090000", "DTEND;TZID=America/New_York:20261207T100000");
    expect(winter.event.startDate).toEqual(new Date(Date.UTC(2026, 11, 7, 14)));
    const india = read("DTSTART;TZID=Asia/Kolkata:20261007T090000", "DTEND;TZID=Asia/Kolkata:20261007T100000");
    expect(india.event.startDate).toEqual(new Date(Date.UTC(2026, 9, 7, 3, 30)));
  });

  it("settles a time that a clock change skips or repeats as RFC 5545 says", () => {
    const at = (zone: string, wall: string) => read(`DTSTART;TZID=${zone}:${wall}`).event.startDate.toISOString();
    // Skipped (02:30 does not exist on 8 March in New York): the offset from before the change, EST.
    expect(at("America/New_York", "20260308T023000")).toBe("2026-03-08T07:30:00.000Z");
    expect(at("Australia/Sydney", "20261004T023000")).toBe("2026-10-03T16:30:00.000Z");
    // Repeated (01:30 happens twice on 1 November): the first one, EDT.
    expect(at("America/New_York", "20261101T013000")).toBe("2026-11-01T05:30:00.000Z");
    expect(at("Australia/Sydney", "20260405T023000")).toBe("2026-04-04T15:30:00.000Z");
    // Either side of a change is unaffected.
    expect(at("America/New_York", "20260308T013000")).toBe("2026-03-08T06:30:00.000Z");
    expect(at("America/New_York", "20260308T033000")).toBe("2026-03-08T07:30:00.000Z");
  });

  it("reads a TZID with quotes around it", () => {
    const { event } = read('DTSTART;TZID="Europe/Paris":20261007T090000', 'DTEND;TZID="Europe/Paris":20261007T100000');
    expect(event.startDate).toEqual(new Date(Date.UTC(2026, 9, 7, 7)));
  });

  it("falls back to local time, with a warning, for a time zone it does not know", () => {
    const { event, warnings } = read(
      "DTSTART;TZID=Eastern Standard Time:20261007T090000",
      "DTEND;TZID=Eastern Standard Time:20261007T100000"
    );
    expect(event.startDate).toEqual(new Date(2026, 9, 7, 9));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Eastern Standard Time");
  });

  it("reads dates as whole local days, with an exclusive end", () => {
    const { event } = read("DTSTART;VALUE=DATE:20261007", "DTEND;VALUE=DATE:20261009");
    expect(event.startDate).toEqual(new Date(2026, 9, 7));
    expect(event.endDate).toEqual(new Date(2026, 9, 9));
  });

  it("makes a date without an end last one day", () => {
    const { event } = read("DTSTART;VALUE=DATE:20261007");
    expect(event.endDate).toEqual(new Date(2026, 9, 8));
  });

  it("takes the end from a DURATION", () => {
    expect(read("DTSTART:20261007T090000Z", "DURATION:PT1H30M").event.endDate).toEqual(
      new Date(Date.UTC(2026, 9, 7, 10, 30))
    );
    expect(read("DTSTART:20261007T090000Z", "DURATION:P1DT2H").event.endDate).toEqual(
      new Date(Date.UTC(2026, 9, 8, 11))
    );
    expect(read("DTSTART;VALUE=DATE:20261007", "DURATION:P1W").event.endDate).toEqual(new Date(2026, 9, 14));
  });

  it("makes a timed event without an end last one hour", () => {
    expect(read("DTSTART:20261007T090000Z").event.endDate).toEqual(new Date(Date.UTC(2026, 9, 7, 10)));
  });

  it("skips an event with no readable start, with a warning", () => {
    for (const props of [[], ["DTSTART:not-a-date"], ["DTSTART:20261307T090000Z"], ["DTSTART:20261007T250000Z"]]) {
      const { events, warnings } = read(...props);
      expect(events).toEqual([]);
      expect(warnings).toHaveLength(1);
    }
  });

  it("skips an event that ends before it starts, with a warning", () => {
    const { events, warnings } = read("DTSTART:20261007T100000Z", "DTEND:20261007T090000Z");
    expect(events).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});

describe("icsToEvents: text", () => {
  it("reads id, title and description, and unescapes text", () => {
    const { event } = read(
      "UID:abc-123",
      "SUMMARY:A\\, B\\; C\\\\D",
      "DESCRIPTION:line 1\\nline 2\\Nline 3",
      "DTSTART:20261007T090000Z",
      "DTEND:20261007T100000Z"
    );
    expect(event.id).toBe("abc-123");
    expect(event.title).toBe("A, B; C\\D");
    expect(event.description).toBe("line 1\nline 2\nline 3");
  });

  it("drops the suffix eventsToICS adds to ids", () => {
    expect(read("UID:e1@resource-scheduler", "DTSTART:20261007T090000Z").event.id).toBe("e1");
    expect(read("UID:e1@google.com", "DTSTART:20261007T090000Z").event.id).toBe("e1@google.com");
  });

  it("unfolds long lines, including multi-byte characters, with CRLF, LF or CR", () => {
    const title = "é".repeat(80);
    for (const eol of ["\r\n", "\n", "\r"]) {
      const text = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:u1",
        `SUMMARY:${title.slice(0, 40)}`,
        ` ${title.slice(40)}`,
        "DTSTART:20261007T090000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join(eol);
      expect(icsToEvents(text)[0].title).toBe(title);
    }
  });

  it("ignores a byte order mark, blank lines and unknown properties", () => {
    const text = "\uFEFF" + calendar("X-WR-CALNAME:Rooms", "", vevent("DTSTART:20261007T090000Z", "X-ANYTHING;FOO=bar:baz"));
    expect(icsToEvents(text)).toHaveLength(1);
  });

  it("reads a parameter value with a colon in quotes", () => {
    const { event } = read('SUMMARY;LANGUAGE="en:US":Hello: world', "DTSTART:20261007T090000Z");
    expect(event.title).toBe("Hello: world");
  });

  it("gives an event without a title an empty one", () => {
    const text = calendar(["BEGIN:VEVENT", "UID:u1", "DTSTART:20261007T090000Z", "END:VEVENT"].join(CRLF));
    expect(icsToEvents(text)[0].title).toBe("");
  });

  it("gives an event without a UID an id, and every event a different one", () => {
    const bare = ["BEGIN:VEVENT", "DTSTART:20261007T090000Z", "END:VEVENT"].join(CRLF);
    const twin = vevent("DTSTART:20261007T090000Z");
    const ids = icsToEvents(calendar(bare, bare, twin, twin)).map((e) => e.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});

describe("icsToEvents: structure", () => {
  it("reads only events, not an alarm inside one or a time zone definition", () => {
    const text = calendar(
      [
        "BEGIN:VTIMEZONE",
        "TZID:America/New_York",
        "BEGIN:STANDARD",
        "DTSTART:19701101T020000",
        "TZOFFSETFROM:-0400",
        "TZOFFSETTO:-0500",
        "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
        "END:STANDARD",
        "END:VTIMEZONE",
        "BEGIN:VEVENT",
        "UID:u1",
        "SUMMARY:Standup",
        "DESCRIPTION:Real description",
        "DTSTART;TZID=America/New_York:20261007T090000",
        "DTEND;TZID=America/New_York:20261007T100000",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "TRIGGER:-PT15M",
        "END:VALARM",
        "END:VEVENT",
        "BEGIN:VTODO",
        "UID:t1",
        "SUMMARY:A task",
        "DTSTART:20261007T090000Z",
        "END:VTODO"
      ].join(CRLF)
    );
    const events = icsToEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Standup");
    expect(events[0].description).toBe("Real description");
    expect(events[0].startDate).toEqual(new Date(Date.UTC(2026, 9, 7, 13)));
  });

  it("returns nothing for text that is not a calendar", () => {
    expect(icsToEvents("")).toEqual([]);
    expect(icsToEvents("hello world")).toEqual([]);
    expect(icsToEvents("BEGIN:VEVENT\r\nUID:u1\r\n")).toEqual([]);
  });

  it("skips cancelled events", () => {
    expect(read("STATUS:CANCELLED", "DTSTART:20261007T090000Z").events).toEqual([]);
  });
});

describe("icsToEvents: recurrence", () => {
  const start = "DTSTART:20261005T090000"; // a Monday, floating so the day does not depend on the time zone

  it("reads daily, monthly and yearly rules", () => {
    expect(read(start, "RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5").event.recurrence).toEqual({
      freq: "daily",
      interval: 2,
      count: 5,
    });
    expect(read(start, "RRULE:FREQ=MONTHLY").event.recurrence).toEqual({ freq: "monthly" });
    expect(read(start, "RRULE:FREQ=YEARLY").event.recurrence).toEqual({ freq: "yearly" });
  });

  it("reads weekdays of a weekly rule", () => {
    expect(read(start, "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR").event.recurrence).toEqual({
      freq: "weekly",
      byWeekday: [1, 3, 5],
    });
    expect(read(start, "RRULE:FREQ=WEEKLY").event.recurrence).toEqual({ freq: "weekly" });
  });

  it("accepts a rule written in lower case", () => {
    expect(read(start, "RRULE:freq=weekly;byday=mo").event.recurrence).toEqual({ freq: "weekly", byWeekday: [1] });
  });

  it("reads UNTIL as a date, a UTC moment or a floating moment", () => {
    const until = new Date(2026, 11, 31);
    expect(read(start, "RRULE:FREQ=DAILY;UNTIL=20261231").event.recurrence?.until).toEqual(until);
    expect(read(start, "RRULE:FREQ=DAILY;UNTIL=20261231T120000Z").event.recurrence?.until).toEqual(
      startOfDay(new Date(Date.UTC(2026, 11, 31, 12)))
    );
    expect(read(start, "RRULE:FREQ=DAILY;UNTIL=20261231T235959").event.recurrence?.until).toEqual(until);
  });

  it("reads EXDATE lines and lists, as dates or moments, as local days", () => {
    const { event } = read(
      start,
      "RRULE:FREQ=DAILY",
      "EXDATE:20261006T090000,20261008T090000",
      "EXDATE;VALUE=DATE:20261010"
    );
    expect(event.recurrence?.exceptions).toEqual([new Date(2026, 9, 6), new Date(2026, 9, 8), new Date(2026, 9, 10)]);
    const utc = read(start, "RRULE:FREQ=DAILY", "EXDATE:20261012T090000Z");
    expect(utc.event.recurrence?.exceptions).toEqual([startOfDay(new Date(Date.UTC(2026, 9, 12, 9)))]);
  });

  it("imports a rule it cannot represent as one event, with a warning", () => {
    for (const rule of [
      "FREQ=MONTHLY;BYDAY=2TU",
      "FREQ=MONTHLY;BYMONTHDAY=15",
      "FREQ=MONTHLY;BYSETPOS=-1;BYDAY=MO,TU,WE,TH,FR",
      "FREQ=DAILY;BYDAY=MO,TU",
      "FREQ=YEARLY;BYMONTH=3",
      "FREQ=HOURLY",
      "FREQ=WEEKLY;BYDAY=1MO",
      "INTERVAL=2",
    ]) {
      const { events, warnings } = read(start, `RRULE:${rule}`, "EXDATE:20261006T090000");
      expect(events, rule).toHaveLength(1);
      expect(events[0].recurrence, rule).toBeUndefined();
      expect(warnings, rule).toHaveLength(1);
      expect(warnings[0], rule).toContain("u1");
    }
  });

  it("accepts BYMONTHDAY and BYMONTH that match the start", () => {
    expect(read(start, "RRULE:FREQ=MONTHLY;BYMONTHDAY=5").event.recurrence).toEqual({ freq: "monthly" });
    expect(read(start, "RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=5").event.recurrence).toEqual({ freq: "yearly" });
  });

  it("turns a changed occurrence into its own event and skips that day in the series", () => {
    const text = calendar(
      vevent(start, "DTEND:20261005T100000", "RRULE:FREQ=WEEKLY"),
      [
        "BEGIN:VEVENT",
        "UID:u1",
        "SUMMARY:Standup (moved)",
        "RECURRENCE-ID:20261012T090000",
        "DTSTART:20261012T140000",
        "DTEND:20261012T150000",
        "END:VEVENT",
      ].join(CRLF)
    );
    const events = icsToEvents(text);
    expect(events).toHaveLength(2);
    const [series, moved] = events;
    expect(series.id).toBe("u1");
    const skipped = series.recurrence?.exceptions ?? [];
    expect(skipped).toEqual([new Date(2026, 9, 12)]);
    expect(moved.title).toBe("Standup (moved)");
    expect(moved.id).not.toBe("u1");
    expect(moved.seriesId).toBeUndefined();
    expect(moved.recurrence).toBeUndefined();
    expect(moved.startDate).toEqual(new Date(2026, 9, 12, 14));
  });

  it("only skips the day for a cancelled occurrence", () => {
    const text = calendar(
      vevent(start, "DTEND:20261005T100000", "RRULE:FREQ=WEEKLY"),
      [
        "BEGIN:VEVENT",
        "UID:u1",
        "STATUS:CANCELLED",
        "RECURRENCE-ID:20261012T090000",
        "DTSTART:20261012T090000",
        "END:VEVENT",
      ].join(CRLF)
    );
    const events = icsToEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0].recurrence?.exceptions).toHaveLength(1);
  });

  it("keeps a changed occurrence whose series is not in the file", () => {
    const text = calendar(
      ["BEGIN:VEVENT", "UID:u9", "SUMMARY:Lonely", "RECURRENCE-ID:20261012T090000Z", "DTSTART:20261012T090000Z", "END:VEVENT"].join(CRLF)
    );
    expect(icsToEvents(text)).toHaveLength(1);
  });
});

describe("icsToEvents: resources", () => {
  const resources: ResourceInput[] = [
    { id: "r1", name: "Room A" },
    { id: "r2", name: "Room B" },
    { id: "r3", name: "Annex, North" },
  ];
  const at = (location?: string, options: { resourceId?: string } = {}) => {
    const props = ["DTSTART:20261007T090000Z", ...(location === undefined ? [] : [`LOCATION:${location}`])];
    return icsToEvents(calendar(vevent(...props)), { resources, ...options })[0];
  };

  it("matches a location to a resource by name, ignoring case", () => {
    expect(at("room a").resourceId).toBe("r1");
    expect(at("Room A").resourceIds).toBeUndefined();
  });

  it("matches several locations to several resources", () => {
    const event = at("Room A\\, Room B");
    expect(event.resourceId).toBe("r1");
    expect(event.resourceIds).toEqual(["r1", "r2"]);
  });

  it("matches a resource name that has a comma", () => {
    expect(at("Annex\\, North").resourceId).toBe("r3");
  });

  it("uses resourceId for events whose location matches nothing, or has none", () => {
    expect(at("Elsewhere", { resourceId: "ann" }).resourceId).toBe("ann");
    expect(at(undefined, { resourceId: "ann" }).resourceId).toBe("ann");
    expect(at("Room B", { resourceId: "ann" }).resourceId).toBe("r2");
  });

  it("leaves the resource out without a match or a fallback", () => {
    expect(at("Elsewhere").resourceId).toBeUndefined();
    expect(at(undefined).resourceIds).toBeUndefined();
  });
});

describe("icsToEvents: round trip", () => {
  const resources: ResourceInput[] = [
    { id: "r1", name: "Room A" },
    { id: "r2", name: "Room B" },
  ];
  const NOW = new Date(Date.UTC(2026, 9, 1));
  const events: SchedulerEvent[] = [
    { id: "e1", title: "Standup, daily; really", description: "line 1\nline 2", resourceId: "r1", startDate: new Date(Date.UTC(2026, 9, 7, 9)), endDate: new Date(Date.UTC(2026, 9, 7, 9, 15)) },
    { id: "e2", title: "Offsite", resourceId: "r2", startDate: new Date(2026, 9, 8), endDate: new Date(2026, 9, 10) },
    { id: "e3", title: "Shared", resourceId: "r1", resourceIds: ["r1", "r2"], startDate: new Date(Date.UTC(2026, 9, 9, 12)), endDate: new Date(Date.UTC(2026, 9, 9, 13)) },
    {
      id: "e4",
      title: "Series",
      resourceId: "r2",
      startDate: new Date(Date.UTC(2026, 9, 5, 9)),
      endDate: new Date(Date.UTC(2026, 9, 5, 10)),
      recurrence: { freq: "weekly", interval: 2, byWeekday: [1, 3], until: new Date(2026, 11, 31), count: 10, exceptions: [new Date(2026, 9, 14)] },
    },
    { id: "e5", title: "Weekly all day", resourceId: "r1", startDate: new Date(2026, 9, 5), endDate: new Date(2026, 9, 6), recurrence: { freq: "weekly", exceptions: [new Date(2026, 9, 12)] } },
  ];

  it("brings back what eventsToICS wrote", () => {
    const ics = eventsToICS(events, { resources, now: NOW });
    const back = icsToEvents(ics, { resources });
    expect(back).toEqual(events);
  });

  it("brings back events without resources when none are given", () => {
    const back = icsToEvents(eventsToICS(events, { now: NOW }));
    expect(back.map((e) => ({ ...e, resourceId: undefined, resourceIds: undefined }))).toEqual(
      events.map((e) => ({ ...e, resourceId: undefined, resourceIds: undefined }))
    );
  });
});

describe("icsToEvents: a calendar as Google Calendar writes it", () => {
  const google = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Team",
    "X-WR-TIMEZONE:Europe/Berlin",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Berlin",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "DTSTART;TZID=Europe/Berlin:20261005T100000",
    "DTEND;TZID=Europe/Berlin:20261005T103000",
    "RRULE:FREQ=WEEKLY;WKST=MO;UNTIL=20261231T225959Z;BYDAY=MO,WE",
    "EXDATE;TZID=Europe/Berlin:20261007T100000",
    "DTSTAMP:20261001T080000Z",
    "UID:series1@google.com",
    "CREATED:20260901T080000Z",
    "DESCRIPTION:Daily sync\\nAgenda: https://example.com/a\\, b",
    "LAST-MODIFIED:20260902T080000Z",
    "LOCATION:Room A",
    "SEQUENCE:1",
    "STATUS:CONFIRMED",
    "SUMMARY:Sync",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:This is an event reminder",
    "TRIGGER:-P0DT0H30M0S",
    "END:VALARM",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;TZID=Europe/Berlin:20261012T140000",
    "DTEND;TZID=Europe/Berlin:20261012T143000",
    "RECURRENCE-ID;TZID=Europe/Berlin:20261012T100000",
    "DTSTAMP:20261001T080000Z",
    "UID:series1@google.com",
    "LOCATION:Room B",
    "STATUS:CONFIRMED",
    "SUMMARY:Sync (afternoon)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20261015",
    "DTEND;VALUE=DATE:20261016",
    "DTSTAMP:20261001T080000Z",
    "UID:holiday@google.com",
    "SUMMARY:Public holiday",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join(CRLF);

  it("reads the series, its skipped and moved days, and the all-day event", () => {
    const warnings: string[] = [];
    const resources: ResourceInput[] = [
      { id: "a", name: "Room A" },
      { id: "b", name: "Room B" },
    ];
    const events = icsToEvents(google, { resources, onWarning: (w) => warnings.push(w) });
    expect(warnings).toEqual([]);
    expect(events.map((e) => [e.id, e.title, e.resourceId])).toEqual([
      ["series1@google.com", "Sync", "a"],
      ["holiday@google.com", "Public holiday", undefined],
      ["series1@google.com#2026-10-12", "Sync (afternoon)", "b"], // moved days come last
    ]);

    const [series, holiday, moved] = events;
    expect(series.description).toBe("Daily sync\nAgenda: https://example.com/a, b");
    expect(series.startDate).toEqual(new Date(Date.UTC(2026, 9, 5, 8))); // 10:00 in Berlin (CEST)
    expect(series.endDate).toEqual(new Date(Date.UTC(2026, 9, 5, 8, 30)));
    expect(series.recurrence).toEqual({
      freq: "weekly",
      byWeekday: [1, 3],
      until: startOfDay(new Date(Date.UTC(2026, 11, 31, 22, 59, 59))),
      exceptions: [startOfDay(new Date(Date.UTC(2026, 9, 7, 8))), startOfDay(new Date(Date.UTC(2026, 9, 12, 8)))],
    });
    expect(moved.startDate).toEqual(new Date(Date.UTC(2026, 9, 12, 12)));
    expect(holiday.startDate).toEqual(new Date(2026, 9, 15));
    expect(holiday.endDate).toEqual(new Date(2026, 9, 16));
  });
});
