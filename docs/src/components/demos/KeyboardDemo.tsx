import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamDay } from "./sample";
import { useSchedule } from "./useSchedule";

/** Everything the mouse can do has a key. Tab into the grid, or to an event. */
export default function KeyboardDemo() {
  const { resources, addEvent, move, resize, log, setLog } = useSchedule(teamDay);
  return (
    <Frame
      height={400}
      log={log}
      caption={
        <>
          Tab to the grid, then <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd>. Tab on to an
          event: <kbd>Enter</kbd> details, <kbd>Space</kbd> pick up, arrows move, <kbd>Shift</kbd>+<kbd>→</kbd> resize,{" "}
          <kbd>Space</kbd> drop, <kbd>Esc</kbd> cancel.
        </>
      }
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={8}
        dayEndHour={18}
        timeColumnWidth="80px"
        resourceColumnWidth="150px"
        eventOverlap={false}
        onEventCreate={(event, resourceId) => {
          addEvent(resourceId, event);
          setLog("Created");
        }}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
