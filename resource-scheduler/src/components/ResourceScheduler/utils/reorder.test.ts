import { describe, expect, it } from "vitest";
import type { Resource } from "../types";
import { withGroups } from "./groups";
import { getDropTarget, inDrag, moveResource, positionOf, reorderGroup, stepTarget } from "./reorder";

const res = (id: string, group?: string | string[]): Resource => ({ id, name: id.toUpperCase(), events: [], group });
const ids = (list: Resource[]) => list.map((r) => r.id);
const groupOf = (list: Resource[], id: string) => list.find((r) => r.id === id)?.group;

describe("reorderGroup", () => {
  it("moves a group, with its members, before another group", () => {
    const list = [res("a", "X"), res("b", "Y"), res("c", "Z")];
    expect(ids(reorderGroup(list, "Z", "X"))).toEqual(["c", "a", "b"]);
    expect(ids(reorderGroup(list, "X", "Z"))).toEqual(["b", "a", "c"]);
  });

  it("moves a group to the end with a null target", () => {
    const list = [res("a", "X"), res("b", "Y"), res("c", "Z")];
    expect(ids(reorderGroup(list, "X", null))).toEqual(["b", "c", "a"]);
  });

  it("takes every member along, even ones spread out in the list", () => {
    const list = [res("a", "X"), res("b", "Y"), res("c", "X"), res("d", "Y")];
    // Laid out as X [a, c], Y [b, d].
    expect(ids(reorderGroup(list, "Y", "X"))).toEqual(["b", "d", "a", "c"]);
  });

  it("keeps ungrouped resources where they were among the groups", () => {
    const list = [res("p"), res("a", "X"), res("b", "Y")];
    expect(ids(reorderGroup(list, "Y", "X"))).toEqual(["p", "b", "a"]);
    const middle = [res("a", "X"), res("p"), res("b", "Y")];
    expect(ids(reorderGroup(middle, "X", null))).toEqual(["p", "b", "a"]);
  });

  it("moves a nested group among its siblings, not out of its parent", () => {
    const list = [res("a", ["M", "F1"]), res("b", ["M", "F2"]), res("c", "N")];
    expect(ids(reorderGroup(list, "M / F2", "M / F1"))).toEqual(["b", "a", "c"]);
    expect(ids(reorderGroup(list, "M / F1", null))).toEqual(["b", "a", "c"]);
    expect(reorderGroup(list, "M / F1", "N")).toBe(list);
    expect(reorderGroup(list, "N", "M / F1")).toBe(list);
  });

  it("moves a parent with everything inside it", () => {
    const list = [res("a", ["M", "F1"]), res("b", ["M"]), res("c", "N")];
    expect(ids(reorderGroup(list, "M", null))).toEqual(["c", "a", "b"]);
  });

  it("writes the list in the order it is shown", () => {
    const list = [res("a", "X"), res("b", "Y"), res("c", "X")];
    expect(ids(reorderGroup(list, "Y", "X"))).toEqual(["b", "a", "c"]);
    expect(ids(reorderGroup(list, "X", null))).toEqual(["b", "a", "c"]);
  });

  it("returns the same array when nothing would change", () => {
    const list = [res("a", "X"), res("b", "Y"), res("c", "Z")];
    expect(reorderGroup(list, "X", "X")).toBe(list);
    expect(reorderGroup(list, "X", "Y")).toBe(list); // already right before Y
    expect(reorderGroup(list, "Z", null)).toBe(list); // already last
    expect(reorderGroup(list, "Nope", "X")).toBe(list);
    expect(reorderGroup(list, "X", "Nope")).toBe(list);
  });

  it("reuses the resource objects and leaves the input alone", () => {
    const list = [res("a", "X"), res("b", "Y")];
    const copy = [...list];
    const next = reorderGroup(list, "Y", "X");
    expect(list).toEqual(copy);
    expect(next[0]).toBe(list[1]);
    expect(next[1]).toBe(list[0]);
  });
});

