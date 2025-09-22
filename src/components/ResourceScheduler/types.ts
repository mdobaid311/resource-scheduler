/* eslint-disable @typescript-eslint/no-explicit-any */

// src/components/ResourceScheduler/types.ts
import { ViewType } from "@/types/scheduler.enum";
import type { Event, Resource } from "@/types/scheduler.type";

export interface ResourceSchedulerProps {
  resources: Resource[];
  initialDate?: Date;
  initialView?: ViewType;
  onEventClick?: (event: Event, resource: Resource) => void;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  onEventCreate?: (event: Omit<Event, "id">, resourceId: string) => void;
  renderEventPopover?: (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  onEventDrop?: (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  resourceColumnWidth?: string;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  allowViewChange?: boolean;
}

export interface SchedulerControlsProps {
  currentDate: Date;
  viewType: ViewType;
  onNavigate: (direction: "prev" | "next") => void;
  onViewChange: (view: ViewType) => void;
  onGoToToday: () => void;
  allowViewChange?: boolean;
}

export interface ResourceColumnProps {
  resources: Resource[];
  viewType: ViewType;
  resourceColumnWidth?: string;
  getResourceRowHeight: (resource: Resource) => number;
}

export interface TimelineHeaderProps {
  viewType: ViewType;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  getTimeSlots: () => Date[];
  getDatesInView: () => Date[];
}

export interface TimelineGridProps {
  resources: Resource[];
  viewType: ViewType;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  getTimeSlots: () => Date[];
  getDatesInView: () => Date[];
  isDragging: boolean;
  dragStart: { date: Date; resourceId: string } | null;
  dragEnd: { date: Date; resourceId: string } | null;
  onMouseDown: (date: Date, resourceId: string, e?: React.MouseEvent) => void;
  onMouseEnter: (date: Date, resourceId: string) => void;
  onEventClick?: (event: Event, resource: Resource) => void;
  renderEventPopover?: (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  onEventDrop?: (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  calculateEventPositions: (events: Event[], datesInView: Date[]) => any[];
  getGridTemplateRows: () => string;
}

export interface EventItemProps {
  event: Event;
  resource?: Resource;
  renderEventPopover?: (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
}

export interface EmptySlotItemProps {
  resource: Resource;
  slot: Date;
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isToday: boolean;
  onMouseDown: (date: Date, resourceId: string, e?: React.MouseEvent) => void;
  onMouseEnter: (date: Date, resourceId: string) => void;
  onCellClick: (date: Date, resourceId: string) => void;
  onEventDrop?: (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
}
