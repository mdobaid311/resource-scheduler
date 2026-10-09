// src/components/ResourceScheduler/ResourceScheduler.tsx
import { useMediaQuery } from "./hooks/use-media-query";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEventCreation } from "./hooks/useEventCreation";
import { useScheduler } from "./hooks/useScheduler";
import { ResourceColumn } from "./ResourceColumn";
import { SchedulerControls } from "./SchedulerControls";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineHeader } from "./TimelineHeader";
import {
  type ResourceSchedulerHandle,
  type ResourceSchedulerProps,
  type SchedulerEvent,
  ViewType,
} from "./types";
import { getVisibleRange, resolveSlotOptions } from "./utils/dateUtils";
import { touchesUnavailable } from "./utils/availability";
import { withEvents } from "./utils/events";
import {
  isPlacementAllowed,
  type Placement,
  type PlacementRules,
} from "./utils/placement";
import { scrollToDate } from "./utils/scrollUtils";

export const ResourceScheduler = forwardRef<
  ResourceSchedulerHandle,
  ResourceSchedulerProps
>(function ResourceScheduler({
  resources: resourcesProp,
  events,
  initialDate = new Date(),
  initialView = ViewType.Day,
  onEventClick,
  onDateChange,
  onViewChange,
  onEventDrop,
  onEventCreate,
  onSlotSelect,
  ariaLabel,
  slotDuration,
  dayStartHour,
  dayEndHour,
  onEventResize,
  eventOverlap,
  isValidDrop,
  businessHours,
  blockUnavailable,
  nowIndicator,
  renderEventPopover,
  allowViewChange = true,
  resourceColumnWidth: propResourceColumnWidth,
  timeColumnWidth: propTimeColumnWidth,
  dateColumnWidth: propDateColumnWidth,
  availableViews,
  weekStartsOn,
  hideWeekends,
  onRangeChange,
  renderDateHeader,
  renderResourceHeader,
  renderTimeSlot,
  renderEmptyCell,
}, ref) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewOptions = useMemo(
    () => ({ weekStartsOn, hideWeekends }),
    [weekStartsOn, hideWeekends]
  );
  // Flat `events` join the resources first, so every rule below sees them.
  const initialResources = useMemo(
    () => withEvents(resourcesProp, events),
    [resourcesProp, events]
  );
  const helpId = `rs-help${useId()}`;
  // Spoken by screen readers through the live region below.
  const [announcement, setAnnouncement] = useState("");

  const {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    resources,
    navigate,
    getTimeSlots,
    getDatesInView,
    calculateEventPositions,
    getResourceRowHeight,
    getGridTemplateRows,
  } = useScheduler(
    initialResources,
    initialDate,
    initialView,
    { slotDuration, dayStartHour, dayEndHour },
    viewOptions
  );
  const { slotMinutes } = resolveSlotOptions({ slotDuration });

  const range = useMemo(
    () =>
      getVisibleRange(currentDate, viewType, {
        slotDuration,
        dayStartHour,
        dayEndHour,
        ...viewOptions,
      }),
    [currentDate, viewType, slotDuration, dayStartHour, dayEndHour, viewOptions]
  );

  // Fires on mount and whenever the range changes; the latest callback is
  // used, but a new callback identity alone does not fire it.
  const onRangeChangeRef = useRef(onRangeChange);
  useEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  });
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  useEffect(() => {
    onRangeChangeRef.current?.({
      start: new Date(rangeStart),
      end: new Date(rangeEnd),
      view: viewType,
    });
  }, [rangeStart, rangeEnd, viewType]);

  // `blockUnavailable` is one more reason to veto, run before the app's own.
  const validDrop = useMemo<PlacementRules["isValidDrop"]>(() => {
    if (!blockUnavailable) return isValidDrop;
    return (event, placement) => {
      const resource = initialResources.find((r) => r.id === placement.resourceId);
      if (
        resource &&
        touchesUnavailable(resource, placement, {
          businessHours,
          viewType,
          slotMinutes,
        })
      )
        return false;
      return isValidDrop?.(event, placement) !== false;
    };
  }, [
    blockUnavailable,
    isValidDrop,
    initialResources,
    businessHours,
    viewType,
    slotMinutes,
  ]);

  // Checked against the full `resources` prop, not just the visible range.
  const checkPlacement = useMemo<
    ((event: SchedulerEvent, placement: Placement) => boolean) | undefined
  >(() => {
    if ((eventOverlap === undefined || eventOverlap === true) && !validDrop)
      return undefined; // nothing to enforce
    return (event, placement) =>
      isPlacementAllowed(event, placement, initialResources, {
        eventOverlap,
        isValidDrop: validDrop,
      });
  }, [initialResources, eventOverlap, validDrop]);

  // `onSlotSelect` replaces event creation so apps can open their own dialog.
  const handleCreate = useMemo(
    () =>
      onSlotSelect
        ? (event: Omit<SchedulerEvent, "id">, resourceId: string) =>
            onSlotSelect({
              resourceId,
              start: event.startDate,
              end: event.endDate,
            })
        : onEventCreate,
    [onSlotSelect, onEventCreate]
  );

  const {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    handleMouseEnter,
    commitRange,
  } = useEventCreation(handleCreate, viewType, checkPlacement, slotMinutes);

  const resourceColumnWidth =
    propResourceColumnWidth || (isMobile ? "140px" : "220px");
  const timeColumnWidth = propTimeColumnWidth || (isMobile ? "70px" : "90px");
  const dateColumnWidth = propDateColumnWidth || (isMobile ? "90px" : "140px");

  const handleViewChange = (newView: ViewType) => {
    setViewType(newView);
    onViewChange?.(newView);

    const todaysDate = new Date();
    setCurrentDate(todaysDate);
    onDateChange?.(todaysDate);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const newDate = navigate(direction);
    onDateChange?.(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  };

  const scrollToDay = useCallback(
    (date: Date) => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      // The resource column is the scroller's first child and sticks to its left edge.
      const stickyOffset = scroller.firstElementChild?.clientWidth ?? 0;
      scrollToDate(
        date,
        viewType,
        scroller,
        timeColumnWidth,
        dateColumnWidth,
        stickyOffset,
        { slotDuration, dayStartHour, dayEndHour },
        viewOptions
      );
    },
    [
      viewType,
      timeColumnWidth,
      dateColumnWidth,
      slotDuration,
      dayStartHour,
      dayEndHour,
      viewOptions,
    ]
  );

  // Keep the displayed date in view whenever it, the view or column sizes change.
  useEffect(() => {
    scrollToDay(currentDate);
  }, [currentDate, scrollToDay]);

  useImperativeHandle(
    ref,
    () => ({
      goTo: (date) => {
        setCurrentDate(date);
        onDateChange?.(date);
      },
      setView: (view) => {
        setViewType(view);
        onViewChange?.(view);
      },
      getVisibleRange: () => range,
      scrollToTime: (date) => {
        if (date >= range.start && date < range.end) {
          scrollToDay(date);
        } else {
          setCurrentDate(date);
          onDateChange?.(date);
        }
      },
    }),
    [range, scrollToDay, setCurrentDate, setViewType, onDateChange, onViewChange]
  );

  return (
    <>
      <div
        className="rs-root flex flex-col h-full bg-ocrs-gray-50 w-full rounded-lg overflow-hidden"
        style={
          {
            "--rs-sticky-left": resourceColumnWidth,
            "--rs-sticky-top": "3.5rem", // the sticky date header (h-14)
          } as React.CSSProperties
        }
      >
        <p id={helpId} className="sr-only">
          Arrow keys move between slots. Enter or Space selects a slot; hold
          Shift with Left or Right to select several. Tab to an event: Enter
          opens its details, Space picks it up, arrow keys move it
          {onEventResize ? ", Shift with Left or Right resizes it" : ""}, Space
          drops it and Escape cancels.
        </p>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
        <SchedulerControls
          currentDate={currentDate}
          viewType={viewType}
          onNavigate={handleNavigate}
          onViewChange={handleViewChange}
          onGoToToday={goToToday}
          allowViewChange={allowViewChange}
          availableViews={availableViews}
          weekStartsOn={weekStartsOn}
          hideWeekends={hideWeekends}
        />

        <div
          ref={scrollRef}
          className="flex flex-1 bg-ocrs-white rounded-b-lg ocrs-shadow-sm overflow-x-auto"
        >
          <ResourceColumn
            resources={resources}
            viewType={viewType}
            resourceColumnWidth={resourceColumnWidth}
            getResourceRowHeight={getResourceRowHeight}
            renderResourceHeader={renderResourceHeader}
          />

          <div className="flex-1">
            <TimelineHeader
              viewType={viewType}
              timeColumnWidth={timeColumnWidth}
              dateColumnWidth={dateColumnWidth}
              getTimeSlots={getTimeSlots}
              getDatesInView={getDatesInView}
              renderDateHeader={renderDateHeader}
            />

            <TimelineGrid
              resources={resources}
              viewType={viewType}
              timeColumnWidth={timeColumnWidth}
              dateColumnWidth={dateColumnWidth}
              getTimeSlots={getTimeSlots}
              getDatesInView={getDatesInView}
              isDragging={isDragging}
              dragStart={dragStart}
              dragEnd={dragEnd}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onEventClick={onEventClick}
              renderEventPopover={renderEventPopover}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              checkPlacement={checkPlacement}
              slotMinutes={slotMinutes}
              businessHours={businessHours}
              nowIndicator={nowIndicator}
              ariaLabel={ariaLabel}
              describedBy={helpId}
              announce={setAnnouncement}
              onSelectRange={commitRange}
              calculateEventPositions={calculateEventPositions}
              getGridTemplateRows={getGridTemplateRows}
              renderTimeSlot={renderTimeSlot}
              renderEmptyCell={renderEmptyCell}
            />
          </div>
        </div>
      </div>
    </>
  );
});

export default ResourceScheduler;
