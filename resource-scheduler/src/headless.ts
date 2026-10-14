// resource-scheduler/headless: the scheduling logic without any UI. Plain
// functions over plain data, no React and no CSS, so they run in a server
// component, a worker or another framework, and build your own timeline. They
// are the same functions the component is made of.
//
// A view in four steps:
//   const columns = getColumns(date, view, options);                 // the slots or days across
//   const rows = getVisibleResources(resources, date, view, options); // recurrence expanded, events in view
//   const placed = layoutEvents(row.events, columns, view);          // start, span and lane of each event
//   const heights = getRowHeights(rows, columns, view);              // how tall each row has to be

// Views, columns and navigation
export { ViewType } from "./components/ResourceScheduler/types";
export {
  getDatesInView,
  getTimeSlots,
  getVisibleRange,
  isToday,
  navigateDate,
  resolveSlotOptions,
} from "./components/ResourceScheduler/utils/dateUtils";
export type { SlotOptions, ViewOptions } from "./components/ResourceScheduler/utils/dateUtils";
export { getColumnRange, getColumns } from "./components/ResourceScheduler/utils/layout";

// Resources, events, recurrence and groups
export { getVisibleEvents } from "./components/ResourceScheduler/utils/dateUtils";
export { getVisibleResources, withEvents } from "./components/ResourceScheduler/utils/events";
export { editOccurrence, expandEvents, expandRecurrence, splitRecurrence } from "./components/ResourceScheduler/utils/recurrence";
export { GROUP_ROW_HEIGHT, isGroupRow, withGroups } from "./components/ResourceScheduler/utils/groups";
export type { GroupRow } from "./components/ResourceScheduler/utils/groups";

// Layout
export {
  COLUMN_UTILIZATION_HEIGHT,
  LANES,
  ROW_PADDING,
  UTILIZATION_ROW_HEIGHT,
  getGridTemplateRows,
  getRowHeight,
  getRowHeightFromLayout,
  getRowHeights,
  getSelectedColumns,
  getTimePosition,
  layoutEvents,
} from "./components/ResourceScheduler/utils/layout";
export type { Density, EventPosition, RowHeightOptions } from "./components/ResourceScheduler/utils/layout";
export { getEventSpan, getEventStartPosition } from "./components/ResourceScheduler/utils/dateUtils";
export { getColumnWindow, parsePx } from "./components/ResourceScheduler/utils/columnWindow";
export { getRowWindow } from "./components/ResourceScheduler/utils/rowWindow";

// Drag, resize, selection and keyboard
export {
  getDropRange,
  getResizeRange,
  getSelectionBounds,
  isSlotInRange,
} from "./components/ResourceScheduler/utils/dateUtils";
export {
  getMovePlacement,
  getResizePlacement,
  isSamePlacement,
} from "./components/ResourceScheduler/utils/drag";
export type { DragTarget } from "./components/ResourceScheduler/utils/drag";
export { flipHorizontal, moveCursor, stepPlacement } from "./components/ResourceScheduler/utils/keyboard";
export type { Cursor, Step, StepContext } from "./components/ResourceScheduler/utils/keyboard";

// Rules, availability and utilization
export { isPlacementAllowed, rangesOverlap } from "./components/ResourceScheduler/utils/placement";
export type { Placement, PlacementRules } from "./components/ResourceScheduler/utils/placement";
export {
  findAvailableSlots,
  isCellUnavailable,
  resolveBusinessHours,
  touchesUnavailable,
} from "./components/ResourceScheduler/utils/availability";
export type { FindSlotsOptions } from "./components/ResourceScheduler/utils/availability";
export { columnUtilization, getUtilization } from "./components/ResourceScheduler/utils/utilization";
export type { Utilization } from "./components/ResourceScheduler/utils/utilization";
export { groupUtilization } from "./components/ResourceScheduler/utils/groups";

// Time zones
export { isValidTimeZone, utcToZoned, zonedToUtc } from "./components/ResourceScheduler/utils/timeZone";

// Text and dates for people
export { buildI18n, defaultLabels } from "./components/ResourceScheduler/i18nCore";
export type {
  I18nContextValue as ResolvedI18n,
  I18nInput,
  Formatter,
  PartialLabels,
  SchedulerLabels,
} from "./components/ResourceScheduler/i18nCore";
export {
  formatEventTime,
  formatPeriodTitle,
  formatRangeLabel,
  formatSlotLabel,
} from "./components/ResourceScheduler/utils/dateUtils";

// State: the steps above kept up to date, as a store any framework can read
export { createSchedulerStore } from "./components/ResourceScheduler/utils/schedulerStore";
export type {
  SchedulerInput,
  SchedulerState,
  SchedulerStore,
  SchedulerStoreInput,
} from "./components/ResourceScheduler/utils/schedulerStore";

// Data types
export type {
  BusinessHours,
  Recurrence,
  Resource,
  ResourceInput,
  SchedulerEvent,
  SlotSelection,
  UnavailableRange,
  VisibleRange,
} from "./components/ResourceScheduler/types";
