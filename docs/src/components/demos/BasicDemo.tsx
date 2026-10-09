import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

/** Quick start: the minimum an app writes. */
export default function BasicDemo() {
  const { resources, addEvent, move, log, setLog } = useSchedule(teamWeek);
  return (
    <Frame log={log} caption="Drag across empty days to create, drag an event to move it.">
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth="170px"
        dateColumnWidth="120px"
        onEventCreate={(event, resourceId) => {
          addEvent(resourceId, event);
          setLog(`Created "${event.title}"`);
        }}
        onEventDrop={move}
        onEventClick={(event) => setLog(`Clicked "${event.title}"`)}
      />
    </Frame>
  );
}
