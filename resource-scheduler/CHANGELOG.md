# Changelog

## [Unreleased]

### Added
- **Headless entry.** `resource-scheduler/headless` exports the scheduling logic without any UI, so you can draw a timeline with your own markup, another framework or a server. It has no React, no CSS and no `"use client"`; its only dependency is `date-fns`. Everything the component computes is there as a plain function: `getColumns`, `getVisibleResources` (recurrence expanded, events outside the view dropped), `layoutEvents` (start, span and first-fit lane of each event), `getRowHeight` / `getRowHeights` / `getGridTemplateRows`, `formatPeriodTitle`, `getTimePosition`, `getSelectedColumns`, and `getMovePlacement` / `getResizePlacement` / `isSamePlacement` for your own pointer handling, next to the ones already public (`navigateDate`, `getVisibleRange`, `expandEvents`, `withGroups`, `isPlacementAllowed`, `findAvailableSlots`, `getUtilization`, `columnUtilization`, `stepPlacement`, `getRowWindow`, `getColumnWindow`, time zone and text helpers). `useScheduler`, `TimelineGrid`, `SchedulerControls` and `useEventDrag` now call these same functions, with no change in behaviour (the existing tests pass untouched), and the main entry keeps every export it had. Guide "Build your own UI" with a live demo drawn from the functions alone, and a reference page that lists every export (a test fails if one is missing from it). It is built like `resource-scheduler/exchange`: `check:entries` reads every file the entry loads, shared chunks included, and fails on anything but `date-fns`, a stylesheet or a `"use client"` module; the `check:size` budgets now count an entry together with the chunks it loads. Headless is 8.7 KB gzip in all. The main bundle, counted that way, is 25.3 KB (24.2 KB for the entry file and 0.7 KB for its `timeZone` chunk before; the budget stays 26 KB).
- **`density`.** `density="compact"` shrinks event lanes (38 px against 52) and cards (34 px against 48), shows an event's title and time on one line and trims the resource cell padding, so more resources fit on screen. A row with a utilization bar stays at least 60 px. The default `"comfortable"` is unchanged. The `Density` type is exported.
- **Group totals.** With `showUtilization`, a group header shows the combined utilization of everything below it (nested groups included, folded ones too) as a small bar and a percentage, and says it aloud in its label ("Floor 1, 2 resources, 6 of 16 hours booked"). `groupUtilization(resources, range, { businessHours })` returns the same sums keyed by header id.
- **Nested resource groups.** `Resource.group` can be a path, `["Main building", "Floor 1"]`: each level gets an indented header, a header counts every resource below it, and folding a parent folds everything inside. A nested group is named by its path joined with " / " in `collapsedGroups`, `defaultCollapsedGroups` and `onCollapsedGroupsChange`; a one-name group keeps its plain name, so existing lists keep working.
- **`classNames`.** Extra classes for the root, toolbar, column headers, resource cells, group headers, slots and event cards (`{ root, toolbar, dateHeader, resourceCell, groupHeader, slot, event }`), merged over the defaults with tailwind-merge so a conflicting utility replaces the default. Output is unchanged without it. `SchedulerClassNames` is exported. The utility has to exist in your CSS: the npm stylesheet is precompiled.
- **Export.** `eventsToICS(events, { resources, name })` returns an iCalendar file for Google Calendar, Outlook and Apple Calendar (timed events in UTC, whole local days as all-day events, `recurrence` as `RRULE` and `exceptions` as `EXDATE`, resource name as `LOCATION`), and `eventsToCSV(events, { resources })` a CSV for spreadsheets, one row per resource, with cells that start with `=`, `+`, `-` or `@` defused against spreadsheet formula injection. Pure functions, so they run in the browser or on a server. They have their own entry point, `import { eventsToICS, eventsToCSV } from "resource-scheduler/exchange"`: no React, no `"use client"`, usable from a server component, and not part of the component bundle (1.4 KB gzip on its own). Checked by parsing the output with ical.js. The `check:size` budgets are 26 KB for the main bundle (24.2 KB used) and 5 KB for the exchange entry.
- **Import.** `icsToEvents(text, { resources, resourceId, onWarning })` (also in `resource-scheduler/exchange`) reads the events of an `.ics` file from Google Calendar, Outlook, Apple Calendar or `eventsToICS`: UTC, IANA `TZID` and floating times, all-day dates, `DURATION`, `RRULE` and `EXDATE` as `recurrence`, changed occurrences (`RECURRENCE-ID`) as their own events, `LOCATION` matched to resource names. Cancelled events are left out; a rule the scheduler cannot show (the second Tuesday, every hour) is imported once, with a message to `onWarning`, as are a zone that is not an IANA name (read as local time) and an unreadable start. Alarms, tasks and attendees are ignored. `check:entries` now loads both entry points as ESM and CommonJS and checks the `"use client"` banner.
- **Touch selection.** Press and hold an empty slot for about a third of a second, drag across more slots and lift to select them, as a mouse drag does; the selection goes to `onSlotSelect` or `onEventCreate`. A quick swipe on empty space still scrolls the grid, and a tap still selects one slot. Checked with real touch events in Chrome (the docs smoke test); not yet on physical devices.
- **Resource groups.** `Resource.group` lists resources under a collapsible header with that name, at the place the group's first member is; resources without one stay plain rows. `defaultCollapsedGroups`, or `collapsedGroups` with `onCollapsedGroupsChange` to control it. Headers are buttons with `aria-expanded` (`labels.group(name, count)` is their spoken text), the grid's arrow keys step over them, events can be dragged between groups, and headers are rows for virtualization. Nothing changes without a `group`. One level only. The JS size budget in `check:size` went from 20 KB to 22 KB for this (20.1 KB used).
- **Recipes** (docs): shift roster (recurring shifts, contracted hours, leave), equipment rental (stock counts with `capacity` and `isValidDrop`, service days, `findAvailableSlots`) and field service dispatch (shifts and breaks, booking the earliest technician), each with a live demo and the complete data model.

