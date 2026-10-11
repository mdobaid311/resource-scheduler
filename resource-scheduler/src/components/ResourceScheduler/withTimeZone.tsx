// src/components/ResourceScheduler/withTimeZone.tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { ClockContext } from "./clock";
import type {
  Resource,
  ResourceInput,
  ResourceSchedulerHandle,
  ResourceSchedulerProps,
  SchedulerEvent,
} from "./types";
import { isValidTimeZone, utcToZoned, zonedToUtc } from "./utils/timeZone";

type Scheduler = React.ForwardRefExoticComponent<
  ResourceSchedulerProps & React.RefAttributes<ResourceSchedulerHandle>
>;
type Convert = (date: Date) => Date;

const mapEvent = <E extends { startDate: Date; endDate: Date }>(event: E, convert: Convert): E => ({
  ...event,
  startDate: convert(event.startDate),
  endDate: convert(event.endDate),
});

const mapResource = <R extends ResourceInput>(resource: R, convert: Convert): R => ({
  ...resource,
  ...(resource.events && { events: resource.events.map((e) => mapEvent(e, convert)) }),
  ...(resource.unavailable && {
    unavailable: resource.unavailable.map((u) => ({ start: convert(u.start), end: convert(u.end) })),
  }),
});

// `timeZone` works by converting every date at the boundary: the scheduler
// itself only ever sees Dates whose local fields (getHours() and so on) are the
// wall-clock time in the zone, so the grid, recurrence and business hours need
// no zone logic. What goes in is converted to that, and what comes out of a
// handler is converted back to the instant it stands for. Recurrence days
// (`until`, `exceptions`) are calendar days, so they are left as they are.
const zoned = (Base: Scheduler) =>
  forwardRef<ResourceSchedulerHandle, ResourceSchedulerProps & { timeZone: string }>(
    function ZonedResourceScheduler(props, ref) {
      const {
        timeZone,
        resources,
        events,
        initialDate,
        onEventClick,
        onDateChange,
        onRangeChange,
        onEventCreate,
        onEventDrop,
        onSlotSelect,
        onEventResize,
        eventOverlap,
        isValidDrop,
        ...rest
      } = props;

      const toWall = useCallback<Convert>((date) => utcToZoned(date, timeZone), [timeZone]);
      const toInstant = useCallback<Convert>((date) => zonedToUtc(date, timeZone), [timeZone]);
      const clock = useCallback(() => toWall(new Date()), [toWall]);

      const wallResources = useMemo(() => resources.map((r) => mapResource(r, toWall)), [resources, toWall]);
      const wallEvents = useMemo(() => events?.map((e) => mapEvent(e, toWall)), [events, toWall]);

      const handlers = useMemo(() => {
        const instantEvent = (e: SchedulerEvent) => mapEvent(e, toInstant);
        const instantResource = (r: Resource) => mapResource(r, toInstant);
        return {
          onEventClick: onEventClick && ((e: SchedulerEvent, r: Resource) => onEventClick(instantEvent(e), instantResource(r))),
          onDateChange: onDateChange && ((d: Date) => onDateChange(toInstant(d))),
          onRangeChange:
            onRangeChange &&
            ((range: Parameters<NonNullable<typeof onRangeChange>>[0]) =>
              onRangeChange({ ...range, start: toInstant(range.start), end: toInstant(range.end) })),
          onEventCreate:
            onEventCreate &&
            ((e: Omit<SchedulerEvent, "id">, resourceId: string) => onEventCreate(mapEvent(e, toInstant), resourceId)),
          onEventDrop:
            onEventDrop &&
            ((e: SchedulerEvent, from: string, to: string, start: Date, end: Date) =>
              onEventDrop(instantEvent(e), from, to, toInstant(start), toInstant(end))),
          onSlotSelect:
            onSlotSelect &&
            ((s: Parameters<NonNullable<typeof onSlotSelect>>[0]) =>
              onSlotSelect({ ...s, start: toInstant(s.start), end: toInstant(s.end) })),
          onEventResize:
            onEventResize &&
            ((e: SchedulerEvent, resourceId: string, start: Date, end: Date) =>
              onEventResize(instantEvent(e), resourceId, toInstant(start), toInstant(end))),
          eventOverlap:
            typeof eventOverlap === "function"
              ? (moving: SchedulerEvent, other: SchedulerEvent) => eventOverlap(instantEvent(moving), instantEvent(other))
              : eventOverlap,
          isValidDrop:
            isValidDrop &&
            ((e: SchedulerEvent, p: Parameters<NonNullable<typeof isValidDrop>>[1]) =>
              isValidDrop(instantEvent(e), { ...p, start: toInstant(p.start), end: toInstant(p.end) })),
        };
      }, [toInstant, onEventClick, onDateChange, onRangeChange, onEventCreate, onEventDrop, onSlotSelect, onEventResize, eventOverlap, isValidDrop]);

      const inner = useRef<ResourceSchedulerHandle>(null);
      useImperativeHandle(
        ref,
        () => ({
          goTo: (date) => inner.current?.goTo(toWall(date)),
          setView: (view) => inner.current?.setView(view),
          getVisibleRange: () => {
            const range = inner.current!.getVisibleRange();
            return { start: toInstant(range.start), end: toInstant(range.end) };
          },
          scrollToTime: (date) => inner.current?.scrollToTime(toWall(date)),
        }),
        [toWall, toInstant]
      );

      return (
        <ClockContext.Provider value={clock}>
          <Base
            ref={inner}
            {...rest}
            {...handlers}
            resources={wallResources}
            events={wallEvents}
            initialDate={toWall(initialDate ?? new Date())}
          />
        </ClockContext.Provider>
      );
    }
  );

/**
 * Adds the `timeZone` prop to a scheduler: with an IANA zone it shows and
 * reports times in that zone, without one it is `Base` as it was. An unknown
 * zone warns and falls back to the local time zone rather than crashing.
 */
export const withTimeZone = (Base: Scheduler): Scheduler => {
  const Zoned = zoned(Base);
  const Scheduler = forwardRef<ResourceSchedulerHandle, ResourceSchedulerProps>(function ResourceScheduler(props, ref) {
    const { timeZone } = props;
    const known = timeZone !== undefined && isValidTimeZone(timeZone);
    useEffect(() => {
      if (timeZone !== undefined && !known) {
        console.warn(`ResourceScheduler: unknown timeZone "${timeZone}". Use an IANA name such as "Europe/Paris". Showing local time instead.`);
      }
    }, [timeZone, known]);
    return known ? <Zoned ref={ref} {...props} timeZone={timeZone} /> : <Base ref={ref} {...props} />;
  });
  return Scheduler;
};
