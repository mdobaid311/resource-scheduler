import { describe, expect, it } from "vitest";
import type { Resource } from "../types";
import { isGroupRow, withGroups } from "./groups";

const res = (id: string, group?: string): Resource => ({ id, name: id.toUpperCase(), events: [], group });
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
    expect(isGroupRow(header) && header.groupHeader).toEqual({ name: "X", count: 2, collapsed: true });
  });

  it("only recognises its own headers", () => {
    const [header, member] = withGroups([res("a", "X")]);
    expect(isGroupRow(header)).toBe(true);
    expect(isGroupRow(member)).toBe(false);
  });
});
