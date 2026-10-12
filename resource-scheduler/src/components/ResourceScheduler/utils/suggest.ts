// src/components/ResourceScheduler/utils/suggest.ts
import { addDays, startOfDay } from "date-fns";
import {
  type BusinessHours,
  type Resource,
  type SchedulerEvent,
  type UnavailableRange,
  type VisibleRange,
  ViewType,
} from "../types";
import { findAvailableSlots, touchesUnavailable } from "./availability";
import { isPlacementAllowed, type PlacementRules } from "./placement";
import { expandEvents } from "./recurrence";
import { getUtilization } from "./utilization";

/** One possible placement, as a strategy function sees it. */
export interface SuggestCandidate {
  resource: Resource;
  start: Date;
  end: Date;
  /** How much of the resource's available time is booked, as in `getUtilization`; `null` when none is available. */
  utilization: number | null;
}

/**
 * How suggestions are ranked, lowest score first:
 * - `"earliest"`: the soonest start.
 * - `"least-booked"`: the lowest utilization, to spread work out.
 * - `"most-booked"`: the highest utilization, to fill the busiest first.
 * - a function returning a number. A score that is not finite (`NaN`,
 *   `Infinity`) drops the candidate.
 */
export type SuggestStrategy =
  | "earliest"
  | "least-booked"
  | "most-booked"
  | ((candidate: SuggestCandidate) => number);

/**
 * What to place. Either a fixed time (`start` and `end`), which resources can
 * take it, or a window to search (`from`, `to` and `duration` in minutes, with
 * the `step` of `findAvailableSlots`), which gives each resource its slots.
 * `event` is the job being placed: the rules receive it, and an event with
 * its `id` already on a resource does not count against that resource.
 */
export type SuggestRequest = (
  | { start: Date; end: Date }
  | { from: Date; to: Date; duration: number; step?: number }
) & { event?: SchedulerEvent };

export interface SuggestOptions extends PlacementRules {
  /** The shared hours; a resource's own `businessHours` wins. */
  businessHours?: BusinessHours;
  /** Only consider these resources. They are still listed in the order of `resources`. */
  resourceIds?: string[];
  /** Default `"earliest"`. */
  strategy?: SuggestStrategy;
  /** Return at most this many suggestions. Default: all of them. */
  limit?: number;
  /** How many slots to suggest for one resource. Default 1, the best; `Infinity` lists every free slot. */
  perResource?: number;
}

export interface Suggestion {
  resourceId: string;
  start: Date;
  end: Date;
  /** What the strategy ranked on, lowest first: the start in ms for `"earliest"`, the utilization for `"least-booked"`. */
  score: number;
  /**
   * How much of the resource's available time is booked, before this job: over
   * the window searched, or over the day of a fixed time. `null` when none is available.
   */
  utilization: number | null;
}

const MINUTE = 60_000;

const scores = {
  earliest: ({ start }) => start.getTime(),
  "least-booked": ({ utilization }) => utilization ?? 0,
  "most-booked": ({ utilization }) => -(utilization ?? 0),
} satisfies Record<string, (candidate: SuggestCandidate) => number>;

/**
 * The periods in which `capacity` or more of `events` run at once, so one
 * more would not fit. Back-to-back events never count as running together.
 */
const fullRanges = (events: SchedulerEvent[], capacity: number): UnavailableRange[] => {
  // A zero-length event holds its instant for a millisecond, as `rangesOverlap` says.
  // Ends sort before starts at the same instant.
  const edges = events
    .flatMap((e): [number, number][] => {
      const start = e.startDate.getTime();
      return [
        [start, 1],
        [Math.max(e.endDate.getTime(), start + 1), -1],
      ];
    })
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const full: UnavailableRange[] = [];
  let running = 0;
  let since = 0;
  for (const [time, change] of edges) {
    const before = running;
    running += change;
    if (before < capacity && running >= capacity) since = time;
    else if (before >= capacity && running < capacity) full.push({ start: new Date(since), end: new Date(time) });
  }
  return full;
};

