// src/components/ResourceScheduler/hooks/useScheduler.ts
import { useState, useCallback, useMemo } from "react";
import {
  getTimeSlots,
  getDatesInView,
  getVisibleEvents,
  getVisibleRange,
  type SlotOptions,
  type ViewOptions,
  navigateDate,
  getEventSpan,
  getEventStartPosition,
  isToday,
} from "../utils/dateUtils";
import { type SchedulerEvent, type Resource, ViewType } from "../types";
import { LANES, ROW_PADDING } from "../density";
import { GROUP_ROW_HEIGHT, isGroupRow } from "../utils/groups";
import { expandEvents } from "../utils/recurrence";

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
  const resources = useMemo<Resource[]>(() => {
    const range = getVisibleRange(currentDate, viewType, { ...slots, ...view });
    return initialResources.map((resource) => ({
      ...resource,
      events: getVisibleEvents(
        expandEvents(resource.events, range.start, range.end),
        currentDate,
        viewType,
        slots,
        view
      ),
    }));
  }, [initialResources, currentDate, viewType, slots, view]);

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
    (events: SchedulerEvent[], datesInView: Date[]) => {
      const sorted = [...events]
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .map((event) => ({
          event,
          span: getEventSpan(event, datesInView, viewType),
          startPosition: getEventStartPosition(event, datesInView, viewType),
        }));

      // First-fit lane packing. Events are sorted by start, so a lane only
      // needs to remember where its last event ends.
      const laneEnds: number[] = [];
      return sorted.map((item) => {
        let lane = laneEnds.findIndex((end) => item.startPosition >= end);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = item.startPosition + item.span;
        return { ...item, lane };
      });
    },
    [viewType]
  );

  const getResourceRowHeight = useCallback(
    (resource: Resource) => {
      if (isGroupRow(resource)) return GROUP_ROW_HEIGHT;
      const datesInView =
        viewType === ViewType.Day
          ? getTimeSlotsMemoized()
          : getDatesInViewMemoized();
      const eventPositions = calculateEventPositions(
        resource.events,
        datesInView
      );
      const lanes =
        eventPositions.length > 0
          ? Math.max(...eventPositions.map((pos) => pos.lane)) + 1
          : 1;

      return Math.max(lanes * lane + ROW_PADDING, minRowHeight);
    },
    [
      viewType,
      lane,
      minRowHeight,
      calculateEventPositions,
      getTimeSlotsMemoized,
      getDatesInViewMemoized,
    ]
  );

  const getRowHeights = useCallback(() => {
    return resources.map((resource) => getResourceRowHeight(resource));
  }, [resources, getResourceRowHeight]);

  const getGridTemplateRows = useCallback(() => {
    const rowHeights = getRowHeights();
    const headerRow = "auto";
    const resourceRows = rowHeights.map((height) => `${height}px`).join(" ");
    return `${headerRow} ${resourceRows}`;
  }, [getRowHeights]);

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
