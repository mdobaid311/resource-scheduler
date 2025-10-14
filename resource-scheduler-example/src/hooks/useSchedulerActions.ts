// hooks/useSchedulerActions.ts
import { useState } from "react";
import { type Event, type Resource, ViewType } from "resource-scheduler";
import { sampleResources } from "../sampleData";

export const useSchedulerActions = () => {
  const [resources, setResources] = useState<Resource[]>(sampleResources);
  const [eventsCreated, setEventsCreated] = useState(0);
  const [eventsDropped, setEventsDropped] = useState(0);
  const [lastAction, setLastAction] = useState<string>("");

  const handleDateChange = (date: Date) => {
    setLastAction(`Date changed to: ${date.toDateString()}`);
  };

  const handleEventClick = (event: Event, resource: Resource) => {
    setLastAction(`Event clicked: ${event.title} (${resource.name})`);
  };

  const handleEventCreate = (
    eventData: Omit<Event, "id">,
    resourceId: string
  ) => {
    const newEvent: Event = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setResources((prevResources) =>
      prevResources.map((resource) =>
        resource.id === resourceId
          ? { ...resource, events: [...resource.events, newEvent] }
          : resource
      )
    );

    setEventsCreated((prev) => prev + 1);
    setLastAction(`Event created on resource: ${resourceId}`);
  };

  const handleEventDrop = (
    event: Event,
    fromResourceId: string,
    toResourceId: string,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    setResources((prevResources) => {
      return prevResources.map((resource: Resource) => {
        if (resource.id === fromResourceId) {
          return {
            ...resource,
            events: resource.events.filter((e: Event) => e.id !== event.id),
          };
        }
        if (resource.id === toResourceId) {
          return {
            ...resource,
            events: [
              ...resource.events,
              {
                ...event,
                startDate: newStartDate,
                endDate: newEndDate,
              },
            ],
          };
        }
        return resource;
      });
    });
    setEventsDropped((prev) => prev + 1);
    setLastAction(`Event moved from ${fromResourceId} to ${toResourceId}`);
  };

  const handleViewChange = (view: ViewType) => {
    setLastAction(`View changed to: ${view}`);
  };

  const handleClearStats = () => {
    setEventsCreated(0);
    setEventsDropped(0);
    setLastAction("Stats cleared");
  };

  const handleResetData = () => {
    setResources(sampleResources);
    setEventsCreated(0);
    setEventsDropped(0);
    setLastAction("Data reset to initial state");
  };

  return {
    resources,
    stats: {
      eventsCreated,
      eventsDropped,
      lastAction,
    },
    actions: {
      handleDateChange,
      handleEventClick,
      handleViewChange,
    },
    handleEventCreate,
    handleEventDrop,
    handleClearStats,
    handleResetData,
  };
};
