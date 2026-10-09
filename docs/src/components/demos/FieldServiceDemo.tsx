import { useRef, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, ResourceSchedulerHandle, SchedulerEvent } from "@scheduler/types";
import { findAvailableSlots } from "@scheduler/utils/availability";
import { withEvents } from "@scheduler/utils/events";
import { Frame } from "./Frame";
import { AMBER, ROSE, TEAL, at } from "./sample";

const everyDay = [0, 1, 2, 3, 4, 5, 6];
// The same break every day for the next week.
const daily = (hour: number, minute: number, minutes: number) =>
  Array.from({ length: 7 }, (_, day) => ({ start: at(day, hour, minute), end: at(day, hour, minute + minutes) }));

// A shift is the technician's business hours; lunch and training are unavailable time.
const technicians: ResourceInput[] = [
  { id: "ann", name: "Ann Lee", businessHours: { daysOfWeek: everyDay, startHour: 7, endHour: 15 }, unavailable: daily(12, 0, 30) },
  { id: "ben", name: "Ben Ruiz", businessHours: { daysOfWeek: everyDay, startHour: 11, endHour: 19 }, unavailable: daily(15, 0, 30) },
  {
    id: "cy",
    name: "Cy Ortiz",
    businessHours: { daysOfWeek: everyDay, startHour: 7, endHour: 19 },
    unavailable: [{ start: at(0, 13), end: at(0, 16) }], // training this afternoon
  },
];

const jobs = (): SchedulerEvent[] => [
  { id: "j1", title: "Boiler service", resourceId: "ann", startDate: at(0, 8), endDate: at(0, 9, 30), color: TEAL },
  { id: "j2", title: "Meter install", resourceId: "ann", startDate: at(0, 9, 30), endDate: at(0, 10, 30), color: TEAL },
  { id: "j3", title: "Leak repair", resourceId: "ben", startDate: at(0, 11), endDate: at(0, 12, 30), color: ROSE },
  { id: "j4", title: "Pump check", resourceId: "ben", startDate: at(0, 13), endDate: at(0, 14), color: TEAL },
  { id: "j5", title: "Inspection", resourceId: "cy", startDate: at(0, 8), endDate: at(0, 10), color: TEAL },
  { id: "j6", title: "AC repair", resourceId: "cy", startDate: at(0, 10, 30), endDate: at(0, 12), color: AMBER },
];

// Work waiting for a technician. Not in the scheduler until someone is chosen.
const waiting = () => [
  { id: "q1", title: "No heat, 4 Oak Ave", minutes: 90, color: ROSE },
  { id: "q2", title: "Thermostat, 9 Pine Rd", minutes: 60, color: AMBER },
  { id: "q3", title: "Annual check, 2 Elm St", minutes: 120, color: TEAL },
];

const when = (d: Date) =>
  d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

/** A dispatch board: shifts, lunch, a queue of jobs and "earliest technician who can take it". */
export default function FieldServiceDemo() {
  const [events, setEvents] = useState<SchedulerEvent[]>(jobs);
  const [queue, setQueue] = useState(waiting);
  const [log, setLog] = useState("");
  const ref = useRef<ResourceSchedulerHandle>(null);

  const assign = (job: (typeof queue)[number]) => {
    // The earliest slot each technician has from now on, and the best of those.
    const from = new Date();
    const to = at(3, 19);
    const best = withEvents(technicians, events)
      .flatMap((tech) =>
        findAvailableSlots(tech, { from, to, duration: job.minutes, step: 30, limit: 1 }).map((slot) => ({ tech, slot }))
      )
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime())[0];
    if (!best) return setLog(`Nobody can take "${job.title}" in the next three days`);

    const { tech, slot } = best;
    setEvents((all) => [
      ...all,
      { id: `job-${job.id}`, title: job.title, resourceId: tech.id, startDate: slot.start, endDate: slot.end, color: job.color },
    ]);
    setQueue((q) => q.filter((j) => j.id !== job.id));
    ref.current?.goTo(slot.start);
    setLog(`Assigned "${job.title}" to ${tech.name}, ${when(slot.start)}`);
  };

  const reassign = (job: SchedulerEvent, resourceId: string, start: Date, end: Date) => {
    setEvents((all) => all.map((e) => (e.id === job.id ? { ...e, resourceId, startDate: start, endDate: end } : e)));
    setLog(`Moved "${job.title}" to ${technicians.find((t) => t.id === resourceId)?.name}`);
  };

  return (
    <Frame
      height={420}
      log={log}
      controls={
        <>
          {queue.map((job) => (
            <button key={job.id} type="button" onClick={() => assign(job)}>
              Assign: {job.title} ({job.minutes} min)
            </button>
          ))}
          {queue.length === 0 && <span>Queue empty.</span>}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEvents(jobs());
              setQueue(waiting());
              setLog("");
            }}
          >
            Reset
          </button>
        </>
      }
      caption="Each button finds the earliest slot any technician has from now on, inside their shift and around lunch, training and their other jobs, and books it. Ann works 7 to 15, Ben 11 to 19, Cy 7 to 19 with training this afternoon. Drag or resize jobs: they cannot overlap or touch the grey."
    >
      <ResourceScheduler
        ref={ref}
        resources={technicians}
        events={events}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={7}
        dayEndHour={19}
        timeColumnWidth="70px"
        resourceColumnWidth="170px"
        ariaLabel="Technician schedule"
        showUtilization
        nowIndicator
        blockUnavailable
        eventOverlap={false}
        onEventDrop={(job, _from, to, start, end) => reassign(job, to, start, end)}
        onEventResize={(job, resourceId, start, end) => reassign(job, resourceId, start, end)}
      />
    </Frame>
  );
}
