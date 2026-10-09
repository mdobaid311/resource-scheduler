import { useCallback, useState } from "react";
import type { Resource, SchedulerEvent } from "@scheduler/types";

/**
 * The state handling every app using the scheduler writes: it never keeps its
 * own copy of your data, so create, move and resize are plain state updates.
 */
export const useSchedule = (initial: () => Resource[]) => {
  const [resources, setResources] = useState<Resource[]>(initial);
  const [log, setLog] = useState("");

  const addEvent = useCallback(
    (resourceId: string, event: Omit<SchedulerEvent, "id">) => {
      const created = { ...event, id: `e-${Date.now()}` };
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? { ...r, events: [...r.events, created] } : r))
      );
      return created;
    },
    []
  );

  const move = useCallback(
    (event: SchedulerEvent, from: string, to: string, start: Date, end: Date) => {
      setResources((prev) =>
        prev.map((r) => {
          const kept = r.events.filter((e) => e.id !== event.id);
          return r.id === to
            ? { ...r, events: [...kept, { ...event, startDate: start, endDate: end }] }
            : r.id === from
            ? { ...r, events: kept }
            : r;
        })
      );
      setLog(`Moved "${event.title}"`);
    },
    []
  );

  const resize = useCallback(
    (event: SchedulerEvent, resourceId: string, start: Date, end: Date) => {
      setResources((prev) =>
        prev.map((r) =>
          r.id === resourceId
            ? {
                ...r,
                events: r.events.map((e) =>
                  e.id === event.id ? { ...e, startDate: start, endDate: end } : e
                ),
              }
            : r
        )
      );
      setLog(`Resized "${event.title}"`);
    },
    []
  );

  return { resources, addEvent, move, resize, log, setLog };
};