## [1.3.0] - 2026-10-10

The first release since 1.1.1. Version 1.2.0 was prepared but never published to npm, so everything listed under it below ships here too, including the fix for the crash under React 18 and the styles that no longer leak into your app. Upgrading from 1.1.1 needs no code changes.

### Added
- **Column virtualization.** `virtualizeColumns` (on by itself above 100 columns: the year view, a day in 5-minute slots) draws only the columns near the viewport. The grid keeps its width and `aria-colcount`; the keyboard cursor cell, a carried event and the slots it would land on stay mounted; right to left and the totals row work; it needs the column widths in px (the defaults) and a box to measure, else every column is drawn. Year view with 50 resources: 21,534 DOM nodes down to 1,353, first grid 659 ms to 153 ms, next year 202 ms to 36 ms. Row heights are now measured once per resource and view (and the columns built once per view) instead of on every render, which also makes 1,000 resources draw in 0.2 s instead of 0.5 s and a jump across a windowed grid cheap; 2,500 resources with 50,000 events draw in 0.8 s and drag at 5.5 ms per pointer move. `bench.mjs` takes a view and a `columns` mode to reproduce it.
- **`components`.** Replace whole parts of the scheduler with your own React components, which can use hooks and keep state: `Toolbar` (gets the title, view title, views, labels, direction and the navigation callbacks), `Event` (the content of the card; the card keeps its size, dragging, resize handles, keyboard use and focus ring), `EventPopover` (gets `close`), `ResourceHeader`, `DateHeader` and `EmptyCell`. A part given here wins over the matching `render*` prop, which keep working. Types `SchedulerComponents` and `ToolbarProps` are exported. Without the prop nothing changes. With `timeZone` the dates they receive are wall-clock Dates, like the render props.
- **Column totals.** `showColumnUtilization` adds a row under the grid with one cell per column (an hour in the day view, a day in the others): how much of all resources' available time is booked in it, counted like the per-resource bars and including resources in collapsed groups. The row sticks to the bottom and each cell is a `role="meter"`. `columnUtilization(resources, columns, { businessHours })` returns the numbers; `getUtilization` now runs on it, so both read each resource's events once. New label `columnUtilization`. Opt-in; output is unchanged without it.
- **Utilization.** `showUtilization` puts a bar and a percentage under each resource name: how much of its available time is booked in the visible range. Available time is the working time (`Resource.businessHours`, else `businessHours`, else every hour) minus `Resource.unavailable`, times the new `Resource.capacity` (simultaneous bookings, default 1). Booked time is the part of the events (recurring ones expanded) inside that available time, so nights and time off count on neither side, and overlapping events add up: above 100% the bar turns red. Opt-in; output is unchanged without it. `getUtilization(resource, range, { businessHours })` returns `{ bookedMinutes, availableMinutes, ratio }` for reports and servers, and `labels.utilization` carries the hover and screen reader text (`role="meter"`).
- **Right-to-left layout.** `dir="rtl"` mirrors the scheduler for Arabic, Hebrew and other right-to-left languages: the resource column on the right, time running leftwards, flipped arrows, logical borders and resize handles, and the left arrow key moving forward in time. `scrollToDate` takes a last `rtl` argument.
- **Time zones.** `timeZone="Europe/Paris"` (any IANA name) shows and reports time in that zone instead of the browser's. Events are instants drawn at their wall-clock time in the zone, `businessHours` are hours in it, and today, the now line and the Today button follow it; recurring events keep their wall-clock time across the zone's clock changes. Handlers (`onEventDrop`, `onEventResize`, `onEventCreate`, `onSlotSelect`, `onEventClick`, `onDateChange`, `onRangeChange`, `isValidDrop`, `eventOverlap`, the ref methods) receive and take instants, ready to store; render props receive wall-clock Dates in the zone. `utcToZoned`, `zonedToUtc` and `isValidTimeZone` are exported. Without the prop nothing changes. An unknown name warns and the local zone is used. Recurrence `until` and `exceptions` are calendar days and are not converted. Times that a clock change skips or repeats follow RFC 5545, which `icsToEvents` now shares. Main bundle 21.6 KB to 22.5 KB gzip. The code the main entry and `resource-scheduler/exchange` share is one small chunk (`timeZone-<hash>.js`, 0.7 KB) without the `"use client"` banner, so the exchange entry stays callable from server code; `check:entries` checks that.
- **Languages and clocks.** `locale` (a date-fns locale: names, date formats, 12/24-hour clock and the first day of the week), `hour12`, and `labels` (every word the scheduler shows and every screen reader message, any subset). Without them the output is the same English as before. `defaultLabels`, `SchedulerLabels`, `PartialLabels` and `I18nInput` are exported; `formatSlotLabel`, `formatRangeLabel` and `formatEventTime` take an optional last argument for the language.
- **Recurring events.** Give an event `recurrence` (`freq` daily, weekly, monthly or yearly, with `interval`, `byWeekday`, `until`, `count` and `exceptions`) and the scheduler draws one event per occurrence in the visible range. Your data keeps one series; handlers receive an occurrence (`id` `<id>::<yyyy-MM-dd>`, `seriesId`). Times follow the wall clock across daylight saving, months and years without the date are skipped as in iCalendar, and the overlap rules see the occurrences. `expandRecurrence` and `expandEvents` are exported.
- **Row virtualization.** `virtualize` (on by default above 100 resources, `false` to opt out) renders only the rows near the viewport. At 1,000 resources the DOM drops from 31,458 to 424 nodes and a drag pointer move from 68.9 ms to 7.1 ms of main-thread time (measured, reproducible with `npm run bench` in `docs/`). The grid keeps its full height and `aria-rowcount`; without a fixed-height box every row is drawn as before. Rows holding the keyboard cursor, a carried event or the event about to get focus stay mounted. `getRowWindow` is exported.
- **Flat `events` prop.** Pass events as one list that names its resource with `resourceId` (or `resourceIds`); they are added to what resources hold in their own `events`, and every rule sees them. `Resource.events` is optional on input (`ResourceInput`). `withEvents` is exported.
- **Business hours and availability.** `businessHours` shades closed hours and non-working days; `Resource.businessHours` overrides it (`false` = always available) and `Resource.unavailable` shades time off. `blockUnavailable` rejects moves, resizes and creates that touch a shaded slot. Shaded cells are announced as "unavailable". `isCellUnavailable`, `touchesUnavailable`, `resolveBusinessHours` are exported.
- **`findAvailableSlots(resources, { from, to, duration, step, businessHours, limit })`** returns the free slots, or the times when several resources are all free.
- **`nowIndicator`**: a line at the current time in today's day view.
- **`weekStartsOn`** and **`hideWeekends`** for the week, month, quarter and year views; events spanning a weekend continue over the gap.
- **`onRangeChange({ start, end, view })`** fires on mount and whenever the visible range changes, for fetching only what is on screen (`end` is exclusive). `getVisibleRange` is exported.
- **Ref handle** (`ResourceSchedulerHandle`): `goTo`, `setView`, `getVisibleRange`, `scrollToTime`.
- **Documentation site** (Astro Starlight, `docs/`): guides with live demos, recipes, an honest comparison, reference, search, `llms.txt`.
- **shadcn registry.** `npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler` copies the component into `components/resource-scheduler/`, installs its dependencies and adds the `--rs-*` tokens and utilities to the app's Tailwind CSS, without touching the app's own theme or `components/ui`. `registry.json` at the repo root is generated (`npm run registry:build`) from the source and `src/styles/tokens.css`; a test fails if it is stale or ships a file that imports something missing. Verified by installing into a fresh Vite 8 + Tailwind 4 + shadcn app and building it.
- **Keyboard navigation and ARIA.** The timeline is a `role="grid"` (single tab stop with `aria-activedescendant`) of rows and named gridcells. Arrow keys/Home/End move a slot cursor, Shift+Left/Right extends a range, Enter or Space selects it. Events are focusable buttons: Enter opens details, Space picks one up, arrows move it, Shift+Left/Right resizes its end, Space drops it, Escape cancels. Moves honour `eventOverlap`/`isValidDrop`, stay inside the visible range, and focus returns to the moved event. This gives keyboard equivalents for dragging, resizing and creating (WCAG 2.5.7).
- Screen reader support: a polite live region announces pick-up, moves, rejected places, drops and selections; a visually hidden description explains the keys; toolbar buttons and the view select have accessible names; the period title is a live region; slots expose `aria-current="date"` for today. New `ariaLabel` prop.
- axe-core check in the test suite (no violations on the rendered scheduler).
- `commitRange` from `useEventCreation`, `formatSlotLabel` / `formatRangeLabel`, `moveCursor` / `stepPlacement` helpers.
- **`onSlotSelect({ resourceId, start, end })`.** Click or drag-select empty slots and open your own create dialog. When provided it replaces the built-in event creation; the overlap rules apply and rejected selections are not reported.
- **Day view slot options.** `slotDuration` (minutes per slot), `dayStartHour` and `dayEndHour`. Dragging, resizing, selecting and scroll-to-time all snap to the configured slots; events outside the visible hours are not drawn. `resolveSlotOptions` and the `SlotOptions` type are exported, `getTimeSlots` takes an optional options argument, and `useScheduler` takes slot options as a 4th argument.
- **Event resize.** Pass `onEventResize(event, resourceId, newStart, newEnd)` to show edge handles. Edges snap to whole slots (hours in Day view, days elsewhere, keeping the time of day), end times are exclusive, and the new footprint is highlighted while dragging.
- **Conflict control.** `eventOverlap` (`false`, or `(moving, other) => boolean`) and `isValidDrop(event, placement)` apply to drag-move, resize and drag-create. Rejected placements show a red footprint and never call your handlers. `isPlacementAllowed` and `rangesOverlap` are exported.
- Drag and resize now highlight every slot the event would cover, not only the one under the pointer.

