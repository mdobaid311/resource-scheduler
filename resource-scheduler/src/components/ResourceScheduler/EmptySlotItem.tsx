// src/components/ResourceScheduler/EmptySlotItem.tsx
import React, { useContext } from "react";
import { SchedulerDragContext } from "./hooks/useEventDrag";
import type { EmptySlotItemProps } from "./types";
import { isSlotInRange } from "./utils/dateUtils";

export const EmptySlotItem: React.FC<EmptySlotItemProps> = ({
  colIndex,
  rowIndex,
  resource,
  slot,
  isSelected,
  isToday,
  isUnavailable,
  id,
  label,
  isActive,
  onMouseDown,
  onMouseEnter,
  onCellClick,
  renderEmptyCell,
}) => {
  // While an event is moved or resized, tint every slot it would cover.
  const drag = useContext(SchedulerDragContext);
  const footprint = drag?.activeDrag?.placement;
  const inFootprint =
    !!drag &&
    !!footprint &&
    footprint.resourceId === resource.id &&
    isSlotInRange(slot, footprint, drag.viewType, drag.slotMinutes);
  const rejected = inFootprint && !drag?.activeDrag?.allowed;

  return (
    <div
      id={id}
      role="gridcell"
      aria-label={label}
      aria-colindex={colIndex + 1}
      aria-selected={isSelected || undefined}
      aria-current={isToday ? "date" : undefined}
      // Read by useEventDrag to find the cell under the pointer.
      data-rs-slot={slot.getTime()}
      data-rs-resource={resource.id}
      data-rs-unavailable={isUnavailable ? "" : undefined}
      data-rs-footprint={inFootprint ? "" : undefined}
      className={`border-b border-e cursor-pointer overflow-hidden ${
        isActive ? "ring-2 ring-inset ring-ocrs-ring " : ""
      }${
        rejected
          ? "bg-ocrs-destructive/15 outline outline-1 -outline-offset-1 outline-ocrs-destructive"
          : inFootprint
          ? "bg-ocrs-accent outline outline-1 -outline-offset-1 outline-ocrs-primary"
          : isSelected
          ? "bg-ocrs-blue-50"
          : isUnavailable
          ? "bg-ocrs-muted-foreground/15"
          : isToday
          ? "bg-ocrs-blue-50"
          : "hover:bg-ocrs-gray-50"
      }`}
      style={{
        gridRow: rowIndex + 2,
        gridColumn: colIndex + 1,
        // Keep scrolled-to cells clear of the sticky resource column / header.
        scrollMarginInlineStart: "var(--rs-sticky-left, 0px)",
        scrollMarginTop: "var(--rs-sticky-top, 0px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onMouseDown(slot, resource.id, e);
        }
      }}
      onMouseEnter={() => onMouseEnter(slot, resource.id)}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCellClick(slot, resource.id);
        }
      }}
    >
      {renderEmptyCell && renderEmptyCell(slot, resource)}
    </div>
  );
};
