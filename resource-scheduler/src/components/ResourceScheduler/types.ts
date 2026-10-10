/* eslint-disable @typescript-eslint/no-explicit-any */

// src/components/ResourceScheduler/types.ts
import type { Locale } from "date-fns";
import type { PartialLabels } from "./i18n";
import type { ViewOptions } from "./utils/dateUtils";
import type { Placement, PlacementRules } from "./utils/placement";
import type { Utilization } from "./utils/utilization";

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
  /**
   * Only for events passed in the flat `events` prop: the resource it belongs
   * to. Ignored on events inside `resource.events`.
   */
  resourceId?: string;
  /** Like `resourceId`, for an event that belongs to several resources. */
  resourceIds?: string[];
  /**
   * Makes this event repeat. The scheduler draws one event per occurrence in
   * the visible range; handlers receive the occurrence (id
   * `<id>::<yyyy-MM-dd>`, with `seriesId`), and your data keeps the one series.
   */
  recurrence?: Recurrence;
  /** Set on an occurrence: the `id` of the recurring event it comes from. */
  seriesId?: string;
}

/** How an event repeats. The first occurrence is the event's own start. */
export interface Recurrence {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  /** Repeat every n days, weeks, months or years. Default 1. */
  interval?: number;
  /** Weekly only: the weekdays it falls on, 0 (Sunday) to 6. Default: the first occurrence's weekday. */
  byWeekday?: number[];
  /** The last day it may start on, inclusive (the time is ignored). */
  until?: Date;
  /** How many occurrences in total, counting the first. Exceptions still count. */
  count?: number;
  /** Days to skip. Compared by calendar day. */
  exceptions?: Date[];
}

/** @deprecated Use `SchedulerEvent`. The name `Event` shadows the DOM global. */
export type Event = SchedulerEvent;

/** A range of empty slots the user selected. `end` is exclusive. */
export interface SlotSelection {
  resourceId: string;
  start: Date;
  end: Date;
}

/** Working time. Everything outside it is shaded. */
export interface BusinessHours {
  /** Working days, 0 (Sunday) to 6 (Saturday). Default Monday to Friday. */
  daysOfWeek?: number[];
  /** First working hour, 0-23. Day view only. Default 9. */
  startHour?: number;
  /** Hour working time ends (exclusive), 1-24. Day view only. Default 17. */
  endHour?: number;
}

/** A period a resource cannot be booked, such as leave. `end` is exclusive. */
export interface UnavailableRange {
  start: Date;
  end: Date;
}

export interface Resource {
  id: string;
  name: string;
  role?: string;
  events: SchedulerEvent[];
  /** Overrides the `businessHours` prop for this resource; `false` means always available. */
  businessHours?: BusinessHours | false;
  /** Time off and other blocked periods. Shaded in the grid. */
  unavailable?: UnavailableRange[];
  /**
   * How many bookings can run at the same time: seats in a room, units of a
   * piece of equipment. Only utilization uses it, as a multiplier on the
   * available time. Default 1.
   */
  capacity?: number;
  /**
   * Puts the resource under a collapsible header with this name. Resources
   * with the same group are listed together, at the place the group's first
   * member is.
   */
  group?: string;
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

/** What you pass in: `events` may be left out when you use the flat `events` prop. */
export type ResourceInput = Omit<Resource, "events"> & {
  events?: SchedulerEvent[];
};

export interface ResourceSchedulerProps {
  resources: ResourceInput[];
  /**
   * Events as one flat list. Each names its resource with `resourceId` (or
   * `resourceIds` for several) and is drawn there, in addition to whatever a
   * resource holds in its own `events`. Handlers are unchanged: you still
   * receive `fromResourceId` and `toResourceId` to update your own list.
   */
  events?: SchedulerEvent[];
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
  /** Accessible name of the schedule grid. Default `labels.gridName` ("Resource schedule"). */
  ariaLabel?: string;
  /**
   * A date-fns locale, for example `import { de } from "date-fns/locale"`.
   * Day and month names, date formats, the 12 or 24-hour clock and the first
   * day of the week follow it. Default: English, Sunday first, 12-hour.
   */
  locale?: Locale;
  /** `true` for a 12-hour clock, `false` for 24-hour. Default: what the locale uses. */
  hour12?: boolean;
  /**
   * `"rtl"` lays the scheduler out right to left for Arabic, Hebrew and other
   * right-to-left languages: the resource column on the right, time running
   * leftwards, mirrored arrows, and the left arrow key moving forward in time.
   * Default `"ltr"`.
   */
  dir?: "ltr" | "rtl";
  /**
   * The text the scheduler shows and reads out: toolbar, headers, view names
   * and screen reader messages. Pass any subset; the rest stays English.
   */
  labels?: PartialLabels;
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
  /**
   * Working time. Slots outside it, and non-working days, are shaded. A
   * resource's own `businessHours` overrides it. Omit it to shade nothing.
   */
  businessHours?: BusinessHours;
  /**
   * Reject every move, resize and create that touches a shaded slot: outside
   * business hours, or inside a resource's `unavailable` range.
   */
  blockUnavailable?: boolean;
  /**
   * Names of the groups (`Resource.group`) that are collapsed. Pass it, with
   * `onCollapsedGroupsChange`, to control it yourself.
   */
  collapsedGroups?: string[];
  /** Groups that start collapsed, when you do not control `collapsedGroups`. */
  defaultCollapsedGroups?: string[];
  /** Called with the new list of collapsed groups when the user toggles one. */
  onCollapsedGroupsChange?: (groups: string[]) => void;
  /** Day view: draw a line at the current time, moved every minute. */
  nowIndicator?: boolean;
  /**
   * Under each resource name, show how much of its available time is booked in
   * the visible range. Available time follows `businessHours`, a resource's
   * `unavailable` ranges and its `capacity`; `getUtilization` does the same sum.
   */
  showUtilization?: boolean;
  /**
   * Render only the rows near the viewport. Default: on above 100 resources.
   * It needs the scheduler to sit in a box with a fixed height; without one
   * every row is drawn, as before.
   */
  virtualize?: boolean;
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
  /** Booked against available time by resource id. Resources without an entry show no bar. */
  utilization?: Map<string, Utilization>;
  /** Called with a group's name when its header is toggled. Without it the headers are plain labels. */
  onToggleGroup?: (group: string) => void;
  /** Render only these rows (end exclusive); spacers keep the full height. */
  rowRange?: { start: number; end: number };
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
  businessHours?: BusinessHours;
  nowIndicator?: boolean;
  /** Render only these rows (end exclusive), plus the ones in use by keyboard or drag. */
  rowRange?: { start: number; end: number };
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
  /** Outside business hours or inside an unavailable range. */
  isUnavailable?: boolean;
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
