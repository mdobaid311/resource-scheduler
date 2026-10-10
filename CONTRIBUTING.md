# Contributing

Thanks for helping. The library lives in [`resource-scheduler/`](resource-scheduler) and a demo app in [`resource-scheduler-example/`](resource-scheduler-example).

## Setup

```bash
git clone https://github.com/mdobaid311/resource-scheduler.git
cd resource-scheduler/resource-scheduler
npm install
npm run dev     # local playground
```

## Before you open a PR

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run check:size   # gzip budget, and no stray files in dist/
```

CI runs the same commands on Node 20 and 22. It also builds the docs and runs a smoke test in Chrome that drives the live demos with real mouse, keyboard and touch input; locally, run `npm run build` then `npm run preview -- --port 4399` in `docs/`, and `npm run smoke` in a second terminal. Add a line to `CHANGELOG.md` under Unreleased for anything users can see. Please follow the [code of conduct](CODE_OF_CONDUCT.md); security problems go through [SECURITY.md](SECURITY.md), not a public issue.

## Guidelines

- **Tests first for logic.** Date math, layout and interaction hooks live in `src/components/ResourceScheduler/utils` and `hooks`, each with a `*.test.ts(x)` next to it. Bug fixes should come with a test that fails without the fix.
- **Don't leak styles.** The shipped CSS must not contain global resets, `body`/`html` rules or unprefixed variables. Use `--rs-*` tokens and the `rs-root` class; CI checks the built CSS.
- **The shadcn registry is generated.** `registry.json` (repo root) is built from the files in `src/components/ResourceScheduler` and `src/styles/tokens.css`. After adding, removing or renaming a file there, or changing the tokens, run `npm run registry:build` and commit the result; `npm test` fails when it is stale or when a shipped file imports something that is not shipped. Shipped code must compile under `verbatimModuleSyntax` and `erasableSyntaxOnly` (use `import type` for types, no `enum`).
- **No new runtime dependencies** without discussion. Keep `react`/`react-dom` as peers.
- Keep PRs small and focused; describe the user-visible change.
- See [ROADMAP.md](ROADMAP.md) for planned work. Issues labelled `good first issue` are a good start.
