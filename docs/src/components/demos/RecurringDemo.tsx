import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SchedulerEvent } from "@scheduler/types";
import { Frame } from "./Frame";
import { BLUE, TEAL, VIOLET, week } from "./sample";

const people = [
  { id: "ann", name: "Ann Lee" },
  { id: "bob", name: "Bob Ruiz" },
  { id: "chen", name: "Chen Wu" },
];

// Three series, kept as three events: the scheduler draws the occurrences.
const initial = (): SchedulerEvent[] => [
  {
    id: "standup",
    title: "Standup",
    resourceId: "ann",
    startDate: week(1, 9),
    endDate: week(1, 9, 30),
    color: BLUE,
    recurrence: { freq: "weekly", byWeekday: [1, 2, 3, 4, 5] },
  },
  {
    id: "review",
    title: "Sprint review",
    resourceId: "bob",
    startDate: week(5, 15),
    endDate: week(5, 16),
    color: TEAL,
    recurrence: { freq: "weekly", interval: 2 },
  },
  {
    id: "planning",
    title: "Monthly planning",
    resourceId: "chen",
    startDate: week(2, 13),
    endDate: week(2, 14),
    color: VIOLET,
    recurrence: { freq: "monthly" },
  },
];

/** Recurring events, and what to do when the user moves one occurrence. */
export default function RecurringDemo() {
  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const [scope, setScope] = useState<"one" | "all">("one");
  const [log, setLog] = useState("");

  // Handlers receive an occurrence (id "standup::2026-10-07", seriesId "standup").
  const change = (event: SchedulerEvent, resourceId: string, start: Date, end: Date) => {
    if (!event.seriesId) {
      setEvents((all) =>
        all.map((e) => (e.id === event.id ? { ...e, resourceId, startDate: start, endDate: end } : e))
      );
      return;
    }
    setEvents((all) => {
      const series = all.find((e) => e.id === event.seriesId);
      if (!series?.recurrence) return all;

      if (scope === "all") {
        // The whole series: the new resource and time of day, and the new day.
        const midnight = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
        const days = Math.round((midnight(start) - midnight(event.startDate)) / 86_400_000);
        const { byWeekday } = series.recurrence;

        // With a weekday list, swap the weekday; otherwise move the whole series.
        const moveBy = byWeekday ? 0 : days;
        const startDate = new Date(series.startDate);
        startDate.setDate(startDate.getDate() + moveBy);
        startDate.setHours(start.getHours(), start.getMinutes());
        const endDate = new Date(series.endDate);
        endDate.setDate(endDate.getDate() + moveBy);
        endDate.setHours(end.getHours(), end.getMinutes());

        const recurrence = byWeekday
          ? {
              ...series.recurrence,
              byWeekday: [
                ...new Set(
                  byWeekday.map((d) => (d === event.startDate.getDay() ? start.getDay() : d))
                ),
              ],
            }
          : series.recurrence;
        return all.map((e) =>
          e.id === series.id ? { ...e, resourceId, startDate, endDate, recurrence } : e
        );
      }

      // This one only: skip it in the series and add a one-off event instead.
      const oneOff: SchedulerEvent = {
        ...event,
        id: `one-off-${Date.now()}`,
        seriesId: undefined,
        resourceId,
        startDate: start,
        endDate: end,
      };
      const skipped = all.map((e) =>
        e.id === series.id
          ? { ...e, recurrence: { ...series.recurrence!, exceptions: [...(series.recurrence!.exceptions ?? []), event.startDate] } }
          : e
      );
      return [...skipped, oneOff];
    });
    setLog(scope === "all" ? `Changed the whole "${event.title}" series` : `Moved only this "${event.title}"`);
  };

  return (
    <Frame
      height={340}
      log={log}
      controls={
        <label>
          When you move or resize an occurrence, change
          <select value={scope} onChange={(e) => setScope(e.target.value as "one" | "all")}>
            <option value="one">this event only</option>
            <option value="all">the whole series</option>
          </select>
        </label>
      }
      caption="Standup repeats every weekday, the review every second Friday, planning monthly. Try the month view too."
    >
      <ResourceScheduler
        resources={people}
        events={events}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth="150px"
        dateColumnWidth="110px"
        onEventDrop={(event, _from, to, start, end) => change(event, to, start, end)}
        onEventResize={(event, resourceId, start, end) => change(event, resourceId, start, end)}
      />
    </Frame>
  );
}
