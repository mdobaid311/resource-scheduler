// src/components/ResourceScheduler/ResourceScheduler.tsx
import { useMediaQuery } from "../../hooks/use-media-query";
import React, { useEffect, useRef } from "react";
import { useEventCreation } from "./hooks/useEventCreation";
import { useScheduler } from "./hooks/useScheduler";
import { ResourceColumn } from "./ResourceColumn";
import { SchedulerControls } from "./SchedulerControls";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineHeader } from "./TimelineHeader";
import { ResourceSchedulerProps, ViewType } from "./types";
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
  } = useScheduler(initialResources, initialDate, initialView);

  const { isDragging, dragStart, dragEnd, handleMouseDown, handleMouseEnter } =
    useEventCreation(onEventCreate, viewType);

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
        stickyOffset
      );
    }
  }, [currentDate, viewType, timeColumnWidth, dateColumnWidth]);

  return (
    <>
      <div className="rs-root flex flex-col h-full bg-ocrs-gray-50 w-full rounded-lg overflow-hidden">
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
