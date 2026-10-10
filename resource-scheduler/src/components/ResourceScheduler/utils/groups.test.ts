import { describe, expect, it } from "vitest";
import type { Resource } from "../types";
import { isGroupRow, withGroups } from "./groups";

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
