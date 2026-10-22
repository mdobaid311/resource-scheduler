import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

/** Quick start: the minimum an app writes. */
export default function BasicDemo() {
  const { resources, addEvent, move, resize, log, setLog } = useSchedule(teamWeek);
  return (
    <Frame log={log} caption="Drag across empty days to create, drag an event to move it, drag its edge to resize.">
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth="clamp(104px, 30vw, 170px)"
        dateColumnWidth="120px"
        onEventCreate={(event, resourceId) => {
          addEvent(resourceId, event);
          setLog(`Created "${event.title}"`);
        }}
        onEventDrop={move}
        onEventResize={resize}
        onEventClick={(event) => setLog(`Clicked "${event.title}"`)}
      />
    </Frame>
  );
}
