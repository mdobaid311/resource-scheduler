import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceScheduler } from "./ResourceScheduler";
import { type Recurrence, type Resource, ViewType } from "./types";

// A series is stored as the instant of its first occurrence and repeats at the
// same wall-clock time in the scheduler's zone, also across a clock change in
// that zone, whatever zone the viewer's machine is in. Every date below is an
// instant (a Z), and the viewer's zone is switched per run.
const VIEWERS = ["UTC", "America/New_York", "Australia/Lord_Howe", "Asia/Kolkata"];
const ORIGINAL_TZ = process.env.TZ;
const at = (iso: string) => new Date(iso);

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-06-01T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

// The instants the occurrences report, in order: draw the view and click every
// cell of the row, which hands the event that starts there to onEventClick.
const reported = (
  timeZone: string,
  view: ViewType,
  initialDate: string,
  first: [string, string],
  recurrence: Recurrence
) => {
  const onEventClick = vi.fn();
  const resources: Resource[] = [
    {
      id: "r1",
      name: "Ann",
      events: [
        {
          id: "s",
          title: "Job",
          startDate: at(first[0]),
          endDate: at(first[1]),
          recurrence,
        },
      ],
    },
  ];
  render(
    <ResourceScheduler
      resources={resources}
      timeZone={timeZone}
      initialView={view}
      initialDate={at(initialDate)}
      weekStartsOn={1}
      onEventClick={onEventClick}
    />
  );
  const out: string[] = [];
  for (const cell of document.querySelectorAll<HTMLElement>('[data-rs-resource="r1"]')) {
    onEventClick.mockClear();
    fireEvent.click(cell);
    const event = onEventClick.mock.calls[0]?.[0];
    if (event) out.push(event.startDate.toISOString());
  }
  cleanup();
  return out;
};

describe.each(VIEWERS)("recurring events in a zone, viewed from %s", (viewer) => {
  beforeEach(() => {
    process.env.TZ = viewer;
  });

  it("repeats daily at 09:00 in Paris when daylight saving time ends there", () => {
    // Sunday 25 October 2026: 03:00 CEST becomes 02:00 CET.
    expect(
      reported("Europe/Paris", ViewType.Week, "2026-10-22T07:00:00Z", ["2026-10-19T07:00:00Z", "2026-10-19T08:00:00Z"], { freq: "daily" })
    ).toEqual([
      "2026-10-19T07:00:00.000Z",
      "2026-10-20T07:00:00.000Z",
      "2026-10-21T07:00:00.000Z",
      "2026-10-22T07:00:00.000Z",
      "2026-10-23T07:00:00.000Z",
      "2026-10-24T07:00:00.000Z",
      "2026-10-25T08:00:00.000Z", // 09:00 CET
    ]);
  });

  it("repeats daily at 09:00 in Paris when daylight saving time starts there", () => {
    // Sunday 29 March 2026: 02:00 CET becomes 03:00 CEST.
    expect(
      reported("Europe/Paris", ViewType.Week, "2026-03-26T08:00:00Z", ["2026-03-27T08:00:00Z", "2026-03-27T09:00:00Z"], { freq: "daily" })
    ).toEqual(["2026-03-27T08:00:00.000Z", "2026-03-28T08:00:00.000Z", "2026-03-29T07:00:00.000Z"]);
  });

  it("repeats daily in the southern hemisphere when daylight saving time starts in Sydney", () => {
    // Sunday 4 October 2026: 02:00 AEST becomes 03:00 AEDT. 09:00 is 23:00 UTC the day before.
    expect(
      reported("Australia/Sydney", ViewType.Week, "2026-10-01T23:00:00Z", ["2026-09-30T23:00:00Z", "2026-10-01T00:00:00Z"], { freq: "daily" })
    ).toEqual([
      "2026-09-30T23:00:00.000Z",
      "2026-10-01T23:00:00.000Z",
      "2026-10-02T23:00:00.000Z",
      "2026-10-03T22:00:00.000Z", // 09:00 AEDT on Sunday the 4th
    ]);
  });

  it("honours exceptions and an end day, which are calendar days in the zone", () => {
    const rule: Recurrence = { freq: "daily", until: new Date(2026, 9, 23), exceptions: [new Date(2026, 9, 21)] };
    expect(
      reported("Europe/Paris", ViewType.Week, "2026-10-22T07:00:00Z", ["2026-10-19T07:00:00Z", "2026-10-19T08:00:00Z"], rule)
    ).toEqual(["2026-10-19T07:00:00.000Z", "2026-10-20T07:00:00.000Z", "2026-10-22T07:00:00.000Z", "2026-10-23T07:00:00.000Z"]);
  });

  it("repeats the last Friday of the month at the same wall-clock time across New York's change", () => {
    // 12:00 in New York: 16:00 UTC while it is EDT, 17:00 UTC once it is EST (1 November).
    const first: [string, string] = ["2026-09-25T16:00:00Z", "2026-09-25T17:00:00Z"];
    const rule: Recurrence = { freq: "monthly", byWeekday: [5], bySetPos: [-1] };
    expect(reported("America/New_York", ViewType.Month, "2026-10-15T16:00:00Z", first, rule)).toEqual(["2026-10-30T16:00:00.000Z"]);
    expect(reported("America/New_York", ViewType.Month, "2026-11-15T17:00:00Z", first, rule)).toEqual(["2026-11-27T17:00:00.000Z"]);
  });

  it("repeats hourly on the wall clock of the zone, on the day the clocks go back in Paris", () => {
    // Every 4 hours from midnight on Sunday 25 October: 00:00 CEST, then 04:00 CET onwards.
    expect(
      reported("Europe/Paris", ViewType.Day, "2026-10-25T10:00:00Z", ["2026-10-24T22:00:00Z", "2026-10-24T23:00:00Z"], {
        freq: "hourly",
        interval: 4,
      })
    ).toEqual([
      "2026-10-24T22:00:00.000Z", // 00:00 CEST
      "2026-10-25T03:00:00.000Z", // 04:00 CET
      "2026-10-25T07:00:00.000Z",
      "2026-10-25T11:00:00.000Z",
      "2026-10-25T15:00:00.000Z",
      "2026-10-25T19:00:00.000Z",
    ]);
  });

  it("does not move an hourly series when the viewer's own clocks change", () => {
    // The clocks in New York went back at 06:00 UTC on 1 November, a day when Paris did nothing.
    expect(
      reported("Europe/Paris", ViewType.Day, "2026-11-01T10:00:00Z", ["2026-10-30T23:00:00Z", "2026-10-31T00:00:00Z"], {
        freq: "hourly",
        interval: 4,
      })
    ).toEqual([
      "2026-10-31T23:00:00.000Z", // 00:00 CET on the 1st
      "2026-11-01T03:00:00.000Z",
      "2026-11-01T07:00:00.000Z",
      "2026-11-01T11:00:00.000Z",
      "2026-11-01T15:00:00.000Z",
      "2026-11-01T19:00:00.000Z",
    ]);
  });
});
