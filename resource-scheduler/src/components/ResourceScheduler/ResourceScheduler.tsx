// src/components/ResourceScheduler/ResourceScheduler.tsx
import { useMediaQuery } from "./hooks/use-media-query";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useEventCreation } from "./hooks/useEventCreation";
import { useScheduler } from "./hooks/useScheduler";
import { ResourceColumn } from "./ResourceColumn";
import { SchedulerControls } from "./SchedulerControls";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineHeader } from "./TimelineHeader";
import { type ResourceSchedulerProps, type SchedulerEvent, ViewType } from "./types";
import { resolveSlotOptions } from "./utils/dateUtils";
import { isPlacementAllowed, type Placement } from "./utils/placement";
import { scrollToDate } from "./utils/scrollUtils";

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
  resources: initialResources,
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
  renderEventPopover,
  allowViewChange = true,
  resourceColumnWidth: propResourceColumnWidth,
  timeColumnWidth: propTimeColumnWidth,
  dateColumnWidth: propDateColumnWidth,
  availableViews,
  renderDateHeader,
  renderResourceHeader,
  renderTimeSlot,
  renderEmptyCell,
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const scrollRef = useRef<HTMLDivElement>(null);
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
  } = useScheduler(initialResources, initialDate, initialView, {
    slotDuration,
    dayStartHour,
    dayEndHour,
  });
  const { slotMinutes } = resolveSlotOptions({ slotDuration });

  // Checked against the full `resources` prop, not just the visible range.
  const checkPlacement = useMemo<
    ((event: SchedulerEvent, placement: Placement) => boolean) | undefined
  >(() => {
    if ((eventOverlap === undefined || eventOverlap === true) && !isValidDrop)
      return undefined; // nothing to enforce
    return (event, placement) =>
      isPlacementAllowed(event, placement, initialResources, {
        eventOverlap,
        isValidDrop,
      });
  }, [initialResources, eventOverlap, isValidDrop]);

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

  // Keep the displayed date in view whenever it, the view or column sizes change.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) {
      // The resource column is the scroller's first child and sticks to its left edge.
      const stickyOffset = scroller.firstElementChild?.clientWidth ?? 0;
      scrollToDate(
        currentDate,
        viewType,
        scroller,
        timeColumnWidth,
        dateColumnWidth,
        stickyOffset,
        { slotDuration, dayStartHour, dayEndHour }
      );
    }
  }, [
    currentDate,
    viewType,
    timeColumnWidth,
    dateColumnWidth,
    slotDuration,
    dayStartHour,
    dayEndHour,
  ]);

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
};

export default ResourceScheduler;
