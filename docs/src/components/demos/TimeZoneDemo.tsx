import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource } from "@scheduler/types";
import { Frame } from "./Frame";
import { BLUE, AMBER, GREEN } from "./sample";
import { useSchedule } from "./useSchedule";

const ZONES = [
  ["", "This browser's zone"],
  ["America/New_York", "New York"],
  ["Europe/London", "London"],
  ["Asia/Kolkata", "Kolkata"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
] as const;

// Today in UTC. The events are instants, so they are the same moments in every zone.
const now = new Date();
const utc = (hour: number, minute = 0) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));

const rooms = (): Resource[] => [
  {
    id: "atlas",
    name: "Atlas (8 seats)",
    events: [{ id: "t1", title: "Sprint planning", startDate: utc(8), endDate: utc(9, 30), color: BLUE }],
  },
  {
    id: "borealis",
    name: "Borealis (4 seats)",
    events: [{ id: "t2", title: "Interview", startDate: utc(9), endDate: utc(10), color: AMBER }],
  },
  {
    id: "cirrus",
    name: "Cirrus (12 seats)",
    events: [{ id: "t3", title: "Support handover", startDate: utc(10, 30), endDate: utc(11, 30), color: GREEN }],
  },
];

/** The same three events, shown in the zone you pick. Moves report the instant to store. */
export default function TimeZoneDemo() {
  const { resources, move, log, setLog } = useSchedule(rooms);
  const [zone, setZone] = useState("Asia/Tokyo");

  return (
    <Frame
      height={340}
      log={log}
      controls={
        <label>
          Time zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {ZONES.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
      }
      caption="Sprint planning is at 08:00 UTC, the interview at 09:00 and the handover at 10:30. Business hours are 9 to 17 in the zone shown."
    >
      <ResourceScheduler
        resources={resources}
        timeZone={zone || undefined}
        // A fixed midday in UTC keeps every zone on the same calendar day.
        initialDate={utc(12)}
        initialView={ViewType.Day}
        allowViewChange={false}
        nowIndicator
        businessHours={{ startHour: 9, endHour: 17 }}
        timeColumnWidth="64px"
        resourceColumnWidth="clamp(104px, 30vw, 170px)"
        onEventDrop={(event, from, to, start, end) => {
          move(event, from, to, start, end);
          setLog(`Moved "${event.title}": store ${start.toISOString()}`);
        }}
      />
    </Frame>
  );
}
