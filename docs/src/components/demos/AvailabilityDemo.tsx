import { useMemo, useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { at, teamDay } from "./sample";
import { useSchedule } from "./useSchedule";

/** businessHours, per-resource overrides, unavailable ranges, blockUnavailable and nowIndicator. */
export default function AvailabilityDemo() {
  const { resources: base, addEvent, move, resize, log, setLog } = useSchedule(teamDay);
  const [shade, setShade] = useState(true);
  const [block, setBlock] = useState(true);
  const [nowLine, setNowLine] = useState(true);

  // Ann is out at lunch, Bob works a late shift, Chen is always on call.
  const resources = useMemo(
    () =>
      base.map((r) =>
        r.id === "ann"
          ? { ...r, unavailable: [{ start: at(0, 12), end: at(0, 13) }] }
          : r.id === "bob"
          ? { ...r, businessHours: { startHour: 12, endHour: 20 } }
          : r.id === "chen"
          ? { ...r, businessHours: false as const }
          : r
      ),
    [base]
  );

  return (
    <Frame
      height={410}
      log={log}
      controls={
        <>
          <label>
            <input type="checkbox" checked={shade} onChange={(e) => setShade(e.target.checked)} />
            Business hours (9 to 17)
          </label>
          <label>
            <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
            Block unavailable
          </label>
          <label>
            <input type="checkbox" checked={nowLine} onChange={(e) => setNowLine(e.target.checked)} />
            Now line
          </label>
        </>
      }
      caption="Ann is out 12 to 13, Bob works 12 to 20, Chen is always available. Drag an event or select slots over the grey."
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Day}
        availableViews={[ViewType.Day, ViewType.Week]}
        dayStartHour={6}
        dayEndHour={24}
        timeColumnWidth="90px"
        resourceColumnWidth="150px"
        businessHours={shade ? {} : undefined}
        blockUnavailable={block}
        nowIndicator={nowLine}
        eventOverlap={false}
        onEventCreate={(event, resourceId) => {
          addEvent(resourceId, { ...event, title: "New", color: "#3b82f6" });
          setLog("Created an event");
        }}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
