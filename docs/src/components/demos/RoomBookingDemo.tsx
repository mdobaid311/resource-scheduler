import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SlotSelection } from "@scheduler/types";
import { Frame } from "./Frame";
import { rooms } from "./sample";
import { SlotForm } from "./SlotForm";
import { useSchedule } from "./useSchedule";

/** Meeting rooms: no double booking, your own booking form, 30 minute slots. */
export default function RoomBookingDemo() {
  const { resources, addEvent, move, resize, log, setLog } = useSchedule(rooms);
  const [draft, setDraft] = useState<SlotSelection | null>(null);

  return (
    <Frame
      height={420}
      log={log}
      caption="Select free time on a room to book it. Booked time cannot be selected, moved onto or resized into."
    >
      {draft && (
        <SlotForm
          slot={draft}
          nameOf={(id) => resources.find((r) => r.id === id)?.name ?? id}
          onCancel={() => setDraft(null)}
          onCreate={(title) => {
            addEvent(draft.resourceId, { title, startDate: draft.start, endDate: draft.end, color: "#10b981" });
            setLog(`Booked "${title}"`);
            setDraft(null);
          }}
        />
      )}
      <div style={{ height: draft ? 360 : 420 }}>
        <ResourceScheduler
          resources={resources}
          initialView={ViewType.Day}
          allowViewChange={false}
          slotDuration={30}
          dayStartHour={8}
          dayEndHour={18}
          timeColumnWidth="80px"
          resourceColumnWidth="170px"
          ariaLabel="Meeting room bookings"
          eventOverlap={false}
          onSlotSelect={setDraft}
          onEventDrop={move}
          onEventResize={resize}
        />
      </div>
    </Frame>
  );
}
