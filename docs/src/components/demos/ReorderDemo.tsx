import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource } from "@scheduler/types";
import { moveResource, reorderGroup } from "@scheduler/utils/reorder";
import { Frame } from "./Frame";
import { AMBER, BLUE, GREEN, TEAL, VIOLET, at } from "./sample";
import { useSchedule } from "./useSchedule";

// Rooms on two floors and an annex. The order of this list is the order on screen, so
// reordering is just a new list.
const rooms = (): Resource[] => [
  {
    id: "atlas",
    name: "Atlas",
    group: "Floor 1",
    events: [{ id: "r1", title: "Sprint planning", startDate: at(0, 9), endDate: at(0, 10, 30), color: BLUE }],
  },
  { id: "borealis", name: "Borealis", group: "Floor 1", events: [] },
  {
    id: "cirrus",
    name: "Cirrus",
    group: "Floor 2",
    events: [{ id: "r2", title: "Interview", startDate: at(0, 11), endDate: at(0, 12), color: AMBER }],
  },
  {
    id: "delta",
    name: "Delta",
    group: "Floor 2",
    events: [{ id: "r3", title: "Design review", startDate: at(0, 14), endDate: at(0, 15), color: VIOLET }],
  },
  {
    id: "echo",
    name: "Echo",
    group: "Annex",
    events: [{ id: "r4", title: "Workshop", startDate: at(0, 10), endDate: at(0, 12), color: TEAL }],
  },
  { id: "foxtrot", name: "Foxtrot", group: "Annex", events: [{ id: "r5", title: "1:1", startDate: at(0, 16), endDate: at(0, 16, 30), color: GREEN }] },
];

/** onGroupReorder and onResourceReorder, applied with reorderGroup and moveResource. */
export default function ReorderDemo() {
  const { resources, setResources, move, resize, log, setLog } = useSchedule(rooms);
  const name = (id: string | null) => resources.find((r) => r.id === id)?.name;

  return (
    <Frame
      height={500}
      log={log}
      caption="Drag a grip to move a group with its rooms (the folded Annex moves as one), or a room within or into another group; drop on a header to add a room at the end of that group. With the keyboard, focus a header or a room and press Alt+ArrowUp or Alt+ArrowDown."
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={8}
        dayEndHour={18}
        timeColumnWidth="80px"
        resourceColumnWidth="190px"
        ariaLabel="Meeting rooms by floor"
        eventOverlap={false}
        defaultCollapsedGroups={["Annex"]}
        onEventDrop={move}
        onEventResize={resize}
        onGroupReorder={(key, before) => {
          setResources(reorderGroup(resources, key, before));
          setLog(before ? `Moved "${key}" before "${before}"` : `Moved "${key}" to the end`);
        }}
        onResourceReorder={(id, before, group) => {
          setResources(moveResource(resources, id, before, group));
          setLog(
            `Moved ${name(id)} ${before ? `before ${name(before)}` : "to the end"}${group ? ` of "${group}"` : ", out of every group"}`
          );
        }}
      />
    </Frame>
  );
}
