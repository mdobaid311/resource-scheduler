// src/components/ResourceScheduler/hooks/useScheduler.ts
import { useState, useCallback, useMemo } from "react";
import {
  getTimeSlots,
  getDatesInView,
  type SlotOptions,
  type ViewOptions,
  navigateDate,
  isToday,
} from "../utils/dateUtils";
import { type SchedulerEvent, type Resource, ViewType } from "../types";
import { getVisibleResources } from "../utils/events";
import {
  getColumns,
  getGridTemplateRows as toGridTemplateRows,
  getRowHeight,
  LANES,
  layoutEvents,
} from "../utils/layout";

export const useScheduler = (
  initialResources: Resource[],
  initialDate: Date = new Date(),
  initialView: ViewType = ViewType.Day,
  slotOptions?: SlotOptions,
  viewOptions?: ViewOptions,
  /** Height of one lane of events and the least a row may be, in px. */
  { lane = LANES.comfortable.lane, minRowHeight = 0 }: { lane?: number; minRowHeight?: number } = {}
) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewType, setViewType] = useState<ViewType>(initialView);

  // Depend on the primitives so callers can pass an inline object.
  const { slotDuration, dayStartHour, dayEndHour } = slotOptions ?? {};
  const slots = useMemo<SlotOptions>(
    () => ({ slotDuration, dayStartHour, dayEndHour }),
    [slotDuration, dayStartHour, dayEndHour]
  );
  const { weekStartsOn, hideWeekends } = viewOptions ?? {};
  const view = useMemo<ViewOptions>(
    () => ({ weekStartsOn, hideWeekends }),
    [weekStartsOn, hideWeekends]
  );

  // Recurring events become one event per occurrence inside the visible range.
  const resources = useMemo<Resource[]>(
    () => getVisibleResources(initialResources, currentDate, viewType, { ...slots, ...view }),
    [initialResources, currentDate, viewType, slots, view]
  );

  const getTimeSlotsMemoized = useCallback(() => {
    return getTimeSlots(currentDate, viewType, slots);
  }, [currentDate, viewType, slots]);

  const getDatesInViewMemoized = useCallback(() => {
    return getDatesInView(currentDate, viewType, view);
  }, [currentDate, viewType, view]);

  const navigate = useCallback(
    (direction: "prev" | "next") => {
      const newDate = navigateDate(currentDate, viewType, direction);
      setCurrentDate(newDate);
      return newDate;
    },
    [currentDate, viewType]
  );

  const calculateEventPositions = useCallback(
    (events: SchedulerEvent[], datesInView: Date[]) => layoutEvents(events, datesInView, viewType),
    [viewType]
  );

  // The columns of the grid, built once per view (the year view has 365).
  const datesInView = useMemo(
    () => getColumns(currentDate, viewType, { ...slots, ...view }),
    [currentDate, viewType, slots, view]
  );

  const measureRow = useCallback(
    (resource: Resource) => getRowHeight(resource, datesInView, viewType, { lane, minRowHeight }),
    [lane, minRowHeight, datesInView, viewType]
  );

  // A row is measured once for as long as the view and its resource object stay
  // the same, so a re-render that only moves a scroll window (rows or columns)
  // does not measure every row again.
  const getResourceRowHeight = useMemo(() => {
    const measured = new WeakMap<Resource, number>();
    return (resource: Resource) => {
      let height = measured.get(resource);
      if (height === undefined) {
        height = measureRow(resource);
        measured.set(resource, height);
      }
      return height;
    };
  }, [measureRow]);

  const getRowHeights = useCallback(() => {
    return resources.map((resource) => getResourceRowHeight(resource));
  }, [resources, getResourceRowHeight]);

  const getGridTemplateRows = useCallback(
    () => toGridTemplateRows(getRowHeights()),
    [getRowHeights]
  );

  return {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    resources,
    navigate,
    getTimeSlots: getTimeSlotsMemoized,
    getDatesInView: getDatesInViewMemoized,
    calculateEventPositions,
    getResourceRowHeight,
    getRowHeights,
    getGridTemplateRows,
    isToday,
  };
};
