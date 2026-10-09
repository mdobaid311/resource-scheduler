// Loads the built package by its own name, the way a consumer does, through
// both entry points of the `exports` map: `import` (ESM) and `require` (CJS).
// Run after `npm run build` (CI does).
//
//   npm run check:entries
//
// It catches a CommonJS file that Node treats as ESM (package.json has
// "type": "module", so a CJS bundle must not end in .js), a missing file, and
// an export that went missing from one of the two builds.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const EXPECTED = ["ResourceScheduler", "ViewType", "defaultLabels", "expandRecurrence", "findAvailableSlots"];

let failed = false;
const check = (label, mod) => {
  const missing = EXPECTED.filter((name) => mod[name] === undefined);
  if (typeof mod.ResourceScheduler !== "object" && typeof mod.ResourceScheduler !== "function") {
    missing.push("ResourceScheduler is not a component");
  }
  console.log(`${missing.length ? "FAIL" : "ok  "} ${label}${missing.length ? `: ${missing.join(", ")}` : ""}`);
  if (missing.length) failed = true;
};

try {
  check("import 'resource-scheduler' (ESM)", await import("resource-scheduler"));
} catch (error) {
  console.log(`FAIL import 'resource-scheduler' (ESM): ${error.message}`);
  failed = true;
}

try {
  check("require('resource-scheduler') (CJS)", require("resource-scheduler"));
} catch (error) {
  console.log(`FAIL require('resource-scheduler') (CJS): ${error.message}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
