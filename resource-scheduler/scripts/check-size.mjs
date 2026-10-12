// Fails when the built package grows past its budget or contains files that
// should not be published. Run after `npm run build` (CI does).
//
//   npm run check:size
//
// Budgets are gzip bytes with about 20% headroom over the size at the time
// they were set (JS 16.6 KB, CSS 5.7 KB). Raise them on purpose, in a PR that
// says why, not by accident. JS went from 20 KB to 22 KB for resource groups
// (20.1 KB used, about 10% headroom), then to 24 KB for ICS and CSV export
// (21.3 KB used, plus touch selection waiting to merge). The file format
// helpers then moved to their own entry point (resource-scheduler/exchange,
// budget below), which took the main bundle back to 21.7 KB. The exchange entry
// is 3.9 KB with the .ics import (1.4 KB before it). The main bundle
// went to 24 KB for the timeZone prop (22.5 KB used). Then to 26 KB for the
// column totals, the components map and column virtualization (24.2 KB used).
// Then to 29 KB for dragging groups and resources to reorder them: the pure
// helpers (reorderGroup, moveResource, the hit test and keyboard steps, 1.5 KB),
// the pointer and keyboard hook (1.4 KB) and the grips (27.8 KB used).
import fs from "node:fs";
import zlib from "node:zlib";

const BUDGET = {
  "dist/index.esm.js": 29_000,
  "dist/exchange.esm.js": 5_000,
  "dist/resource-scheduler.css": 7_000,
};
// Code both entries use is split into one chunk, `name-<hash>.js` (and `.cjs`).
const SHARED_CHUNK = /^[A-Za-z0-9_]+-[A-Za-z0-9_-]{8}[.]c?js$/;
const CHUNKS_BUDGET = 1_500;
const EXPECTED_FILES = new Set([
  "index.cjs",
  "index.esm.js",
  "index.d.ts",
  "exchange.cjs",
  "exchange.esm.js",
  "exchange.d.ts",
  "resource-scheduler.css",
]);

let failed = false;

for (const name of fs.readdirSync("dist")) {
  if (!EXPECTED_FILES.has(name) && !SHARED_CHUNK.test(name)) {
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

// The chunk is loaded by whichever entry is used, so its ESM size counts once.
const chunks = fs.readdirSync("dist").filter((name) => SHARED_CHUNK.test(name) && name.endsWith(".js"));
const chunkSize = chunks.reduce((sum, name) => sum + zlib.gzipSync(fs.readFileSync(`dist/${name}`), { level: 9 }).length, 0);
const chunksOk = chunkSize <= CHUNKS_BUDGET;
console.log(`${chunksOk ? "ok  " : "FAIL"} shared chunks: ${chunkSize} bytes gzip (budget ${CHUNKS_BUDGET})`);
if (!chunksOk) failed = true;

process.exit(failed ? 1 : 0);
