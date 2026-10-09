// src/components/ResourceScheduler/hooks/useEventCreation.ts
import { useState, useCallback, useEffect } from "react";
import { SchedulerEvent, ViewType } from "../types";
import { getSelectionBounds } from "../utils/dateUtils";
import { Placement } from "../utils/placement";

export const useEventCreation = (
  onEventCreate?: (event: Omit<SchedulerEvent, "id">, resourceId: string) => void,
  viewType: ViewType = ViewType.Day,
  checkPlacement?: (event: SchedulerEvent, placement: Placement) => boolean,
  slotMinutes = 60
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

  // Shared by mouse and keyboard selection: first and last selected slot.
  const commitRange = useCallback(
    (resourceId: string, fromSlot: Date, toSlot: Date) => {
      if (!onEventCreate) return;
      const { start, end } = getSelectionBounds(
        fromSlot,
        toSlot,
        viewType,
        slotMinutes
      );

      const newEvent: Omit<SchedulerEvent, "id"> = {
        title: "New Event",
        startDate: start,
        endDate: end,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      };

      const allowed =
        checkPlacement?.(
          { ...newEvent, id: "__new__" },
          { resourceId, start, end }
        ) ?? true;
      if (allowed) onEventCreate(newEvent, resourceId);
    },
    [onEventCreate, viewType, checkPlacement, slotMinutes]
  );

  const handleMouseUp = useCallback(() => {
    if (
      isDragging &&
      dragStart &&
      dragEnd &&
      dragStart.resourceId === dragEnd.resourceId
    ) {
      commitRange(dragStart.resourceId, dragStart.date, dragEnd.date);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, commitRange]);

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
    commitRange,
  };
};
