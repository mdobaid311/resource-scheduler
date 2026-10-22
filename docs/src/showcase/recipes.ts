/** The recipes, described once: the showcase tabs and the home page gallery both read this. */
export const RECIPE_INFO = {
  "room-booking": {
    label: "Room booking",
    blurb: "Meeting rooms in 30 minute slots, booked through your own form, with no double booking.",
    doc: "recipes/room-booking",
  },
  "shift-roster": {
    label: "Shift roster",
    blurb: "Staff on shifts with their own hours. Time off is blocked, and each row shows how full it is.",
    doc: "recipes/shift-roster",
  },
  "equipment-rental": {
    label: "Equipment rental",
    blurb: "Stock with several units, rented for days. Find the next free stretch, and never overbook.",
    doc: "recipes/equipment-rental",
  },
  "field-service": {
    label: "Field service dispatch",
    blurb: "Dispatch jobs to technicians. One click picks the technician who can take it first.",
    doc: "recipes/field-service-dispatch",
  },
  "project-allocation": {
    label: "Project allocation",
    blurb: "Plan people across projects by the month. An allocation can't leave its project's dates.",
    doc: "recipes/project-allocation",
  },
  utilization: {
    label: "Utilization",
    blurb: "Booked against available time for every person, from their hours and capacity.",
    doc: "guides/utilization",
  },
} as const;
