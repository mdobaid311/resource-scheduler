import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRegistry,
  checkRegistry,
  parseTokens,
} from "../scripts/build-registry.mjs";

// The shadcn registry (../registry.json at the repo root) is generated from the
// package source. These tests keep it honest: `shadcn add` must not install a
// broken or out-of-date copy.

const repoRoot = path.resolve(__dirname, "../..");
const registryPath = path.join(repoRoot, "registry.json");
// The generator is plain JS, so give its output the shape the assertions use.
interface Tokens {
  cssVars: Record<"light" | "dark" | "theme", Record<string, string>>;
  css: Record<string, Record<string, unknown>>;
}
interface RegistryItem extends Tokens {
  files: { path: string; target: string }[];
  dependencies: string[];
}
const item = () => buildRegistry().items[0] as unknown as RegistryItem;
const parse = (css: string) => parseTokens(css) as unknown as Tokens;

describe("registry.json", () => {
  it("is committed and matches what the generator produces", () => {
    const committed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    expect(committed, "run: npm run registry:build").toEqual(buildRegistry());
  });

  it("has no broken files, unshipped imports or missing dependencies", () => {
    expect(checkRegistry(buildRegistry())).toEqual([]);
  });

  it("ships the scheduler source but no tests", () => {
    const paths = item().files.map((f) => f.path);
    expect(paths).toContain(
      "resource-scheduler/src/components/ResourceScheduler/ResourceScheduler.tsx"
    );
    expect(paths).toContain(
      "resource-scheduler/src/components/ResourceScheduler/ui/popover.tsx"
    );
    expect(paths.filter((p: string) => /\.test\./.test(p))).toEqual([]);
  });

  it("installs everything under one folder, mirroring the package layout", () => {
    for (const file of item().files) {
      const rel = file.path.split("src/components/ResourceScheduler/")[1];
      expect(file.target).toBe(`@components/resource-scheduler/${rel}`);
    }
  });

  it("lists the packages the files import, but not React", () => {
    expect(item().dependencies).toEqual(
      expect.arrayContaining([
        "date-fns",
        "lucide-react",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ])
    );
    expect(item().dependencies).not.toContain("react");
  });

  it("carries the design tokens without touching the host theme", () => {
    const { cssVars, css } = item();
    expect(cssVars.light["rs-background"]).toBe("#ffffff");
    expect(cssVars.dark["rs-background"]).toBe("#171717");
    expect(cssVars.theme["color-ocrs-background"]).toBe("var(--rs-background)");
    // Nothing unprefixed such as --background / --primary that would clobber shadcn's.
    for (const name of Object.keys({ ...cssVars.light, ...cssVars.dark }))
      expect(name.startsWith("rs-")).toBe(true);
    expect(css["@utility ocrs-shadow-md"]["box-shadow"]).toBe("var(--rs-shadow-md)");
    expect(Object.keys(css["@layer base"])).toContain(".rs-root button");
  });
});

describe("parseTokens", () => {
  it("reads variables, theme, utilities and scoped base rules", () => {
    const parsed = parse(`
      /* comment { with braces } */
      :root { --a: 1px; --b: 0 1px 2px
        red, 0 2px 3px blue; }
      .dark { --a: 2px; }
      @theme inline { --color-x: var(--a); }
      @utility foo { color: red; }
      @layer base { .x, .x * { margin: 0; } }
    `);
    expect(parsed.cssVars.light).toEqual({ a: "1px", b: "0 1px 2px red, 0 2px 3px blue" });
    expect(parsed.cssVars.dark).toEqual({ a: "2px" });
    expect(parsed.cssVars.theme).toEqual({ "color-x": "var(--a)" });
    expect(parsed.css["@utility foo"]).toEqual({ color: "red" });
    expect(parsed.css["@layer base"]).toEqual({ ".x, .x *": { margin: "0" } });
  });

  it("refuses rules it cannot carry into the registry", () => {
    expect(() => parseTokens("@media (min-width: 1px) { a { b: c; } }")).toThrow(/unsupported/);
  });
});
