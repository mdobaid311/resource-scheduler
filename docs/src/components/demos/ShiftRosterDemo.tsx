import { useState } from "react";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { ResourceInput, SchedulerEvent, SlotSelection } from "@scheduler/types";
import { Frame } from "./Frame";
import { AMBER, VIOLET, weekDay } from "./sample";

// Contracted hours are each person's business hours: the days and hours they may be rostered.
const staff: ResourceInput[] = [
  { id: "ann", name: "Ann Lee", businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startHour: 7, endHour: 15 } },
  {
    id: "cy",
    name: "Cy Ortiz",
    businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startHour: 7, endHour: 15 },
    unavailable: [{ start: weekDay(2), end: weekDay(4) }], // on leave Wednesday and Thursday
  },
  { id: "bo", name: "Bo Kim", businessHours: { daysOfWeek: [3, 4, 5, 6], startHour: 11, endHour: 19 } },
  { id: "dee", name: "Dee Park", businessHours: { daysOfWeek: [1, 2], startHour: 11, endHour: 19 } },
];

const TEMPLATES = {
  Early: { from: 7, to: 15, color: AMBER },
  Late: { from: 11, to: 19, color: VIOLET },
};
type Template = keyof typeof TEMPLATES;

// A series starts two weeks back and repeats, so any week you page to is rostered.
const series = (
  id: string,
  resourceId: string,
  template: Template,
  firstDay: number,
  byWeekday: number[]
): SchedulerEvent => ({
  id,
  title: template,
  resourceId,
  startDate: weekDay(firstDay - 14, TEMPLATES[template].from),
  endDate: weekDay(firstDay - 14, TEMPLATES[template].to),
  color: TEMPLATES[template].color,
  recurrence: { freq: "weekly", byWeekday },
});

const initial = (): SchedulerEvent[] => [
  series("ann-early", "ann", "Early", 0, [1, 2, 3, 4]), // Monday to Thursday
  series("cy-early", "cy", "Early", 0, [1, 2, 5]), // not Wednesday and Thursday: leave
  series("bo-late", "bo", "Late", 2, [3, 4, 5, 6]), // Wednesday to Saturday
];

/** A weekly rota: recurring shifts, contracted hours, leave, and a form to add a shift. */
export default function ShiftRosterDemo() {
  const [events, setEvents] = useState<SchedulerEvent[]>(initial);
  const [draft, setDraft] = useState<SlotSelection | null>(null);
  const [template, setTemplate] = useState<Template>("Early");
  const [log, setLog] = useState("");

  // Handlers receive an occurrence of a series (id "ann-early::2026-10-07", seriesId "ann-early").
  // Moving one shift is "this shift only": skip the day in the series and add a one-off shift.
  const change = (shift: SchedulerEvent, resourceId: string, start: Date, end: Date) => {
    setEvents((all) => {
      if (!shift.seriesId) {
        return all.map((e) => (e.id === shift.id ? { ...e, resourceId, startDate: start, endDate: end } : e));
      }
      const skipped = all.map((e) =>
        e.id === shift.seriesId
          ? { ...e, recurrence: { ...e.recurrence!, exceptions: [...(e.recurrence!.exceptions ?? []), shift.startDate] } }
          : e
      );
      return [
        ...skipped,
        { ...shift, id: `cover-${Date.now()}`, seriesId: undefined, resourceId, startDate: start, endDate: end },
      ];
    });
    setLog(`Moved ${shift.title} to ${staff.find((p) => p.id === resourceId)?.name}`);
  };

  const addShift = () => {
    if (!draft) return;
    const { from, to, color } = TEMPLATES[template];
    const day = (hour: number) => {
      const d = new Date(draft.start);
      d.setHours(hour, 0, 0, 0);
      return d;
    };
    setEvents((all) => [
      ...all,
      { id: `shift-${Date.now()}`, title: template, resourceId: draft.resourceId, startDate: day(from), endDate: day(to), color },
    ]);
    setLog(`Added a ${template.toLowerCase()} shift for ${staff.find((p) => p.id === draft.resourceId)?.name}`);
    setDraft(null);
  };

  return (
    <Frame
      height={530}
      log={log}
      caption="Bars show rostered hours against contracted hours. Cy is on leave Wednesday and Thursday, and Dee has no shifts yet: click a day in her row. Drag a shift to someone else to cover it for that day only. Closed days refuse shifts."
    >
      {draft && (
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            addShift();
          }}
        >
          <span>
            {staff.find((p) => p.id === draft.resourceId)?.name},{" "}
            {draft.start.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
          </span>
          <select aria-label="Shift" value={template} onChange={(e) => setTemplate(e.target.value as Template)}>
            <option value="Early">Early 7:00 to 15:00</option>
            <option value="Late">Late 11:00 to 19:00</option>
          </select>
          <button type="submit">Add shift</button>
          <button type="button" className="secondary" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}
      <div style={{ height: draft ? 480 : 530 }}>
        <ResourceScheduler
          resources={staff}
          events={events}
          initialView={ViewType.Week}
          allowViewChange={false}
          weekStartsOn={1}
          showUtilization
          blockUnavailable
          eventOverlap={false}
          resourceColumnWidth="170px"
          dateColumnWidth="110px"
          ariaLabel="Shift roster"
          onSlotSelect={setDraft}
          onEventDrop={(shift, _from, to, start, end) => change(shift, to, start, end)}
        />
      </div>
    </Frame>
  );
}
