// src/components/ResourceScheduler/hooks/useGridKeyboard.ts
import { useState } from "react";
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
}

/**
 * Keyboard cursor for the slot grid (a single tab stop using
 * aria-activedescendant). Arrows/Home/End move, Shift+Left/Right extends a
 * range, Enter or Space selects, Escape drops the range.
 */
export const useGridKeyboard = ({
  rowCount,
  colCount,
  initialCol,
  idPrefix,
  slotAt,
  onSelect,
  announce,
}: GridKeyboardOptions) => {
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState<Cursor | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);

  const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;
  const count = (a: number, b: number) => Math.abs(a - b) + 1;
  const { labels, dir } = useI18n();

  const selection =
    anchor !== null && pos
      ? {
          row: pos.row,
          from: Math.min(anchor, pos.col),
          to: Math.max(anchor, pos.col),
        }
      : null;

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
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Keys from events or the popover inside the grid are theirs to handle.
    if (e.target !== e.currentTarget || !pos || !rowCount || !colCount) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const from = anchor === null ? pos.col : Math.min(anchor, pos.col);
      const to = anchor === null ? pos.col : Math.max(anchor, pos.col);
      const first = slotAt(pos.row, from);
      onSelect(first.resourceId, first.date, slotAt(pos.row, to).date);
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

    const next = moveCursor(pos, flipHorizontal(e.key, dir === "rtl"), rowCount, colCount);
    if (!next) return;
    e.preventDefault();

    if (e.shiftKey && next.row === pos.row && e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      const from = anchor ?? pos.col;
      setAnchor(from);
      announce?.(labels.announce.selecting(count(from, next.col)));
    } else {
      setAnchor(null);
    }
    setPos(next);
  };

  return {
    cursor: focused ? pos : null,
    selection,
    activeId: focused && pos ? cellId(pos.row, pos.col) : undefined,
    cellId,
    gridProps: { onKeyDown, onFocus, onBlur },
  };
};
