import { describe, expect, it } from "vitest";
import type { Resource } from "../types";
import { groupUtilization, isGroupRow, withGroups } from "./groups";

const res = (id: string, group?: string | string[]): Resource => ({ id, name: id.toUpperCase(), events: [], group });
const ids = (rows: Resource[]) => rows.map((r) => r.id);

describe("withGroups", () => {
  it("returns the very same array when no resource has a group", () => {
    const list = [res("a"), res("b")];
    expect(withGroups(list)).toBe(list);
    expect(withGroups(list, ["x"])).toBe(list);
  });

  it("puts a header before each group and gathers its members there", () => {
    const rows = withGroups([res("a", "X"), res("b"), res("c", "X"), res("d", "Y")]);
    expect(ids(rows)).toEqual(["rs-group:X", "a", "c", "b", "rs-group:Y", "d"]);
  });

  it("keeps ungrouped resources where they are", () => {
    const rows = withGroups([res("a"), res("b", "X"), res("c")]);
    expect(ids(rows)).toEqual(["a", "rs-group:X", "b", "c"]);
  });

  it("treats an empty group name as no group", () => {
    const list = [res("a", ""), res("b")];
    expect(withGroups(list)).toBe(list);
  });

  it("describes the group on its header: name, size and whether it is collapsed", () => {
    const [header] = withGroups([res("a", "North"), res("b", "North")]);
    expect(isGroupRow(header)).toBe(true);
    expect(isGroupRow(header) && header.groupHeader).toEqual({
      name: "North",
      key: "North",
      depth: 0,
      count: 2,
      collapsed: false,
    });
    expect(header.name).toBe("North");
    expect(header.events).toEqual([]);
  });

  it("drops the members of a collapsed group but keeps its header and count", () => {
    const rows = withGroups([res("a", "X"), res("b", "X"), res("c", "Y"), res("d")], ["X"]);
    expect(ids(rows)).toEqual(["rs-group:X", "rs-group:Y", "c", "d"]);
    const header = rows[0];
    expect(isGroupRow(header) && header.groupHeader).toMatchObject({ name: "X", count: 2, collapsed: true });
  });

  it("only recognises its own headers", () => {
    const [header, member] = withGroups([res("a", "X")]);
    expect(isGroupRow(header)).toBe(true);
    expect(isGroupRow(member)).toBe(false);
  });
});

describe("withGroups with nested groups", () => {
  const info = (row: Resource) => (isGroupRow(row) ? row.groupHeader : undefined);

  it("puts a header at each level, children inside their parent", () => {
    const rows = withGroups([res("a", ["H", "W1"]), res("b", ["H", "W2"]), res("c", ["H"])]);
    expect(ids(rows)).toEqual(["rs-group:H", "rs-group:H / W1", "a", "rs-group:H / W2", "b", "c"]);
    expect(info(rows[0])).toEqual({ name: "H", key: "H", depth: 0, count: 3, collapsed: false });
    expect(info(rows[1])).toEqual({ name: "W1", key: "H / W1", depth: 1, count: 1, collapsed: false });
  });

  it("treats a one-name path like the same plain group", () => {
    expect(ids(withGroups([res("a", ["X"]), res("b", "X")]))).toEqual(["rs-group:X", "a", "b"]);
  });

  it("keeps the order of first appearance inside a group", () => {
    const rows = withGroups([res("a", ["H", "W2"]), res("b", ["H"]), res("c", ["H", "W1"]), res("d", ["H", "W2"])]);
    expect(ids(rows)).toEqual(["rs-group:H", "rs-group:H / W2", "a", "d", "b", "rs-group:H / W1", "c"]);
  });

  it("hides everything under a collapsed parent and counts its descendants", () => {
    const rows = withGroups([res("a", ["H", "W1"]), res("b", ["H"])], ["H"]);
    expect(ids(rows)).toEqual(["rs-group:H"]);
    expect(info(rows[0])).toMatchObject({ count: 2, collapsed: true });
  });

  it("collapses a child on its own", () => {
    const rows = withGroups([res("a", ["H", "W1"]), res("b", ["H", "W2"])], ["H / W1"]);
    expect(ids(rows)).toEqual(["rs-group:H", "rs-group:H / W1", "rs-group:H / W2", "b"]);
  });

  it("keeps same-named children of different parents apart", () => {
    const rows = withGroups([res("a", ["A", "X"]), res("b", ["B", "X"])], ["A / X"]);
    expect(ids(rows)).toEqual(["rs-group:A", "rs-group:A / X", "rs-group:B", "rs-group:B / X", "b"]);
  });

  it("ignores an empty path and empty names in a path", () => {
    const list = [res("a", []), res("b")];
    expect(withGroups(list)).toBe(list);
    expect(ids(withGroups([res("c", ["", "W"])]))).toEqual(["rs-group:W", "c"]);
  });
});

describe("groupUtilization", () => {
  const day = { start: new Date(2026, 9, 7), end: new Date(2026, 9, 8) }; // a Wednesday
  const at = (hour: number) => new Date(2026, 9, 7, hour);
  const busy = (id: string, group: string | string[] | undefined, hours: number): Resource => ({
    ...res(id, group),
    events: hours ? [{ id: `${id}-e`, title: "E", startDate: at(9), endDate: at(9 + hours) }] : [],
  });
  const options = { businessHours: {} }; // Monday to Friday, 9 to 17: 480 minutes a resource

  it("adds up the booked and available time of everything in a group", () => {
    const totals = groupUtilization([busy("a", "X", 4), busy("b", "X", 2), busy("c", undefined, 8)], day, options);
    expect(totals.get("rs-group:X")).toEqual({ bookedMinutes: 360, availableMinutes: 960, ratio: 360 / 960 });
    expect(totals.size).toBe(1);
  });

  it("counts a nested group's resources in every group above it", () => {
    const totals = groupUtilization(
      [busy("a", ["H", "W1"], 8), busy("b", ["H", "W2"], 0), busy("c", ["H"], 4)],
      day,
      options
    );
    expect(totals.get("rs-group:H")).toMatchObject({ bookedMinutes: 720, availableMinutes: 1440 });
    expect(totals.get("rs-group:H / W1")).toMatchObject({ bookedMinutes: 480, availableMinutes: 480, ratio: 1 });
    expect(totals.get("rs-group:H / W2")).toMatchObject({ bookedMinutes: 0, availableMinutes: 480, ratio: 0 });
  });

  it("has no ratio when nothing in the group is available", () => {
    const sunday = { start: new Date(2026, 9, 11), end: new Date(2026, 9, 12) };
    expect(groupUtilization([busy("a", "X", 0)], sunday, options).get("rs-group:X")?.ratio).toBeNull();
  });

  it("is empty when no resource has a group", () => {
    expect(groupUtilization([busy("a", undefined, 4)], day, options).size).toBe(0);
  });
});