### Changed
- `ResourceScheduler` is now a `forwardRef` component (JSX usage is unchanged).
- Text and surface colors inside the grid read the `--rs-*` tokens instead of fixed grays, so a dark token set is readable.
- A keyboard-carried event keeps its destination in view as it moves, and focus returning to it after a drop or cancel scrolls it into view.
- `ViewType` is now a `const` object plus a union type instead of an `enum` (`ViewType.Week` and `view: ViewType` work as before). Needed so the source compiles under `erasableSyntaxOnly`, the `create-vite` default.
- Type-only imports use `import type` everywhere. Without that the source failed to build in apps with `verbatimModuleSyntax` (a Rolldown/Vite 8 `MISSING_EXPORT` error). The package's own tsconfigs now enable both flags so this cannot regress.
- The UI primitives, `cn` helper and `use-media-query` moved under `src/components/ResourceScheduler/` so the installed layout matches the package. Public exports are unchanged.
- `src/styles/tokens.css` split out of `global.css`; the compiled npm stylesheet is byte-identical.

### Fixed
- `require("resource-scheduler")` crashed with "exports is not defined in ES module scope": `package.json` has `"type": "module"`, so Node read the CommonJS build `dist/index.js` as ESM. The CommonJS build is now `dist/index.cjs` (`main` and `exports.require` point at it). CI loads both entry points through the package's own `exports` map after every build.
- The npm package no longer ships a demo screenshot and an icon copied from `public/` (package size 135 KB down to 50 KB). CI now fails on stray files in `dist/` and on a gzip size budget.
- Events can be dropped on a slot that is covered by another event (the slot lookup now uses `elementsFromPoint`).

