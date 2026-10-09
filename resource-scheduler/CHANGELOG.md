# Changelog

## [Unreleased]

### Added
- **Right-to-left layout.** `dir="rtl"` mirrors the scheduler for Arabic, Hebrew and other right-to-left languages: the resource column on the right, time running leftwards, flipped arrows, logical borders and resize handles, and the left arrow key moving forward in time. `scrollToDate` takes a last `rtl` argument.
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