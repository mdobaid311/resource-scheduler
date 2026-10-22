# Marketing tracker

Where Resource Scheduler is published, what has to change when it is updated, and where it could be posted next. Update this file in the same PR as any release or new post. Dates are when we did it; statuses are what we checked, not guesses.

## 1. Published (as of 2026-10-14)

### Product surfaces

| Place | URL | Notes |
|---|---|---|
| npm package | https://www.npmjs.com/package/resource-scheduler | Latest 1.6.0 (2026-10-22), published through the GitHub Release `v1.6.0` (`release.yml`, provenance) |
| GitHub repo | https://github.com/mdobaid311/resource-scheduler | MIT. Release notes on https://github.com/mdobaid311/resource-scheduler/releases |
| Docs site | https://resource-scheduler-docs.vercel.app | Vercel project `resource-scheduler-docs`, Root Directory `docs`, Install Command `npm --prefix ../resource-scheduler ci && npm ci`. Redeploys on every push to `main`. `llms.txt` and the sitemap are served from it |
| Launch video | https://resource-scheduler-docs.vercel.app/launch.mp4 | 42 s, 1920x1080, 7.7 MB, from `demo/launch` (Remotion). Poster: `/launch-poster.png`. Source files `docs/public/launch.mp4` and `launch-poster.png`. Used in both READMEs (npm shows it after the next release), the docs home page and the top of every cross-post. **Use it in every new post:** link the poster to the mp4 (dev.to and Hashnode cannot embed mp4; upload to YouTube to get a real embed, and X, Bluesky, LinkedIn and Reddit take the file directly) |
| Showcase | https://resource-scheduler-docs.vercel.app/showcase/ | A page of the docs site (`docs/src/showcase/`), merged in from the old `resource-scheduler-example/` app. The old `resource-scheduler-demo.vercel.app` Vercel project was deleted on 2026-10-22, so that URL no longer resolves. Posts that linked to it need the new URL |
| shadcn registry | `npx shadcn@latest add mdobaid311/resource-scheduler/resource-scheduler` | Generated `registry.json` at the repo root. Not pinned to a release yet |
| Starter app | https://github.com/mdobaid311/resource-scheduler/tree/main/resource-scheduler-rooms-starter | `npx degit mdobaid311/resource-scheduler/resource-scheduler-rooms-starter rooms`. CI builds it against the published package |

### Cross-posts (all use the docs page as the canonical URL)

Accounts: dev.to `mdobaid311`, Hashnode blog `mdobaid311.hashnode.dev` (free plan). The dev.to posts are marked "Fully Autonomous" in the AI disclosure.

| Tutorial | Canonical (docs) | dev.to | Hashnode |
|---|---|---|---|
| Free React resource timeline | /tutorials/free-react-resource-timeline/ | https://dev.to/mdobaid311/a-free-react-resource-timeline-a-fullcalendar-premium-alternative-25fb | https://mdobaid311.hashnode.dev/a-free-react-resource-timeline-a-fullcalendar-premium-alternative |
| React room booking calendar | /tutorials/react-room-booking-calendar/ | https://dev.to/mdobaid311/react-room-booking-calendar-no-double-booking-1p94 | https://mdobaid311.hashnode.dev/react-room-booking-calendar-no-double-booking |
| React shift planner | /tutorials/react-shift-planner/ | https://dev.to/mdobaid311/react-shift-planner-employee-roster-1m6p | https://mdobaid311.hashnode.dev/react-shift-planner-employee-roster |
| React clinic appointment board | /tutorials/react-clinic-appointment-board/ | https://dev.to/mdobaid311/react-clinic-appointment-board-4ag8 | https://mdobaid311.hashnode.dev/react-clinic-appointment-board |
| React equipment rental calendar | /tutorials/react-equipment-rental-calendar/ | https://dev.to/mdobaid311/react-equipment-rental-calendar-47fe | https://mdobaid311.hashnode.dev/react-equipment-rental-calendar |
| Room booking app with Next.js and Prisma | /tutorials/react-room-booking-nextjs-prisma/ | https://dev.to/mdobaid311/room-booking-app-with-nextjs-and-prisma-36j4 | https://mdobaid311.hashnode.dev/room-booking-app-with-next-js-and-prisma |

The posts are copies of the docs pages made by `docs/scripts/tutorial-to-markdown.mjs` (`npm run cross-post` in `docs/`): the demo becomes a "See it running live" link, relative links become absolute, and `title="..."` code fences become a bold file name. They do not update by themselves. On 2026-10-15 all 12 posts got the launch-video poster link as their first line (typed into the editor; on dev.to focus the textarea first, on Hashnode switch to Markdown mode and use Update). The npm page has had it since 1.5.0 (2026-10-15).

### Not posted anywhere yet

Nothing has been posted to Show HN, Reddit, X, Bluesky, LinkedIn, Product Hunt, Medium or the newsletters below. The drafts for those are in `LAUNCH.md`.

