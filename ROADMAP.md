# Resource Scheduler: Audit, Roadmap, Go-to-Market

Written 2026-10-09. Facts are sourced or marked **(estimate)**. Many market sources are vendor-written; treat their rankings as a shortlist, not truth.

## 1. Where the project stands today (facts)

| Metric | Value | Source |
|---|---|---|
| GitHub stars / forks | 3 / 0 | repo page |
| npm downloads, last 30 days | 158 | npm downloads API, 2026-09-08 to 10-07 |
| Latest version | 1.1.1, published 2025-10-17. No release in ~12 months | npm registry |
| Release hygiene | 20 versions in 3 weeks; 13 published on a single day (2025-10-01) | npm registry |
| Tests / CI | None. README says `npm test`; no test script, no `.github` | repo |
| CONTRIBUTING.md | Linked from README, does not exist | repo |
| Demo site | Vercel demo exposes no readable SEO text beyond a `<title>` | WebFetch |

Strengths: clean MIT license, TypeScript, 5 views, drag-create, drag-move across resources, render-prop hooks, shadcn/Tailwind look, working demo + example app. Small, readable codebase, which is an advantage for contributors.

## 2. Market findings

**The gap is real and specific.** Free, permissive, modern React *resource timelines* are scarce:

- FullCalendar's Timeline and Vertical Resource views are Premium, from $480 per developer seat ([fullcalendar.io/premium](https://fullcalendar.io/premium)).
- MUI X Scheduler Community is free MIT but still beta; the horizontal **Event Timeline** and **recurring events** are Premium ([mui.com](https://mui.com/x/react-scheduler/)).
- Bryntum, Syncfusion, Kendo, DHTMLX are commercial or GPL ([dhtmlx comparison](https://dhtmlx.com/blog/best-react-scheduler-components-dhtmlx-bryntum-syncfusion-daypilot-fullcalendar/), vendor-written).
- Free options: DayPilot Lite (Apache 2.0) has a horizontal resource timeline, but resource hierarchy, keyboard navigation, overlap prevention, fixed column width, export and non-business-hours are Pro-only, Pro from $649 ([DayPilot React](https://www.daypilot.org/react/)). react-big-scheduler: ~771 stars, last push 2023-03, 174 open issues ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fstephenchou1017%2Freact-big-scheduler)). react-big-schedule: 136 stars ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Freact-scheduler%2Freact-big-schedule)). react-big-calendar (~8.7k stars) is a calendar, not a resource timeline.

**What buyers/users ask for** (vendor and review sources, so directional only):
conflict and double-booking detection, capacity rules, live drag-and-drop validation, utilization views (booked vs available), recurring bookings (a recurring complaint in G2 reviews of competitors), calendar sync (Outlook/Google/iCal), audit trail, resource hierarchy/grouping ([Saviom](https://www.saviom.com/solutions/software-evaluation/best/resource-scheduling-software/), [Guideflow](https://www.guideflow.com/blog/resource-scheduling-software), [eResource](https://newsite.eresourcescheduler.com/blog/top-resource-scheduling-tools-compared), [Syncfusion](https://www.syncfusion.com/scheduler-sdk/react-scheduler/resource-scheduling)). Enterprise scheduler vendors all advertise WCAG 2.2 AA, ARIA grid, keyboard drag/resize ([CoreUI](https://coreui.io/scheduler/docs/features/keyboard-accessibility/), [MUI](https://mui.com/x/react-scheduler/accessibility/)).

**Closest growth analogue:** Schedule-X (MIT core, premium plugins, framework adapters) reached ~776 stars about 8 months after creation and ~1.5k by Jan 2025 ([Best of JS](https://bestofjs.org/projects/schedule-x), [ecosyste.ms](https://awesome.ecosyste.ms/projects/114764)). Use that as the realistic pace for a well-run calendar library.

**Distribution tailwind:** As of June 2026 any public GitHub repo with a root `registry.json` is installable via `shadcn add <owner>/<repo>/<item>`, with no build step or server ([shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-06-github-registries)). This project is already shadcn/Tailwind-styled. The changelog describes no public directory for GitHub registries, so discovery is on you.

## 3. Positioning decision

> **The free, MIT, shadcn-native resource timeline for React.** The thing FullCalendar Premium and MUI X Premium charge for, that you can also copy into your repo and own.

Audience: devs building booking, room, equipment, crew/shift, clinic, dispatch, project-allocation UIs, especially on Next.js + Tailwind + shadcn.
Explicit non-goals: Gantt dependencies/critical path, resource leveling, being a full workforce-management SaaS. (Bryntum territory; it would dilute the pitch.)

## 4. Code audit: bugs and debt found

Fix these before any launch. A first-time user hitting one of them will bounce.

**Adoption blockers**
1. `src/styles/global.css` ships `:root { --background, --primary, --border, ... }` and a `.dark` block, and is imported by `src/index.ts`. This can clobber a host app's own shadcn theme variables. Namespace to `--rs-*`, scope everything under a root class, verify the built CSS emits no global resets.
2. `tailwindcss ^4.1.13` is a peer dependency although CSS ships precompiled. Forces Tailwind 4 on consumers for no reason. Drop it (or ship an optional preset).
3. `react` and `react-dom` are in both `dependencies` and `peerDependencies`. Keep peer only.
4. `react-dnd` + HTML5 backend wrapped in an internal `DndProvider`: a host app that already uses react-dnd gets the "two HTML5 backends" error, and HTML5 DnD has no touch support (README promises "touch-friendly"). Replace with Pointer Events; this also unlocks resize and keyboard moves.
5. No `"use client"` banner, so Next.js App Router consumers must wrap it themselves. Defaults like `initialDate = new Date()` risk hydration mismatches. No `sideEffects` field although the entry imports CSS.
6. Exported type `Event` shadows the DOM global `Event`. Rename to `SchedulerEvent`, keep a deprecated alias.

**Correctness**
7. Single click on an empty cell fires `onEventCreate` with `startDate === endDate` (zero-length). Drag state stays stuck if the mouse is released outside the grid (`onMouseUp` is only on the grid container).
8. Day view: start position uses `startDate.getHours()` (ignores the date, so multi-day events misplace), span uses `differenceInHours` (sub-hour events collapse, minutes ignored).
9. Dropping an event in Week/Month/Quarter/Year sets start to the slot (midnight), so the original time-of-day is lost.
10. `scrollToDate` is always called with `new Date()`, so navigating to another period scrolls toward today, not the displayed date.
11. `getEventSpan` uses `differenceInDays(...) + 1`: an event ending exactly at 00:00 gets an extra day; DST not handled.
12. `useScheduler` copies the `resources` prop into state and refilters in an effect (extra render, stale-frame flash, prop changes lag). Derive with `useMemo`. `initialDate`/`initialView` are uncontrolled only.
13. `calculateEventPositions` is O(n^2) per resource and runs twice per render (row heights + grid). Every drag-hover `setDragEnd` re-renders every cell. Year view renders 365 columns x N resources of DOM with no virtualization.
14. `handleCellClick` fires `onEventClick` for "event starting in this cell", a confusing contract. Add a real `onSlotClick`.
15. Create flow hard-codes title `"New Event"` and a random hex color. Consumers need to choose.

**Honesty / docs**
16. README and demo claim "Accessible" and "Timezone support for resources". No ARIA, roles, keyboard handlers or timezone code exist. Either build them (see P1) or remove the claims now.
17. README prop table omits `availableViews`, `renderResourceHeader`, `renderDateHeader`, `renderTimeSlot`, `renderEmptyCell`. Type snippet says `color` required; code says optional. README references nonexistent CONTRIBUTING.md and docs URL; the root README and package README have diverged.
18. `renderTimeSlot(event, resource: Resource[])` takes an array for a single resource. Awkward; fix in the 2.0 API.
19. Dead files: `hooks/useEventDragDrop.ts`, `hooks/useTimeline.ts` are empty. `CHANGELOG.md` stops at 1.0.3 while package is 1.1.1.
20. Hard-coded English date formats (`h:mm a`, `MMM d`), week starts Sunday (`startOfWeek` default), no `locale`, 24h, RTL. Components hard-code `text-gray-800`, so the shipped `.dark` theme is not fully honored.

## 5. Roadmap

Effort tags are **(estimate)**: S under 1 day, M 1-3 days, L about a week, XL multi-week.

### P0: Trust and hygiene (target: 2 weeks)

**Status 2026-10-09: implemented in the working tree, not yet committed or published.** Verified locally: `tsc` clean, lint clean, 34 Vitest tests, production build, and a manual browser pass (drag-move between resources, drag-create, popover, month-view scroll). See `CHANGELOG.md` > Unreleased.

- [x] Items 1-6: CSS scoped (`.rs-root`, `--rs-*` tokens, no preflight/`body`/`*` rules), `react`/`react-dom` peer-only, `tailwindcss` peer dropped, `react-dnd` replaced by Pointer Events, `"use client"` banner, `sideEffects`, `SchedulerEvent` (+ deprecated `Event` alias)
- [x] Bugs 7-13: zero-length click event, selection excluded last slot and stuck outside grid, day-view start/span, drop time-of-day, scroll target, midnight/calendar-day spans, derived (not copied) resources, linear lane packing
- [ ] Bug 14 (`onSlotClick` contract) and 15 (hard-coded "New Event"/random color) are deferred to P1 `onSlotSelect`
- [x] Extra bugs found while fixing:
  - bundle inlined React 19's `jsx-runtime` (broke React 18, which the package claimed to support); now external
  - day view showed only events live *right now*; events on the last day of week/month/quarter/year were hidden
  - `ocrs-gray-*`, `ocrs-white`, `ocrs-blue-50`, `ocrs-shadow-*` classes were never defined, so today and selection highlights never rendered
  - `resourceColumnWidth` prop did nothing (dynamic Tailwind class); scroll-to-date targeted a non-scrolling element and always scrolled to today
- [x] Vitest tests (dates, layout, creation, drag, scroll); GitHub Actions CI incl. bundle sanity checks
- [x] Truthful README, full prop table, CONTRIBUTING.md; false "Accessible" and "Timezone" claims removed; dead files deleted
- [ ] Playwright smoke test for drag-create/move (M)
- [ ] Changesets + CI publish with npm provenance; stop 13-releases-a-day (S)
- [ ] Issue templates, SECURITY.md, CODE_OF_CONDUCT (S)
- [ ] Verify touch drag on real devices (S)
- [ ] Bundle-size budget check in CI (S)

### P1: Table-stakes features (the research-backed list)
- [x] **Overlap/conflict control**: `eventOverlap`, `isValidDrop(event, placement)`, red footprint during drag, also enforced on resize and drag-create (done on branch `feat/overlap-resize`)
- [x] **Event resize** by edge drag + `onEventResize` (done on branch `feat/overlap-resize`; touch not yet verified on devices)
- [x] **Slot config**: `slotDuration`, `dayStartHour`/`dayEndHour` with snapping (done on branch `feat/slot-select-duration`), plus `weekStartsOn` and `hideWeekends` (done on branch `feat/view-controls`)
- [x] **Business hours / unavailable ranges** shading per resource (`businessHours`, `Resource.businessHours`, `Resource.unavailable`) and optional `blockUnavailable` (done on branch `feat/availability`). `Resource.capacity` (simultaneous bookings) feeds utilization only; it does not enforce anything
- [x] **Flat data model**: `events` prop with `resourceId` or `resourceIds`, alongside the nested `resource.events`; `resource.events` is optional on input (done on branch `feat/flat-events`)
- [x] **Slot selection callback** `onSlotSelect({ resourceId, start, end })` so apps open their own dialog (done on branch `feat/slot-select-duration`). The auto-create path (`onEventCreate`) still exists; deprecate it later
- [ ] **Resource grouping / hierarchy** with collapse (L)
- [x] **Now indicator** in the day view (`nowIndicator`, done on branch `feat/availability`; the sticky header and resource column already exist). Still open: zoom
- [x] **Keyboard navigation + ARIA grid** (done on branch `feat/keyboard-aria`): slot cursor, range selection, pick up / move / resize / drop events, live announcements, axe-core test. Still open: try with NVDA/JAWS/VoiceOver and publish an accessibility statement, i18n of announcements, start-edge resize and period paging by keyboard
- [ ] **Touch** drag/resize/create (M, comes with Pointer Events)
- [x] **Row virtualization** with a published, reproducible benchmark (done on branch `feat/virtualization`; `docs/scripts/bench.mjs`). 1,000 resources: 31,458 DOM nodes down to 424, drag 68.9 ms down to 7.1 ms per pointer move. Still open: column virtualization (year view), and the 0.5 s first render at 1,000 resources.
- [ ] **Column virtualization and a bigger benchmark** (L). Bryntum's public benchmark uses 2,500 resources x 50,000 events ([repo](https://github.com/bryntum/scheduler-performance)); run ours at that size and report the numbers honestly
- [~] **i18n**: `locale` (date-fns), `hour12`, `labels` for all UI and screen reader text, and `dir="rtl"` are done (branch `feat/i18n`). Still open: IANA `timeZone` prop
- [x] **Lazy loading**: `onRangeChange({ start, end, view })` for fetching per visible window (done on branch `feat/view-controls`)

### P2: Customisability (your stated goal)
- [ ] **Theming tokens**: `--rs-*` CSS variables, light/dark, density (compact/comfortable), documented theme gallery (M)
- [ ] **`classNames` and `components` override maps** (slots pattern), replacing the pile of `render*` props; keep the old ones as aliases (L)
- [ ] **Headless layer**: split pure logic (layout, conflicts, recurrence, date math) from UI; export `useSchedulerState` etc. (L)
- [x] **shadcn registry** (done on branch `feat/shadcn-registry`): generated `registry.json` so `npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler` copies the source into the user's repo. Verified in a fresh Vite 8 + Tailwind 4 + shadcn app. Merged to `main` and confirmed to resolve with `shadcn view`. Still open: tag a release and pin installs to it; submit to the community directory at registry.directory (form, POST or PR).
- [x] **Imperative ref API**: `scrollToTime`, `goTo`, `setView`, `getVisibleRange` (done on branch `feat/view-controls`)
- [x] **Recurring events** (done on branch `feat/recurring-events`): daily, weekly (byWeekday), monthly, yearly with interval, until, count and exceptions; wall-clock stable across DST; occurrences carry `seriesId`; `expandRecurrence` / `expandEvents` exported. Premium in MUI X, so a strong differentiator. Still open: RRULE strings and the rarer rules (bySetPos, byMonthDay, hourly), time zones, an "edit this and following" helper
- [~] **Utilization row** (done on branch `feat/utilization`): `showUtilization` draws a booked-vs-available bar per resource for the visible range, from business hours, `unavailable` and the new `Resource.capacity`; `getUtilization` is exported. Still open: a per-column histogram or total row across resources
- [ ] **ICS import/export, CSV, print stylesheet** (M)
- [x] **`findAvailableSlots(resources, { from, to, duration, step, businessHours, limit })`** helper, also for "everyone is free" with several resources (done on branch `feat/find-slots-and-hygiene`). Auto-assignment is still open
- [ ] **Recipes** with complete data models: room booking, shift roster, equipment, field service dispatch, project allocation (M each)
- [ ] Docs with `llms.txt` so AI coding assistants generate correct usage (S)

### P3: Later, decide by evidence
- Vue/Svelte adapters on top of the headless core (Schedule-X ships React/Angular/Vue/Svelte/Preact adapters, so multi-framework demand exists)
- Optional paid tier or sponsor-gated plugins (Schedule-X model: MIT core + premium plugins). Start with GitHub Sponsors; revisit after ~1k stars.
- Calendar sync (Google/Outlook) as separate example repo, not core

## 6. Go-to-market plan

### 6a. Prerequisites (do before announcing anything)
1. **Docs site on its own domain** (Fumadocs / Starlight / Docusaurus): live playground (StackBlitz), prop explorer, recipes, theming gallery, changelog. Real `<title>`/meta description/OG image/sitemap. Current demo page exposes almost none.
2. **README rewrite**: hero GIF of drag-create + move, 30-second quickstart, honest comparison table (vs FullCalendar Premium, MUI X, DayPilot Lite, react-big-scheduler), badges (npm, size, CI, license).
3. **GitHub polish**: topics (`react`, `scheduler`, `resource-scheduler`, `timeline`, `calendar`, `shadcn`, `tailwindcss`, `typescript`, `booking`), social preview image, enable Discussions, public roadmap board, `good first issue` + `help wanted` labels, `hacktoberfest` topic (October is live; verify this year's rules), release notes on every tag.
4. **npm polish**: keywords, provenance, `funding` field, small published bundle with a size badge.
5. **Registry**: ship the shadcn `registry.json` and put the one-line `shadcn add` command in the README hero.

### 6b. Content engine (SEO + trust)
Target long-tail queries (verify volumes with a keyword tool; I did not measure them):
- "FullCalendar resource timeline alternative", "free react resource timeline", "react room booking calendar", "react shift scheduling component", "react scheduler with resources tailwind".
- Comparison pages: vs FullCalendar, DayPilot Lite, MUI X Scheduler, react-big-scheduler. Keep them factual and dated, cite prices from vendor pages, re-check quarterly.
- Tutorials, each with a starter repo: "Room booking app with Next.js + Prisma", "Employee shift planner", "Clinic appointment board", "Equipment rental calendar". Each template doubles as SEO and distribution.
- Publish on own docs first, cross-post to dev.to (`#showdev` + 3 topical tags), Hashnode, Medium with canonical link.

### 6c. Launch sequence (estimate: 4-6 weeks from today)
| When | Action |
|---|---|
| Wk 0-2 | Ship P0. Tag Hacktoberfest-friendly issues. Soft-share in Reactiflux `#i-built-this` ([rules](https://reactiflux.com/promotion)) to get first real feedback. |
| Wk 3-4 | Ship v2 with overlap control, resize, keyboard, registry install. Seed 5-10 early users from your network; fix what they hit. |
| Launch week | Weekday morning US Eastern (8-11am): **Show HN** titled "Show HN: <Name>, a free MIT resource timeline for React", linking the GitHub repo directly. Same 48 hours: r/reactjs showcase thread (their rules require source code; do not spam), r/webdev, r/nextjs, dev.to post, X/Bluesky/LinkedIn thread with GIF. Concentrate the burst; star velocity matters more than total. Be in the comments all day. |
| Wk +1-3 | Product Hunt (secondary; evidence of OSS lift is thin). Pitch **React Status**, **This Week in React**, **JavaScript Weekly**, **Console.dev** (needs active maintenance and good docs: [criteria](https://console.dev/selection-criteria)). PRs to awesome lists and `best-of-react`. Submit to shadcn community lists. |
| Ongoing | Weekly release cadence with changelog; answer StackOverflow/Reddit "resource timeline" questions helpfully with disclosed affiliation; monthly tutorial; a "built with" showcase page; respond to every issue in <48h. |

Rules of thumb: be useful before promoting (Reactiflux/r/reactjs restrict marketing); never buy or swap stars; do not post in competitors' issue trackers except where directly relevant and disclosed.

### 6d. Metrics and targets (all estimates, calibrated on Schedule-X's ~8 months to ~800 stars)
| Metric | Today | 90 days | 12 months |
|---|---|---|---|
| GitHub stars | 3 | 300-600 | 1,500+ |
| npm downloads / month | 158 | 2,000 | 10,000+ |
| Non-author issues / PRs | 0 | 25 / 5 | 150 / 30 |
| Docs unique visitors / month | unknown | 3,000 | 20,000 |
| Registry installs | 0 | track | track |

Track star velocity, README-to-install conversion (npm + registry), time-to-first-response on issues.

## 7. Risks and counterarguments
- **Crowded and hard to differentiate on features alone.** Differentiate on license + shadcn ownership + modern DX, not on matching Bryntum.
- **Maintainer burnout is the main failure mode.** react-big-scheduler sits at 174 open issues and no push since 2023. Keep scope narrow (non-goals above); automate CI, releases, issue templates.
- **Performance claims are easy to get wrong.** Virtualization is the hardest item. Publish methodology with benchmarks or do not claim "fast".
- **MUI could open its timeline** or Schedule-X could add one. A moat of docs, recipes and community is more durable than any single feature.
- **A shadcn registry is not discovery by itself.** Installs work from `owner/repo/item` with no listing, but nobody finds it unless you point them at it. The community index registry.directory (79 registries when checked) accepts submissions; do that after the registry is on `main` and a release is tagged.
- **Tailwind/shadcn coupling shrinks the audience** to that ecosystem. Acceptable for focus; headless core (P2) is the hedge.
- **Star counts are noisy**; prefer downloads, registry installs and real issues as success signals.
- Data caveats: competitor prices and features change; vendor blogs are biased; I could not retrieve npm's package page (HTTP 403) and used the downloads API instead.

## 8. Decisions made on your behalf
1. Positioning = free/MIT/shadcn-native resource timeline (not "another calendar").
2. Replace react-dnd with Pointer Events (touch + resize + keyboard + no backend clash).
3. Ship both npm and shadcn-registry distribution.
4. Gantt-style dependencies and resource leveling are out of scope.
5. Core stays free; revisit paid plugins only after ~1k stars.
6. Fix and honesty pass (P0) comes before any promotion.

## Sources
- [FullCalendar Premium pricing](https://fullcalendar.io/premium)
- [MUI X Scheduler](https://mui.com/x/react-scheduler/) and [accessibility](https://mui.com/x/react-scheduler/accessibility/)
- [DayPilot for React](https://www.daypilot.org/react/), [DayPilot Lite](https://javascript.daypilot.org/open-source/)
- [DHTMLX scheduler comparison](https://dhtmlx.com/blog/best-react-scheduler-components-dhtmlx-bryntum-syncfusion-daypilot-fullcalendar/) (vendor)
- [LogRocket: best React scheduler libraries](https://blog.logrocket.com/best-react-scheduler-component-libraries/)
- [Cal.com: React scheduler libraries](https://cal.com/blog/react-scheduler-component-libraries) (vendor)
- [Bryntum scheduler performance benchmark](https://github.com/bryntum/scheduler-performance) (vendor)
- [react-big-scheduler on ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fstephenchou1017%2Freact-big-scheduler), [react-big-schedule](https://awesome.ecosyste.ms/projects/github.com%2Freact-scheduler%2Freact-big-schedule)
- [Schedule-X on Best of JS](https://bestofjs.org/projects/schedule-x), [ecosyste.ms](https://awesome.ecosyste.ms/projects/114764)
- [shadcn GitHub registries changelog (June 2026)](https://ui.shadcn.com/docs/changelog/2026-06-github-registries)
- [Saviom](https://www.saviom.com/solutions/software-evaluation/best/resource-scheduling-software/), [Guideflow](https://www.guideflow.com/blog/resource-scheduling-software), [eResource](https://newsite.eresourcescheduler.com/blog/top-resource-scheduling-tools-compared), [Syncfusion resource scheduling](https://www.syncfusion.com/scheduler-sdk/react-scheduler/resource-scheduling) (all vendor)
- [CoreUI keyboard accessibility](https://coreui.io/scheduler/docs/features/keyboard-accessibility/)
- [Reactiflux self-promotion policy](https://reactiflux.com/promotion), [Console.dev selection criteria](https://console.dev/selection-criteria)
- [GitHub stars playbook (HackerNoon)](https://hackernoon.com/the-ultimate-playbook-for-getting-more-github-stars), [Wasp: 6k stars in 6 months](https://dev.to/wasp/how-i-promoted-my-open-source-repo-to-6k-stars-in-6-months-3li9)
- Repo state: [github.com/mdobaid311/resource-scheduler](https://github.com/mdobaid311/resource-scheduler), npm registry + downloads API (queried 2026-10-09)
