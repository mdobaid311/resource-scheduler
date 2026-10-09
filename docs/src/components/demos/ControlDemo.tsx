import { useRef, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceSchedulerHandle } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

const day = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
// `end` is exclusive, so the last day shown is a moment before it.
const lastDay = (end: Date) => day(new Date(end.getTime() - 1));

/** onRangeChange for lazy loading, and the ref handle for driving the view. */
export default function ControlDemo() {
  const { resources } = useSchedule(teamWeek);
  const ref = useRef<ResourceSchedulerHandle>(null);
  const [log, setLog] = useState("");

  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  return (
    <Frame
      height={340}
      log={log}
      controls={
        <>
          <button type="button" onClick={() => ref.current?.goTo(inDays(21))}>
            goTo(in 3 weeks)
          </button>
          <button type="button" onClick={() => ref.current?.setView(ViewType.Month)}>
            setView(Month)
          </button>
          <button
            type="button"
            onClick={() => {
              const range = ref.current?.getVisibleRange();
              if (range) setLog(`getVisibleRange(): ${day(range.start)} to ${lastDay(range.end)}`);
            }}
          >
            getVisibleRange()
          </button>
        </>
      }
    >
      <ResourceScheduler
        ref={ref}
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth="150px"
        dateColumnWidth="110px"
        onRangeChange={({ start, end, view }) =>
          setLog(`onRangeChange: fetch ${day(start)} to ${lastDay(end)} (${view} view)`)
        }
      />
    </Frame>
  );
}
