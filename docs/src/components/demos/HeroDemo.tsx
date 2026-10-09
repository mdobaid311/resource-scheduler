import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

/** The landing page demo: create, move, resize, with double booking rejected. */
export default function HeroDemo({
  height = 460,
  compact = false,
}: {
  height?: number;
  /** Narrower columns, used for the recorded GIF and the social image. */
  compact?: boolean;
}) {
  const { resources, addEvent, move, resize } = useSchedule(teamWeek);
  return (
    <Frame height={height}>
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        availableViews={[ViewType.Week, ViewType.Month]}
        resourceColumnWidth={compact ? "150px" : "170px"}
        dateColumnWidth={compact ? "100px" : "120px"}
        eventOverlap={false}
        onEventCreate={(event, resourceId) => addEvent(resourceId, event)}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
