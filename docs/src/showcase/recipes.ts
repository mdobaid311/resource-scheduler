/** Every live demo, described once, in the groups the showcase sidebar shows. `demo` is the file name in components/demos. */
export type DemoInfo = { id: string; label: string; blurb: string; demo: string; doc: string };
export type DemoGroup = { id: string; label: string; demos: DemoInfo[] };

export const GROUPS: DemoGroup[] = [
  {
    id: "recipes",
    label: "Recipes",
    demos: [
      { id: "room-booking", label: "Room booking", blurb: "Meeting rooms in 30 minute slots, booked through your own form, with no double booking.", demo: "RoomBookingDemo", doc: "recipes/room-booking" },
      { id: "shift-roster", label: "Shift roster", blurb: "Staff on shifts with their own hours. Time off is blocked, and each row shows how full it is.", demo: "ShiftRosterDemo", doc: "recipes/shift-roster" },
      { id: "equipment-rental", label: "Equipment rental", blurb: "Stock with several units, rented for days. Find the next free stretch, and never overbook.", demo: "EquipmentRentalDemo", doc: "recipes/equipment-rental" },
      { id: "field-service", label: "Field service dispatch", blurb: "Dispatch jobs to technicians. One click picks the technician who can take it first.", demo: "FieldServiceDemo", doc: "recipes/field-service-dispatch" },
      { id: "project-allocation", label: "Project allocation", blurb: "Plan people across projects by the month. An allocation can't leave its project's dates.", demo: "ProjectAllocationDemo", doc: "recipes/project-allocation" },
      { id: "clinic-board", label: "Clinic appointment board", blurb: "Clinicians with their own hours and gaps, and a buffer held around every visit.", demo: "ClinicBoardDemo", doc: "tutorials/react-clinic-appointment-board" },
    ],
  },
  {
    id: "interaction",
    label: "Drag, resize and rules",
    demos: [
      { id: "quick-start", label: "Quick start", blurb: "The smallest working setup: resources in, a scheduler out.", demo: "BasicDemo", doc: "start/quick-start" },
      { id: "conflict-control", label: "Conflict control", blurb: "Forbid overlaps, or write your own rule. Refused places turn red before you drop.", demo: "ConflictDemo", doc: "guides/conflict-control" },
      { id: "slots", label: "Slots and day view", blurb: "Select a range and open your own form. Slots of 15, 30 or 60 minutes.", demo: "SlotsDemo", doc: "guides/views-and-slots" },
      { id: "week-view", label: "Week view", blurb: "The week at a glance, with the same drag, resize and create.", demo: "WeekDemo", doc: "guides/views-and-slots" },
      { id: "controlled-view", label: "Controlled view", blurb: "Load data lazily as the range changes, and drive the view from your own buttons.", demo: "ControlDemo", doc: "guides/loading-and-control" },
      { id: "recurring", label: "Recurring events", blurb: "Series kept as one event each, drawn as occurrences. Move one and choose what happens to the rest.", demo: "RecurringDemo", doc: "guides/recurring-events" },
      { id: "keyboard", label: "Keyboard and screen readers", blurb: "An ARIA grid: move, resize and create from the keyboard, with live announcements.", demo: "KeyboardDemo", doc: "guides/keyboard-and-accessibility" },
    ],
  },
  {
    id: "capacity",
    label: "Availability and capacity",
    demos: [
      { id: "availability", label: "Business hours and time off", blurb: "Closed hours and time off are protected, so nothing lands where it should not.", demo: "AvailabilityDemo", doc: "guides/availability" },
      { id: "suggest", label: "Suggest a free slot", blurb: "Pick a job and a strategy, see who ranks first, and book it. Crews can have a capacity above one.", demo: "SuggestDemo", doc: "guides/availability" },
      { id: "utilization", label: "Utilization", blurb: "Booked against available time for every person, from their hours and capacity.", demo: "UtilizationDemo", doc: "guides/utilization" },
      { id: "time-zones", label: "Time zones", blurb: "Store one time, show each viewer their own clock.", demo: "TimeZoneDemo", doc: "guides/time-zones" },
    ],
  },
  {
    id: "organize",
    label: "Rows and groups",
    demos: [
      { id: "groups", label: "Resource groups", blurb: "Collapse rows into teams, floors or sites.", demo: "GroupsDemo", doc: "guides/resource-groups" },
      { id: "reorder", label: "Reorder rows", blurb: "Rooms on two floors and an annex. Drag to reorder; the order is just your list.", demo: "ReorderDemo", doc: "guides/resource-groups" },
      { id: "flat", label: "Flat timeline", blurb: "A plain free timeline, nothing but rows and time.", demo: "FlatTimelineDemo", doc: "tutorials/free-react-resource-timeline" },
    ],
  },
  {
    id: "data",
    label: "Data in and out",
    demos: [
      { id: "export", label: "Export calendar files", blurb: "eventsToICS and eventsToCSV on whatever is on the board right now.", demo: "ExportDemo", doc: "guides/export" },
      { id: "import", label: "Import calendar files", blurb: "Paste or open a calendar file and see which events come out, and which cannot be shown.", demo: "ImportDemo", doc: "guides/export" },
      { id: "printing", label: "Printing", blurb: "A print layout that drops the page chrome and keeps the board.", demo: "PrintDemo", doc: "guides/printing" },
    ],
  },
  {
    id: "yours",
    label: "Make it yours",
    demos: [
      { id: "theming", label: "Theming", blurb: "Colors are CSS variables. Switch preset, dark mode and density live.", demo: "ThemeDemo", doc: "guides/theming" },
      { id: "components", label: "Replace parts", blurb: "Swap the event, the row header or the toolbar for your own components.", demo: "ComponentsDemo", doc: "guides/components" },
      { id: "headless", label: "Headless", blurb: "Use the hooks and build the interface from scratch.", demo: "HeadlessDemo", doc: "guides/build-your-own-ui" },
      { id: "custom-timeline", label: "Custom timeline", blurb: "A timeline made from the headless functions and inline styles, with its own pointer handling.", demo: "CustomTimelineDemo", doc: "guides/build-your-own-ui" },
      { id: "i18n", label: "Languages and clocks", blurb: "Translated labels, first day of the week, 12 or 24 hour time.", demo: "I18nDemo", doc: "guides/internationalization" },
    ],
  },
];

export const ALL_DEMOS = GROUPS.flatMap((g) => g.demos);
