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
        "@radix-ui/react-popover",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ])
    );
    expect(item().dependencies).not.toContain("react");
    // The view switch is a row of buttons; nothing imports a select any more.
    expect(item().dependencies).not.toContain("@radix-ui/react-select");
  });

  it("carries the design tokens without touching the host theme", () => {
    const { cssVars, css } = item();
    expect(cssVars.light["rs-background"]).toBe("#ffffff");
    expect(cssVars.dark["rs-background"]).toBe("#0f1626");
    expect(cssVars.theme["color-ocrs-background"]).toBe("var(--rs-background)");
    // Nothing unprefixed such as --background / --primary that would clobber shadcn's.
    for (const name of Object.keys({ ...cssVars.light, ...cssVars.dark }))
      expect(name.startsWith("rs-")).toBe(true);
    expect(css["@utility ocrs-shadow-md"]["box-shadow"]).toBe("var(--rs-shadow-md)");
    expect(Object.keys(css["@layer base"])).toContain(".rs-root button");
  });

  it("carries the print rules, which are what make a printout readable", () => {
    const print = item().css["@media print"] as Record<string, Record<string, string>>;
    expect(print).toBeTruthy();
    expect(print[".rs-no-print"].display).toBe("none !important");
    expect(print[".rs-root"]["print-color-adjust"]).toBe("exact");
    expect(print[".rs-scroll"].overflow).toBe("visible");
    // Every rule is scoped to the scheduler's own classes, except the one that
    // lets the box around it grow.
    for (const selector of Object.keys(print).flatMap((s) => s.split(",")))
      expect(selector.trim(), selector).toMatch(/^(\.rs-|:has\(> \.rs-root\)$)/);
  });
});

describe("theme selectors in tokens.css", () => {
  const css = fs.readFileSync(path.join(__dirname, "styles/tokens.css"), "utf8");
  const decls = (body: string) =>
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => `${m[1]}:${m[2].trim()}`).sort();

  it("applies the dark tokens for .dark and data-theme=dark", () => {
    expect(css).toMatch(/\.dark,\s*\[data-theme="dark"\]\s*\{/);
  });

  it("data-theme=system under prefers-color-scheme repeats the dark values exactly", () => {
    const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/)![1];
    const media = css.match(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*\[data-theme="system"\]\s*\{([^}]*)\}/
    )![1];
    expect(decls(media)).toEqual(decls(dark));
  });

  it("has a radius token, left out of the dark set, that the root uses", () => {
    expect(parse(css).cssVars.light["rs-radius"]).toBe("0.75rem");
    expect(parse(css).cssVars.dark["rs-radius"]).toBeUndefined();
    expect(
      fs.readFileSync(path.join(__dirname, "components/ResourceScheduler/ResourceScheduler.tsx"), "utf8")
    ).toContain("rounded-[var(--rs-radius)]");
  });

  it("leaves the primary to the host in dark mode and reads it as text through a mix", () => {
    const { cssVars } = parse(css);
    for (const name of ["rs-primary", "rs-primary-foreground", "rs-ring"]) {
      expect(cssVars.dark[name], name).toBeUndefined();
    }
    expect(cssVars.light["rs-primary-text-mix"]).toBe("100%");
    expect(cssVars.dark["rs-primary-text-mix"]).toBe("60%");
    expect(cssVars.theme["color-ocrs-primary-text"]).toBe(
      "color-mix(in srgb, var(--rs-primary) var(--rs-primary-text-mix), var(--rs-foreground))"
    );
  });

  it("has warning and unavailable tokens in both sets", () => {
    const { cssVars } = parse(css);
    expect(cssVars.light["rs-warning"]).toBeTruthy();
    expect(cssVars.light["rs-unavailable"]).toBeTruthy();
    expect(cssVars.dark["rs-unavailable"]).toBeTruthy();
    expect(cssVars.theme["color-ocrs-warning"]).toBe("var(--rs-warning)");
  });
});

describe("parseTokens", () => {
  it("reads .dark with a data-theme alias and skips the system media block", () => {
    const parsed = parse(`
      :root { --a: 1px; }
      .dark,
      [data-theme="dark"] { --a: 2px; }
      @media (prefers-color-scheme: dark) { [data-theme="system"] { --a: 2px; } }
    `);
    expect(parsed.cssVars.dark).toEqual({ a: "2px" });
    expect(parsed.css).toEqual({});
  });

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

  it("reads a print block like a base layer: selectors with declarations, !important kept", () => {
    const parsed = parse(`
      @media print { .a, .b .c { display: none !important; } .d { color: red; margin: 0 } }
    `);
    expect(parsed.css["@media print"]).toEqual({
      ".a, .b .c": { display: "none !important" },
      ".d": { color: "red", margin: "0" },
    });
  });

  it("refuses rules it cannot carry into the registry", () => {
    expect(() => parseTokens("@media (min-width: 1px) { a { b: c; } }")).toThrow(/unsupported/);
  });
});
