import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ResourceScheduler } from "@scheduler";
import { ViewType } from "@scheduler/types";
import type { Resource, ResourceSchedulerHandle } from "@scheduler/types";
import { Frame } from "./Frame";
import { AMBER, BLUE, GREEN, ROSE, TEAL, VIOLET, week } from "./sample";
import { useSchedule } from "./useSchedule";

const PEOPLE = [
  "Ann Lee", "Bob Ruiz", "Chen Wu", "Dana Fox", "Eli Park", "Fay Chen", "Gus Held",
  "Hana Ito", "Ivo Stan", "Jo Marsh", "Kai Boyd", "Lena Voss", "Milo Reyes", "Nia Okoye",
  "Omar Said", "Pia Lund", "Quinn Hale", "Rosa Vega", "Sven Aho", "Tara Nair", "Uma Patel",
  "Vik Joshi", "Wen Zhao", "Yara Haddad",
];
const TITLES = ["Sprint work", "Design review", "Planning", "Customer call", "On call", "Workshop"];
const COLORS = [BLUE, GREEN, AMBER, VIOLET, ROSE, TEAL];

// Twenty-four people, working hours Monday to Friday 9 to 17 (shaded outside), and every
// fifth person out on Thursday and Friday: the shaded cells print too.
const team = (): Resource[] =>
  PEOPLE.map((name, i) => ({
    id: `p${i}`,
    name,
    unavailable: i % 5 === 2 ? [{ start: week(4, 0), end: week(6, 0) }] : undefined,
    events: [1, 2, 3, 4]
      .filter((day) => (day + i) % 3 !== 0)
      .map((day) => ({
        id: `p${i}-${day}`,
        title: TITLES[(i + day) % 6],
        startDate: week(day, 9 + ((i + day) % 3)),
        endDate: week(day, 13 + ((i * day) % 4)),
        color: COLORS[(i + day) % 6],
      })),
  }));

/** Print the board, or a chosen view of it. The page around it is hidden by docs CSS (custom.css). */
export default function PrintDemo() {
  const { resources, move, resize, log } = useSchedule(team);
  const ref = useRef<ResourceSchedulerHandle>(null);
  const view = useRef<ViewType>(ViewType.Week); // what is on screen, to put back
  const [range, setRange] = useState<"shown" | ViewType>("shown");
  const [landscape, setLandscape] = useState(true);

  const print = (e: React.MouseEvent<HTMLButtonElement>) => {
    const frame = e.currentTarget.closest(".demo-frame")!;
    const back = view.current;
    // The recipe from the guide: show what you want on paper, let React draw it
    // (flushSync), print, and put the screen back afterwards.
    if (range !== "shown") flushSync(() => ref.current?.setView(range));
    document.documentElement.dataset.printOnly = ""; // docs only: hide the rest of the page
    frame.classList.add("print-target");
    window.addEventListener(
      "afterprint",
      () => {
        delete document.documentElement.dataset.printOnly;
        frame.classList.remove("print-target");
        if (range !== "shown") ref.current?.setView(back);
      },
      { once: true }
    );
    window.print();
  };

  return (
    <Frame
      height={470}
      log={log}
      controls={
        <>
          <label>
            Print
            <select value={range} onChange={(e) => setRange(e.target.value as "shown" | ViewType)}>
              <option value="shown">what is on screen</option>
              <option value={ViewType.Day}>the day view</option>
              <option value={ViewType.Week}>the week view</option>
              <option value={ViewType.Month}>the month view</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} />
            Landscape
          </label>
          <button type="button" onClick={print}>
            Print this board
          </button>
          {/* @page cannot be scoped to a component: this is the paper, set for the whole page. */}
          {landscape && <style media="print">{"@page { size: landscape; margin: 10mm; }"}</style>}
        </>
      }
      caption="Only a few rows are drawn on screen (virtualize is forced on here). Print preview draws all twenty-four, without the toolbar, in landscape. Working hours and Chen's time off print shaded, and the event colors print without turning on background graphics."
    >
      <ResourceScheduler
        ref={ref}
        resources={resources}
        initialView={ViewType.Week}
        businessHours={{}}
        virtualize
        resourceColumnWidth="190px"
        dateColumnWidth="120px"
        onViewChange={(v) => (view.current = v)}
        onEventDrop={move}
        onEventResize={resize}
      />
    </Frame>
  );
}