describe("moveResource", () => {
  const people = [res("a", "X"), res("b", "X"), res("c", "X"), res("d", "Y"), res("e", "Y"), res("p")];

  it("moves a resource before another in its group", () => {
    expect(ids(moveResource(people, "c", "a"))).toEqual(["c", "a", "b", "d", "e", "p"]);
  });

  it("moves a resource to the end of its group with a null target", () => {
    expect(ids(moveResource(people, "a", null))).toEqual(["b", "c", "a", "d", "e", "p"]);
  });

  it("moves a resource into another group and gives it that group", () => {
    const next = moveResource(people, "a", "e", "Y");
    expect(ids(next)).toEqual(["b", "c", "d", "a", "e", "p"]);
    expect(groupOf(next, "a")).toBe("Y");
    expect(groupOf(next, "b")).toBe("X");
  });

  it("puts a resource at the end of another group", () => {
    const next = moveResource(people, "a", null, "Y");
    expect(ids(next)).toEqual(["b", "c", "d", "e", "a", "p"]);
    expect(groupOf(next, "a")).toBe("Y");
  });

  it("takes a resource out of its group with null", () => {
    const next = moveResource(people, "a", "p", null);
    expect(ids(next)).toEqual(["b", "c", "d", "e", "a", "p"]);
    expect(groupOf(next, "a")).toBeUndefined();
    expect(ids(withGroups(next))).toEqual(["rs-group:X", "b", "c", "rs-group:Y", "d", "e", "a", "p"]);
  });

  it("puts an ungrouped resource into a group", () => {
    const next = moveResource(people, "p", "d", "Y");
    expect(ids(next)).toEqual(["a", "b", "c", "p", "d", "e"]);
    expect(groupOf(next, "p")).toBe("Y");
  });

  it("reads a nested group's key as its path", () => {
    const list = [res("a", ["M", "F1"]), res("b", ["M", "F2"]), res("c", "N")];
    const next = moveResource(list, "c", "a", "M / F1");
    expect(ids(next)).toEqual(["c", "a", "b"]);
    expect(groupOf(next, "c")).toEqual(["M", "F1"]);
    expect(groupOf(moveResource(list, "a", null, "M"), "a")).toBe("M");
  });

  it("changes only the group of a resource that stays where it is", () => {
    const list = [res("a", "X"), res("b", "X"), res("c", "Y")];
    const next = moveResource(list, "b", "b", "Y");
    expect(ids(next)).toEqual(["a", "b", "c"]);
    expect(groupOf(next, "b")).toBe("Y");
  });

  it("lands where it is shown, also when the list is not in the order it is shown", () => {
    // Shown as X [a, c], b, d; a goes between b and d.
    const list = [res("a", "X"), res("b"), res("c", "X"), res("d")];
    const next = moveResource(list, "a", "d", null);
    expect(ids(withGroups(next))).toEqual(["rs-group:X", "c", "b", "a", "d"]);
  });

  it("returns the same array when nothing would change", () => {
    expect(moveResource(people, "a", "a")).toBe(people);
    expect(moveResource(people, "a", "b")).toBe(people); // already right before b
    expect(moveResource(people, "c", null)).toBe(people); // already last in X
    expect(moveResource(people, "a", "b", "X")).toBe(people);
    expect(moveResource(people, "nope", "a")).toBe(people);
    expect(moveResource(people, "a", "nope")).toBe(people);
    expect(moveResource(people, "a", "d", "Nope")).toBe(people);
  });

  it("reuses the other resources and leaves the input alone", () => {
    const copy = [...people];
    const next = moveResource(people, "a", "e", "Y");
    expect(people).toEqual(copy);
    expect(people[0].group).toBe("X");
    expect(next.find((r) => r.id === "b")).toBe(people[1]);
  });
});