## [1.2.0] - 2026-10-09

### Fixed
- Versions up to 1.1.1 bundled React 19's `jsx-runtime` and crashed under React 18 (`Cannot read properties of undefined (reading 'recentlyCreatedOwnerStacks')`). React and its subpaths are now external; 1.2.0 was verified by server-rendering the packed tarball with React 18.3.1.
- Importing the stylesheet restyled the host app (Tailwind preflight, `body` and `*` rules, unprefixed `:root` variables such as `--background` and `--primary`). Base styles are now scoped to `.rs-root` and tokens are namespaced `--rs-*`.
- Today's highlight, drag-selection highlight and several shadows rendered nothing because their utility classes were never defined.
- `resourceColumnWidth` had no effect.
- Day view only showed events active at the current moment; events on the last day of Week/Month/Quarter/Year views were hidden.
- Day view mispositioned events that cross midnight or are shorter than an hour. Events ending exactly at midnight no longer occupy the next day.
- Dropping an event in Week/Month/Quarter/Year views reset its time to 00:00; it now keeps its time of day.
- A plain click created a zero-length event, drag-create excluded the last selected slot, and releasing the mouse outside the grid left the selection stuck.
- Scroll-to-date never scrolled anything (it targeted a non-scrolling element) and always targeted today instead of the displayed date. It now centres the displayed date next to the sticky resource column.

