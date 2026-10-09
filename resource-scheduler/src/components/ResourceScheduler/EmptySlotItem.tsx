// src/components/ResourceScheduler/EmptySlotItem.tsx
import React, { useContext } from "react";
import { SchedulerDragContext } from "./hooks/useEventDrag";
import { EmptySlotItemProps } from "./types";
import { isSlotInRange } from "./utils/dateUtils";

export const EmptySlotItem: React.FC<EmptySlotItemProps> = ({
  colIndex,
  rowIndex,
  resource,
  slot,
  isSelected,
  isToday,
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
    isSlotInRange(slot, footprint, drag.viewType);
  const rejected = inFootprint && !drag?.activeDrag?.allowed;

  return (
    <div
      // Read by useEventDrag to find the cell under the pointer.
      data-rs-slot={slot.getTime()}
      data-rs-resource={resource.id}
      className={`border-b border-r cursor-pointer overflow-hidden ${
        rejected
          ? "bg-ocrs-destructive/15 outline outline-1 -outline-offset-1 outline-ocrs-destructive"
          : inFootprint
          ? "bg-ocrs-accent outline outline-1 -outline-offset-1 outline-ocrs-primary"
          : isToday
          ? "bg-ocrs-blue-50"
          : isSelected
          ? "bg-ocrs-blue-50"
          : "hover:bg-ocrs-gray-50"
      }`}
      style={{
        gridRow: rowIndex + 2,
        gridColumn: colIndex + 1,
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
