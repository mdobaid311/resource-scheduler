// src/components/ResourceScheduler/utils/groups.ts
import type { Resource } from "../types";

/**
 * A group header, shaped like a resource without events so it flows through
 * the same row layout, heights and virtualization as the rows around it.
 * `key` identifies the group in `collapsedGroups`: its name, or for a nested
 * group the names from the outermost down, joined with " / ". `count` is the
 * number of resources below it, nested ones included.
 */
export interface GroupRow extends Resource {
  groupHeader: { name: string; key: string; depth: number; count: number; collapsed: boolean };
}

/** Height of a group header row, in px. */
export const GROUP_ROW_HEIGHT = 36;

export const isGroupRow = (row: Resource): row is GroupRow => "groupHeader" in row;

const SEPARATOR = " / ";

// The names a resource sits under, outermost first; empty names do not count.
const pathOf = (r: Resource): string[] => ([] as string[]).concat(r.group ?? []).filter(Boolean);

/**
 * Lays resources out under group headers. A group sits where its first member
 * is, with all its members after the header in their original order, and a
 * `group` given as a path (`["Main building", "Floor 1"]`) nests the same way
 * inside its parent. Resources without a `group` stay where they are. Members
 * of a `collapsed` group, nested groups included, are left out and only the
 * header remains. Returns `resources` itself when none has a group.
 */
export const withGroups = (resources: Resource[], collapsed: readonly string[] = []): Resource[] => {
  const items = resources.map((resource) => ({ resource, path: pathOf(resource) }));
  if (!items.some((item) => item.path.length)) return resources;

  const lay = (list: typeof items, depth: number, parent: string): Resource[] => {
    const rows: Resource[] = [];
    const placed = new Set<string>();
    for (const item of list) {
      const name = item.path[depth];
      if (name === undefined) {
        rows.push(item.resource); // a member of this level, not of a deeper group
        continue;
      }
      if (placed.has(name)) continue;
      placed.add(name);

      const members = list.filter((other) => other.path[depth] === name);
      const key = parent ? `${parent}${SEPARATOR}${name}` : name;
      const isCollapsed = collapsed.includes(key);
      const header: GroupRow = {
        id: `rs-group:${key}`,
        name,
        events: [],
        groupHeader: { name, key, depth, count: members.length, collapsed: isCollapsed },
      };
      rows.push(header);
      if (!isCollapsed) rows.push(...lay(members, depth + 1, key));
    }
    return rows;
  };

  return lay(items, 0, "");
};
