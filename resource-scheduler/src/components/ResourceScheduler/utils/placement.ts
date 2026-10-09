// src/components/ResourceScheduler/utils/placement.ts
import type { Resource, SchedulerEvent } from "../types";

/** Where an event would end up after a drop, resize or create. */
export interface Placement {
  resourceId: string;
  start: Date;
  end: Date;
}

export interface PlacementRules {
  /**
   * `false` forbids overlapping another event on the same resource. A
   * function decides per overlapping pair (return `true` to allow).
   * Default: overlap is allowed.
   */
  eventOverlap?: boolean | ((moving: SchedulerEvent, other: SchedulerEvent) => boolean);
  /** Final veto for any move, resize or create. Return `false` to reject. */
  isValidDrop?: (event: SchedulerEvent, placement: Placement) => boolean;
}

/** End times are exclusive. A zero-length range counts as a single instant. */
export const rangesOverlap = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean => {
  const end = (start: Date, e: Date) =>
    e > start ? e.getTime() : start.getTime() + 1;
  return (
    aStart.getTime() < end(bStart, bEnd) && bStart.getTime() < end(aStart, aEnd)
  );
};

export const isPlacementAllowed = (
  event: SchedulerEvent,
  placement: Placement,
  resources: Resource[],
  { eventOverlap, isValidDrop }: PlacementRules
): boolean => {
  const overlapping =
    resources
      .find((r) => r.id === placement.resourceId)
      ?.events.filter(
        (other) =>
          other.id !== event.id &&
          rangesOverlap(
            placement.start,
            placement.end,
            other.startDate,
            other.endDate
          )
      ) ?? [];

  if (eventOverlap === false && overlapping.length > 0) return false;
  if (
    typeof eventOverlap === "function" &&
    !overlapping.every((other) => eventOverlap(event, other))
  )
    return false;

  return isValidDrop ? isValidDrop(event, placement) !== false : true;
};
