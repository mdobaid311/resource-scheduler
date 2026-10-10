// src/components/ResourceScheduler/TimelineGrid.tsx
import { addDays, addMinutes, isSameDay, startOfDay } from "date-fns";
import React, { useEffect, useId, useRef } from "react";
import { EmptySlotItem } from "./EmptySlotItem";
import { EventItem } from "./EventItem";
import { SchedulerDragContext, useEventDrag } from "./hooks/useEventDrag";
import { useGridKeyboard } from "./hooks/useGridKeyboard";
import { useTouchSelect } from "./hooks/useTouchSelect";
import { useNow } from "./hooks/useNow";
import { useI18n } from "./i18n";
import type { TimelineGridProps } from "./types";
import { isCellUnavailable } from "./utils/availability";
import { formatSlotLabel, isToday } from "./utils/dateUtils";

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  resources,
  viewType,
  timeColumnWidth = "90px",
  dateColumnWidth = "140px",
  getTimeSlots,
  getDatesInView,
  isDragging,
  dragStart,
  dragEnd,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onCancelSelect,
  onEventClick,
  renderEventPopover,
  onEventDrop,
  onEventResize,
  checkPlacement,
  slotMinutes = 60,
  businessHours,
  nowIndicator,
  rowRange,
  ariaLabel,
  describedBy,
  announce,
  onSelectRange,
  calculateEventPositions,
  getGridTemplateRows,
  renderTimeSlot,
  renderEmptyCell,
}) => {
  const datesInView = getDatesInView();
  const timeSlots = getTimeSlots();
  const slots = viewType === "day" ? timeSlots : datesInView;
  const gridRef = useRef<HTMLDivElement>(null);
  const idPrefix = `rs${useId()}`;
  const i18n = useI18n();

  // Events may be moved anywhere inside the visible range by keyboard.
  const visibleRange = slots.length
    ? viewType === "day"
      ? { start: slots[0], end: addMinutes(slots[slots.length - 1], slotMinutes) }
      : {
          start: startOfDay(slots[0]),
          end: addDays(startOfDay(slots[slots.length - 1]), 1),
        }
    : undefined;

  // A line at the current time in today's day view, moved every minute.
  const clock = useNow(nowIndicator ? 60_000 : undefined);
  const nowPercent =
    nowIndicator &&
    viewType === "day" &&
    visibleRange &&
    clock >= visibleRange.start &&
    clock < visibleRange.end
      ? ((clock.getTime() - visibleRange.start.getTime()) * 100) /
        (visibleRange.end.getTime() - visibleRange.start.getTime())
      : null;

  const drag = useEventDrag({
    viewType,
    slotMinutes,
    resources,
    visibleRange,
    announce,
    onEventDrop,
    onEventResize,
    checkPlacement,
  });

  // The cursor starts at "now" when it is on screen, else at the first slot.
  const now = new Date();
  const initialCol =
    viewType === "day"
      ? slots.length && isSameDay(slots[0], now)
        ? Math.max(0, slots.filter((s) => s <= now).length - 1)
        : 0
      : Math.max(
          0,
          slots.findIndex((s) => isSameDay(s, now))
        );

  // Touch: hold and drag across empty slots to select them, like the mouse does.
  useTouchSelect(gridRef, {
    onStart: (slot, resourceId) => onMouseDown(slot, resourceId),
    onEnter: onMouseEnter,
    onEnd: () => onMouseUp?.(),
    onCancel: () => onCancelSelect?.(),
  });

  const keyboard = useGridKeyboard({
    rowCount: resources.length,
    colCount: slots.length,
    initialCol,
    idPrefix,
    slotAt: (row, col) => ({ resourceId: resources[row].id, date: slots[col] }),
    onSelect: (resourceId, from, to) => onSelectRange?.(resourceId, from, to),
    announce,
  });

  // With a row window, rows still in use stay mounted: the one holding the
  // keyboard cursor, the source and target of an event being carried
  // (unmounting that event would end the drag), and the event that is about
  // to get focus back after a drop or cancel.
  const carried = drag.activeDrag;
  const rowOfResource = (id: string | null) => resources.findIndex((r) => r.id === id);
  const rowOfEvent = (id: string | null) =>
    resources.findIndex((r) => r.events.some((e) => e.id === id));
  const pinned = new Set<number>();
  if (rowRange) {
    if (keyboard.cursor) pinned.add(keyboard.cursor.row);
    if (carried) {
      pinned.add(rowOfResource(carried.placement?.resourceId ?? null));
      pinned.add(rowOfEvent(carried.eventId));
    }
    pinned.add(rowOfEvent(drag.pendingFocus.current));
  }
  const isRendered = (row: number) =>
    !rowRange || (row >= rowRange.start && row < rowRange.end) || pinned.has(row);

  // An event carried by keyboard: keep the place it would land in view. (A
  // pointer drag is already over its target.)
  const carriedBy = drag.grabbedEventId ? carried?.placement : null;
  const footprintKey = carriedBy
    ? `${carriedBy.resourceId}|${carriedBy.start.getTime()}|${carriedBy.end.getTime()}`
    : null;
  useEffect(() => {
    if (!footprintKey) return;
    gridRef.current
      ?.querySelector<HTMLElement>("[data-rs-footprint]")
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [footprintKey]);

  // After a keyboard drop the event is re-rendered (possibly under another
  // resource), so focus is put back on it.
  useEffect(() => {
    const id = drag.pendingFocus.current;
    if (!id) return;
    const el = [
      ...(gridRef.current?.querySelectorAll<HTMLElement>("[data-rs-event]") ?? []),
    ].find((node) => node.dataset.rsEvent === id);
    if (el) {
      el.focus();
      // It may already have focus, which scrolls nothing, and be far away.
      el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      drag.pendingFocus.current = null;
    }
  });

  // Browsers do not scroll an aria-activedescendant target into view.
  useEffect(() => {
    if (!keyboard.activeId) return;
    document
      .getElementById(keyboard.activeId)
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [keyboard.activeId]);

  const getSelectionRange = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    // Day view slots are exact Dates, so compare timestamps.
    const startIdx = slots.findIndex((d) =>
      viewType === "day"
        ? d.getTime() === dragStart.date.getTime()
        : isSameDay(d, dragStart.date)
    );
    const endIdx = slots.findIndex((d) =>
      viewType === "day"
        ? d.getTime() === dragEnd.date.getTime()
        : isSameDay(d, dragEnd.date)
    );
    if (startIdx === -1 || endIdx === -1) return null;
    return {
      start: Math.min(startIdx, endIdx),
      end: Math.max(startIdx, endIdx),
      resourceId: dragStart.resourceId,
    };
  };

  const selectionRange = getSelectionRange();
  // One label per column; cells add the resource name.
  const slotLabels = slots.map((slot) => formatSlotLabel(slot, viewType, i18n));

  const handleCellClick = (date: Date, resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;
    const event = resource.events.find((e) =>
      viewType === "day"
        ? e.startDate >= date && e.startDate < addMinutes(date, slotMinutes)
        : isSameDay(e.startDate, date)
    );
    if (event && onEventClick) onEventClick(event, resource);
  };

  return (
    <SchedulerDragContext.Provider value={drag}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={ariaLabel ?? i18n.labels.gridName}
        aria-describedby={describedBy}
        aria-rowcount={resources.length}
        aria-colcount={slots.length}
        aria-activedescendant={keyboard.activeId}
        tabIndex={0}
        {...keyboard.gridProps}
        className="grid relative outline-none"
        style={{
          gridTemplateColumns: `repeat(${slots.length}, ${
            viewType === "day" ? timeColumnWidth : dateColumnWidth
          })`,
          gridTemplateRows: getGridTemplateRows(),
        }}
      >
        {resources.map((resource, rowIndex) => {
          if (!isRendered(rowIndex)) return null;
          const eventPositions = calculateEventPositions(resource.events, slots);

          return (
            <div
              key={resource.id}
              role="row"
              aria-rowindex={rowIndex + 1}
              style={{ display: "contents" }}
            >
              {/* Event cells */}
              {eventPositions.map(({ event, startPosition, span, lane }) => (
                <div
                  key={event.id}
                  role="gridcell"
                  aria-colindex={startPosition + 1}
                  aria-colspan={span}
                  style={{
                    gridRow: rowIndex + 2,
                    gridColumn: `${startPosition + 1} / span ${span}`,
                  }}
                  className="p-1 flex flex-col gap-1"
                >
                  <div
                    style={{
                      marginTop: `${lane * 52}px`,
                      height: "48px",
                      padding: "2px",
                    }}
                  >
                    <EventItem
                      event={event}
                      resource={resource}
                      renderEventPopover={renderEventPopover}
                      renderTimeSlot={renderTimeSlot}
                    />
                  </div>
                </div>
              ))}

              {/* Empty Cells */}
              {slots.map((slot, colIndex) => {
                const keyboardSelection = keyboard.selection;
                const isSelected =
                  (selectionRange &&
                    selectionRange.resourceId === resource.id &&
                    colIndex >= selectionRange.start &&
                    colIndex <= selectionRange.end) ||
                  (keyboardSelection &&
                    keyboardSelection.row === rowIndex &&
                    colIndex >= keyboardSelection.from &&
                    colIndex <= keyboardSelection.to);

                const unavailable = isCellUnavailable(resource, slot, {
                  businessHours,
                  viewType,
                  slotMinutes,
                });

                return (
                  <EmptySlotItem
                    key={`${resource.id}-${colIndex}`}
                    id={keyboard.cellId(rowIndex, colIndex)}
                    label={`${resource.name}, ${slotLabels[colIndex]}${
                      unavailable ? `, ${i18n.labels.unavailable}` : ""
                    }`}
                    isUnavailable={unavailable}
                    isActive={
                      keyboard.cursor?.row === rowIndex &&
                      keyboard.cursor.col === colIndex
                    }
                    colIndex={colIndex}
                    rowIndex={rowIndex}
                    resource={resource}
                    slot={slot}
                    isSelected={!!isSelected}
                    isToday={isToday(slot)}
                    onMouseDown={onMouseDown}
                    onMouseEnter={onMouseEnter}
                    onCellClick={handleCellClick}
                    renderEmptyCell={renderEmptyCell}
                  />
                );
              })}
            </div>
          );
        })}
        {nowPercent !== null && (
          <div
            aria-hidden="true"
            data-rs-now=""
            className={`absolute top-0 bottom-0 w-0.5 ${
              i18n.dir === "rtl" ? "-mr-px" : "-ml-px"
            } bg-ocrs-destructive pointer-events-none z-10`}
            style={
              i18n.dir === "rtl"
                ? { right: `${nowPercent}%` }
                : { left: `${nowPercent}%` }
            }
          />
        )}
      </div>
    </SchedulerDragContext.Provider>
  );
};
