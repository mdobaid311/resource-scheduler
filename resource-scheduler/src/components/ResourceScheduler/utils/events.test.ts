import { describe, expect, it } from "vitest";
import type { Resource, SchedulerEvent } from "../types";
import { withEvents } from "./events";

const at = (hour: number) => new Date(2026, 9, 7, hour);
const ev = (id: string, extra: Partial<SchedulerEvent> = {}): SchedulerEvent => ({
  id,
  title: id,
  startDate: at(9),
  endDate: at(10),
  ...extra,
});
const res = (id: string, events: SchedulerEvent[] = []): Resource => ({
  id,
  name: id,
  events,
});
const ids = (resource: Resource) => resource.events.map((e) => e.id);

describe("withEvents", () => {
  it("returns the same array when there is nothing to merge", () => {
    const resources = [res("a")];
    expect(withEvents(resources, undefined)).toBe(resources);
    expect(withEvents(resources, [])).toBe(resources);
  });

  it("puts each event under the resource named by resourceId", () => {
    const merged = withEvents(
      [res("a"), res("b")],
      [ev("1", { resourceId: "a" }), ev("2", { resourceId: "b" }), ev("3", { resourceId: "a" })]
    );
    expect(ids(merged[0])).toEqual(["1", "3"]);
    expect(ids(merged[1])).toEqual(["2"]);
  });

  it("puts an event under every resource in resourceIds", () => {
    const merged = withEvents([res("a"), res("b"), res("c")], [ev("1", { resourceIds: ["a", "c"] })]);
    expect(merged.map(ids)).toEqual([["1"], [], ["1"]]);
  });

  it("does not add an event twice when both fields name the same resource", () => {
    const merged = withEvents([res("a")], [ev("1", { resourceId: "a", resourceIds: ["a"] })]);
    expect(ids(merged[0])).toEqual(["1"]);
  });

  it("keeps the events a resource already has, before the flat ones", () => {
    const merged = withEvents([res("a", [ev("own")])], [ev("flat", { resourceId: "a" })]);
    expect(ids(merged[0])).toEqual(["own", "flat"]);
  });

  it("ignores events with no resource or an unknown one", () => {
    const merged = withEvents([res("a")], [ev("1"), ev("2", { resourceId: "zzz" })]);
    expect(ids(merged[0])).toEqual([]);
  });

  it("accepts resources that have no events array", () => {
    const bare = { id: "a", name: "A" };
    expect(withEvents([bare])[0].events).toEqual([]);
    expect(ids(withEvents([bare], [ev("1", { resourceId: "a" })])[0])).toEqual(["1"]);
  });

  it("leaves resources without flat events as they were, and does not mutate the input", () => {
    const a = res("a");
    const b = res("b");
    const merged = withEvents([a, b], [ev("1", { resourceId: "a" })]);
    expect(merged[1]).toBe(b);
    expect(a.events).toEqual([]);
  });
});
