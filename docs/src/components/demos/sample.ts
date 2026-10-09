import type { Resource } from "@scheduler/types";

/** A time on the day `dayOffset` days from today. Demos stay current without edits. */
export const at = (dayOffset: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute);
  return d;
};

export const BLUE = "#3b82f6";
export const GREEN = "#10b981";
export const AMBER = "#f59e0b";
export const VIOLET = "#8b5cf6";
export const ROSE = "#f43f5e";
export const TEAL = "#14b8a6";

/** A time on a day of the current week (0 = Sunday, 1 = Monday, ...). */
export const week = (dayOfWeek: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + dayOfWeek);
  d.setHours(hour, minute);
  return d;
};

/** A week of work for a small team. Used by the hero and the quick start. */
export const teamWeek = (): Resource[] => [
  {
    id: "ann",
    name: "Ann Lee",
    role: "Frontend",
    events: [
      { id: "a1", title: "Standup", startDate: week(1, 9), endDate: week(1, 10), color: BLUE },
      { id: "a2", title: "Design review", startDate: week(2, 11), endDate: week(2, 13), color: VIOLET },
      { id: "a3", title: "Release prep", startDate: week(3, 9), endDate: week(5, 17), color: GREEN },
    ],
  },
  {
    id: "bob",
    name: "Bob Ruiz",
    role: "Backend",
    events: [
      { id: "b1", title: "API work", startDate: week(1, 9), endDate: week(3, 17), color: TEAL },
      { id: "b2", title: "On call", startDate: week(4, 9), endDate: week(5, 17), color: ROSE },
    ],
  },
  {
    id: "chen",
    name: "Chen Wu",
    role: "Design",
    events: [
      { id: "c1", title: "User tests", startDate: week(2, 10), endDate: week(2, 15), color: AMBER },
      { id: "c2", title: "Workshop", startDate: week(4, 13), endDate: week(4, 16), color: VIOLET },
    ],
  },
  {
    id: "dana",
    name: "Dana Fox",
    role: "Product",
    events: [
      { id: "d1", title: "Roadmap", startDate: week(1, 13), endDate: week(1, 15), color: BLUE },
      { id: "d2", title: "Launch sync", startDate: week(5, 10), endDate: week(5, 11), color: GREEN },
    ],
  },
];

/** One day with some structure, for slot and conflict demos. */
export const teamDay = (): Resource[] => [
  {
    id: "ann",
    name: "Ann Lee",
    events: [
      { id: "a1", title: "Standup", startDate: at(0, 9), endDate: at(0, 9, 30), color: BLUE },
      { id: "a2", title: "Review", startDate: at(0, 11), endDate: at(0, 12, 30), color: VIOLET },
    ],
  },
  {
    id: "bob",
    name: "Bob Ruiz",
    events: [{ id: "b1", title: "Deep work", startDate: at(0, 10), endDate: at(0, 12), color: TEAL }],
  },
  {
    id: "chen",
    name: "Chen Wu",
    events: [{ id: "c1", title: "User tests", startDate: at(0, 13), endDate: at(0, 15), color: AMBER }],
  },
];

export const rooms = (): Resource[] => [
  {
    id: "atlas",
    name: "Atlas (8 seats)",
    events: [
      { id: "r1", title: "Sprint planning", startDate: at(0, 9), endDate: at(0, 10, 30), color: BLUE },
      { id: "r2", title: "1:1", startDate: at(0, 14), endDate: at(0, 14, 30), color: GREEN },
    ],
  },
  {
    id: "borealis",
    name: "Borealis (4 seats)",
    events: [{ id: "r3", title: "Interview", startDate: at(0, 11), endDate: at(0, 12), color: AMBER }],
  },
  { id: "cirrus", name: "Cirrus (12 seats)", events: [] },
];
