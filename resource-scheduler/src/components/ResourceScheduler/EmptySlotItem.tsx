// src/components/ResourceScheduler/EmptySlotItem.tsx
import React, { useContext } from "react";
import { SchedulerDragContext } from "./hooks/useEventDrag";
import { EmptySlotItemProps } from "./types";

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
  const target = useContext(SchedulerDragContext)?.activeDrag?.target;
  const isDropTarget =
    target?.resourceId === resource.id && target.slot === slot.getTime();

  return (
    <div
      // Read by useEventDrag to find the cell under the pointer.
      data-rs-slot={slot.getTime()}
      data-rs-resource={resource.id}
      className={`border-b border-r cursor-pointer overflow-hidden ${
        isDropTarget
          ? "bg-ocrs-blue-50 outline-2 -outline-offset-2 outline-ocrs-primary"
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
