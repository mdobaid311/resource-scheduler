// src/components/ResourceScheduler/utils/groups.ts
import type { Resource } from "../types";

/**
 * A group header, shaped like a resource without events so it flows through
 * the same row layout, heights and virtualization as the rows around it.
 */
export interface GroupRow extends Resource {
  groupHeader: { name: string; count: number; collapsed: boolean };
}

/** Height of a group header row, in px. */
export const GROUP_ROW_HEIGHT = 36;

export const isGroupRow = (row: Resource): row is GroupRow => "groupHeader" in row;

/**
 * Lays resources out under group headers. A group sits where its first member
 * is, with all its members after the header in their original order;
 * resources without a `group` stay where they are. Members of a `collapsed`
 * group are left out and only the header remains. Returns `resources` itself
 * when none has a group.
 */
export const withGroups = (resources: Resource[], collapsed: readonly string[] = []): Resource[] => {
  if (!resources.some((r) => r.group)) return resources;

  const members = new Map<string, Resource[]>();
  for (const r of resources) {
    if (!r.group) continue;
    const list = members.get(r.group);
    if (list) list.push(r);
    else members.set(r.group, [r]);
  }

  const rows: Resource[] = [];
  const placed = new Set<string>();
  for (const r of resources) {
    if (!r.group) {
      rows.push(r);
    } else if (!placed.has(r.group)) {
      placed.add(r.group);
      const list = members.get(r.group)!;
      const isCollapsed = collapsed.includes(r.group);
      const header: GroupRow = {
        id: `rs-group:${r.group}`,
        name: r.group,
        events: [],
        groupHeader: { name: r.group, count: list.length, collapsed: isCollapsed },
      };
      rows.push(header);
      if (!isCollapsed) rows.push(...list);
    }
  }
  return rows;
};
