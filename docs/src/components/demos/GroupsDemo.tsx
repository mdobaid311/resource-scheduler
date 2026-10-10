import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource } from "@scheduler/types";
import { Frame } from "./Frame";
import { AMBER, BLUE, GREEN, TEAL, VIOLET, at } from "./sample";
import { useSchedule } from "./useSchedule";

// Rooms on two floors and an annex. `group` is the only thing that says where each belongs.
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

const GROUPS = ["Floor 1", "Floor 2", "Annex"];

/** group, and collapsedGroups / onCollapsedGroupsChange to control which are folded. */
export default function GroupsDemo() {
  const { resources, move, resize, log } = useSchedule(rooms);
  const [collapsed, setCollapsed] = useState<string[]>(["Annex"]);

  return (
    <Frame
      height={440}
      log={log}
      controls={
        <>
          <button type="button" onClick={() => setCollapsed(GROUPS)}>
            Collapse all
          </button>
          <button type="button" onClick={() => setCollapsed([])}>
            Expand all
          </button>
          <span>Collapsed: {collapsed.length ? collapsed.join(", ") : "none"}</span>
        </>
      }
      caption="Click a group header, or Tab to it and press Enter, to fold it. Drag an event from one floor to another: the groups only organise the rows."
    >
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Day}
        allowViewChange={false}
        slotDuration={30}
        dayStartHour={8}
        dayEndHour={18}
        timeColumnWidth="80px"
        resourceColumnWidth="170px"
        ariaLabel="Meeting rooms by floor"
        eventOverlap={false}
        collapsedGroups={collapsed}
        onCollapsedGroupsChange={setCollapsed}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