/**
 * Which resources can take a job, best first. Give it a time to place and it
 * lists the resources that are free then; give it a window and it lists each
 * resource's free slots. A placement is only suggested when it is inside the
 * resource's hours (`businessHours`, its own or the shared ones), misses its
 * `unavailable` time, finds fewer bookings running at once than its `capacity`
 * (default 1; recurring events are expanded) and passes `eventOverlap` and
 * `isValidDrop` as `isPlacementAllowed` applies them.
 *
 * Suggestions are ranked by the strategy, lowest score first; equal scores
 * keep the order of `resources`, then the earlier start. It works on the Dates
 * you pass, like `findAvailableSlots`: with the `timeZone` prop, convert with
 * `utcToZoned` first or search with instants and read the result as instants.
 * Merge a flat `events` list in first with `withEvents`.
 */
export const suggestResources = (
  resources: Resource[],
  request: SuggestRequest,
  {
    businessHours,
    resourceIds,
    strategy = "earliest",
    limit = Infinity,
    perResource = 1,
    eventOverlap,
    isValidDrop,
  }: SuggestOptions = {}
): Suggestion[] => {
  const fixed = "start" in request;
  const from = fixed ? request.start : request.from;
  const to = fixed ? request.end : request.to;
  if (!(from < to) || !(limit > 0) || !(perResource > 0)) return [];

  const job: SchedulerEvent = request.event ?? {
    id: "",
    title: "",
    startDate: from,
    endDate: fixed ? to : new Date(from.getTime() + request.duration * MINUTE),
  };
  // The booked share is measured over the window, or over the day(s) of a fixed time.
  const range: VisibleRange = fixed
    ? { start: startOfDay(from), end: addDays(startOfDay(new Date(to.getTime() - 1)), 1) }
    : { start: from, end: to };
  const score = typeof strategy === "function" ? strategy : scores[strategy];
  const only = resourceIds && new Set(resourceIds);
  // A fixed time is checked to the minute; a search uses the step, as `findAvailableSlots` does.
  const exact = { businessHours, viewType: ViewType.Day, slotMinutes: 1 };
  // When no rule can veto a slot and every strategy but a function prefers the earlier one,
  // a resource's first `perResource` free slots are the only ones that can win.
  const vetoed = eventOverlap === false || typeof eventOverlap === "function" || isValidDrop;
  const firstSlots = typeof strategy === "function" || vetoed ? Infinity : perResource;

  type Ranked = { index: number; suggestion: Suggestion };
  const byRank = (a: Ranked, b: Ranked) =>
    a.suggestion.score - b.suggestion.score ||
    a.index - b.index ||
    a.suggestion.start.getTime() - b.suggestion.start.getTime();

  return resources
    .flatMap((resource, index): Ranked[] => {
      const capacity = resource.capacity ?? 1;
      if ((only && !only.has(resource.id)) || !(capacity > 0)) return [];

      const events = expandEvents(resource.events, from, to).filter((e) => e.id !== job.id);
      // Time the resource is full counts as unavailable, so the helpers see one rule for both.
      const blocked: Resource = {
        ...resource,
        events: [],
        unavailable: [...(resource.unavailable ?? []), ...fullRanges(events, capacity)],
      };
      const slots = fixed
        ? touchesUnavailable(blocked, { start: from, end: to }, exact)
          ? []
          : [{ start: from, end: to }]
        : findAvailableSlots(blocked, {
            from,
            to,
            duration: request.duration,
            step: request.step,
            businessHours,
            limit: firstSlots,
          });

      const seen = { ...resource, events };
      const allowed = slots.filter((slot) =>
        isPlacementAllowed(job, { resourceId: resource.id, ...slot }, [seen], { eventOverlap, isValidDrop })
      );
      if (!allowed.length) return [];

      const { ratio: utilization } = getUtilization(resource, range, { businessHours });
      return allowed
        .map(({ start, end }) => ({
          index,
          suggestion: { resourceId: resource.id, start, end, score: score({ resource, start, end, utilization }), utilization },
        }))
        .filter(({ suggestion }) => Number.isFinite(suggestion.score))
        .sort(byRank)
        .slice(0, perResource);
    })
    .sort(byRank)
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
};
