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
// exchange and headless entries must not, because functions from a "use client"
// module cannot be called from server code.
//
// Those two entries are also read file by file: everything they load, shared
// chunks included, may import only the packages listed for them (date-fns), so
// React, a UI library or a stylesheet cannot get in through a chunk.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const SHARED_CHUNK = /^[A-Za-z0-9_]+-[A-Za-z0-9_-]{8}[.]c?js$/;

const ENTRIES = [
  {
    specifier: "resource-scheduler",
    files: ["dist/index.esm.js", "dist/index.cjs"],
    exports: ["ResourceScheduler", "ViewType", "defaultLabels", "expandRecurrence", "findAvailableSlots", "utcToZoned", "zonedToUtc"],
    component: "ResourceScheduler",
    client: true,
  },
  {
    specifier: "resource-scheduler/exchange",
    files: ["dist/exchange.esm.js", "dist/exchange.cjs"],
    exports: ["eventsToICS", "eventsToCSV", "icsToEvents"],
    client: false,
    packages: ["date-fns"],
  },
  {
    specifier: "resource-scheduler/headless",
    files: ["dist/headless.esm.js", "dist/headless.cjs"],
    exports: ["ViewType", "getColumns", "getVisibleResources", "layoutEvents", "getRowHeights", "getMovePlacement", "buildI18n"],
    client: false,
    packages: ["date-fns"],
    // Runs in this plain Node process: no window, no document, no React.
    smoke: (m) => {
      const week = m.getColumns(new Date(2026, 9, 7), m.ViewType.Week);
      const event = { id: "e", title: "e", startDate: new Date(2026, 9, 7, 9), endDate: new Date(2026, 9, 7, 10) };
      const [placed] = m.layoutEvents([event], week, m.ViewType.Week);
      return week.length === 7 && placed?.startPosition === 3 && placed.lane === 0
        ? []
        : ["getColumns and layoutEvents give the wrong answer"];
    },
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
  if (!problems.length) problems.push(...(entry.smoke?.(mod) ?? []));
  report(label, problems);
};

// What a built file loads: `from "x"` and `import "x"` (ESM), `require("x")` (CJS).
const loads = (source) => [
  ...[...source.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ...[...source.matchAll(/\bimport\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ...[...source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
];

// The files an entry loads (itself and the chunks it imports, however deep) and the packages those import.
const closure = (entryFile) => {
  const files = new Set();
  const packages = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const spec of loads(readFileSync(file, "utf8"))) {
      if (spec.startsWith(".")) visit(path.posix.join(path.posix.dirname(file), spec));
      else packages.add(spec);
    }
  };
  visit(entryFile);
  return { files: [...files], packages: [...packages] };
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

    if (!entry.packages) continue;
    const { files, packages } = closure(file);
    const allowed = (name) => entry.packages.some((p) => name === p || name.startsWith(`${p}/`));
    report(
      `${file} loads only ${entry.packages.join(", ")} (${files.length} file${files.length === 1 ? "" : "s"})`,
      [
        ...packages.filter((name) => !allowed(name)).map((name) => `imports ${name}`),
        ...files.filter((f) => !/[.]c?js$/.test(f)).map((f) => `loads ${f}`),
        ...files.filter((f) => readFileSync(f, "utf8").trimStart().startsWith('"use client"')).map((f) => `${f} says "use client"`),
      ]
    );
  }
}

// Code the entries share is a chunk (`name-<hash>.js`). The exchange and headless entries import
// it, so it must not carry the banner either.
for (const file of readdirSync("dist").filter((f) => SHARED_CHUNK.test(f))) {
  const hasBanner = readFileSync(`dist/${file}`, "utf8").trimStart().startsWith('"use client"');
  report(`dist/${file} has no "use client"`, hasBanner ? ["banner must not be there"] : []);
}

process.exit(failed ? 1 : 0);
