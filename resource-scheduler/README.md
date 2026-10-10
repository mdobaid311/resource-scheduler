<h1 align="center">Resource Scheduler</h1>

<p align="center">
  A free, MIT-licensed <b>resource timeline for React</b>.<br />
  Drag, resize, stop double booking, and drive it from the keyboard.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/resource-scheduler"><img alt="npm version" src="https://img.shields.io/npm/v/resource-scheduler?color=2563eb" /></a>
  <a href="https://github.com/mdobaid311/resource-scheduler/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mdobaid311/resource-scheduler/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/mdobaid311/resource-scheduler/blob/main/resource-scheduler/LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/resource-scheduler?color=2563eb" /></a>
  <img alt="TypeScript types included" src="https://img.shields.io/badge/types-included-2563eb" />
</p>

<p align="center">
  <a href="https://resource-scheduler-demo.vercel.app/"><b>Docs and live demos</b></a> &middot;
  <a href="#installation">Install</a> &middot;
  <a href="https://github.com/mdobaid311/resource-scheduler/blob/main/ROADMAP.md">Roadmap</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mdobaid311/resource-scheduler/main/docs/public/hero.gif" alt="Creating, moving and resizing events on a resource timeline; dropping an event onto a busy slot turns red and is refused" width="880" />
</p>

## Why this one?

In most calendar libraries the resource timeline is a paid tier. Here it is free, and complete:

| Resource timeline | Cost |
|---|---|
| **Resource Scheduler** | Free, MIT. Drag, resize, conflict rules, slot selection and keyboard support all included |
| FullCalendar | Premium add-on, from $480 per developer |
| MUI X Scheduler | The Event Timeline is Premium |
| DayPilot Lite | Free, but resource hierarchy, keyboard navigation and overlap prevention are Pro only (Pro from $649) |

