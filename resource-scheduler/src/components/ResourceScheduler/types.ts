/* eslint-disable @typescript-eslint/no-explicit-any */

// src/components/ResourceScheduler/types.ts
import type { ViewOptions } from "./utils/dateUtils";
import type { Placement, PlacementRules } from "./utils/placement";

// A const object plus a union (not an `enum`) so the source compiles in apps
// that enable `erasableSyntaxOnly`, which is the create-vite default.
export const ViewType = {
  Day: "day",
  Week: "week",
  Month: "month",
  Quarter: "quarter",
  Year: "year",
} as const;
export type ViewType = (typeof ViewType)[keyof typeof ViewType];

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

/** A range of empty slots the user selected. `end` is exclusive. */
export interface SlotSelection {
  resourceId: string;
  start: Date;
  end: Date;
}

export interface Resource {
  id: string;
  name: string;
  role?: string;
  events: SchedulerEvent[];
}

/** What the grid covers. `end` is exclusive. */
export interface VisibleRange {
  start: Date;
  end: Date;
}

/** Methods available through a `ref` on `ResourceScheduler`. */
export interface ResourceSchedulerHandle {
  /** Shows the period that contains `date`. Calls `onDateChange`. */
  goTo(date: Date): void;
  /** Switches the view and keeps the date. Calls `onViewChange`. */
  setView(view: ViewType): void;
  /** What the grid covers right now. */
  getVisibleRange(): VisibleRange;
  /**
   * Scrolls `date` to the middle of the grid. A date outside the visible
   * range navigates there first (and calls `onDateChange`).
   */
  scrollToTime(date: Date): void;
}

export interface ResourceSchedulerProps {
  resources: Resource[];
  initialDate?: Date;
  initialView?: ViewType;
  availableViews?: ViewType[];
  /** First day of the week, 0 (Sunday) to 6 (Saturday). Default 0. */
  weekStartsOn?: ViewOptions["weekStartsOn"];
  /** Leave Saturday and Sunday out of the week, month, quarter and year views. */
  hideWeekends?: boolean;
  /**
   * Called when the grid first shows and whenever the visible range changes
   * (navigation, view change, `goTo`). `end` is exclusive. Use it to load
   * only the events that are on screen.
   */
  onRangeChange?: (range: VisibleRange & { view: ViewType }) => void;
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
  /**
   * Called with the selected range when the user drag-selects or clicks empty
   * slots. Providing it replaces the built-in event creation (`onEventCreate`
   * is not called), so the app can open its own create dialog. The overlap
   * rules (`eventOverlap`, `isValidDrop`) apply: rejected selections are not
   * reported. End is exclusive.
   */
  onSlotSelect?: (selection: SlotSelection) => void;
  /** Accessible name of the schedule grid. Default "Resource schedule". */
  ariaLabel?: string;
  /** Day view only: minutes per slot, e.g. 15, 30 or 60 (default 60). */
  slotDuration?: number;
  /** Day view only: first visible hour, 0-23 (default 0). */
  dayStartHour?: number;
  /** Day view only: hour the visible range ends (exclusive), 1-24 (default 24). */
  dayEndHour?: number;
  /**
   * Called when an event edge is dragged to a new start or end. Providing it
   * turns the resize handles on. End times are exclusive.
   */
  onEventResize?: (
    event: SchedulerEvent,
    resourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  /**
   * `false` forbids overlapping events on the same resource; a function
   * decides per overlapping pair. Applies to move, resize and drag-create.
   */
  eventOverlap?: PlacementRules["eventOverlap"];
  /** Final veto for any move, resize or drag-create. Return `false` to reject. */
  isValidDrop?: PlacementRules["isValidDrop"];
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
  weekStartsOn?: ViewOptions["weekStartsOn"];
  hideWeekends?: boolean;
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
  onEventResize?: ResourceSchedulerProps["onEventResize"];
  /** Minutes per slot in day view. Default 60. */
  slotMinutes?: number;
  /** Accessible name of the grid. */
  ariaLabel?: string;
  /** Id of an element describing how to use the keyboard. */
  describedBy?: string;
  /** Screen reader announcements (rendered by the parent in a live region). */
  announce?: (message: string) => void;
  /** Keyboard selection of slots `from` to `to` of one resource. */
  onSelectRange?: (resourceId: string, from: Date, to: Date) => void;
  /** Whether an event may be placed there; rejected placements show in red and are not applied. */
  checkPlacement?: (event: SchedulerEvent, placement: Placement) => boolean;
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
  /** Element id, referenced by the grid's aria-activedescendant. */
  id?: string;
  /** Accessible name, e.g. "Ann, Tuesday, March 10, 2026". */
  label?: string;
  /** True while the keyboard cursor is on this cell. */
  isActive?: boolean;
  onMouseDown: (date: Date, resourceId: string, e?: React.MouseEvent) => void;
  onMouseEnter: (date: Date, resourceId: string) => void;
  onCellClick: (date: Date, resourceId: string) => void;
  renderEmptyCell?: (date: Date, resource: Resource) => React.ReactNode;
}
