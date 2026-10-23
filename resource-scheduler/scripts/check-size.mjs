// Fails when the built package grows past its budget or contains files that
// should not be published. Run after `npm run build` (CI does).
//
//   npm run check:size
//
// Budgets are gzip bytes (JS measured minified: the files in dist are not) with
// about 20% headroom over the size at the time they were set (JS 16.6 KB, CSS 5.7 KB). Raise them on purpose, in a PR that
// says why, not by accident. JS went from 20 KB to 22 KB for resource groups
// (20.1 KB used, about 10% headroom), then to 24 KB for ICS and CSV export
// (21.3 KB used, plus touch selection waiting to merge). The file format
// helpers then moved to their own entry point (resource-scheduler/exchange,
// budget below), which took the main bundle back to 21.7 KB. The exchange entry
// is 3.9 KB with the .ics import (1.4 KB before it). The main bundle
// went to 24 KB for the timeZone prop (22.5 KB used). Then to 26 KB for the
// column totals, the components map and column virtualization (24.2 KB used).
//
// An entry is measured with everything it loads: its own file plus the chunks it
// imports (code the entries share, `name-<hash>.js`), gzipped as one. The main
// entry and the headless entry (resource-scheduler/headless) share most of the
// scheduling logic, so that sits in a chunk that both load, and counting the
// entry file alone would stop seeing it. The budget of the headless entry is
// what a server or another framework pays for the whole scheduling logic
// (8.7 KB when it was set at 10 KB). The state store and the useSchedulerState
// hook then added 0.9 KB to both: the main bundle went from 26 KB to 28 KB
// (26.2 KB used) and the headless entry from 10 KB to 11 KB (9.6 KB used).
//
// Then to 33 KB for the features merged together after that: dragging groups
// and resources to reorder them (3.6 KB: the helpers 1.5 KB, the pointer and
// keyboard hook 1.4 KB, the grips and labels the rest), suggestResources
// (0.9 KB), print support and keyboard paging with start-edge resize (0.4 KB
// each). 31.0 KB was used before keyboard paging, so about 5% of headroom is
// left; the next feature should look for what to take out before it raises
// this again.
//
// The exchange entry went from 5 KB to 6.5 KB for parseRRule and toRRule (the
// RRULE reader and writer that icsToEvents and eventsToICS now share, with the
// month day, position and hourly rules and an error message for every part it
// cannot show): 4.5 KB before, 5.8 KB used.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { transformWithEsbuild } from "vite";

const BUDGET = {
  "dist/index.esm.js": 33_000,
  "dist/exchange.esm.js": 6_500,
  "dist/headless.esm.js": 11_000,
  "dist/resource-scheduler.css": 7_000,
};
// Code the entries share is split into chunks, `name-<hash>.js` (and `.cjs`).
const SHARED_CHUNK = /^[A-Za-z0-9_]+-[A-Za-z0-9_-]{8}[.]c?js$/;
const EXPECTED_FILES = new Set([
  "index.cjs",
  "index.esm.js",
  "index.d.ts",
  "exchange.cjs",
  "exchange.esm.js",
  "exchange.d.ts",
  "headless.cjs",
  "headless.esm.js",
  "headless.d.ts",
  "resource-scheduler.css",
]);

let failed = false;

for (const name of fs.readdirSync("dist")) {
  if (!EXPECTED_FILES.has(name) && !SHARED_CHUNK.test(name)) {
    console.error(`dist/${name} would be published but should not be (copied from public/?)`);
    failed = true;
  }
}

// The file and the chunks it imports, however deep.
const closure = (entry) => {
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const [, spec] of source.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)) {
      visit(path.posix.join(path.posix.dirname(file), spec));
    }
  };
  visit(entry);
  return [...files];
};

for (const [file, max] of Object.entries(BUDGET)) {
  const files = file.endsWith(".js") ? closure(file) : [file];
  // The published JS is not minified (packages on npm should not ship minified
  // code), so measure it the way a consumer's bundler ships it: minified, then gzipped.
  const parts = await Promise.all(
    files.map(async (f) => {
      const code = fs.readFileSync(f, "utf8");
      return file.endsWith(".js") ? (await transformWithEsbuild(code, f, { minify: true, format: "esm" })).code : code;
    })
  );
  const source = Buffer.from(parts.join("\n"));
  const size = zlib.gzipSync(source, { level: 9 }).length;
  const ok = size <= max;
  const chunks = files.length - 1;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${file}${chunks ? ` + ${chunks} shared chunk${chunks === 1 ? "" : "s"}` : ""}: ${size} bytes gzip (budget ${max})`
  );
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
