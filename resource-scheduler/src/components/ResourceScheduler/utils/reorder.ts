// src/components/ResourceScheduler/utils/reorder.ts
import type { Resource } from "../types";
import { isGroupRow, pathOf, SEPARATOR, withGroups, type GroupRow } from "./groups";

// The scheduler never owns your data: the order of `resources` is the order on
// screen, so a reorder is a new array. Both helpers work on the whole list,
// folded groups included, and write it in the order it is shown (groups
// gathered at their first member, as `withGroups` lays them out).

const keyOf = (r: Resource) => pathOf(r).join(SEPARATOR); // "" for no group
const within = (key: string, group: string) => key === group || key.startsWith(group + SEPARATOR);
const shown = (resources: Resource[]) => withGroups(resources).filter((r) => !isGroupRow(r));

// The names of group `key`, outermost first, read off a resource inside it.
const pathTo = (list: Resource[], key: string): string[] | undefined => {
  const member = list.find((r) => within(keyOf(r), key));
  const path = member && pathOf(member);
  const depth = path ? path.findIndex((_, i) => path.slice(0, i + 1).join(SEPARATOR) === key) : -1;
  return path && depth >= 0 ? path.slice(0, depth + 1) : undefined;
};

// One past the last resource of `list` inside `group`, or `fallback` when there is none.
const endOf = (list: Resource[], group: string, fallback: number) => {
  let end = -1;
  list.forEach((r, i) => within(keyOf(r), group) && (end = i));
  return end < 0 ? fallback : end + 1;
};

/**
 * Moves the group `groupKey` (its name, or its path joined with " / "), with
 * every resource in it and the groups inside it, to just before the group
 * `beforeKey`, or to the end of the groups beside it when `beforeKey` is
 * `null`. A group only moves among its siblings, the groups with the same
 * parent. Returns a new array, in the order it is shown; `resources` itself
 * when nothing would change or a key is unknown.
 */
export const reorderGroup = (resources: Resource[], groupKey: string, beforeKey: string | null): Resource[] => {
  const list = shown(resources);
  const path = pathTo(list, groupKey);
  if (!path || beforeKey === groupKey) return resources;
  const parent = path.slice(0, -1).join(SEPARATOR);
  if (beforeKey !== null) {
    const sibling = pathTo(list, beforeKey);
    if (!sibling || sibling.length !== path.length || sibling.slice(0, -1).join(SEPARATOR) !== parent)
      return resources;
  }

  const block = new Set(list.filter((r) => within(keyOf(r), groupKey)));
  const rest = list.filter((r) => !block.has(r));
  const from = list.findIndex((r) => block.has(r));
  const at =
    beforeKey !== null
      ? rest.findIndex((r) => within(keyOf(r), beforeKey))
      : parent
        ? endOf(rest, parent, from)
        : rest.length;
  const next = [...rest.slice(0, at), ...block, ...rest.slice(at)];
  return next.every((r, i) => r === list[i]) ? resources : next;
};

/**
 * Moves the resource `resourceId` to just before `beforeId`, or to the end of
 * its group when `beforeId` is `null`. `group` is the group it lands in, by
 * key: leave it out to keep the resource's own group, pass a key to move it
 * into that group (its `group` is set to that group's path), or `null` to take
 * it out of every group. Passing the resource's own id as `beforeId` keeps it
 * in place, which changes only its group. Returns a new array, in the order it
 * is shown, with the moved resource copied when its group changed; `resources`
 * itself when nothing would change or an id or key is unknown.
 */
export const moveResource = (
  resources: Resource[],
  resourceId: string,
  beforeId: string | null,
  group?: string | null
): Resource[] => {
  const list = shown(resources);
  const from = list.findIndex((r) => r.id === resourceId);
  if (from < 0) return resources;
  const mover = list[from];
  const path = group === undefined ? pathOf(mover) : group === null ? [] : pathTo(list, group);
  if (!path) return resources;

  const rest = list.filter((r) => r !== mover);
  const to =
    beforeId === null
      ? path.length
        ? endOf(rest, path.join(SEPARATOR), from)
        : rest.length
      : beforeId === resourceId
        ? from
        : rest.findIndex((r) => r.id === beforeId);
  if (to < 0) return resources;

  const own = pathOf(mover);
  const same = path.length === own.length && path.every((name, i) => name === own[i]);
  if (same && to === from) return resources;
  const moved = same ? mover : { ...mover, group: path.length > 1 ? path : path[0] };
  return [...rest.slice(0, to), moved, ...rest.slice(to)];
};

/** What is being dragged: a group, by its key, or a resource, by its id. */
export type ReorderDrag = { kind: "group"; key: string } | { kind: "resource"; id: string };

/** Where a drag would land. */
export interface DropTarget {
  /** The key of the group, or the id of the resource, it goes before; `null` for the end. */
  before: string | null;
  /** For a resource: the key of the group it lands in, `null` for none. */
  group?: string | null;
  /** The row id of the group header it is dropped on, which takes it in at the end. */
  header?: string;
  /** Where to draw the drop line, in px from the top of the first row. */
  line?: number;
}

const headerOf = (row: Resource | undefined) => (row && isGroupRow(row) ? row.groupHeader : undefined);
type Header = GroupRow["groupHeader"];

// The key of the group a header sits in: its own key without its last name.
const parentOf = ({ key, name, depth }: Header) => (depth ? key.slice(0, key.length - name.length - SEPARATOR.length) : "");

// The end of header `i`'s block: the first row after it that is not inside the group.
const blockEnd = (rows: Resource[], i: number) => {
  const { key, depth } = headerOf(rows[i])!;
  let end = i + 1;
  while (end < rows.length) {
    const h = headerOf(rows[end]);
    if (h ? h.depth <= depth : !within(keyOf(rows[end]), key)) break;
    end++;
  }
  return end;
};

