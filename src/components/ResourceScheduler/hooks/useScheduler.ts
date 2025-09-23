// src/components/ResourceScheduler/hooks/useScheduler.ts
import { useState, useCallback, useEffect } from "react";
import {
  getTimeSlots,
  getDatesInView,
  navigateDate,
  getEventSpan,
  getEventStartPosition,
  isToday,
} from "../utils/dateUtils";
import { Event, Resource, ViewType } from "../types";

export const useScheduler = (
  initialResources: Resource[],
  initialDate: Date = new Date(),
  initialView: ViewType = ViewType.Day
) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [resources, setResources] = useState<Resource[]>(initialResources);

  const getTimeSlotsMemoized = useCallback(() => {
    return getTimeSlots(currentDate, viewType);
  }, [currentDate, viewType]);

  const getDatesInViewMemoized = useCallback(() => {
    return getDatesInView(currentDate, viewType);
  }, [currentDate, viewType]);

  const filterResourcesByDate = useCallback(
    (newDate: Date) => {
      const datesInView = getDatesInView(newDate, viewType);
      if (datesInView.length === 0) return;

      const rangeStart = datesInView[0];
      const rangeEnd = datesInView[datesInView.length - 1];

      const updatedResourceEvents = initialResources.map((resource) => ({
        ...resource,
        events: resource.events.filter((event) => {
          return event.startDate <= rangeEnd && event.endDate >= rangeStart;
        }),
      }));

      setResources(updatedResourceEvents);
    },
    [initialResources, viewType]
  );

  useEffect(() => {
    filterResourcesByDate(currentDate);
  }, [currentDate, viewType, initialResources, filterResourcesByDate]);

  const navigate = useCallback(
    (direction: "prev" | "next") => {
      const newDate = navigateDate(currentDate, viewType, direction);
      setCurrentDate(newDate);
      return newDate;
    },
    [currentDate, viewType]
  );

  const calculateEventPositions = useCallback(
    (events: Event[], datesInView: Date[]) => {
      if (events.length === 0) return [];

      const sortedEvents = [...events].sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      );

      const lanes: Event[][] = [];

      sortedEvents.forEach((event) => {
        const span = getEventSpan(event, datesInView, viewType);
        const startPosition = getEventStartPosition(
          event,
          datesInView,
          viewType
        );

        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          const lane = lanes[i];
          const overlaps = lane.some((existingEvent) => {
            const existingSpan = getEventSpan(
              existingEvent,
              datesInView,
              viewType
            );
            const existingStart = getEventStartPosition(
              existingEvent,
              datesInView,
              viewType
            );
            return !(
              startPosition + span <= existingStart ||
              startPosition >= existingStart + existingSpan
            );
          });

          if (!overlaps) {
            lane.push(event);
            placed = true;
            break;
          }
        }

        if (!placed) {
          lanes.push([event]);
        }
      });

      return lanes.flatMap((lane, laneIndex) =>
        lane.map((event) => ({
          event,
          lane: laneIndex,
          span: getEventSpan(event, datesInView, viewType),
          startPosition: getEventStartPosition(event, datesInView, viewType),
        }))
      );
    },
    [viewType]
  );

  const getResourceRowHeight = useCallback(
    (resource: Resource) => {
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

      return lanes * 52 + 8;
    },
    [
      viewType,
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
    getGridTemplateRows,
    isToday,
  };
};
