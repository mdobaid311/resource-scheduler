// src/components/ResourceScheduler/TimelineGrid.tsx
import { isSameDay, isSameHour } from "date-fns";
import React from "react";
import { EmptySlotItem } from "./EmptySlotItem";
import { EventItem } from "./EventItem";
import { TimelineGridProps } from "./types";
import { isToday } from "./utils/dateUtils";

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
  onEventClick,
  renderEventPopover,
  onEventDrop,
  calculateEventPositions,
  getGridTemplateRows,
}) => {
  const datesInView = getDatesInView();
  const timeSlots = getTimeSlots();
  const slots = viewType === "day" ? timeSlots : datesInView;

  const getSelectionRange = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    const dates = viewType === "day" ? getTimeSlots() : getDatesInView();
    const startIdx = dates.findIndex((d) =>
      viewType === "day"
        ? isSameHour(d, dragStart.date)
        : isSameDay(d, dragStart.date)
    );
    const endIdx = dates.findIndex((d) =>
      viewType === "day"
        ? isSameHour(d, dragEnd.date)
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

  const handleCellClick = (date: Date, resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;
    const event = resource.events.find((e) =>
      viewType === "day"
        ? isSameDay(e.startDate, date) && isSameHour(e.startDate, date)
        : isSameDay(e.startDate, date)
    );
    if (event && onEventClick) onEventClick(event, resource);
  };

  return (
    <div
      className="grid relative"
      style={{
        gridTemplateColumns:
          viewType === "day"
            ? `repeat(24, ${timeColumnWidth})`
            : `repeat(${slots.length}, ${dateColumnWidth})`,
        gridTemplateRows: getGridTemplateRows(),
      }}
    >
      {resources.map((resource, rowIndex) => {
        const eventPositions = calculateEventPositions(resource.events, slots);

        return (
          <React.Fragment key={resource.id}>
            {/* Event cells */}
            {eventPositions.map(({ event, startPosition, span, lane }) => (
              <div
                key={event.id}
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
                  />
                </div>
              </div>
            ))}

            {/* Empty Cells */}
            {slots.map((slot, colIndex) => {
              const isSelected =
                selectionRange &&
                selectionRange.resourceId === resource.id &&
                colIndex >= selectionRange.start &&
                colIndex <= selectionRange.end;

              const isCurrentDay = isToday(slot);

              return (
                <EmptySlotItem
                  key={`${resource.id}-${colIndex}`}
                  colIndex={colIndex}
                  rowIndex={rowIndex}
                  resource={resource}
                  slot={slot}
                  isSelected={!!isSelected}
                  isToday={isCurrentDay}
                  onMouseDown={onMouseDown}
                  onMouseEnter={onMouseEnter}
                  onCellClick={handleCellClick}
                  onEventDrop={onEventDrop}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};
