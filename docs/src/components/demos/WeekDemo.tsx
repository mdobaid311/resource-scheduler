import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** weekStartsOn and hideWeekends. */
export default function WeekDemo() {
  const { resources } = useSchedule(teamWeek);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1);
  const [hideWeekends, setHideWeekends] = useState(true);

  return (
    <Frame
      height={340}
      controls={
        <>
          <label>
            Week starts on
            <select
              value={weekStartsOn}
              onChange={(e) => setWeekStartsOn(Number(e.target.value) as typeof weekStartsOn)}
            >
              {DAYS.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={hideWeekends}
              onChange={(e) => setHideWeekends(e.target.checked)}
            />
            Hide weekends
          </label>
        </>
      }
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        weekStartsOn={weekStartsOn}
        hideWeekends={hideWeekends}
        resourceColumnWidth="150px"
        dateColumnWidth="110px"
      />
    </Frame>
  );
}
