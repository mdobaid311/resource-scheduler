import { useState } from "react";
import { format } from "date-fns";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { SchedulerComponents } from "@scheduler/types";
import { Frame } from "./Frame";
import { teamWeek } from "./sample";
import { useSchedule } from "./useSchedule";

// Components are defined once, outside the demo: a new component type on every render would remount them.

const Toolbar: SchedulerComponents["Toolbar"] = ({ title, viewTitle, views, viewType, onNavigate, onViewChange, onGoToToday, labels }) => (
  <div className="demo-controls">
    <button type="button" aria-label={labels.previousPeriod} onClick={() => onNavigate("prev")}>
      ‹
    </button>
    <strong style={{ minWidth: "11rem" }}>
      {title} <small style={{ fontWeight: 400, opacity: 0.7 }}>{viewTitle}</small>
    </strong>
    <button type="button" aria-label={labels.nextPeriod} onClick={() => onNavigate("next")}>
      ›
    </button>
    <button type="button" onClick={onGoToToday}>
      {labels.today}
    </button>
    <span role="group" aria-label={labels.view} style={{ display: "inline-flex", gap: 4, marginInlineStart: "auto" }}>
      {views.map((view) => (
        <button key={view} type="button" aria-pressed={view === viewType} onClick={() => onViewChange(view)}>
          {labels.views[view]}
        </button>
      ))}
    </span>
  </div>
);

const initials = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("");

const ResourceHeader: SchedulerComponents["ResourceHeader"] = ({ resource }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "start" }}>
    <span
      aria-hidden="true"
      style={{ width: 30, height: 30, borderRadius: "50%", background: "#e0e7ff", color: "#3730a3", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}
    >
      {initials(resource.name)}
    </span>
    <span>
      <strong style={{ display: "block", fontWeight: 600 }}>{resource.name}</strong>
      <small style={{ opacity: 0.7 }}>{resource.role}</small>
    </span>
  </span>
);

const length = (start: Date, end: Date) => {
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000);
  return hours >= 24 ? `${Math.ceil(hours / 24)}d` : `${hours}h`;
};

// Only the content: the card around it still drags, resizes and takes the keyboard.
const Event: SchedulerComponents["Event"] = ({ event }) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 6, height: "100%", padding: "0 8px", background: event.color, color: "#fff", borderRadius: 4, fontSize: 12 }}
  >
    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</strong>
    <span style={{ marginInlineStart: "auto", opacity: 0.85 }}>{length(event.startDate, event.endDate)}</span>
  </div>
);

// A component, so it can keep state.
const EventPopover: SchedulerComponents["EventPopover"] = ({ event, resource, close }) => {
  const [done, setDone] = useState(false);
  return (
    <div style={{ minWidth: 200 }}>
      <strong>{event.title}</strong>
      <div style={{ opacity: 0.75, fontSize: 13 }}>
        {resource.name}, {format(event.startDate, "EEE p")}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => setDone(!done)} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "2px 10px" }}>
          {done ? "Done ✓" : "Mark done"}
        </button>
        <button type="button" onClick={close} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "2px 10px" }}>
          Close
        </button>
      </div>
    </div>
  );
};

const DateHeader: SchedulerComponents["DateHeader"] = ({ date, view }) =>
  view === ViewType.Day ? (
    <span>{format(date, "HH:mm")}</span>
  ) : (
    <span style={{ display: "grid", lineHeight: 1.1 }}>
      <small style={{ letterSpacing: "0.05em", opacity: 0.7 }}>{format(date, "EEE").toUpperCase()}</small>
      <strong style={{ fontSize: 18 }}>{format(date, "d")}</strong>
    </span>
  );

const components: SchedulerComponents = { Toolbar, ResourceHeader, Event, EventPopover, DateHeader };

/** `components`: a toolbar, resource header, event card, popover and date header of our own. */
export default function ComponentsDemo() {
  const { resources, move, resize, log } = useSchedule(teamWeek);

  return (
    <Frame
      height={420}
      log={log}
      caption="Five parts replaced. The cards still drag, resize and take the keyboard; open one and press Mark done: the popover keeps its own state."
    >
      <ResourceScheduler
        resources={resources}
        components={components}
        initialView={ViewType.Week}
        availableViews={[ViewType.Day, ViewType.Week]}
        resourceColumnWidth="190px"
        dateColumnWidth="120px"
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
