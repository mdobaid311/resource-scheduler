/* eslint-disable @typescript-eslint/no-explicit-any */

// src/components/ResourceScheduler/types.ts
export enum ViewType {
  Day = "day",
  Week = "week",
  Month = "month",
  Quarter = "quarter",
  Year = "year",
}

export interface SchedulerEvent {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  description?: string;
}

/** @deprecated Use `SchedulerEvent`. The name `Event` shadows the DOM global. */
export type Event = SchedulerEvent;

export interface Resource {
  id: string;
  name: string;
  role?: string;
  events: SchedulerEvent[];
}

export interface ResourceSchedulerProps {
  resources: Resource[];
  initialDate?: Date;
  initialView?: ViewType;
  availableViews?: ViewType[];
  onEventClick?: (event: SchedulerEvent, resource: Resource) => void;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  onEventCreate?: (event: Omit<SchedulerEvent, "id">, resourceId: string) => void;
  renderEventPopover?: (
    event: SchedulerEvent,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  onEventDrop?: (
    event: SchedulerEvent,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  resourceColumnWidth?: string;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  allowViewChange?: boolean;
  renderResourceHeader?: (resource: Resource) => React.ReactNode;
  renderDateHeader?: (date: Date, view: ViewType) => React.ReactNode;
  renderTimeSlot?: (event: SchedulerEvent, resource: Resource[]) => React.ReactNode;
  renderEmptyCell?: (date: Date, resource: Resource) => React.ReactNode;
}

export interface SchedulerControlsProps {
  currentDate: Date;
  viewType: ViewType;
  onNavigate: (direction: "prev" | "next") => void;
  onViewChange: (view: ViewType) => void;
  onGoToToday: () => void;
  allowViewChange?: boolean;
  availableViews?: ViewType[];
}

export interface ResourceColumnProps {
  resources: Resource[];
  viewType: ViewType;
  resourceColumnWidth?: string;
  getResourceRowHeight: (resource: Resource) => number;
  renderResourceHeader?: (resource: Resource) => React.ReactNode;
}

export interface TimelineHeaderProps {
  viewType: ViewType;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  getTimeSlots: () => Date[];
  getDatesInView: () => Date[];
  renderDateHeader?: (date: Date, view: ViewType) => React.ReactNode;
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
  onEventClick?: (event: SchedulerEvent, resource: Resource) => void;
  renderEventPopover?: (
    event: SchedulerEvent,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  onEventDrop?: (
    event: SchedulerEvent,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  calculateEventPositions: (events: SchedulerEvent[], datesInView: Date[]) => any[];
  getGridTemplateRows: () => string;
  renderTimeSlot?: (event: SchedulerEvent, resource: Resource[]) => React.ReactNode;
  renderEmptyCell?: (date: Date, resource: Resource) => React.ReactNode;
}

export interface EventItemProps {
  event: SchedulerEvent;
  resource?: Resource;
  renderEventPopover?: (
    event: SchedulerEvent,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  renderTimeSlot?: (event: SchedulerEvent, resource: Resource[]) => React.ReactNode;
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
  renderEmptyCell?: (date: Date, resource: Resource) => React.ReactNode;
}