describe("getDropTarget", () => {
  // Rows: header A 0-36, ann 36-96, cy 96-156, header B 156-192, bob 192-252, di 252-312.
  const people = [res("ann", "Ward A"), res("cy", "Ward A"), res("bob", "Ward B"), res("di")];
  const rows = withGroups(people);
  const heights = rows.map((r) => (r.id.startsWith("rs-group:") ? 36 : 60));

  describe("dragging a group", () => {
    const drag = (key: string) => ({ kind: "group" as const, key });

    it("goes before the group under the pointer's upper half", () => {
      expect(getDropTarget(rows, heights, drag("Ward B"), 10)).toEqual({ before: "Ward A", line: 0 });
      expect(getDropTarget(rows, heights, drag("Ward A"), 170)).toEqual({ before: "Ward B", line: 156 });
    });

    it("goes after the group under the pointer's lower half, before the next one or at the end", () => {
      expect(getDropTarget(rows, heights, drag("Ward A"), 230)).toEqual({ before: null, line: 312 });
    });

    it("is nothing over its own rows, or just after the group above it", () => {
      expect(getDropTarget(rows, heights, drag("Ward B"), 200)).toBeNull();
      expect(getDropTarget(rows, heights, drag("Ward B"), 100)).toBeNull();
    });

    it("clamps a pointer above or below the rows", () => {
      expect(getDropTarget(rows, heights, drag("Ward B"), -50)).toEqual({ before: "Ward A", line: 0 });
      expect(getDropTarget(rows, heights, drag("Ward A"), 900)).toEqual({ before: null, line: 312 });
    });

    it("only offers the groups beside it, inside its parent", () => {
      const nested = withGroups([res("a", ["M", "F1"]), res("b", ["M", "F2"]), res("c", "N")]);
      const h = nested.map((r) => (r.id.startsWith("rs-group:") ? 36 : 60));
      // M 0-36, F1 36-72, a 72-132, F2 132-168, b 168-228, N 228-264, c 264-324.
      expect(getDropTarget(nested, h, { kind: "group", key: "M / F2" }, 80)).toEqual({ before: "M / F1", line: 36 });
      expect(getDropTarget(nested, h, { kind: "group", key: "M / F1" }, 200)).toEqual({ before: null, line: 228 });
      expect(getDropTarget(nested, h, { kind: "group", key: "M / F1" }, 300)).toEqual({ before: null, line: 228 });
    });

    it("is nothing for a group that is not there", () => {
      expect(getDropTarget(rows, heights, drag("Nope"), 10)).toBeNull();
    });
  });

  describe("dragging a resource", () => {
    const drag = (id: string) => ({ kind: "resource" as const, id });

    it("goes before the row under the pointer's upper half", () => {
      expect(getDropTarget(rows, heights, drag("di"), 40)).toEqual({ before: "ann", group: "Ward A", line: 36 });
      expect(getDropTarget(rows, heights, drag("ann"), 200)).toEqual({ before: "bob", group: "Ward B", line: 192 });
    });

    it("goes after the row under the pointer's lower half: before the next member, or at the end", () => {
      expect(getDropTarget(rows, heights, drag("di"), 90)).toEqual({ before: "cy", group: "Ward A", line: 96 });
      expect(getDropTarget(rows, heights, drag("di"), 150)).toEqual({ before: null, group: "Ward A", line: 156 });
      expect(getDropTarget(rows, heights, drag("ann"), 300)).toEqual({ before: null, group: null, line: 312 });
    });

    it("goes to the end of a group when dropped on its header", () => {
      expect(getDropTarget(rows, heights, drag("di"), 10)).toEqual({
        before: null,
        group: "Ward A",
        header: "rs-group:Ward A",
      });
    });

    it("is nothing over its own row", () => {
      expect(getDropTarget(rows, heights, drag("cy"), 120)).toBeNull();
    });

    it("works without any groups", () => {
      const flat = [res("a"), res("b"), res("c")];
      const h = [60, 60, 60];
      expect(getDropTarget(flat, h, drag("c"), 10)).toEqual({ before: "a", group: null, line: 0 });
      expect(getDropTarget(flat, h, drag("a"), 170)).toEqual({ before: null, group: null, line: 180 });
    });
  });
});

