import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameHour,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  isBefore,
  isAfter,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, User } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDrag, useDrop } from "react-dnd";
import { ViewType } from "@/types/scheduler.enum";
import type { Event, Resource } from "@/types/scheduler.type";

export interface ResourceSchedulerProps {
  resources: Resource[];
  initialDate?: Date;
  initialView?: ViewType;
  onEventClick?: (event: Event, resource: Resource) => void;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;
  onEventCreate?: (event: Omit<Event, "id">, resourceId: string) => void;
  renderEventPopover?: (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
  onEventDrop?: (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  resourceColumnWidth?: string;
  timeColumnWidth?: string;
  dateColumnWidth?: string;
  allowViewChange?: boolean;
}

const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
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
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    date: Date;
    resourceId: string;
  } | null>(null);
  const [dragEnd, setDragEnd] = useState<{
    date: Date;
    resourceId: string;
  } | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const timelineRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  const getTimeSlots = useCallback(() => {
    if (viewType !== "day") return [];
    return eachHourOfInterval({
      start: startOfDay(currentDate),
      end: endOfDay(currentDate),
    });
  }, [currentDate, viewType]);

  const getDatesInView = useCallback(() => {
    switch (viewType) {
      case "day":
        return [currentDate];
      case "week":
        return eachDayOfInterval({
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        });
      case "month":
        return eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        });
      case "quarter":
        return eachDayOfInterval({
          start: startOfQuarter(currentDate),
          end: endOfQuarter(currentDate),
        });
      case "year":
        return eachDayOfInterval({
          start: startOfYear(currentDate),
          end: endOfYear(currentDate),
        });
      default:
        return eachDayOfInterval({
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        });
    }
  }, [currentDate, viewType]);

  const filterResourcesByDate = useCallback(
    (newDate: Date) => {
      let rangeStart: Date;
      let rangeEnd: Date;

      switch (viewType) {
        case "day":
          rangeStart = startOfDay(newDate);
          rangeEnd = endOfDay(newDate);
          break;
        case "week":
          rangeStart = startOfWeek(newDate);
          rangeEnd = endOfWeek(newDate);
          break;
        case "month":
          rangeStart = startOfMonth(newDate);
          rangeEnd = endOfMonth(newDate);
          break;
        case "quarter":
          rangeStart = startOfQuarter(newDate);
          rangeEnd = endOfQuarter(newDate);
          break;
        case "year":
          rangeStart = startOfYear(newDate);
          rangeEnd = endOfYear(newDate);
          break;
        default:
          rangeStart = startOfWeek(newDate);
          rangeEnd = endOfWeek(newDate);
      }

      const updatedResourceEvents = initialResources?.map((resource) => ({
        ...resource,
        events: resource?.events?.filter((event) => {
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

  const navigate = (direction: "prev" | "next") => {
    let newDate: Date;
    switch (viewType) {
      case "day":
        newDate = addDays(currentDate, direction === "prev" ? -1 : 1);
        break;
      case "week":
        newDate = addWeeks(currentDate, direction === "prev" ? -1 : 1);
        break;
      case "month":
        newDate = addMonths(currentDate, direction === "prev" ? -1 : 1);
        break;
      case "quarter":
        newDate = addQuarters(currentDate, direction === "prev" ? -1 : 1);
        break;
      case "year":
        newDate = addYears(currentDate, direction === "prev" ? -1 : 1);
        break;
      default:
        newDate = currentDate;
    }
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const handleCellClick = (date: Date, resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;
    const event = resource.events.find((e) =>
      viewType === "day"
        ? isSameDay(e.startDate, date) && isSameHour(e.startDate, date)
        : isSameDay(e.startDate, date)
    );
    if (event && onEventClick) onEventClick(event, resource);
  };

  const handleViewChange = (newView: ViewType) => {
    setViewType(newView);
    onViewChange?.(newView);
    const todaysDate = new Date();
    let adjustedDate: Date;
    switch (newView) {
      case ViewType.Day:
        adjustedDate = todaysDate;
        break;
      case ViewType.Week:
        adjustedDate = startOfWeek(todaysDate);
        break;
      case ViewType.Month:
        adjustedDate = startOfMonth(todaysDate);
        break;
      case ViewType.Quarter:
        adjustedDate = startOfQuarter(todaysDate);
        break;
      case ViewType.Year:
        adjustedDate = startOfYear(todaysDate);
        break;
      default:
        adjustedDate = todaysDate;
    }
    setCurrentDate(adjustedDate);
    filterResourcesByDate(adjustedDate);
  };

  const getEventSpan = (event: Event, datesInView: Date[]) => {
    if (viewType === "day") {
      return Math.max(
        1,
        Math.min(differenceInHours(event.endDate, event.startDate), 24)
      );
    } else {
      // For views other than day, calculate the span within the current view
      const viewStart = datesInView[0];
      const viewEnd = datesInView[datesInView.length - 1];

      // Adjust event start to be within view if it starts before
      const effectiveStart = isBefore(event.startDate, viewStart)
        ? viewStart
        : event.startDate;

      // Adjust event end to be within view if it ends after
      const effectiveEnd = isAfter(event.endDate, viewEnd)
        ? viewEnd
        : event.endDate;

      return Math.max(1, differenceInDays(effectiveEnd, effectiveStart) + 1);
    }
  };

  const getEventStartPosition = (event: Event, datesInView: Date[]) => {
    if (viewType === "day") {
      return event.startDate.getHours();
    } else {
      // Find the start position within the current view
      const startIdx = datesInView.findIndex(
        (d) =>
          isSameDay(d, event.startDate) ||
          (isBefore(event.startDate, d) && isAfter(event.endDate, d))
      );

      // If event starts before the view, start at position 0
      return isBefore(event.startDate, datesInView[0]) ? 0 : startIdx;
    }
  };

  const handleMouseDown = (
    date: Date,
    resourceId: string,
    e?: React.MouseEvent
  ) => {
    if (e?.target instanceof HTMLElement && e.target.closest(".event-item"))
      return;
    setIsDragging(true);
    setDragStart({ date, resourceId });
    setDragEnd({ date, resourceId });
  };

  const handleMouseEnter = (date: Date, resourceId: string) => {
    if (isDragging && dragStart) {
      setDragEnd({ date, resourceId });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      if (dragStart.resourceId === dragEnd.resourceId) {
        const startDate = new Date(
          Math.min(dragStart.date.getTime(), dragEnd.date.getTime())
        );
        const endDate = new Date(
          Math.max(dragStart.date.getTime(), dragEnd.date.getTime())
        );

        if (viewType === "day") endDate.setHours(endDate.getHours() + 1);
        else endDate.setDate(endDate.getDate());

        const newEvent: Omit<Event, "id"> = {
          title: "New Event",
          startDate,
          endDate,
          color: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
          duration:
            viewType === "day"
              ? `${differenceInHours(endDate, startDate)}h`
              : `${differenceInDays(endDate, startDate)}d`,
        };
        if (onEventCreate) onEventCreate(newEvent, dragStart.resourceId);
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  const resourceColumnWidth =
    propResourceColumnWidth || (isMobile ? "140px" : "220px");
  const timeColumnWidth = propTimeColumnWidth || (isMobile ? "70px" : "90px");
  const dateColumnWidth = propDateColumnWidth || (isMobile ? "90px" : "140px");

  const getSelectionRange = () => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    const dates = viewType === "day" ? getTimeSlots() : getDatesInView();
    const startIdx = dates.findIndex((d) =>
      viewType === "day"
        ? isSameHour(d, dragStart.date)
        : isSameDay(d, dragStart.date)
    );
    const endIdx = dates.findIndex((d) =>
      viewType === "day"
        ? isSameHour(d, dragEnd.date)
        : isSameDay(d, dragEnd.date)
    );
    if (startIdx === -1 || endIdx === -1) return null;
    return {
      start: Math.min(startIdx, endIdx),
      end: Math.max(startIdx, endIdx),
      resourceId: dragStart.resourceId,
    };
  };

  const selectionRange = getSelectionRange();

  // Calculate non-overlapping event positions
  const calculateEventPositions = (events: Event[], datesInView: Date[]) => {
    if (events.length === 0) return [];

    // Sort events by start time
    const sortedEvents = [...events].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    // Create lanes for events to prevent overlapping
    const lanes: Event[][] = [];

    sortedEvents.forEach((event) => {
      const span = getEventSpan(event, datesInView);
      const startPosition = getEventStartPosition(event, datesInView);

      // Find a lane where this event doesn't overlap
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const overlaps = lane.some((existingEvent) => {
          const existingSpan = getEventSpan(existingEvent, datesInView);
          const existingStart = getEventStartPosition(
            existingEvent,
            datesInView
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

      // If no suitable lane found, create a new one
      if (!placed) {
        lanes.push([event]);
      }
    });

    // Flatten the lanes and add position data
    return lanes.flatMap((lane, laneIndex) =>
      lane.map((event) => ({
        event,
        lane: laneIndex,
        span: getEventSpan(event, datesInView),
        startPosition: getEventStartPosition(event, datesInView),
      }))
    );
  };

  // Calculate the height for each resource based on its events
  const getResourceRowHeight = (resource: Resource) => {
    const datesInView = viewType === "day" ? getTimeSlots() : getDatesInView();
    const eventPositions = calculateEventPositions(
      resource.events,
      datesInView
    );
    const lanes =
      eventPositions.length > 0
        ? Math.max(...eventPositions.map((pos) => pos.lane)) + 1
        : 1;

    return lanes * 52 + 8; // 52px per lane (48px event + 4px margin)
  };

  // Calculate row heights for all resources
  const getRowHeights = () => {
    return resources.map((resource) => getResourceRowHeight(resource));
  };

  // Generate grid template rows based on individual row heights
  const getGridTemplateRows = () => {
    const rowHeights = getRowHeights();
    const headerRow = "auto";
    const resourceRows = rowHeights.map((height) => `${height}px`).join(" ");
    return `${headerRow} ${resourceRows}`;
  };

  // Today button handler
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);

    // Scroll to today after a brief delay to allow the view to update
    setTimeout(() => {
      scrollToDate(today);
    }, 100);
  };

  const scrollToDate = (date: Date) => {
    if (!timelineRef.current) return;

    const datesInView = getDatesInView();
    const timeSlots = getTimeSlots();

    // Find the index of the slot that contains today
    let todayIndex = -1;

    if (viewType === "day") {
      // For day view, find the hour slot
      todayIndex = timeSlots.findIndex(
        (slot) => isSameHour(slot, date) && isSameDay(slot, date)
      );
    } else {
      // For other views, find the day
      todayIndex = datesInView.findIndex((d) => isSameDay(d, date));
    }

    // If today is not in the current view, we can't scroll to it
    if (todayIndex === -1) return;

    // Calculate the scroll position
    const slotWidth =
      viewType === "day"
        ? parseInt(timeColumnWidth.replace("px", ""))
        : parseInt(dateColumnWidth.replace("px", ""));

    const scrollPosition = todayIndex * slotWidth;

    // Scroll to the position
    timelineRef.current.scrollTo({
      left:
        scrollPosition - timelineRef.current.clientWidth / 2 + slotWidth / 2,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const today = new Date();
    scrollToDate(today);
  }, [currentDate, viewType]);

  // Check if a slot is today
  const isToday = (slot: Date) => {
    return isSameDay(slot, new Date());
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="flex lg:flex-row flex-col items-center justify-between gap-4 p-4 bg-white rounded-t-lg border-b sticky top-0 z-30 shadow-sm">
        {/* Left controls */}
        <div className="flex items-center justify-between lg:justify-start w-full gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-gray-100 rounded-lg"
              onClick={() => navigate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Date title */}
            <div className="flex flex-col items-center px-2">
              <span className="text-base md:text-lg font-semibold text-gray-800">
                {viewType === "day" && format(currentDate, "MMMM d, yyyy")}
                {viewType === "week" &&
                  `${format(startOfWeek(currentDate), "MMM d")} – ${format(
                    endOfWeek(currentDate),
                    "MMM d, yyyy"
                  )}`}
                {viewType === "month" && format(currentDate, "MMMM yyyy")}
                {viewType === "quarter" &&
                  `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${format(
                    currentDate,
                    "yyyy"
                  )}`}
                {viewType === "year" && format(currentDate, "yyyy")}
              </span>
              <span className="text-xs text-gray-500 font-medium mt-1">
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)} View
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-gray-100 rounded-lg"
              onClick={() => navigate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-white hover:bg-gray-50"
            onClick={goToToday}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Today</span>
          </Button>
        </div>

        {/* Right view type selector */}
        {allowViewChange && (
          <Select value={viewType} onValueChange={handleViewChange}>
            <SelectTrigger className="lg:w-[140px] w-full bg-white">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 99 }}>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Scheduler */}
      <div
        className="flex flex-1 overflow-hidden bg-white rounded-b-lg shadow-sm"
        onMouseUp={handleMouseUp}
      >
        {/* Fixed Resource Column */}
        <div
          className="bg-white border-r z-20 sticky left-0"
          style={{ width: resourceColumnWidth }}
        >
          <div className="sticky top-0 z-10 bg-gray-50 p-2 text-center border-b h-14 flex items-center justify-center shadow-sm">
            <span className="text-sm font-medium text-gray-600">Resources</span>
          </div>
          {resources?.map((resource) => {
            const rowHeight = getResourceRowHeight(resource);
            return (
              <div
                key={resource.id}
                className="p-3 border-b hover:bg-gray-50 transition-colors"
                style={{ height: rowHeight + "px" }}
              >
                <div className="font-medium text-gray-800">{resource.name}</div>
                {resource.role && (
                  <div className="text-xs text-gray-500 mt-1">
                    {resource.role}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline */}
        <div ref={timelineRef} className="overflow-auto flex-1">
          <div
            className="grid relative"
            style={{
              gridTemplateColumns:
                viewType === "day"
                  ? `repeat(24, ${timeColumnWidth})`
                  : `repeat(${getDatesInView().length}, ${dateColumnWidth})`,
              gridTemplateRows: getGridTemplateRows(),
            }}
          >
            {/* Header */}
            {(viewType === "day" ? getTimeSlots() : getDatesInView())?.map(
              (slot, i) => (
                <div
                  key={i}
                  className={`sticky top-0 z-10 p-2 text-center border-b h-14 flex flex-col items-center justify-center shadow-sm ${
                    isToday(slot) ? "bg-blue-50" : "bg-gray-50"
                  }`}
                  style={{
                    gridColumn: i + 1,
                  }}
                >
                  {viewType === "day" ? (
                    <>
                      <span
                        className={`text-xs font-medium ${
                          isToday(slot) ? "text-blue-600" : "text-gray-500"
                        }`}
                      >
                        {format(slot, "ha")}
                      </span>
                      <span
                        className={`text-xs ${
                          isToday(slot) ? "text-blue-500" : "text-gray-400"
                        }`}
                      >
                        {format(slot, "EEE")}
                      </span>
                    </>
                  ) : (
                    <div className="group flex flex-col items-center">
                      <span
                        className={`text-xs font-medium ${
                          isToday(slot) ? "text-blue-600" : "text-gray-500"
                        } uppercase`}
                      >
                        {format(slot, "EEE")}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isToday(slot) ? "text-blue-700" : "text-gray-700"
                        }`}
                      >
                        {format(slot, "d")}
                      </span>
                      {(i === 0 || slot.getDate() === 1) && (
                        <span
                          className={`text-xs ${
                            isToday(slot) ? "text-blue-500" : "text-gray-400"
                          }`}
                        >
                          {format(slot, "MMM")}
                        </span>
                      )}
                      <span className="absolute mt-8 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {format(slot, "MMMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Rows */}
            {resources?.map((resource, rowIndex) => {
              const datesInView = getDatesInView();
              const timeSlots = getTimeSlots();
              const slots = viewType === "day" ? timeSlots : datesInView;

              // Calculate non-overlapping event positions
              const eventPositions = calculateEventPositions(
                resource.events,
                slots
              );

              return (
                <React.Fragment key={resource.id}>
                  {/* Event cells */}
                  {eventPositions.map(
                    ({ event, startPosition, span, lane }) => (
                      <div
                        key={event.id}
                        style={{
                          gridRow: rowIndex + 2,
                          gridColumn: `${startPosition + 1} / span ${span}`,
                        }}
                        className="p-1 flex flex-col gap-1"
                      >
                        <div
                          style={{
                            marginTop: `${lane * 52}px`,
                            height: "48px",
                            padding: "2px",
                          }}
                        >
                          <EventItem
                            event={event}
                            resource={resource}
                            renderEventPopover={renderEventPopover}
                          />
                        </div>
                      </div>
                    )
                  )}

                  {/* Empty Cells */}
                  {slots?.map((slot, colIndex) => {
                    const isSelected =
                      selectionRange &&
                      selectionRange.resourceId === resource.id &&
                      colIndex >= selectionRange.start &&
                      colIndex <= selectionRange.end;

                    const isCurrentDay = isToday(slot);

                    return (
                      <EmptySlotItem
                        colIndex={colIndex}
                        rowIndex={rowIndex}
                        resource={resource}
                        slot={slot}
                        isSelected={isSelected || false}
                        isToday={isCurrentDay}
                        handleMouseDown={handleMouseDown}
                        handleMouseEnter={handleMouseEnter}
                        handleCellClick={handleCellClick}
                        key={`${resource.id}-${colIndex}`}
                        handleEventDrop={onEventDrop}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const EventItem = ({
  event,
  resource,
  renderEventPopover,
}: {
  event: Event;
  resource?: Resource;
  renderEventPopover?: (
    event: Event,
    resource: Resource,
    closePopover: () => void
  ) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: "BOX",
      item: {
        event: event,
        resource: resource,
      },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    }),
    [event, resource]
  );

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="event-item text-black p-2 text-xs rounded border cursor-pointer z-99 h-full shadow-xs flex flex-col justify-center"
          style={{
            backgroundColor: `${event.color}20`,
            borderColor: event.color,
            borderLeftWidth: "3px",
            position: "relative",
            zIndex: 5,
            opacity,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={dragRef as any}
        >
          <div className="font-medium truncate text-gray-800">
            {event.title}
          </div>
          <div className="text-xs truncate text-gray-500">
            {format(event.startDate, "h:mm a")} -{" "}
            {format(event.endDate, "h:mm a")}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[2000] w-fit p-3">
        {renderEventPopover ? (
          renderEventPopover(event, resource!, onClose)
        ) : (
          <div className="space-y-2">
            <div className="font-semibold text-gray-800">{event.title}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {format(event.startDate, "MMM d, yyyy h:mm a")} -{" "}
                {format(event.endDate, "h:mm a")}
              </span>
            </div>
            {resource && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400" />
                <span>{resource.name}</span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface EmptySlotItemProps {
  resource: Resource;
  slot: Date;
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isToday: boolean;
  handleMouseDown: (
    date: Date,
    resourceId: string,
    e?: React.MouseEvent
  ) => void;
  handleMouseEnter: (date: Date, resourceId: string) => void;
  handleCellClick: (date: Date, resourceId: string) => void;
  handleEventDrop?: (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
}

const EmptySlotItem = ({
  colIndex,
  rowIndex,
  resource,
  slot,
  isSelected,
  isToday,
  handleMouseDown,
  handleMouseEnter,
  handleCellClick,
  handleEventDrop,
}: EmptySlotItemProps) => {
  const [, drop] = useDrop(
    () => ({
      accept: "BOX",
      drop: (item: { event: Event }) => {
        if (handleEventDrop) {
          const event = item.event;
          const newStartDate = new Date(slot);
          const duration = event.endDate.getTime() - event.startDate.getTime();
          const newEndDate = new Date(newStartDate.getTime() + duration);
          handleEventDrop(
            event,
            item.event.id,
            resource.id,
            newStartDate,
            newEndDate
          );
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [resource, slot, handleEventDrop]
  );

  return (
    <div
      key={`${resource.id}-${colIndex}`}
      className={`border-b border-r cursor-pointer ${
        isToday ? "bg-blue-50" : isSelected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
      style={{
        gridRow: rowIndex + 2,
        gridColumn: colIndex + 1,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleMouseDown(slot, resource.id, e);
        }
      }}
      onMouseEnter={() => handleMouseEnter(slot, resource.id)}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCellClick(slot, resource.id);
        }
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={drop as any}
    />
  );
};

export default ResourceScheduler;
