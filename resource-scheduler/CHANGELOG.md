# Changelog

## [Unreleased]

### Added
- **`onSlotSelect({ resourceId, start, end })`.** Click or drag-select empty slots and open your own create dialog. When provided it replaces the built-in event creation; the overlap rules apply and rejected selections are not reported.
- **Day view slot options.** `slotDuration` (minutes per slot), `dayStartHour` and `dayEndHour`. Dragging, resizing, selecting and scroll-to-time all snap to the configured slots; events outside the visible hours are not drawn. `resolveSlotOptions` and the `SlotOptions` type are exported, `getTimeSlots` takes an optional options argument, and `useScheduler` takes slot options as a 4th argument.
- **Event resize.** Pass `onEventResize(event, resourceId, newStart, newEnd)` to show edge handles. Edges snap to whole slots (hours in Day view, days elsewhere, keeping the time of day), end times are exclusive, and the new footprint is highlighted while dragging.
- **Conflict control.** `eventOverlap` (`false`, or `(moving, other) => boolean`) and `isValidDrop(event, placement)` apply to drag-move, resize and drag-create. Rejected placements show a red footprint and never call your handlers. `isPlacementAllowed` and `rangesOverlap` are exported.
- Drag and resize now highlight every slot the event would cover, not only the one under the pointer.

### Fixed
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