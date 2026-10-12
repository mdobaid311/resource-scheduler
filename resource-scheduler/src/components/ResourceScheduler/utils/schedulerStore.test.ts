import { describe, expect, it, vi } from "vitest";
import { type Resource, type SchedulerEvent, ViewType } from "../types";
import { getColumns, getRowHeights, layoutEvents } from "./layout";
import { createSchedulerStore } from "./schedulerStore";

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const ev = (id: string, startDate: Date, endDate: Date, extra: Partial<SchedulerEvent> = {}): SchedulerEvent => ({
  id,
  title: id,
  startDate,
  endDate,
  ...extra,
});
const ids = (row: Resource) => row.events.map((e) => e.id);

const resources = (): Resource[] => [
  {
    id: "a",
    name: "A",
    events: [
      ev("standup", at(5, 9), at(5, 10), { recurrence: { freq: "daily" } }),
      ev("review", at(7, 9, 30), at(7, 11)),
      ev("far", at(28, 9), at(28, 10)),
    ],
  },
  { id: "b", name: "B", events: [] },
];
const wednesday = at(7, 12);
const make = (input: Partial<Parameters<typeof createSchedulerStore>[0]> = {}) =>
  createSchedulerStore({ resources: resources(), initialDate: wednesday, initialView: ViewType.Week, ...input });

describe("createSchedulerStore state", () => {
  it("starts on the date and view it is given, and works out the rest from them", () => {
    const state = make({ weekStartsOn: 1 }).getState();
    expect(state.date).toEqual(wednesday);
    expect(state.view).toBe(ViewType.Week);
    expect(state.range).toEqual({ start: at(5, 0), end: at(12, 0) });
    expect(state.columns).toEqual(getColumns(wednesday, ViewType.Week, { weekStartsOn: 1 }));
    expect(state.rows.map(ids)).toEqual([
      [
        "standup::2026-10-05",
        "standup::2026-10-06",
        "standup::2026-10-07",
        "standup::2026-10-08",
        "standup::2026-10-09",
        "standup::2026-10-10",
        "standup::2026-10-11",
        "review",
      ],
      [],
    ]);
    expect(state.utilization).toBeUndefined();
  });

  it("defaults to today in the day view", () => {
    const state = createSchedulerStore({ resources: [] }).getState();
    expect(state.view).toBe(ViewType.Day);
    expect(state.date.toDateString()).toBe(new Date().toDateString());
  });

  it("lays events out and measures rows like the headless functions", () => {
    const state = make({ density: "compact" }).getState();
    expect(state.layout).toHaveLength(state.rows.length);
    state.rows.forEach((row, i) => expect(state.layout[i]).toEqual(layoutEvents(row.events, state.columns, ViewType.Week)));
    expect(state.rowHeights).toEqual(getRowHeights(state.rows, state.columns, ViewType.Week, { lane: 38 }));
  });

  it("resolves the slot length and the day view columns", () => {
    const state = make({ initialView: ViewType.Day, slotDuration: 30, dayStartHour: 8, dayEndHour: 12 }).getState();
    expect(state.slotMinutes).toBe(30);
    expect(state.columns).toHaveLength(8);
    expect(state.range).toEqual({ start: at(7, 8), end: at(7, 12) });
  });

  it("merges the flat events into the resources", () => {
    const state = make({ events: [ev("flat", at(8, 9), at(8, 10), { resourceId: "b" })] }).getState();
    expect(ids(state.rows[1])).toEqual(["flat"]);
  });

  it("puts resources under group headers and leaves out the members of a collapsed group", () => {
    const grouped = [
      { id: "a", name: "A", events: [], group: "Ward" },
      { id: "b", name: "B", events: [], group: "Ward" },
      { id: "c", name: "C", events: [] },
    ];
    const open = make({ resources: grouped }).getState();
    expect(open.rows.map((r) => r.id)).toEqual(["rs-group:Ward", "a", "b", "c"]);
    expect(open.rowHeights[0]).toBe(36);
    const shut = make({ resources: grouped, collapsedGroups: ["Ward"] }).getState();
    expect(shut.rows.map((r) => r.id)).toEqual(["rs-group:Ward", "c"]);
  });

  it("measures utilization of rows and group headers only when asked", () => {
    const grouped = [{ id: "a", name: "A", events: [ev("e", at(7, 9), at(7, 11))], group: "Ward" }];
    const businessHours = { daysOfWeek: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 };
    const state = make({ resources: grouped, showUtilization: true, businessHours }).getState();
    expect([...state.utilization!.keys()]).toEqual(["a", "rs-group:Ward"]);
    expect(state.utilization!.get("a")).toMatchObject({ bookedMinutes: 120, availableMinutes: 5 * 8 * 60 });
    expect(state.utilization!.get("rs-group:Ward")).toEqual(state.utilization!.get("a"));
    // The bar needs room: no row is shorter than 60 px.
    expect(Math.min(...state.rowHeights.slice(1))).toBeGreaterThanOrEqual(60);
  });
});

describe("createSchedulerStore navigation", () => {
  it("moves by the period of the view and returns the new date", () => {
    const store = make();
    expect(store.navigate("next")).toEqual(at(14, 12));
    expect(store.getState().date).toEqual(at(14, 12));
    expect(store.getState().range.start).toEqual(at(11, 0));
    store.navigate("prev");
    store.navigate("prev");
    expect(store.getState().date).toEqual(new Date(2026, 8, 30, 12));
  });

  it("changes the view and keeps the date", () => {
    const store = make();
    store.setView(ViewType.Month);
    expect(store.getState()).toMatchObject({ view: ViewType.Month, date: wednesday });
    expect(store.getState().columns).toHaveLength(31);
  });

  it("jumps to a date, and to today", () => {
    const store = make();
    store.setDate(at(20, 8));
    expect(store.getState().date).toEqual(at(20, 8));
    store.goToToday(at(2, 9));
    expect(store.getState().date).toEqual(at(2, 9));
    store.goToToday();
    expect(store.getState().date.toDateString()).toBe(new Date().toDateString());
  });
});

describe("createSchedulerStore subscriptions", () => {
  it("tells subscribers once per change, and stops after unsubscribe", () => {
    const store = make();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.navigate("next");
    store.setView(ViewType.Month);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.navigate("next");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("hands out the same state until something changes", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    const first = store.getState();
    expect(store.getState()).toBe(first);
    store.setView(ViewType.Week); // no change
    store.setDate(new Date(wednesday)); // the same instant, so nothing to tell
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(first);
    store.navigate("next");
    expect(store.getState()).not.toBe(first);
  });

  it("keeps the parts that did not change when other parts did", () => {
    const store = make();
    const before = store.getState();
    store.setInput({ resources: [{ id: "a", name: "A", events: [] }, resources()[1]] });
    const after = store.getState();
    expect(after.columns).toBe(before.columns);
    expect(after.range).toBe(before.range);
    expect(after.rows).not.toBe(before.rows);
    expect(after.rows.map(ids)).toEqual([[], []]);
  });

  it("ignores an input that is the same as before", () => {
    const input = resources();
    const store = make({ resources: input });
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getState();
    store.setInput({ resources: input });
    store.setInput({});
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(before);
  });

  it("can take an input without telling anyone, for a host that is already rendering", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setInput({ hideWeekends: true, weekStartsOn: 1 }, { silent: true });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().columns).toHaveLength(5);
  });

  it("applies an input that arrives with a notification", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setInput({ hideWeekends: true, weekStartsOn: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().columns).toHaveLength(5);
  });
});
