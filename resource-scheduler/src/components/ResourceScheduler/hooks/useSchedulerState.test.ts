import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Resource, ViewType } from "../types";
import { useSchedulerState } from "./useSchedulerState";

const at = (day: number, hour: number) => new Date(2026, 9, day, hour);
const resources = (title = "Standup"): Resource[] => [
  { id: "a", name: "A", events: [{ id: "e", title, startDate: at(7, 9), endDate: at(7, 10) }] },
  { id: "b", name: "B", events: [] },
];
const wednesday = at(7, 12);

afterEach(() => vi.restoreAllMocks());

describe("useSchedulerState", () => {
  it("returns the state of the view and the actions to change it", () => {
    const { result } = renderHook(() =>
      useSchedulerState({ resources: resources(), initialDate: wednesday, initialView: ViewType.Week })
    );
    const state = result.current;
    expect(state.date).toEqual(wednesday);
    expect(state.view).toBe(ViewType.Week);
    expect(state.columns).toHaveLength(7);
    expect(state.rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(state.layout[0][0]).toMatchObject({ startPosition: 3, span: 1, lane: 0 });
    expect(state.rowHeights).toEqual([60, 60]);
    expect(state.range).toEqual({ start: at(4, 0), end: at(11, 0) });
    for (const action of ["navigate", "setView", "setDate", "goToToday"] as const) {
      expect(typeof state[action]).toBe("function");
    }
  });

  it("re-renders when the view is navigated or changed", () => {
    const { result } = renderHook(() =>
      useSchedulerState({ resources: resources(), initialDate: wednesday, initialView: ViewType.Week })
    );
    act(() => {
      result.current.navigate("next");
    });
    expect(result.current.date).toEqual(at(14, 12));
    act(() => result.current.setView(ViewType.Day));
    expect(result.current.columns).toHaveLength(24);
    act(() => result.current.goToToday(at(2, 9)));
    expect(result.current.date).toEqual(at(2, 9));
  });

  it("shows new data in the same render, without a pass over the old data", () => {
    let renders = 0;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, rerender } = renderHook(
      ({ list }) => {
        renders++;
        return useSchedulerState({ resources: list, initialDate: wednesday, initialView: ViewType.Week });
      },
      { initialProps: { list: resources("Standup") } }
    );
    expect(result.current.rows[0].events[0].title).toBe("Standup");
    expect(renders).toBe(1);
    rerender({ list: resources("Review") });
    expect(result.current.rows[0].events[0].title).toBe("Review");
    expect(renders).toBe(2); // one more render, not two
    expect(spy).not.toHaveBeenCalled(); // and React saw no update during a render
  });

  it("follows options as they change", () => {
    const list = resources();
    const { result, rerender } = renderHook(
      ({ hideWeekends }) =>
        useSchedulerState({ resources: list, initialDate: wednesday, initialView: ViewType.Week, hideWeekends }),
      { initialProps: { hideWeekends: false } }
    );
    expect(result.current.columns).toHaveLength(7);
    rerender({ hideWeekends: true });
    expect(result.current.columns).toHaveLength(5);
  });

  it("keeps the same objects while nothing changes", () => {
    const list = resources();
    const { result, rerender } = renderHook(() =>
      useSchedulerState({ resources: list, initialDate: wednesday, initialView: ViewType.Week })
    );
    const before = result.current;
    rerender();
    expect(result.current).toBe(before);
    expect(result.current.rows).toBe(before.rows);
    expect(result.current.navigate).toBe(before.navigate);
  });

  it("does not share state between two uses", () => {
    const options = { resources: resources(), initialDate: wednesday, initialView: ViewType.Week };
    const one = renderHook(() => useSchedulerState(options));
    const two = renderHook(() => useSchedulerState(options));
    act(() => one.result.current.navigate("next"));
    expect(one.result.current.date).toEqual(at(14, 12));
    expect(two.result.current.date).toEqual(wednesday);
  });

  it("renders on the server", () => {
    const Page = () => {
      const { columns, rows } = useSchedulerState({ resources: resources(), initialDate: wednesday, initialView: ViewType.Week });
      return createElement("p", null, `${columns.length} columns, ${rows.map((r) => r.name).join(" and ")}`);
    };
    expect(renderToString(createElement(Page))).toContain("7 columns, A and B");
  });
});