### Changed
- Drag & drop uses Pointer Events instead of `react-dnd`: works with touch and no longer conflicts with a host app's own DnD setup. `react-dnd` and `react-dnd-html5-backend` are removed.
- `react` and `react-dom` are peer dependencies only; `tailwindcss` is no longer a peer dependency.
- The bundle starts with `"use client"` and declares `sideEffects` for CSS.
- Events spanning whole days show "All day" instead of "12:00 AM - 12:00 AM".
- `useEventCreation(onEventCreate, viewType)` takes the view type and no longer sets a hard-coded `duration`.
- `Event` is renamed `SchedulerEvent` (`Event` stays as a deprecated alias).
- `EmptySlotItem` no longer accepts `onEventDrop`; drops are handled by `TimelineGrid`.
- `useScheduler` derives visible events instead of copying props into state.

### Added
- Vitest suite (dates, layout, creation, drag, scroll), `npm test`, `npm run lint`, GitHub Actions CI.
- `getVisibleEvents`, `getDropRange`, `getSelectionBounds`, `formatEventTime` utilities.
- CONTRIBUTING.md and ROADMAP.md.

### Known limitations
- Touch drag is implemented with Pointer Events but not yet verified on real devices.
- Keyboard navigation and ARIA roles are not implemented yet (see ROADMAP.md).

## [1.0.3] - 2025-09-29
- Documentation Update

## [1.0.2] - 2025-09-28
- Bug fixes

## [1.0.1] - 2025-09-28

### Fixed
- CSS import issues
- Missing style exports in package.json

### Changed
- Updated build configuration for better CSS handling

## [1.0.0] - 2025-09-27

### Added
- Initial release
- Multiple view types (Day, Week, Month, Quarter, Year)
- Drag & drop event creation and movement
- Customizable event popovers
- Responsive design
- TypeScript support