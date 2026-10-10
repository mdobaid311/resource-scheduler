import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, SchedulerEvent, SlotSelection } from "@scheduler/types";
import { Frame } from "./Frame";
import { AMBER, BLUE, VIOLET, weekDay } from "./sample";

// Your three tables: people, projects (with a window) and allocations of one person to one project.
const people: ResourceInput[] = [
  { id: "ann", name: "Ann Lee" },
  { id: "bo", name: "Bo Kim" },
  { id: "cy", name: "Cy Ortiz" },
  { id: "di", name: "Di Park", unavailable: [{ start: weekDay(7), end: weekDay(12) }] }, // leave next week
  { id: "ed", name: "Ed Moss" }, // on the bench
];

interface Project {
  name: string;
  color: string;
  /** Nobody can be allocated outside it. `to` is exclusive. */
  from: Date;
  to: Date;
}
const projects: Record<string, Project> = {
  apollo: { name: "Apollo", color: BLUE, from: weekDay(-14), to: weekDay(21) },
  borealis: { name: "Borealis", color: VIOLET, from: weekDay(0), to: weekDay(35) },
  cassini: { name: "Cassini", color: AMBER, from: weekDay(-7), to: weekDay(14) },
};

interface Allocation {
  id: string;
  personId: string;
  projectId: string;
  start: Date;
  end: Date; // exclusive: whole days
}
const alloc = (id: string, personId: string, projectId: string, firstDay: number, lastDay: number): Allocation => ({
  id,
  personId,
  projectId,
  start: weekDay(firstDay),
  end: weekDay(lastDay + 1),
});
const initial = (): Allocation[] => [
  alloc("a1", "ann", "apollo", -7, 6),
  alloc("a2", "ann", "borealis", 7, 20),
  alloc("a3", "bo", "cassini", -4, 9),
  alloc("a4", "bo", "apollo", 14, 20),
  alloc("a5", "cy", "borealis", 0, 13),
  alloc("a6", "di", "apollo", -3, 4),
  alloc("a7", "di", "cassini", 12, 20),
];

/** Whole-day allocations of people to projects, with project windows, leave and a bench bar. */
export default function ProjectAllocationDemo() {
  const [allocations, setAllocations] = useState<Allocation[]>(initial);
  const [projectId, setProjectId] = useState("apollo");
  const [log, setLog] = useState("");

  // The scheduler gets plain events: your allocations, joined to their project.
  const events: SchedulerEvent[] = allocations.map((a) => ({
    id: a.id,
    title: projects[a.projectId].name,
    resourceId: a.personId,
    startDate: a.start,
    endDate: a.end,
    color: projects[a.projectId].color,
  }));

  const change = (id: string, patch: Partial<Allocation>) =>
    setAllocations((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const create = ({ resourceId, start, end }: SlotSelection) => {
    setAllocations((all) => [...all, { id: `a-${Date.now()}`, personId: resourceId, projectId, start, end }]);
    setLog(`Allocated ${people.find((p) => p.id === resourceId)?.name} to ${projects[projectId].name}`);
  };

  return (
    <Frame
      height={560}
      log={log}
      controls={
        <label>
          Select days to allocate to
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {Object.entries(projects).map(([id, p]) => (
              <option key={id} value={id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      }
      caption="Bars show allocated working days against available ones: Ed is on the bench at 0%, Di's leave next week is not counted, and nobody can be placed outside a project's dates (Cassini ends in two weeks). Weekends are hidden; an allocation continues over them."
    >
      <ResourceScheduler
        resources={people}
        events={events}
        initialView={ViewType.Month}
        availableViews={[ViewType.Month, ViewType.Quarter]}
        hideWeekends
        weekStartsOn={1}
        businessHours={{}}
        showUtilization
        blockUnavailable
        eventOverlap={false}
        resourceColumnWidth="170px"
        dateColumnWidth="46px"
        ariaLabel="Project allocations"
        onSlotSelect={create}
        onEventDrop={(event, _from, personId, start, end) => {
          change(event.id, { personId, start, end });
          setLog(`Moved ${event.title} to ${people.find((p) => p.id === personId)?.name}`);
        }}
        onEventResize={(event, _personId, start, end) => {
          change(event.id, { start, end });
          setLog(`Changed the dates of ${event.title}`);
        }}
        // Inside the project's dates only. An existing allocation knows its project; a new one is the selected project.
        isValidDrop={(event, { start, end }) => {
          const project =
            projects[allocations.find((a) => a.id === event.id)?.projectId ?? projectId];
          return start >= project.from && end <= project.to;
        }}
      />
    </Frame>
  );
}
