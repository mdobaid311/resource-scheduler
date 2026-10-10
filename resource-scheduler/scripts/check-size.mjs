// Fails when the built package grows past its budget or contains files that
// should not be published. Run after `npm run build` (CI does).
//
//   npm run check:size
//
// Budgets are gzip bytes with about 20% headroom over the size at the time
// they were set (JS 16.6 KB, CSS 5.7 KB). Raise them on purpose, in a PR that
// says why, not by accident. JS went from 20 KB to 22 KB for resource groups
// (20.1 KB used, about 10% headroom), then to 24 KB for ICS and CSV export
// (21.3 KB used, plus touch selection waiting to merge). If it keeps growing,
// move the exports to their own entry point instead of raising this again.
import fs from "node:fs";
import zlib from "node:zlib";

const BUDGET = {
  "dist/index.esm.js": 24_000,
  "dist/resource-scheduler.css": 7_000,
};
const EXPECTED_FILES = new Set([
  "index.cjs",
  "index.esm.js",
  "index.d.ts",
  "resource-scheduler.css",
]);

let failed = false;

for (const name of fs.readdirSync("dist")) {
  if (!EXPECTED_FILES.has(name)) {
    console.error(`dist/${name} would be published but should not be (copied from public/?)`);
    failed = true;
  }
}

for (const [file, max] of Object.entries(BUDGET)) {
  const size = zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
  const ok = size <= max;
  console.log(`${ok ? "ok  " : "FAIL"} ${file}: ${size} bytes gzip (budget ${max})`);
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