Tried on 2026-10-14: Reddit cannot be opened by the browser tools Claude uses (blocked for safety), and on Hacker News a Show HN submission from the signed-in account was refused with "Update re Show HNs" (news.ycombinator.com/showlim): Show HN is temporarily restricted for accounts new to the site. Do not work around it; build up some history first (read and comment on threads, in line with the HN guidelines) and try again later. So both are post-it-yourself. HN's guidelines also ask for human-written comments, so the first comment is yours to paste from `LAUNCH.md`. The GitHub repo description and homepage were set that day ("Free MIT resource timeline for React...").

## 2. When something changes

**New release** (CONTRIBUTING.md has the flow):
1. Merge the version PR, then publish a GitHub Release `v<version>`. Check that npm shows it.
2. Docs redeploy on their own. Check `docs/public/llms.txt` lists any new API.
3. Look for version claims in the posts: the Next.js tutorial has a "Versions" note (Next.js 15, Prisma 6); the starter's `package.json` depends on `resource-scheduler@^1.5.0`.
4. If a tutorial changed, regenerate its markdown with `npm run cross-post -- <slug>` in `docs/` (output in `docs/.cross-post/`, no slug means all), then paste it into the dev.to and Hashnode copies (dev.to: the post's Edit button; Hashnode: Dashboard, then the article; Hashnode has a Markdown mode). Keep the canonical URL.
5. Add a row to the tables above if a new place was used, and note the date.

**New tutorial:** add the docs page, then cross-post it with the canonical URL, then add a row to section 1.

**Docs domain change:** replace `resource-scheduler-docs.vercel.app` everywhere (`grep -r` the repo, then fix the canonical URLs on dev.to and Hashnode by hand).

## 3. Where else we could post

Check each site's self-promotion rules first. Disclose that you are the author. Posting everywhere in one day looks like spam; spread it over a few weeks.

### Launch day (concentrate within 48 hours)
- **Hacker News, Show HN**: link the GitHub repo directly; weekday morning US Eastern; be in the comments.
- **Reddit**: r/reactjs (showcase thread, source code required), r/webdev, r/nextjs, r/javascript, r/opensource. Read each sub's rules.
- **X, Bluesky, LinkedIn**: a thread with the hero GIF (draft in `LAUNCH.md`).
- **Reactiflux Discord**, `#i-built-this` ([rules](https://reactiflux.com/promotion)).

### Directories and lists (low effort, lasting traffic)
- **registry.directory**: submitted 2026-10-22 through their form (pointing at the raw `registry.json` on GitHub). The reply was "Received"; they read each submission and the registry has to resolve with real, installable content, so check https://registry.directory for a listing. If it is rejected, publish built registry files (`/r/*.json`) on the docs site and resubmit.
- **Awesome lists and rankings**: awesome-react-components, best-of-react, Best of JS (bestofjs.org), awesome shadcn lists.
- **AlternativeTo** and **Product Hunt** (optional; the evidence of open source lift is thin).
- **GitHub itself**: repo topics, a social preview image, `good first issue` and `help wanted` labels, Discussions. Not checked in this session; the owner confirms each.

### Newsletters (pitch once there is some traction and active maintenance)
- React Status, This Week in React, JavaScript Weekly, Console.dev ([criteria](https://console.dev/selection-criteria)), Bytes.

### More writing
- **Medium** (import a post with the canonical link set), **daily.dev** (submit the dev.to posts), **Indie Hackers**, dev.to and Hashnode **series**, or comments on related posts.
- **Answers on Stack Overflow and Reddit** to "resource timeline" and "room booking calendar" questions, with disclosure.
- A **short demo video** (YouTube) of drag, resize and the red refusal.

### Search
- The long-tail queries in ROADMAP section 6b are below Google Trends' reporting threshold; only "react scheduler" shows measurable interest. Real monthly volumes need a paid keyword tool (Ahrefs, Semrush).
- **Google Search Console**: property `https://resource-scheduler-docs.vercel.app/` added and verified 2026-10-22 by the HTML file `docs/public/googlef36acfe511983b52.html` (do not delete it or verification is lost). Sitemap `sitemap-index.xml` submitted the same day; it showed "Couldn’t fetch" at first and by the end of that day read Success with 41 discovered pages.
- **Bing Webmaster Tools**: the site was imported from Search Console on 2026-10-22 (read-only access granted to Bing). Submitting `sitemap-index.xml` failed three times (the last after the docs deploy) with "An unexpected error occurred on the server side"; retry later, and check whether Bing picked it up from Search Console.
- **GitHub social preview**: `docs/public/og.png` (1200x630) uploaded in the repo settings on 2026-10-22. Topics, the labels `good first issue` and `help wanted`, and Discussions were already in place.
- **SEO audit (2026-10-22, from `.claude/SEO_Guide.md`)**: all 41 sitemap URLs return 200 with a self canonical, one H1, no `noindex`, and a unique title and description. Eight descriptions under 110 characters were lengthened. Search Console: sitemap Success (41), home page "URL is on Google", Page indexing report still "Processing data". Bing: sitemap list is empty; a retry of the submit was not done (the browser tool was refused permission), so submit `sitemap-index.xml` (or `sitemap-0.xml`) by hand. The sitemap has no `lastmod`; optional.
