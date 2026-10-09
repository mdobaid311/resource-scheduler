// Generates the shadcn registry (../registry.json) from the package source.
//
//   node scripts/build-registry.mjs           write ../registry.json
//   node scripts/build-registry.mjs --check   fail if it is out of date or broken
//
// Nothing is written by hand: the file list comes from
// src/components/ResourceScheduler, the dependency list from the imports in
// those files, and the styles from src/styles/tokens.css. That keeps the npm
// package and `shadcn add` in sync. See src/registry.test.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEDULER_DIR = "src/components/ResourceScheduler";
const TOKENS_FILE = "src/styles/tokens.css";
const INSTALL_DIR = "resource-scheduler"; // under the user's components alias
const REPO_URL = "https://github.com/mdobaid311/resource-scheduler";

// --- CSS ---------------------------------------------------------------------

/** Splits CSS into top-level `selector { body }` blocks (brace matching). */
const parseBlocks = (css) => {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let selector = "";
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (depth === 0) {
        selector = css.slice(start, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth < 0) throw new Error("Unbalanced braces in tokens.css");
      if (depth === 0) {
        blocks.push({ selector, body: css.slice(start, i) });
        start = i + 1;
      }
    }
  }
  if (depth !== 0) throw new Error("Unbalanced braces in tokens.css");
  if (css.slice(start).trim()) throw new Error("Trailing CSS outside a block");
  return blocks;
};

/** `a: b; c: d;` -> { a: "b", c: "d" }. Values keep their inner commas. */
const parseDeclarations = (body) => {
  const out = {};
  for (const decl of body.split(";")) {
    if (!decl.trim()) continue;
    const colon = decl.indexOf(":");
    if (colon < 0) throw new Error(`Bad declaration: ${decl.trim()}`);
    out[decl.slice(0, colon).trim()] = decl.slice(colon + 1).replace(/\s+/g, " ").trim();
  }
  return out;
};

const withoutDashes = (decls) =>
  Object.fromEntries(Object.entries(decls).map(([k, v]) => [k.replace(/^--/, ""), v]));

/**
 * tokens.css -> the registry's `cssVars` and `css` fields.
 * Understands only the shapes tokens.css uses and throws on anything else, so
 * a new kind of rule cannot be silently dropped from the registry.
 */
export const parseTokens = (cssText) => {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const cssVars = { theme: {}, light: {}, dark: {} };
  const rules = {};

  for (const { selector, body } of parseBlocks(css)) {
    if (selector === ":root") cssVars.light = withoutDashes(parseDeclarations(body));
    else if (selector === ".dark") cssVars.dark = withoutDashes(parseDeclarations(body));
    else if (selector === "@theme inline") cssVars.theme = withoutDashes(parseDeclarations(body));
    else if (selector.startsWith("@utility ")) rules[selector] = parseDeclarations(body);
    else if (selector === "@layer base") {
      rules[selector] = Object.fromEntries(
        parseBlocks(body).map((b) => [b.selector.replace(/\s+/g, " "), parseDeclarations(b.body)])
      );
    } else throw new Error(`tokens.css: unsupported rule "${selector}" (teach scripts/build-registry.mjs)`);
  }
  return { cssVars, css: rules };
};

// --- Files and dependencies --------------------------------------------------

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );

const toPosix = (p) => p.split(path.sep).join("/");
const isShipped = (file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file);

const importSpecifiers = (source) =>
  [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);

const packageName = (spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);

// React is provided by the host app.
const PROVIDED = new Set(["react", "react-dom"]);

// --- Registry ----------------------------------------------------------------

export const buildRegistry = ({ pkgDir = defaultPkgDir() } = {}) => {
  const schedulerDir = path.join(pkgDir, SCHEDULER_DIR);
  const repoPrefix = toPosix(path.relative(path.resolve(pkgDir, ".."), pkgDir));

  const rels = walk(schedulerDir)
    .map((f) => toPosix(path.relative(schedulerDir, f)))
    .filter(isShipped)
    .sort();

  const dependencies = new Set();
  for (const rel of rels) {
    for (const spec of importSpecifiers(fs.readFileSync(path.join(schedulerDir, rel), "utf8"))) {
      if (!spec.startsWith(".") && !PROVIDED.has(packageName(spec))) dependencies.add(packageName(spec));
    }
  }

  const { cssVars, css } = parseTokens(fs.readFileSync(path.join(pkgDir, TOKENS_FILE), "utf8"));

  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "resource-scheduler",
    homepage: REPO_URL,
    items: [
      {
        name: "resource-scheduler",
        type: "registry:block",
        title: "Resource Scheduler",
        description:
          "Resource timeline for React: drag, resize, overlap rules, slot selection, keyboard and screen reader support. Installs as source you own.",
        dependencies: [...dependencies].sort(),
        files: rels.map((rel) => ({
          path: `${repoPrefix}/${SCHEDULER_DIR}/${rel}`,
          type: "registry:component",
          target: `@components/${INSTALL_DIR}/${rel}`,
        })),
        cssVars,
        css,
        docs:
          `Added to components/${INSTALL_DIR}. Use it with: ` +
          `import { ResourceScheduler } from "@/components/${INSTALL_DIR}". ` +
          "Its design tokens (--rs-*) and utilities were added to your CSS and are scoped to .rs-root, " +
          "so your existing theme is untouched. Needs Tailwind v4 (and tw-animate-css for the popover animations, " +
          `which shadcn installs by default). Docs: ${REPO_URL}#readme`,
      },
    ],
  };
};

/** Problems that would make `shadcn add` produce a broken install. */
export const checkRegistry = (registry, { repoRoot = defaultRepoRoot() } = {}) => {
  const problems = [];
  for (const item of registry.items) {
    const byPath = new Map(item.files.map((f) => [f.path, f]));
    const shipped = new Set(item.files.map((f) => f.path));

    for (const file of item.files) {
      const abs = path.join(repoRoot, file.path);
      if (!fs.existsSync(abs)) {
        problems.push(`${item.name}: missing file ${file.path}`);
        continue;
      }
      if (!file.target) problems.push(`${item.name}: ${file.path} has no target`);

      const dir = path.posix.dirname(file.path);
      for (const spec of importSpecifiers(fs.readFileSync(abs, "utf8"))) {
        if (spec.startsWith(".")) {
          const base = path.posix.normalize(path.posix.join(dir, spec));
          const found = [".ts", ".tsx", "/index.ts", "/index.tsx"].some((ext) => shipped.has(base + ext));
          if (!found) problems.push(`${item.name}: ${file.path} imports ${spec}, which is not shipped`);
        } else if (!PROVIDED.has(packageName(spec)) && !item.dependencies.includes(packageName(spec))) {
          problems.push(`${item.name}: ${file.path} imports ${spec}, missing from dependencies`);
        }
      }
    }
    if (byPath.size !== item.files.length) problems.push(`${item.name}: duplicate file paths`);
  }
  return problems;
};

// --- CLI ---------------------------------------------------------------------

function defaultPkgDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}
function defaultRepoRoot() {
  return path.resolve(defaultPkgDir(), "..");
}

const render = (registry) => `${JSON.stringify(registry, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = path.join(defaultRepoRoot(), "registry.json");
  const registry = buildRegistry();
  const problems = checkRegistry(registry);

  if (process.argv.includes("--check")) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (current !== render(registry)) problems.push("registry.json is out of date. Run: npm run registry:build");
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    console.log(`registry.json is up to date (${registry.items[0].files.length} files)`);
  } else {
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    fs.writeFileSync(target, render(registry));
    console.log(`wrote ${target} (${registry.items[0].files.length} files)`);
  }
}