Prices checked October 2026; see the [full comparison](https://resource-scheduler-demo.vercel.app/compare/alternatives/). It is also younger than they are: there is no resource hierarchy or time zone support yet, and only rows are virtualized, so for very large timelines pick a heavier tool.

## Features

- 📅 **Views**: day, week, month, quarter and year. Day view slots of 15, 30 or 60 minutes, with visible hours
- 🖱️ **Create, move, resize**: mouse, pen or touch, using Pointer Events, so no drag-and-drop library to wire up
- 🚫 **Conflict rules**: `eventOverlap` and `isValidDrop`, a red footprint before you drop, and the same check available for your server
- 🧩 **Your own dialogs**: `onSlotSelect` hands you the range instead of a hard-coded "New Event"
- ⌨️ **Keyboard and screen readers**: ARIA grid, keyboard move, resize and create, live announcements
- 🎨 **Themeable and isolated**: `--rs-*` CSS variables, dark mode, and styles that never touch the rest of your app
- 📦 **Two ways to install**: npm, or copy the source into your project with the shadcn CLI
- 🔷 **TypeScript** types included; React 18 and 19; Next.js ready

## Installation

```bash
npm install resource-scheduler
# or
yarn add resource-scheduler
# or
pnpm add resource-scheduler
```

### Or copy the source into your project (shadcn CLI)

Prefer to own the code? Add it as a [shadcn registry](https://ui.shadcn.com/docs/registry/github) item straight from GitHub:

```bash
npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler
```

```tsx
import { ResourceScheduler } from "@/components/resource-scheduler";
```

This copies the component to `components/resource-scheduler/` (it mirrors this package's `src`), installs its dependencies (date-fns, lucide-react, Radix popover/select and friends) and adds the `--rs-*` design tokens plus a few utilities to your Tailwind CSS. Your own theme variables and your `components/ui` folder are not touched, and everything is scoped to `.rs-root`.

- Needs Tailwind v4, which is what shadcn sets up by default. Skip the `resource-scheduler.css` import from the npm instructions; the registry adds the styles to your CSS itself.
- Preview first with `npx shadcn@latest view mdobaid311/resource-scheduler/resource-scheduler` or `--dry-run`, and pin a release tag or commit for reproducible installs: `...resource-scheduler#<tag>`.
- It is the same code as the npm package and compiles under `verbatimModuleSyntax` and `erasableSyntaxOnly` (the `create-vite` defaults). Use npm if you want updates with `npm update`; use the registry if you want to edit the source.

## Requirements

- React 18 or 19 (`react` and `react-dom` are peer dependencies).
- No Tailwind setup needed in your app. The component ships a precompiled stylesheet.
- Next.js App Router: the bundle starts with `"use client"`, so you can import it from a server file.

## Quick Start

```tsx
import { ResourceScheduler, ViewType } from 'resource-scheduler';
import "resource-scheduler/dist/resource-scheduler.css"
import { useState } from 'react';

function App() {
  const [resources, setResources] = useState([
    {
      id: "1",
      name: "John Doe",
      role: "Developer",
      events: [
        {
          id: "e1",
          startDate: new Date("2025-09-10T10:00:00"),
          endDate: new Date("2025-09-10T12:00:00"),
          title: "Team Meeting",
          color: "#3b82f6",
          description: "Weekly sync"
        },
      ],
    },
  ]);

  const handleEventCreate = (eventData, resourceId) => {
    const newEvent = {
      ...eventData,
      id: `event-${Date.now()}`,
    };
    
    setResources(prev => 
      prev.map(resource => 
        resource.id === resourceId 
          ? { ...resource, events: [...resource.events, newEvent] }
          : resource
      )
    );
  };

  return (
    <div style={{ height: '600px' }}>
      <ResourceScheduler
        resources={resources}
        initialView={ViewType.Week}
        onEventCreate={handleEventCreate}
      />
    </div>
  );
}
```

## Styles
Import the default styles in your main CSS or JS file:

```tsx
import "resource-scheduler/dist/resource-scheduler.css"
```

## Props

### ResourceSchedulerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resources` | `Resource[]` | **Required** | Array of resources to display. Each may hold its own `events` |
| `events` | `SchedulerEvent[]` | `undefined` | The same events as one flat list: each names its resource with `resourceId` (or `resourceIds`). Added to what the resources hold, so `resources` can be just `{ id, name }` |
| `initialDate` | `Date` | `new Date()` | Initial date to display |
| `initialView` | `ViewType` | `ViewType.Day` | Initial view type |
| `onEventClick` | `(event: Event, resource: Resource) => void` | `undefined` | Callback when event is clicked |
| `onDateChange` | `(date: Date) => void` | `undefined` | Callback when date changes |
| `onViewChange` | `(view: ViewType) => void` | `undefined` | Callback when view type changes |
| `onEventCreate` | `(event: Omit<Event, "id">, resourceId: string) => void` | `undefined` | Callback when new event is created |
| `onEventDrop` | `(event: Event, fromResourceId: string, toResourceId: string, newStartDate: Date, newEndDate: Date) => void` | `undefined` | Callback when event is moved |
| `renderEventPopover` | `(event: Event, resource: Resource, closePopover: () => void) => React.ReactNode` | `undefined` | Custom event popover renderer |
| `resourceColumnWidth` | `string` | `"220px"` | Width of resource column |
| `timeColumnWidth` | `string` | `"90px"` | Width of time columns (day view) |
| `dateColumnWidth` | `string` | `"140px"` | Width of date columns (other views) |
| `allowViewChange` | `boolean` | `true` | Whether to show view type selector |
| `ariaLabel` | `string` | `"Resource schedule"` | Accessible name of the schedule grid |
| `onSlotSelect` | `({ resourceId, start, end }) => void` | `undefined` | Called when the user clicks or drag-selects empty slots. Providing it replaces the built-in creation (`onEventCreate` is not called) so you can open your own dialog. The overlap rules apply. `end` is exclusive |
| `slotDuration` | `number` | `60` | Day view only: minutes per slot (15, 30, 60, ...) |
| `dayStartHour` | `number` | `0` | Day view only: first visible hour, 0-23 |
| `dayEndHour` | `number` | `24` | Day view only: hour the visible range ends (exclusive), 1-24 |
| `onEventResize` | `(event, resourceId, newStartDate, newEndDate) => void` | `undefined` | Providing it shows resize handles on every event. Edges snap to whole slots; end times are exclusive |
| `eventOverlap` | `boolean \| (moving, other) => boolean` | `true` | `false` forbids overlapping events on the same resource; a function decides per overlapping pair (return `true` to allow) |
| `isValidDrop` | `(event, placement) => boolean` | `undefined` | Final veto for move, resize and drag-create. `placement` is `{ resourceId, start, end }` |
| `availableViews` | `ViewType[]` | all five | Views offered in the selector |
| `weekStartsOn` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | `0` | First day of the week (0 is Sunday) |
| `hideWeekends` | `boolean` | `false` | Leave Saturday and Sunday out of the week, month, quarter and year views |
| `onRangeChange` | `({ start, end, view }) => void` | `undefined` | Called on mount and whenever the visible range changes. `end` is exclusive. Use it to load only what is on screen |
| `businessHours` | `{ daysOfWeek?, startHour?, endHour? }` | `undefined` | Shade time outside working hours and non-working days (`{}` is Monday to Friday, 9 to 17). A resource's own `businessHours` overrides it; `false` means always available. Hours apply to the day view only |
| `blockUnavailable` | `boolean` | `false` | Reject every move, resize and create that touches a shaded slot (outside business hours or inside a resource's `unavailable` ranges) |
| `nowIndicator` | `boolean` | `false` | Day view: a line at the current time, moved every minute |
| `collapsedGroups` | `string[]` | `undefined` | The groups (`Resource.group`) that are folded. Pass it with `onCollapsedGroupsChange` to control it |
| `defaultCollapsedGroups` | `string[]` | `[]` | Groups that start folded when you do not control `collapsedGroups` |
| `onCollapsedGroupsChange` | `(groups: string[]) => void` | `undefined` | Called with the new list when the user folds or unfolds a group |
| `showUtilization` | `boolean` | `false` | A bar under each resource name: how much of its available time (business hours minus `unavailable`, times `capacity`) is booked in the visible range. Over 100% means more bookings at once than it can take. `getUtilization` is exported for the same numbers elsewhere |
| `locale` | date-fns `Locale` | English | e.g. `import { de } from "date-fns/locale"`. Names, date formats, 12/24-hour clock and the first day of the week follow it |
| `hour12` | `boolean` | the locale's | `true` for a 12-hour clock, `false` for 24-hour |
| `dir` | `"ltr" \| "rtl"` | `"ltr"` | `"rtl"` mirrors the layout for Arabic, Hebrew and other right-to-left languages and flips the left and right arrow keys |
| `labels` | `PartialLabels` | English | Text of the toolbar, headers, view names and screen reader messages. Any subset; see `defaultLabels` for the full set |
| `virtualize` | `boolean` | on above 100 resources | Render only the rows near the viewport. Needs the scheduler in a box with a fixed height; without one every row is drawn |
| `renderResourceHeader` | `(resource: Resource) => ReactNode` | `undefined` | Custom resource cell in the left column |
| `renderDateHeader` | `(date: Date, view: ViewType) => ReactNode` | `undefined` | Custom column header |
| `renderTimeSlot` | `(event: SchedulerEvent, resources: Resource[]) => ReactNode` | `undefined` | Replace the event card. `resources` holds the single owning resource |
| `renderEmptyCell` | `(date: Date, resource: Resource) => ReactNode` | `undefined` | Content rendered inside empty cells |

Column widths must be `px` values. Event end times are exclusive: an event ending at midnight does not occupy the next day. Dropped events keep their time of day in Week/Month/Quarter/Year views, and snap to the hour in Day view.

`resources` is read as-is: the component keeps no copy of your data, so update your own state in `onEventCreate` / `onEventDrop`.

### Ref

Pass a `ref` (type `ResourceSchedulerHandle`) to drive the view from code:

| Method | Description |
|--------|-------------|
| `goTo(date)` | Show the period containing `date`. Calls `onDateChange` |
| `setView(view)` | Change the view and keep the date. Calls `onViewChange` |
| `getVisibleRange()` | `{ start, end }` of what the grid covers. `end` is exclusive |
| `scrollToTime(date)` | Scroll `date` to the middle of the grid; navigates first if it is outside the range |

### Type Definitions

```typescript
// A const object plus a union type: ViewType.Week and `view: ViewType` both work.
const ViewType = {
  Day: "day",
  Week: "week",
  Month: "month",
  Quarter: "quarter",
  Year: "year",
} as const;
type ViewType = (typeof ViewType)[keyof typeof ViewType];

interface Resource {
  id: string;
  name: string;
  role?: string;
  events: Event[];
  businessHours?: BusinessHours | false;  // overrides the prop; false = always available
  unavailable?: { start: Date; end: Date }[];  // time off, shaded in the grid (end is exclusive)
  capacity?: number;       // bookings it can take at once; only utilization uses it. Default 1
  group?: string;          // listed under a collapsible header with this name
}

interface SchedulerEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  description?: string;
  resourceId?: string;     // flat `events` prop only: the resource it belongs to
  resourceIds?: string[];  // ...or several
  recurrence?: {           // makes it repeat; the scheduler draws each occurrence
    freq: "daily" | "weekly" | "monthly" | "yearly";
    interval?: number;
    byWeekday?: number[];  // weekly only, 0 = Sunday
    until?: Date;          // inclusive
    count?: number;
    exceptions?: Date[];   // days to skip
  };
  seriesId?: string;       // on an occurrence handed to your handlers: the series it comes from
}
```

Handlers receive an occurrence of a recurring event (`id` is `"<id>::<yyyy-MM-dd>"`); update your one series, for example by adding an exception for "this event only". See the [recurring events guide](https://resource-scheduler-demo.vercel.app/guides/recurring-events/).

`Event` is still exported as a deprecated alias of `SchedulerEvent`; prefer the new name, `Event` shadows the DOM global.

## Usage Examples

### Basic Usage

```tsx
import "resource-scheduler/dist/resource-scheduler.css"
import { ResourceScheduler, ViewType } from 'resource-scheduler';

function BasicExample() {
  const resources = [
    {
      id: "1",
      name: "Resource 1",
      events: [
        {
          id: "1",
          title: "Meeting",
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          color: "#3b82f6"
        }
      ]
    }
  ];

  return (
    <ResourceScheduler
      resources={resources}
      initialView={ViewType.Week}
    />
  );
}
```

### With Event Handlers

```tsx
function InteractiveExample() {
  const [resources, setResources] = useState(initialResources);

  const handleEventCreate = (eventData, resourceId) => {
    const newEvent = {
      ...eventData,
      id: `event-${Date.now()}`,
    };
    
    setResources(prev => 
      prev.map(resource => 
        resource.id === resourceId 
          ? { ...resource, events: [...resource.events, newEvent] }
          : resource
      )
    );
  };

  const handleEventDrop = (event, fromResourceId, toResourceId, newStartDate, newEndDate) => {
    // Remove from original resource
    const updatedResources = resources.map(resource => 
      resource.id === fromResourceId 
        ? { ...resource, events: resource.events.filter(e => e.id !== event.id) }
        : resource
    );
    
    // Add to new resource
    const finalResources = updatedResources.map(resource =>
      resource.id === toResourceId
        ? { ...resource, events: [...resource.events, { ...event, startDate: newStartDate, endDate: newEndDate }] }
        : resource
    );
    
    setResources(finalResources);
  };

  return (
    <ResourceScheduler
      resources={resources}
      onEventCreate={handleEventCreate}
      onEventDrop={handleEventDrop}
      onEventClick={(event, resource) => console.log('Event clicked', event)}
      onViewChange={(view) => console.log('View changed', view)}
    />
  );
}
```

### Keyboard and screen readers

The timeline is an ARIA `grid` (one tab stop, using `aria-activedescendant`) with rows and named cells such as "Ann, Tuesday, March 10, 9:00 AM". Events are focusable buttons. Everything you can do with the mouse has a keyboard equivalent, and actions are announced through a polite live region.

| Where | Keys | Does |
|---|---|---|
| Grid | Arrow keys, Home, End | Move the slot cursor |
| Grid | Shift + Left/Right | Extend a selection; Escape drops it |
| Grid | Enter or Space | Select the slot or range (calls `onSlotSelect`, or creates an event) |
| Event | Enter | Open its details |
| Event | Space | Pick it up. Arrows move it, Space drops it, Escape cancels |
| Picked-up event | Shift + Left/Right | Resize the end (needs `onEventResize`) |

Keyboard moves use the same rules as the mouse: `eventOverlap` and `isValidDrop` apply, a rejected place is announced ("Not allowed here") and shown in red, and moves stay inside the visible range. After a drop, focus returns to the moved event.

Status: covered by automated keyboard tests and an axe-core check in CI. It has **not** yet been tried with NVDA, JAWS or VoiceOver, colour contrast of your event colours is up to you, announcements are English only, and resizing the start edge or paging between periods by keyboard is not available yet (use the toolbar buttons).

### Your own create dialog and finer slots

```tsx
const [draft, setDraft] = useState<SlotSelection | null>(null);

<ResourceScheduler
  resources={resources}
  initialView={ViewType.Day}
  slotDuration={30}      // 30-minute columns
  dayStartHour={8}       // show 08:00 ...
  dayEndHour={18}        // ... to 18:00
  onSlotSelect={setDraft} // { resourceId, start, end }: open your dialog, then add the event yourself
/>
{draft && <MyCreateDialog slot={draft} onClose={() => setDraft(null)} />}
```

Events snap to slots when dragged or resized in Day view. Events outside the visible hours are not drawn; ones that cross the edge are clipped. Invalid values fall back to the defaults.

### Resize and conflict control

```tsx
<ResourceScheduler
  resources={resources}
  // Resize handles appear on every event when this is provided.
  onEventResize={(event, resourceId, newStart, newEnd) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? { ...r, events: r.events.map((e) => (e.id === event.id ? { ...e, startDate: newStart, endDate: newEnd } : e)) }
          : r
      )
    );
  }}
  // No double-booking. Rejected drops show a red footprint and never call your handlers.
  eventOverlap={false}
  // Anything else, e.g. keep events inside working hours:
  isValidDrop={(event, { start, end }) => start.getHours() >= 8 && end.getHours() <= 18}
/>
```

`eventOverlap` also accepts a function, e.g. `(moving, other) => other.title === "Tentative"` to let tentative events be overlapped. The rules are checked against the full `resources` prop, for drag-move, resize and drag-create alike. `isPlacementAllowed` and `rangesOverlap` are exported if you want the same check in your own code (for example on the server).

### Custom Event Popover

```tsx
function CustomPopoverExample() {
  const renderEventPopover = (event, resource, closePopover) => (
    <div className="p-4 space-y-2">
      <h3 className="font-bold">{event.title}</h3>
      <p>{resource.name} - {resource.role}</p>
      <p>{event.startDate.toLocaleString()} - {event.endDate.toLocaleString()}</p>
      <button onClick={closePopover}>Close</button>
    </div>
  );

  return (
    <ResourceScheduler
      resources={resources}
      renderEventPopover={renderEventPopover}
    />
  );
}
```

## Styling

### Isolated by design

`resource-scheduler/dist/resource-scheduler.css` contains Tailwind utilities only. It has no global reset and no `body`/`*` rules; base styles are scoped to the `.rs-root` class. Importing it will not restyle the rest of your app.

### Theming

Colors are CSS variables namespaced `--rs-*`, so they never collide with your own shadcn/Tailwind variables. Override them on `:root` or any ancestor, and use a `.dark` ancestor for dark mode:

```css
:root {
  --rs-primary: #7c3aed;
  --rs-border: #d1d5db;
  --rs-today: #f5f3ff;     /* highlight for today's column and selections */
  --rs-surface: #ffffff;   /* grid background */
}
```

Available tokens: `--rs-background`, `--rs-foreground`, `--rs-popover`, `--rs-primary`, `--rs-secondary`, `--rs-muted`, `--rs-accent`, `--rs-border`, `--rs-ring`, `--rs-surface`, `--rs-surface-muted`, `--rs-surface-hover`, `--rs-today`, `--rs-tooltip` and the `-foreground` variants. Every surface and text color in the grid reads from these tokens, so dark mode is just a second set of values.

## Responsive Design

The scheduler is fully responsive and adapts to different screen sizes:

- **Desktop**: Full feature set with optimal spacing
- **Tablet**: Compact layout with adjusted column widths
- **Mobile**: Horizontal scrolling with touch-friendly interactions

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/mdobaid311/resource-scheduler/blob/main/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mdobaid311/resource-scheduler.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build the package
npm run build

# Run tests
npm test
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation & live demo](https://resource-scheduler-demo.vercel.app/)
- 🐛 [Bug Reports](https://github.com/mdobaid311/resource-scheduler/issues)
- 💡 [Feature Requests](https://github.com/mdobaid311/resource-scheduler/issues)
- 💬 [Discussions](https://github.com/mdobaid311/resource-scheduler/discussions)

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Date utilities from [date-fns](https://date-fns.org/)

---

**Resource Scheduler** - Efficiently manage and schedule your resources with this powerful React component.