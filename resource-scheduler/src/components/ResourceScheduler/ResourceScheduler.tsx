// src/components/ResourceScheduler/ResourceScheduler.tsx
import { useMediaQuery } from "./hooks/use-media-query";
import { ClassNamesContext, type SchedulerClassNames, withClass } from "./classNames";
import { DensityContext, LANES, UTILIZATION_ROW_HEIGHT } from "./density";
import { buildI18n, I18nContext } from "./i18n";

const NO_CLASS_NAMES: SchedulerClassNames = {};
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
import { groupUtilization, isGroupRow, withGroups } from "./utils/groups";
import { getUtilization, type Utilization } from "./utils/utilization";
import {
  isPlacementAllowed,
  type Placement,
  type PlacementRules,
} from "./utils/placement";
import { getRowWindow } from "./utils/rowWindow";
import { scrollToDate } from "./utils/scrollUtils";

// Row virtualization: on above this many resources unless `virtualize` says otherwise.
const VIRTUALIZE_ABOVE = 100;
// The window is recomputed every QUANTUM px of scrolling and renders OVERSCAN px
// beyond the viewport, so scrolling does not re-render on every pixel.
const QUANTUM = 160;
const OVERSCAN = 320;
// The sticky date header above the first row (h-14).
const HEADER_HEIGHT = 56;

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
  locale,
  hour12,
  dir,
  labels,
  slotDuration,
  dayStartHour,
  dayEndHour,
  onEventResize,
  eventOverlap,
  isValidDrop,
  businessHours,
  blockUnavailable,
  nowIndicator,
  showUtilization,
  collapsedGroups,
  defaultCollapsedGroups,
  onCollapsedGroupsChange,
  classNames,
  density,
  virtualize,
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
  const i18n = useMemo(
    () => buildI18n({ locale, hour12, labels, dir }),
    [locale, hour12, labels, dir]
  );
  // The locale knows which day its weeks start on; `weekStartsOn` overrides it.
  const firstDay = weekStartsOn ?? locale?.options?.weekStartsOn;
  const viewOptions = useMemo(
    () => ({ weekStartsOn: firstDay, hideWeekends }),
    [firstDay, hideWeekends]
  );
  // Which groups are collapsed: yours when `collapsedGroups` is passed, else ours.
  const [ownCollapsed, setOwnCollapsed] = useState(defaultCollapsedGroups ?? []);
  const collapsed = collapsedGroups ?? ownCollapsed;
  const toggleGroup = useCallback(
    (group: string) => {
      const next = collapsed.includes(group)
        ? collapsed.filter((g) => g !== group)
        : [...collapsed, group];
      if (!collapsedGroups) setOwnCollapsed(next);
      onCollapsedGroupsChange?.(next);
    },
    [collapsed, collapsedGroups, onCollapsedGroupsChange]
  );
  // Flat `events` join the resources first, so every rule below sees them.
  // Group headers are rows too, so heights, virtualization and the grid layout
  // treat them like the resources around them.
  const allResources = useMemo(
    () => withEvents(resourcesProp, events),
    [resourcesProp, events]
  );
  const initialResources = useMemo(
    () => withGroups(allResources, collapsed),
    [allResources, collapsed]
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
    getRowHeights,
    getGridTemplateRows,
  } = useScheduler(
    initialResources,
    initialDate,
    initialView,
    { slotDuration, dayStartHour, dayEndHour },
    viewOptions,
    {
      lane: LANES[density ?? "comfortable"].lane,
      minRowHeight: showUtilization ? UTILIZATION_ROW_HEIGHT : 0,
    }
  );
  const { slotMinutes } = resolveSlotOptions({ slotDuration });

  // Only the rows near the viewport are rendered when there are many. The
  // scroll position is rounded, so the state only changes every QUANTUM px.
  const virtualized = virtualize ?? initialResources.length > VIRTUALIZE_ABOVE;
  const [viewport, setViewport] = useState({ top: 0, height: 800 });
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!virtualized || !scroller) return;
    const read = () => {
      const top = Math.floor(scroller.scrollTop / QUANTUM) * QUANTUM;
      const height = scroller.clientHeight;
      setViewport((v) => (v.top === top && v.height === height ? v : { top, height }));
    };
    read();
    scroller.addEventListener("scroll", read, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(read);
    observer?.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", read);
      observer?.disconnect();
    };
  }, [virtualized]);
  const rowRange = useMemo(
    () =>
      virtualized
        ? getRowWindow(
            getRowHeights(),
            viewport.top,
            viewport.height + QUANTUM,
            OVERSCAN,
            HEADER_HEIGHT
          )
        : undefined,
    [virtualized, getRowHeights, viewport]
  );

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

  // `resources` already holds the occurrences of recurring events in range.
  const utilization = useMemo(
    () =>
      showUtilization
        ? new Map([
            ...resources
              .filter((r) => !isGroupRow(r))
              .map((r): [string, Utilization] => [r.id, getUtilization(r, range, { businessHours })]),
            // A header adds up everything below it, folded or not.
            ...groupUtilization(allResources, range, { businessHours }),
          ])
        : undefined,
    [showUtilization, resources, allResources, range, businessHours]
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

  // Checked against what is on screen, with recurring events expanded: a
  // placement is always inside the visible range, so nothing else can overlap it.
  const checkPlacement = useMemo<
    ((event: SchedulerEvent, placement: Placement) => boolean) | undefined
  >(() => {
    if ((eventOverlap === undefined || eventOverlap === true) && !validDrop)
      return undefined; // nothing to enforce
    return (event, placement) =>
      isPlacementAllowed(event, placement, resources, {
        eventOverlap,
        isValidDrop: validDrop,
      });
  }, [resources, eventOverlap, validDrop]);

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
    handleMouseUp,
    cancelSelection,
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
        viewOptions,
        i18n.dir === "rtl"
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
      i18n.dir,
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
    <I18nContext.Provider value={i18n}>
      <ClassNamesContext.Provider value={classNames ?? NO_CLASS_NAMES}>
      <DensityContext.Provider value={density ?? "comfortable"}>
      <div
        dir={i18n.dir}
        className={withClass(
          "rs-root flex flex-col h-full bg-ocrs-gray-50 w-full rounded-lg overflow-hidden",
          classNames?.root
        )}
        style={
          {
            "--rs-sticky-left": resourceColumnWidth,
            "--rs-sticky-top": "3.5rem", // the sticky date header (h-14)
          } as React.CSSProperties
        }
      >
        <p id={helpId} className="sr-only">
          {i18n.labels.help(!!onEventResize)}
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
          weekStartsOn={firstDay}
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
            utilization={utilization}
            onToggleGroup={toggleGroup}
            rowRange={rowRange}
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
              onMouseUp={handleMouseUp}
              onCancelSelect={cancelSelection}
              onEventClick={onEventClick}
              renderEventPopover={renderEventPopover}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              checkPlacement={checkPlacement}
              slotMinutes={slotMinutes}
              businessHours={businessHours}
              nowIndicator={nowIndicator}
              rowRange={rowRange}
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
      </DensityContext.Provider>
      </ClassNamesContext.Provider>
    </I18nContext.Provider>
  );
});

export default ResourceScheduler;
