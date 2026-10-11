import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type Resource, ViewType } from "../types";
import { useScheduler } from "./useScheduler";

const make = (): Resource[] => [
  {
    id: "a",
    name: "A",
    events: [{ id: "e", title: "E", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) }],
  },
];

// Counts how often the row's events are read, which is what measuring a row does.
const countReads = (resource: Resource) => {
  const events = resource.events;
  const reads = { n: 0 };
  Object.defineProperty(resource, "events", {
    configurable: true,
    get() {
      reads.n++;
      return events;
    },
  });
  return reads;
};

describe("useScheduler row heights", () => {
  it("measures a row once, however often its height is asked for", () => {
    const initial = make();
    const { result, rerender } = renderHook(() => useScheduler(initial, new Date(2026, 9, 7), ViewType.Week));
    const row = result.current.resources[0];
    const reads = countReads(row);

    const height = result.current.getResourceRowHeight(row);
    result.current.getResourceRowHeight(row);
    result.current.getRowHeights();
    result.current.getGridTemplateRows();
    expect(reads.n).toBe(1);

    // A re-render that changes nothing the heights depend on (a scroll window moving) reuses them.
    rerender();
    expect(result.current.resources[0]).toBe(row);
    expect(result.current.getResourceRowHeight(row)).toBe(height);
    result.current.getGridTemplateRows();
    expect(reads.n).toBe(1);
  });

  it("measures again after the view changes", () => {
    const initial = make();
    const { result } = renderHook(() => useScheduler(initial, new Date(2026, 9, 7), ViewType.Week));
    const before = result.current.resources[0];
    result.current.getResourceRowHeight(before);

    act(() => result.current.setViewType(ViewType.Month));
    const after = result.current.resources[0];
    expect(after).not.toBe(before);
    const reads = countReads(after);
    result.current.getResourceRowHeight(after);
    expect(reads.n).toBe(1);
  });

  it("gives one lane of room for an empty row and more for events that overlap", () => {
    const overlapping: Resource[] = [
      {
        id: "a",
        name: "A",
        events: [
          { id: "1", title: "1", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 11) },
          { id: "2", title: "2", startDate: new Date(2026, 9, 7, 10), endDate: new Date(2026, 9, 7, 12) },
        ],
      },
      { id: "b", name: "B", events: [] },
    ];
    const { result } = renderHook(() =>
      useScheduler(overlapping, new Date(2026, 9, 7), ViewType.Day, undefined, undefined, { lane: 50, minRowHeight: 0 })
    );
    const [two, none] = result.current.getRowHeights();
    expect(none).toBe(50 + 8); // one lane and the padding
    expect(two).toBe(100 + 8); // two lanes
  });
});
