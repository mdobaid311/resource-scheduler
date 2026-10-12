// src/components/ResourceScheduler/utils/schedulerStore.ts
// The state of a scheduler view (date, view, columns, rows, layout, heights) as a
// small store with no framework in it. A framework adapter is a few lines:
// `subscribe` and `getState` are what React's useSyncExternalStore, Vue's
// shallowRef and Svelte's readable stores want. See useSchedulerState.
import { type BusinessHours, type ResourceInput, type SchedulerEvent, type Resource, ViewType, type VisibleRange } from "../types";
import { getVisibleRange, navigateDate, resolveSlotOptions, type ViewOptions } from "./dateUtils";
import { getVisibleResources, withEvents } from "./events";
import { groupUtilization, isGroupRow, withGroups } from "./groups";
import {
  type Density,
  type EventPosition,
  getColumns,
  getRowHeightFromLayout,
  LANES,
  layoutEvents,
  UTILIZATION_ROW_HEIGHT,
} from "./layout";
import { getUtilization, type Utilization } from "./utilization";

/** What the view is made from. Everything but `resources` is optional. */
export interface SchedulerInput {
  resources: ResourceInput[];
  /** Events as one flat list, each naming its resource with `resourceId` / `resourceIds`. */
  events?: SchedulerEvent[];
  /** Groups (`Resource.group`, as a name or a path joined with " / ") whose members are left out. */
  collapsedGroups?: string[];
  /** Day view: minutes per slot (60), first visible hour (0) and the hour the day ends (24). */
  slotDuration?: number;
  dayStartHour?: number;
  dayEndHour?: number;
  /** First day of the week, 0 (Sunday) to 6. Default 0. */
  weekStartsOn?: ViewOptions["weekStartsOn"];
  hideWeekends?: boolean;
  /** For `showUtilization`. */
  businessHours?: BusinessHours;
  /** Height of an event lane in the row heights. Default `"comfortable"`. */
  density?: Density;
  /** Work out `utilization`, and keep every row tall enough for its bar. */
  showUtilization?: boolean;
}

export interface SchedulerStoreInput extends SchedulerInput {
  /** The date to start on. Default: now. */
  initialDate?: Date;
  /** The view to start on. Default: the day view. */
  initialView?: ViewType;
}

/** A snapshot of the view. A new object only when something in it changed. */
export interface SchedulerState {
  /** Any date inside the period shown. */
  date: Date;
  view: ViewType;
  /** What the grid covers; `end` is exclusive. */
  range: VisibleRange;
  /** The columns across: the slots of the day in the day view, the days of the period in the others. */
  columns: Date[];
  /** Minutes per slot in the day view, with the default filled in. */
  slotMinutes: number;
  /**
   * The rows, top to bottom: group headers (`isGroupRow`) and resources, each with
   * recurring events expanded and only the events in view.
   */
  rows: Resource[];
  /** Where each event of `rows[i]` goes, in `layout[i]` (`layoutEvents`). Group headers have none. */
  layout: EventPosition[][];
  /** The height of each row in px, in the order of `rows`. */
  rowHeights: number[];
  /** Booked against available time by row id (resources and group headers); only with `showUtilization`. */
  utilization: Map<string, Utilization> | undefined;
}

export interface SchedulerStore {
  /** The current state. The same object until something changes. */
  getState(): SchedulerState;
  /** Calls `listener` after every change; returns the function that stops it. */
  subscribe(listener: () => void): () => void;
  /**
   * Takes new data or options (only the ones you pass). Does nothing when they are
   * all what they were. `silent` skips the notification, for a host that is
   * already rendering with the result and does not need to be told.
   */
  setInput(input: Partial<SchedulerInput>, options?: { silent?: boolean }): void;
  setDate(date: Date): void;
  setView(view: ViewType): void;
  /** Moves a day, week, month, quarter or year, by the view. Returns the new date. */
  navigate(direction: "prev" | "next"): Date;
  /** Shows `now` (default: the current time). */
  goToToday(now?: Date): void;
}

