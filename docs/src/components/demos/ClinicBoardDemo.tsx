import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, SchedulerEvent, SlotSelection } from "@scheduler/types";
import { findAvailableSlots } from "@scheduler/utils/availability";
import { withEvents } from "@scheduler/utils/events";
import { suggestResources } from "@scheduler/utils/suggest";
import { Frame } from "./Frame";
import type { DemoProps } from "./Frame";
import { AMBER, BLUE, GREEN, TEAL, VIOLET, at } from "./sample";

const everyDay = [0, 1, 2, 3, 4, 5, 6]; // use [1, 2, 3, 4, 5] for a Monday to Friday clinic

// Each clinician has their own hours and their own gaps. Both are shaded and refuse bookings.
const clinicians: ResourceInput[] = [
  {
    id: "ahmed",
    name: "Dr Ahmed",
    businessHours: { daysOfWeek: everyDay, startHour: 8, endHour: 17 },
    unavailable: [{ start: at(0, 12), end: at(0, 13) }], // lunch
  },
  { id: "brown", name: "Dr Brown", businessHours: { daysOfWeek: everyDay, startHour: 8, endHour: 13 } }, // mornings only
  {
    id: "cho",
    name: "Nurse Cho",
    businessHours: { daysOfWeek: everyDay, startHour: 9, endHour: 17 },
    unavailable: [{ start: at(0, 15), end: at(0, 16) }], // training
  },
];

const SLOT = 15; // the grid: a booking starts on a quarter hour
const VISIT = 30; // every appointment is the same length
const BUFFER = 15; // minutes to write up and reset between patients
const MINUTE = 60_000;

const visit = (id: string, resourceId: string, patient: string, hour: number, minute: number, color: string): SchedulerEvent => ({
  id,
  title: patient,
  resourceId,
  startDate: at(0, hour, minute),
  endDate: at(0, hour, minute + VISIT),
  color,
});

const initial = (): SchedulerEvent[] => [
  visit("v1", "ahmed", "Patel", 8, 30, BLUE),
  visit("v2", "ahmed", "Okafor", 9, 30, TEAL),
  visit("v3", "ahmed", "Lindqvist", 10, 30, AMBER),
  visit("v4", "brown", "Reyes", 8, 0, VIOLET),
  visit("v5", "brown", "Tanaka", 9, 0, BLUE),
  visit("v6", "cho", "Singh", 9, 0, TEAL),
];

// Each booked visit holds its clinician for BUFFER minutes either side. A free slot in this
// padded copy is a visit plus its gaps, and the padding never shows on screen.
const padded = (all: SchedulerEvent[], ignoreId?: string): SchedulerEvent[] =>
  all
    .filter((e) => e.id !== ignoreId)
    .map((e) => ({
      ...e,
      startDate: new Date(e.startDate.getTime() - BUFFER * MINUTE),
      endDate: new Date(e.endDate.getTime() + BUFFER * MINUTE),
    }));

// The one rule: hours, lunch, no double booking and the gap, all answered by findAvailableSlots.
// The window is exactly the range asked about, so it returns that slot or nothing.
const canBook = (all: SchedulerEvent[], clinicianId: string, start: Date, end: Date, ignoreId?: string) => {
  const clinician = withEvents(clinicians, padded(all, ignoreId)).find((c) => c.id === clinicianId);
  return (
    !!clinician &&
    findAvailableSlots(clinician, { from: start, to: end, duration: (end.getTime() - start.getTime()) / MINUTE, step: SLOT }).length > 0
  );
};

const time = (d: Date) =>
  `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;

/** A clinic day: fixed length visits, per-clinician hours, a gap between patients, and "book the next free slot". */
export default function ClinicBoardDemo({ density }: DemoProps = {}) {
  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const [draft, setDraft] = useState<SlotSelection | null>(null);
  const [patient, setPatient] = useState("");
  const [who, setWho] = useState("any");
  const [log, setLog] = useState("");
  const nameOf = (id: string) => clinicians.find((c) => c.id === id)?.name ?? id;

  const book = (resourceId: string, title: string, start: Date) => {
    const end = new Date(start.getTime() + VISIT * MINUTE);
    setEvents((all) => [...all, { id: `visit-${Date.now()}`, title, resourceId, startDate: start, endDate: end, color: GREEN }]);
    setLog(`Booked ${title} with ${nameOf(resourceId)} at ${time(start)}`);
  };

  const bookNext = () => {
    const [next] = suggestResources(
      withEvents(clinicians, padded(events)),
      { from: new Date(), to: at(0, 17), duration: VISIT, step: SLOT },
      { resourceIds: who === "any" ? undefined : [who], limit: 1 }
    );
    if (!next) return setLog("No free visit left today");
    book(next.resourceId, "Walk-in", next.start);
  };

  return (
    <Frame
      height={330}
      log={log}
      controls={
        <>
          <label>
            Next free visit with
            <select aria-label="Clinician" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="any">Anyone</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={bookNext}>
            Book it
          </button>
        </>
      }
      caption={`Every visit is ${VISIT} minutes and needs ${BUFFER} minutes clear before and after it. Dr Brown works mornings, Dr Ahmed lunches at 12 and Nurse Cho has training at 15:00. Click a free slot to book with your own form, or drag a visit to another time or clinician: a place that breaks a rule turns red.`}
    >
      {draft && (
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            const end = new Date(draft.start.getTime() + VISIT * MINUTE);
            if (!canBook(events, draft.resourceId, draft.start, end)) {
              setLog(`${time(draft.start)} to ${time(end)} does not fit for ${nameOf(draft.resourceId)}`);
              return;
            }
            book(draft.resourceId, patient.trim() || "Patient", draft.start);
            setPatient("");
            setDraft(null);
          }}
        >
          <span>
            {nameOf(draft.resourceId)}, {time(draft.start)} for {VISIT} min
          </span>
          <input autoFocus type="text" placeholder="Patient" aria-label="Patient" value={patient} onChange={(e) => setPatient(e.target.value)} />
          <button type="submit">Book</button>
          <button type="button" className="secondary" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}
      <div style={{ height: 330 }}>
        <ResourceScheduler
          density={density}
          resources={clinicians}
          events={events}
          initialView={ViewType.Day}
          allowViewChange={false}
          slotDuration={SLOT}
          dayStartHour={8}
          dayEndHour={17}
          blockUnavailable
          timeColumnWidth="64px"
          resourceColumnWidth="clamp(104px, 30vw, 150px)"
          ariaLabel="Clinic appointments"
          onSlotSelect={setDraft}
          onEventDrop={(visit, _from, to, start, end) => {
            setEvents((all) => all.map((e) => (e.id === visit.id ? { ...e, resourceId: to, startDate: start, endDate: end } : e)));
            setLog(`Moved ${visit.title} to ${nameOf(to)} at ${time(start)}`);
          }}
          isValidDrop={(visit, { resourceId, start, end }) => canBook(events, resourceId, start, end, visit.id)}
        />
      </div>
    </Frame>
  );
}
