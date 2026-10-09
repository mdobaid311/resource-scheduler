import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource } from "@scheduler/types";
import { Frame } from "./Frame";
import { AMBER, BLUE, GREEN, ROSE, TEAL, VIOLET, week } from "./sample";
import { useSchedule } from "./useSchedule";

// Working hours are Monday to Friday, 9 to 17 (businessHours={{}}), 40 hours a week.
const team = (): Resource[] => [
  {
    id: "ann",
    name: "Ann Lee",
    events: [
      { id: "a1", title: "Sprint work", startDate: week(1, 9), endDate: week(1, 17), color: BLUE },
      { id: "a2", title: "Design review", startDate: week(2, 9), endDate: week(2, 13), color: VIOLET },
      { id: "a3", title: "Sprint work", startDate: week(3, 9), endDate: week(3, 17), color: BLUE },
      { id: "a4", title: "Planning", startDate: week(4, 9), endDate: week(4, 12), color: GREEN },
    ],
  },
  {
    // Booked twice on Monday afternoon: over 100%.
    id: "bob",
    name: "Bob Ruiz",
    events: [
      { id: "b1", title: "API work", startDate: week(1, 9), endDate: week(1, 17), color: TEAL },
      { id: "b2", title: "Incident", startDate: week(1, 13), endDate: week(1, 17), color: ROSE },
      { id: "b3", title: "API work", startDate: week(2, 9), endDate: week(2, 17), color: TEAL },
      { id: "b4", title: "API work", startDate: week(3, 9), endDate: week(3, 17), color: TEAL },
      { id: "b5", title: "On call", startDate: week(4, 9), endDate: week(5, 17), color: ROSE },
    ],
  },
  {
    // Out on Thursday and Friday: only 24 hours are available.
    id: "chen",
    name: "Chen Wu",
    unavailable: [{ start: week(4, 0), end: week(6, 0) }],
    events: [
      { id: "c1", title: "User tests", startDate: week(1, 10), endDate: week(1, 15), color: AMBER },
      { id: "c2", title: "Workshop", startDate: week(2, 9), endDate: week(2, 17), color: VIOLET },
      { id: "c3", title: "Prototype", startDate: week(3, 13), endDate: week(3, 16), color: GREEN },
    ],
  },
  {
    // Part time: Monday, Wednesday and Friday, 9 to 15.
    id: "dana",
    name: "Dana Fox",
    businessHours: { daysOfWeek: [1, 3, 5], startHour: 9, endHour: 15 },
    events: [
      { id: "d1", title: "Roadmap", startDate: week(1, 9), endDate: week(1, 12), color: BLUE },
      { id: "d2", title: "Launch sync", startDate: week(3, 9), endDate: week(3, 15), color: GREEN },
    ],
  },
  {
    // Two test stations: two bookings at once still fit.
    id: "lab",
    name: "Lab (2 stations)",
    capacity: 2,
    events: [
      { id: "l1", title: "Build A", startDate: week(1, 9), endDate: week(1, 17), color: TEAL },
      { id: "l2", title: "Build B", startDate: week(1, 9), endDate: week(1, 17), color: AMBER },
      { id: "l3", title: "Soak test", startDate: week(3, 13), endDate: week(3, 17), color: ROSE },
    ],
  },
];

/** showUtilization: booked against available time per resource, for whatever range is on screen. */
export default function UtilizationDemo() {
  const { resources, move, resize, log } = useSchedule(team);
  const [show, setShow] = useState(true);

  return (
    <Frame
      height={590}
      log={log}
      controls={
        <label>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show utilization
        </label>
      }
      caption="Drag or resize an event and the bars follow. Bob is over 100%, Chen is out Thursday and Friday, Dana works part time, the lab has two stations. Switch to the day or month view to measure another range."
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Day, ViewType.Week, ViewType.Month]}
        businessHours={{}}
        showUtilization={show}
        resourceColumnWidth="190px"
        dateColumnWidth="120px"
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
