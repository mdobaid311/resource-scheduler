# Launch kit

Drafts to edit and post yourself. Nothing here has been sent anywhere. The plan and reasoning are in [ROADMAP.md](ROADMAP.md) section 6; this file is the copy.

Every claim below can be checked in the repo or the docs. Keep it that way: replace numbers with your own once you have them, and do not add a benchmark claim until you have published one.

## Before you post anything

- [ ] Merge the open PRs, then publish v1.2.0 (the fix for the React 18 failure in 1.1.1) with a GitHub Release.
- [ ] Docs deployed (Vercel, Root Directory `docs`) and `https://resource-scheduler-demo.vercel.app/` serves them. Check `/og.png`, `/llms.txt`, `/sitemap-index.xml`.
- [ ] README hero GIF renders on the GitHub page (it loads from `main`).
- [ ] GitHub: repo description, topics (`react`, `scheduler`, `resource-scheduler`, `timeline`, `calendar`, `shadcn`, `tailwindcss`, `typescript`), social preview image (use `docs/public/og.png`), Discussions on, a few `good first issue` labels.
- [ ] `npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler` works in a fresh app (it resolves from `main`).
- [ ] Submit the registry at registry.directory.
- [ ] Be free for the day after posting: you answer comments all day.

## One-line pitch

> Free, MIT resource timeline for React. Drag to create, move and resize, and no double booking. Install from npm or copy the source with the shadcn CLI.

Proof points, all in the repo:

- Rows are resources, time runs across, five views (day, week, month, quarter, year).
- Drag create, move and resize on pointer events, with a red footprint when a drop is not allowed (`eventOverlap`, `isValidDrop`, business hours).
- Keyboard and screen reader support, with an axe-core test in CI.
- Themed with `--rs-*` CSS variables; scoped, so it does not leak into your app.
- Honest comparison page, dated, with what is missing (no recurring events, no virtualization yet).

## Show HN

Post a weekday morning US Eastern. Link the GitHub repo directly.

**Title:** `Show HN: Resource Scheduler, a free MIT resource timeline for React`

**First comment (post it right away):**

> I needed a resource timeline (rows are people or rooms, time across) for a booking app. FullCalendar's is a paid tier, MUI X's is Premium, DayPilot's free edition leaves out the parts I wanted, so I built one and put it under MIT.
>
> What it does: drag to create, move and resize events; reject double bookings with one prop; shade business hours and time off; keyboard and screen reader support; five views; dark mode through CSS variables. You can `npm install` it or copy the source into your repo with the shadcn CLI.
>
> What it does not do yet: recurring events, virtualization for thousands of rows (it is fine for tens to a few hundred, I have not published a benchmark), timezones, a Vue or Svelte version.
>
> Docs with live demos: https://resource-scheduler-demo.vercel.app/ . There is a comparison page with what the alternatives cost and where this one falls short. I would like to hear what blocks you from using it.

Expect: "why not FullCalendar?" (answer with the comparison page, factually), "does it scale?" (be straight: not virtualized yet), "license?" (MIT).

## r/reactjs and r/webdev

Read each sub's self-promotion rules first and post in the showcase thread. Disclose that you made it.

**Title:** `I built a free resource timeline component for React (MIT): drag, resize, no double booking`

**Body:**

> Gif of drag create, move, and a rejected double booking, then: it is a resource timeline (rows are people/rooms), like the paid FullCalendar and MUI X ones. MIT, works with React 18 and 19, install from npm or copy the source with shadcn. Docs and live demos: <link>. Source: <link>. Missing for now: recurring events and virtualization. Feedback welcome, especially on the API.

## X / Bluesky thread

1. GIF of the hero. "I made a free, MIT resource timeline for React. Drag to create, move, resize. Double bookings get a red outline and never reach your code."
2. "One prop: `eventOverlap={false}`. Add `businessHours` and `blockUnavailable` and closed hours and time off are protected too." (screenshot of the availability demo)
3. "Keyboard and screen reader support from day one, tested with axe in CI. Pick up an event with Space, move it with the arrows."
4. "Theme it with CSS variables. Dark mode is a second set of values." (screenshot of the theme demo)
5. "npm install resource-scheduler, or `npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler` to own the source. Docs with live demos: <link>. Honest comparison with FullCalendar, MUI X, DayPilot included."

## dev.to / Hashnode article

Title: **Building a resource timeline for React without paying for FullCalendar Premium**. Tag `#showdev`, plus react, typescript, webdev. Set the canonical URL to the docs page.

Outline: what a resource timeline is and why it is usually paid; the data model (resources, events, exclusive end times); drag and resize with pointer events and `elementsFromPoint`; making rejection visible (the red footprint); keyboard access for a drag interface; shipping it as an npm package and a shadcn registry; what is missing. End with the repo link and the comparison page.

Each tutorial in ROADMAP section 6b (room booking, shift planner, clinic board) can reuse this shape.

## Replies to have ready

- **Why not FullCalendar?** It is excellent. Its resource timeline is in the Premium tier (see the dated comparison page for the current price). This one is MIT and covers the resource timeline case only, not a general calendar.
- **Does it handle thousands of rows?** Not yet. It renders every resource row, so it suits tens to a few hundred. Virtualization is on the roadmap and I will publish a benchmark before claiming anything.
- **Recurring events?** Not yet. On the roadmap as an optional module.
- **Why Tailwind / shadcn?** The npm build ships a precompiled stylesheet, so no Tailwind setup is needed. The shadcn route copies the source if you want to edit it.
- **Can I use it from Next.js?** Yes. The bundle starts with `"use client"`.

## After launch

| When | Action |
|---|---|
| Week +1 to 3 | Pitch React Status, This Week in React, JavaScript Weekly, Console.dev (read its criteria first). PRs to awesome lists and best-of-react. Product Hunt is optional. |
| Ongoing | Answer "resource timeline" questions on Stack Overflow and Reddit helpfully, with disclosure. Respond to every issue within 48 hours. Weekly release with a changelog. |

Track star velocity, npm downloads and registry installs, and time to first response on issues. Targets are in ROADMAP section 6d and are estimates.

Rules: be useful before promoting; never buy or swap stars; no spam in other projects' trackers.
