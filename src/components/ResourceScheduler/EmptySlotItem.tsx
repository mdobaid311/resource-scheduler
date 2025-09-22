/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ResourceScheduler/EmptySlotItem.tsx
import React from "react";
import { useDrop } from "react-dnd";
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
  onEventDrop,
}) => {
  const [, drop] = useDrop(
    () => ({
      accept: "BOX",
      drop: (item: { event: any }) => {
        if (onEventDrop) {
          const event = item.event;
          const newStartDate = new Date(slot);
          const duration = event.endDate.getTime() - event.startDate.getTime();
          const newEndDate = new Date(newStartDate.getTime() + duration);
          onEventDrop(
            event,
            item.event.id,
            resource.id,
            newStartDate,
            newEndDate
          );
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [resource, slot, onEventDrop]
  );

  return (
    <div
      className={`border-b border-r cursor-pointer ${
        isToday ? "bg-blue-50" : isSelected ? "bg-blue-50" : "hover:bg-gray-50"
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
      ref={drop as any}
    />
  );
};
