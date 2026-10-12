// src/components/ResourceScheduler/hooks/useSchedulerState.ts
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  createSchedulerStore,
  type SchedulerInput,
  type SchedulerState,
  type SchedulerStore,
  type SchedulerStoreInput,
} from "../utils/schedulerStore";

/** The state of the view, and the actions that change the date and the view. */
export interface SchedulerStateResult
  extends SchedulerState,
    Pick<SchedulerStore, "setDate" | "setView" | "navigate" | "goToToday"> {}

/**
 * The state of a scheduler view for a UI of your own: the date and view, the
 * columns, the rows (recurring events expanded, only what is in view), where
 * each event goes, how tall each row is, and optionally utilization. It is the
 * headless core (`createSchedulerStore`) read through `useSyncExternalStore`,
 * so it is the same on the server and the client.
 *
 * `initialDate` and `initialView` only start it; after that the date and view
 * change through `navigate`, `setDate`, `setView` and `goToToday`. Everything
 * else is read on every render, so a change of `resources` or an option shows
 * in the same render. Keep `resources` and `events` stable (state or `useMemo`)
 * between renders in which they did not change: a new array is new data.
 */
export const useSchedulerState = (input: SchedulerStoreInput): SchedulerStateResult => {
  const [store] = useState(() => createSchedulerStore(input));

  // Every option is passed, undefined included, so one that is dropped goes back to its default
  // (the type makes a new option in SchedulerInput fail here until it is listed).
  const next: Record<keyof SchedulerInput, SchedulerInput[keyof SchedulerInput]> = {
    resources: input.resources,
    events: input.events,
    collapsedGroups: input.collapsedGroups,
    slotDuration: input.slotDuration,
    dayStartHour: input.dayStartHour,
    dayEndHour: input.dayEndHour,
    weekStartsOn: input.weekStartsOn,
    hideWeekends: input.hideWeekends,
    businessHours: input.businessHours,
    density: input.density,
    showUtilization: input.showUtilization,
  };
  // Handed over while rendering, so the state read below is already about these
  // inputs. Silent: this component is the only subscriber and is rendering.
  store.setInput(next as SchedulerInput, { silent: true });

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return useMemo(
    () => ({
      ...state,
      setDate: store.setDate,
      setView: store.setView,
      navigate: store.navigate,
      goToToday: store.goToToday,
    }),
    [state, store]
  );
};