describe("stepTarget", () => {
  const people = [res("ann", "Ward A"), res("cy", "Ward A"), res("bob", "Ward B"), res("di")];
  const rows = withGroups(people);
  const group = (key: string) => ({ kind: "group" as const, key });
  const resource = (id: string) => ({ kind: "resource" as const, id });

  it("swaps a group with the one above or below", () => {
    const three = withGroups([res("a", "A"), res("b", "B"), res("c", "C")]);
    expect(stepTarget(three, group("B"), -1)).toEqual({ before: "A" });
    expect(stepTarget(three, group("A"), 1)).toEqual({ before: "C" });
    expect(stepTarget(three, group("B"), 1)).toEqual({ before: null });
  });

  it("stops at the first and last group", () => {
    expect(stepTarget(rows, group("Ward A"), -1)).toBeNull();
    expect(stepTarget(rows, group("Ward B"), 1)).toBeNull();
  });

  it("swaps a resource with its neighbour in the group", () => {
    expect(stepTarget(rows, resource("cy"), -1)).toEqual({ before: "ann", group: "Ward A" });
    expect(stepTarget(rows, resource("ann"), 1)).toEqual({ before: null, group: "Ward A" });
    const three = withGroups([res("a", "A"), res("b", "A"), res("c", "A")]);
    expect(stepTarget(three, resource("a"), 1)).toEqual({ before: "c", group: "A" });
  });

  it("carries a resource over a group boundary", () => {
    expect(stepTarget(rows, resource("bob"), -1)).toEqual({ before: "bob", group: "Ward A" }); // joins the end of A
    expect(stepTarget(rows, resource("cy"), 1)).toEqual({ before: "bob", group: "Ward B" }); // joins the top of B
    expect(stepTarget(rows, resource("bob"), 1)).toEqual({ before: "di", group: null }); // leaves the group
    expect(stepTarget(rows, resource("di"), -1)).toEqual({ before: "di", group: "Ward B" });
  });

  it("stops at the first and last resource", () => {
    expect(stepTarget(rows, resource("ann"), -1)).toBeNull();
    expect(stepTarget(rows, resource("di"), 1)).toBeNull();
  });

  it("is nothing for something that is not there", () => {
    expect(stepTarget(rows, resource("nope"), 1)).toBeNull();
    expect(stepTarget(rows, group("nope"), 1)).toBeNull();
  });
});

describe("positionOf", () => {
  const rows = withGroups([res("ann", "Ward A"), res("cy", "Ward A"), res("bob", "Ward B"), res("di")]);

  it("counts a group among the groups beside it", () => {
    expect(positionOf(rows, { kind: "group", key: "Ward B" })).toEqual({ name: "Ward B", position: 2, total: 2, group: null });
    const nested = withGroups([res("a", ["M", "F1"]), res("b", ["M", "F2"]), res("c", "N")]);
    expect(positionOf(nested, { kind: "group", key: "M / F2" })).toEqual({ name: "F2", position: 2, total: 2, group: null });
  });

  it("counts a resource among the resources of its group", () => {
    expect(positionOf(rows, { kind: "resource", id: "cy" })).toEqual({ name: "CY", position: 2, total: 2, group: "Ward A" });
    expect(positionOf(rows, { kind: "resource", id: "di" })).toEqual({ name: "DI", position: 1, total: 1, group: null });
  });

  it("is nothing for something that is not shown", () => {
    expect(positionOf(rows, { kind: "resource", id: "nope" })).toBeUndefined();
    expect(positionOf(rows, { kind: "group", key: "nope" })).toBeUndefined();
  });
});

describe("inDrag", () => {
  const rows = withGroups([res("a", ["M", "F1"]), res("b", ["M", "F2"]), res("c", "N")]);

  it("covers a group, its headers and its resources", () => {
    const drag = { kind: "group" as const, key: "M" };
    expect(rows.filter((r) => inDrag(r, drag)).map((r) => r.id)).toEqual(["rs-group:M", "rs-group:M / F1", "a", "rs-group:M / F2", "b"]);
  });

  it("covers just the one resource", () => {
    expect(rows.filter((r) => inDrag(r, { kind: "resource", id: "c" })).map((r) => r.id)).toEqual(["c"]);
  });
});
