
// src/components/ResourceScheduler/hooks/useEventCreation.ts
import { useState, useCallback } from 'react';
import type { Event } from '@/types/scheduler.type';

export const useEventCreation = (onEventCreate?: (event: Omit<Event, "id">, resourceId: string) => void) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: Date; resourceId: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; resourceId: string } | null>(null);

  const handleMouseDown = useCallback((date: Date, resourceId: string, e?: React.MouseEvent) => {
    if (e?.target instanceof HTMLElement && e.target.closest(".event-item")) return;
    setIsDragging(true);
    setDragStart({ date, resourceId });
    setDragEnd({ date, resourceId });
  }, []);

  const handleMouseEnter = useCallback((date: Date, resourceId: string) => {
    if (isDragging && dragStart) {
      setDragEnd({ date, resourceId });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd && dragStart.resourceId === dragEnd.resourceId && onEventCreate) {
      const startDate = new Date(
        Math.min(dragStart.date.getTime(), dragEnd.date.getTime())
      );
      const endDate = new Date(
        Math.max(dragStart.date.getTime(), dragEnd.date.getTime())
      );

      const newEvent: Omit<Event, "id"> = {
        title: "New Event",
        startDate,
        endDate,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
        duration: "1h", // You might want to calculate this based on viewType
      };
      
      onEventCreate(newEvent, dragStart.resourceId);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onEventCreate]);

  return {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
};