// src/components/ResourceScheduler/classNames.ts
import { createContext, useContext } from "react";
import { cn } from "./lib/utils";

/**
 * Extra classes for the main parts of the scheduler. Yours are merged after
 * the defaults with tailwind-merge, so a conflicting utility such as
 * `rounded-none` replaces the default `rounded`.
 */
export interface SchedulerClassNames {
  /** The outer element (`.rs-root`). */
  root?: string;
  /** The toolbar with the date, arrows, today and view select. */
  toolbar?: string;
  /** Each column header: an hour in the day view, a day in the others. */
  dateHeader?: string;
  /** The cell in the left column that holds a resource's name. */
  resourceCell?: string;
  /** A group header in the left column. */
  groupHeader?: string;
  /** Each empty slot of the grid. */
  slot?: string;
  /** The default event card (not one you draw with `renderTimeSlot`). */
  event?: string;
}

export const ClassNamesContext = createContext<SchedulerClassNames>({});

export const useClassNames = () => useContext(ClassNamesContext);

/**
 * `base` with `extra` merged over it. Without `extra` it is `base` untouched,
 * so output only changes where you ask for it.
 */
export const withClass = (base: string, extra?: string) => (extra ? cn(base, extra) : base);