// Runs `fn` again only when an argument is not the one it had last time.
const memo = <A extends unknown[], R>(fn: (...args: A) => R) => {
  let last: A | undefined;
  let value: R;
  return (...args: A): R => {
    if (!last || args.some((arg, i) => !Object.is(arg, last![i]))) {
      value = fn(...args);
      last = args;
    }
    return value;
  };
};

/**
 * Creates the store of a scheduler view. Every part of the state is worked out
 * from the parts it depends on and kept until one of them changes, so a change
 * of date leaves the resources alone and a new `resources` list keeps the columns.
 */
export const createSchedulerStore = ({
  initialDate = new Date(),
  initialView = ViewType.Day,
  ...initialInput
}: SchedulerStoreInput): SchedulerStore => {
  let input: SchedulerInput = initialInput;
  let date = initialDate;
  let view: ViewType = initialView;
  let current: SchedulerState | undefined;
  let stale = true;
  const listeners = new Set<() => void>();

  const merged = memo(withEvents);
  const grouped = memo(withGroups);
  const options = memo(
    (slotDuration: number | undefined, dayStartHour: number | undefined, dayEndHour: number | undefined, weekStartsOn: ViewOptions["weekStartsOn"], hideWeekends: boolean | undefined) => ({
      slotDuration,
      dayStartHour,
      dayEndHour,
      weekStartsOn,
      hideWeekends,
    })
  );
  const columns = memo(getColumns);
  const range = memo(getVisibleRange);
  const rows = memo(getVisibleResources);
  const layout = memo((list: Resource[], across: Date[], on: ViewType) => list.map((row) => layoutEvents(row.events, across, on)));
  const heights = memo((list: Resource[], placed: EventPosition[][], lane: number, minRowHeight: number) =>
    list.map((row, i) => getRowHeightFromLayout(row, placed[i], { lane, minRowHeight }))
  );
  const utilization = memo(
    (on: boolean | undefined, list: Resource[], all: Resource[], span: VisibleRange, businessHours: BusinessHours | undefined) =>
      on
        ? new Map([
            ...list.filter((row) => !isGroupRow(row)).map((row): [string, Utilization] => [row.id, getUtilization(row, span, { businessHours })]),
            // A header adds up everything below it, folded or not.
            ...groupUtilization(all, span, { businessHours }),
          ])
        : undefined
  );

  const compute = (): SchedulerState => {
    const all = merged(input.resources, input.events);
    const opts = options(input.slotDuration, input.dayStartHour, input.dayEndHour, input.weekStartsOn, input.hideWeekends);
    const across = columns(date, view, opts);
    const span = range(date, view, opts);
    const list = rows(grouped(all, input.collapsedGroups), date, view, opts);
    const placed = layout(list, across, view);
    return {
      date,
      view,
      range: span,
      columns: across,
      slotMinutes: resolveSlotOptions({ slotDuration: input.slotDuration }).slotMinutes,
      rows: list,
      layout: placed,
      rowHeights: heights(list, placed, LANES[input.density ?? "comfortable"].lane, input.showUtilization ? UTILIZATION_ROW_HEIGHT : 0),
      utilization: utilization(input.showUtilization, list, all, span, input.businessHours),
    };
  };

  const getState = (): SchedulerState => {
    if (stale) {
      const next = compute();
      // Nothing in it is new: keep handing out the object we had.
      const same = current && (Object.keys(next) as (keyof SchedulerState)[]).every((key) => Object.is(next[key], current![key]));
      current = same ? current : next;
      stale = false;
    }
    return current!;
  };

  const changed = (silent = false) => {
    stale = true;
    if (!silent) listeners.forEach((listener) => listener());
  };

  const setDate = (next: Date) => {
    if (next.getTime() === date.getTime()) return;
    date = next;
    changed();
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setInput(next, { silent } = {}) {
      const keys = Object.keys(next) as (keyof SchedulerInput)[];
      if (keys.every((key) => Object.is(next[key], input[key]))) return;
      input = { ...input, ...next };
      changed(silent);
    },
    setDate,
    setView(next) {
      if (next === view) return;
      view = next;
      changed();
    },
    navigate(direction) {
      date = navigateDate(date, view, direction);
      changed();
      return date;
    },
    goToToday(now = new Date()) {
      setDate(now);
    },
  };
};
