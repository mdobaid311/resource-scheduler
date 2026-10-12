// src/components/ResourceScheduler/hooks/useGridKeyboard.ts
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { type Cursor, flipHorizontal, moveCursor } from "../utils/keyboard";

export interface GridKeyboardOptions {
  rowCount: number;
  colCount: number;
  /** Column the cursor starts on the first time the grid gets focus. */
  initialCol: number;
  /** Prefix of the slot element ids (`${idPrefix}-r{row}-c{col}`). */
  idPrefix: string;
  slotAt: (row: number, col: number) => { resourceId: string; date: Date };
  /** Called with the first and last selected slot of one resource. */
  onSelect: (resourceId: string, from: Date, to: Date) => void;
  announce?: (message: string) => void;
  /** Page Up (`"prev"`) and Page Down (`"next"`) ask for another period. Without it the keys are left alone. */
  onPage?: (direction: "prev" | "next") => void;
  /** Changes whenever the grid shows another period. After a page key it triggers saying where the cursor is. */
  periodKey?: number;
  /** The name of a cell, spoken after paging. */
  cellLabel?: (row: number, col: number) => string;
}

/**
 * Keyboard cursor for the slot grid (a single tab stop using
 * aria-activedescendant). Arrows/Home/End move, Shift+Left/Right extends a
 * range, Enter or Space selects, Escape drops the range, Page Up and Page
 * Down ask for the previous and next period.
 */
export const useGridKeyboard = ({
  rowCount,
  colCount,
  initialCol,
  idPrefix,
  slotAt,
  onSelect,
  announce,
  onPage,
  periodKey,
  cellLabel,
}: GridKeyboardOptions) => {
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState<Cursor | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);

  const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;
  const count = (a: number, b: number) => Math.abs(a - b) + 1;
  const { labels, dir } = useI18n();

  // A new period can have fewer columns than the one the cursor was in.
  const current =
    pos && rowCount && colCount
      ? { row: Math.min(pos.row, rowCount - 1), col: Math.min(pos.col, colCount - 1) }
      : pos;
  // Set by a page key, read once the new period is drawn.
  const paging = useRef(false);

  const selection =
    anchor !== null && current
      ? {
          row: current.row,
          from: Math.min(anchor, current.col),
          to: Math.max(anchor, current.col),
        }
      : null;

  useEffect(() => {
    if (!paging.current) return;
    paging.current = false;
    if (current && cellLabel) announce?.(labels.announce.pagedTo(cellLabel(current.row, current.col)));
    // Only a new period is news; the cursor and labels are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    setFocused(true);
    setPos(
      (p) => p ?? { row: 0, col: Math.min(Math.max(initialCol, 0), colCount - 1) }
    );
  };

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    setFocused(false);
    setAnchor(null);
    paging.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Keys from events or the popover inside the grid are theirs to handle.
    if (e.target !== e.currentTarget || !current || !rowCount || !colCount) return;

    // Page Up and Page Down show the previous and next period. With a modifier
    // they stay the browser's (Ctrl+Page Down switches tabs).
    if (
      (e.key === "PageUp" || e.key === "PageDown") &&
      onPage &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      setAnchor(null);
      paging.current = true;
      onPage(e.key === "PageUp" ? "prev" : "next");
      return;
    }
    paging.current = false; // any other key means the page is no longer news

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const from = anchor === null ? current.col : Math.min(anchor, current.col);
      const to = anchor === null ? current.col : Math.max(anchor, current.col);
      const first = slotAt(current.row, from);
      onSelect(first.resourceId, first.date, slotAt(current.row, to).date);
      setAnchor(null);
      announce?.(labels.announce.selected(count(from, to)));
      return;
    }

    if (e.key === "Escape") {
      if (anchor === null) return;
      e.preventDefault();
      setAnchor(null);
      announce?.(labels.announce.selectionCancelled);
      return;
    }

    const next = moveCursor(current, flipHorizontal(e.key, dir === "rtl"), rowCount, colCount);
    if (!next) return;
    e.preventDefault();

    if (e.shiftKey && next.row === current.row && e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      const from = anchor ?? current.col;
      setAnchor(from);
      announce?.(labels.announce.selecting(count(from, next.col)));
    } else {
      setAnchor(null);
    }
    setPos(next);
  };

  return {
    cursor: focused ? current : null,
    selection,
    activeId: focused && current ? cellId(current.row, current.col) : undefined,
    cellId,
    gridProps: { onKeyDown, onFocus, onBlur },
  };
};
