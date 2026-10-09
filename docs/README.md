# Resource Scheduler docs

The documentation site for [Resource Scheduler](../README.md), built with [Astro Starlight](https://starlight.astro.build). Every demo on it is the real component running live.

```bash
# the demos import the package source, so install both
npm --prefix ../resource-scheduler ci
npm ci

npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview
```

## How it fits together

- **Pages** are MDX in `src/content/docs/`. The sidebar is defined in `astro.config.mjs`.
- **Demos** are React components in `src/components/demos/`, embedded with `client:only="react"`. They import the scheduler through the `@scheduler` alias, which points at `../resource-scheduler/src/components/ResourceScheduler`, so the docs always show the code on the branch. Sample data is built relative to today, so demos never go stale.
- **Styles**: `src/styles/scheduler.css` imports the package stylesheet and tells Tailwind where the component classes live. No preflight is imported, so Starlight is untouched.

## Deploying

Any static host works. On Vercel, import the repository and set the **Root Directory** to `docs` (the framework is detected as Astro), with these environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `SITE_URL` | `https://resource-scheduler-demo.vercel.app` | Public origin. Used for the sitemap, canonical URLs and the social image |
| `DOCS_BASE` | `/` | Base path, for example `/resource-scheduler` on GitHub Pages |

The install step must also install the package, because the demos import its source: set the Install Command to `npm --prefix ../resource-scheduler ci && npm ci`.

`public/robots.txt` names the sitemap with the default origin; update it if you deploy elsewhere.

## The README animation and social image

`public/hero.gif` (the README hero) and `public/og.png` (the social card) are generated, not drawn: `scripts/record-hero.mjs` drives your installed Chrome with real mouse input against the built site, with a fixed clock and a seeded random generator so a re-run gives the same picture.

```bash
npm run build
npm run preview -- --port 4399     # leave this running
npm run record                     # rewrites public/hero.gif and public/og.png
```

Set `CHROME_PATH` if Chrome is not in a standard location, or `DOCS_URL` if the preview runs elsewhere. Re-record whenever the component's look changes.
