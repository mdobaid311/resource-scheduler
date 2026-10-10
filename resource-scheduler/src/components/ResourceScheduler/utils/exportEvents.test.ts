import { describe, expect, it } from "vitest";
import type { ResourceInput, SchedulerEvent } from "../types";
import { eventsToCSV, eventsToICS } from "./exportEvents";

const NOW = new Date(Date.UTC(2026, 9, 1, 8, 30, 0)); // DTSTAMP, fixed so output is stable
const utc = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 7, h, m));
const event = (extra: Partial<SchedulerEvent> = {}): SchedulerEvent => ({
  id: "e1",
  title: "Standup",
  startDate: utc(9),
  endDate: utc(10),
  ...extra,
});
const lines = (ics: string) => ics.split("\r\n");

describe("eventsToICS", () => {
  it("wraps events in a calendar with CRLF line endings", () => {
    const ics = eventsToICS([event()], { now: NOW });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes one VEVENT per event with UTC start and end", () => {
    const out = lines(eventsToICS([event(), event({ id: "e2", title: "Review" })], { now: NOW }));
    expect(out.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(2);
    expect(out).toContain("UID:e1@resource-scheduler");
    expect(out).toContain("DTSTAMP:20261001T083000Z");
    expect(out).toContain("DTSTART:20261007T090000Z");
    expect(out).toContain("DTEND:20261007T100000Z");
    expect(out).toContain("SUMMARY:Review");
  });

  it("writes whole local days as all-day events", () => {
    const out = lines(
      eventsToICS([event({ startDate: new Date(2026, 9, 7), endDate: new Date(2026, 9, 9) })], { now: NOW })
    );
    expect(out).toContain("DTSTART;VALUE=DATE:20261007");
    expect(out).toContain("DTEND;VALUE=DATE:20261009"); // exclusive, as in iCalendar
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    const out = lines(
      eventsToICS([event({ title: "A, B; C\\D", description: "line 1\nline 2" })], { now: NOW })
    );
    expect(out).toContain("SUMMARY:A\\, B\\; C\\\\D");
    expect(out).toContain("DESCRIPTION:line 1\\nline 2");
  });

  it("folds lines longer than 75 bytes", () => {
    const out = eventsToICS([event({ title: "x".repeat(200) })], { now: NOW });
    for (const line of lines(out)) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    // Unfolding (CRLF plus one space) restores the title.
    expect(out.replace(/\r\n /g, "")).toContain(`SUMMARY:${"x".repeat(200)}`);
  });

  it("does not split a multi-byte character when folding", () => {
    const title = "é".repeat(100);
    const out = eventsToICS([event({ title })], { now: NOW });
    expect(out.replace(/\r\n /g, "")).toContain(`SUMMARY:${title}`);
  });

  it("writes a recurrence as RRULE and its exceptions as EXDATE", () => {
    const out = lines(
      eventsToICS(
        [
          event({
            startDate: new Date(2026, 9, 5),
            endDate: new Date(2026, 9, 6),
            recurrence: {
              freq: "weekly",
              interval: 2,
              byWeekday: [1, 3],
              count: 5,
              exceptions: [new Date(2026, 9, 12)],
            },
          }),
        ],
        { now: NOW }
      )
    );
    expect(out).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5");
    expect(out).toContain("EXDATE;VALUE=DATE:20261012");
  });

  it("ends a timed series at the end of its last day", () => {
    const out = lines(
      eventsToICS(
        [event({ recurrence: { freq: "daily", until: new Date(2026, 9, 20) } })],
        { now: NOW }
      )
    );
    const expected = new Date(2026, 9, 20, 23, 59, 59).toISOString().replace(/[-:]|\.\d{3}/g, "");
    expect(out).toContain(`RRULE:FREQ=DAILY;UNTIL=${expected}`);
  });

  it("writes the resource name as the location when resources are given", () => {
    const resources: ResourceInput[] = [{ id: "atlas", name: "Atlas" }];
    const out = lines(eventsToICS([event({ resourceId: "atlas" })], { now: NOW, resources }));
    expect(out).toContain("LOCATION:Atlas");
    expect(lines(eventsToICS([event({ resourceId: "atlas" })], { now: NOW }))).not.toContain("LOCATION:Atlas");
  });
});

describe("eventsToCSV", () => {
  const resources: ResourceInput[] = [
    { id: "ann", name: "Ann" },
    { id: "bob", name: "Bob" },
  ];
  const local = (h: number) => new Date(2026, 9, 7, h);
  const rows = (csv: string) => csv.split("\r\n").filter(Boolean);

  it("writes a header and one row per event with local dates", () => {
    const csv = eventsToCSV([event({ resourceId: "ann", startDate: local(9), endDate: local(10) })], { resources });
    expect(csv).toBe(
      "id,title,resource,start,end,description\r\n" + "e1,Standup,Ann,2026-10-07 09:00,2026-10-07 10:00,\r\n"
    );
  });

  it("writes one row per resource of an event shared by several", () => {
    const csv = eventsToCSV([event({ resourceIds: ["ann", "bob"] })], { resources });
    expect(rows(csv).slice(1).map((r) => r.split(",")[2])).toEqual(["Ann", "Bob"]);
  });

  it("leaves the resource empty without one, and falls back to the id for an unknown one", () => {
    expect(rows(eventsToCSV([event({ resourceId: "ann" })]))[1].split(",")[2]).toBe("ann");
    expect(rows(eventsToCSV([event()]))[1].split(",")[2]).toBe("");
  });

  it("quotes cells that contain commas, quotes or newlines", () => {
    const csv = eventsToCSV([event({ title: 'Say "hi", ok', description: "a\nb" })]);
    expect(csv).toContain('"Say ""hi"", ok"');
    expect(csv).toContain('"a\nb"');
  });

  it("defuses cells a spreadsheet would run as a formula", () => {
    const csv = eventsToCSV([
      event({ title: '=HYPERLINK("http://x")' }),
      event({ id: "e2", title: "+1", description: "@SUM(A1)" }),
      event({ id: "e3", title: "-2" }),
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+1");
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).toContain("'-2");
  });
});
