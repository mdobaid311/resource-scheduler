import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource, SchedulerEvent } from "@scheduler/types";
import { Frame } from "./Frame";
import { BLUE, GREEN, AMBER, VIOLET, weekDay } from "./sample";

type Booking = SchedulerEvent & { resourceId: string };

const people: Resource[] = [
  { id: "ann", name: "Ann Lee", events: [] },
  { id: "bob", name: "Bob Ruiz", events: [] },
  { id: "chen", name: "Chen Wu", events: [] },
];

const initial = (): Booking[] => [
  { id: "1", resourceId: "ann", title: "Standup", startDate: weekDay(0, 9), endDate: weekDay(0, 10), color: BLUE },
  { id: "2", resourceId: "ann", title: "Design review", startDate: weekDay(2, 11), endDate: weekDay(2, 13), color: VIOLET },
  { id: "3", resourceId: "bob", title: "API work", startDate: weekDay(0, 9), endDate: weekDay(3, 17), color: GREEN },
  { id: "4", resourceId: "chen", title: "Onboarding", startDate: weekDay(1, 9), endDate: weekDay(2, 17), color: AMBER },
];

/** Tutorial: a flat list of bookings, each naming its resource, with overlaps refused. */
export default function FlatTimelineDemo() {
  const [events, setEvents] = useState<Booking[]>(initial);
  const [log, setLog] = useState("");

  return (
    <Frame log={log} caption="Drag across empty days to create, drag to move, grab an edge to resize. Overlaps are refused.">
      <ResourceScheduler
        resources={people}
        events={events}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth="clamp(104px, 30vw, 170px)"
        dateColumnWidth="120px"
        eventOverlap={false}
        onEventCreate={(event, resourceId) => {
          setEvents((prev) => [...prev, { ...event, id: `e-${Date.now()}`, resourceId }]);
          setLog(`Created "${event.title}"`);
        }}
        onEventDrop={(event, _from, to, start, end) => {
          setEvents((prev) =>
            prev.map((e) => (e.id === event.id ? { ...e, resourceId: to, startDate: start, endDate: end } : e))
          );
          setLog(`Moved "${event.title}"`);
        }}
        onEventResize={(event, _resourceId, start, end) => {
          setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, startDate: start, endDate: end } : e)));
          setLog(`Resized "${event.title}"`);
        }}
      />
    </Frame>
  );
}
