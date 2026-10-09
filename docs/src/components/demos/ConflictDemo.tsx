import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SchedulerEvent } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamDay } from "./sample";
import { useSchedule } from "./useSchedule";

type Rule = "none" | "no-overlap" | "hours" | "tentative";

const RULES: Record<Rule, string> = {
  none: "No rules (overlap allowed)",
  "no-overlap": "eventOverlap={false}",
  hours: "isValidDrop: 9:00 to 17:00 only",
  tentative: "eventOverlap: only over 'Deep work'",
};

/** Every rule applies to drag, resize and create, and shows red before you drop. */
export default function ConflictDemo() {
  const { resources, addEvent, move, resize, log, setLog } = useSchedule(teamDay);
  const [rule, setRule] = useState<Rule>("no-overlap");

  const props = {
    none: {},
    "no-overlap": { eventOverlap: false },
    hours: {
      isValidDrop: (_: SchedulerEvent, p: { start: Date; end: Date }) =>
        p.start.getHours() >= 9 && (p.end.getHours() < 17 || (p.end.getHours() === 17 && p.end.getMinutes() === 0)),
    },
    tentative: {
      eventOverlap: (_moving: SchedulerEvent, other: SchedulerEvent) => other.title === "Deep work",
    },
  }[rule];

  return (
    <Frame
      height={400}
      log={log}
      controls={
        <label>
          Rule
          <select value={rule} onChange={(e) => setRule(e.target.value as Rule)}>
            {(Object.keys(RULES) as Rule[]).map((r) => (
              <option key={r} value={r}>
                {RULES[r]}
              </option>
            ))}
          </select>
        </label>
      }
      caption="Drag, resize (grab an edge) or drag-create over another event: a rejected place turns red and nothing is applied."
    >
      <ResourceScheduler
        key={rule}
        resources={resources}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={8}
        dayEndHour={18}
        timeColumnWidth="80px"
        resourceColumnWidth="150px"
        onEventCreate={(event, resourceId) => {
          addEvent(resourceId, event);
          setLog("Created");
        }}
        onEventDrop={move}
        onEventResize={resize}
        {...props}
      />
    </Frame>
  );
}
