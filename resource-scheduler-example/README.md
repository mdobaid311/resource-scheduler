# Resource Scheduler showcase

All six recipes in one dashboard (room booking, shift roster, equipment, field service, project allocation, utilization), with a light / dark / system theme switch, accent presets and a density toggle. The choices are remembered in `localStorage` and the open recipe is in the URL hash.

It is built from the package source in `../resource-scheduler` and the recipe demos in `../docs/src/components/demos`, so it shows what is on `main`, and each recipe exists once.

```bash
(cd ../resource-scheduler && npm ci)
npm install
npm run dev
```

The theme is `data-theme` on `<html>` and the accents are `--rs-*` variables set on `<html>` (see `src/App.tsx`); the page itself is styled with the same tokens. The guide: <https://resource-scheduler-docs.vercel.app/guides/theming/>.
