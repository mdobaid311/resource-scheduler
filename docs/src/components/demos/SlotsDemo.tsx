import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SlotSelection } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamDay } from "./sample";
import { SlotForm } from "./SlotForm";
import { useSchedule } from "./useSchedule";

const HOURS = { "Working day (8 to 18)": [8, 18], "Full day (0 to 24)": [0, 24] } as const;

/** Slot duration, visible hours, and onSlotSelect driving a custom form. */
export default function SlotsDemo() {
  const { resources, addEvent, move, resize, log, setLog } = useSchedule(teamDay);
  const [slotDuration, setSlotDuration] = useState(30);
  const [hours, setHours] = useState<keyof typeof HOURS>("Working day (8 to 18)");
  const [draft, setDraft] = useState<SlotSelection | null>(null);
  const [from, to] = HOURS[hours];

  return (
    <Frame
      height={420}
      log={log}
      controls={
        <>
          <label>
            Slot length
            <select value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))}>
              {[15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
          <label>
            Visible hours
            <select value={hours} onChange={(e) => setHours(e.target.value as keyof typeof HOURS)}>
              {Object.keys(HOURS).map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
        </>
      }
      caption="Click or drag across empty slots: onSlotSelect hands you the range and you open your own form."
    >
      {draft && (
        <SlotForm
          slot={draft}
          nameOf={(id) => resources.find((r) => r.id === id)?.name ?? id}
          onCancel={() => setDraft(null)}
          onCreate={(title) => {
            addEvent(draft.resourceId, { title, startDate: draft.start, endDate: draft.end, color: "#3b82f6" });
            setLog(`Created "${title}"`);
            setDraft(null);
          }}
        />
      )}
      <div style={{ height: draft ? 360 : 420 }}>
        <ResourceScheduler
          resources={resources}
          initialView={ViewType.Day}
          availableViews={[ViewType.Day]}
          allowViewChange={false}
          slotDuration={slotDuration}
          dayStartHour={from}
          dayEndHour={to}
          timeColumnWidth="80px"
          resourceColumnWidth="150px"
          onSlotSelect={setDraft}
          onEventDrop={move}
          onEventResize={resize}
        />
      </div>
    </Frame>
  );
}
