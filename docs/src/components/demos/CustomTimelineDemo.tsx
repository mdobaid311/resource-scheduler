import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  LANES,
  ViewType,
  buildI18n,
  formatEventTime,
  formatPeriodTitle,
  getGridTemplateRows,
  getMovePlacement,
  getResizePlacement,
  getSelectionBounds,
  isPlacementAllowed,
  isSlotInRange,
  isToday,
} from "@headless";
import type { Placement, SchedulerEvent } from "@headless";
import { useSchedulerState } from "@scheduler/hooks/useSchedulerState";
import { Frame } from "./Frame";
import { BLUE, teamWeek } from "./sample";

// A timeline made of useSchedulerState, the headless functions and inline
// styles. The pointer handling, the one thing the library leaves to you, is in
// this file: press, follow the pointer to the slot under it, ask the functions
// where that would land and whether it is allowed, then save it on release.

const VIEWS = [ViewType.Day, ViewType.Week, ViewType.Month] as const;
type DemoView = (typeof VIEWS)[number];
const OPTIONS = { dayStartHour: 8, dayEndHour: 18, weekStartsOn: 1 } as const;
const COLUMN_WIDTH: Record<DemoView, number> = { day: 68, week: 88, month: 38 };
const RULES = { eventOverlap: false } as const; // no double booking
const i18n = buildI18n();
const border = "1px solid var(--sl-color-gray-5)";

const button = {
  font: "inherit",
  padding: "0.2rem 0.6rem",
  border,
  borderRadius: 6,
  background: "var(--sl-color-bg)",
  color: "var(--sl-color-text)",
  cursor: "pointer",
} as const;

/** What is being dragged and where it would land. */
interface Drag {
  kind: "move" | "resize" | "create";
  /** The event being moved or resized. */
  id?: string;
  placement: Placement;
  allowed: boolean;
}
type Over = { resourceId: string; slot: Date };

// The cell under the pointer. elementsFromPoint (not elementFromPoint) so the
// cells stay reachable underneath the events laid over them.
const slotAt = (x: number, y: number): Over | null => {
  const cell = document
    .elementsFromPoint(x, y)
    .find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.slot !== undefined && el.dataset.resource !== undefined);
  return cell ? { resourceId: cell.dataset.resource!, slot: new Date(Number(cell.dataset.slot)) } : null;
};

