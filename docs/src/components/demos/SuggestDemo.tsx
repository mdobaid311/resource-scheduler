import { useMemo, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, SchedulerEvent } from "@scheduler/types";
import { withEvents } from "@scheduler/utils/events";
import { suggestResources } from "@scheduler/utils/suggest";
import { Frame } from "./Frame";
import { TEAL, VIOLET, at } from "./sample";

const everyDay = [0, 1, 2, 3, 4, 5, 6];

// Shifts are business hours, lunch and training are unavailable time, and the van
// crew has a capacity of 2: two jobs can run at once.
const crew: ResourceInput[] = [
  {
    id: "ann",
    name: "Ann Lee",
    businessHours: { daysOfWeek: everyDay, startHour: 7, endHour: 15 },
    unavailable: [{ start: at(0, 12), end: at(0, 12, 30) }],
  },
  { id: "ben", name: "Ben Ruiz", businessHours: { daysOfWeek: everyDay, startHour: 11, endHour: 19 } },
  {
    id: "cy",
    name: "Cy Ortiz",
    businessHours: { daysOfWeek: everyDay, startHour: 7, endHour: 19 },
    unavailable: [{ start: at(0, 13), end: at(0, 16) }], // training
  },
  { id: "van", name: "Van crew (2)", capacity: 2, businessHours: { daysOfWeek: everyDay, startHour: 7, endHour: 19 } },
];

const booked = (): SchedulerEvent[] => [
  { id: "j1", title: "Boiler", resourceId: "ann", startDate: at(0, 8), endDate: at(0, 9, 30), color: TEAL },
  { id: "j2", title: "Meter", resourceId: "ann", startDate: at(0, 9, 30), endDate: at(0, 10, 30), color: TEAL },
  { id: "j3", title: "Leak", resourceId: "ben", startDate: at(0, 11), endDate: at(0, 12, 30), color: TEAL },
  { id: "j4", title: "Pump", resourceId: "ben", startDate: at(0, 13), endDate: at(0, 14), color: TEAL },
  { id: "j5", title: "Inspection", resourceId: "cy", startDate: at(0, 8), endDate: at(0, 10), color: TEAL },
  { id: "j6", title: "AC", resourceId: "cy", startDate: at(0, 10, 30), endDate: at(0, 12), color: TEAL },
  { id: "j7", title: "Install", resourceId: "van", startDate: at(0, 7), endDate: at(0, 11), color: TEAL },
  { id: "j8", title: "Survey", resourceId: "van", startDate: at(0, 7), endDate: at(0, 9), color: TEAL },
];

const jobs = [
  { id: "thermostat", title: "Thermostat", minutes: 60 },
  { id: "boiler", title: "Boiler service", minutes: 120 },
  { id: "check", title: "Annual check", minutes: 180 },
];

type Strategy = "earliest" | "least-booked" | "most-booked";
const strategies: { id: Strategy; label: string }[] = [
  { id: "earliest", label: "Earliest slot" },
  { id: "least-booked", label: "Least booked" },
  { id: "most-booked", label: "Most booked" },
];

const time = (d: Date) =>
  `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;

/** suggestResources: pick a job and a strategy, see who is ranked first, and book it. */
export default function SuggestDemo() {
  const [events, setEvents] = useState<SchedulerEvent[]>(booked);
  const [jobId, setJobId] = useState(jobs[0].id);
  const [strategy, setStrategy] = useState<Strategy>("earliest");
  const [log, setLog] = useState("");
  const resources = useMemo(() => withEvents(crew, events), [events]);
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const name = (id: string) => crew.find((r) => r.id === id)?.name;

  const suggestions = useMemo(
    () => suggestResources(resources, { from: at(0, 7), to: at(0, 19), duration: job.minutes }, { strategy }),
    [resources, job, strategy]
  );

  const book = () => {
    const top = suggestions[0];
    if (!top) return setLog(`Nobody can take "${job.title}" today`);
    setEvents((all) => [
      ...all,
      { id: `new-${all.length}`, title: job.title, resourceId: top.resourceId, startDate: top.start, endDate: top.end, color: VIOLET },
    ]);
    setLog(`Booked "${job.title}" with ${name(top.resourceId)} at ${time(top.start)}`);
  };

  return (
    <Frame
      height={400}
      log={log}
      controls={
        <>
          <label>
            Job
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.minutes} min)
                </option>
              ))}
            </select>
          </label>
          <label>
            Rank by
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={book}>
            Book the top pick
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEvents(booked());
              setLog("");
            }}
          >
            Reset
          </button>
        </>
      }
      caption={
        <>
          <ol aria-label="Suggestions" style={{ margin: "0 0 0.5rem", paddingInlineStart: "1.25rem" }}>
            {suggestions.map((s) => (
              <li key={s.resourceId}>
                {name(s.resourceId)}, {time(s.start)} to {time(s.end)}, {Math.round((s.utilization ?? 0) * 100)}% booked
              </li>
            ))}
            {suggestions.length === 0 && <li>Nobody can take it today.</li>}
          </ol>
          Ann works 7 to 15, Ben 11 to 19, Cy 7 to 19 (training 13 to 16), and the crew can run two jobs at once. The list is what <code>suggestResources</code> returns for the job between 7 and 19. Drag a job: the board accepts it only where the same call says the resource can take it.
        </>
      }
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={7}
        dayEndHour={19}
        timeColumnWidth="70px"
        resourceColumnWidth="clamp(104px, 30vw, 170px)"
        ariaLabel="Crew schedule"
        showUtilization
        isValidDrop={(moved, { resourceId, start, end }) =>
          suggestResources(resources, { start, end, event: moved }, { resourceIds: [resourceId] }).length > 0
        }
        onEventDrop={(moved, _from, to, start, end) =>
          setEvents((all) => all.map((e) => (e.id === moved.id ? { ...e, resourceId: to, startDate: start, endDate: end } : e)))
        }
        onEventResize={(moved, resourceId, start, end) =>
          setEvents((all) => all.map((e) => (e.id === moved.id ? { ...e, resourceId, startDate: start, endDate: end } : e)))
        }
      />
    </Frame>
  );
}
