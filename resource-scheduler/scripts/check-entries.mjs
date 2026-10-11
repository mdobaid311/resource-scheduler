// Loads the built package by its own name, the way a consumer does, through
// every entry point of the `exports` map and both of its conditions: `import`
// (ESM) and `require` (CJS). Run after `npm run build` (CI does).
//
//   npm run check:entries
//
// It catches a CommonJS file that Node treats as ESM (package.json has
// "type": "module", so a CJS bundle must not end in .js), a missing file, an
// export that went missing from one of the builds, and a "use client" banner
// where it does not belong: the main entry has it (it holds components), the
// exchange entry must not, because functions from a "use client" module cannot
// be called from server code.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const ENTRIES = [
  {
    specifier: "resource-scheduler",
    files: ["dist/index.esm.js", "dist/index.cjs"],
    exports: ["ResourceScheduler", "ViewType", "defaultLabels", "expandRecurrence", "findAvailableSlots"],
    component: "ResourceScheduler",
    client: true,
  },
  {
    specifier: "resource-scheduler/exchange",
    files: ["dist/exchange.esm.js", "dist/exchange.cjs"],
    exports: ["eventsToICS", "eventsToCSV"],
    client: false,
  },
];

let failed = false;
const report = (label, problems) => {
  console.log(`${problems.length ? "FAIL" : "ok  "} ${label}${problems.length ? `: ${problems.join(", ")}` : ""}`);
  if (problems.length) failed = true;
};

const check = (label, entry, mod) => {
  const problems = entry.exports.filter((name) => mod[name] === undefined);
  if (entry.component && typeof mod[entry.component] !== "object" && typeof mod[entry.component] !== "function") {
    problems.push(`${entry.component} is not a component`);
  }
  report(label, problems);
};

for (const entry of ENTRIES) {
  try {
    check(`import '${entry.specifier}' (ESM)`, entry, await import(entry.specifier));
  } catch (error) {
    report(`import '${entry.specifier}' (ESM)`, [error.message]);
  }

  try {
    check(`require('${entry.specifier}') (CJS)`, entry, require(entry.specifier));
  } catch (error) {
    report(`require('${entry.specifier}') (CJS)`, [error.message]);
  }

  for (const file of entry.files) {
    const hasBanner = readFileSync(file, "utf8").trimStart().startsWith('"use client"');
    report(
      `${file} ${entry.client ? "starts with" : "has no"} "use client"`,
      hasBanner === entry.client ? [] : [entry.client ? "banner is missing" : "banner must not be there"]
    );
  }
}

process.exit(failed ? 1 : 0);
