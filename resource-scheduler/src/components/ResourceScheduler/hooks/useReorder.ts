// src/components/ResourceScheduler/hooks/useReorder.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { ReorderControl, Resource } from "../types";
import {
  getDropTarget,
  inDrag,
  positionOf,
  stepTarget,
  type DropTarget,
  type ReorderDrag,
} from "../utils/reorder";

/** Height of the sticky header above the first row, in px (h-14). */
export const HEADER_HEIGHT = 56;
// A press that moves less than this is a click. Auto-scroll starts this close to the edge.
const THRESHOLD = 4;
const EDGE = 48;
// How long after a move the app has to apply it before we stop waiting to announce it.
const WAIT = 1000;

const same = (a: DropTarget | null, b: DropTarget | null) =>
  a === b || (!!a && !!b && a.before === b.before && a.group === b.group && a.header === b.header && a.line === b.line);

/**
 * Drag and keyboard reordering for the resource column. Pointer: `press` starts
 * a drag from a grip, window listeners follow it (so it survives the grip
 * being scrolled out of a virtualized list), the column scrolls when the
 * pointer nears an edge, Escape cancels. Keyboard: `keys` moves a focused row
 * with Alt+ArrowUp / Alt+ArrowDown, and plain arrows step between resource
 * cells. After the app applies a move, it is announced and the focus returns
 * to what moved. The data is never touched: a drop goes to `control.commit`.
 */
export const useReorder = ({
  rows,
  heights,
  control,
  announce,
  rootRef,
}: {
  rows: Resource[];
  heights: number[];
  control?: ReorderControl;
  announce?: (message: string) => void;
  /** The column: its top edge is where the rows start, less the header. */
  rootRef: React.RefObject<HTMLElement | null>;
}) => {
  const { labels } = useI18n();
  const [active, setActive] = useState<{ drag: ReorderDrag; target: DropTarget | null } | null>(null);
  const latest = useRef({ rows, heights, control });
  const pending = useRef<{ drag: ReorderDrag; order: string; focus: boolean; at: number } | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const order = (list: Resource[]) => list.map((r) => r.id).join("\0");

  useEffect(() => {
    latest.current = { rows, heights, control };
  });
  useEffect(() => () => stop.current?.(), []);

  // After the app applies a move: say where it went, and give the focus back
  // (moving a focused row in the DOM drops it).
  useEffect(() => {
    const move = pending.current;
    if (!move) return;
    pending.current = null;
    if (order(rows) === move.order || Date.now() - move.at > WAIT) return;
    const place = positionOf(rows, move.drag);
    if (place) announce?.(labels.announce.reordered(place.name, place.position, place.total, place.group));
    const id = move.drag.kind === "group" ? `rs-group:${move.drag.key}` : move.drag.id;
    const row = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-rs-row]") ?? [])].find(
      (el) => el.dataset.rsRow === id
    );
    if (move.focus && row && (!document.activeElement || document.activeElement === document.body)) row.focus();
  }, [rows, announce, labels, rootRef]);

  const commit = (drag: ReorderDrag, target: DropTarget, focus: boolean) => {
    const done = !!latest.current.control?.commit(drag, target);
    if (done) pending.current = { drag, order: order(latest.current.rows), focus, at: Date.now() };
    return done;
  };

  const press = useCallback(
    (drag: ReorderDrag) => (event: React.PointerEvent) => {
      const root = rootRef.current;
      if (event.button !== 0 || !root) return;
      event.preventDefault(); // no text selection, and the header button keeps its focus
      const origin = { x: event.clientX, y: event.clientY };
      let y = event.clientY;
      let moving = false;
      let target: DropTarget | null = null;
      let frame = 0;
      const cursor = document.body.style.cursor;

      const aim = () => {
        const { rows: shown, heights: sizes } = latest.current;
        target = getDropTarget(shown, sizes, drag, y - root.getBoundingClientRect().top - HEADER_HEIGHT);
        setActive((now) => (now && same(now.target, target) ? now : { drag, target }));
      };
      // Near the top or bottom edge of the box the column scrolls in, the harder the nearer.
      const scroll = () => {
        const scroller = root.parentElement;
        if (scroller) {
          const box = scroller.getBoundingClientRect();
          const low = box.top + HEADER_HEIGHT + EDGE;
          const high = box.bottom - EDGE;
          const step = y < low ? -Math.min(low - y, EDGE) : y > high ? Math.min(y - high, EDGE) : 0;
          if (step) {
            scroller.scrollTop += step / 4;
            aim();
          }
        }
        frame = requestAnimationFrame(scroll);
      };
      const move = (e: PointerEvent) => {
        y = e.clientY;
        if (!moving) {
          if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < THRESHOLD) return;
          moving = true;
          document.body.style.cursor = "grabbing";
          if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(scroll);
        }
        aim();
      };
      const end = (drop: boolean) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", key);
        if (frame) cancelAnimationFrame(frame);
        document.body.style.cursor = cursor;
        stop.current = null;
        setActive(null);
        if (drop && moving && target) commit(drag, target, false);
      };
      const up = () => end(true);
      const cancel = () => end(false);
      const key = (e: KeyboardEvent) => e.key === "Escape" && end(false);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key);
      stop.current = cancel;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rootRef]
  );

  const keys = (drag: ReorderDrag) => (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return; // keys inside a custom header are its own
    const up = event.key === "ArrowUp";
    if (!up && event.key !== "ArrowDown") return;
    if (!event.altKey) {
      // Plain arrows step between resource cells (headers are buttons with their own tab stop).
      if (drag.kind !== "resource") return;
      let next = event.currentTarget as Element | null;
      do next = up ? next!.previousElementSibling : next!.nextElementSibling;
      while (next && !next.matches("[data-rs-row]:not(button)"));
      if (next) {
        event.preventDefault();
        (next as HTMLElement).focus();
      }
      return;
    }
    event.preventDefault();
    const target = stepTarget(latest.current.rows, drag, up ? -1 : 1);
    if (!target || !commit(drag, target, true)) announce?.(labels.announce.cantGoFurther);
  };

  return {
    /** The drag in progress and where it would land, once the pointer has moved. */
    active,
    /** Whether `row` is being dragged, to dim it. */
    isDragged: (row: Resource) => !!active && inDrag(row, active.drag),
    press,
    keys,
  };
};