/** A timeline you can drag, from useSchedulerState and the headless functions. */
export default function CustomTimelineDemo() {
  const [now] = useState(() => new Date());
  const [resources, setResources] = useState(teamWeek);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState(0);

  const { date, view, columns, rows, layout, rowHeights, slotMinutes, navigate, setView, goToToday } = useSchedulerState({
    resources,
    initialDate: now,
    initialView: ViewType.Week,
    ...OPTIONS,
  });
  const nameOf = (id: string) => rows.find((row) => row.id === id)?.name ?? id;

  // Follows the pointer from a press until it is let go. `resolve` says what the
  // pointer is over now; `commit` saves the result on release and says what happened.
  const follow = (e: ReactPointerEvent, resolve: (over: Over) => Drag | null, commit: (placement: Placement) => string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    let current: Drag | null = null;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return; // still a click
      moved = true;
      const over = slotAt(ev.clientX, ev.clientY);
      current = over && resolve(over);
      setDrag(current);
    };
    const stop = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      setDrag(null);
      if (ev.type !== "pointerup" || !moved || !current) return;
      setNote(current.allowed ? commit(current.placement) : "Not allowed: that overlaps another event");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const save = (event: SchedulerEvent, from: string, placement: Placement) => {
    const saved = { ...event, startDate: placement.start, endDate: placement.end };
    setResources((all) =>
      all.map((r) => {
        const others = r.events.filter((e) => e.id !== event.id);
        return r.id === placement.resourceId ? { ...r, events: [...others, saved] } : r.id === from ? { ...r, events: others } : r;
      })
    );
    return saved;
  };

  const startMove = (e: ReactPointerEvent, event: SchedulerEvent, from: string) =>
    follow(
      e,
      (over) => {
        const placement = getMovePlacement(event, over, view);
        return { kind: "move", id: event.id, placement, allowed: isPlacementAllowed(event, placement, rows, RULES) };
      },
      (placement) => `Moved "${event.title}" to ${nameOf(placement.resourceId)}, ${formatEventTime(save(event, from, placement), i18n)}`
    );

  const startResize = (e: ReactPointerEvent, event: SchedulerEvent, from: string, edge: "start" | "end") => {
    e.stopPropagation(); // not a move
    follow(
      e,
      (over) => {
        const placement = getResizePlacement(event, from, edge, over, view, slotMinutes);
        return placement && { kind: "resize", id: event.id, placement, allowed: isPlacementAllowed(event, placement, rows, RULES) };
      },
      (placement) => `Resized "${event.title}", ${formatEventTime(save(event, from, placement), i18n)}`
    );
  };

  const startCreate = (e: ReactPointerEvent, resourceId: string, anchor: Date) =>
    follow(
      e,
      (over) => {
        if (over.resourceId !== resourceId) return null;
        const placement = { resourceId, ...getSelectionBounds(anchor, over.slot, view, slotMinutes) };
        const draft = { id: "new", title: "New event", startDate: placement.start, endDate: placement.end };
        return { kind: "create", placement, allowed: isPlacementAllowed(draft, placement, rows, RULES) };
      },
      (placement) => {
        const event = { id: `new-${created}`, title: "New event", startDate: placement.start, endDate: placement.end, color: BLUE };
        setCreated(created + 1);
        setResources((all) => all.map((r) => (r.id === resourceId ? { ...r, events: [...r.events, event] } : r)));
        return `Created "New event" for ${nameOf(resourceId)}, ${formatEventTime(event, i18n)}`;
      }
    );

  const tint = (allowed: boolean) => (allowed ? "rgba(34, 197, 94, 0.28)" : "rgba(239, 68, 68, 0.32)");

  return (
    <Frame height={470}>
      <div data-demo="custom" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderBottom: border }}>
          <button type="button" aria-label="Previous period" style={button} onClick={() => navigate("prev")}>
            ‹
          </button>
          <strong data-demo-title style={{ minWidth: "9.5rem", textAlign: "center" }}>
            {formatPeriodTitle(date, view, OPTIONS, i18n)}
          </strong>
          <button type="button" aria-label="Next period" style={button} onClick={() => navigate("next")}>
            ›
          </button>
          <button type="button" style={button} onClick={() => goToToday(now)}>
            {i18n.labels.today}
          </button>
          <span role="group" aria-label={i18n.labels.view} style={{ marginInlineStart: "auto", display: "inline-flex", gap: 4 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={v === view}
                style={{ ...button, ...(v === view && { background: "var(--sl-color-accent-low)", borderColor: "var(--sl-color-accent)" }) }}
                onClick={() => setView(v)}
              >
                {i18n.labels.views[v]}
              </button>
            ))}
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${columns.length}, minmax(${COLUMN_WIDTH[view as DemoView]}px, 1fr))`,
              gridTemplateRows: getGridTemplateRows(rowHeights),
              minWidth: "fit-content",
              userSelect: "none",
            }}
          >
            <div style={{ gridRow: 1, gridColumn: 1, position: "sticky", top: 0, left: 0, zIndex: 3, background: "var(--sl-color-bg)", borderBottom: border, padding: "0.5rem", fontSize: "0.8rem" }}>
              {i18n.labels.resources}
            </div>
            {columns.map((column, c) => (
              <div
                key={+column}
                style={{
                  gridRow: 1,
                  gridColumn: c + 2,
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: isToday(column, now) ? "var(--sl-color-accent-low)" : "var(--sl-color-bg)",
                  borderBottom: border,
                  borderInlineStart: border,
                  padding: "0.4rem 0.25rem",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  lineHeight: 1.3,
                }}
              >
                {view === ViewType.Day ? (
                  i18n.fmt.hourHeader(column)
                ) : (
                  <>
                    <div>{i18n.fmt.weekday(column)}</div>
                    <strong>{i18n.fmt.dayOfMonth(column)}</strong>
                  </>
                )}
              </div>
            ))}

            {rows.map((row, r) => (
              <div key={row.id} style={{ display: "contents" }}>
                <div style={{ gridRow: r + 2, gridColumn: 1, position: "sticky", left: 0, zIndex: 1, background: "var(--sl-color-bg)", borderBottom: border, padding: "0.5rem", fontSize: "0.85rem" }}>
                  <strong>{row.name}</strong>
                  <div style={{ fontSize: "0.7rem", color: "var(--sl-color-gray-3)" }}>{row.role}</div>
                </div>

                {columns.map((column, c) => (
                  <div
                    key={+column}
                    data-slot={+column}
                    data-resource={row.id}
                    onPointerDown={(e) => startCreate(e, row.id, column)}
                    style={{
                      gridRow: r + 2,
                      gridColumn: c + 2,
                      borderBottom: border,
                      borderInlineStart: border,
                      cursor: "crosshair",
                      background:
                        drag && drag.placement.resourceId === row.id && isSlotInRange(column, drag.placement, view, slotMinutes)
                          ? drag.kind === "create" && drag.allowed
                            ? "var(--sl-color-accent-low)"
                            : tint(drag.allowed)
                          : undefined,
                    }}
                  />
                ))}

                {layout[r].map(({ event, startPosition, span, lane }) => (
                  <div
                    key={event.id}
                    data-demo-event={event.id}
                    onPointerDown={(e) => startMove(e, event, row.id)}
                    style={{
                      gridRow: r + 2,
                      gridColumn: `${startPosition + 2} / span ${span}`,
                      alignSelf: "start",
                      position: "relative",
                      height: LANES.comfortable.card,
                      margin: `${lane * LANES.comfortable.lane + 4}px 2px 0`,
                      padding: "0 0.5rem",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 6,
                      background: event.color ?? BLUE,
                      color: "#fff",
                      fontSize: "0.75rem",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      cursor: "grab",
                      touchAction: "none",
                      zIndex: 1,
                      opacity: drag?.kind === "move" && drag.id === event.id ? 0.5 : 1,
                    }}
                  >
                    {event.title}
                    {(["start", "end"] as const).map((edge) => (
                      <span
                        key={edge}
                        data-demo-resize={edge}
                        onPointerDown={(e) => startResize(e, event, row.id, edge)}
                        style={{ position: "absolute", top: 0, bottom: 0, [edge === "start" ? "left" : "right"]: 0, width: 8, cursor: "ew-resize", touchAction: "none" }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p role="status" style={{ margin: 0, padding: "0.4rem 0.75rem", borderTop: border, fontSize: "0.8rem", color: "var(--sl-color-gray-2)" }}>
          {note || "Drag an event to move it, drag its edge to resize it, drag across free cells to create one. No double booking."}
        </p>
      </div>
    </Frame>
  );
}