// The headers beside header `g`: the same depth, in the same parent, itself included.
const siblingsOf = (rows: Resource[], g: number) => {
  const head = headerOf(rows[g])!;
  return rows.flatMap((row, i) => {
    const h = headerOf(row);
    return h && h.depth === head.depth && parentOf(h) === parentOf(head) ? [i] : [];
  });
};

/**
 * Where dropping at `y` (px from the top of the first row) would put what is
 * dragged, given the rows as shown (headers included) and their heights, or
 * `null` over nothing useful. A group goes before the sibling group whose
 * upper half the pointer is in, or after the one whose lower half it is in; a
 * resource goes before or after the row under the pointer, or to the end of a
 * group when dropped on its header. Rows are laid out from `heights`, so rows
 * that are not drawn count too.
 */
export const getDropTarget = (rows: Resource[], heights: number[], drag: ReorderDrag, y: number): DropTarget | null => {
  if (!rows.length) return null;
  const tops = [0];
  heights.forEach((h) => tops.push(tops[tops.length - 1] + h));
  let r = 0;
  while (r < rows.length - 1 && tops[r + 1] <= y) r++;

  if (drag.kind === "resource") {
    const row = rows[r];
    if (!rows.some((x) => x.id === drag.id && !isGroupRow(x))) return null;
    const head = headerOf(row);
    if (head) return { before: null, group: head.key, header: row.id };
    if (row.id === drag.id) return null;
    const group = keyOf(row) || null;
    if (y < tops[r] + heights[r] / 2) return { before: row.id, group, line: tops[r] };
    const next = rows[r + 1];
    return {
      before: next && !isGroupRow(next) && keyOf(next) === keyOf(row) ? next.id : null,
      group,
      line: tops[r + 1],
    };
  }

  const g = rows.findIndex((row) => headerOf(row)?.key === drag.key);
  if (g < 0) return null;
  const head = headerOf(rows[g])!;
  const parent = parentOf(head);
  const end = parent ? blockEnd(rows, rows.findIndex((row) => headerOf(row)?.key === parent)) : rows.length;
  const sibs = siblingsOf(rows, g);
  if (r >= g && r < blockEnd(rows, g)) return null;
  // Over a sibling's rows, the nearer edge of its block; elsewhere, the next sibling below.
  const own = sibs.find((s) => s <= r && r < blockEnd(rows, s));
  const after = (row: number) => sibs.find((s) => s >= row) ?? end;
  const at =
    own === undefined
      ? after(r + 1)
      : y < (tops[own] + tops[blockEnd(rows, own)]) / 2
        ? own
        : after(blockEnd(rows, own));
  if (at === g) return null;
  return { before: at === end ? null : headerOf(rows[at])!.key, line: tops[at] };
};

/** Whether a row is part of what is dragged: a group takes its headers and resources with it. */
export const inDrag = (row: Resource, drag: ReorderDrag) => {
  const head = headerOf(row);
  return drag.kind === "group" ? within(head ? head.key : keyOf(row), drag.key) : !head && row.id === drag.id;
};

/**
 * Where something sits among its own kind, as the screen shows it: a group
 * among the groups beside it, a resource among the resources of its group
 * (`group` is that group's key, `null` for none). For the announcement after a
 * move; `undefined` when it is not in `rows`.
 */
export const positionOf = (rows: Resource[], drag: ReorderDrag) => {
  if (drag.kind === "group") {
    const g = rows.findIndex((row) => headerOf(row)?.key === drag.key);
    if (g < 0) return undefined;
    const sibs = siblingsOf(rows, g);
    return { name: headerOf(rows[g])!.name, position: sibs.indexOf(g) + 1, total: sibs.length, group: null };
  }
  const row = rows.find((r) => !isGroupRow(r) && r.id === drag.id);
  if (!row) return undefined;
  const mates = rows.filter((r) => !isGroupRow(r) && keyOf(r) === keyOf(row));
  return { name: row.name, position: mates.indexOf(row) + 1, total: mates.length, group: keyOf(row) || null };
};

/**
 * The drop for moving what is dragged one place up (`-1`) or down (`1`), for
 * the keyboard, or `null` at the first or last place. A group swaps with the
 * sibling group beside it. A resource swaps with the resource beside it in its
 * group; at the edge of its group it joins the next group at its near end, or
 * leaves its group if the neighbour has none. Folded groups are skipped.
 */
export const stepTarget = (rows: Resource[], drag: ReorderDrag, direction: -1 | 1): DropTarget | null => {
  if (drag.kind === "group") {
    const g = rows.findIndex((row) => headerOf(row)?.key === drag.key);
    if (g < 0) return null;
    const keys = siblingsOf(rows, g).map((i) => headerOf(rows[i])!.key);
    const i = keys.indexOf(drag.key);
    if (direction < 0) return i > 0 ? { before: keys[i - 1] } : null;
    return i < keys.length - 1 ? { before: keys[i + 2] ?? null } : null;
  }

  const list = rows.filter((row) => !isGroupRow(row));
  const i = list.findIndex((row) => row.id === drag.id);
  const neighbour = list[i + direction];
  if (i < 0 || !neighbour) return null;
  const own = keyOf(list[i]);
  const group = keyOf(neighbour) || null;
  if (keyOf(neighbour) !== own)
    return { before: direction < 0 ? drag.id : neighbour.id, group }; // joins its group at the near end
  if (direction < 0) return { before: neighbour.id, group };
  const after = list[i + 2];
  return { before: after && (!own || keyOf(after) === own) ? after.id : null, group };
};
