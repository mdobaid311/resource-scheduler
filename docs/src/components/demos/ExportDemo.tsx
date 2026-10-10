import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SchedulerEvent } from "@scheduler/types";
import { eventsToCSV, eventsToICS } from "@scheduler/utils/exportEvents";
import { Frame } from "./Frame";
import { rooms } from "./sample";
import { useSchedule } from "./useSchedule";

const download = (name: string, type: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

/** eventsToICS and eventsToCSV on whatever is on the board right now. */
export default function ExportDemo() {
  const { resources, move, resize, log } = useSchedule(rooms);
  const [format, setFormat] = useState<"ics" | "csv">("ics");

  // The scheduler keeps events inside their resource; the export wants them flat.
  const events: SchedulerEvent[] = resources.flatMap((r) => r.events.map((e) => ({ ...e, resourceId: r.id })));
  const text = format === "ics" ? eventsToICS(events, { resources, name: "Meeting rooms" }) : eventsToCSV(events, { resources });
  const preview = text.split(/\r?\n/).slice(0, 16).join("\n");

  return (
    <Frame
      height={300}
      log={log}
      controls={
        <>
          <label>
            Preview
            <select value={format} onChange={(e) => setFormat(e.target.value as "ics" | "csv")}>
              <option value="ics">.ics (calendar)</option>
              <option value="csv">.csv (spreadsheet)</option>
            </select>
          </label>
          <button type="button" onClick={() => download("rooms.ics", "text/calendar", eventsToICS(events, { resources, name: "Meeting rooms" }))}>
            Download .ics
          </button>
          <button type="button" onClick={() => download("rooms.csv", "text/csv", eventsToCSV(events, { resources }))}>
            Download .csv
          </button>
        </>
      }
      caption={
        <pre style={{ margin: 0, maxHeight: 190, overflow: "auto", fontSize: "0.75rem", lineHeight: 1.4 }}>{preview}</pre>
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
        resourceColumnWidth="170px"
        eventOverlap={false}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
