import "./styles/global.css";
// Main exports
export { ResourceScheduler } from "./components/ResourceScheduler/ResourceScheduler";

// Type exports
export type {
  ResourceSchedulerHandle,
  ResourceSchedulerProps,
  VisibleRange,
} from "./components/ResourceScheduler/types";
export type {
  BusinessHours,
  Event,
  Recurrence,
  Resource,
  ResourceInput,
  SchedulerEvent,
  SlotSelection,
  UnavailableRange,
} from "./components/ResourceScheduler/types";
export { ViewType } from "./components/ResourceScheduler/types";

// Component exports
export { ResourceColumn } from "./components/ResourceScheduler/ResourceColumn";
export { SchedulerControls } from "./components/ResourceScheduler/SchedulerControls";
export { TimelineGrid } from "./components/ResourceScheduler/TimelineGrid";
export { TimelineHeader } from "./components/ResourceScheduler/TimelineHeader";
export { EventItem } from "./components/ResourceScheduler/EventItem";
export { EmptySlotItem } from "./components/ResourceScheduler/EmptySlotItem";

// Hook exports
export { useScheduler } from "./components/ResourceScheduler/hooks/useScheduler";
export { useEventCreation } from "./components/ResourceScheduler/hooks/useEventCreation";

// Utility exports
export { scrollToDate } from "./components/ResourceScheduler/utils/scrollUtils";
export * from "./components/ResourceScheduler/utils/dateUtils";
export type { SchedulerClassNames } from "./components/ResourceScheduler/classNames";
export { defaultLabels } from "./components/ResourceScheduler/i18n";
export type {
  I18nInput,
  PartialLabels,
  SchedulerLabels,
} from "./components/ResourceScheduler/i18n";
export { withEvents } from "./components/ResourceScheduler/utils/events";
export { eventsToCSV, eventsToICS } from "./components/ResourceScheduler/utils/exportEvents";
export type { ExportOptions } from "./components/ResourceScheduler/utils/exportEvents";
export {
  expandEvents,
  expandRecurrence,
} from "./components/ResourceScheduler/utils/recurrence";
export { getRowWindow } from "./components/ResourceScheduler/utils/rowWindow";
export {
  findAvailableSlots,
  isCellUnavailable,
  resolveBusinessHours,
  touchesUnavailable,
} from "./components/ResourceScheduler/utils/availability";
export type { FindSlotsOptions } from "./components/ResourceScheduler/utils/availability";
export { getUtilization } from "./components/ResourceScheduler/utils/utilization";
export type { Utilization } from "./components/ResourceScheduler/utils/utilization";
export {
  isPlacementAllowed,
  rangesOverlap,
} from "./components/ResourceScheduler/utils/placement";
export type {
  Placement,
  PlacementRules,
} from "./components/ResourceScheduler/utils/placement";

// Shared hooks exports
export { useMediaQuery } from "./components/ResourceScheduler/hooks/use-media-query";
export { useIsMobile } from "./hooks/use-mobile";
export { useHeadsObserver } from "./hooks/use-heads-observer";
