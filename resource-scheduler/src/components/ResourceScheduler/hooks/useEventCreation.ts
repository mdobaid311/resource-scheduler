// src/components/ResourceScheduler/hooks/useEventCreation.ts
import { useState, useCallback, useEffect } from "react";
import { SchedulerEvent, ViewType } from "../types";
import { getSelectionBounds } from "../utils/dateUtils";

export const useEventCreation = (
  onEventCreate?: (event: Omit<SchedulerEvent, "id">, resourceId: string) => void,
  viewType: ViewType = ViewType.Day
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    date: Date;
    resourceId: string;
  } | null>(null);
  const [dragEnd, setDragEnd] = useState<{
    date: Date;
    resourceId: string;
  } | null>(null);

  const handleMouseDown = useCallback(
    (date: Date, resourceId: string, e?: React.MouseEvent) => {
      if (e?.target instanceof HTMLElement && e.target.closest(".event-item"))
        return;
      setIsDragging(true);
      setDragStart({ date, resourceId });
      setDragEnd({ date, resourceId });
    },
    []
  );

  const handleMouseEnter = useCallback(
    (date: Date, resourceId: string) => {
      if (isDragging && dragStart) {
        setDragEnd({ date, resourceId });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    if (
      isDragging &&
      dragStart &&
      dragEnd &&
      dragStart.resourceId === dragEnd.resourceId &&
      onEventCreate
    ) {
      const { start, end } = getSelectionBounds(
        dragStart.date,
        dragEnd.date,
        viewType
      );

      const newEvent: Omit<SchedulerEvent, "id"> = {
        title: "New Event",
        startDate: start,
        endDate: end,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      };

      onEventCreate(newEvent, dragStart.resourceId);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onEventCreate, viewType]);

  // Listen on window so releasing the mouse outside the grid still ends the drag.
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging, handleMouseUp]);

  return {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
};
