# Resource Scheduler

A fully customizable, feature-rich resource scheduling component for React applications. Built with TypeScript, Tailwind CSS, and shadcn/ui components.

![Resource Scheduler](/resource-scheduler/public/resource-scheduler-demo.png)

## Live Demo

Try the Resource Scheduler in action: [resource-scheduler-demo.vercel.app](https://resource-scheduler-demo.vercel.app/)

## Features

- 📅 **Multiple View Types**: Day, Week, Month, Quarter, and Year views
- 🎯 **Drag & Drop**: Create events by dragging and move events between resources
- 🎨 **Customizable**: Fully customizable styling and event rendering
- 📱 **Responsive**: Works seamlessly across desktop and mobile devices
- 👆 **Pointer-events drag & drop**: mouse, pen and touch, no extra DnD library, no clash with your own react-dnd setup
- ⌨️ **Keyboard & screen reader support**: ARIA grid, keyboard move/resize/create, live announcements (see [status](#keyboard-and-screen-readers))
- 🎪 **Event Popovers**: Customizable event detail popovers
- 📊 **Resource Management**: Manage multiple resources with individual events
- 🎯 **TypeScript**: Fully typed for better developer experience

## Installation

```bash
npm install resource-scheduler
# or
yarn add resource-scheduler
# or
pnpm add resource-scheduler
```

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
| `resources` | `Resource[]` | **Required** | Array of resources to display |
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
| `renderResourceHeader` | `(resource: Resource) => ReactNode` | `undefined` | Custom resource cell in the left column |
| `renderDateHeader` | `(date: Date, view: ViewType) => ReactNode` | `undefined` | Custom column header |
| `renderTimeSlot` | `(event: SchedulerEvent, resources: Resource[]) => ReactNode` | `undefined` | Replace the event card. `resources` holds the single owning resource |
| `renderEmptyCell` | `(date: Date, resource: Resource) => ReactNode` | `undefined` | Content rendered inside empty cells |

Column widths must be `px` values. Event end times are exclusive: an event ending at midnight does not occupy the next day. Dropped events keep their time of day in Week/Month/Quarter/Year views, and snap to the hour in Day view.

`resources` is read as-is: the component keeps no copy of your data, so update your own state in `onEventCreate` / `onEventDrop`.

### Type Definitions

```typescript
enum ViewType {
  Day = "day",
  Week = "week",
  Month = "month",
  Quarter = "quarter",
  Year = "year"
}

interface Resource {
  id: string;
  name: string;
  role?: string;
  events: Event[];
}

interface SchedulerEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  description?: string;
}
```

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

Available tokens: `--rs-background`, `--rs-foreground`, `--rs-popover`, `--rs-primary`, `--rs-secondary`, `--rs-muted`, `--rs-accent`, `--rs-border`, `--rs-ring`, `--rs-surface`, `--rs-surface-muted`, `--rs-surface-hover`, `--rs-today`, `--rs-tooltip` and the `-foreground` variants. Some text colors inside the grid are still fixed grays; fully themeable dark mode is on the [roadmap](https://github.com/mdobaid311/resource-scheduler/blob/main/ROADMAP.md).

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