import { describe, expect, it } from "vitest";
import { type Resource, type SchedulerEvent, ViewType } from "../types";
import { getVisibleResources, withEvents } from "./events";

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

describe("getVisibleResources", () => {
  const day = (date: number, hour: number, length = 1) => ({
    startDate: new Date(2026, 9, date, hour),
    endDate: new Date(2026, 9, date, hour + length),
  });
  const standup = ev("standup", {
    ...day(5, 9),
    recurrence: { freq: "weekly" }, // Mondays
  });
  const resources: Resource[] = [
    { ...res("a", [standup, ev("in", day(7, 10)), ev("out", day(20, 10))]), capacity: 3 },
    res("b"),
  ];
  const wednesday = new Date(2026, 9, 7);

  it("draws one event per occurrence of a recurring event inside the view", () => {
    const [a] = getVisibleResources(resources, wednesday, ViewType.Week);
    expect(ids(a)).toEqual(["standup::2026-10-05", "in"]);
    expect(a.events[0]).toMatchObject({ seriesId: "standup" });
    const [month] = getVisibleResources(resources, wednesday, ViewType.Month);
    expect(ids(month)).toEqual([
      "standup::2026-10-05",
      "standup::2026-10-12",
      "standup::2026-10-19",
      "standup::2026-10-26",
      "in",
      "out",
    ]);
  });

  it("leaves out events that are not in the view", () => {
    const [a] = getVisibleResources(resources, wednesday, ViewType.Week);
    expect(ids(a)).not.toContain("out");
  });

  it("shows only the visible hours in the day view", () => {
    const [all] = getVisibleResources(resources, wednesday, ViewType.Day);
    expect(ids(all)).toEqual(["in"]);
    const [late] = getVisibleResources(resources, wednesday, ViewType.Day, { dayStartHour: 12, dayEndHour: 18 });
    expect(ids(late)).toEqual([]);
  });

  it("follows hideWeekends: an event that only sits on a hidden day is left out", () => {
    const saturday = ev("sat", day(10, 10));
    const [a] = getVisibleResources([res("a", [saturday])], wednesday, ViewType.Week, { hideWeekends: true });
    expect(ids(a)).toEqual([]);
  });

  it("keeps the rest of each resource and does not change the input", () => {
    const [a, b] = getVisibleResources(resources, wednesday, ViewType.Week);
    expect(a).toMatchObject({ id: "a", name: "a", capacity: 3 });
    expect(b.events).toEqual([]);
    expect(a).not.toBe(resources[0]);
    expect(ids(resources[0])).toEqual(["standup", "in", "out"]);
  });
});
