import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type Resource, ViewType } from "../types";
import { getVisibleResources } from "../utils/events";
import { getColumns, getGridTemplateRows, getRowHeights, layoutEvents } from "../utils/layout";
import { useScheduler } from "./useScheduler";

// useScheduler is a thin layer over the pure functions of the headless entry:
// whatever it returns must be what they return for the same input.

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const resources: Resource[] = [
  {
    id: "a",
    name: "A",
    events: [
      { id: "standup", title: "Standup", startDate: at(5, 9), endDate: at(5, 10), recurrence: { freq: "daily" } },
      { id: "review", title: "Review", startDate: at(7, 9, 30), endDate: at(7, 11) },
      { id: "far", title: "Far", startDate: at(28, 9), endDate: at(28, 10) },
    ],
  },
  { id: "b", name: "B", events: [] },
];
const slots = { slotDuration: 30, dayStartHour: 8, dayEndHour: 18 };
const view = { weekStartsOn: 1 as const, hideWeekends: true };
const lane = { lane: 40, minRowHeight: 70 };

describe.each([ViewType.Day, ViewType.Week, ViewType.Month])("useScheduler in the %s view", (viewType) => {
  const render = () =>
    renderHook(() => useScheduler(resources, at(7, 12), viewType, slots, view, lane)).result.current;

  it("resolves the resources like getVisibleResources", () => {
    expect(render().resources).toEqual(getVisibleResources(resources, at(7, 12), viewType, { ...slots, ...view }));
  });

  it("lays events out like layoutEvents", () => {
    const hook = render();
    const columns = getColumns(at(7, 12), viewType, { ...slots, ...view });
    for (const row of hook.resources) {
      expect(hook.calculateEventPositions(row.events, columns)).toEqual(layoutEvents(row.events, columns, viewType));
    }
  });

  it("measures rows like getRowHeights", () => {
    const hook = render();
    const columns = getColumns(at(7, 12), viewType, { ...slots, ...view });
    const heights = getRowHeights(hook.resources, columns, viewType, lane);
    expect(hook.getRowHeights()).toEqual(heights);
    expect(hook.getGridTemplateRows()).toBe(getGridTemplateRows(heights));
  });
});
