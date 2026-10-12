// src/components/ResourceScheduler/utils/events.ts
import type { Resource, ResourceInput, SchedulerEvent, ViewType } from "../types";
import { getVisibleEvents, getVisibleRange, type SlotOptions, type ViewOptions } from "./dateUtils";
import { expandEvents } from "./recurrence";

/**
 * Adds a flat list of events to the resources they name, through `resourceId`
 * or `resourceIds`. Events a resource already holds come first. Events that
 * name no known resource are ignored. Resources without an `events` array
 * get an empty one. Returns `resources` itself when nothing has to change,
 * so memoised callers keep their identity.
 */
export const withEvents = (
  resources: ResourceInput[],
  events?: SchedulerEvent[]
): Resource[] => {
  if (!events?.length && resources.every((r) => r.events)) {
    return resources as Resource[];
  }

  const byResource = new Map<string, SchedulerEvent[]>();
  for (const event of events ?? []) {
    for (const id of new Set([event.resourceId, ...(event.resourceIds ?? [])])) {
      if (id === undefined) continue;
      const list = byResource.get(id);
      if (list) list.push(event);
      else byResource.set(id, [event]);
    }
  }

  return resources.map((resource) => {
    const added = byResource.get(resource.id);
    return added || !resource.events
      ? { ...resource, events: [...(resource.events ?? []), ...(added ?? [])] }
      : (resource as Resource);
  });
};

/**
 * The resources as the grid draws them for the period that contains
 * `currentDate`: recurring events become one event per occurrence, and the
 * events outside what the view shows (the visible hours in the day view, the
 * visible days in the others) are left out. The rest of each resource is kept.
 * Returns new objects; `resources` is not changed.
 */
export const getVisibleResources = (
  resources: Resource[],
  currentDate: Date,
  viewType: ViewType,
  options: SlotOptions & ViewOptions = {}
): Resource[] => {
  const range = getVisibleRange(currentDate, viewType, options);
  return resources.map((resource) => ({
    ...resource,
    events: getVisibleEvents(
      expandEvents(resource.events, range.start, range.end),
      currentDate,
      viewType,
      options,
      options
    ),
  }));
};
